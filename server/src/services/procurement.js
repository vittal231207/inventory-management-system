const { id, pool } = require('./repository')
const { applyMovement } = require('./stock')
const { HttpError } = require('../utils/errors')

async function createOrder(connection, workspaceId, actorId, input) {
  const [[supplier]]=await connection.query('SELECT id FROM suppliers WHERE id=? AND workspace_id=? AND status="ACTIVE" FOR UPDATE',[input.supplierId,workspaceId])
  if(!supplier)throw new HttpError(422,'INVALID_SUPPLIER','Choose an active supplier in this workspace.')
  for(const line of input.lines){const [[product]]=await connection.query('SELECT id FROM products WHERE id=? AND workspace_id=? AND is_active=1',[line.productId,workspaceId]);if(!product)throw new HttpError(422,'INVALID_PRODUCT','Every purchase line must reference an active workspace product.')}
  const purchaseId=id(), orderNumber=`PO-${Date.now().toString(36).toUpperCase()}`
  await connection.query('INSERT INTO purchase_orders(id,workspace_id,supplier_id,order_number,status,currency,expected_at,notes,created_by) VALUES(?,?,?, ?,"DRAFT",?,?,?,?)',[purchaseId,workspaceId,input.supplierId,orderNumber,input.currency,input.expectedAt||null,input.notes||null,actorId])
  for(const line of input.lines)await connection.query('INSERT INTO purchase_order_lines(id,workspace_id,purchase_order_id,product_id,quantity_ordered,unit_cost) VALUES(?,?,?,?,?,?)',[id(),workspaceId,purchaseId,line.productId,line.quantityOrdered,line.unitCost])
  return {id:purchaseId,orderNumber,status:'DRAFT',supplierId:input.supplierId,...input}
}

async function updateDraft(connection, workspaceId, purchaseId, input) {
  const [[order]]=await connection.query('SELECT id,status FROM purchase_orders WHERE id=? AND workspace_id=? FOR UPDATE',[purchaseId,workspaceId])
  if(!order)throw new HttpError(404,'NOT_FOUND','Purchase order not found.')
  if(order.status!=='DRAFT')throw new HttpError(409,'INVALID_STATE','Only draft purchase orders can be edited.')
  if(input.supplierId){const [[supplier]]=await connection.query('SELECT id FROM suppliers WHERE id=? AND workspace_id=? AND status="ACTIVE"',[input.supplierId,workspaceId]);if(!supplier)throw new HttpError(422,'INVALID_SUPPLIER','Choose an active supplier in this workspace.')}
  if(input.lines)for(const line of input.lines){const [[product]]=await connection.query('SELECT id FROM products WHERE id=? AND workspace_id=? AND is_active=1',[line.productId,workspaceId]);if(!product)throw new HttpError(422,'INVALID_PRODUCT','Every purchase line must reference an active workspace product.')}
  const changes={supplierId:'supplier_id',currency:'currency',expectedAt:'expected_at',notes:'notes'}
  for(const [key,column] of Object.entries(changes))if(Object.hasOwn(input,key))await connection.query(`UPDATE purchase_orders SET ${column}=? WHERE id=?`,[input[key]||null,purchaseId])
  if(input.lines){await connection.query('DELETE FROM purchase_order_lines WHERE purchase_order_id=?',[purchaseId]);for(const line of input.lines)await connection.query('INSERT INTO purchase_order_lines(id,workspace_id,purchase_order_id,product_id,quantity_ordered,unit_cost) VALUES(?,?,?,?,?,?)',[id(),workspaceId,purchaseId,line.productId,line.quantityOrdered,line.unitCost])}
  return {id:purchaseId,status:'DRAFT',...input}
}

async function changeStatus(connection, workspaceId, purchaseId, nextStatus) {
  const [[order]]=await connection.query('SELECT status FROM purchase_orders WHERE id=? AND workspace_id=? FOR UPDATE',[purchaseId,workspaceId])
  if(!order)throw new HttpError(404,'NOT_FOUND','Purchase order not found.')
  const allowed={DRAFT:['SUBMITTED','CANCELLED'],SUBMITTED:['ORDERED','CANCELLED'],ORDERED:['IN_TRANSIT','CANCELLED'],IN_TRANSIT:[],PARTIALLY_RECEIVED:[],RECEIVED:[],CANCELLED:[]}
  if(!allowed[order.status]?.includes(nextStatus))throw new HttpError(409,'INVALID_STATE',`Cannot transition a ${order.status} purchase to ${nextStatus}.`)
  if(nextStatus==='CANCELLED'){const [[received]]=await connection.query('SELECT COALESCE(SUM(quantity_received),0) quantity FROM purchase_order_lines WHERE purchase_order_id=?',[purchaseId]);if(received.quantity>0)throw new HttpError(409,'INVALID_STATE','An order with receipts cannot be cancelled.')}
  await connection.query('UPDATE purchase_orders SET status=?,updated_at=UTC_TIMESTAMP() WHERE id=?',[nextStatus,purchaseId])
  return {id:purchaseId,status:nextStatus}
}

