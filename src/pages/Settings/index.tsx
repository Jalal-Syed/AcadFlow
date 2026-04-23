/**
 * Settings — Full settings page
 * Profile, university, grading, appearance, data management.
 * Spec §6.1 + §6.13
 */

import { useState } from 'react'
import { useProfileStore } from '@/stores/useProfileStore'
import { useSemesterStore } from '@/stores/useSemesterStore'
import { useUIStore } from '@/stores/useUIStore'
import { GRADING_SCALES } from '@/constants/grading'
import { db } from '@/db/schema'
import { cgpaToPercentage } from '@/lib/calculations'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

import type { UniversityId, DegreeType } from '@/types'
import { useNavigate } from 'react-router-dom'
import {
  User, GraduationCap, Info,
  Sun, Moon, Download, Upload, Trash2,
  ChevronRight, BookOpen, Calendar, ClipboardList,
  Clock, FileText, AlignLeft, StickyNote, CalendarDays,
  Beaker, Hash, Layers, Link2,
  Cloud, LogIn, LogOut, UserCircle2, RefreshCw, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { useSyncStore } from '@/stores/useSyncStore'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)
import { usePortalStore } from '@/stores/usePortalStore'
import { useAuthStore } from '@/stores/useAuthStore'

const UNIVERSITY_OPTIONS = [
  { value: 'JNTUH',    label: 'JNTUH (R-25)' },
  { value: 'VTU',      label: 'VTU' },
  { value: 'AnnaUniv', label: 'Anna University' },
  { value: 'JNTUA',    label: 'JNTUA' },
  { value: 'RTU',      label: 'RTU' },
  { value: 'GTU',      label: 'GTU' },
  { value: 'RGPV',     label: 'RGPV' },
  { value: 'Custom',   label: 'Other / Custom' },
]

const DEGREE_OPTIONS = [
  { value: 'BTech',      label: 'B.Tech' },
  { value: 'Diploma',    label: 'Diploma' },
  { value: 'MTech',      label: 'M.Tech' },
  { value: 'Integrated', label: 'Integrated B.Tech+M.Tech' },
]

// Quick links — pages accessible from settings / "More" tab on mobile
const QUICK_LINKS = [
  { to: '/timetable',   icon: Clock,         label: 'Timetable' },
  { to: '/exams',       icon: FileText,      label: 'Exams' },
  { to: '/syllabus',    icon: AlignLeft,     label: 'Syllabus' },
  { to: '/notes',       icon: StickyNote,    label: 'Notes' },
  { to: '/assignments', icon: ClipboardList, label: 'Assignments' },
  { to: '/calendar',    icon: CalendarDays,  label: 'Calendar' },
  { to: '/subjects',    icon: BookOpen,      label: 'Subjects' },
  { to: '/semesters',   icon: Layers,        label: 'Semesters' },
  { to: '/labs',        icon: Beaker,        label: 'Labs' },
  { to: '/ncs',         icon: Hash,          label: 'No Credit' },
  { to: '/import',      icon: Link2,         label: 'Portal Sync' },
]

interface SettingRowProps {
  icon: typeof User
  iconBg: string
  label: string
  value?: string
  onClick?: () => void
}

