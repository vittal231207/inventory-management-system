import { describe, expect, it, vi } from 'vitest'
import { createHttpClient, tokenStore } from './httpClient'

describe('HTTP API client',()=>{
  it('sends JSON with the active bearer token and idempotency header',async()=>{
    tokenStore.set('test-token')
    const fetchImpl=vi.fn(async()=>new Response(JSON.stringify({id:'one'}),{status:201,headers:{'Content-Type':'application/json'}}))
    const request=createHttpClient({baseUrl:'http://api.test/api/v1',fetchImpl})
    await expect(request('/stock-movements',{method:'POST',body:{quantity:1},headers:{'Idempotency-Key':'retry-key'}})).resolves.toEqual({id:'one'})
    const [,options]=fetchImpl.mock.calls[0]
    expect(options.headers.get('Authorization')).toBe('Bearer test-token')
    expect(options.headers.get('Idempotency-Key')).toBe('retry-key')
    expect(options.body).toBe('{"quantity":1}')
    tokenStore.clear()
  })

  it('preserves structured validation errors for form feedback',async()=>{
    const fetchImpl=async()=>new Response(JSON.stringify({code:'VALIDATION_ERROR',detail:'Review fields.',errors:[{field:'sku',message:'Required'}],requestId:'req-1'}),{status:422})
    const request=createHttpClient({fetchImpl})
    await expect(request('/products',{method:'POST',body:{}})).rejects.toMatchObject({name:'ApiError',status:422,fieldErrors:[{field:'sku',message:'Required'}],requestId:'req-1'})
  })
})
