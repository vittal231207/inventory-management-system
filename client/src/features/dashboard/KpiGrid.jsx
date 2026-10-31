import { AlertTriangle, ArrowDownRight, ArrowUpRight, CreditCard, Package, Truck } from 'lucide-react'
import { formatCurrency } from '../../lib/currency'

export default function KpiGrid({ stats = {} }) {
  const cards = [
    { label: 'Total products', value: Number(stats.totalProducts || 0).toLocaleString(), icon: Package, color: 'icon-indigo', trend: `${stats.productChangePercent ?? 0}%`, note: 'Across active categories', graphic: 'bars' },
    { label: 'Stock value', value: formatCurrency(stats.stockValue, stats.currency || 'INR'), icon: CreditCard, color: 'icon-green', trend: `${stats.stockValueChangePercent ?? 0}%`, note: 'At cost value', graphic: 'line' },
    { label: 'Low stock items', value: String(stats.lowStockItems || 0), unit: 'items', icon: AlertTriangle, color: 'icon-amber', trend: `${Math.abs(stats.lowStockChange || 0)} items`, note: 'Below reorder point', graphic: 'meter' },
    { label: 'Pending orders', value: String(stats.pendingOrders || 0).padStart(2, '0'), unit: 'orders', icon: Truck, color: 'icon-blue', amount: formatCurrency(stats.pendingPurchaseValue, stats.currency || 'INR'), note: `${stats.arrivingToday || 0} arriving today`, graphic: 'dots' },
  ]
  return <div className="dashboard-grid">{cards.map((card) => <KpiCard key={card.label} {...card}/>)}</div>
}

function KpiCard({ label, value, unit, icon: Icon, color, trend, amount, note, graphic }) {
  return <section className="kpi-card">
    <div className="kpi-top"><span>{label}</span><span className={`kpi-icon ${color}`}><Icon size={17}/></span></div>
    <div className="kpi-number">{value} {unit && <small>{unit}</small>}</div>
    <div className="kpi-foot">{amount ? <span className="neutral-pill">{amount}</span> : <span className={`trend ${graphic === 'meter' ? 'down' : 'up'}`}>{graphic === 'meter' ? <ArrowDownRight size={13}/> : <ArrowUpRight size={13}/>} {trend}</span>}<span>{amount ? 'total value' : 'vs. last month'}</span><span className="kpi-note">{note}</span></div>
    <KpiGraphic type={graphic}/>
  </section>
}
function KpiGraphic({ type }) {
  if (type === 'bars') return <div className="mini-bars" aria-hidden="true">{[36,50,43,65,52,78,62,91,70,100].map((height,index)=><i key={index} style={{height:`${height}%`}}/>)}</div>
  if (type === 'line') return <div className="value-line" aria-hidden="true"><span style={{width:'71%'}}/></div>
  if (type === 'meter') return <div className="stock-meter" aria-hidden="true">{Array.from({length:12},(_,index)=><span key={index}/>)}</div>
  return <div className="order-dots" aria-hidden="true">{Array.from({length:8},(_,index)=><i key={index}/>)}</div>
}
