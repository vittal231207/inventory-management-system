import { ArrowDownLeft, ArrowUpRight, Package } from 'lucide-react'

export const products = [
  { sku: 'EL-2048', name: 'Studio Headphones', category: 'Audio', supplier: 'Sonos Wholesale', stock: 8, price: 14999, status: 'Low stock', initials: 'SH', color: 'lavender' },
  { sku: 'AC-1092', name: 'USB-C Hub Pro', category: 'Accessories', supplier: 'Northstar Supply', stock: 142, price: 6999, status: 'In stock', initials: 'UH', color: 'blue' },
  { sku: 'EL-3081', name: 'Wireless Keyboard', category: 'Peripherals', supplier: 'Keyline Co.', stock: 64, price: 8999, status: 'In stock', initials: 'WK', color: 'peach' },
  { sku: 'OF-0018', name: 'Desk Organizer Set', category: 'Office', supplier: 'Form & Field', stock: 5, price: 2499, status: 'Low stock', initials: 'DO', color: 'mint' },
  { sku: 'EL-1884', name: 'Portable SSD 1TB', category: 'Storage', supplier: 'Northstar Supply', stock: 0, price: 8999, status: 'Out of stock', initials: 'SD', color: 'rose' },
]
export const chartData = [{ day: 'Mon', incoming: 38, outgoing: 24 }, { day: 'Tue', incoming: 52, outgoing: 36 }, { day: 'Wed', incoming: 43, outgoing: 28 }, { day: 'Thu', incoming: 69, outgoing: 42 }, { day: 'Fri', incoming: 57, outgoing: 31 }, { day: 'Sat', incoming: 81, outgoing: 48 }, { day: 'Sun', incoming: 68, outgoing: 39 }]
export const activity = [
  { icon: ArrowDownLeft, title: 'Stock received', detail: 'USB-C Hub Pro · 24 units', time: '10:42 AM', tone: 'green' },
  { icon: ArrowUpRight, title: 'Order fulfilled', detail: 'SO-2841 · 3 items', time: '9:18 AM', tone: 'blue' },
  { icon: Package, title: 'Product updated', detail: 'Studio Headphones · price changed', time: 'Yesterday', tone: 'purple' },
]
