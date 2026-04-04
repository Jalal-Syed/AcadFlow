/**
 * notifications.ts
 * Capacitor local notification scheduling for AcadFlow.
 *
 * Three categories of notifications:
 *   1. Attendance reminders  — daily at class-start time
 *   2. Exam countdowns       — 7d / 3d / 1d / morning-of before each exam
 *   3. Task deadlines        — 24h and 1h before due date
 *
 * On web/PWA, Capacitor gracefully no-ops — no error thrown.
 * Call `requestPermission()` once during onboarding (Done step).
 */

import { LocalNotifications } from '@capacitor/local-notifications'

// ─── Permission ──────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted'
  } catch {
    return false   // web / unsupported platform
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  try {
    const { display } = await LocalNotifications.checkPermissions()
    return display === 'granted'
  } catch {
    return false
  }
}

// ─── ID helpers ──────────────────────────────────────────────────────────────
// Notification IDs must be integers. We derive them from a hash of a string key
// so we can cancel a specific notification without storing the ID externally.

function hashId(key: string): number {
  let h = 5381
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h) ^ key.charCodeAt(i)
  }
  return Math.abs(h) % 2_000_000_000  // stay within 32-bit safe range
}

// ─── Exam countdown notifications ────────────────────────────────────────────

interface ExamNotifOptions {
  examId: string
  examName: string
  subjectName: string
  examDate: Date   // exact date/time of the exam
}

const EXAM_LEAD_TIMES: { days: number; label: string }[] = [
  { days: 7, label: '7 days away'  },
  { days: 3, label: '3 days away'  },
  { days: 1, label: 'Tomorrow!'    },
  { days: 0, label: 'Today — good luck! 🦉' },
]

export async function scheduleExamNotifications(opts: ExamNotifOptions): Promise<void> {
  try {
    const notifications = EXAM_LEAD_TIMES.flatMap(({ days, label }) => {
      const fireAt = new Date(opts.examDate)
      fireAt.setDate(fireAt.getDate() - days)
      fireAt.setHours(8, 0, 0, 0)   // 8 AM on the reminder day

      if (fireAt <= new Date()) return []   // already past

      return [{
        id:    hashId(`exam-${opts.examId}-${days}d`),
        title: `📚 ${opts.subjectName} exam — ${label}`,
        body:  `${opts.examName} on ${opts.examDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`,
        schedule: { at: fireAt },
        channelId: 'exams',
        extra: { examId: opts.examId, type: 'exam' },
      }]
    })

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications })
    }
  } catch {
    // silent on web
  }
}

export async function cancelExamNotifications(examId: string): Promise<void> {
  try {
    await LocalNotifications.cancel({
      notifications: EXAM_LEAD_TIMES.map(({ days }) => ({
        id: hashId(`exam-${examId}-${days}d`),
      })),
    })
  } catch { /* silent */ }
}

// ─── Task deadline notifications ─────────────────────────────────────────────

interface TaskNotifOptions {
  taskId: string
  taskTitle: string
  dueDate: Date
}

export async function scheduleTaskNotifications(opts: TaskNotifOptions): Promise<void> {
  try {
    const notifications = []

    // 24h before
    const t24 = new Date(opts.dueDate.getTime() - 24 * 60 * 60 * 1000)
    if (t24 > new Date()) {
      notifications.push({
        id:    hashId(`task-${opts.taskId}-24h`),
        title: `⏰ Due tomorrow`,
        body:  opts.taskTitle,
        schedule: { at: t24 },
        channelId: 'tasks',
        extra: { taskId: opts.taskId, type: 'task' },
      })
    }

    // 1h before
    const t1 = new Date(opts.dueDate.getTime() - 60 * 60 * 1000)
    if (t1 > new Date()) {
      notifications.push({
        id:    hashId(`task-${opts.taskId}-1h`),
        title: `🔔 Due in 1 hour`,
        body:  opts.taskTitle,
        schedule: { at: t1 },
        channelId: 'tasks',
        extra: { taskId: opts.taskId, type: 'task' },
      })
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications })
    }
  } catch { /* silent */ }
}

export async function cancelTaskNotifications(taskId: string): Promise<void> {
  try {
    await LocalNotifications.cancel({
      notifications: [
        { id: hashId(`task-${taskId}-24h`) },
        { id: hashId(`task-${taskId}-1h`) },
      ],
    })
  } catch { /* silent */ }
}

// ─── Attendance reminder ──────────────────────────────────────────────────────

interface AttendanceReminderOptions {
  semesterId: string
  /** ISO time string "HH:MM" of first class */
  firstClassTime: string
  /** Days of week to fire: 1=Mon … 6=Sat */
  weekdays: number[]
}

export async function scheduleAttendanceReminder(opts: AttendanceReminderOptions): Promise<void> {
  try {
    const [hh, mm] = opts.firstClassTime.split(':').map(Number)

    // Schedule for the next 90 days
    const notifications = []
    const now = new Date()

    for (let i = 1; i <= 90; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() + i)
      d.setHours(hh - 0, mm - 10, 0, 0)   // 10 min before first class

      if (!opts.weekdays.includes(d.getDay())) continue
      if (d <= now) continue

      notifications.push({
        id:    hashId(`attendance-${opts.semesterId}-${d.toDateString()}`),
        title: '📋 Mark attendance',
        body:  "Don't forget to log today's classes in AcadFlow.",
        schedule: { at: d },
        channelId: 'attendance',
        extra: { semesterId: opts.semesterId, type: 'attendance' },
      })
    }

    // LocalNotifications.schedule accepts max 64 at once on some platforms
    for (let i = 0; i < notifications.length; i += 60) {
      await LocalNotifications.schedule({ notifications: notifications.slice(i, i + 60) })
    }
  } catch { /* silent */ }
}

// ─── Channel setup (call once on app init on Android) ────────────────────────

export async function createNotificationChannels(): Promise<void> {
  try {
    await LocalNotifications.createChannel({
      id:          'exams',
      name:        'Exam Reminders',
      description: 'Countdown notifications before exams',
      importance:  4,   // HIGH
      sound:       'default',
      vibration:   true,
    })
    await LocalNotifications.createChannel({
      id:          'tasks',
      name:        'Task Deadlines',
      description: 'Reminders for assignment and project deadlines',
      importance:  4,
      sound:       'default',
      vibration:   true,
    })
    await LocalNotifications.createChannel({
      id:          'attendance',
      name:        'Attendance Reminders',
      description: 'Daily prompts to log attendance',
      importance:  3,   // DEFAULT
      sound:       'default',
      vibration:   false,
    })
  } catch { /* silent on web */ }
}
