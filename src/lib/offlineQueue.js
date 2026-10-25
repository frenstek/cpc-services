const DB_NAME = 'cpc-offline'
const DB_VERSION = 1
const STORE_NAME = 'pending-uploads'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function queueUpload(data) {
  // data: { type: 'photo'|'signature', payload: {...}, timestamp: Date.now() }
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.add({ ...data, timestamp: Date.now(), status: 'pending' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getPendingUploads() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

export async function removePendingUpload(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getPendingCount() {
  const items = await getPendingUploads()
  return items.length
}

export async function processQueue() {
  const items = await getPendingUploads()
  const results = { success: 0, failed: 0 }

  for (const item of items) {
    try {
      let endpoint, payload
      if (item.type === 'photo') {
        endpoint = '/api/photos'
        payload = item.payload
      } else if (item.type === 'signature') {
        endpoint = '/api/signatures'
        payload = item.payload
      } else {
        continue
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        await removePendingUpload(item.id)
        results.success++
      } else {
        results.failed++
      }
    } catch {
      results.failed++
    }
  }

  return results
}
