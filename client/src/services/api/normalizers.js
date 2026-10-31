/** Convert the API's normalized product resource to the compact view model used by current screens. */
export function toProductView(product) {
  const stock = product.stock || {}
  const amount = product.unitPrice?.amount ?? product.price ?? 0
  const onHand = product.available ?? stock.available ?? stock.onHand ?? product.stockOnHand ?? product.stock ?? 0
  const reorderPoint = stock.reorderPoint ?? product.reorderPoint ?? 0
  const status = product.isActive===false||product.isActive===0 ? 'Inactive' : onHand <= 0 ? 'Out of stock' : onHand <= reorderPoint ? 'Low stock' : 'In stock'
  const name = product.name || ''
  return {
    id: product.id,
    sku: product.sku,
    name,
    category: product.category?.name || product.categoryName || product.category || '',
    categoryId: product.category?.id || product.categoryId || null,
    supplierId: product.supplier?.id || product.supplierId || product.supplier_id || null,
    supplier: product.supplier?.name || product.supplierName || '',
    stock: Number(onHand),
    price: Number(amount),
    currency: product.unitPrice?.currency || product.currency || 'INR',
    isActive:product.isActive!==false&&product.isActive!==0,
    status,
    reorderPoint: Number(reorderPoint),
    initials: product.initials || name.slice(0, 2).toUpperCase(),
    color: product.color || 'blue',
  }
}

export function toRows(records, keys) {
  return records.map((record) => keys.map((key) => key.split('.').reduce((value, part) => value?.[part], record) ?? '—'))
}

export function toCategoryView(category) {
  return { id: category.id, name: category.name, active: category.active ?? category.isActive ?? true }
}

function titleCaseStatus(value) {
  const normalized=String(value||'').toUpperCase()
  const labels={IN_TRANSIT:'In transit',PARTIALLY_RECEIVED:'Partially received',OUT_OF_STOCK:'Out of stock',LOW_STOCK:'Low stock',IN_STOCK:'In stock'}
  return labels[normalized]||normalized.toLowerCase().split('_').map(word=>word?word[0].toUpperCase()+word.slice(1):'').join(' ')
}

export function toSupplierView(supplier) {
  return { ...supplier, contactName:supplier.contactName||supplier.contact_name||'', contactEmail: supplier.contactEmail || supplier.contact_email || supplier.email || '', phone:supplier.phone||'', leadTimeDays: supplier.leadTimeDays ?? supplier.lead_time_days ?? supplier.leadTime ?? null, productCount:Number(supplier.productCount??0), status: titleCaseStatus(supplier.status) }
}

export function toPurchaseView(purchase) {
  let lines=purchase.lines||[];if(typeof lines==='string'){try{lines=JSON.parse(lines)}catch{lines=[]}}
  return { ...purchase, lines, orderNumber:purchase.orderNumber||purchase.order_number||'', supplierId: purchase.supplierId || purchase.supplier_id || '', expectedAt: String(purchase.expectedAt || purchase.expected_at || '').slice(0,10), currency: purchase.currency || 'INR', supplierName: purchase.supplierName || purchase.supplier?.name || '', itemCount: purchase.itemCount ?? lines.length ?? 0, total: purchase.total ?? purchase.totalAmount ?? 0, status: titleCaseStatus(purchase.status) }
}

export function toUserView(user) {
  const role = user.role || user.roles?.[0] || null
  return { ...user, roleId:user.roleId||user.role_id||'', role: typeof role === 'object' ? role.name : role, lastActiveLabel: user.lastActiveLabel || user.lastActive || '—', status: titleCaseStatus(user.status || 'ACTIVE') }
}

export function toBatchView(batch) {
  const status = String(batch.status || '').toUpperCase()
  const date=value=>value instanceof Date?value.toISOString().slice(0,10):String(value||'').slice(0,10)
  return { ...batch, batchNumber:batch.batchNumber||batch.batch_number||'', productId:batch.productId||batch.product_id, productName: batch.productName || batch.product_name || batch.product?.name || '', receivedAt: date(batch.receivedAt || batch.received_at || batch.receivedOn), expiresAt: date(batch.expiresAt || batch.expires_at), quantity: Number(batch.quantity ?? batch.quantityAvailable ?? batch.quantity_available ?? batch.quantityReceived ?? batch.quantity_received ?? 0), status }
}

export function toNotificationView(notification){return{...notification,readAt:notification.readAt||notification.read_at||null,createdAt:notification.createdAt||notification.created_at||null}}
