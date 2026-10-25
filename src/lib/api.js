// ─── Vehicles API ────────────────────────────────────────────────────────

export async function fetchVehicles(status, search, siteId) {
  let url = '/api/vehicles?action=list'
  if (siteId) url += `&site_id=${encodeURIComponent(siteId)}`
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
  const payload = { ...data }
  if (data.site_id) payload.site_id = data.site_id
  const res = await fetch('/api/vehicles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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

export async function uploadPhoto({ vehicleId, siteId, type, step, stepLabel, damageFlag, notes, fileData, fileName }) {
  const payload = { vehicleId, type, step, stepLabel, damageFlag, notes, fileData, fileName }
  if (siteId) payload.siteId = siteId
  const res = await fetch('/api/photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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

// ─── Sites API ──────────────────────────────────────────────────────────

export async function fetchSites(status) {
  let url = '/api/sites?action=list'
  if (status) url += `&status=${encodeURIComponent(status)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch sites: ${res.status}`)
  return res.json()
}

export async function fetchSite(id) {
  const res = await fetch(`/api/sites?action=get&id=${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(`Failed to fetch site: ${res.status}`)
  return res.json()
}

export async function createSite(data) {
  const res = await fetch('/api/sites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Create site failed: ${res.status}`)
  }
  return res.json()
}

export async function updateSite(id, data) {
  const res = await fetch('/api/sites', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Update site failed: ${res.status}`)
  }
  return res.json()
}

export async function deleteSite(id) {
  const res = await fetch(`/api/sites?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Delete site failed: ${res.status}`)
  }
  return res.json()
}

// ─── Site Photos ─────────────────────────────────────────────────────────

export async function fetchSitePhotos(siteId) {
  const res = await fetch(`/api/sites?action=photos&site_id=${encodeURIComponent(siteId)}`)
  if (!res.ok) throw new Error(`Failed to fetch site photos: ${res.status}`)
  return res.json()
}

// ─── Site Documents ──────────────────────────────────────────────────────

export async function fetchSiteDocuments(siteId) {
  const res = await fetch(`/api/sites?action=documents&site_id=${encodeURIComponent(siteId)}`)
  if (!res.ok) throw new Error(`Failed to fetch documents: ${res.status}`)
  return res.json()
}

export async function uploadSiteDocument({ siteId, name, category, notes, fileData, fileName, fileSize, fileType }) {
  const res = await fetch('/api/sites?action=upload-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site_id: siteId, name, category, notes, file_data: fileData, file_name: fileName, file_size: fileSize, file_type: fileType }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Upload failed: ${res.status}`)
  }
  return res.json()
}

export async function deleteSiteDocument(id) {
  const res = await fetch(`/api/sites?action=delete-document&id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
  return res.json()
}

// ─── Site Notes / Message Log ────────────────────────────────────────────────

export async function fetchSiteNotes(siteId) {
  const res = await fetch(`/api/sites?action=notes&site_id=${encodeURIComponent(siteId)}`)
  if (!res.ok) throw new Error(`Failed to fetch notes: ${res.status}`)
  return res.json()
}

export async function createSiteNote({ siteId, content, author }) {
  const res = await fetch('/api/sites?action=create-note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site_id: siteId, content, author }),
  })
  if (!res.ok) throw new Error(`Failed to create note: ${res.status}`)
  return res.json()
}

export async function deleteSiteNote(id) {
  const res = await fetch(`/api/sites?action=delete-note&id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
  return res.json()
}

// ─── Signatures API ─────────────────────────────────────────────────────

export async function uploadSignature({ vehicleId, siteId, signerName, signerRole, fileData }) {
  const payload = { vehicleId, signerName, signerRole, fileData }
  if (siteId) payload.siteId = siteId
  const res = await fetch('/api/signatures', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Upload signature failed: ${res.status}`)
  }
  return res.json()
}

export async function fetchSignatures(vehicleId) {
  const res = await fetch(`/api/signatures?action=list&vehicle_id=${encodeURIComponent(vehicleId)}`)
  if (!res.ok) throw new Error(`Failed to fetch signatures: ${res.status}`)
  return res.json()
}

export async function deleteSignature(id) {
  const res = await fetch('/api/signatures', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!res.ok) throw new Error(`Delete signature failed: ${res.status}`)
  return res.json()
}

// ─── Comments API ─────────────────────────────────────────────────────

export async function createComment({ vehicleId, content, author }) {
  const res = await fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vehicleId, content, author }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Create comment failed: ${res.status}`)
  }
  return res.json()
}

export async function deleteComment(id) {
  const res = await fetch('/api/comments', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!res.ok) throw new Error(`Delete comment failed: ${res.status}`)
  return res.json()
}

// ─── Reports API ─────────────────────────────────────────────────────

export async function downloadReport(vehicleId) {
  const res = await fetch(`/api/reports?vehicle_id=${encodeURIComponent(vehicleId)}`)
  if (!res.ok) throw new Error(`Failed to generate report: ${res.status}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `CPC_Report_${vehicleId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
