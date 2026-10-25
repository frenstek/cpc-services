import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSites } from '../lib/api'
import { MapPin, Loader2, Plus, Sparkles, Search, X } from 'lucide-react'

export default function SiteSelect() {
  const navigate = useNavigate()
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchSites('active')
      .then(data => setSites(Array.isArray(data) ? data : []))
      .catch(() => setSites([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = search.trim()
    ? sites.filter(s =>
        (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.city || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.code || '').toLowerCase().includes(search.toLowerCase())
      )
    : sites

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-brand-50/30">
      {/* Header */}
      <div className="border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg shadow-brand-500/20">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-800">CPC</span>
              <span className="ml-1.5 text-base font-light text-brand-500">Services</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">Select a Site</h1>
          <p className="mt-2 text-sm text-slate-400">Choose the site you're working at today</p>
        </div>

        {/* Search */}
        {sites.length > 3 && (
          <div className="mx-auto max-w-md mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search sites..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pr-10 text-sm text-slate-800 placeholder-slate-300 shadow-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all"
                style={{ paddingLeft: '2.75rem' }}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 cursor-pointer">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sites Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-brand-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="mx-auto mb-4 h-14 w-14 text-slate-200" />
            <p className="text-base font-semibold text-slate-400">
              {search ? 'No sites match your search' : 'No sites available'}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {search ? 'Try a different search' : 'Contact your admin to add sites'}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(site => (
              <button
                key={site.id}
                onClick={() => navigate(`/site/${site.id}`)}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left shadow-sm transition-all duration-200 hover:shadow-xl hover:-translate-y-1 hover:border-brand-300 cursor-pointer"
              >
                {/* Visual header */}
                <div className="h-32 w-full bg-gradient-to-br from-[#0c1929] via-[#122a45] to-[#1a3a5c] relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20cx%3D%221%22%20cy%3D%221%22%20r%3D%221%22%20fill%3D%22rgba(255%2C255%2C255%2C0.04)%22%2F%3E%3C%2Fsvg%3E')]" />
                  <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand-400/10 blur-2xl group-hover:bg-brand-400/20 transition-colors duration-300" />
                  <div className="absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-brand-500/5 blur-xl" />
                  <div className="absolute bottom-4 left-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-lg">
                      <MapPin size={22} className="text-brand-300" />
                    </div>
                  </div>
                  {site.code && (
                    <div className="absolute top-4 right-4">
                      <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-mono font-bold text-white/60 backdrop-blur-sm border border-white/5">
                        {site.code}
                      </span>
                    </div>
                  )}
                </div>
                {/* Content */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-brand-600 transition-colors">{site.name}</h3>
                  {(site.address || site.city || site.state) && (
                    <p className="mt-1 text-sm text-slate-400">
                      {[site.address, site.city, site.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
