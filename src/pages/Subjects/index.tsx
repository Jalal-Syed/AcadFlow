/**
 * Subjects — Manage current semester subjects
 * Add, edit, delete subjects with color-coded type badges.
 */

import { useState } from 'react'
import { useSemesterStore } from '@/stores/useSemesterStore'
import { useSubjects } from '@/hooks/useSubjects'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import EmptyState from '@/components/ui/EmptyState'
import FAB from '@/components/ui/FAB'
import Badge from '@/components/ui/Badge'
import { SUBJECT_COLORS } from '@/constants/grading'
import type { Subject, SubjectType, AttendanceRecord } from '@/types'
import { BookOpen, Beaker, Hash, Pencil, Trash2 } from 'lucide-react'

const TYPE_ICON: Record<SubjectType, typeof BookOpen> = {
  Theory: BookOpen,
  Lab: Beaker,
  NoCredit: Hash,
}

const TYPE_COLOR: Record<SubjectType, string> = {
  Theory: '#6C63FF',
  Lab: '#00F5D4',
  NoCredit: '#FFA502',
}

export default function SubjectsPage() {
  const { activeSemesterId, addSubject, updateSubject, removeSubject } = useSemesterStore()
  const { subjects } = useSubjects()

  const [showModal, setShowModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [showDelete, setShowDelete] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [credits, setCredits] = useState(3)
  const [type, setType] = useState<SubjectType>('Theory')
  const [saving, setSaving] = useState(false)

  // Get attendance data for each subject
  const allRecords = useLiveQuery<AttendanceRecord[]>(
    () => activeSemesterId
      ? db.attendanceRecords.where('semesterId').equals(activeSemesterId).toArray()
      : Promise.resolve([]),
    [activeSemesterId]
  ) ?? []

  const getSubjectAttendance = (subjectId: string) => {
    const records = allRecords.filter(r => r.subjectId === subjectId)
    const held = records.filter(r => r.status !== 'Cancelled' && r.status !== 'Holiday').length
    const attended = records.filter(r => r.status === 'Present' || r.status === 'Late').length
    if (held === 0) return null
    return Math.round((attended / held) * 100)
  }

  const openAdd = () => {
    setEditingSubject(null)
    setName(''); setCode(''); setCredits(3); setType('Theory')
    setShowModal(true)
  }

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject)
    setName(subject.name)
    setCode(subject.code)
    setCredits(subject.credits)
    setType(subject.type)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!name.trim() || !code.trim() || !activeSemesterId) return
    setSaving(true)

    if (editingSubject) {
      updateSubject(editingSubject.id, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        credits,
        type,
      })
    } else {
      const subject: Subject = {
        id: crypto.randomUUID(),
        semesterId: activeSemesterId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        credits,
        type,
        color: SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length],
        isMidtermBonusEnabled: type === 'Theory',
        isODCountedPresent: false,
        isMedicalExcluded: false,
        order: subjects.length,
      }
      addSubject(subject)
    }

    setSaving(false)
    setShowModal(false)
  }

  const handleDelete = () => {
    if (showDelete) {
      removeSubject(showDelete)
      setShowDelete(null)
    }
  }

  const theorySubs = subjects.filter(s => s.type === 'Theory')
  const labSubs = subjects.filter(s => s.type === 'Lab')
  const ncsSubs = subjects.filter(s => s.type === 'NoCredit')
  const totalCredits = subjects.reduce((s, x) => s + x.credits, 0)

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text text-xl font-bold">Subjects</h1>
          <p className="text-text/30 text-xs mt-0.5">
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} · {totalCredits} credits
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="primary" size="sm">{theorySubs.length} Theory</Badge>
          {labSubs.length > 0 && <Badge variant="default" size="sm">{labSubs.length} Lab</Badge>}
          {ncsSubs.length > 0 && <Badge variant="warning" size="sm">{ncsSubs.length} NC</Badge>}
        </div>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          title="No subjects added"
          description="Add your subjects for this semester to get started."
        />
      ) : (
        <div className="space-y-6">
          {/* Theory */}
          {theorySubs.length > 0 && (
            <section className="space-y-2">
              <p className="text-text/30 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={10} /> Theory ({theorySubs.length})
              </p>
              {theorySubs.map(subject => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  attendance={getSubjectAttendance(subject.id)}
                  onEdit={() => openEdit(subject)}
                  onDelete={() => setShowDelete(subject.id)}
                />
              ))}
            </section>
          )}

          {/* Labs */}
          {labSubs.length > 0 && (
            <section className="space-y-2">
              <p className="text-text/30 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                <Beaker size={10} /> Laboratory ({labSubs.length})
              </p>
              {labSubs.map(subject => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  attendance={getSubjectAttendance(subject.id)}
                  onEdit={() => openEdit(subject)}
                  onDelete={() => setShowDelete(subject.id)}
                />
              ))}
            </section>
          )}

          {/* No Credit */}
          {ncsSubs.length > 0 && (
            <section className="space-y-2">
              <p className="text-text/30 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                <Hash size={10} /> No Credit ({ncsSubs.length})
              </p>
              {ncsSubs.map(subject => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  attendance={getSubjectAttendance(subject.id)}
                  onEdit={() => openEdit(subject)}
                  onDelete={() => setShowDelete(subject.id)}
                />
              ))}
            </section>
          )}
        </div>
      )}

      <FAB onClick={openAdd} label="Add Subject" />

      {/* Add / Edit modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingSubject ? 'Edit Subject' : 'Add Subject'}
      >
        <div className="space-y-4">
          <Input
            label="Subject Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Data Structures"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Subject Code"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="e.g. CS301"
            />
            <Input
              label="Credits"
              type="number"
              min={0}
              max={6}
              value={credits}
              onChange={e => setCredits(Number(e.target.value))}
            />
          </div>
          <Select
            label="Type"
            value={type}
            onChange={e => setType(e.target.value as SubjectType)}
            options={[
              { value: 'Theory', label: '📘 Theory' },
              { value: 'Lab', label: '🔬 Lab / Practical' },
              { value: 'NoCredit', label: '#️⃣ No Credit (Audit)' },
            ]}
          />
          <Button fullWidth onClick={handleSave} loading={saving} disabled={!name.trim() || !code.trim()}>
            {editingSubject ? 'Save Changes' : 'Add Subject'}
          </Button>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Subject" size="sm">
        <div className="space-y-4">
          <p className="text-text/60 text-xs leading-relaxed">
            This will remove the subject and its data (attendance, marks) cannot be recovered. Are you sure?
          </p>
          <div className="flex gap-3">
            <Button fullWidth variant="secondary" onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button fullWidth variant="danger" onClick={handleDelete}>
              <Trash2 size={14} className="mr-1" />Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Subject Card ─────────────────────────────────────────────────────────

function SubjectCard({
  subject,
  attendance,
  onEdit,
  onDelete,
}: {
  subject: Subject
  attendance: number | null
  onEdit: () => void
  onDelete: () => void
}) {
  const TypeIcon = TYPE_ICON[subject.type]
  const typeColor = TYPE_COLOR[subject.type]

  return (
    <div className="flex items-center gap-3 bg-card/50 border border-border/[0.07] rounded-2xl px-4 py-3 group">
      {/* Color strip */}
      <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: subject.color }} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-text text-sm font-semibold truncate">{subject.name}</p>
          <Badge size="sm" variant="default">
            <TypeIcon size={9} className="mr-0.5" style={{ color: typeColor }} />
            {subject.type}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-text/30 text-[10px] font-mono">{subject.code}</span>
          <span className="text-text/20">·</span>
          <span className="text-text/30 text-[10px]">{subject.credits} credit{subject.credits !== 1 ? 's' : ''}</span>
          {attendance !== null && (
            <>
              <span className="text-text/20">·</span>
              <span className={`text-[10px] font-mono ${
                attendance >= 75 ? 'text-[#2ED573]' : attendance >= 65 ? 'text-[#FFA502]' : 'text-[#FF4757]'
              }`}>
                {attendance}% attendance
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text/25 hover:text-text/60 transition-colors">
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text/25 hover:text-[#FF4757] transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
