const { id } = require('./repository')
const { HttpError } = require('../utils/errors')

async function applyMovement({ connection, workspaceId, actorId, productId, type, quantity, reason, referenceType, referenceId, batchId, idempotencyKey }) {
  if (type === 'ADJUSTMENT' && !reason?.trim()) throw new HttpError(422,'VALIDATION_ERROR','Adjustments require a reason.',[{field:'reason',code:'required',message:'Reason is required.'}])
  if (type !== 'ADJUSTMENT' && quantity < 1 || quantity === 0) throw new HttpError(422,'VALIDATION_ERROR','Quantity must be a non-zero integer.')
  if (idempotencyKey) {
    const [[existing]] = await connection.query("SELECT MIN(id) id,MIN(type) type,MIN(product_id) productId,SUM(quantity_delta) quantity,MIN(created_at) createdAt,COUNT(*) rowsFound FROM stock_movements WHERE workspace_id=? AND (idempotency_key=? OR LEFT(idempotency_key,CHAR_LENGTH(?)+1)=CONCAT(?,':'))",[workspaceId,idempotencyKey,idempotencyKey,idempotencyKey])
    if (existing?.rowsFound) { const expected=type==='ISSUE'?-Math.abs(quantity):type==='RECEIPT'?Math.abs(quantity):type==='RESERVATION'?-Math.abs(quantity):type==='RELEASE'?Math.abs(quantity):quantity; if(existing.type!==type||existing.productId!==productId||Number(existing.quantity)!==expected) throw new HttpError(409,'IDEMPOTENCY_CONFLICT','This idempotency key was used for a different stock operation.'); return { replayed:true, movement:existing } }
  }
  const [[product]] = await connection.query('SELECT p.id,p.reorder_point,b.on_hand,b.reserved FROM products p JOIN inventory_balances b ON b.product_id=p.id WHERE p.id=? AND p.workspace_id=? AND p.is_active=1 FOR UPDATE',[productId,workspaceId])
  if (!product) throw new HttpError(404,'NOT_FOUND','Active product not found.')
  const delta = type==='ISSUE' ? -Math.abs(quantity) : type==='RECEIPT' ? Math.abs(quantity) : type==='RESERVATION' ? 0 : type==='RELEASE' ? 0 : quantity
  const ledgerDelta=type==='RESERVATION'?-Math.abs(quantity):type==='RELEASE'?Math.abs(quantity):delta
  let nextOnHand=product.on_hand, nextReserved=product.reserved
  if(type==='RECEIPT'||type==='ISSUE'||type==='ADJUSTMENT') nextOnHand+=delta
  if(type==='RESERVATION') nextReserved+=Math.abs(quantity)
  if(type==='RELEASE') nextReserved-=Math.abs(quantity)
  if(nextOnHand-nextReserved<0||nextReserved<0) throw new HttpError(409,'INSUFFICIENT_STOCK','Movement would make available stock negative.')
  let allocations=[]
  if(batchId){
    const [[batch]]=await connection.query(`SELECT id,quantity_available FROM expiry_batches WHERE id=? AND workspace_id=? AND product_id=? ${type==='ADJUSTMENT'?'':'AND expires_at>=UTC_DATE()'} FOR UPDATE`,[batchId,workspaceId,productId])
    if(!batch) throw new HttpError(422,'INVALID_BATCH','Batch must belong to this product and be unexpired.')
    if(delta<0&&batch.quantity_available<Math.abs(delta)) throw new HttpError(409,'INSUFFICIENT_BATCH_STOCK','The selected batch does not have enough available units.')
    allocations=[{id:batch.id,quantity:Math.abs(delta)}]
  } else if(delta<0) {
    const [[tracked]]=await connection.query('SELECT COALESCE(SUM(quantity_available),0) total FROM expiry_batches WHERE workspace_id=? AND product_id=?',[workspaceId,productId])
    const [batches]=await connection.query('SELECT id,quantity_available FROM expiry_batches WHERE workspace_id=? AND product_id=? AND expires_at>=UTC_DATE() AND quantity_available>0 ORDER BY expires_at,received_at FOR UPDATE',[workspaceId,productId])
    if(tracked.total>0){let remaining=Math.abs(delta);for(const batch of batches){const take=Math.min(batch.quantity_available,remaining);if(take){allocations.push({id:batch.id,quantity:take});remaining-=take}if(!remaining)break}if(remaining)throw new HttpError(409,'INSUFFICIENT_BATCH_STOCK','Not enough unexpired batch stock is available.')}
  }
  await connection.query('UPDATE inventory_balances SET on_hand=?,reserved=?,updated_at=UTC_TIMESTAMP() WHERE product_id=? AND workspace_id=?',[nextOnHand,nextReserved,productId,workspaceId])
  const items=allocations.length?allocations:[{id:batchId||null,quantity:Math.abs(delta)}]
  const movementIds=[]
  for(const [index,allocation] of items.entries()){
    const movementId=id();movementIds.push(movementId)
    const signed=type==='RESERVATION'||type==='RELEASE'?ledgerDelta:delta<0?-allocation.quantity:delta>0?allocation.quantity:0
    await connection.query('INSERT INTO stock_movements(id,workspace_id,product_id,batch_id,type,quantity_delta,reference_type,reference_id,reason,actor_user_id,idempotency_key) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[movementId,workspaceId,productId,allocation.id,type,signed,referenceType||null,referenceId||null,reason||null,actorId,idempotencyKey?(index===0?idempotencyKey:`${idempotencyKey}:${index}`):null])
    if(allocation.id&&delta<0) await connection.query('UPDATE expiry_batches SET quantity_available=quantity_available-?,updated_at=UTC_TIMESTAMP() WHERE id=?',[allocation.quantity,allocation.id])
    if(allocation.id&&delta>0) { const received=type==='RECEIPT'?allocation.quantity:0; await connection.query('UPDATE expiry_batches SET quantity_available=quantity_available+?,quantity_received=quantity_received+?,updated_at=UTC_TIMESTAMP() WHERE id=?',[allocation.quantity,received,allocation.id]) }
  }
  if(nextOnHand-nextReserved<=product.reorder_point){
    const [members]=await connection.query('SELECT user_id FROM workspace_memberships WHERE workspace_id=? AND status="ACTIVE"',[workspaceId])
    for(const member of members) await connection.query('INSERT IGNORE INTO notifications(id,workspace_id,recipient_user_id,type,title,message,entity_type,entity_id,dedupe_key) VALUES(?,?,?,"LOW_STOCK","Low stock",CONCAT("Stock for product ",?," is at or below its reorder point."),"PRODUCT",?,?)',[id(),workspaceId,member.user_id,productId,productId,`${productId}:${new Date().toISOString().slice(0,10)}`])
  }
  return { replayed:false, movementIds, quantity:delta }
}
module.exports={applyMovement}
