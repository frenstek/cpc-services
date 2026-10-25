import { useState, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { fetchVehicles, fetchSitePhotos, fetchSiteDocuments, fetchSiteNotes } from '../../lib/api'
import { Camera, Car, Image, FileText, MessageSquare, CheckCircle2, Clock, ArrowRight, Loader2 } from 'lucide-react'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SiteOverview() {
  const { site, siteId } = useOutletContext()
  const [vehicles, setVehicles] = useState([])
  const [photoCount, setPhotoCount] = useState(0)
  const [docCount, setDocCount] = useState(0)
  const [noteCount, setNoteCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchVehicles(null, null, siteId).catch(() => []),
      fetchSitePhotos(siteId).catch(() => []),
      fetchSiteDocuments(siteId).catch(() => []),
      fetchSiteNotes(siteId).catch(() => []),
    ]).then(([v, p, d, n]) => {
      setVehicles(Array.isArray(v) ? v : [])
      setPhotoCount(Array.isArray(p) ? p.length : 0)
      setDocCount(Array.isArray(d) ? d.length : 0)
      setNoteCount(Array.isArray(n) ? n.length : 0)
    }).finally(() => setLoading(false))
  }, [siteId])

  const completedCount = vehicles.filter(v => v.status === 'completed').length
  const recentVehicles = [...vehicles].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)

  const stats = [
    { label: 'Vehicles', value: vehicles.length, icon: Car, gradient: 'from-brand-400 to-brand-600', link: 'vehicles' },
    { label: 'Photos', value: photoCount, icon: Image, gradient: 'from-violet-400 to-violet-600', link: 'photos' },
    { label: 'Documents', value: docCount, icon: FileText, gradient: 'from-amber-400 to-orange-500', link: 'documents' },
    { label: 'Notes', value: noteCount, icon: MessageSquare, gradient: 'from-rose-400 to-pink-500', link: 'notes' },
  ]

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0c1929] via-[#122a45] to-[#0f2237] p-6 sm:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{site?.name}</h2>
            <p className="mt-1 text-sm text-white/40">
              {site ? [site.address, site.city, site.state].filter(Boolean).join(', ') : ''}
            </p>
            {site?.notes && <p className="mt-2 text-xs text-white/30 max-w-lg">{site.notes}</p>}
          </div>
          <Link
            to={`/site/${siteId}/capture`}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-400 to-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:brightness-110 transition-all"
          >
            <Camera size={18} /> Start Capture
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => (
          <Link key={s.label} to={`/site/${siteId}/${s.link}`} className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-start justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient} shadow-sm`}>
                <s.icon size={20} className="text-white" />
              </div>
              <p className="text-3xl font-bold text-slate-800 tabular-nums">{loading ? '–' : s.value}</p>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-400 group-hover:text-brand-500 transition-colors">{s.label} →</p>
          </Link>
        ))}
      </div>

      {/* Recent vehicles */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">Recent Captures</h3>
          {vehicles.length > 0 && (
            <Link to={`/site/${siteId}/vehicles`} className="flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-600">
              View All <ArrowRight size={12} />
            </Link>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
        ) : recentVehicles.length === 0 ? (
          <div className="p-12 text-center">
            <Car className="mx-auto mb-3 h-10 w-10 text-slate-200" />
            <p className="text-sm font-medium text-slate-400">No captures yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentVehicles.map(v => (
              <li key={v.id}>
                <Link to={`/site/${siteId}/vehicles/${v.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100"><Car size={16} className="text-slate-400" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-700">{v.rego || 'No Rego'}</p>
                    <p className="text-[11px] text-slate-400"><Clock size={10} className="inline mr-1" />{formatDate(v.created_at)}</p>
                  </div>
                  <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${v.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {v.status === 'completed' ? 'Done' : 'Active'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
