/**
 * Labs — Laboratory marks tracker
 * CIE (4×10=40) + SEE (5 components=60) per lab subject.
 * Follows JNTUH R-25 Clause 9.5
 */

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { useSemesterStore } from '@/stores/useSemesterStore'
import { useSubjects } from '@/hooks/useSubjects'
import { useProfileStore } from '@/stores/useProfileStore'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import type { LabMarks, Subject } from '@/types'
import { Beaker, Pencil, CheckCircle2, XCircle, Clock } from 'lucide-react'

const CIE_COMPONENTS = [
  { key: 'dayToDay' as const, label: 'Day-to-Day', max: 10, desc: 'Write-up on experiments' },
  { key: 'vivaInternal' as const, label: 'Viva / Tutorial', max: 10, desc: 'Viva-voce or case study' },
  { key: 'internalExam' as const, label: 'Internal Exam', max: 10, desc: 'Lab teacher conducted' },
  { key: 'labReport' as const, label: 'Lab Report', max: 10, desc: 'Design / Prototype / App' },
]


export default function LabsPage() {
  const { activeSemesterId } = useSemesterStore()
  const { subjects } = useSubjects()
  const { gradingScale } = useProfileStore()

  const [editingLab, setEditingLab] = useState<{ subject: Subject; marks: LabMarks | null } | null>(null)

  const labSubjects = subjects.filter(s => s.type === 'Lab')

  const allLabMarks = useLiveQuery<LabMarks[]>(
    () => activeSemesterId
      ? db.labMarks.where('semesterId').equals(activeSemesterId).toArray()
      : Promise.resolve([]),
    [activeSemesterId]
  ) ?? []

  const getLabMarks = (subjectId: string) => allLabMarks.find(m => m.subjectId === subjectId)

  const calcCIE = (m: LabMarks) => {
    const parts = [m.dayToDay, m.vivaInternal, m.internalExam, m.labReport]
    const filled = parts.filter(v => v !== null) as number[]
    return filled.length > 0 ? filled.reduce((a, b) => a + b, 0) : null
  }

  const calcSEE = (m: LabMarks) => {
    const parts = [m.seeWriteup, m.seeExecution, m.seeResults, m.seePresentation, m.seeVivaVoce]
    const filled = parts.filter(v => v !== null) as number[]
    return filled.length > 0 ? filled.reduce((a, b) => a + b, 0) : null
  }

  const openEdit = (subject: Subject) => {
    setEditingLab({ subject, marks: getLabMarks(subject.id) ?? null })
  }

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text text-xl font-bold">Labs</h1>
          <p className="text-text/30 text-xs mt-0.5">
            Laboratory marks & assessment (CIE 40 + SEE 60)
          </p>
        </div>
        <Badge variant="default" size="sm">
          <Beaker size={10} className="mr-1" />{labSubjects.length} lab{labSubjects.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {labSubjects.length === 0 ? (
        <EmptyState
          title="No lab subjects"
          description="Add Lab-type subjects from the Subjects page to track lab marks."
        />
      ) : (
        <div className="space-y-3">
          {labSubjects.map(subject => {
            const marks = getLabMarks(subject.id)
            const cie = marks ? calcCIE(marks) : null
            const see = marks ? calcSEE(marks) : null
            const total = (cie ?? 0) + (see ?? 0)
            const isPassed = see !== null && see >= gradingScale.seePassMin && total >= gradingScale.overallPassMin
            const isFailed = see !== null && (see < gradingScale.seePassMin || total < gradingScale.overallPassMin)

            return (
              <div
                key={subject.id}
                className="rounded-2xl border border-border/[0.07] bg-card/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                    <div>
                      <p className="text-text text-sm font-semibold">{subject.name}</p>
                      <p className="text-text/25 text-[10px] font-mono">{subject.code} · {subject.credits} cr</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPassed && <Badge variant="success" size="sm"><CheckCircle2 size={9} className="mr-0.5" />Pass</Badge>}
                    {isFailed && <Badge variant="danger" size="sm"><XCircle size={9} className="mr-0.5" />Fail</Badge>}
                    {!marks && <Badge variant="warning" size="sm"><Clock size={9} className="mr-0.5" />Pending</Badge>}
                    <button
                      onClick={() => openEdit(subject)}
                      className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text/25 hover:text-text/60"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>

                {/* CIE breakdown */}
                <div className="grid grid-cols-4 gap-1.5">
                  {CIE_COMPONENTS.map(c => {
                    const val = marks?.[c.key]
                    return (
                      <div key={c.key} className="text-center bg-white/[0.03] border border-border/[0.05] rounded-lg py-2">
                        <p className="text-text/60 text-xs font-mono">{val ?? '—'}<span className="text-text/20">/{c.max}</span></p>
                        <p className="text-text/20 text-[8px] mt-0.5">{c.label}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Totals */}
                <div className="flex gap-3">
                  <div className="flex-1 bg-white/[0.03] border border-border/[0.05] rounded-lg px-3 py-2 text-center">
                    <p className="text-text/25 text-[9px]">CIE</p>
                    <p className="text-text/70 text-sm font-mono font-semibold">{cie ?? '—'}<span className="text-text/20">/40</span></p>
                  </div>
                  <div className="flex-1 bg-white/[0.03] border border-border/[0.05] rounded-lg px-3 py-2 text-center">
                    <p className="text-text/25 text-[9px]">SEE</p>
                    <p className="text-text/70 text-sm font-mono font-semibold">{see ?? '—'}<span className="text-text/20">/60</span></p>
                  </div>
                  <div className="flex-1 bg-white/[0.03] border border-border/[0.05] rounded-lg px-3 py-2 text-center">
                    <p className="text-text/25 text-[9px]">Total</p>
                    <p className={`text-sm font-mono font-semibold ${
                      total >= 40 ? 'text-[#2ED573]' : total > 0 ? 'text-[#FF4757]' : 'text-text/40'
                    }`}>{marks ? total : '—'}<span className="text-text/20">/100</span></p>
                  </div>
                </div>

                {/* Progress bar */}
                {marks && (
                  <ProgressBar
                    value={total}
                    max={100}
                    variant={total >= 40 ? 'success' : 'danger'}
                    height={3}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Lab Marks Modal */}
      {editingLab && (
        <EditLabModal
          subject={editingLab.subject}
          existing={editingLab.marks}
          semesterId={activeSemesterId!}
          onClose={() => setEditingLab(null)}
        />
      )}
    </div>
  )
}

// ─── Edit Modal ──────────────────────────────────────────────────────────

function EditLabModal({
  subject,
  existing,
  semesterId,
  onClose,
}: {
  subject: Subject
  existing: LabMarks | null
  semesterId: string
  onClose: () => void
}) {
  const [dayToDay, setDayToDay] = useState<string>(existing?.dayToDay?.toString() ?? '')
  const [vivaInternal, setVivaInternal] = useState<string>(existing?.vivaInternal?.toString() ?? '')
  const [internalExam, setInternalExam] = useState<string>(existing?.internalExam?.toString() ?? '')
  const [labReport, setLabReport] = useState<string>(existing?.labReport?.toString() ?? '')
  const [seeWriteup, setSeeWriteup] = useState<string>(existing?.seeWriteup?.toString() ?? '')
  const [seeExecution, setSeeExecution] = useState<string>(existing?.seeExecution?.toString() ?? '')
  const [seeResults, setSeeResults] = useState<string>(existing?.seeResults?.toString() ?? '')
  const [seePresentation, setSeePresentation] = useState<string>(existing?.seePresentation?.toString() ?? '')
  const [seeVivaVoce, setSeeVivaVoce] = useState<string>(existing?.seeVivaVoce?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  const toNum = (v: string): number | null => v === '' ? null : Number(v)

  const handleSave = async () => {
    setSaving(true)
    const data: LabMarks = {
      id: existing?.id ?? crypto.randomUUID(),
      subjectId: subject.id,
      semesterId,
      dayToDay: toNum(dayToDay),
      vivaInternal: toNum(vivaInternal),
      internalExam: toNum(internalExam),
      labReport: toNum(labReport),
      seeWriteup: toNum(seeWriteup),
      seeExecution: toNum(seeExecution),
      seeResults: toNum(seeResults),
      seePresentation: toNum(seePresentation),
      seeVivaVoce: toNum(seeVivaVoce),
      seeEntered: toNum(seeWriteup) !== null || toNum(seeExecution) !== null,
      status: 'AwaitingSEE',
    }
    await db.labMarks.put(data)
    setSaving(false)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`${subject.name} — Lab Marks`} size="lg">
      <div className="space-y-5">
        {/* CIE Section */}
        <div className="space-y-3">
          <p className="text-text/40 text-xs uppercase tracking-wider">CIE (Internal — 40 marks)</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Day-to-Day (/10)" type="number" min={0} max={10} value={dayToDay} onChange={e => setDayToDay(e.target.value)} />
            <Input label="Viva / Tutorial (/10)" type="number" min={0} max={10} value={vivaInternal} onChange={e => setVivaInternal(e.target.value)} />
            <Input label="Internal Exam (/10)" type="number" min={0} max={10} value={internalExam} onChange={e => setInternalExam(e.target.value)} />
            <Input label="Lab Report (/10)" type="number" min={0} max={10} value={labReport} onChange={e => setLabReport(e.target.value)} />
          </div>
        </div>

        {/* SEE Section */}
        <div className="space-y-3">
          <p className="text-text/40 text-xs uppercase tracking-wider">SEE (External — 60 marks)</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Write-up (/10)" type="number" min={0} max={10} value={seeWriteup} onChange={e => setSeeWriteup(e.target.value)} />
            <Input label="Experiment (/15)" type="number" min={0} max={15} value={seeExecution} onChange={e => setSeeExecution(e.target.value)} />
            <Input label="Results (/15)" type="number" min={0} max={15} value={seeResults} onChange={e => setSeeResults(e.target.value)} />
            <Input label="Presentation (/10)" type="number" min={0} max={10} value={seePresentation} onChange={e => setSeePresentation(e.target.value)} />
            <Input label="Viva-Voce (/10)" type="number" min={0} max={10} value={seeVivaVoce} onChange={e => setSeeVivaVoce(e.target.value)} />
          </div>
        </div>

        <Button fullWidth onClick={handleSave} loading={saving}>Save Lab Marks</Button>
      </div>
    </Modal>
  )
}
