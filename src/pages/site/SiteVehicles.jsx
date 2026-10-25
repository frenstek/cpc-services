import { useState, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { fetchVehicles } from '../../lib/api'
import { Car, Clock, Loader2, Camera } from 'lucide-react'

function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' }
function formatTime(d) { return d ? new Date(d).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : '' }

export default function SiteVehicles() {
  const { siteId } = useOutletContext()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVehicles(null, null, siteId).then(v => setVehicles(Array.isArray(v) ? v : [])).catch(() => setVehicles([])).finally(() => setLoading(false))
  }, [siteId])

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-300" /></div>

  if (vehicles.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-16 text-center">
        <Car className="mx-auto mb-4 h-12 w-12 text-slate-200" />
        <p className="text-base font-semibold text-slate-400">No vehicles captured yet</p>
        <Link to={`/site/${siteId}/capture`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:text-brand-600">
          <Camera size={14} /> Start capturing
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <ul className="divide-y divide-slate-100">
        {vehicles.map(v => (
          <li key={v.id}>
            <Link to={`/site/${siteId}/vehicles/${v.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100"><Car size={18} className="text-slate-400" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-700">{v.rego || 'No Rego'}</p>
                <p className="flex items-center gap-1 text-[11px] text-slate-400"><Clock size={10} />{formatDate(v.created_at)} {formatTime(v.created_at)}{v.bay && <span className="ml-2">Bay: {v.bay}</span>}</p>
              </div>
              <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${v.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {v.status === 'completed' ? 'Done' : 'Active'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
