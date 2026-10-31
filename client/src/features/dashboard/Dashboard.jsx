import { lazy, Suspense, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight, CircleHelp, Download, Plus } from 'lucide-react'
import ProductTable from '../../components/ProductTable'
import useApiQuery from '../../hooks/useApiQuery'
import { stockroomApi, dataMode } from '../../services/api'
import KpiGrid from './KpiGrid'
import LowStockPanel from './LowStockPanel'
import ActivityFeed from './ActivityFeed'

const InventoryActivityChart = lazy(() => import('./InventoryActivityChart'))
const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()).toUpperCase()

export default function Dashboard({ products, dateRange, setDateRange, flash, onNavigate, onAddProduct, canManage=true, userName='Vittal' }) {
  const apiRange = { 'Last 7 days': '7d', 'Last 30 days': '30d', 'This quarter': 'quarter' }[dateRange]
  const loadOverview = useCallback(() => stockroomApi.dashboard.getOverview({ range: apiRange }), [apiRange])
  const { data: overview, error, loading, reload } = useApiQuery(loadOverview, [loadOverview])
  async function exportInventory(){try{await stockroomApi.reports.download('csv',{range:apiRange})}catch(exportError){flash(`Could not export inventory: ${exportError.message}`)}}
  if (error) return <section className="panel data-error" role="alert"><strong>Dashboard data could not be loaded.</strong><p>{error.status >= 500 ? 'The workspace dashboard query failed. Retry in a moment; if it continues, share the reference below with your administrator.' : error.message}</p>{error.requestId&&<small>Reference: {error.requestId}</small>}<div><button className="button button-secondary" onClick={reload}>Retry</button></div></section>
  return <>
    <div className="page-heading"><div><div className="eyebrow"><span className="live-dot"/> {dataMode === 'sample' ? 'SAMPLE DASHBOARD' : 'WORKSPACE DASHBOARD'} · {dateLabel}</div><h1>Good morning, {userName} <span>✳</span></h1><p>Here’s what’s happening with your inventory today.</p></div>
      <div className="heading-actions"><button className="button button-secondary" onClick={exportInventory}><Download size={15}/> Export inventory</button>{canManage&&<button className="button button-primary" onClick={onAddProduct}><Plus size={16}/> Add product</button>}</div>
    </div>
    {loading && <div className="resource-loading" role="status">Loading workspace…</div>}<KpiGrid stats={overview?.stats}/>
    <div className="dashboard-columns"><Suspense fallback={<div className="panel analytics-panel chart-loading" role="status">Loading activity chart…</div>}><InventoryActivityChart dateRange={dateRange} setDateRange={setDateRange} activity={overview?.activity}/></Suspense><LowStockPanel items={overview?.lowStock} onNavigate={onNavigate} flash={flash}/></div>
    <div className="dashboard-columns lower-columns"><section className="panel products-panel"><div className="panel-header"><div><h2>Product overview</h2><p>Your most recent inventory updates</p></div><Link className="text-link" to="/inventory">All products <ChevronRight size={14}/></Link></div><ProductTable rows={products.slice(0,4)}/></section><ActivityFeed items={overview?.recentActivity || []}/></div>
    <footer className="page-footer"><span>{dataMode === 'sample' ? 'Sample workspace data · Backend APIs are not connected' : 'Workspace data · Live API provider'}</span><span><CircleHelp size={14}/> Help center <span className="footer-dot">·</span><CalendarDays size={14}/> Updated today</span></footer>
  </>
}
