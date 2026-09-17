/**
 * pages/Import/index.tsx
 * Portal Sync — WebView + local table parser flow.
 *
 * How it works:
 *   1. User picks a portal (or enters a custom URL)
 *   2. User selects what to capture: Attendance / Marks / Subjects / Auto
 *   3. Tap "Open Portal" → portal opens in an in-app browser
 *   4. User logs in, navigates to the right page, taps the injected "📥 Capture" button
 *   5. The local DOM parser extracts the data → written to the cloud and cache
 *
 * No inference model or AI service is required.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  BookOpen,
  Loader2,
  Trash2,
  AlertTriangle,
  WifiOff,
  BarChart2,
  Users,
  Terminal,
} from 'lucide-react'
import { clsx } from 'clsx'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useNavigate } from 'react-router-dom'

import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

import { usePortalStore } from '@/stores/usePortalStore'
import { useSemesterStore } from '@/stores/useSemesterStore'
import { getAllPortals } from '@/lib/scraper/portals'
import { isWebViewSupported } from '@/lib/scraper/webview'
import type { CaptureType } from '@/lib/scraper/types'

dayjs.extend(relativeTime)

// Capture type picker options
const CAPTURE_TYPES: { id: CaptureType; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: 'auto',
    label: 'Auto-detect',
    icon: <Terminal size={14} />,
    desc: 'Parser detects the page type',
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: <CalendarCheck size={14} />,
    desc: 'Classes held & attended',
  },
  {
    id: 'marks',
    label: 'Marks / CIE',
    icon: <BarChart2 size={14} />,
    desc: 'Mid-terms, assignments, SEE',
  },
  { id: 'subjects', label: 'Subjects', icon: <Users size={14} />, desc: 'Course list & credits' },
]

// Platform warning for web/PWA
function PlatformWarning() {
  return (
    <div className="flex items-start gap-3 bg-[rgba(255,165,2,0.06)] border border-[#FFA502]/20 rounded-2xl px-4 py-3">
      <WifiOff size={14} className="text-[#FFA502] mt-0.5 shrink-0" />
      <div>
        <p className="text-[#FFA502] text-xs font-semibold">Desktop or Android only</p>
        <p className="text-text/40 text-[11px] mt-0.5 leading-relaxed">
          Portal Sync opens your college portal in an embedded browser on Electron and Android.
          Web/PWA capture is not available.
        </p>
      </div>
    </div>
  )
}

// Sync log row
function SyncLogRow({
  entry,
}: {
  entry: ReturnType<typeof usePortalStore.getState>['syncLog'][number]
}) {
  return (
    <div
      className={clsx(
        'flex items-start gap-3 px-3 py-2.5 rounded-xl border text-xs',
        entry.ok
          ? 'bg-[rgba(46,213,115,0.05)] border-[#2ED573]/20'
          : 'bg-[rgba(255,71,87,0.05)] border-[#FF4757]/20'
      )}
    >
      <div className="mt-0.5 shrink-0">
        {entry.ok ? (
          <CheckCircle2 size={14} className="text-[#2ED573]" />
        ) : (
          <XCircle size={14} className="text-[#FF4757]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        {entry.ok ? (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-text/60">
            {entry.subjectsSynced > 0 && (
              <span>
                <Users size={9} className="inline mr-0.5" />
                {entry.subjectsSynced} subjects
              </span>
            )}
            {entry.attendanceSynced > 0 && (
              <span>
                <CalendarCheck size={9} className="inline mr-0.5" />
                {entry.attendanceSynced} records
              </span>
            )}
            {entry.marksSynced > 0 && (
              <span>
                <BookOpen size={9} className="inline mr-0.5" />
                {entry.marksSynced} marks
              </span>
            )}
            {entry.subjectsSynced === 0 &&
              entry.attendanceSynced === 0 &&
              entry.marksSynced === 0 && (
                <span className="text-text/40">Nothing new to import</span>
              )}
          </div>
        ) : (
          <p className="text-[#FF4757]/80 truncate">{entry.error ?? 'Unknown error'}</p>
        )}
      </div>
      <div className="text-right shrink-0 ml-1 space-y-0.5">
        <p className="text-text/25 text-[10px]">{dayjs(entry.syncedAt).fromNow()}</p>
        {entry.captureType && entry.captureType !== 'auto' && (
          <p className="text-text/20 text-[10px] capitalize">{entry.captureType}</p>
        )}
      </div>
    </div>
  )
}

// Main component
export default function ImportPage() {
  const navigate = useNavigate()

  const {
    lastPortalUrl,
    syncLog,
    syncStatus,
    lastError,
    captureType,
    setLastPortalUrl,
    setCaptureType,
    setSyncStatus,
    clearLog,
    runCapture,
  } = usePortalStore()

  const activeSemesterId = useSemesterStore(s => s.activeSemesterId)
  const portals = getAllPortals()

  const [supported, setSupported] = useState(false)
  // Portal URL state
  const [selectedPortalId, setSelectedPortalId] = useState<string>(
    portals.find(p => p.baseUrl === lastPortalUrl)?.id ?? portals[0]?.id ?? 'custom'
  )
  const [customUrl, setCustomUrl] = useState(
    portals.find(p => p.id === selectedPortalId)?.id === 'custom' ? (lastPortalUrl ?? '') : ''
  )

  const selectedPortal = portals.find(p => p.id === selectedPortalId)
  const portalUrl =
    selectedPortalId === 'custom' ? customUrl.trim() : (selectedPortal?.baseUrl ?? '')

  // Platform + engine detection on mount
  useEffect(() => {
    ;(async () => {
      const sup = await isWebViewSupported()
      setSupported(sup)
    })()
  }, [])

  const isBusy = ['opening', 'waiting', 'extracting', 'saving'].includes(syncStatus)

  const handleCapture = async () => {
    if (!activeSemesterId) {
      setSyncStatus('error', 'No active semester. Create one in Semesters first.')
      return
    }
    if (!portalUrl) {
      setSyncStatus('error', 'Select or enter a portal URL.')
      return
    }
    setLastPortalUrl(portalUrl)
    await runCapture(portalUrl, captureType, activeSemesterId)
  }

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-text/40 hover:text-text/70 hover:bg-white/[0.05] transition-all"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-text text-xl font-bold leading-tight">Portal Sync</h1>
          <p className="text-text/35 text-[11px]">
            Log in to your portal, tap Capture — the local table parser does the rest
          </p>
        </div>
      </div>

      {/* Platform warning */}
      {!supported && <PlatformWarning />}

      {/* How it works blurb */}
      <div className="flex items-start gap-3 bg-[rgba(0,245,212,0.04)] border border-[#00F5D4]/15 rounded-2xl px-4 py-3">
        <Terminal size={14} className="text-[#00F5D4] mt-0.5 shrink-0" />
        <p className="text-[11px] text-text/50 leading-relaxed">
          <span className="text-text/75 font-semibold">No passwords stored. No cloud.</span> Your
          portal opens in a browser window — you log in yourself. Navigate to your attendance or
          marks page and tap the <span className="text-[#6C63FF] font-semibold">📥 Capture</span>{' '}
          button. Data is extracted entirely on your device.
        </p>
      </div>

      {/* Portal picker */}
      <section className="space-y-2">
        <p className="text-text/30 text-[10px] uppercase tracking-wider pl-1">Portal</p>
        <div className="space-y-2">
          {portals.map(portal => (
            <button
              key={portal.id}
              onClick={() => setSelectedPortalId(portal.id)}
              className={clsx(
                'w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl border transition-all text-left',
                selectedPortalId === portal.id
                  ? 'bg-[rgba(108,99,255,0.1)] border-[#6C63FF]/40'
                  : 'bg-white/[0.02] border-border/[0.06] hover:bg-white/[0.04]'
              )}
            >
              <div
                className={clsx(
                  'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                  selectedPortalId === portal.id
                    ? 'bg-[rgba(108,99,255,0.2)] border border-[#6C63FF]/40'
                    : 'bg-white/[0.05] border border-border/[0.08]'
                )}
              >
                <Globe
                  size={14}
                  className={selectedPortalId === portal.id ? 'text-[#6C63FF]' : 'text-text/40'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={clsx(
                    'text-sm font-semibold',
                    selectedPortalId === portal.id ? 'text-[#6C63FF]' : 'text-text/80'
                  )}
                >
                  {portal.name}
                </p>
                <p className="text-text/30 text-[11px] truncate">
                  {portal.id === 'custom' ? 'Enter your college portal URL' : portal.baseUrl}
                </p>
              </div>
              {selectedPortalId === portal.id && (
                <div className="w-2 h-2 rounded-full bg-[#6C63FF] mt-2.5 shrink-0" />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {selectedPortalId === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Input
                label="Portal URL"
                placeholder="https://portal.mycollege.edu"
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                hint="Enter the URL of your college student portal"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Capture type */}
      <section className="space-y-2">
        <p className="text-text/30 text-[10px] uppercase tracking-wider pl-1">What to Capture</p>
        <div className="grid grid-cols-2 gap-2">
          {CAPTURE_TYPES.map(ct => (
            <button
              key={ct.id}
              onClick={() => setCaptureType(ct.id)}
              className={clsx(
                'flex items-start gap-2.5 px-3.5 py-3 rounded-2xl border transition-all text-left',
                captureType === ct.id
                  ? 'bg-[rgba(108,99,255,0.1)] border-[#6C63FF]/40'
                  : 'bg-white/[0.02] border-border/[0.06] hover:bg-white/[0.04]'
              )}
            >
              <div
                className={clsx(
                  'mt-0.5 shrink-0',
                  captureType === ct.id ? 'text-[#6C63FF]' : 'text-text/35'
                )}
              >
                {ct.icon}
              </div>
              <div>
                <p
                  className={clsx(
                    'text-xs font-semibold',
                    captureType === ct.id ? 'text-[#6C63FF]' : 'text-text/75'
                  )}
                >
                  {ct.label}
                </p>
                <p className="text-text/30 text-[10px] leading-tight mt-0.5">{ct.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Status / error */}
      <AnimatePresence>
        {syncStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {lastError && syncStatus === 'error' ? (
              <div className="flex items-start gap-2.5 bg-[rgba(255,71,87,0.07)] border border-[#FF4757]/20 rounded-2xl px-4 py-3">
                <AlertTriangle size={14} className="text-[#FF4757] mt-0.5 shrink-0" />
                <p className="text-[#FF4757]/80 text-xs leading-relaxed whitespace-pre-line">
                  {lastError}
                </p>
              </div>
            ) : isBusy ? (
              <div className="flex items-center gap-3 bg-[rgba(108,99,255,0.06)] border border-[#6C63FF]/20 rounded-2xl px-4 py-3">
                <Loader2 size={15} className="text-[#6C63FF] animate-spin shrink-0" />
                <div>
                  <p className="text-[#6C63FF] text-xs font-semibold">
                    {syncStatus === 'opening' && 'Opening portal browser…'}
                    {syncStatus === 'waiting' && 'Waiting for you to tap 📥 Capture…'}
                    {syncStatus === 'extracting' && 'Parsing captured tables…'}
                    {syncStatus === 'saving' && 'Saving to your semester…'}
                  </p>
                  {syncStatus === 'waiting' && (
                    <p className="text-text/35 text-[11px] mt-0.5">
                      Log in, navigate to attendance or marks, then tap the purple Capture button on
                      screen.
                    </p>
                  )}
                </div>
              </div>
            ) : syncStatus === 'success' ? (
              <div className="flex items-center gap-3 bg-[rgba(46,213,115,0.06)] border border-[#2ED573]/20 rounded-2xl px-4 py-3">
                <CheckCircle2 size={15} className="text-[#2ED573] shrink-0" />
                <p className="text-[#2ED573] text-xs font-semibold">Data imported successfully!</p>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Open Portal button */}
      <Button
        fullWidth
        onClick={handleCapture}
        loading={isBusy}
        disabled={!supported || !portalUrl || isBusy}
      >
        <Globe size={14} className="mr-1.5" />
        Open Portal &amp; Capture
      </Button>

      {!supported && (
        <p className="text-text/30 text-[11px] text-center">
          Portal capture is currently available in the desktop app.
        </p>
      )}

      {/* Sync log */}
      {syncLog.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-text/30 text-[10px] uppercase tracking-wider">Capture History</p>
            <button
              onClick={clearLog}
              className="text-text/25 hover:text-text/50 text-[10px] flex items-center gap-1 transition-colors"
            >
              <Trash2 size={10} />
              Clear
            </button>
          </div>
          <div className="space-y-1.5">
            {syncLog.map(entry => (
              <SyncLogRow key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
