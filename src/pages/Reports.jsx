import { FileText } from 'lucide-react'

export default function Reports() {
  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
          Reports
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Generate and view cleaning reports
        </p>
      </div>

      {/* ─── Empty State ─── */}
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">
          Reports will be available once vehicles are documented
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Capture vehicle data to generate compliance and summary reports.
        </p>
      </div>
    </div>
  )
}
