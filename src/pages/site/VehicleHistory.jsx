import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useOutletContext, Link } from 'react-router-dom'
import { fetchVehicles } from '../../lib/api'
import {
  ArrowLeft, Car, Camera, Clock, CheckCircle2,
  AlertTriangle, Loader2, Calendar,
} from 'lucide-react'
import Badge from '../../components/Badge'
import EmptyState from '../../components/EmptyState'

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(d) {
  return new Date(d).toLocaleTimeString('en-AU', {
    hour: '2-digit', minute: '2-digit',
  })
}

function getMonthKey(d) {
  const date = new Date(d)
  return date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

export default function VehicleHistory() {
  const [searchParams] = useSearchParams()
  const { siteId } = useOutletContext()
  const rego = searchParams.get('rego') || ''

  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!rego) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetchVehicles(null, rego)
      .then(data => {
        const arr = Array.isArray(data) ? data : []
        // Filter to exact rego match (case-insensitive)
        const filtered = arr.filter(
          v => v.rego && v.rego.toLowerCase() === rego.toLowerCase()
        )
        // Sort by date descending
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        setVehicles(filtered)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [rego])

  // Group by month
  const grouped = useMemo(() => {
    const groups = {}
    vehicles.forEach(v => {
      const key = getMonthKey(v.created_at)
      if (!groups[key]) groups[key] = []
      groups[key].push(v)
    })
    return groups
  }, [vehicles])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={`/site/${siteId}/vehicles`}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Vehicle History
            {rego && (
              <span className="ml-2 font-mono text-brand-600">{rego.toUpperCase()}</span>
            )}
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            {vehicles.length} inspection{vehicles.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!error && vehicles.length === 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <EmptyState
            icon={Car}
            title="No history found"
            subtitle={rego ? `No inspections found for registration "${rego.toUpperCase()}"` : 'No registration provided'}
          />
        </div>
      )}

      {/* Timeline grouped by month */}
      {Object.entries(grouped).map(([monthLabel, items]) => (
        <div key={monthLabel}>
          <div className="mb-3 flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <p className="text-sm font-bold text-slate-600">{monthLabel}</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              {items.length}
            </span>
          </div>

          <div className="space-y-3">
            {items.map(v => {
              const photoCount = v.photos?.length || 0
              const damageCount = v.photos?.filter(p => p.damage_flag)?.length || 0
              const isCompleted = v.status === 'completed'
              // Determine if this vehicle belongs to the current site
              const vehiclePath = v.site_id
                ? `/site/${v.site_id}/vehicles/${v.id}`
                : `/site/${siteId}/vehicles/${v.id}`

              return (
                <Link
                  key={v.id}
                  to={vehiclePath}
                  className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-brand-200 hover:shadow-md"
                >
                  {/* Status icon */}
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    isCompleted ? 'bg-emerald-50' : 'bg-amber-50'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 size={20} className="text-emerald-500" />
                    ) : (
                      <Clock size={20} className="text-amber-500" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {formatDate(v.created_at)}
                      </p>
                      <Badge color={isCompleted ? 'emerald' : 'amber'}>
                        {isCompleted ? 'Completed' : 'In Progress'}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatTime(v.created_at)}
                      </span>
                      {v.bay && (
                        <span>Bay {v.bay}</span>
                      )}
                      {photoCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Camera size={10} />
                          {photoCount} photo{photoCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {damageCount > 0 && (
                        <span className="flex items-center gap-1 text-red-500">
                          <AlertTriangle size={10} />
                          {damageCount} damage
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowLeft size={16} className="rotate-180 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
