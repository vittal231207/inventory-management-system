import { createHttpClient, tokenStore } from './httpClient'
import { toBatchView, toCategoryView, toNotificationView, toProductView, toPurchaseView, toSupplierView, toUserView } from './normalizers'

const request = createHttpClient()
const queryString = (params = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== '' && value !== null))
  return query.toString() ? `?${query}` : ''
}
const mapPage = (payload, map = (item) => item) => ({ items: (payload?.items || []).map(map), page: payload?.page || 1, pageSize: payload?.pageSize || 25, total: payload?.total || 0, totalPages: payload?.totalPages || 0 })
const idempotency = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
async function idempotentRequest(operation,path,body){const fingerprint=`${operation}:${JSON.stringify(body)}`,storageKey=`stockroom-idempotency:${fingerprint}`;let key;try{key=sessionStorage.getItem(storageKey);if(!key){key=idempotency();sessionStorage.setItem(storageKey,key)}}catch{key=idempotency()}const result=await request(path,{method:'POST',body,headers:{'Idempotency-Key':key}});try{sessionStorage.removeItem(storageKey)}catch(error){void error}return result}

export const httpProvider = {
  auth: {
    async login(credentials) { const result = await request('/auth/login', { method: 'POST', body: credentials }); tokenStore.set(result.accessToken); return result },
    async logout() { try { return await request('/auth/logout', { method: 'POST' }) } finally { tokenStore.clear() } },
    me: () => request('/auth/me'),
  },
  dashboard: { getOverview: (params) => request(`/dashboard/overview${queryString(params)}`) },
  products: {
    list: async (params) => mapPage(await request(`/products${queryString(params)}`), toProductView),
    create: async (form) => toProductView(await idempotentRequest('product-create','/products',{ sku: form.sku, name: form.name, categoryId: form.categoryId, supplierId: form.supplierId || null, unitPrice: { amount: Number(form.price).toFixed(2), currency: form.currency || 'INR' }, openingStock: Number(form.stock), reorderPoint: Number(form.reorderPoint || 0) })),
    update: async (id, form) => {const body={};if(form.name!==undefined)body.name=form.name;if(form.categoryId!==undefined)body.categoryId=form.categoryId;if(form.supplierId!==undefined)body.supplierId=form.supplierId||null;if(form.price!==undefined)body.unitPrice={amount:Number(form.price).toFixed(2),currency:form.currency||'INR'};if(form.reorderPoint!==undefined)body.reorderPoint=Number(form.reorderPoint||0);if(form.isActive!==undefined)body.isActive=form.isActive;return toProductView(await request(`/products/${encodeURIComponent(id)}`,{method:'PATCH',body}))},
    remove: (id) => request(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  categories: { list: async (params) => mapPage(await request(`/categories${queryString(params)}`), toCategoryView), create: (body) => request('/categories', { method: 'POST', body }), update: (id,body) => request(`/categories/${encodeURIComponent(id)}`,{method:'PATCH',body}), remove: (id) => request(`/categories/${encodeURIComponent(id)}`,{method:'DELETE'}) },
  stockMovements: {
    list: (params) => request(`/stock-movements${queryString(params)}`),
    create: (body) => idempotentRequest('stock-movement','/stock-movements',body),
  },
  suppliers: {
    list: async (params) => mapPage(await request(`/suppliers${queryString(params)}`), toSupplierView),
    create: async (body) => toSupplierView(await request('/suppliers', { method: 'POST', body })),
    update: async (id, body) => toSupplierView(await request(`/suppliers/${encodeURIComponent(id)}`, { method: 'PATCH', body })),
    remove: (id) => request(`/suppliers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  purchases: {
    list: async (params) => mapPage(await request(`/purchases${queryString(params)}`), toPurchaseView),
    get: async (id) => toPurchaseView(await request(`/purchases/${encodeURIComponent(id)}`)),
    create: async (body) => toPurchaseView(await idempotentRequest('purchase-create','/purchases',body)),
    updateStatus: async (id, body) => toPurchaseView(await request(`/purchases/${encodeURIComponent(id)}/status`, { method: 'PATCH', body })),
    update: async (id, body) => toPurchaseView(await request(`/purchases/${encodeURIComponent(id)}`, { method: 'PATCH', body })),
    receive: (id, body) => idempotentRequest(`purchase-receipt-${id}`,`/purchases/${encodeURIComponent(id)}/receipts`,body),
  },
  reports: {
    getInventorySummary: (params) => request(`/reports/inventory${queryString(params)}`),
    async download(format, params = {}) { const query = queryString({ ...params, format }); const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/reports/inventory${query}`, { headers: tokenStore.get() ? { Authorization: `Bearer ${tokenStore.get()}` } : {} }); if (!response.ok) throw new Error('Report export failed.'); const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `stockroom-inventory-report.${format}`; anchor.click(); URL.revokeObjectURL(url) },
  },
  batches: { list: async (params) => mapPage(await request(`/expiry-batches${queryString(params)}`), toBatchView), create: async (body) => toBatchView(await idempotentRequest('batch-receipt','/expiry-batches',body)), update: async(id,body)=>toBatchView(await request(`/expiry-batches/${encodeURIComponent(id)}`,{method:'PATCH',body})), remove:(id)=>request(`/expiry-batches/${encodeURIComponent(id)}`,{method:'DELETE'}) },
  users: { list: async (params) => mapPage(await request(`/users${queryString(params)}`), toUserView), create: async (body) => toUserView(await request('/users', { method: 'POST', body })), updateRole: async (id, body) => toUserView(await request(`/users/${encodeURIComponent(id)}/role`, { method: 'PATCH', body })), roles: async () => request('/roles'), deactivate: (id) => request(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    setStatus: (id,status) => request(`/users/${encodeURIComponent(id)}/status`, { method:'PATCH', body:{status} }) },
  notifications: {
    list: async (params) => {const result=await request(`/notifications${queryString(params)}`);return mapPage(result,toNotificationView)},
    markRead: (id) => request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH', body: { read: true } }),
    markUnread: (id) => request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH', body: { read: false } }),
    markAllRead: () => request('/notifications/read-all',{method:'PATCH',body:{read:true}}),
  },
}
