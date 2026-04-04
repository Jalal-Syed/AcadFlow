/**
 * Tasks — Assignment, Deadline & Project Manager
 * Spec §6.5
 */

import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
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
import type { TaskType, TaskPriority } from '@/types'

type FilterTab = 'all' | 'overdue' | 'today' | 'upcoming' | 'done'

const EMPTY_MESSAGES: Record<FilterTab, { title: string; desc: string }> = {
  all:      { title: 'No tasks yet', desc: 'Tap + to add your first assignment or deadline.' },
  overdue:  { title: "You're all caught up!", desc: 'No overdue tasks. Keep it up 🔥' },
  today:    { title: 'Nothing due today', desc: 'Enjoy the breathing room.' },
  upcoming: { title: 'Clear horizon', desc: 'No upcoming tasks. Add one to stay ahead.' },
  done:     { title: 'No completed tasks', desc: 'Complete tasks to see them here.' },
}

export default function TasksPage() {
  const { activeSemesterId } = useSemesterStore()
  const { tasks, isLoaded, loadTasks, addTask, completeTask } = useTaskStore()
  const { subjects } = useSubjects()
  const [tab, setTab]         = useState<FilterTab>('all')
  const [showModal, setShowModal] = useState(false)

  // Add-task form state
  const [title,      setTitle]     = useState('')
  const [type,       setType]      = useState<TaskType>('Assignment')
  const [priority,   setPriority]  = useState<TaskPriority>('Medium')
  const [dueDate,    setDueDate]   = useState('')
  const [subjectId,  setSubjectId] = useState('')
  const [saving,     setSaving]    = useState(false)

  useEffect(() => {
    if (activeSemesterId && !isLoaded) loadTasks(activeSemesterId)
  }, [activeSemesterId, isLoaded, loadTasks])

  const now   = new Date().toISOString()
  const today = dayjs().format('YYYY-MM-DD')

  const filtered = tasks.filter(t => {
    switch (tab) {
      case 'overdue':  return t.status !== 'Done' && t.dueDate < now
      case 'today':    return t.status !== 'Done' && dayjs(t.dueDate).format('YYYY-MM-DD') === today
      case 'upcoming': return t.status !== 'Done' && t.dueDate >= now && dayjs(t.dueDate).format('YYYY-MM-DD') !== today
      case 'done':     return t.status === 'Done'
      default:         return true
    }
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const overdueCount = tasks.filter(t => t.status !== 'Done' && t.dueDate < now).length

  const closeModal = () => {
    setShowModal(false)
    setTitle(''); setDueDate(''); setSubjectId('')
    setPriority('Medium'); setType('Assignment')
  }

  const handleAdd = async () => {
    if (!title.trim() || !dueDate || !activeSemesterId) return
    setSaving(true)
    await addTask({
      semesterId:       activeSemesterId,
      subjectId:        subjectId || undefined,
      title:            title.trim(),
      type,
      dueDate:          new Date(dueDate).toISOString(),
      priority,
      status:           'Pending',
      subTasks:         [],
      attachmentUrls:   [],
      isRecurring:      false,
    })
    setSaving(false)
    closeModal()
  }

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'overdue',  label: overdueCount ? `Overdue (${overdueCount})` : 'Overdue' },
    { key: 'today',    label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'done',     label: 'Done' },
  ]

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-text text-xl font-bold">Tasks</h1>
        {tasks.length > 0 && (
          <span className="text-text/30 text-xs">
            {tasks.filter(t => t.status !== 'Done').length} pending
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              tab === t.key
                ? t.key === 'overdue' && overdueCount
                  ? 'bg-[#FF4757] text-text'
                  : 'bg-[#6C63FF] text-text'
                : 'bg-white/[0.06] text-text/50 hover:text-text/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <EmptyState
          title={EMPTY_MESSAGES[tab].title}
          description={EMPTY_MESSAGES[tab].desc}
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

      <FAB onClick={() => setShowModal(true)} label="Add Task" />

      <Modal open={showModal} onClose={closeModal} title="Add Task">
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
                { value: 'Assignment',   label: '📝 Assignment' },
                { value: 'LabRecord',    label: '🔬 Lab Record' },
                { value: 'Project',      label: '🛠️ Project' },
                { value: 'Presentation', label: '📊 Presentation' },
                { value: 'Viva',         label: '🎤 Viva' },
                { value: 'Other',        label: '📌 Other' },
              ]}
            />
            <Select
              label="Priority"
              value={priority}
              onChange={e => setPriority(e.target.value as TaskPriority)}
              options={[
                { value: 'Low',      label: 'Low' },
                { value: 'Medium',   label: 'Medium' },
                { value: 'High',     label: 'High' },
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
          <Button
            fullWidth
            onClick={handleAdd}
            loading={saving}
            disabled={!title.trim() || !dueDate}
          >
            Add Task
          </Button>
        </div>
      </Modal>
    </div>
  )
}
