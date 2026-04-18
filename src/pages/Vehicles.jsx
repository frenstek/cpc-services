import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchVehicles } from '../lib/api'
import {
  Car, Search, Filter, Loader2, ChevronRight, Camera,
  CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react'

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'in_progress', label: 'In Progress' },
]

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchVehicles()
      .then(data => setVehicles(Array.isArray(data) ? data : []))
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = vehicles
    .filter(v => {
      if (statusFilter === 'all') return true
      return v.status === statusFilter
    })
    .filter(v => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        (v.rego || '').toLowerCase().includes(q) ||
        (v.bay || '').toLowerCase().includes(q) ||
        (v.vehicle_type || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const completedCount = vehicles.filter(v => v.status === 'completed').length
  const inProgressCount = vehicles.filter(v => v.status === 'in_progress').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Vehicles</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {vehicles.length} total — {completedCount} completed, {inProgressCount} in progress
          </p>
        </div>
        <Link
          to="/capture"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          <Camera size={16} />
          New Capture
        </Link>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by rego, bay, or type..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
                statusFilter === tab.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Car className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              {search || statusFilter !== 'all' ? 'No vehicles match your filters' : 'No vehicles documented yet'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {search || statusFilter !== 'all'
                ? 'Try changing your search or filter'
                : 'Start a capture to document your first vehicle'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map(v => (
              <li key={v.id}>
                <Link
                  to={`/vehicles/${v.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                >
                  {/* Icon */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    v.status === 'completed' ? 'bg-emerald-50' : 'bg-brand-50'
                  }`}>
                    {v.status === 'completed'
                      ? <CheckCircle2 size={18} className="text-emerald-600" />
                      : <Clock size={18} className="text-brand-600" />
                    }
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-bold text-slate-900">{v.rego || 'No Rego'}</p>
                      {v.vehicle_type && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                          {v.vehicle_type}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                      <span>{new Date(v.created_at).toLocaleDateString('en-AU', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}</span>
                      {v.bay && <span>Bay {v.bay}</span>}
                    </div>
                  </div>

                  {/* Status */}
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    v.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {v.status === 'completed' ? 'Completed' : 'In Progress'}
                  </span>

                  <ChevronRight size={16} className="shrink-0 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
