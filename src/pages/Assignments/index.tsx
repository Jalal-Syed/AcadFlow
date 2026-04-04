/**
 * Assignments — Dedicated assignment & deadline manager
 * Focused view of the task system filtered for academic assignments.
 */

import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useTaskStore } from '@/stores/useTaskStore'
import { useSubjects } from '@/hooks/useSubjects'
import { useSemesterStore } from '@/stores/useSemesterStore'
import TaskItem from '@/components/tasks/TaskItem'
import EmptyState from '@/components/ui/EmptyState'
import FAB from '@/components/ui/FAB'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import type { TaskType, TaskPriority } from '@/types'
import { ClipboardList, AlertTriangle, Clock, CheckCircle2, Calendar } from 'lucide-react'

dayjs.extend(relativeTime)

type FilterTab = 'all' | 'overdue' | 'thisWeek' | 'upcoming' | 'done'

export default function AssignmentsPage() {
  const { activeSemesterId } = useSemesterStore()
  const { tasks, isLoaded, loadTasks, addTask, completeTask } = useTaskStore()
  const { subjects } = useSubjects()
  const [tab, setTab] = useState<FilterTab>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)

  // Add-task form state
  const [title, setTitle] = useState('')
  const [type, setType] = useState<TaskType>('Assignment')
  const [priority, setPriority] = useState<TaskPriority>('Medium')
  const [dueDate, setDueDate] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (activeSemesterId && !isLoaded) loadTasks(activeSemesterId)
  }, [activeSemesterId, isLoaded, loadTasks])

  const now = dayjs()
  const endOfWeek = now.endOf('week')

  const filtered = tasks
    .filter(t => {
      // Subject filter
      if (subjectFilter !== 'all' && t.subjectId !== subjectFilter) return false
      // Tab filter
      switch (tab) {
        case 'overdue': return t.status !== 'Done' && dayjs(t.dueDate).isBefore(now)
        case 'thisWeek': return t.status !== 'Done' && !dayjs(t.dueDate).isBefore(now) && !dayjs(t.dueDate).isAfter(endOfWeek)
        case 'upcoming': return t.status !== 'Done' && dayjs(t.dueDate).isAfter(endOfWeek)
        case 'done': return t.status === 'Done'
        default: return true
      }
    })
    .sort((a, b) => {
      // Overdue first, then by due date
      if (tab === 'all') {
        const aOverdue = a.status !== 'Done' && dayjs(a.dueDate).isBefore(now)
        const bOverdue = b.status !== 'Done' && dayjs(b.dueDate).isBefore(now)
        if (aOverdue && !bOverdue) return -1
        if (!aOverdue && bOverdue) return 1
      }
      return a.dueDate.localeCompare(b.dueDate)
    })

  const overdueCount = tasks.filter(t => t.status !== 'Done' && dayjs(t.dueDate).isBefore(now)).length
  const pendingCount = tasks.filter(t => t.status !== 'Done').length
  const thisWeekCount = tasks.filter(t =>
    t.status !== 'Done' && !dayjs(t.dueDate).isBefore(now) && !dayjs(t.dueDate).isAfter(endOfWeek)
  ).length

  const closeModal = () => {
    setShowModal(false)
    setTitle(''); setDueDate(''); setSubjectId(''); setDescription('')
    setPriority('Medium'); setType('Assignment')
  }

  const handleAdd = async () => {
    if (!title.trim() || !dueDate || !activeSemesterId) return
    setSaving(true)
    await addTask({
      semesterId: activeSemesterId,
      subjectId: subjectId || undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      dueDate: new Date(dueDate).toISOString(),
      priority,
      status: 'Pending',
      subTasks: [],
      attachmentUrls: [],
      isRecurring: false,
    })
    setSaving(false)
    closeModal()
  }

  const TABS: { key: FilterTab; label: string; icon: typeof ClipboardList; count?: number }[] = [
    { key: 'all', label: 'All', icon: ClipboardList, count: pendingCount },
    { key: 'overdue', label: 'Overdue', icon: AlertTriangle, count: overdueCount },
    { key: 'thisWeek', label: 'This Week', icon: Calendar, count: thisWeekCount },
    { key: 'upcoming', label: 'Upcoming', icon: Clock },
    { key: 'done', label: 'Done', icon: CheckCircle2 },
  ]

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text text-xl font-bold">Assignments</h1>
          <p className="text-text/30 text-xs mt-0.5">
            {pendingCount > 0 ? `${pendingCount} pending` : 'All caught up!'}{' '}
            {overdueCount > 0 && <span className="text-[#FF4757]">· {overdueCount} overdue</span>}
          </p>
        </div>
        {overdueCount > 0 && (
          <Badge variant="danger" size="sm">
            <AlertTriangle size={10} className="mr-1" />{overdueCount} overdue
          </Badge>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === t.key
                ? t.key === 'overdue' && overdueCount
                  ? 'bg-[#FF4757] text-text'
                  : 'bg-[#6C63FF] text-text'
                : 'bg-white/[0.06] text-text/50 hover:text-text/80'
            }`}
          >
            <t.icon size={12} />
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                tab === t.key ? 'bg-white/20' : 'bg-white/10'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Subject filter chips */}
      {subjects.length > 0 && (
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

      {/* Task list */}
      {filtered.length === 0 ? (
        <EmptyState
          title={tab === 'all' ? 'No assignments yet' : tab === 'overdue' ? "You're all caught up!" : tab === 'done' ? 'No completed assignments' : 'Nothing here'}
          description={tab === 'all' ? 'Tap + to add your first assignment or deadline.' : tab === 'overdue' ? 'No overdue tasks. Keep it up 🔥' : 'Check back later.'}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              subject={subjects.find(s => s.id === task.subjectId)}
              onComplete={completeTask}
            />
          ))}
        </div>
      )}

      <FAB onClick={() => setShowModal(true)} label="Add Assignment" />

      <Modal open={showModal} onClose={closeModal} title="Add Assignment">
        <div className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. DBMS Assignment 2"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              value={type}
              onChange={e => setType(e.target.value as TaskType)}
              options={[
                { value: 'Assignment', label: '📝 Assignment' },
                { value: 'LabRecord', label: '🔬 Lab Record' },
                { value: 'Project', label: '🛠️ Project' },
                { value: 'Presentation', label: '📊 Presentation' },
                { value: 'Viva', label: '🎤 Viva' },
                { value: 'Other', label: '📌 Other' },
              ]}
            />
            <Select
              label="Priority"
              value={priority}
              onChange={e => setPriority(e.target.value as TaskPriority)}
              options={[
                { value: 'Low', label: 'Low' },
                { value: 'Medium', label: 'Medium' },
                { value: 'High', label: 'High' },
                { value: 'Critical', label: '🔴 Critical' },
              ]}
            />
          </div>
          <Select
            label="Subject (optional)"
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            placeholder="— None —"
            options={subjects.map(s => ({ value: s.id, label: `${s.code} · ${s.name}` }))}
          />
          <Input
            label="Due Date & Time"
            type="datetime-local"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text/70">Description (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Details, requirements, links..."
              rows={3}
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
            disabled={!title.trim() || !dueDate}
          >
            Add Assignment
          </Button>
        </div>
      </Modal>
    </div>
  )
}
