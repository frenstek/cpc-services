import { ClipboardCheck } from 'lucide-react'

export default function Checklists() {
  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
          Checklists
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Cleaning checklist templates and task management
        </p>
      </div>

      {/* ─── Empty State ─── */}
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">
          Checklist templates coming soon
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Create and manage reusable cleaning checklists for each zone.
        </p>
      </div>
    </div>
  )
}
