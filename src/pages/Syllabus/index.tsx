/**
 * Syllabus — Per-subject unit & topic progress tracker
 * Spec §6.9
 */

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { useSubjects } from '@/hooks/useSubjects'
import EmptyState from '@/components/ui/EmptyState'
import ProgressBar from '@/components/ui/ProgressBar'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import FAB from '@/components/ui/FAB'
import type { SyllabusUnit, SyllabusTopic, SyllabusTopicStatus } from '@/types'
import { clsx } from 'clsx'
import { ChevronDown, ChevronRight, Plus, ArrowLeft } from 'lucide-react'

const STATUS_COLOR: Record<SyllabusTopicStatus, string> = {
  NotStarted:   'rgba(255,255,255,0.15)',
  InProgress:   '#FFA502',
  Completed:    '#2ED573',
  RevisionDone: '#6C63FF',
}
const STATUS_LABEL: Record<SyllabusTopicStatus, string> = {
  NotStarted:   'Not Started',
  InProgress:   'In Progress',
  Completed:    'Completed',
  RevisionDone: 'Revision Done',
}
const STATUS_CYCLE: SyllabusTopicStatus[] = [
  'NotStarted', 'InProgress', 'Completed', 'RevisionDone',
]

function nextStatus(s: SyllabusTopicStatus): SyllabusTopicStatus {
  return STATUS_CYCLE[(STATUS_CYCLE.indexOf(s) + 1) % STATUS_CYCLE.length]
}

function unitProgress(unit: SyllabusUnit): number {
  if (!unit.topics.length) return 0
  const done = unit.topics.filter(t => t.status === 'Completed' || t.status === 'RevisionDone').length
  return Math.round((done / unit.topics.length) * 100)
}

// ── Subject list ──────────────────────────────────────────────────────────────

