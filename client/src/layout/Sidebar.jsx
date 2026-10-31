import { NavLink } from 'react-router-dom'
import { Activity, Boxes, CreditCard, FileBarChart, LayoutDashboard, MoreHorizontal, Settings, ShieldCheck, Truck, Users, X } from 'lucide-react'

const workspaceLinks = [
  { label: 'Overview', path: '/', icon: LayoutDashboard }, { label: 'Inventory', path: '/inventory', icon: Boxes },
  { label: 'Stock movements', path: '/stock', icon: Activity }, { label: 'Purchases', path: '/purchases', icon: CreditCard },
  { label: 'Suppliers', path: '/suppliers', icon: Truck }, { label: 'Reports', path: '/reports', icon: FileBarChart },
]
const manageLinks = [{ label: 'Team', path: '/team', icon: Users }, { label: 'Settings', path: '/settings', icon: Settings }]
function LinkList({ items, close, productCount }) { return <nav className="main-nav">{items.map(({ label, path, icon: Icon, badge }) => <NavLink key={path} to={path} end={path === '/'} onClick={close} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={17}/><span>{label}</span>{(badge || (path==='/inventory' && productCount>0)) && <small>{path==='/inventory' ? productCount : badge}</small>}</NavLink>)}</nav> }

export default function Sidebar({ open, onClose, onProfile, canAdmin = true, user, productCount }) {
  const visibleManageLinks=canAdmin?manageLinks:manageLinks.filter(item=>item.path!=='/team')
  return <>
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Boxes size={18} strokeWidth={2.3}/></div><span>stockroom</span><button className="icon-button mobile-close" onClick={onClose} aria-label="Close navigation"><X size={18}/></button></div>
      <div className="workspace-picker" aria-label={`${user?.workspace?.name||'Northstar Studio'} workspace`}><div className="workspace-avatar">{(user?.workspace?.name||'Northstar Studio').slice(0,1)}</div><div className="workspace-copy"><strong>{user?.workspace?.name||'Northstar Studio'}</strong><span>Workspace</span></div></div>
      <div className="nav-caption">WORKSPACE</div><LinkList items={workspaceLinks} close={onClose} productCount={productCount}/>
      <div className="nav-caption management-caption">MANAGE</div><LinkList items={visibleManageLinks} close={onClose}/>
      <div className="sidebar-spacer"/><div className="plan-card"><div className="plan-icon"><ShieldCheck size={16}/></div><div><strong>Good afternoon, {user?.name||'Vittal'}</strong><span>Your inventory is looking healthy.</span></div><span className="icon-button" aria-hidden="true"><MoreHorizontal size={17}/></span></div>
      <button className="profile-row" onClick={onProfile}><div className="profile-avatar">{(user?.name||'Vittal').slice(0,1).toUpperCase()}</div><div className="profile-copy"><strong>{user?.name||'Vittal'}</strong><span>{user?.roles?.includes('administrator')?'Administrator':user?.roles?.includes('inventory_manager')?'Inventory manager':user?'Analyst':'Administrator'}</span></div><MoreHorizontal size={17}/></button>
    </aside>
    {open && <button className="sidebar-scrim" onClick={onClose} aria-label="Close menu"/>}
  </>
}
