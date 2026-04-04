/**
 * Notes — Study material & notes organiser
 * Spec §6.10
 */

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { useSubjects } from '@/hooks/useSubjects'
import { useSemesterStore } from '@/stores/useSemesterStore'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import FAB from '@/components/ui/FAB'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import type { Note, NoteCategory } from '@/types'
import { ExternalLink, Pin, PinOff, Trash2, Link2 } from 'lucide-react'

const CATEGORIES: NoteCategory[] = ['Notes', 'PYQs', 'Reference', 'LabManual', 'Other']

const CATEGORY_EMOJI: Record<NoteCategory, string> = {
  Notes: '📝', PYQs: '📄', Reference: '📚', LabManual: '🔬', Other: '📌',
}

const CATEGORY_BADGE: Record<NoteCategory, 'primary' | 'danger' | 'info' | 'warning' | 'default'> = {
  Notes:     'primary',
  PYQs:      'danger',
  Reference: 'info',
  LabManual: 'warning',
  Other:     'default',
}

export default function NotesPage() {
  const { activeSemesterId }   = useSemesterStore()
  const { subjects }           = useSubjects()

  const [filterSubject,  setFilterSubject]  = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<NoteCategory | 'all'>('all')
  const [showModal,      setShowModal]      = useState(false)

  // Form state
  const [title,        setTitle]        = useState('')
  const [category,     setCategory]     = useState<NoteCategory>('Notes')
  const [subjectId,    setSubjectId]    = useState('')
  const [externalLink, setExternalLink] = useState('')
  const [richText,     setRichText]     = useState('')
  const [saving,       setSaving]       = useState(false)

  const notes = useLiveQuery<Note[]>(
    () => activeSemesterId
      ? db.notes.where('semesterId').equals(activeSemesterId).toArray()
      : Promise.resolve([]),
    [activeSemesterId]
  ) ?? []

  const filtered = notes
    .filter(n => {
      if (filterSubject !== 'all' && n.subjectId !== filterSubject) return false
      if (filterCategory !== 'all' && n.category !== filterCategory) return false
      return true
    })
    .sort((a, b) =>
      // Pinned first, then by date descending
      (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) ||
      b.createdAt.localeCompare(a.createdAt)
    )

  const closeModal = () => {
    setShowModal(false)
    setTitle(''); setSubjectId(''); setExternalLink(''); setRichText(''); setCategory('Notes')
  }

  const handleAdd = async () => {
    if (!title.trim() || !subjectId || !activeSemesterId) return
    setSaving(true)
    const now = new Date().toISOString()
    await db.notes.add({
      id:           crypto.randomUUID(),
      semesterId:   activeSemesterId,
      subjectId,
      title:        title.trim(),
      category,
      tags:         [],
      externalLink: externalLink.trim() || undefined,
      richText:     richText.trim()     || undefined,
      isPinned:     false,
      createdAt:    now,
      updatedAt:    now,
    })
    setSaving(false)
    closeModal()
  }

  const handleTogglePin = async (note: Note) => {
    await db.notes.update(note.id, { isPinned: !note.isPinned, updatedAt: new Date().toISOString() })
  }

  const handleDelete = async (id: string) => {
    await db.notes.delete(id)
  }

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-text text-xl font-bold">Notes</h1>
        {notes.length > 0 && (
          <span className="text-text/30 text-xs">{notes.length} saved</span>
        )}
      </div>

      {/* Subject filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-0.5">
        <button
          onClick={() => setFilterSubject('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            filterSubject === 'all' ? 'bg-[#6C63FF] text-text' : 'bg-white/[0.06] text-text/50 hover:text-text/80'
          }`}
        >
          All
        </button>
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => setFilterSubject(s.id)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={filterSubject === s.id
              ? { backgroundColor: s.color, color: '#fff' }
              : { backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }
            }
          >
            {s.code}
          </button>
        ))}
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-0.5">
        <button
          onClick={() => setFilterCategory('all')}
          className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
            filterCategory === 'all' ? 'bg-white/20 text-text' : 'bg-white/[0.04] text-text/35 hover:text-text/60'
          }`}
        >
          All
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setFilterCategory(filterCategory === c ? 'all' : c)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
              filterCategory === c ? 'bg-white/20 text-text' : 'bg-white/[0.04] text-text/35 hover:text-text/60'
            }`}
          >
            {CATEGORY_EMOJI[c]} {c}
          </button>
        ))}
      </div>

      {/* Notes list */}
      {filtered.length === 0 ? (
        <EmptyState
          title={filterSubject === 'all' && filterCategory === 'all'
            ? 'No notes yet'
            : 'Nothing matches this filter'}
          description={filterSubject === 'all' && filterCategory === 'all'
            ? 'Save links, PYQs, lab manuals and study notes here.'
            : 'Try a different subject or category.'}
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map(note => {
            const subject = subjects.find(s => s.id === note.subjectId)
            return (
              <div
                key={note.id}
                className="rounded-2xl border border-border/[0.07] bg-card/[0.7] p-4 space-y-2.5"
              >
                {/* Title row */}
                <div className="flex items-start gap-2">
                  {note.isPinned && <Pin size={12} className="text-[#FFA502] mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-text font-semibold text-sm leading-snug">{note.title}</p>
                    {note.richText && (
                      <p className="text-text/35 text-xs mt-1 line-clamp-2 leading-relaxed">{note.richText}</p>
                    )}
                  </div>
                </div>

                {/* Tags row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={CATEGORY_BADGE[note.category]} size="sm">
                    {CATEGORY_EMOJI[note.category]} {note.category}
                  </Badge>
                  {subject && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full border"
                      style={{
                        color:           subject.color,
                        backgroundColor: `${subject.color}18`,
                        borderColor:     `${subject.color}40`,
                      }}
                    >
                      {subject.code}
                    </span>
                  )}
                </div>

                {/* Action row */}
                <div className="flex items-center gap-3 pt-1.5 border-t border-border/[0.05]">
                  {note.externalLink && (
                    <a
                      href={note.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-[#00F5D4] text-xs font-medium hover:underline"
                    >
                      <ExternalLink size={11} /> Open Link
                    </a>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePin(note)}
                      className="text-text/25 hover:text-[#FFA502] transition-colors p-1 rounded"
                      title={note.isPinned ? 'Unpin' : 'Pin'}
                    >
                      {note.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="text-text/20 hover:text-[#FF4757] transition-colors p-1 rounded"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <FAB onClick={() => setShowModal(true)} label="Add Note" />

      <Modal open={showModal} onClose={closeModal} title="Add Note / Link">
        <div className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. DBMS Module 3 PYQ 2024"
            autoFocus
          />
          <Select
            label="Subject"
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            placeholder="Select subject"
            options={subjects.map(s => ({ value: s.id, label: `${s.code} · ${s.name}` }))}
          />
          <Select
            label="Category"
            value={category}
            onChange={e => setCategory(e.target.value as NoteCategory)}
            options={CATEGORIES.map(c => ({ value: c, label: `${CATEGORY_EMOJI[c]} ${c}` }))}
          />
          <Input
            label="External Link (optional)"
            value={externalLink}
            onChange={e => setExternalLink(e.target.value)}
            placeholder="https://drive.google.com/..."
            leftIcon={<Link2 size={14} />}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text/70">Notes (optional)</label>
            <textarea
              value={richText}
              onChange={e => setRichText(e.target.value)}
              placeholder="Key formulas, reminders, quick summary..."
              rows={4}
              className="w-full rounded-xl border border-border/[0.08] bg-white/[0.04] text-text/90
                         text-sm px-3.5 py-2.5 placeholder:text-text/20
                         focus:outline-none focus:border-[#6C63FF]/60 focus:ring-2 focus:ring-[#6C63FF]/20
                         transition-all resize-none"
            />
          </div>
          <Button
            fullWidth
            onClick={handleAdd}
            loading={saving}
            disabled={!title.trim() || !subjectId}
          >
            Save Note
          </Button>
        </div>
      </Modal>
    </div>
  )
}
