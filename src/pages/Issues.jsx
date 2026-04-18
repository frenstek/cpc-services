import { AlertTriangle } from 'lucide-react'

export default function Issues() {
  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Issues</h2>
        <p className="mt-1 text-sm text-gray-500">
          Track and resolve cleaning issues and incidents
        </p>
      </div>

      {/* ─── Empty State ─── */}
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">
          No issues reported yet
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Issues and incidents will appear here when reported by your team.
        </p>
      </div>
    </div>
  )
}
