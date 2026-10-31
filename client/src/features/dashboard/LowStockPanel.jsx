import AlertRow from '../../components/AlertRow'
import { ArrowUpRight, ChevronRight, Plus } from 'lucide-react'

export default function LowStockPanel({ items, onNavigate, flash }) {
  function exportReorderList(){const rows=[['SKU','Product','Available','Reorder point','Suggested order'] ,...(items||[]).map(item=>[item.sku,item.name,item.available,item.reorderPoint,Math.max(0,item.reorderPoint*2-item.available)])];const csv=rows.map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='stockroom-reorder-list.csv';anchor.click();URL.revokeObjectURL(url);flash(`Reorder list exported with ${items?.length||0} low-stock products.`)}
  const alerts = (items || []).map((item) => ({ initials: item.name.slice(0, 2).toUpperCase(), color: item.color || 'lavender', title: item.name, sku: item.sku, stock: item.available, min: item.reorderPoint }))
  return <section className="panel alerts-panel">
    <div className="panel-header"><div><h2>Needs attention <span className="count-badge">{alerts.length}</span></h2><p>Items below reorder point</p></div><button className="text-link" onClick={() => onNavigate('/inventory')}>View all <ChevronRight size={14}/></button></div>
    <div className="alert-list">{alerts.slice(0, 3).map((item) => <AlertRow key={item.sku} {...item}/>)}</div>
    <button className="reorder-button" onClick={exportReorderList}><Plus size={15}/> Create reorder list <ArrowUpRight size={14}/></button>
  </section>
}