async function receiveOrder(connection,workspaceId,actorId,purchaseId,input,key) {
  const [[prior]]=await connection.query('SELECT id,purchase_order_id purchaseId FROM purchase_receipts WHERE workspace_id=? AND idempotency_key=?',[workspaceId,key])
  if(prior){if(prior.purchaseId!==purchaseId)throw new HttpError(409,'IDEMPOTENCY_CONFLICT','This idempotency key was used for another purchase order.');return {replayed:true,...prior}}
  const [[order]]=await connection.query('SELECT * FROM purchase_orders WHERE id=? AND workspace_id=? FOR UPDATE',[purchaseId,workspaceId])
  if(!order||!['ORDERED','IN_TRANSIT','PARTIALLY_RECEIVED'].includes(order.status))throw new HttpError(409,'INVALID_STATE','Purchase order is not ready to receive.')
  const receiptId=id(), receivedAt=input.receivedAt||new Date().toISOString(), receivedAtSql=receivedAt.slice(0,19).replace('T',' ')
  await connection.query('INSERT INTO purchase_receipts(id,workspace_id,purchase_order_id,received_by,received_at,idempotency_key) VALUES(?,?,?,?,?,?)',[receiptId,workspaceId,purchaseId,actorId,receivedAtSql,key])
  for(const line of input.lines){
    const [[orderLine]]=await connection.query('SELECT * FROM purchase_order_lines WHERE id=? AND purchase_order_id=? AND workspace_id=? FOR UPDATE',[line.purchaseLineId,purchaseId,workspaceId])
    if(!orderLine||orderLine.quantity_received+line.quantityReceived>orderLine.quantity_ordered)throw new HttpError(409,'INVALID_QUANTITY','Receipt exceeds the remaining quantity for a purchase line.')
    if(Boolean(line.batchNumber)!==Boolean(line.expiresAt))throw new HttpError(422,'BATCH_FIELDS_REQUIRED','Provide both batch number and expiry date, or neither.')
    let batchId=null
    if(line.batchNumber){if(line.expiresAt<=receivedAt.slice(0,10))throw new HttpError(422,'INVALID_EXPIRY','Expiry must be later than the receipt date.');batchId=id();await connection.query('INSERT INTO expiry_batches(id,workspace_id,product_id,purchase_line_id,batch_number,received_at,expires_at,quantity_received,quantity_available) VALUES(?,?,?,?,?,?,?,0,0)',[batchId,workspaceId,orderLine.product_id,orderLine.id,line.batchNumber,receivedAt.slice(0,10),line.expiresAt])}
    await connection.query('UPDATE purchase_order_lines SET quantity_received=quantity_received+? WHERE id=?',[line.quantityReceived,orderLine.id])
    await connection.query('INSERT INTO purchase_receipt_lines(id,receipt_id,purchase_order_line_id,quantity_received,batch_id) VALUES(?,?,?,?,?)',[id(),receiptId,orderLine.id,line.quantityReceived,batchId])
    await applyMovement({connection,workspaceId,actorId,productId:orderLine.product_id,type:'RECEIPT',quantity:line.quantityReceived,batchId,referenceType:'PURCHASE_ORDER',referenceId:purchaseId,reason:`Receipt ${receiptId}`,idempotencyKey:`${key}:${orderLine.id}`})
  }
  const [[summary]]=await connection.query('SELECT SUM(quantity_received<quantity_ordered) remaining FROM purchase_order_lines WHERE purchase_order_id=?',[purchaseId])
  const status=summary.remaining?'PARTIALLY_RECEIVED':'RECEIVED'
  await connection.query('UPDATE purchase_orders SET status=?,updated_at=UTC_TIMESTAMP() WHERE id=?',[status,purchaseId])
  return {id:receiptId,purchaseId,status,receivedAt}
}
module.exports={createOrder,updateDraft,changeStatus,receiveOrder}
