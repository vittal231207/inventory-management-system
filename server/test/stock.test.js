process.env.JWT_SECRET='test-secret-that-is-long-enough-for-stockroom-tests'
const test=require('node:test')
const assert=require('node:assert/strict')
const {applyMovement}=require('../src/services/stock')

function fakeConnection({balance={on_hand:10,reserved:0},existing=null}={}){
 const calls=[]
 return {calls,async query(sql,params){calls.push({sql,params});if(sql.includes('SELECT MIN(id) id,MIN(type) type'))return [[...(existing?[{...existing,rowsFound:1}]:[])],[]];if(sql.includes('SELECT p.id,p.reorder_point'))return [[{id:'product-1',reorder_point:2,...balance}],[]];if(sql.includes('SELECT user_id FROM workspace_memberships'))return [[],[]];return [{affectedRows:1},[]]}}
}

test('stock issue refuses negative available inventory before writes',async()=>{
 const connection=fakeConnection({balance:{on_hand:2,reserved:0}})
 await assert.rejects(()=>applyMovement({connection,workspaceId:'w',actorId:'u',productId:'product-1',type:'ISSUE',quantity:3}),{code:'INSUFFICIENT_STOCK'})
 assert.equal(connection.calls.some(call=>call.sql.startsWith('UPDATE inventory_balances')),false)
})

test('stock receipt changes balance and writes a ledger row in the supplied transaction',async()=>{
 const connection=fakeConnection({balance:{on_hand:2,reserved:1}})
 const result=await applyMovement({connection,workspaceId:'w',actorId:'u',productId:'product-1',type:'RECEIPT',quantity:4,idempotencyKey:'key-1'})
 assert.equal(result.quantity,4)
 const update=connection.calls.find(call=>call.sql.startsWith('UPDATE inventory_balances'))
 assert.deepEqual(update.params.slice(0,2),[6,1])
 const ledger=connection.calls.find(call=>call.sql.startsWith('INSERT INTO stock_movements'))
 assert.equal(ledger.params[5],4)
 assert.equal(ledger.params[10],'key-1')
})

test('a repeated stock idempotency key is returned without another balance write',async()=>{
 const connection=fakeConnection({existing:{id:'movement-1',type:'ISSUE',productId:'product-1',quantity:-2}})
 const result=await applyMovement({connection,workspaceId:'w',actorId:'u',productId:'product-1',type:'ISSUE',quantity:2,idempotencyKey:'same-key'})
 assert.equal(result.replayed,true)
 assert.equal(connection.calls.some(call=>call.sql.startsWith('UPDATE inventory_balances')),false)
})

test('adjustments require an audit reason',async()=>{
 const connection=fakeConnection()
 await assert.rejects(()=>applyMovement({connection,workspaceId:'w',actorId:'u',productId:'product-1',type:'ADJUSTMENT',quantity:-1}),{code:'VALIDATION_ERROR'})
 assert.equal(connection.calls.length,0)
})

test('a stock idempotency key cannot be reused with a different operation',async()=>{
 const connection=fakeConnection({existing:{id:'movement-1',type:'ISSUE',productId:'product-1',quantity:-2}})
 await assert.rejects(()=>applyMovement({connection,workspaceId:'w',actorId:'u',productId:'product-1',type:'ISSUE',quantity:3,idempotencyKey:'same-key'}),{code:'IDEMPOTENCY_CONFLICT'})
 assert.equal(connection.calls.some(call=>call.sql.startsWith('UPDATE inventory_balances')),false)
})
