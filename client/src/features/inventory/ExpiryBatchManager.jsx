import { useCallback } from 'react'
import { Layers3 } from 'lucide-react'
import ResourceManager from '../../components/ResourceManager'
import useApiQuery from '../../hooks/useApiQuery'
import { stockroomApi } from '../../services/api'

export default function ExpiryBatchManager({canManage=true}){
 const loadProducts=useCallback(()=>stockroomApi.products.list({page:1,pageSize:1000}),[]),{data:products}=useApiQuery(loadProducts,[loadProducts])
 const fields=[{name:'productId',label:'Product',options:(products?.items||[]).map(p=>({value:p.id,label:p.name}))},{name:'batchNumber',label:'Batch number',maxLength:100},{name:'receivedAt',label:'Received date',type:'date'},{name:'expiresAt',label:'Expiry date',type:'date'},{name:'quantityReceived',label:'Quantity received',type:'number',min:1,createOnly:true}]
 const prepare=(value,item)=>item?{batchNumber:value.batchNumber,expiresAt:value.expiresAt}:{...value,quantityReceived:Number(value.quantityReceived)}
 return <ResourceManager canManage={canManage} title="Expiry batches" eyebrow="TRACEABILITY" description="Track batch quantities and expiry dates; stock-out movements consume earliest-expiring lots first." icon={Layers3} columns={['Batch','Product','Received','Expires','Available','Status']} load={stockroomApi.batches.list} create={stockroomApi.batches.create} update={stockroomApi.batches.update} fields={fields} prepare={prepare} filters={['HEALTHY','EXPIRING_SOON','EXPIRED','DEPLETED'].map(value=>({value,label:value.replaceAll('_',' ')}))} toRow={batch=>[batch.batchNumber,batch.productName,batch.receivedAt,batch.expiresAt,`${batch.quantity} units`,batch.status.replaceAll('_',' ')]} actions={[{label:'Delete',show:item=>item.quantity===0,run:item=>stockroomApi.batches.remove(item.id)}]}/>
}
