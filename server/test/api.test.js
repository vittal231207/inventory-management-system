process.env.JWT_SECRET='test-secret-that-is-long-enough-for-stockroom-tests'
const test=require('node:test')
const assert=require('node:assert/strict')
const request=require('supertest')
const app=require('../src/app')

test('health endpoint reports service readiness without exposing configuration',async()=>{
  const response=await request(app).get('/health').expect(200)
  assert.deepEqual(response.body,{status:'ok',service:'stockroom-api'})
})

test('business endpoints require bearer authentication',async()=>{
  const response=await request(app).get('/api/v1/products').expect(401)
  assert.equal(response.body.code,'UNAUTHENTICATED')
  assert.equal(response.headers['content-type'].includes('application/problem+json'),true)
})

test('unknown API routes return a consistent not found response',async()=>{
  const response=await request(app).get('/not-real').expect(404)
  assert.equal(response.body.code,'NOT_FOUND')
})