function SubjectList({
  onSelect,
}: {
  onSelect: (id: string) => void
}) {
  const { subjects } = useSubjects()

  const theorySubjects = subjects.filter(s => s.type === 'Theory')

  if (!theorySubjects.length) {
    return (
      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-6 space-y-4">
        <h1 className="text-text text-xl font-bold">Syllabus</h1>
        <EmptyState title="No theory subjects" description="Add subjects in Settings to track syllabus." />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24 px-4 pt-6 space-y-4">
      <h1 className="text-text text-xl font-bold">Syllabus</h1>
      <p className="text-text/35 text-xs">Select a subject to track unit-wise progress.</p>
      <div className="space-y-2">
        {theorySubjects.map(subject => (
          <button
            key={subject.id}
            onClick={() => onSelect(subject.id)}
            className="w-full text-left rounded-2xl border border-border/[0.07] bg-card/[0.7] p-4 flex items-center gap-4 hover:border-border/[0.14] active:scale-[0.99] transition-all"
          >
            <div className="w-1.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-text font-semibold text-sm">{subject.name}</p>
              <p className="text-text/35 text-xs">{subject.code} · {subject.credits} credits</p>
            </div>
            <ChevronRight size={16} className="text-text/25 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Subject detail ────────────────────────────────────────────────────────────

function SubjectDetail({
  subjectId,
  onBack,
}: {
  subjectId: string
  onBack: () => void
}) {
  const { subjects } = useSubjects()
  const subject = subjects.find(s => s.id === subjectId)

  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set())
  const [showAddUnit,   setShowAddUnit]   = useState(false)
  const [showAddTopic,  setShowAddTopic]  = useState<string | null>(null)
  const [unitName,      setUnitName]      = useState('')
  const [topicName,     setTopicName]     = useState('')
  const [saving,        setSaving]        = useState(false)

  const allUnits = useLiveQuery<SyllabusUnit[]>(
    () => db.syllabusUnits.where('subjectId').equals(subjectId).toArray(),
    [subjectId]
  ) ?? []

  const sortedUnits = [...allUnits].sort((a, b) => a.order - b.order)

  const overallProgress = () => {
    const topics = allUnits.flatMap(u => u.topics)
    if (!topics.length) return 0
    const done = topics.filter(t => t.status === 'Completed' || t.status === 'RevisionDone').length
    return Math.round((done / topics.length) * 100)
  }

  const toggleUnit = (id: string) =>
    setExpandedUnits(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleAddUnit = async () => {
    if (!unitName.trim()) return
    setSaving(true)
    await db.syllabusUnits.add({
      id:        crypto.randomUUID(),
      subjectId,
      name:      unitName.trim(),
      order:     allUnits.length + 1,
      topics:    [],
    })
    setSaving(false)
    setShowAddUnit(false)
    setUnitName('')
  }

  const handleAddTopic = async (unitId: string) => {
    if (!topicName.trim()) return
    setSaving(true)
    const unit = allUnits.find(u => u.id === unitId)
    if (!unit) { setSaving(false); return }
    const newTopic: SyllabusTopic = {
      id:     crypto.randomUUID(),
      unitId,
      name:   topicName.trim(),
      status: 'NotStarted',
      order:  unit.topics.length + 1,
    }
    await db.syllabusUnits.update(unitId, { topics: [...unit.topics, newTopic] })
    setSaving(false)
    setShowAddTopic(null)
    setTopicName('')
  }

  const handleCycleTopic = async (unit: SyllabusUnit, topic: SyllabusTopic) => {
    await db.syllabusUnits.update(unit.id, {
      topics: unit.topics.map(t =>
        t.id === topic.id ? { ...t, status: nextStatus(t.status) } : t
      ),
    })
  }

  const progress = overallProgress()

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-text/40 hover:text-text text-xs transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-text text-lg font-bold truncate">{subject?.name}</h1>
          <p className="text-text/35 text-[10px]">{subject?.code}</p>
        </div>
      </div>

      {/* Overall progress banner */}
      {allUnits.length > 0 && (
        <div
          className="rounded-2xl border p-4 space-y-2"
          style={{ borderColor: `${subject?.color ?? '#6C63FF'}30`, backgroundColor: `${subject?.color ?? '#6C63FF'}0a` }}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-text/50">Overall Coverage</span>
            <span className="font-bold" style={{ color: progress >= 80 ? '#2ED573' : progress >= 50 ? '#FFA502' : 'rgba(255,255,255,0.7)' }}>
              {progress}%
            </span>
          </div>
          <ProgressBar value={progress} animate />
          <p className="text-text/25 text-[10px]">
            {allUnits.flatMap(u => u.topics).filter(t => t.status === 'Completed' || t.status === 'RevisionDone').length}
            {' of '}
            {allUnits.flatMap(u => u.topics).length} topics done
          </p>
        </div>
      )}

      {/* Units */}
      {sortedUnits.length === 0 ? (
        <EmptyState title="No units yet" description="Tap + to add your first unit." />
      ) : (
        <div className="space-y-2">
          {sortedUnits.map(unit => {
            const isExpanded = expandedUnits.has(unit.id)
            const prog       = unitProgress(unit)
            return (
              <div
                key={unit.id}
                className="rounded-2xl border border-border/[0.07] bg-card/[0.7] overflow-hidden"
              >
                {/* Unit header */}
                <button
                  onClick={() => toggleUnit(unit.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
                >
                  {isExpanded
                    ? <ChevronDown size={14} className="text-text/35 shrink-0" />
                    : <ChevronRight size={14} className="text-text/35 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-text text-sm font-semibold truncate">{unit.name}</p>
                    <p className="text-text/30 text-[10px]">
                      {unit.topics.length} topic{unit.topics.length !== 1 ? 's' : ''} · {prog}% done
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold shrink-0"
                    style={{ color: prog === 100 ? '#2ED573' : prog > 0 ? '#FFA502' : 'rgba(255,255,255,0.2)' }}
                  >
                    {prog}%
                  </span>
                </button>

                {/* Topics */}
                {isExpanded && (
                  <div className="border-t border-border/[0.06]">
                    {unit.topics.sort((a, b) => a.order - b.order).map(topic => (
                      <button
                        key={topic.id}
                        onClick={() => handleCycleTopic(unit, topic)}
                        className="w-full flex items-center gap-3 px-5 py-2.5 border-b border-border/[0.04] last:border-b-0 hover:bg-white/[0.025] transition-colors text-left"
                      >
                        {/* Status dot */}
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0 border transition-all"
                          style={{
                            backgroundColor: topic.status !== 'NotStarted' ? STATUS_COLOR[topic.status] : 'transparent',
                            borderColor:     STATUS_COLOR[topic.status],
                          }}
                        />
                        <span
                          className={clsx(
                            'text-xs flex-1 leading-snug',
                            topic.status === 'Completed' || topic.status === 'RevisionDone'
                              ? 'text-text/40 line-through'
                              : 'text-text/80'
                          )}
                        >
                          {topic.name}
                        </span>
                        <span className="text-[10px] text-text/25 shrink-0">
                          {STATUS_LABEL[topic.status]}
                        </span>
                      </button>
                    ))}

                    {/* Add topic inline */}
                    <div className="px-5 py-2">
                      <button
                        onClick={() => setShowAddTopic(unit.id)}
                        className="flex items-center gap-1.5 text-[10px] text-[#6C63FF]/70 hover:text-[#6C63FF] transition-colors"
                      >
                        <Plus size={11} /> Add Topic
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <FAB onClick={() => setShowAddUnit(true)} label="Add Unit" />

      {/* Add Unit Modal */}
      <Modal open={showAddUnit} onClose={() => { setShowAddUnit(false); setUnitName('') }} title="Add Unit">
        <div className="space-y-4">
          <Input
            label="Unit Name"
            value={unitName}
            onChange={e => setUnitName(e.target.value)}
            placeholder="e.g. Unit 2: SQL & Relational Algebra"
            autoFocus
          />
          <Button fullWidth onClick={handleAddUnit} loading={saving} disabled={!unitName.trim()}>
            Add Unit
          </Button>
        </div>
      </Modal>

      {/* Add Topic Modal */}
      <Modal
        open={showAddTopic !== null}
        onClose={() => { setShowAddTopic(null); setTopicName('') }}
        title="Add Topic"
      >
        <div className="space-y-4">
          <Input
            label="Topic Name"
            value={topicName}
            onChange={e => setTopicName(e.target.value)}
            placeholder="e.g. Normalization — 1NF, 2NF, 3NF"
            autoFocus
          />
          <Button
            fullWidth
            onClick={() => showAddTopic && handleAddTopic(showAddTopic)}
            loading={saving}
            disabled={!topicName.trim()}
          >
            Add Topic
          </Button>
        </div>
      </Modal>
    </div>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function SyllabusPage() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)

  if (selectedSubjectId) {
    return (
      <SubjectDetail
        subjectId={selectedSubjectId}
        onBack={() => setSelectedSubjectId(null)}
      />
    )
  }

  return <SubjectList onSelect={setSelectedSubjectId} />
}
