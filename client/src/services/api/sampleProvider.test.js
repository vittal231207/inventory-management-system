import { describe, expect, it } from 'vitest'
import { sampleProvider } from './sampleProvider'
import { toBatchView, toProductView, toPurchaseView, toSupplierView } from './normalizers'

describe('sample provider workflows', () => {
  it('creates, searches, updates and deactivates products without an API', async () => {
    const sku=`TEST-${Date.now()}`
    const created=await sampleProvider.products.create({sku,name:'Sample test item',categoryId:'cat-1',stock:12,price:4.5,reorderPoint:3})
    expect(created.stock).toBe(12)
    expect((await sampleProvider.products.list({search:sku})).items).toHaveLength(1)
    await sampleProvider.products.update(created.id,{name:'Updated test item',reorderPoint:15})
    expect((await sampleProvider.products.list({search:sku})).items[0].status).toBe('Low stock')
    await sampleProvider.products.remove(created.id)
    expect((await sampleProvider.products.list({search:sku})).items).toHaveLength(0)
  })

  it('records stock in, stock out and rejects negative available stock', async () => {
    const product=(await sampleProvider.products.list({page:1,pageSize:1})).items[0]
    const before=product.stock
    await sampleProvider.stockMovements.create({productId:product.id,type:'RECEIPT',quantity:4,reason:'test receipt'})
    await sampleProvider.stockMovements.create({productId:product.id,type:'ISSUE',quantity:2,reason:'test issue'})
    expect((await sampleProvider.products.list({search:product.sku})).items[0].stock).toBe(before+2)
    await expect(sampleProvider.stockMovements.create({productId:product.id,type:'ISSUE',quantity:999999})).rejects.toMatchObject({status:409})
  })

  it('creates and partially receives a purchase while updating sample stock', async () => {
    const product=(await sampleProvider.products.list({page:1,pageSize:1})).items[0]
    const supplier=(await sampleProvider.suppliers.list({page:1,pageSize:1})).items[0]
    const before=product.stock
    const order=await sampleProvider.purchases.create({supplierId:supplier.id,currency:'INR',lines:[{productId:product.id,quantityOrdered:5,unitCost:'2.00'}]})
    await sampleProvider.purchases.updateStatus(order.id,{status:'SUBMITTED'})
    await sampleProvider.purchases.updateStatus(order.id,{status:'ORDERED'})
    await sampleProvider.purchases.updateStatus(order.id,{status:'IN_TRANSIT'})
    const detail=await sampleProvider.purchases.get(order.id)
    await sampleProvider.purchases.receive(order.id,{lines:[{purchaseLineId:detail.lines[0].id,quantityReceived:2}]})
    expect((await sampleProvider.products.list({search:product.sku})).items[0].stock).toBe(before+2)
    expect((await sampleProvider.purchases.get(order.id)).status).toBe('Partially received')
  })
})

describe('API response normalization',()=>{
  it('normalizes MySQL snake case fields to screen view models',()=>{
    expect(toSupplierView({contact_email:'s@example.test',lead_time_days:4,status:'ACTIVE'})).toMatchObject({contactEmail:'s@example.test',leadTimeDays:4,status:'Active'})
    expect(toPurchaseView({order_number:'PO-1',supplier_id:'sup',status:'IN_TRANSIT'})).toMatchObject({orderNumber:'PO-1',supplierId:'sup',status:'In transit'})
    expect(toBatchView({batch_number:'LOT-1',quantity_available:7,expires_at:'2026-12-01',status:'HEALTHY'})).toMatchObject({batchNumber:'LOT-1',quantity:7,expiresAt:'2026-12-01'})
    expect(toProductView({sku:'A',name:'A',stock:5,available:2,reorderPoint:3}).stock).toBe(2)
  })
})
