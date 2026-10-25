import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { fetchSiteNotes, createSiteNote, deleteSiteNote } from '../../lib/api'
import { MessageSquare, Send, Trash2, Loader2 } from 'lucide-react'

function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' }
function formatTime(d) { return d ? new Date(d).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : '' }

export default function SiteNotes() {
  const { siteId } = useOutletContext()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [author, setAuthor] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchSiteNotes(siteId).then(d => setNotes(Array.isArray(d) ? d : [])).catch(() => setNotes([])).finally(() => setLoading(false))
  }, [siteId])

  async function handleSend(e) {
    e.preventDefault(); if (!content.trim()) return
    setSending(true)
    try {
      const note = await createSiteNote({ siteId, content: content.trim(), author: author.trim() || 'Staff' })
      setNotes(prev => [note, ...prev]); setContent('')
    } catch (err) { alert(err.message) }
    finally { setSending(false) }
  }

  async function handleDelete(id) {
    try { await deleteSiteNote(id); setNotes(prev => prev.filter(n => n.id !== id)) } catch (err) { alert(err.message) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-300" /></div>

  return (
    <div className="space-y-5">
      {/* Compose */}
      <form onSubmit={handleSend} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-3">
          <input type="text" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Your name" className="w-44 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:border-brand-400 outline-none" />
        </div>
        <div className="flex gap-2">
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={2} placeholder="Write a note or message..." className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:border-brand-400 outline-none resize-none" />
          <button type="submit" disabled={sending || !content.trim()} className="self-end rounded-xl bg-gradient-to-r from-brand-400 to-brand-500 p-3 text-white shadow-md disabled:opacity-40 cursor-pointer hover:shadow-brand-500/30 transition-all">
            <Send size={18} />
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-16 text-center">
          <MessageSquare className="mx-auto mb-4 h-12 w-12 text-slate-200" />
          <p className="text-base font-semibold text-slate-400">No notes yet</p>
          <p className="mt-1 text-sm text-slate-300">Add a note to start the log</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(n => (
            <div key={n.id} className="group rounded-2xl border border-slate-200/80 bg-white p-5 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-500 text-xs font-bold text-white">
                    {(n.author || 'S')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{n.author || 'Staff'}</p>
                    <p className="text-[10px] text-slate-400">{formatDate(n.created_at)} {formatTime(n.created_at)}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(n.id)} className="rounded-lg p-1.5 text-slate-200 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{n.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
