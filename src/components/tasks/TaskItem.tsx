/**
 * TaskItem.tsx
 * Single task row — shows priority indicator, title, subject, due date,
 * and a complete toggle button.
 */

import { clsx } from 'clsx'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { Task, Subject } from '@/types'

dayjs.extend(relativeTime)

interface TaskItemProps {
  task: Task
  subject?: Subject
  onComplete: (id: string) => void
  onDelete?: (id: string) => void
  onClick?: () => void
}

const PRIORITY_COLOR: Record<string, string> = {
  Low:      '#ffffff30',
  Medium:   '#FFA502',
  High:     '#FF6B9D',
  Critical: '#FF4757',
}

const PRIORITY_BADGE: Record<string, any> = {
  Low:      'default',
  Medium:   'warning',
  High:     'danger',
  Critical: 'danger',
}

const TYPE_EMOJI: Record<string, string> = {
  Assignment:   '📝',
  LabRecord:    '🔬',
  Project:      '🛠️',
  Presentation: '📊',
  Viva:         '🎤',
  Other:        '📌',
}

export default function TaskItem({
  task,
  subject,
  onComplete,
  onClick,
}: TaskItemProps) {
  const isDone    = task.status === 'Done'
  const isOverdue = task.status === 'Overdue'
  const dueDate   = dayjs(task.dueDate)
  const isToday   = dueDate.isSame(dayjs(), 'day')

  return (
    <div
      onClick={onClick}
      className={clsx(
        'flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-150',
        'bg-card/60',
        isDone ? 'border-border/[0.04] opacity-50' : 'border-border/[0.07]',
        onClick && 'cursor-pointer hover:border-border/[0.12] active:scale-[0.99]'
      )}
    >
      {/* Complete toggle */}
      <button
        onClick={e => { e.stopPropagation(); onComplete(task.id) }}
        className={clsx(
          'mt-0.5 shrink-0 transition-colors',
          isDone ? 'text-[#2ED573]' : 'text-text/25 hover:text-[#6C63FF]'
        )}
      >
        {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>

      {/* Body */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start gap-2">
          <p className={clsx(
            'text-sm font-medium leading-snug flex-1',
            isDone ? 'line-through text-text/30' : 'text-text/90'
          )}>
            {TYPE_EMOJI[task.type]} {task.title}
          </p>
          {!isDone && <Badge variant={PRIORITY_BADGE[task.priority]} size="sm">{task.priority}</Badge>}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {subject && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
              backgroundColor: `${subject.color}20`,
              color: subject.color,
              border: `1px solid ${subject.color}40`,
            }}>
              {subject.code}
            </span>
          )}
          <span className={clsx(
            'text-[10px]',
            isOverdue ? 'text-[#FF4757] font-semibold'
              : isToday ? 'text-[#FFA502] font-semibold'
              : 'text-text/30'
          )}>
            {isOverdue && <AlertCircle size={10} className="inline mr-1" />}
            {isDone ? 'Done' : dueDate.fromNow()}
          </span>
        </div>

        {/* Subtasks progress */}
        {task.subTasks.length > 0 && !isDone && (
          <p className="text-[10px] text-text/25">
            {task.subTasks.filter(s => s.isDone).length}/{task.subTasks.length} subtasks
          </p>
        )}
      </div>

      {/* Priority colour bar */}
      <div
        className="w-0.5 self-stretch rounded-full shrink-0"
        style={{ backgroundColor: PRIORITY_COLOR[task.priority] }}
      />
    </div>
  )
}
