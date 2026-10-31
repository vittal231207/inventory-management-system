import { activity, chartData, products as seedProducts } from '../../data/sampleData'

const categories = ['Audio', 'Accessories', 'Peripherals', 'Office', 'Storage'].map((name, index) => ({ id: `cat-${index + 1}`, name, active: true }))
let products = seedProducts.map((item, index) => ({ ...item, id: `prod-${index + 1}`, categoryId: categories.find((category) => category.name === item.category)?.id, reorderPoint: item.status === 'Low stock' ? 10 : 0, currency: 'INR' }))
const stockMovements = [
  { id: 'mov-1', type: 'RECEIPT', product: 'USB-C Hub Pro', quantity: 24, reference: 'PO-124', createdAt: 'Today, 10:42 AM' },
  { id: 'mov-2', type: 'FULFILLMENT', product: 'Wireless Keyboard', quantity: -3, reference: 'SO-2841', createdAt: 'Today, 9:18 AM' },
  { id: 'mov-3', type: 'ADJUSTMENT', product: 'Studio Headphones', quantity: 2, reference: 'ADJ-039', createdAt: 'Yesterday' },
]
const suppliers = [
  { id: 'sup-1', name: 'Northstar Supply', contactEmail: 'orders@northstar.example', productCount: 18, leadTimeDays: 5, status: 'Active' },
  { id: 'sup-2', name: 'Sonos Wholesale', contactEmail: 'supply@sonos.example', productCount: 12, leadTimeDays: 7, status: 'Active' },
  { id: 'sup-3', name: 'Form & Field', contactEmail: 'hello@formfield.example', productCount: 8, leadTimeDays: 4, status: 'Active' },
]
const purchases = [
  { id: 'pur-124', orderNumber: 'PO-124', supplierName: 'Northstar Supply', itemCount: 4, total: 342400, status: 'In transit' },
  { id: 'pur-123', orderNumber: 'PO-123', supplierName: 'Sonos Wholesale', itemCount: 2, total: 153600, status: 'Received' },
  { id: 'pur-122', orderNumber: 'PO-122', supplierName: 'Form & Field', itemCount: 6, total: 67200, status: 'Received' },
]
purchases.forEach((purchase,index)=>{const product=products[index%products.length];purchase.supplierId=suppliers[index%suppliers.length].id;purchase.currency='INR';purchase.expectedAt=new Date(Date.now()+86400000).toISOString().slice(0,10);purchase.lines=[{id:`${purchase.id}-line-1`,productId:product.id,productName:product.name,quantityOrdered:4,quantityReceived:purchase.status==='Received'?4:0,unitCost:'1200.00'}]})
const team = [
  { id: 'usr-1', name: 'Vittal', email: 'vittal@northstar.example', role: 'Administrator', lastActive: 'Now', status: 'Active' },
  { id: 'usr-2', name: 'Sanjana', email: 'sanjana@northstar.example', role: 'Inventory manager', lastActive: 'Today', status: 'Active' },
  { id: 'usr-3', name: 'Kayalvizhi', email: 'kayalvizhi@northstar.example', role: 'Analyst', lastActive: 'Yesterday', status: 'Active' },
]
const roles=[{id:'role-admin',key:'administrator',name:'Administrator'},{id:'role-manager',key:'inventory_manager',name:'Inventory manager'},{id:'role-analyst',key:'analyst',name:'Analyst'}]
const batches = [
  { id: 'bat-1', batchNumber: 'LOT-24081', productName: 'Organic Cleaning Solution', receivedAt: '2026-08-12', expiresAt: '2026-11-18', quantity: 24, status: 'EXPIRING_SOON' },
  { id: 'bat-2', batchNumber: 'LOT-24076', productName: 'Thermal Label Rolls', receivedAt: '2026-09-02', expiresAt: '2026-12-14', quantity: 56, status: 'HEALTHY' },
]
batches.forEach((batch,index)=>{batch.productId=products[index%products.length].id;batch.quantityAvailable=batch.quantity})
let notifications = [
  { id: 'not-1', type: 'LOW_STOCK', title: 'Low stock items', message: '3 sample items are below their reorder point.', createdAt: 'Today', readAt: null },
  { id: 'not-2', type: 'PURCHASE_ORDER', title: 'Purchase order ready', message: 'PO-124 is ready to receive.', createdAt: 'Today', readAt: null },
]

