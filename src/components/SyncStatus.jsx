import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Cloud, Loader2 } from 'lucide-react'
import useOnlineStatus from '../hooks/useOnlineStatus'
import { getPendingCount, processQueue } from '../lib/offlineQueue'

export default function SyncStatus() {
  const online = useOnlineStatus()
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)

  // Check pending count periodically
  useEffect(() => {
    const check = async () => {
      const count = await getPendingCount()
      setPending(count)
    }
    check()
    const interval = setInterval(check, 5000)
    return () => clearInterval(interval)
  }, [])

  // Auto-sync when coming back online
  useEffect(() => {
    if (online && pending > 0 && !syncing) {
      handleSync()
    }
  }, [online])

  async function handleSync() {
    if (syncing || !online) return
    setSyncing(true)
    try {
      await processQueue()
      const count = await getPendingCount()
      setPending(count)
    } finally {
      setSyncing(false)
    }
  }

  // Don't show anything if online and no pending
  if (online && pending === 0) return null

  return (
    <button
      onClick={handleSync}
      disabled={syncing || !online}
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
        !online
          ? 'bg-red-50 text-red-600'
          : syncing
            ? 'bg-amber-50 text-amber-600'
            : pending > 0
              ? 'bg-amber-50 text-amber-600'
              : 'bg-emerald-50 text-emerald-600'
      }`}
    >
      {!online ? (
        <>
          <WifiOff size={12} />
          Offline
          {pending > 0 && <span className="rounded-full bg-red-100 px-1.5 text-[10px]">{pending}</span>}
        </>
      ) : syncing ? (
        <>
          <Loader2 size={12} className="animate-spin" />
          Syncing...
        </>
      ) : pending > 0 ? (
        <>
          <Cloud size={12} />
          {pending} pending
        </>
      ) : (
        <>
          <Wifi size={12} />
          Synced
        </>
      )}
    </button>
  )
}
