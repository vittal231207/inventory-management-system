import { useCallback } from 'react'
import { Activity } from 'lucide-react'
import ResourceManager from '../../components/ResourceManager'
import useApiQuery from '../../hooks/useApiQuery'
import { stockroomApi } from '../../services/api'

const typeOptions=[{value:'RECEIPT',label:'Stock in'},{value:'ISSUE',label:'Stock out'},{value:'ADJUSTMENT',label:'Adjustment'}]
export default function StockMovementsPage({canManage=true}){
 const loadProducts=useCallback(()=>stockroomApi.products.list({page:1,pageSize:1000}),[]),{data:products}=useApiQuery(loadProducts,[loadProducts])
 const loadBatches=useCallback(()=>stockroomApi.batches.list({page:1,pageSize:1000}),[]),{data:batches}=useApiQuery(loadBatches,[loadBatches])
 const fields=[{name:'productId',label:'Product',options:(products?.items||[]).map(p=>({value:p.id,label:`${p.name} · ${p.sku}`}))},{name:'type',label:'Movement',options:typeOptions},{name:'quantity',label:'Quantity (use a negative number to reduce stock for adjustments)',type:'number',step:1},{name:'batchId',label:'Batch (optional; stock out uses FEFO when blank)',required:false,options:(batches?.items||[]).map(batch=>({value:batch.id,label:`${batch.batchNumber} · ${batch.productName} · ${batch.quantity} units`}))},{name:'reason',label:'Reason or reference',type:'textarea',maxLength:500}]
 return <ResourceManager canManage={canManage} title="Stock movements" eyebrow="INVENTORY CONTROL" description="Receive goods, dispatch stock and record audited adjustments." icon={Activity} columns={['Movement','Product','Quantity','Reference','Date']} load={stockroomApi.stockMovements.list} create={stockroomApi.stockMovements.create} fields={fields} filterKey="type" filters={typeOptions} prepare={value=>({...value,quantity:value.type==='ISSUE'?Math.abs(value.quantity):value.type==='RECEIPT'?Math.abs(value.quantity):value.quantity,batchId:value.batchId||null,reference:value.reason})} toRow={item=>[{RECEIPT:'Received',ISSUE:'Dispatched',ADJUSTMENT:'Adjustment'}[item.type]||item.type,item.productName||item.product,`${item.quantity>0?'+':''}${item.quantity} units`,item.reference||item.reason||'—',item.createdAtLabel||new Date(item.createdAt).toLocaleString()]}/>
}
