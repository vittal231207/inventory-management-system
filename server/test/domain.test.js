process.env.JWT_SECRET='test-secret-that-is-long-enough-for-stockroom-tests'
const test=require('node:test')
const assert=require('node:assert/strict')
const {changeStatus}=require('../src/services/procurement')
const {windowFromQuery}=require('../src/services/analytics')

test('purchase transitions enforce the documented state path',async()=>{
 const calls=[],connection={async query(sql,params){calls.push(sql);if(sql.startsWith('SELECT status FROM purchase_orders'))return [[{status:'DRAFT'}],[]];return [{affectedRows:1},[]]}}
 await assert.rejects(()=>changeStatus(connection,'workspace','purchase','IN_TRANSIT'),{code:'INVALID_STATE'})
 assert.equal(calls.some(sql=>sql.startsWith('UPDATE purchase_orders')),false)
 const result=await changeStatus(connection,'workspace','purchase','SUBMITTED')
 assert.equal(result.status,'SUBMITTED')
})

test('purchase cancellation is rejected after any receipt',async()=>{
 const connection={async query(sql){if(sql.startsWith('SELECT status FROM purchase_orders'))return [[{status:'ORDERED'}],[]];if(sql.startsWith('SELECT COALESCE(SUM(quantity_received)'))return [[{quantity:1}],[]];throw new Error('Unexpected query')}}
 await assert.rejects(()=>changeStatus(connection,'workspace','purchase','CANCELLED'),{code:'INVALID_STATE'})
})

test('report date ranges accept supported presets and reject invalid ranges',()=>{
 assert.equal(windowFromQuery({range:'7d'}).days,7)
 assert.equal(windowFromQuery({range:'quarter'}).days,90)
 assert.throws(()=>windowFromQuery({range:'all-time'}),{code:'INVALID_RANGE'})
 assert.throws(()=>windowFromQuery({from:'not-a-date',to:'2026-10-01'}),{code:'INVALID_DATE_RANGE'})
 assert.throws(()=>windowFromQuery({from:'2026-02-31'}),{code:'INVALID_DATE_RANGE'})
})