function SettingRow({ icon: Icon, iconBg, label, value, onClick }: SettingRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-all text-left"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${iconBg}18`, border: `1px solid ${iconBg}30` }}
      >
        <Icon size={16} style={{ color: iconBg }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text/80 text-xs font-medium">{label}</p>
        {value && <p className="text-text/30 text-[10px] truncate">{value}</p>}
      </div>
      {onClick && <ChevronRight size={14} className="text-text/15 shrink-0" />}
    </button>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { profile, updateProfile, gradingScale, setGradingScale, clearProfile } = useProfileStore()
  const { configuredProviders } = usePortalStore()
  const portalConnected = configuredProviders.length > 0
  const { semesters, activeSemesterId } = useSemesterStore()
  const { theme, setTheme } = useUIStore()
  const { user, status: authStatus, signOut } = useAuthStore()
  const { lastSyncAt, syncStatus, lastError, lastSyncedRecordCount, sync } = useSyncStore()

  const [showProfile, setShowProfile] = useState(false)
  const [showGrading, setShowGrading] = useState(false)
  const [showClear, setShowClear] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try { await signOut() } finally { setSigningOut(false) }
  }

  // Profile form state
  const [pName, setPName] = useState(profile?.name ?? '')
  const [pCollege, setPCollege] = useState(profile?.college ?? '')
  const [pRollNo, setPRollNo] = useState(profile?.rollNo ?? '')
  const [pBranch, setPBranch] = useState(profile?.branch ?? '')
  const [pDegree, setPDegree] = useState<DegreeType>(profile?.degree ?? 'BTech')
  const [pUnivId, setPUnivId] = useState<UniversityId>(profile?.universityId ?? 'JNTUH')
  const [pThreshold, setPThreshold] = useState(profile?.attendanceThreshold ?? 75)

  const activeSem = semesters.find(s => s.id === activeSemesterId)

  const handleSaveProfile = () => {
    updateProfile({
      name: pName.trim(),
      college: pCollege.trim(),
      rollNo: pRollNo.trim(),
      branch: pBranch.trim(),
      degree: pDegree,
      universityId: pUnivId,
      attendanceThreshold: pThreshold,
    })

    // Also update grading scale if university changed
    const scale = Object.values(GRADING_SCALES).find(s => s.universityId === pUnivId)
    if (scale) setGradingScale(scale)

    setShowProfile(false)
  }

  const handleExport = async () => {
    const data = {
      profile: await db.profile.toArray(),
      semesters: await db.semesters.toArray(),
      subjects: await db.subjects.toArray(),
      attendanceRecords: await db.attendanceRecords.toArray(),
      theoryMarks: await db.theoryMarks.toArray(),
      labMarks: await db.labMarks.toArray(),
      tasks: await db.tasks.toArray(),
      exams: await db.exams.toArray(),
      timetableSlots: await db.timetableSlots.toArray(),
      timetableOverrides: await db.timetableOverrides.toArray(),
      syllabusUnits: await db.syllabusUnits.toArray(),
      notes: await db.notes.toArray(),
      holidays: await db.holidays.toArray(),
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `acadflow-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        // Clear existing data first
        await db.transaction('rw', db.tables, async () => {
          for (const table of db.tables) {
            await table.clear()
          }
          // Import each table
          for (const [name, rows] of Object.entries(data)) {
            if (name === 'exportedAt') continue
            const table = db.table(name)
            if (table && Array.isArray(rows)) {
              await table.bulkAdd(rows as object[])
            }
          }
        })
        window.location.reload()
      } catch {
        alert('Failed to import data. Please check the file.')
      }
    }
    input.click()
  }

  const handleClearAll = async () => {
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear()
      }
    })
    clearProfile()
    setShowClear(false)
    window.location.reload()
  }

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-6">
      <h1 className="text-text text-xl font-bold">Settings</h1>

      {/* Quick Links — Mobile navigation */}
      <section className="space-y-1 lg:hidden">
        <p className="text-text/30 text-[10px] uppercase tracking-wider pl-1 mb-2">Pages</p>
        <div className="grid grid-cols-5 gap-2">
          {QUICK_LINKS.map(l => (
            <button
              key={l.to}
              onClick={() => navigate(l.to)}
              className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-white/[0.04] transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-border/[0.08] flex items-center justify-center">
                <l.icon size={16} className="text-text/50" />
              </div>
              <span className="text-[9px] text-text/40 font-medium leading-tight text-center">{l.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Profile section */}
      <section className="space-y-1 border border-border/[0.06] rounded-2xl bg-white/[0.02] p-3">
        <p className="text-text/30 text-[10px] uppercase tracking-wider pl-1 mb-2">Profile</p>
        <SettingRow
          icon={User}
          iconBg="#6C63FF"
          label="Name & College"
          value={profile ? `${profile.name} · ${profile.college}` : 'Not set'}
          onClick={() => setShowProfile(true)}
        />
        <SettingRow
          icon={GraduationCap}
          iconBg="#00F5D4"
          label="University & Degree"
          value={profile ? `${profile.universityId} · ${profile.degree} · ${profile.branch}` : 'Not set'}
          onClick={() => setShowProfile(true)}
        />
        <SettingRow
          icon={Calendar}
          iconBg="#FFA502"
          label="Active Semester"
          value={activeSem ? `Sem ${activeSem.number} · ${activeSem.academicYear}` : 'None'}
          onClick={() => navigate('/semesters')}
        />
      </section>

      {/* Grading section */}
      <section className="space-y-1 border border-border/[0.06] rounded-2xl bg-white/[0.02] p-3">
        <p className="text-text/30 text-[10px] uppercase tracking-wider pl-1 mb-2">Grading</p>
        <SettingRow
          icon={BookOpen}
          iconBg="#2ED573"
          label="Grading Scale"
          value={`${gradingScale.name} · Pass ≥ ${gradingScale.overallPassMin}%`}
          onClick={() => setShowGrading(true)}
        />
        <div className="px-3 py-2">
          <div className="grid grid-cols-4 gap-1.5">
            {gradingScale.grades.map(g => (
              <div key={g.grade} className="text-center bg-white/[0.03] border border-border/[0.06] rounded-lg py-1.5">
                <p className="text-text/80 text-xs font-bold">{g.grade}</p>
                <p className="text-text/25 text-[9px]">≥{g.minMarks}% · {g.gradePoint}GP</p>
              </div>
            ))}
          </div>
        </div>
        <SettingRow
          icon={Info}
          iconBg="#6C63FF"
          label="CGPA → Percentage"
          value={gradingScale.cgpaToPercentFormula === 'jntuh'
            ? `(CGPA − 0.5) × 10 = ${profile ? cgpaToPercentage(7.5) : '--'}%`
            : 'CGPA × 10'}
        />
      </section>

      {/* Appearance section */}
      <section className="space-y-1 border border-border/[0.06] rounded-2xl bg-white/[0.02] p-3">
        <p className="text-text/30 text-[10px] uppercase tracking-wider pl-1 mb-2">Appearance</p>
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="w-9 h-9 rounded-xl bg-[rgba(108,99,255,0.1)] border border-[#6C63FF]/30 flex items-center justify-center">
            {theme === 'dark' ? <Moon size={16} className="text-[#6C63FF]" /> : <Sun size={16} className="text-[#FFA502]" />}
          </div>
          <div className="flex-1">
            <p className="text-text/80 text-xs font-medium">Theme</p>
          </div>
          <div className="flex bg-white/[0.06] rounded-lg p-0.5">
            <button
              onClick={() => setTheme('dark')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                theme === 'dark' ? 'bg-[#6C63FF] text-text' : 'text-text/40 hover:text-text/60'
              }`}
            >
              <Moon size={12} className="inline mr-1" />Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                theme === 'light' ? 'bg-[#FFA502] text-text' : 'text-text/40 hover:text-text/60'
              }`}
            >
              <Sun size={12} className="inline mr-1" />Light
            </button>
          </div>
        </div>
      </section>

      {/* Cloud Sync section */}
      <section className="space-y-1 border border-border/[0.06] rounded-2xl bg-white/[0.02] p-3">
        <p className="text-text/30 text-[10px] uppercase tracking-wider pl-1 mb-2">Cloud Sync</p>

        {authStatus === 'authenticated' && user ? (
          // Signed in — show account info + sync controls
          <>
            <div className="flex items-center gap-3 px-3 py-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(46,213,115,0.12)', border: '1px solid rgba(46,213,115,0.25)' }}
              >
                <UserCircle2 size={16} style={{ color: '#2ED573' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text/80 text-xs font-medium">Signed in</p>
                <p className="text-text/30 text-[10px] truncate">{user.email}</p>
              </div>
            </div>

            {/* Sync status row */}
            <div className="flex items-center gap-3 px-3 py-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)' }}
              >
                {syncStatus === 'syncing' ? (
                  <RefreshCw size={15} className="text-[#6C63FF] animate-spin" />
                ) : syncStatus === 'error' ? (
                  <AlertCircle size={15} className="text-[#FF4757]" />
                ) : syncStatus === 'success' ? (
                  <CheckCircle2 size={15} className="text-[#2ED573]" />
                ) : (
                  <Cloud size={15} className="text-[#6C63FF]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text/80 text-xs font-medium">
                  {syncStatus === 'syncing' ? 'Syncing…' :
                   syncStatus === 'error' ? 'Sync failed' :
                   lastSyncAt ? `Synced ${dayjs(lastSyncAt).fromNow()}` : 'Not synced yet'}
                </p>
                <p className="text-text/30 text-[10px] truncate">
                  {syncStatus === 'error' && lastError
                    ? lastError
                    : lastSyncAt && lastSyncedRecordCount > 0
                    ? `${lastSyncedRecordCount} records · auto-syncs on app start`
                    : 'Auto-syncs on app start'}
                </p>
              </div>
              <button
                onClick={sync}
                disabled={syncStatus === 'syncing'}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#6C63FF]/15 text-[#6C63FF] border border-[#6C63FF]/25 hover:bg-[#6C63FF]/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {syncStatus === 'syncing' ? 'Syncing…' : 'Sync Now'}
              </button>
            </div>

            <div className="px-3 pb-1">
              <Button
                variant="ghost"
                size="sm"
                loading={signingOut}
                onClick={handleSignOut}
                className="w-full justify-start gap-2 text-[#FF4757] hover:text-[#FF4757]"
              >
                <LogOut size={14} />
                Sign out
              </Button>
            </div>
          </>
        ) : (
          // Signed out
          <>
            <div className="px-3 py-2 space-y-1">
              <p className="text-text/50 text-xs">
                Sign in to sync your data across devices when cloud sync launches in v1.2.
              </p>
            </div>
            <div className="px-3 pb-1">
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => navigate('/login')}
                className="justify-start gap-2"
              >
                <LogIn size={14} />
                Sign in with Google or Email
              </Button>
            </div>
          </>
        )}
      </section>

      {/* Data management */}
      <section className="space-y-1 border border-border/[0.06] rounded-2xl bg-white/[0.02] p-3">
        <p className="text-text/30 text-[10px] uppercase tracking-wider pl-1 mb-2">Data</p>
        <SettingRow
          icon={Link2}
          iconBg="#6C63FF"
          label="Portal Sync"
          value={portalConnected ? `Connected · ${configuredProviders.length} provider${configuredProviders.length > 1 ? 's' : ''}` : 'Auto-import attendance & marks'}
          onClick={() => navigate('/import')}
        />
        <SettingRow icon={Download} iconBg="#2ED573" label="Export All Data" value="Download JSON backup" onClick={handleExport} />
        <SettingRow icon={Upload} iconBg="#FFA502" label="Import Data" value="Restore from backup" onClick={handleImport} />
        <SettingRow icon={Trash2} iconBg="#FF4757" label="Clear All Data" value="Permanently delete everything" onClick={() => setShowClear(true)} />
      </section>

      {/* About */}
      <section className="space-y-1 border border-border/[0.06] rounded-2xl bg-white/[0.02] p-3">
        <p className="text-text/30 text-[10px] uppercase tracking-wider pl-1 mb-2">About</p>
        <div className="px-3 py-2 space-y-1">
          <p className="text-text/60 text-xs">AcadFlow <span className="text-text/25">v0.1.0</span></p>
          <p className="text-text/25 text-[10px]">The Academic OS for Indian Engineering Students</p>
          <p className="text-text/20 text-[10px]">Regulation: JNTUH B.Tech R-25 (AY 2025-26)</p>
          <p className="text-text/15 text-[10px]">All data stored locally on your device.</p>
        </div>
      </section>

      {/* Edit Profile Modal */}
      <Modal open={showProfile} onClose={() => setShowProfile(false)} title="Edit Profile" size="lg">
        <div className="space-y-4">
          <Input label="Name" value={pName} onChange={e => setPName(e.target.value)} />
          <Input label="College" value={pCollege} onChange={e => setPCollege(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Roll No" value={pRollNo} onChange={e => setPRollNo(e.target.value)} />
            <Input label="Branch" value={pBranch} onChange={e => setPBranch(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="University"
              value={pUnivId}
              onChange={e => setPUnivId(e.target.value as UniversityId)}
              options={UNIVERSITY_OPTIONS}
            />
            <Select
              label="Degree"
              value={pDegree}
              onChange={e => setPDegree(e.target.value as DegreeType)}
              options={DEGREE_OPTIONS}
            />
          </div>
          <Input
            label="Attendance Threshold (%)"
            type="number"
            min={50}
            max={100}
            value={pThreshold}
            onChange={e => setPThreshold(Number(e.target.value))}
          />
          <Button fullWidth onClick={handleSaveProfile}>Save Changes</Button>
        </div>
      </Modal>

      {/* Grading Scale Modal */}
      <Modal open={showGrading} onClose={() => setShowGrading(false)} title="Grading Scale">
        <div className="space-y-4">
          <Select
            label="University Preset"
            value={gradingScale.id}
            onChange={e => {
              const scale = GRADING_SCALES[e.target.value]
              if (scale) {
                setGradingScale(scale)
                updateProfile({ gradingScaleId: scale.id, universityId: scale.universityId })
              }
            }}
            options={Object.values(GRADING_SCALES).map(s => ({ value: s.id, label: s.name }))}
          />
          <div className="space-y-1.5">
            <p className="text-xs text-text/50 font-medium">Grade Table</p>
            <div className="rounded-xl border border-border/[0.06] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white/[0.03]">
                    <th className="text-left text-text/30 px-3 py-2 font-medium">Grade</th>
                    <th className="text-center text-text/30 px-3 py-2 font-medium">Min Marks</th>
                    <th className="text-center text-text/30 px-3 py-2 font-medium">GP</th>
                  </tr>
                </thead>
                <tbody>
                  {gradingScale.grades.map(g => (
                    <tr key={g.grade} className="border-t border-border/[0.04]">
                      <td className="px-3 py-2 text-text/80 font-semibold">{g.grade}</td>
                      <td className="px-3 py-2 text-text/50 text-center">{g.minMarks}%</td>
                      <td className="px-3 py-2 text-text/50 text-center">{g.gradePoint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-text/50 font-medium">Pass Conditions</p>
            <div className="bg-white/[0.03] border border-border/[0.06] rounded-xl px-3 py-2 space-y-1">
              <p className="text-text/60 text-xs">SEE minimum: <span className="text-text font-mono">{gradingScale.seePassMin}/60</span></p>
              <p className="text-text/60 text-xs">Overall minimum: <span className="text-text font-mono">{gradingScale.overallPassMin}/100</span></p>
            </div>
          </div>
          <Button fullWidth variant="secondary" onClick={() => setShowGrading(false)}>Done</Button>
        </div>
      </Modal>

      {/* Clear Data Confirmation */}
      <Modal open={showClear} onClose={() => setShowClear(false)} title="Clear All Data">
        <div className="space-y-4">
          <div className="bg-[rgba(255,71,87,0.08)] border border-[#FF4757]/30 rounded-xl px-4 py-3 space-y-2">
            <p className="text-[#FF4757] text-sm font-semibold">⚠️ This action is irreversible</p>
            <p className="text-text/50 text-xs leading-relaxed">
              All your profile data, attendance records, marks, tasks, timetable, and settings will be permanently deleted.
              Consider exporting a backup first.
            </p>
          </div>
          <div className="flex gap-3">
            <Button fullWidth variant="secondary" onClick={() => setShowClear(false)}>Cancel</Button>
            <Button fullWidth variant="danger" onClick={handleClearAll}>
              <Trash2 size={14} className="mr-1" />Delete Everything
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
