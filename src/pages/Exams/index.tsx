/**
 * Exams — Countdown timers + exam schedule
 * Spec §6.8
 */

import { useEffect, useState, useMemo } from 'react'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { Calendar, MapPin, Trash2, Pencil, Filter } from 'lucide-react'
import { useExamStore } from '@/stores/useExamStore'
import { useSubjects } from '@/hooks/useSubjects'
import { useSemesterStore } from '@/stores/useSemesterStore'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import FAB from '@/components/ui/FAB'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import type { ExamType, Exam } from '@/types'
import { Link } from 'react-router-dom'

dayjs.extend(duration)

const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  MidTerm1:    'Mid-Term 1',
  MidTerm2:    'Mid-Term 2',
  CBT:         'CBT',
  SEE:         'End-Sem (SEE)',
  Supplementary: 'Supplementary',
  LabSEE:      'Lab SEE',
  Viva:        'Viva',
  FieldProject: 'Field Project',
  Internship:  'Internship',
  ProjectViva: 'Project Viva',
}

const EXAM_BADGE_VARIANT: Partial<Record<ExamType, 'primary' | 'danger' | 'warning' | 'info'>> = {
  MidTerm1: 'primary', MidTerm2: 'primary',
  CBT: 'info', SEE: 'danger', Supplementary: 'warning',
}

type FilterTab = 'all' | 'upcoming' | 'thisWeek' | 'past'

function CountdownChip({ date, nowTick }: { date: string, nowTick: number }) {
  const diff   = dayjs(date).diff(dayjs(nowTick))
  const d      = dayjs.duration(diff)
  const days   = Math.floor(d.asDays())

  if (diff <= 0)    return <span className="text-[#FF4757] font-bold text-xs">Today / Past</span>
  if (days > 30)    return <span className="text-text/40 text-xs">{days}d away</span>
  if (days >= 7)    return <span className="text-[#00C9B1] font-semibold text-xs">{days}d left</span>
  if (days >= 1)    return <span className="text-[#FFA502] font-bold text-xs animate-pulse">{days}d {d.hours()}h left</span>
  
  // Under 24 hours: show hours and minutes
  return              <span className="text-[#FF4757] font-bold text-xs animate-pulse">{d.hours()}h {d.minutes()}m left</span>
}

function urgencyVariant(date: string): 'primary' | 'warning' | 'danger' {
  const days = dayjs(date).diff(dayjs(), 'day')
  if (days <= 3) return 'danger'
  if (days <= 7) return 'warning'
  return 'primary'
}

