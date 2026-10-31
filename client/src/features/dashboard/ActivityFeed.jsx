import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, ArrowUpRight as OpenIcon, Package } from 'lucide-react'
import { dataMode } from '../../services/api'

const icons = { 'Stock received': ArrowDownLeft, 'Order fulfilled': ArrowUpRight, 'Product updated': Package }
const tones = { 'Stock received': 'green', 'Order fulfilled': 'blue', 'Product updated': 'purple' }

export default function ActivityFeed({ items = [] }) {
  return <section className="panel activity-panel">
    <div className="panel-header"><div><h2>Recent activity</h2><p>{dataMode === 'sample' ? 'Latest sample updates from your team' : 'Latest updates from your team'}</p></div></div>
    <div className="activity-list">{items.map((item) => { const Icon = icons[item.type] || Package; return <div className="activity-item" key={item.id}><span className={`activity-icon ${tones[item.type] || 'purple'}`}><Icon size={15}/></span><div className="activity-copy"><strong>{item.type}</strong><span>{item.description}</span></div><time>{item.createdAtLabel}</time></div> })}{items.length === 0 && <p className="empty-resource">No recent activity.</p>}</div>
    <Link className="activity-footer" to="/stock">View stock movements <OpenIcon size={13}/></Link>
  </section>
}
