import { useState, useEffect, useMemo } from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import { fetchSitePhotos } from '../../lib/api'
import { Image, Search, Calendar, Camera, Loader2, AlertTriangle } from 'lucide-react'
import Lightbox from '../../components/Lightbox'
import Badge from '../../components/Badge'
import EmptyState from '../../components/EmptyState'
import Skeleton from '../../components/Skeleton'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toISOString().slice(0, 10)
}

function getUrl(photo) {
  return photo?.url || photo?.public_url || photo?.publicUrl || ''
}

const FILTER_TYPES = [
  { key: 'all', label: 'All' },
  { key: 'before', label: 'Before' },
  { key: 'after', label: 'After' },
  { key: 'damage', label: 'Damage' },
]

export default function SitePhotos() {
  const { siteId } = useOutletContext()
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [regoSearch, setRegoSearch] = useState('')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  useEffect(() => {
    fetchSitePhotos(siteId)
      .then(d => setPhotos(Array.isArray(d) ? d : []))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false))
  }, [siteId])

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return photos.filter(p => {
      // Type filter
      if (activeFilter === 'before' && p.type !== 'before') return false
      if (activeFilter === 'after' && p.type !== 'after') return false
      if (activeFilter === 'damage' && !p.damage_flag) return false

      // Date range filter
      if (dateFrom) {
        const photoDate = new Date(p.created_at)
        const from = new Date(dateFrom)
        from.setHours(0, 0, 0, 0)
        if (photoDate < from) return false
      }
      if (dateTo) {
        const photoDate = new Date(p.created_at)
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (photoDate > to) return false
      }

      // Rego search
      if (regoSearch) {
        const rego = p.vehicles?.rego || ''
        if (!rego.toLowerCase().includes(regoSearch.toLowerCase())) return false
      }

      return true
    })
  }, [photos, activeFilter, dateFrom, dateTo, regoSearch])

  // Group photos by vehicle rego, then by date
  const groupedPhotos = useMemo(() => {
    const groups = {}
    filteredPhotos.forEach(p => {
      const rego = p.vehicles?.rego || 'Unknown'
      const vehicleId = p.vehicle_id || 'unknown'
      const key = `${rego}__${vehicleId}`
      if (!groups[key]) {
        groups[key] = { rego, vehicleId, dateGroups: {} }
      }
      const dateKey = p.created_at ? formatDate(p.created_at) : 'Unknown date'
      if (!groups[key].dateGroups[dateKey]) {
        groups[key].dateGroups[dateKey] = []
      }
      groups[key].dateGroups[dateKey].push(p)
    })

    // Sort groups alphabetically by rego
    return Object.values(groups).sort((a, b) => a.rego.localeCompare(b.rego))
  }, [filteredPhotos])

  // Flat array for lightbox (in display order)
  const lightboxPhotos = useMemo(() => {
    const flat = []
    groupedPhotos.forEach(group => {
      Object.values(group.dateGroups).forEach(datePhotos => {
        datePhotos.forEach(p => {
          flat.push({
            ...p,
            url: getUrl(p),
            label: `${p.step_label || p.step || ''} — ${group.rego}`,
          })
        })
      })
    })
    return flat
  }, [groupedPhotos])

  // Find the lightbox index for a given photo
  function openLightbox(photo) {
    const idx = lightboxPhotos.findIndex(lp => lp.id === photo.id)
    setLightboxIndex(idx >= 0 ? idx : 0)
    setLightboxOpen(true)
  }

  function getTypeBadgeColor(type) {
    if (type === 'before') return 'brand'
    if (type === 'after') return 'emerald'
    return 'slate'
  }

  function getTypeBadgeLabel(type, damageFl) {
    if (damageFl) return 'DMG'
    if (type === 'before') return 'Before'
    if (type === 'after') return 'After'
    return type || '—'
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton filter bar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
          <div className="flex flex-wrap gap-3">
            <Skeleton variant="line" className="h-9 w-20 rounded-full" />
            <Skeleton variant="line" className="h-9 w-20 rounded-full" />
            <Skeleton variant="line" className="h-9 w-20 rounded-full" />
            <Skeleton variant="line" className="h-9 w-20 rounded-full" />
            <Skeleton variant="line" className="h-9 w-36 rounded-xl" />
            <Skeleton variant="line" className="h-9 w-36 rounded-xl" />
            <Skeleton variant="line" className="h-9 w-40 rounded-xl" />
          </div>
        </div>
        {/* Skeleton grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (photos.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white">
        <EmptyState
          icon={Image}
          title="No photos yet"
          subtitle="Start a capture to take photos at this site"
        />
      </div>
    )
  }

  const hasActiveFilters = activeFilter !== 'all' || dateFrom || dateTo || regoSearch

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="sticky top-0 z-20 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-sm p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Type filter pills */}
          {FILTER_TYPES.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
                activeFilter === f.key
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.key === 'damage' && <AlertTriangle className="inline-block h-3.5 w-3.5 mr-1 -mt-0.5" />}
              {f.label}
            </button>
          ))}

          {/* Divider */}
          <div className="hidden sm:block w-px h-8 bg-slate-200" />

          {/* Date from */}
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
              title="From date"
            />
          </div>

          {/* Date to */}
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
              title="To date"
            />
          </div>

          {/* Rego search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={regoSearch}
              onChange={e => setRegoSearch(e.target.value)}
              placeholder="Search rego..."
              className="h-9 w-40 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={() => { setActiveFilter('all'); setDateFrom(''); setDateTo(''); setRegoSearch('') }}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer transition-colors"
            >
              Clear filters
            </button>
          )}

          {/* Photo count — pushed to right */}
          <div className="ml-auto text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{filteredPhotos.length}</span>
            {filteredPhotos.length !== photos.length && (
              <span> of {photos.length}</span>
            )}
            {' '}photo{filteredPhotos.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* No results after filtering */}
      {filteredPhotos.length === 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white">
          <EmptyState
            icon={Search}
            title="No photos match filters"
            subtitle="Try adjusting your filters to see more results"
          />
        </div>
      )}

      {/* Grouped Photo Grid */}
      {groupedPhotos.map(group => (
        <div key={`${group.rego}__${group.vehicleId}`} className="space-y-3">
          {/* Vehicle header */}
          <div className="flex items-center gap-3">
            <Link
              to={`/vehicles/${group.vehicleId}`}
              className="font-mono font-bold text-base text-slate-800 hover:text-brand-600 transition-colors"
            >
              {group.rego}
            </Link>
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">
              {Object.values(group.dateGroups).reduce((sum, arr) => sum + arr.length, 0)} photos
            </span>
          </div>

          {/* Date subgroups */}
          {Object.entries(group.dateGroups).map(([dateLabel, datePhotos]) => (
            <div key={dateLabel} className="space-y-2">
              <p className="text-xs font-medium text-slate-400 pl-1">{dateLabel}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {datePhotos.map(p => {
                  const src = getUrl(p)
                  return (
                    <div
                      key={p.id}
                      className="group relative rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md hover:border-slate-300 transition-all"
                      onClick={() => openLightbox(p)}
                    >
                      {/* Damage indicator */}
                      {p.damage_flag && (
                        <div className="absolute top-2 left-2 z-10">
                          <Badge color="red">
                            <AlertTriangle className="h-3 w-3" />
                            DMG
                          </Badge>
                        </div>
                      )}

                      {/* Image */}
                      {src ? (
                        <img
                          src={src}
                          alt={p.step_label || p.step || 'Photo'}
                          loading="lazy"
                          className="aspect-square w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center bg-slate-100">
                          <Image className="h-8 w-8 text-slate-300" />
                        </div>
                      )}

                      {/* Bottom gradient overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-2.5 pb-2.5 pt-8">
                        <div className="flex items-end justify-between gap-2">
                          <span className="text-[11px] font-medium text-white truncate leading-tight">
                            {p.step_label || p.step || '—'}
                          </span>
                          <Badge
                            color={p.damage_flag ? 'red' : getTypeBadgeColor(p.type)}
                            className="shrink-0 !text-[9px] !px-2 !py-0.5"
                          >
                            {getTypeBadgeLabel(p.type, false)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Lightbox */}
      <Lightbox
        photos={lightboxPhotos}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  )
}
