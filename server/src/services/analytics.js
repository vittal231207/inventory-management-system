const { pool } = require('./repository')
const { HttpError } = require('../utils/errors')

const DAY = 86400000
const sqlDay = 'DATE_FORMAT(created_at,"%Y-%m-%d")'

function windowFromQuery(query) {
  const isDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
    const parsed = new Date(`${value}T00:00:00.000Z`)
    return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value
  }
  if ((query.from && !isDate(query.from)) || (query.to && !isDate(query.to))) {
    throw new HttpError(422, 'INVALID_DATE_RANGE', 'Dates must use a valid YYYY-MM-DD calendar date.')
  }
  if (!['7d', '30d', 'quarter', undefined].includes(query.range)) {
    throw new HttpError(400, 'INVALID_RANGE', 'Choose 7d, 30d, or quarter.')
  }
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const days = query.range === '7d' ? 7 : query.range === 'quarter' ? 90 : 30
  const end = query.to ? new Date(`${query.to}T23:59:59.999Z`) : new Date(today.getTime() + DAY - 1)
  const start = query.from ? new Date(`${query.from}T00:00:00.000Z`) : new Date(end.getTime() - days * DAY + 1)
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || start > end || end - start > 366 * DAY) {
    throw new HttpError(422, 'INVALID_DATE_RANGE', 'Provide a valid range no longer than 366 days.')
  }
  return { start, end, days: Math.max(1, Math.ceil((end - start + 1) / DAY)) }
}

async function rangeSummary(workspaceId, start, end) {
  const [[movements]] = await pool.query(
    'SELECT COALESCE(SUM(CASE WHEN type="RECEIPT" THEN quantity_delta ELSE 0 END),0) received,COALESCE(SUM(CASE WHEN type="ISSUE" THEN -quantity_delta ELSE 0 END),0) issued,COALESCE(SUM(quantity_delta),0) balanceDelta FROM stock_movements WHERE workspace_id=? AND type IN ("RECEIPT","ISSUE","ADJUSTMENT","RESERVATION","RELEASE") AND created_at>=? AND created_at<=?',
    [workspaceId, start, end],
  )
  const [items] = await pool.query(
    'SELECT p.unit_price,p.reorder_point,b.on_hand-b.reserved available,COALESCE(SUM(m.quantity_delta),0) afterDelta FROM products p JOIN inventory_balances b ON b.product_id=p.id LEFT JOIN stock_movements m ON m.product_id=p.id AND m.workspace_id=p.workspace_id AND m.type IN ("RECEIPT","ISSUE","ADJUSTMENT","RESERVATION","RELEASE") AND m.created_at>? WHERE p.workspace_id=? AND p.is_active=1 GROUP BY p.id,p.unit_price,p.reorder_point,b.on_hand,b.reserved',
    [end, workspaceId],
  )
  const products = items.length
  const periodRows = items.map(item => ({ available: Number(item.available) - Number(item.afterDelta), price: Number(item.unit_price), reorder: Number(item.reorder_point) }))
  const closing = periodRows.reduce((sum, item) => sum + item.available, 0)
  const opening = closing - Number(movements.balanceDelta)
  const average = Math.max(0, (opening + closing) / 2)
  const stockValue = periodRows.reduce((sum, item) => sum + item.available * item.price, 0)
  const low = periodRows.filter(item => item.available <= item.reorder).length
  const out = periodRows.filter(item => item.available <= 0).length
  return {
    received: Number(movements.received), issued: Number(movements.issued),
    turnover: average ? Number(movements.issued) / average : 0,
    stockoutRatePercent: products ? out / products * 100 : 0,
    lowStock: low, pastLow: low, stockValue, pastValue: stockValue,
    pastStockoutRatePercent: products ? out / products * 100 : 0, products,
  }
}

const percent = (current, previous) => previous ? (current - previous) / previous * 100 : 0

async function movementSeries(workspaceId, start, end, positiveName, negativeName) {
  const [rows] = await pool.query(
    `SELECT ${sqlDay} day,COALESCE(SUM(CASE WHEN quantity_delta>0 THEN quantity_delta ELSE 0 END),0) positive,COALESCE(SUM(CASE WHEN quantity_delta<0 THEN -quantity_delta ELSE 0 END),0) negative FROM stock_movements WHERE workspace_id=? AND type IN ("RECEIPT","ISSUE") AND created_at>=? AND created_at<=? GROUP BY ${sqlDay} ORDER BY ${sqlDay}`,
    [workspaceId, start, end],
  )
  return rows.map(row => ({ day: row.day, [positiveName]: Number(row.positive), [negativeName]: Number(row.negative) }))
}