const page = (items, params = {}) => {
  const pageSize = Number(params.pageSize || 25)
  const currentPage = Number(params.page || 1)
  return { items: items.slice((currentPage - 1) * pageSize, currentPage * pageSize), page: currentPage, pageSize, total: items.length, totalPages: Math.ceil(items.length / pageSize) }
}
const samplePdf=(report)=>{const inr=new Intl.NumberFormat('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(report.stockValue);const lines=['Stockroom sample inventory report',`Inventory value: INR ${inr}`,'Inventory turnover: 4.8','Units received: 2481','Stockout rate: 1.2%'];const escape=value=>value.replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)');const stream=`BT /F1 16 Tf 54 760 Td (${escape(lines[0])}) Tj /F1 12 Tf 0 -32 Td (${escape(lines[1])}) Tj 0 -22 Td (${escape(lines[2])}) Tj 0 -22 Td (${escape(lines[3])}) Tj 0 -22 Td (${escape(lines[4])}) Tj ET`;const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`});const xref=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(const offset of offsets.slice(1))pdf+=`${String(offset).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return pdf}

export const sampleProvider = {
  auth: {
    async login() { return { accessToken: 'sample-token', tokenType: 'Bearer', expiresAt: null, user: team[0], workspace: { id: 'workspace-sample', name: 'Northstar Studio' } } },
    async logout() { return { success: true } },
    async me() { return { ...team[0], workspace: { id: 'workspace-sample', name: 'Northstar Studio' } } },
  },
  dashboard: {
    async getOverview({ range = '7d' } = {}) {
      const periods = {
        '7d': { total: 486, series: chartData },
        '30d': { total: 1159, series: [{ day: 'Week 1', incoming: 248, outgoing: 183 }, { day: 'Week 2', incoming: 301, outgoing: 212 }, { day: 'Week 3', incoming: 276, outgoing: 201 }, { day: 'Week 4', incoming: 334, outgoing: 248 }] },
        quarter: { total: 3252, series: [{ day: 'Q1', incoming: 820, outgoing: 644 }, { day: 'Q2', incoming: 934, outgoing: 701 }, { day: 'Q3', incoming: 1012, outgoing: 789 }, { day: 'Q4', incoming: 486, outgoing: 351 }] },
      }
      return {
        stats: { totalProducts: 1284, productChangePercent: 8.2, stockValue: 2485600, currency: 'INR', stockValueChangePercent: 12.5, lowStockItems: 12, lowStockChange: -3, pendingOrders: 8, pendingPurchaseValue: 124800, arrivingToday: 2 },
        activity: { ...periods[range] || periods['7d'], changePercent: 6.4 },
        lowStock: [
          { sku: 'EL-2048', name: 'Studio Headphones', available: 8, reorderPoint: 20, category: 'Audio' },
          { sku: 'OF-0018', name: 'Desk Organizer Set', available: 5, reorderPoint: 15, category: 'Office' },
          { sku: 'EL-1884', name: 'Portable SSD 1TB', available: 0, reorderPoint: 10, category: 'Storage' },
        ],
        recentActivity: activity.map((item, index) => ({ id: `act-${index + 1}`, type: item.title, description: item.detail, createdAtLabel: item.time })),
      }
    },
  },
  products: {
    async list(params = {}) { return page(products.filter((product) => (params.status==='INACTIVE'?product.isActive===false:product.isActive!==false)&&(!params.search || `${product.name} ${product.sku}`.toLowerCase().includes(params.search.toLowerCase())) && (!params.categoryId || product.categoryId === params.categoryId) && (!params.status || params.status==='INACTIVE'||params.status===({ 'In stock':'IN_STOCK','Low stock':'LOW_STOCK','Out of stock':'OUT_OF_STOCK'}[product.status]) || params.status===product.status)), params) },
    async create(input) {
      if (products.some((product) => product.sku.toLowerCase() === input.sku.toLowerCase())) {
        const error = new Error('That SKU already exists in the sample catalogue.')
        error.code = 'DUPLICATE_SKU'
        error.status = 409
        throw error
      }
      const category = categories.find((item) => item.id === input.categoryId) || { id: input.categoryId || 'cat-new', name: input.category }
      const product = { ...input, id: `prod-${Date.now()}`, category: category.name, categoryId: category.id, supplier: '', currency: input.currency || 'INR', initials: input.name.slice(0, 2).toUpperCase(), color: 'blue', reorderPoint: input.reorderPoint ?? 10, status: input.stock === 0 ? 'Out of stock' : input.stock <= (input.reorderPoint ?? 10) ? 'Low stock' : 'In stock' }
      products = [product, ...products]
      return product
    },
    async update(id, patch) { const item=products.find((product)=>product.id===id);if(!item)return null;Object.assign(item,patch);if(patch.price!=null)item.price=Number(patch.price);if(patch.reorderPoint!=null)item.status=item.stock===0?'Out of stock':item.stock<=patch.reorderPoint?'Low stock':'In stock';return item },
    async remove(id) { const item=products.find(product=>product.id===id);if(item)item.isActive=false;return {success:true} },
  },
  categories: { async list(params = {}) { return page(categories.filter((item) => !params.search || item.name.toLowerCase().includes(params.search.toLowerCase())), params) }, async create(body) { if(categories.some(item=>item.name.toLowerCase()===body.name.toLowerCase()))throw Object.assign(new Error('Category already exists.'),{status:409});const item = { id: `cat-${Date.now()}`, active: true, ...body }; categories.push(item); return item }, async update(id,patch){const item=categories.find(category=>category.id===id);if(item)Object.assign(item,patch);return item},async remove(id){return this.update(id,{active:false})} },
  stockMovements: {
    async list(params = {}) {
      const rows=stockMovements.filter(item=>(!params.type||item.type===params.type)&&(!params.productId||item.productId===params.productId)&&(!params.search||`${item.productName} ${item.reference||''}`.toLowerCase().includes(params.search.toLowerCase())));
      return page(rows,params)
    },
    async create(body) {
      const product=products.find(item=>item.id===body.productId)
      if(!product)throw new Error('Choose a sample product.')
      const delta=body.type==='ISSUE'?-Math.abs(body.quantity):body.type==='RECEIPT'?Math.abs(body.quantity):body.quantity
      if(body.type==='ADJUSTMENT'&&!body.reason)throw Object.assign(new Error('Adjustments require a reason.'),{status:422})
      if(product.stock+delta<0)throw Object.assign(new Error('Insufficient stock.'),{status:409})
      const today=new Date().toISOString().slice(0,10)
      const eligible=batches.filter(batch=>batch.productId===product.id&&batch.expiresAt>=today&&batch.quantityAvailable>0).sort((a,b)=>a.expiresAt.localeCompare(b.expiresAt))
      if(body.batchId){
        const batch=eligible.find(row=>row.id===body.batchId)
        if(!batch)throw Object.assign(new Error('Choose an unexpired batch for this product.'),{status:422})
        if(delta<0&&batch.quantityAvailable<Math.abs(delta))throw Object.assign(new Error('Insufficient batch stock.'),{status:409})
        batch.quantityAvailable+=delta
      }else if(delta<0&&eligible.length){
        if(eligible.reduce((sum,batch)=>sum+batch.quantityAvailable,0)<Math.abs(delta))throw Object.assign(new Error('Insufficient unexpired batch stock.'),{status:409})
        let remaining=Math.abs(delta)
        for(const batch of eligible){const take=Math.min(batch.quantityAvailable,remaining);batch.quantityAvailable-=take;remaining-=take;if(!remaining)break}
      }
      product.stock+=delta
      product.status=product.stock===0?'Out of stock':product.stock<=product.reorderPoint?'Low stock':'In stock'
      const movement={id:`mov-${Date.now()}`,...body,quantity:delta,productName:product.name,createdAt:new Date().toISOString()}
      stockMovements.unshift(movement)
      return movement
    },
  },
  suppliers: { async list(params = {}) { return page(suppliers.filter(item=>(!params.search||item.name.toLowerCase().includes(params.search.toLowerCase()))&&(!params.status||item.status.toUpperCase()===params.status)), params) }, async create(body) { const item = { id: `sup-${Date.now()}`, status: 'Active', productCount:0,...body }; suppliers.push(item); return item }, async update(id, patch) { const item = suppliers.find((supplier) => supplier.id === id); if(item)Object.assign(item,patch,{status:patch.status?patch.status[0]+patch.status.slice(1).toLowerCase():item.status}); return item },async remove(id){return this.update(id,{status:'Inactive'})} },
  purchases: {
    async list(params = {}) { return page(purchases.filter(p=>!params.status||p.status.toUpperCase().replaceAll(' ','_')===params.status),params) },
    async get(id) { return purchases.find(p=>p.id===id)||null },
    async create(body) {
      const supplier=suppliers.find(item=>item.id===body.supplierId&&item.status!=='Inactive')
      if(!supplier) throw Object.assign(new Error('Choose an active sample supplier.'),{status:422})
      if(!body.lines?.length||body.lines.some(line=>!products.some(product=>product.id===line.productId&&product.isActive!==false))) throw Object.assign(new Error('Every purchase line must reference an active sample product.'),{status:422})
      const lines=body.lines.map((line,index)=>({...line,id:`line-${Date.now()}-${index}`,quantityReceived:0,productName:products.find(p=>p.id===line.productId)?.name}))
      const item={id:`pur-${Date.now()}`,orderNumber:`PO-${Date.now().toString().slice(-3)}`,status:'Draft',supplierName:supplier.name,supplierId:supplier.id,currency:body.currency||'INR',expectedAt:body.expectedAt||'',notes:body.notes||'',itemCount:lines.length,total:lines.reduce((sum,line)=>sum+Number(line.unitCost)*line.quantityOrdered,0),lines}
      purchases.unshift(item);return item
    },
    async update(id,body) {
      const item=purchases.find(p=>p.id===id);if(!item)throw Object.assign(new Error('Purchase order not found.'),{status:404})
      if(item.status!=='Draft')throw Object.assign(new Error('Only draft purchase orders can be edited.'),{status:409})
      if(body.supplierId&&!suppliers.some(s=>s.id===body.supplierId&&s.status!=='Inactive'))throw Object.assign(new Error('Choose an active sample supplier.'),{status:422})
      if(body.lines?.some(line=>!products.some(product=>product.id===line.productId&&product.isActive!==false)))throw Object.assign(new Error('Every purchase line must reference an active sample product.'),{status:422})
      Object.assign(item,body,{supplierName:suppliers.find(s=>s.id===(body.supplierId||item.supplierId))?.name||item.supplierName})
      if(body.lines){item.lines=body.lines.map((line,index)=>({...line,id:`line-${Date.now()}-${index}`,quantityReceived:0,productName:products.find(p=>p.id===line.productId)?.name}));item.itemCount=item.lines.length}
      item.total=item.lines.reduce((sum,line)=>sum+Number(line.unitCost)*line.quantityOrdered,0);return item
    },
    async updateStatus(id,body) {
      const item=purchases.find(p=>p.id===id);if(!item)throw Object.assign(new Error('Purchase order not found.'),{status:404})
      const next=({IN_TRANSIT:'In transit',PARTIALLY_RECEIVED:'Partially received'}[body.status]||body.status.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,char=>char.toUpperCase()))
      const allowed={Draft:['Submitted','Cancelled'],Submitted:['Ordered','Cancelled'],Ordered:['In transit','Cancelled'],'In transit':[],'Partially received':[],Received:[],Cancelled:[]}
      if(!allowed[item.status]?.includes(next))throw Object.assign(new Error(`Cannot transition a ${item.status} purchase to ${next}.`),{status:409})
      if(next==='Cancelled'&&item.lines.some(line=>line.quantityReceived>0))throw Object.assign(new Error('An order with receipts cannot be cancelled.'),{status:409})
      item.status=next;return item
    },
    async receive(id,body) {
      const purchase=purchases.find(item=>item.id===id);if(!purchase)throw Object.assign(new Error('Purchase order not found.'),{status:404})
      if(!['Ordered','In transit','Partially received'].includes(purchase.status))throw Object.assign(new Error('Purchase order is not ready to receive.'),{status:409})
      const totals=new Map()
      for(const received of body.lines){const line=purchase.lines.find(row=>row.id===received.purchaseLineId);if(!line)throw Object.assign(new Error('Purchase line not found.'),{status:409});const total=(totals.get(line.id)||line.quantityReceived)+received.quantityReceived;totals.set(line.id,total);if(total>line.quantityOrdered)throw Object.assign(new Error('Receipt exceeds the remaining quantity.'),{status:409});if(Boolean(received.batchNumber)!==Boolean(received.expiresAt))throw Object.assign(new Error('Provide both batch number and expiry date, or neither.'),{status:422})}
      for(const received of body.lines){const line=purchase.lines.find(row=>row.id===received.purchaseLineId);line.quantityReceived+=received.quantityReceived;const product=products.find(p=>p.id===line.productId);if(product){product.stock+=received.quantityReceived;product.status=product.stock===0?'Out of stock':product.stock<=product.reorderPoint?'Low stock':'In stock'}if(received.batchNumber)batches.unshift({id:`bat-${Date.now()}-${batches.length}`,batchNumber:received.batchNumber,productId:line.productId,productName:line.productName,receivedAt:body.receivedAt||new Date().toISOString().slice(0,10),expiresAt:received.expiresAt,quantity:received.quantityReceived,quantityAvailable:received.quantityReceived,status:'HEALTHY'})}
      purchase.status=purchase.lines.every(line=>line.quantityReceived>=line.quantityOrdered)?'Received':'Partially received';return{id:`receipt-${Date.now()}`,purchaseId:id,...body,status:purchase.status}
    }
  },
  users: { async list(params = {}) { return page(team.filter(user=>!params.search||`${user.name} ${user.email}`.toLowerCase().includes(params.search.toLowerCase())), params) }, async create(body) { const item = { id: `usr-${Date.now()}`, status: 'Active', role:roles.find(r=>r.id===body.roleIds?.[0])?.key||'Analyst',...body }; team.push(item); return item }, async updateRole(id, body) { const item = team.find((user) => user.id === id); if(item){item.role=roles.find(r=>r.id===body.roleIds?.[0])?.key||body.role;}; return item },async roles(){return roles},async deactivate(id){const item=team.find(user=>user.id===id);if(item)item.status='Inactive';return {success:true}} },
  reports: { async getInventorySummary({ range = '30d' } = {}) { const days=range==='7d'?7:range==='quarter'?90:30;return { range:{from:new Date(Date.now()-days*86400000).toISOString().slice(0,10),to:new Date().toISOString().slice(0,10),currency:'INR'}, stockValue:2485600, inventoryTurnover: 4.8, unitsReceived: 2481, stockoutRatePercent: 1.2, change: { turnover: 0.6, unitsReceivedPercent: 12.4, stockoutRatePercent: -0.3 }, series: chartData.map(row=>({day:row.day,received:row.incoming,issued:row.outgoing})) } },async download(format, params={}){const report=await this.getInventorySummary(params);const content=format==='csv'?`metric,value,currency,symbol\nrangeFrom,${report.range.from},,\nrangeTo,${report.range.to},,\ncurrency,${report.range.currency},,₹\nstockValue,${report.stockValue},${report.range.currency},₹\ninventoryTurnover,${report.inventoryTurnover},\nunitsReceived,${report.unitsReceived},\nstockoutRatePercent,${report.stockoutRatePercent},\n`:samplePdf(report);const type=format==='csv'?'text/csv':'application/pdf';const url=URL.createObjectURL(new Blob([content],{type}));const anchor=document.createElement('a');anchor.href=url;anchor.download=`stockroom-sample-report.${format}`;anchor.click();URL.revokeObjectURL(url)} },
  batches: { async list(params = {}) { return page(batches.filter(item=>(!params.productId||item.productId===params.productId)&&(!params.status||item.status===params.status)), params) }, async create(body) { const product=products.find(p=>p.id===body.productId);if(!product)throw new Error('Choose a sample product.');const item={id:`bat-${Date.now()}`,...body,productName:product.name,quantity:body.quantityReceived,quantityAvailable:body.quantityReceived,status:'HEALTHY'};batches.push(item);product.stock+=body.quantityReceived;product.status=product.stock<=product.reorderPoint?'Low stock':'In stock';return item },async update(id,body){const item=batches.find(batch=>batch.id===id);if(item)Object.assign(item,body);return item},async remove(id){const index=batches.findIndex(batch=>batch.id===id);if(index<0)return {success:true};if(batches[index].quantityAvailable>0)throw new Error('A batch with available units cannot be removed.');batches.splice(index,1);return {success:true}} },
  notifications: { async list(params = {}) { return page(notifications.filter((item) => params.unreadOnly ? !item.readAt : true), params) }, async markRead(id) { const item = notifications.find((notification) => notification.id === id); if (item) item.readAt = new Date().toISOString(); return item }, async markAllRead() { notifications = notifications.map((item) => ({ ...item, readAt: new Date().toISOString() })); return { success: true } } },
}
