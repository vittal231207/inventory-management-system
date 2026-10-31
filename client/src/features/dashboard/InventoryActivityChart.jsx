import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowUpRight } from 'lucide-react'

export default function InventoryActivityChart({ dateRange, setDateRange, activity = {} }) {
  const apiRange = { '7d': 'Last 7 days', '30d': 'Last 30 days', quarter: 'This quarter' }
  const period = activity
  return <section className="panel analytics-panel">
    <div className="panel-header"><div><h2>Inventory activity</h2><p>Stock movement across your workspace</p></div>
      <div className="chart-legend"><span><i className="legend-in"/> Received</span><span><i className="legend-out"/> Dispatched</span><select value={apiRange[dateRange] || dateRange} onChange={(event) => setDateRange(event.target.value)} aria-label="Chart date range"><option>Last 7 days</option><option>Last 30 days</option><option>This quarter</option></select></div>
    </div>
    <div className="chart-summary"><strong>{Number(period.total || 0).toLocaleString()} <span>units</span></strong><span className="trend up"><ArrowUpRight size={13}/> {period.changePercent || 0}%</span><span className="summary-caption">vs. previous period</span></div>
    <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={period.series || []} margin={{top:8,right:4,left:-22,bottom:0}}>
      <defs><linearGradient id="receivedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6467ed" stopOpacity={0.16}/><stop offset="95%" stopColor="#6467ed" stopOpacity={0}/></linearGradient></defs>
      <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 5"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'var(--muted)',fontSize:11}} dy={10}/><YAxis axisLine={false} tickLine={false} tick={{fill:'var(--muted)',fontSize:11}}/><Tooltip contentStyle={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:10,color:'var(--text)'}}/>
      <Area type="monotone" dataKey="incoming" name="Received" stroke="#6567e9" strokeWidth={2.5} fill="url(#receivedFill)"/><Area type="monotone" dataKey="outgoing" name="Dispatched" stroke="#a8b0c0" strokeWidth={2} fill="transparent" strokeDasharray="5 4"/>
    </AreaChart></ResponsiveContainer></div>
  </section>
}
