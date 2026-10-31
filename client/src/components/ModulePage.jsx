import { CircleHelp, Download } from 'lucide-react'
import { downloadCsv } from '../lib/exportCsv'
import { dataMode } from '../services/api'

export default function ModulePage({ title, eyebrow, description, icon: Icon, columns, rows, loading = false, error = null }) {
  const filename = `${title.toLowerCase().replaceAll(' ', '-')}.csv`

  return <>
    <div className="page-heading">
      <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>
    </div>
    <section className="panel module-panel">
      <div className="module-banner">
        <span><Icon size={19}/></span>
        <div><strong>{title} workspace</strong><p>{dataMode === 'sample' ? 'Sample workspace data · API integration is not connected.' : 'Workspace data from the API provider.'}</p></div>
        <button className="button button-secondary" onClick={() => downloadCsv(filename, columns, rows)}><Download size={15}/> {dataMode === 'sample' ? 'Export sample' : 'Export'}</button>
      </div>
      {loading && <div className="resource-loading" role="status">Loading records…</div>}
      {error && <div className="module-empty-note data-error" role="alert">Could not load {title.toLowerCase()}: {error.message}</div>}
      <div className="module-table-wrap"><table>
        <thead><tr>{columns.map((column) => <th key={column}>{column.toUpperCase()}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{['Active', 'Received', 'In transit'].includes(cell) ? <span className={`status-pill ${cell === 'In transit' ? 'status-blue' : 'status-green'}`}><i/>{cell}</span> : cell}</td>)}</tr>)}</tbody>
      </table></div>
      <div className="module-empty-note"><span className="live-dot"/> {dataMode === 'sample' ? 'Demonstration records are shown until backend services are available.' : 'Records returned by the workspace API.'}</div>
    </section>
    <footer className="page-footer"><span>Stockroom · {dataMode === 'sample' ? 'Sample data' : 'Workspace data'}</span><span><CircleHelp size={14}/> Help center</span></footer>
  </>
}
