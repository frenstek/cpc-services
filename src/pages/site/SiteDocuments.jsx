import { useState, useEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { fetchSiteDocuments, uploadSiteDocument, deleteSiteDocument } from '../../lib/api'
import { FileText, Upload, Loader2, Trash2, ExternalLink, FolderOpen, X } from 'lucide-react'

function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' }
function formatBytes(b) { if (!b) return ''; if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(0) + ' KB'; return (b / 1048576).toFixed(1) + ' MB' }

const CATS = ['general', 'contract', 'permit', 'report', 'safety', 'other']

export default function SiteDocuments() {
  const { siteId } = useOutletContext()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [docName, setDocName] = useState('')
  const [docCat, setDocCat] = useState('general')
  const [docNotes, setDocNotes] = useState('')
  const [docFile, setDocFile] = useState(null)
  const [docFileData, setDocFileData] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { load() }, [siteId])

  function load() {
    setLoading(true)
    fetchSiteDocuments(siteId).then(d => setDocs(Array.isArray(d) ? d : [])).catch(() => setDocs([])).finally(() => setLoading(false))
  }

  function handleFileSelect(e) {
    const f = e.target.files?.[0]; if (!f) return
    setDocFile(f); setDocName(prev => prev || f.name.replace(/\.[^.]+$/, ''))
    const r = new FileReader(); r.onload = () => setDocFileData(r.result); r.readAsDataURL(f)
  }

  async function handleUpload(e) {
    e.preventDefault(); if (!docFileData || !docName.trim()) return
    setUploading(true)
    try {
      await uploadSiteDocument({ siteId, name: docName.trim(), category: docCat, notes: docNotes.trim() || undefined, fileData: docFileData, fileName: docFile.name, fileSize: docFile.size, fileType: docFile.type })
      setShowUpload(false); setDocName(''); setDocCat('general'); setDocNotes(''); setDocFile(null); setDocFileData(null); load()
    } catch (err) { alert(err.message) }
    finally { setUploading(false) }
  }

  async function handleDelete(doc) {
    if (!confirm(`Delete "${doc.name}"?`)) return
    try { await deleteSiteDocument(doc.id); setDocs(prev => prev.filter(d => d.id !== doc.id)) } catch (err) { alert(err.message) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-300" /></div>

  return (
    <div className="space-y-5">
      <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-400 to-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-500/20 hover:shadow-brand-500/30 transition-all cursor-pointer">
        <Upload size={16} /> Upload Document
      </button>

      {docs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-16 text-center">
          <FolderOpen className="mx-auto mb-4 h-12 w-12 text-slate-200" />
          <p className="text-base font-semibold text-slate-400">No documents yet</p>
          <p className="mt-1 text-sm text-slate-300">Upload contracts, permits, reports for this site</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map(d => (
            <div key={d.id} className="group rounded-2xl border border-slate-200/80 bg-white p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50"><FileText size={18} className="text-brand-500" /></div>
                <div className="flex items-center gap-1">
                  <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-slate-300 hover:text-brand-500 hover:bg-brand-50 transition-colors"><ExternalLink size={14} /></a>
                  <button onClick={() => handleDelete(d)} className="p-1.5 rounded-lg text-slate-200 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"><Trash2 size={14} /></button>
                </div>
              </div>
              <h4 className="text-sm font-bold text-slate-700">{d.name}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{d.file_name}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 capitalize">{d.category}</span>
                {d.file_size > 0 && <span className="text-[10px] text-slate-300">{formatBytes(d.file_size)}</span>}
              </div>
              {d.notes && <p className="mt-2 text-[11px] text-slate-400 line-clamp-2">{d.notes}</p>}
              <p className="text-[10px] text-slate-300 mt-2">{formatDate(d.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-800">Upload Document</h3>
              <button onClick={() => setShowUpload(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">File *</label><input type="file" onChange={handleFileSelect} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-600" required /></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">Name *</label><input type="text" value={docName} onChange={e => setDocName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-brand-400 outline-none" required /></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">Category</label><select value={docCat} onChange={e => setDocCat(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm capitalize focus:border-brand-400 outline-none">{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">Notes</label><textarea value={docNotes} onChange={e => setDocNotes(e.target.value)} rows={2} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-brand-400 outline-none resize-none" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowUpload(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer">Cancel</button>
                <button type="submit" disabled={uploading || !docFileData} className="rounded-xl bg-gradient-to-r from-brand-400 to-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-40 cursor-pointer">{uploading ? 'Uploading...' : 'Upload'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
