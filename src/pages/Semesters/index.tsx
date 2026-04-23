/**
 * Semesters — Manage all semesters
 * View, switch, add, edit, and archive semesters.
 */

import { useState } from 'react'
import dayjs from 'dayjs'
import { useSemesterStore } from '@/stores/useSemesterStore'
import { useProfileStore } from '@/stores/useProfileStore'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import FAB from '@/components/ui/FAB'
import Badge from '@/components/ui/Badge'
import type { Semester } from '@/types'
import { Layers, CheckCircle2, Archive, Calendar, BookOpen, Pencil, Hash, AlignLeft, Beaker, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function SemestersPage() {
  const { semesters, subjects, activeSemesterId, addSemester, updateSemester, setActiveSemester, archiveSemester, removeSemester } = useSemesterStore()
  const { updateProfile } = useProfileStore()

  const [showAdd, setShowAdd] = useState(false)
  const [editingSem, setEditingSem] = useState<Semester | null>(null)
  const [deletingSem, setDeletingSem] = useState<Semester | null>(null)
  const [deleteStep, setDeleteStep] = useState(0) // 0=idle 1=confirm1 2=confirm2 3=confirm3

  // Form state
  const [semNumber, setSemNumber] = useState(1)
  const [academicYear, setAcademicYear] = useState('2025-26')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)

  const activeSemesters = semesters.filter(s => !s.isArchived)
  const archivedSemesters = semesters.filter(s => s.isArchived)

  const getSubjectCount = (semId: string) => subjects.filter(s => s.semesterId === semId).length
  const getTotalCredits = (semId: string) => subjects.filter(s => s.semesterId === semId).reduce((a, s) => a + s.credits, 0)

  const openAdd = () => {
    setEditingSem(null)
    setSemNumber(semesters.length + 1)
    setAcademicYear('2025-26')
    setStartDate(''); setEndDate('')
    setShowAdd(true)
  }

  const openEdit = (sem: Semester) => {
    setEditingSem(sem)
    setSemNumber(sem.number)
    setAcademicYear(sem.academicYear)
    setStartDate(sem.startDate)
    setEndDate(sem.endDate)
    setShowAdd(true)
  }

  const handleSave = () => {
    if (!startDate || !endDate) return
    setSaving(true)

    if (editingSem) {
      updateSemester(editingSem.id, {
        number: semNumber,
        academicYear,
        startDate,
        endDate,
      })
    } else {
      const semId = crypto.randomUUID()
      addSemester({
        id: semId,
        number: semNumber,
        academicYear,
        startDate,
        endDate,
        isActive: semesters.length === 0,
        isArchived: false,
      })
      // Auto-activate if first semester
      if (semesters.length === 0) {
        setActiveSemester(semId)
      }
    }

    setSaving(false)
    setShowAdd(false)
  }

  const handleSetActive = (sem: Semester) => {
    setActiveSemester(sem.id)
    // Deactivate all others
    for (const s of semesters) {
      if (s.id !== sem.id) updateSemester(s.id, { isActive: false })
    }
    updateSemester(sem.id, { isActive: true })
    updateProfile({ currentSemester: sem.number })
  }

  const handleArchive = (sem: Semester) => {
    archiveSemester(sem.id)
  }

  const openDelete = (sem: Semester) => {
    setDeletingSem(sem)
    setDeleteStep(1)
  }

  const handleDeleteStep = () => {
    if (deleteStep < 3) { setDeleteStep(s => s + 1); return }
    if (!deletingSem) return
    removeSemester(deletingSem.id)
    if (activeSemesterId === deletingSem.id) {
      const next = semesters.find(s => s.id !== deletingSem.id && !s.isArchived)
      if (next) setActiveSemester(next.id)
    }
    setDeletingSem(null)
    setDeleteStep(0)
  }

  const handleUnarchive = (sem: Semester) => {
    updateSemester(sem.id, { isArchived: false, isActive: false })
  }

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text text-xl font-bold">Semesters</h1>
          <p className="text-text/30 text-xs mt-0.5">
            {semesters.length} semester{semesters.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Badge variant="primary" size="sm">
          <Layers size={10} className="mr-1" />{activeSemesters.length} active
        </Badge>
      </div>

      {semesters.length === 0 ? (
        <EmptyState
          title="No semesters"
          description="Create your first semester to start tracking."
        />
      ) : (
        <div className="space-y-6">
          {/* Active semesters */}
          {activeSemesters.length > 0 && (
            <section className="space-y-2">
              <p className="text-text/30 text-[10px] uppercase tracking-wider">Active Semesters</p>
              {activeSemesters
                .sort((a, b) => b.number - a.number)
                .map(sem => (
                  <SemesterCard
                    key={sem.id}
                    semester={sem}
                    isActive={sem.id === activeSemesterId}
                    subjectCount={getSubjectCount(sem.id)}
                    totalCredits={getTotalCredits(sem.id)}
                    onSetActive={() => handleSetActive(sem)}
                    onArchive={() => handleArchive(sem)}
                    onEdit={() => openEdit(sem)}
                    onDelete={() => openDelete(sem)}
                  />
                ))}
            </section>
          )}

          {/* Semester Management Modules */}
          {activeSemesters.length > 0 && (
            <section className="space-y-3">
              <p className="text-text/30 text-[10px] uppercase tracking-wider">Manage Semester</p>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/subjects" className="rounded-2xl border border-border/[0.07] bg-card/50 p-4 flex flex-col items-center justify-center gap-2 hover:bg-[rgba(108,99,255,0.05)] hover:border-[#6C63FF]/30 transition-all text-center">
                  <BookOpen size={24} className="text-[#6C63FF]" />
                  <div>
                    <p className="text-text text-sm font-semibold">Subjects</p>
                    <p className="text-text/30 text-[10px] mt-0.5">Manage theory</p>
                  </div>
                </Link>
                <Link to="/labs" className="rounded-2xl border border-border/[0.07] bg-card/50 p-4 flex flex-col items-center justify-center gap-2 hover:bg-[rgba(0,245,212,0.05)] hover:border-[#00F5D4]/30 transition-all text-center">
                  <Beaker size={24} className="text-[#00F5D4]" />
                  <div>
                    <p className="text-text text-sm font-semibold">Labs</p>
                    <p className="text-text/30 text-[10px] mt-0.5">CIE & SEE</p>
                  </div>
                </Link>
                <Link to="/ncs" className="rounded-2xl border border-border/[0.07] bg-card/50 p-4 flex flex-col items-center justify-center gap-2 hover:bg-[rgba(255,165,2,0.05)] hover:border-[#FFA502]/30 transition-all text-center">
                  <Hash size={24} className="text-[#FFA502]" />
                  <div>
                    <p className="text-text text-sm font-semibold">No Credit</p>
                    <p className="text-text/30 text-[10px] mt-0.5">Audit courses</p>
                  </div>
                </Link>
                <Link to="/syllabus" className="rounded-2xl border border-border/[0.07] bg-card/50 p-4 flex flex-col items-center justify-center gap-2 hover:bg-[rgba(255,71,87,0.05)] hover:border-[#FF4757]/30 transition-all text-center">
                  <AlignLeft size={24} className="text-[#FF4757]" />
                  <div>
                    <p className="text-text text-sm font-semibold">Syllabus</p>
                    <p className="text-text/30 text-[10px] mt-0.5">Track progress</p>
                  </div>
                </Link>
              </div>
            </section>
          )}

          {/* Archived */}
          {archivedSemesters.length > 0 && (
            <section className="space-y-2">
              <p className="text-text/30 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                <Archive size={10} /> Archived ({archivedSemesters.length})
              </p>
              {archivedSemesters
                .sort((a, b) => b.number - a.number)
                .map(sem => (
                  <div
                    key={sem.id}
                    className="flex items-center gap-3 bg-white/[0.02] border border-border/[0.05] rounded-xl px-4 py-3 opacity-60"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-text/50 text-xs font-medium">Semester {sem.number} · {sem.academicYear}</p>
                      <p className="text-text/20 text-[10px]">{getSubjectCount(sem.id)} subjects · {getTotalCredits(sem.id)} credits</p>
                    </div>
                    <button
                      onClick={() => handleUnarchive(sem)}
                      className="text-[10px] text-[#6C63FF] hover:underline"
                    >
                      Restore
                    </button>
                  </div>
                ))}
            </section>
          )}
        </div>
      )}

      <FAB onClick={openAdd} label="Add Semester" />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={editingSem ? 'Edit Semester' : 'Add Semester'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Semester Number"
              type="number"
              min={1}
              max={10}
              value={semNumber}
              onChange={e => setSemNumber(Number(e.target.value))}
            />
            <Input
              label="Academic Year"
              placeholder="e.g. 2025-26"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <Button fullWidth onClick={handleSave} loading={saving} disabled={!startDate || !endDate}>
            {editingSem ? 'Save Changes' : 'Create Semester'}
          </Button>
        </div>
      </Modal>

      {/* ─── Delete confirmation modal (3-step) ─────────────── */}
      <Modal
        open={!!deletingSem && deleteStep > 0}
        onClose={() => { setDeletingSem(null); setDeleteStep(0) }}
        title="Delete Semester"
        size="sm"
      >
        {deletingSem && (
          <div className="space-y-4">
            <div className="bg-[rgba(255,71,87,0.08)] border border-[#FF4757]/30 rounded-xl px-4 py-3 space-y-1">
              <p className="text-[#FF4757] text-sm font-semibold">
                {deleteStep === 1 && '⚠️ Are you sure?'}
                {deleteStep === 2 && '⚠️ Really sure? This cannot be undone.'}
                {deleteStep === 3 && '🚨 Final confirmation — all data will be lost.'}
              </p>
              <p className="text-text/50 text-xs leading-relaxed">
                Deleting <strong>Semester {deletingSem.number} ({deletingSem.academicYear})</strong> will
                permanently remove it along with all its subjects.
                Attendance records, marks, and tasks linked to this semester are <strong>not</strong> removed from the database automatically.
              </p>
            </div>
            <div className="flex gap-3">
              <Button fullWidth variant="secondary" onClick={() => { setDeletingSem(null); setDeleteStep(0) }}>
                Cancel
              </Button>
              <Button fullWidth variant="danger" onClick={handleDeleteStep}>
                <Trash2 size={14} />
                {deleteStep === 1 && 'Yes, delete'}
                {deleteStep === 2 && 'Confirm delete'}
                {deleteStep === 3 && 'Delete forever'}
              </Button>
            </div>
            <p className="text-center text-[10px] text-text/20">Confirmation {deleteStep} of 3</p>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ─── Semester Card ──────────────────────────────────────────────────────

function SemesterCard({
  semester,
  isActive,
  subjectCount,
  totalCredits,
  onSetActive,
  onArchive,
  onEdit,
  onDelete,
}: {
  semester: Semester
  isActive: boolean
  subjectCount: number
  totalCredits: number
  onSetActive: () => void
  onArchive: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const now = dayjs()
  const start = dayjs(semester.startDate)
  const end = dayjs(semester.endDate)
  const totalDays = end.diff(start, 'day')
  const elapsed = now.diff(start, 'day')
  const progress = totalDays > 0 ? Math.min(Math.max(elapsed / totalDays, 0), 1) : 0

  return (
    <div className={`rounded-2xl border p-4 transition-all ${
      isActive
        ? 'border-[#6C63FF]/30 bg-[rgba(108,99,255,0.05)]'
        : 'border-border/[0.07] bg-card/50'
    }`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-text text-sm font-semibold">Semester {semester.number}</p>
            {isActive && (
              <Badge variant="primary" size="sm">
                <CheckCircle2 size={9} className="mr-0.5" />Active
              </Badge>
            )}
          </div>
          <p className="text-text/30 text-[10px] mt-0.5">{semester.academicYear}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text/25 hover:text-text/60 transition-colors">
            <Pencil size={13} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <BookOpen size={11} className="text-text/25" />
          <span className="text-text/40 text-[10px]">{subjectCount} subjects</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-text/40 text-[10px]">{totalCredits} credits</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar size={11} className="text-text/25" />
          <span className="text-text/40 text-[10px]">
            {start.format('D MMM')} — {end.format('D MMM YYYY')}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {isActive && totalDays > 0 && (
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-text/25">{Math.round(progress * 100)}% elapsed</span>
            <span className="text-text/20">{Math.max(0, end.diff(now, 'day'))} days left</span>
          </div>
          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#6C63FF] transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        {!isActive && (
          <button
            onClick={onSetActive}
            className="text-[10px] text-[#6C63FF] hover:underline flex items-center gap-1"
          >
            <CheckCircle2 size={10} />Set as active
          </button>
        )}
        <button
          onClick={onArchive}
          className="text-[10px] text-text/25 hover:text-[#FFA502] flex items-center gap-1 ml-auto"
        >
          <Archive size={10} />Archive
        </button>
        <button
          onClick={onDelete}
          className="text-[10px] text-text/20 hover:text-[#FF4757] flex items-center gap-1"
        >
          <Trash2 size={10} />Delete
        </button>
      </div>
    </div>
  )
}
