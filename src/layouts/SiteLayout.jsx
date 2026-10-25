import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useParams, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Camera, Car, Image, FileText,
  MessageSquare, LogOut, Menu, X, Bell, ChevronRight,
  Sparkles, ArrowLeftRight, MapPin, Search,
} from 'lucide-react'
import { fetchSite } from '../lib/api'
import SearchModal from '../components/SearchModal'
import SyncStatus from '../components/SyncStatus'

export default function SiteLayout() {
  const { siteId } = useParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [site, setSite] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Cmd+K / Ctrl+K to open search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (siteId) {
      fetchSite(siteId).then(setSite).catch(() => setSite(null))
    }
  }, [siteId])

  const navItems = [
    { label: 'Overview', icon: LayoutDashboard, path: `/site/${siteId}` },
    { label: 'Capture', icon: Camera, path: `/site/${siteId}/capture` },
    { label: 'Vehicles', icon: Car, path: `/site/${siteId}/vehicles` },
    { label: 'Photos', icon: Image, path: `/site/${siteId}/photos` },
    { label: 'Documents', icon: FileText, path: `/site/${siteId}/documents` },
    { label: 'Notes', icon: MessageSquare, path: `/site/${siteId}/notes` },
  ]

  function isActive(path) {
    if (path === `/site/${siteId}`) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  const pageTitle = navItems.find(n => isActive(n.path))?.label || 'Overview'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col
        bg-gradient-to-b from-[#0c1929] via-[#0f2237] to-[#0a1a2e]
        transition-transform duration-300 ease-out
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex h-[72px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg shadow-brand-500/25">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <span className="text-[15px] font-bold tracking-wide text-white">CPC</span>
              <span className="ml-1.5 text-[15px] font-light tracking-wide text-brand-300">Services</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-white/30 hover:text-white hover:bg-white/10 lg:hidden cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Current site card */}
        <div className="mx-4 mb-2 rounded-xl bg-white/[0.05] p-3.5 backdrop-blur-sm border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 border border-brand-400/20">
              <MapPin size={18} className="text-brand-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{site?.name || 'Loading...'}</p>
              <p className="truncate text-[11px] text-brand-300/50">
                {site ? [site.city, site.state].filter(Boolean).join(', ') || site.code || 'Active' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Switch site button */}
        <div className="mx-4 mb-4">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[11px] font-semibold text-white/30 hover:text-white/50 hover:bg-white/[0.06] transition-all"
          >
            <ArrowLeftRight size={12} />
            Switch Site
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/20">Menu</p>
          <ul className="space-y-0.5">
            {navItems.map(({ label, icon: Icon, path }) => {
              const active = isActive(path)
              return (
                <li key={path}>
                  <Link
                    to={path}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150
                      ${active
                        ? 'bg-brand-500/15 text-brand-300 shadow-sm'
                        : 'text-white/40 hover:bg-white/[0.05] hover:text-white/70'
                      }
                    `}
                  >
                    <Icon size={18} className={active ? 'text-brand-400' : ''} />
                    {label}
                    {active && <ChevronRight size={14} className="ml-auto text-brand-400/50" />}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4">
          <Link
            to="/login"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/25 transition-all hover:bg-white/[0.05] hover:text-white/50"
          >
            <LogOut size={18} />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden cursor-pointer">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-800">{pageTitle}</h1>
              <p className="text-[11px] text-slate-400">{site?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatus />
            <button
              onClick={() => setSearchOpen(true)}
              className="relative rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              title="Search (Ctrl+K)"
            >
              <Search size={18} />
            </button>
            <button className="relative rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer">
              <Bell size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-5 sm:p-6">
          <Outlet context={{ site, siteId }} />
        </main>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} siteId={siteId} />
    </div>
  )
}
