import { Users } from 'lucide-react'

export default function Team() {
  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Team</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage workers, shifts, and team performance
        </p>
      </div>

      {/* ─── Empty State ─── */}
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">
          Team management coming soon
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Add and manage your cleaning team members, shifts, and performance.
        </p>
      </div>
    </div>
  )
}
