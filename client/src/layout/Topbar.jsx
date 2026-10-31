import { useEffect, useState } from 'react'
import { Bell, ChevronRight, LogOut, Menu, Moon, Search, Sun } from 'lucide-react'
import useApiQuery from '../hooks/useApiQuery'
import { stockroomApi } from '../services/api'

export default function Topbar({ page, theme, onToggleTheme, onOpenNavigation, onOpenSearch, onFlash, user, onLogout }) {
  const [showNotices, setShowNotices] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [noticeError, setNoticeError] = useState('')
  const { data: unreadPage } = useApiQuery(() => stockroomApi.notifications.list({ unreadOnly: true, pageSize: 20 }), [])
  const hasUnread = notifications.length > 0 ? notifications.some((item) => !item.readAt) : Boolean(unreadPage?.items?.length)

  useEffect(() => {
    if (!showNotices) return
    let active = true
    stockroomApi.notifications.list({ pageSize: 20 }).then((result) => { if (active) setNotifications(result.items) }).catch((error) => { if (active) setNoticeError(error.message) })
    return () => { active = false }
  }, [showNotices])

  async function markAllRead() {
    try {
      await stockroomApi.notifications.markAllRead()
      setNotifications((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() })))
      onFlash('Notifications marked as read.')
    } catch (error) { setNoticeError(error.message) }
  }
  async function toggleRead(item){try{if(item.readAt)await stockroomApi.notifications.markUnread(item.id);else await stockroomApi.notifications.markRead(item.id);setNotifications(current=>current.map(row=>row.id===item.id?{...row,readAt:item.readAt?null:new Date().toISOString()}:row))}catch(error){setNoticeError(error.message)}}

  return <header className="topbar">
    <div className="topbar-left"><button className="icon-button menu-trigger" onClick={onOpenNavigation} aria-label="Open navigation"><Menu size={19}/></button><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14}/><strong>{page}</strong></div></div>
    <div className="topbar-actions"><button className="search-trigger" onClick={onOpenSearch} aria-label="Search inventory"><Search size={15}/><span>Search anything...</span><kbd>⌘ K</kbd></button><span className="topbar-divider"/><button className="icon-button theme-toggle" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>{theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>}</button>
      <div className="notice-wrap"><button className="icon-button notification-button" onClick={() => { setNoticeError(''); setShowNotices((open) => !open) }} aria-label="Notifications" aria-expanded={showNotices}><Bell size={17}/>{hasUnread && <i/>}</button>{showNotices && <div className="notification-popover"><strong>Notifications</strong>{noticeError && <p role="alert">{noticeError}</p>}{notifications.map((item) => <p key={item.id} className={item.readAt ? 'notice-read' : ''}><span className="notice-type">{item.type === 'LOW_STOCK' ? '!' : '•'}</span><span><b>{item.title}</b><br/>{item.message}<br/><button className="notification-read-toggle" onClick={()=>toggleRead(item)}>{item.readAt?'Mark unread':'Mark read'}</button></span></p>)}{notifications.length === 0 && !noticeError && <p>You’re all caught up.</p>}<button onClick={markAllRead} disabled={!hasUnread}>Mark all as read</button></div>}</div>{onLogout && <button className="icon-button" onClick={onLogout} aria-label={`Sign out ${user?.name || ''}`} title="Sign out"><LogOut size={16}/></button>}<div className="top-avatar" aria-label={user?.name || 'Vittal'}>{(user?.name || 'V').slice(0,1).toUpperCase()}</div>
    </div>
  </header>
}
