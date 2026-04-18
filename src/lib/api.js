// ─── Vehicles API ────────────────────────────────────────────────────────

export async function fetchVehicles(status, search) {
  let url = '/api/vehicles?action=list'
  if (status) url += `&status=${encodeURIComponent(status)}`
  if (search) url += `&search=${encodeURIComponent(search)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch vehicles: ${res.status}`)
  return res.json()
}

export async function fetchVehicle(id) {
  const res = await fetch(`/api/vehicles?action=get&id=${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(`Failed to fetch vehicle: ${res.status}`)
  return res.json()
}

export async function createVehicle(data) {
  const res = await fetch('/api/vehicles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Create vehicle failed: ${res.status}`)
  }
  return res.json()
}

export async function updateVehicle(id, data) {
  const res = await fetch('/api/vehicles', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Update vehicle failed: ${res.status}`)
  }
  return res.json()
}

export async function deleteVehicle(id) {
  const res = await fetch('/api/vehicles', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Delete vehicle failed: ${res.status}`)
  }
  return res.json()
}

// ─── Photos API ──────────────────────────────────────────────────────────

export async function uploadPhoto({ vehicleId, type, step, stepLabel, damageFlag, notes, fileData, fileName }) {
  const res = await fetch('/api/photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vehicleId, type, step, stepLabel, damageFlag, notes, fileData, fileName }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Upload photo failed: ${res.status}`)
  }
  return res.json()
}

export async function deletePhoto(id) {
  const res = await fetch('/api/photos', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Delete photo failed: ${res.status}`)
  }
  return res.json()
}

// ─── Share Links API ─────────────────────────────────────────────────────

export async function createShareLink(vehicleId) {
  const res = await fetch('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vehicleId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Create share link failed: ${res.status}`)
  }
  return res.json()
}

export async function fetchSharedVehicle(token) {
  const res = await fetch(`/api/share?token=${encodeURIComponent(token)}`)
  if (!res.ok) throw new Error(`Invalid or expired share link`)
  return res.json()
}