export default function ExamsPage() {
  const { activeSemesterId }              = useSemesterStore()
  const { exams, isLoaded, loadExams, addExam, updateExam, deleteExam } = useExamStore()
  const { subjects }                      = useSubjects()

  const [showModal, setShowModal]  = useState(false)
  const [editingExam, setEditingExam] = useState<Exam | null>(null)
  
  // Filtering state
  const [tab, setTab] = useState<FilterTab>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Form state
  const [subjectId, setSubjectId]  = useState('')
  const [name,      setName]       = useState('')
  const [type,      setType]       = useState<ExamType>('MidTerm1')
  const [date,      setDate]       = useState('')
  const [venue,     setVenue]      = useState('')
  const [saving,    setSaving]     = useState(false)
  
  // Delete confirm state
  const [showDelete, setShowDelete] = useState<string | null>(null)

  // Live countdown ticker (updates every minute)
  const [nowTick, setNowTick] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (activeSemesterId && !isLoaded) loadExams(activeSemesterId)
  }, [activeSemesterId, isLoaded, loadExams])

  const now      = dayjs()
  const endOfWeek = now.endOf('week')

  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      // Subject filtering
      if (subjectFilter !== 'all' && e.subjectId !== subjectFilter) return false
      // Type filtering
      if (typeFilter !== 'all' && e.type !== typeFilter) return false
      
      const isPast = dayjs(e.date).isBefore(now)
      
      switch (tab) {
        case 'upcoming': return !isPast
        case 'thisWeek': return !isPast && !dayjs(e.date).isAfter(endOfWeek)
        case 'past': return isPast
        case 'all': default: return true
      }
    }).sort((a, b) => {
      // For past tab, sort newest first. For others, sort soonest first.
      if (tab === 'past') return dayjs(b.date).diff(dayjs(a.date))
      return dayjs(a.date).diff(dayjs(b.date))
    })
  }, [exams, subjectFilter, typeFilter, tab, now, endOfWeek])

  const upcomingCount = exams.filter(e => dayjs(e.date).isAfter(now)).length

  const openAdd = () => {
    setEditingExam(null)
    setName(''); setSubjectId(''); setDate(''); setVenue(''); setType('MidTerm1')
    setShowModal(true)
  }

  const openEdit = (exam: Exam) => {
    setEditingExam(exam)
    setSubjectId(exam.subjectId)
    setName(exam.name)
    setType(exam.type)
    // Convert to datetime-local format format YYYY-MM-DDTHH:mm
    setDate(dayjs(exam.date).format('YYYY-MM-DDTHH:mm'))
    setVenue(exam.venue || '')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!activeSemesterId || !subjectId || !date) return
    setSaving(true)
    
    if (editingExam) {
      await updateExam(editingExam.id, {
        subjectId,
        name: name.trim() || EXAM_TYPE_LABELS[type],
        type,
        date: new Date(date).toISOString(),
        venue: venue.trim() || undefined,
      })
    } else {
      await addExam({
        semesterId:             activeSemesterId,
        subjectId,
        name:                   name.trim() || EXAM_TYPE_LABELS[type],
        type,
        date:                   new Date(date).toISOString(),
        venue:                  venue.trim() || undefined,
        syllabusUnitIds:        [],
        notificationsScheduled: false,
      })
    }
    
    setSaving(false)
    setShowModal(false)
  }
  
  const handleDelete = async () => {
    if (showDelete) {
      await deleteExam(showDelete)
      setShowDelete(null)
    }
  }

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All Exams' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'thisWeek', label: 'This Week' },
    { key: 'past', label: 'Past' },
  ]

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text text-xl font-bold">Exams</h1>
          <p className="text-text/30 text-xs mt-0.5">
            {upcomingCount > 0 ? `${upcomingCount} upcoming exams` : 'No upcoming exams'}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === t.key
                ? 'bg-[#6C63FF] text-text'
                : 'bg-white/[0.06] text-text/50 hover:text-text/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Subject filter chips */}
      {subjects.length > 0 && exams.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-0.5">
          <button
            onClick={() => setSubjectFilter('all')}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
              subjectFilter === 'all' ? 'bg-white/20 text-text' : 'bg-white/[0.04] text-text/35 hover:text-text/60'
            }`}
          >
            All Subjects
          </button>
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => setSubjectFilter(subjectFilter === s.id ? 'all' : s.id)}
              className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
              style={subjectFilter === s.id
                ? { backgroundColor: s.color, color: '#fff' }
                : { backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }
              }
            >
              {s.code}
            </button>
          ))}
        </div>
      )}
      
      {/* Type filter */}
      {exams.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
           <Filter size={12} className="text-text/30" />
           <select
             value={typeFilter}
             onChange={e => setTypeFilter(e.target.value)}
             className="bg-transparent text-xs text-text/60 focus:outline-none focus:text-text transition-colors"
           >
             <option value="all" className="bg-card">All Types</option>
             {Object.entries(EXAM_TYPE_LABELS).map(([key, label]) => (
               <option key={key} value={key} className="bg-card">{label}</option>
             ))}
           </select>
        </div>
      )}

      {/* Exam list */}
      {filteredExams.length === 0 ? (
        <EmptyState
          title={tab === 'past' ? 'No past exams' : 'No exams found'}
          description="Schedule your upcoming exams to track them."
        />
      ) : (
        <div className="space-y-3">
          {filteredExams.map(exam => {
            const subject = subjects.find(s => s.id === exam.subjectId)
            const variant = EXAM_BADGE_VARIANT[exam.type] ?? 'default'
            const isPast = dayjs(exam.date).isBefore(now)
            
            return (
              <div
                key={exam.id}
                className={`rounded-2xl border transition-all ${
                  isPast 
                    ? 'border-border/[0.04] bg-card/40 opacity-75' 
                    : 'border-border/[0.07] bg-card/[0.75]0'
                } p-4 space-y-3`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={variant} size="sm">
                        {EXAM_TYPE_LABELS[exam.type]}
                      </Badge>
                      {subject && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full border"
                          style={{
                            color:           isPast ? 'rgba(255,255,255,0.6)' : subject.color,
                            backgroundColor: isPast ? 'rgba(255,255,255,0.05)' : `${subject.color}18`,
                            borderColor:     isPast ? 'transparent' : `${subject.color}40`,
                          }}
                        >
                          {subject.code}
                        </span>
                      )}
                    </div>
                    <p className="text-text font-semibold text-sm leading-snug">{exam.name}</p>
                    {subject && <p className="text-text/40 text-xs">{subject.name}</p>}
                  </div>
                  
                  {!isPast && (
                    <Badge variant={urgencyVariant(exam.date)} size="sm">
                      <CountdownChip date={exam.date} nowTick={nowTick} />
                    </Badge>
                  )}
                </div>

                {/* Bottom row */}
                <div className="flex items-center gap-3 pt-1 border-t border-border/[0.06] text-xs text-text/35">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {dayjs(exam.date).format('ddd, D MMM YYYY · h:mm A')}
                  </span>
                  {exam.venue && (
                    <>
                      <span className="text-text/15">·</span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {exam.venue}
                      </span>
                    </>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    {isPast && (
                      <Link to="/grades" className="text-[10px] text-[#6C63FF] hover:underline mr-2">
                        View Grades
                      </Link>
                    )}
                    <button
                      onClick={() => openEdit(exam)}
                      className="p-1 text-text/20 hover:text-text/60 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setShowDelete(exam.id)}
                      className="p-1 text-text/20 hover:text-[#FF4757] transition-colors"
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

      <FAB onClick={openAdd} label="Add Exam" />

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingExam ? 'Edit Exam' : 'Schedule Exam'}>
        <div className="space-y-4">
          <Select
            label="Subject"
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            placeholder="Select subject"
            options={subjects.map(s => ({ value: s.id, label: `${s.code} · ${s.name}` }))}
          />
          <Select
            label="Exam Type"
            value={type}
            onChange={e => setType(e.target.value as ExamType)}
            options={Object.entries(EXAM_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          />
          <Input
            label="Exam Name (optional)"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Auto-filled from type if left blank"
          />
          <Input
            label="Date & Time"
            type="datetime-local"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <Input
            label="Venue (optional)"
            value={venue}
            onChange={e => setVenue(e.target.value)}
            placeholder="e.g. Block C Exam Hall"
          />
          <Button fullWidth onClick={handleSave} loading={saving} disabled={!subjectId || !date}>
            {editingExam ? 'Save Changes' : 'Schedule Exam'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Exam" size="sm">
        <div className="space-y-4">
          <p className="text-text/60 text-xs leading-relaxed">
            Are you sure you want to delete this exam?
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
