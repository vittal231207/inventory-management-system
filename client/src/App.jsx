import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Boxes } from 'lucide-react'
import Sidebar from './layout/Sidebar'
import Topbar from './layout/Topbar'
import ProductFormModal from './components/ProductFormModal'
import { dataMode, stockroomApi } from './services/api'
import { tokenStore } from './services/api/httpClient'
import './App.css'

const Dashboard = lazy(() => import('./features/dashboard/Dashboard'))
const Inventory = lazy(() => import('./features/inventory/Inventory'))
const Reports = lazy(() => import('./features/reports/Reports'))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'))
const StockMovementsPage = lazy(() => import('./features/stock/StockMovementsPage'))
const PurchasesPage = lazy(() => import('./features/purchases/PurchasesPage'))
const SuppliersPage = lazy(() => import('./features/suppliers/SuppliersPage'))
const TeamPage = lazy(() => import('./features/team/TeamPage'))

function LoadingPage() { return <div className="route-loading" role="status">Loading Stockroom…</div> }

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('stockroom-theme') || 'light')
  const [mobileNav, setMobileNav] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All items')
  const [category, setCategory] = useState('All categories')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [productTotal, setProductTotal] = useState(0)
  const [productPages, setProductPages] = useState(1)
  const [productPage, setProductPage] = useState(1)
  const [productRefresh, setProductRefresh] = useState(0)
  const [notice, setNotice] = useState('')
  const toastTimer = useRef(null)
  const [dateRange, setDateRange] = useState('Last 7 days')
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [apiUser, setApiUser] = useState(null)
  const [authReady, setAuthReady] = useState(dataMode !== 'api' || !tokenStore.get())
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [searchFocusRequest, setSearchFocusRequest] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()
  const navLabels = { '/': 'Overview', '/inventory': 'Inventory', '/stock': 'Stock movements', '/purchases': 'Purchases', '/suppliers': 'Suppliers', '/reports': 'Reports', '/team': 'Team', '/settings': 'Settings' }
  const page = navLabels[location.pathname] || 'Overview'
  const canManage=dataMode==='sample'||apiUser?.roles?.some(role=>['administrator','inventory_manager'].includes(role))
  const canAdmin=dataMode==='sample'||apiUser?.roles?.includes('administrator')
  useEffect(() => {
    if (dataMode !== 'api' || !tokenStore.get()) return undefined
    let active=true
    stockroomApi.auth.me().then(user=>{if(active)setApiUser(user)}).catch(()=>{tokenStore.clear()}).finally(()=>{if(active)setAuthReady(true)})
    return()=>{active=false}
  }, [])

  useEffect(() => {
    if (dataMode === 'api' && !apiUser) return undefined
    let active = true
    Promise.all([stockroomApi.categories.list({ page: 1, pageSize: 1000 }), stockroomApi.suppliers.list({ page: 1, pageSize: 1000 })])
      .then(([categoryPage, supplierPage]) => {
        if (!active) return
        setCategories(categoryPage.items)
        setSuppliers(supplierPage.items)
      })
      .catch((error) => { if (active) flash(`Could not load workspace records: ${error.message}`) })
    return () => { active = false }
    // Load the initial catalogue once; user filters are applied to the view models locally.
  }, [apiUser])

  useEffect(() => {
    if (dataMode === 'api' && !apiUser) return undefined
    let active=true
    const timer=window.setTimeout(()=>{
      const categoryId=category==='All categories'?undefined:categories.find(item=>item.name===category)?.id
      const status={'In stock':'IN_STOCK','Low stock':'LOW_STOCK','Out of stock':'OUT_OF_STOCK','Inactive':'INACTIVE'}[filter]
      stockroomApi.products.list({page:productPage,pageSize:20,search:query,status,categoryId}).then(result=>{if(active){setProducts(result.items);setProductTotal(result.total);setProductPages(Math.max(1,result.totalPages||1))}}).catch(error=>{if(active)flash(`Could not load products: ${error.message}`)})
    },query?180:0)
    return()=>{active=false;window.clearTimeout(timer)}
  },[apiUser,query,filter,category,categories,productPage,productRefresh])

  function flash(message) {
    setNotice(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setNotice(''), 2600)
  }
  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('stockroom-theme', next)
  }
  function openSearch() {
    setSearchFocusRequest((request) => request + 1)
    navigate('/inventory')
  }
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchFocusRequest((request) => request + 1)
        navigate('/inventory')
      }
      if (event.key === 'Escape') setShowProductForm(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  async function addProduct(productForm) {
    if(editingProduct) await stockroomApi.products.update(editingProduct.id,productForm)
    else await stockroomApi.products.create(productForm)
    setProductPage(1)
    setProductRefresh(value=>value+1)
    setShowProductForm(false)
    setEditingProduct(null)
    flash(dataMode === 'sample' ? 'Product saved to this sample session.' : 'Product saved.')
  }
  const changeQuery=value=>{setQuery(value);setProductPage(1)}
  const changeFilter=value=>{setFilter(value);setProductPage(1)}
  const changeCategory=value=>{setCategory(value);setProductPage(1)}
  async function deactivateProduct(product){if(!window.confirm(`Deactivate ${product.name}?`))return;await stockroomApi.products.remove(product.id);setProductRefresh(value=>value+1);flash('Product deactivated.')}
  async function activateProduct(product){await stockroomApi.products.update(product.id,{isActive:true});setProductRefresh(value=>value+1);flash('Product reactivated.')}

  async function signIn(event) {
    event.preventDefault()
    setLoggingIn(true)
    setLoginError('')
    const form = new FormData(event.currentTarget)
    try {
      const result = await stockroomApi.auth.login({ email: form.get('email'), password: form.get('password'), ...(form.get('workspaceSlug') ? { workspaceSlug: form.get('workspaceSlug') } : {}) })
      setApiUser({...result.user,workspace:result.workspace})
    } catch (error) { setLoginError(error.message) } finally { setLoggingIn(false) }
  }
  async function signOut() {
    let message='Signed out.'
    try { await stockroomApi.auth.logout() } catch(error) { message=`Signed out locally; server revocation could not be confirmed: ${error.message}` } finally { setApiUser(null);setProducts([]);setCategories([]);setSuppliers([]);flash(message) }
  }

  if (dataMode === 'api' && !authReady) return <div className={`app-shell theme-${theme}`}><main className="main-area"><div className="route-loading" role="status">Restoring workspace session…</div></main></div>
  if (dataMode === 'api' && !apiUser && !tokenStore.get()) return <div className={`app-shell theme-${theme}`}><main className="main-area"><section className="panel" style={{ maxWidth: 420, margin: '12vh auto', padding: 32 }}><div className="eyebrow">STOCKROOM WORKSPACE</div><h1>Sign in</h1><p>Use your workspace account to access live inventory.</p><form onSubmit={signIn} className="login-form"><label>Email<input name="email" type="email" autoComplete="username" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label><label>Workspace slug <small>(optional)</small><input name="workspaceSlug" /></label>{loginError && <div className="data-error" role="alert">{loginError}</div>}<button className="button button-primary" type="submit" disabled={loggingIn}>{loggingIn ? 'Signing in…' : 'Sign in'}</button></form></section></main></div>

  return <div className={`app-shell theme-${theme}`}>
    <Sidebar open={mobileNav} onClose={() => setMobileNav(false)} onProfile={() => navigate('/settings')} canAdmin={canAdmin} user={apiUser} productCount={dataMode==='sample'?128:productTotal}/>
    <main className="main-area">
      <Topbar page={page} theme={theme} onToggleTheme={toggleTheme} onOpenNavigation={() => setMobileNav(true)} onOpenSearch={openSearch} onFlash={flash} user={apiUser} onLogout={dataMode === 'api' ? signOut : undefined}/>
      <div className="page-content"><Suspense fallback={<LoadingPage/>}>
        <Routes>
          <Route path="/" element={<Dashboard products={products} dateRange={dateRange} setDateRange={setDateRange} flash={flash} onNavigate={navigate} canManage={canManage} userName={apiUser?.name||'Vittal'} onAddProduct={() => {setEditingProduct(null);setShowProductForm(true)}}/>} />
          <Route path="/inventory" element={<AccessRoute roles={['administrator','inventory_manager','analyst']} user={apiUser}><Inventory canManage={canManage} query={query} setQuery={changeQuery} filter={filter} setFilter={changeFilter} category={category} setCategory={changeCategory} products={products} allProducts={products} productTotal={productTotal} productPage={productPage} productPages={productPages} onPageChange={setProductPage} categories={categories} focusSearchRequest={searchFocusRequest} onAddProduct={() => {setEditingProduct(null);setShowProductForm(true)}} onEditProduct={product=>{setEditingProduct(product);setShowProductForm(true)}} onDeleteProduct={deactivateProduct} onActivateProduct={activateProduct}/></AccessRoute>} />
          <Route path="/stock" element={<AccessRoute roles={['administrator','inventory_manager','analyst']} user={apiUser}><StockMovementsPage canManage={canManage}/></AccessRoute>} />
          <Route path="/purchases" element={<AccessRoute roles={['administrator','inventory_manager','analyst']} user={apiUser}><PurchasesPage canManage={canManage}/></AccessRoute>} />
          <Route path="/suppliers" element={<AccessRoute roles={['administrator','inventory_manager','analyst']} user={apiUser}><SuppliersPage canManage={canManage}/></AccessRoute>} />
          <Route path="/reports" element={<Reports/>} />
          <Route path="/team" element={<AccessRoute roles={['administrator']} user={apiUser}><TeamPage canManage={canAdmin}/></AccessRoute>} />
          <Route path="/settings" element={<AccessRoute roles={['administrator','inventory_manager','analyst']} user={apiUser}><SettingsPage theme={theme} toggleTheme={toggleTheme}/></AccessRoute>} />
          <Route path="*" element={<NotFound onBack={() => navigate('/')}/>} />
        </Routes>
      </Suspense></div>
    </main>
    {notice && <div className="toast" role="status">{notice}</div>}
    {showProductForm && <ProductFormModal categories={categories} suppliers={suppliers} initial={editingProduct} onClose={() => {setShowProductForm(false);setEditingProduct(null)}} onSave={addProduct}/>}
  </div>
}
function NotFound({ onBack }) { return <section className="panel not-found"><Boxes size={22}/><h1>Page not found</h1><button className="button button-secondary" onClick={onBack}>Back to overview</button></section> }
function AccessRoute({children,roles,user}){if(dataMode==='sample'||roles.some(role=>user?.roles?.includes(role)))return children;return <section className="panel not-found" role="alert"><h1>Access restricted</h1><p>Your workspace role does not have access to this area.</p></section>}
