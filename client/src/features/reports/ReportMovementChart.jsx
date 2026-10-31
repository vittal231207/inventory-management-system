import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function ReportMovementChart({ series = [] }) {
  return <section className="panel report-chart-panel">
    <div className="panel-header"><div><h2>Stock movement</h2><p>Received and dispatched units in the selected period</p></div></div>
    {series.length ? <div className="report-chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={series} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}>
      <defs><linearGradient id="reportReceivedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6567e9" stopOpacity={0.15}/><stop offset="95%" stopColor="#6567e9" stopOpacity={0}/></linearGradient></defs>
      <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 5"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill:'var(--muted)',fontSize:10 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill:'var(--muted)',fontSize:10 }}/><Tooltip contentStyle={{ background:'var(--panel)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)' }}/>
      <Area type="monotone" dataKey="received" name="Received" stroke="#6567e9" strokeWidth={2} fill="url(#reportReceivedFill)"/><Area type="monotone" dataKey="issued" name="Dispatched" stroke="#a8b0c0" strokeWidth={2} fill="transparent" strokeDasharray="5 4"/>
    </AreaChart></ResponsiveContainer></div> : <div className="report-chart-empty">No stock movements were recorded in this period.</div>}
  </section>
}
