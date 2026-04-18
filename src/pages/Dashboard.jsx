import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchVehicles } from '../lib/api'
import {
  Camera,
  CheckCircle2,
  Loader2,
  Car,
  ArrowRight,
} from 'lucide-react'

/* ─── Helpers ─── */
function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function isToday(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

/* ═══════════════════════════════════════════
   DASHBOARD PAGE
   ═══════════════════════════════════════════ */
export default function Dashboard() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVehicles()
      .then((data) => setVehicles(Array.isArray(data) ? data : []))
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false))
  }, [])

  const todayVehicles = vehicles.filter((v) => isToday(v.created_at))
  const completedToday = todayVehicles.filter((v) => v.status === 'completed').length
  const inProgressToday = todayVehicles.filter((v) => v.status === 'in-progress').length
  const recentVehicles = [...vehicles]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)

  const stats = [
    {
      label: 'Total Vehicles',
      value: vehicles.length,
      icon: Car,
      bg: 'bg-brand-50',
      iconColor: 'text-brand-600',
    },
    {
      label: "Today's Captures",
      value: todayVehicles.length,
      icon: Camera,
      bg: 'bg-brand-50',
      iconColor: 'text-brand-600',
    },
    {
      label: 'Completed',
      value: completedToday,
      icon: CheckCircle2,
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'In Progress',
      value: inProgressToday,
      icon: Loader2,
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ]

  return (
    <div className="space-y-6">
      {/* ─── Welcome Banner ─── */}
      <div className="rounded-xl bg-navy-900 p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              {getGreeting()}
            </h2>
            <p className="mt-1 text-sm text-gray-400">{formatDate()}</p>
          </div>
          <Link
            to="/capture"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <Camera size={16} />
            Start Capturing
          </Link>
        </div>
      </div>

      {/* ─── Stats Grid ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}
              >
                <stat.icon size={20} className={stat.iconColor} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '-' : stat.value}
                </p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Recent Vehicles ─── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">
            Recent Vehicles
          </h3>
          {vehicles.length > 0 && (
            <Link
              to="/vehicles"
              className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              View All
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : recentVehicles.length === 0 ? (
          <div className="p-12 text-center">
            <Car className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              No vehicles documented yet
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Start a capture to document your first vehicle.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentVehicles.map((v) => (
              <li key={v.id}>
                <Link
                  to={`/vehicles/${v.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                    <Car size={16} className="text-brand-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {v.rego || 'No Rego'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(v.created_at).toLocaleDateString('en-AU')}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      v.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : v.status === 'in-progress'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {v.status === 'completed'
                      ? 'Completed'
                      : v.status === 'in-progress'
                        ? 'In Progress'
                        : v.status || 'Draft'}
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