async function dashboard(workspaceId, query) {
  const range = windowFromQuery(query)
  const previousStart = new Date(range.start.getTime() - range.days * DAY)
  const previousEnd = new Date(range.start.getTime() - 1)
  const [current, previous] = await Promise.all([
    rangeSummary(workspaceId, range.start, range.end),
    rangeSummary(workspaceId, previousStart, previousEnd),
  ])
  const [[counts]] = await pool.query(
    'SELECT COUNT(*) totalProducts,COALESCE(SUM(created_at>=? AND created_at<=?),0) newProducts,COALESCE(SUM(created_at>=? AND created_at<=?),0) previousNewProducts FROM products WHERE workspace_id=? AND is_active=1',
    [range.start, range.end, previousStart, previousEnd, workspaceId],
  )
  const [[purchases]] = await pool.query(
    'SELECT COUNT(DISTINCT po.id) pendingOrders,COALESCE(SUM(l.quantity_ordered*l.unit_cost),0) pendingPurchaseValue,COUNT(DISTINCT CASE WHEN po.expected_at=UTC_DATE() THEN po.id END) arrivingToday FROM purchase_orders po LEFT JOIN purchase_order_lines l ON l.purchase_order_id=po.id WHERE po.workspace_id=? AND po.status IN ("SUBMITTED","ORDERED","IN_TRANSIT","PARTIALLY_RECEIVED")',
    [workspaceId],
  )
  const [lowStock] = await pool.query(
    'SELECT p.id,p.sku,p.name,p.supplier_id supplierId,b.on_hand-b.reserved available,p.reorder_point reorderPoint,c.name category FROM products p JOIN inventory_balances b ON b.product_id=p.id JOIN categories c ON c.id=p.category_id WHERE p.workspace_id=? AND p.is_active=1 AND b.on_hand-b.reserved<=p.reorder_point ORDER BY available,p.name LIMIT 8',
    [workspaceId],
  )
  const series = await movementSeries(workspaceId, range.start, range.end, 'incoming', 'outgoing')
  const [activity] = await pool.query(
    'SELECT m.id,m.type,m.quantity_delta quantity,p.name description,m.created_at createdAt,m.reason FROM stock_movements m JOIN products p ON p.id=m.product_id WHERE m.workspace_id=? ORDER BY m.created_at DESC LIMIT 8',
    [workspaceId],
  )
  const [[workspace]] = await pool.query('SELECT currency FROM workspaces WHERE id=?', [workspaceId])
  const volume = current.received + current.issued
  const previousVolume = previous.received + previous.issued
  const typeNames = { RECEIPT: 'Stock received', ISSUE: 'Stock issued', ADJUSTMENT: 'Stock adjusted', RESERVATION: 'Stock reserved', RELEASE: 'Reservation released' }
  return {
    stats: {
      totalProducts: Number(counts.totalProducts),
      productChangePercent: percent(Number(counts.newProducts), Number(counts.previousNewProducts)),
      stockValue: current.stockValue, currency: workspace?.currency || 'INR',
      stockValueChangePercent: percent(current.stockValue, previous.pastValue),
      lowStockItems: current.lowStock, lowStockChange: current.lowStock - previous.pastLow,
      pendingOrders: Number(purchases.pendingOrders), pendingPurchaseValue: Number(purchases.pendingPurchaseValue), arrivingToday: Number(purchases.arrivingToday),
    },
    activity: {
      total: volume, changePercent: percent(volume, previousVolume),
      series: series.map(row => ({ ...row, day: new Date(`${row.day}T00:00:00Z`).toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' }) })),
    },
    lowStock,
    recentActivity: activity.map(item => ({
      ...item,
      type: typeNames[item.type] || item.type,
      description: `${item.description} · ${Math.abs(Number(item.quantity))} units${item.reason ? ` · ${item.reason}` : ''}`,
      createdAtLabel: new Date(item.createdAt).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }),
    })),
  }
}

async function inventoryReport(workspaceId, query) {
  const range = windowFromQuery(query)
  const previousStart = new Date(range.start.getTime() - range.days * DAY)
  const previousEnd = new Date(range.start.getTime() - 1)
  const [current, previous] = await Promise.all([
    rangeSummary(workspaceId, range.start, range.end),
    rangeSummary(workspaceId, previousStart, previousEnd),
  ])
  const series = await movementSeries(workspaceId, range.start, range.end, 'received', 'issued')
  const [[workspace]] = await pool.query('SELECT currency FROM workspaces WHERE id=?', [workspaceId])
  return {
    range: { from: range.start.toISOString().slice(0, 10), to: range.end.toISOString().slice(0, 10), currency: workspace?.currency || 'INR' },
    stockValue: Number(current.stockValue.toFixed(2)),
    inventoryTurnover: Number(current.turnover.toFixed(2)), unitsReceived: current.received,
    stockoutRatePercent: Number(current.stockoutRatePercent.toFixed(2)),
    change: {
      turnover: Number((current.turnover - previous.turnover).toFixed(2)),
      unitsReceivedPercent: Number(percent(current.received, previous.received).toFixed(2)),
      stockoutRatePercent: Number((current.stockoutRatePercent - previous.stockoutRatePercent).toFixed(2)),
    },
    series,
  }
}

module.exports = { dashboard, inventoryReport, windowFromQuery }
