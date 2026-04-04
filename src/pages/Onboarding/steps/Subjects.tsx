import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, BookOpen } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useSemesterStore } from '@/stores/useSemesterStore'
import { SUBJECT_COLORS } from '@/constants/grading'
import type { Subject, SubjectType } from '@/types'

const schema = z.object({
  name:    z.string().min(2, 'Subject name required'),
  code:    z.string().min(2, 'Subject code required'),
  credits: z.coerce.number().min(0).max(6),
  type:    z.enum(['Theory', 'Lab', 'NoCredit']),
})

type FormData = z.infer<typeof schema>

interface SubjectsStepProps {
  onNext: () => void
  onBack: () => void
}

export default function SubjectsStep({ onNext, onBack }: SubjectsStepProps) {
  const { activeSemesterId, subjects, addSubject, removeSubject } = useSemesterStore()
  const [adding, setAdding] = useState(false)

  const semSubjects = subjects.filter(s => s.semesterId === activeSemesterId)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', credits: 3, type: 'Theory' },
  })

  const onAdd = (data: FormData) => {
    if (!activeSemesterId) return
    const subject: Subject = {
      id:                    crypto.randomUUID(),
      semesterId:            activeSemesterId,
      name:                  data.name,
      code:                  data.code.toUpperCase(),
      credits:               data.credits,
      type:                  data.type as SubjectType,
      color:                 SUBJECT_COLORS[semSubjects.length % SUBJECT_COLORS.length],
      isMidtermBonusEnabled: data.type === 'Theory',
      isODCountedPresent:    false,
      isMedicalExcluded:     false,
      order:                 semSubjects.length,
    }
    addSubject(subject)
    reset({ name: '', code: '', credits: 3, type: 'Theory' })
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center pb-1">
        <div className="w-14 h-14 rounded-2xl bg-[rgba(46,213,115,0.1)] border border-[#2ED573]/30 flex items-center justify-center">
          <BookOpen size={24} className="text-[#2ED573]" />
        </div>
      </div>

      <p className="text-text/40 text-xs text-center -mt-2">
        Add your {semSubjects.length > 0 ? 'remaining' : ''} subjects for this semester. You can always edit these later.
      </p>

      {/* Subject list */}
      {semSubjects.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {semSubjects.map(s => (
            <div key={s.id}
              className="flex items-center gap-3 bg-white/[0.04] border border-border/[0.07] rounded-xl px-3 py-2.5"
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-text text-sm font-medium truncate">{s.name}</p>
                <p className="text-text/35 text-xs">{s.code} · {s.credits} cr · {s.type}</p>
              </div>
              <button onClick={() => removeSubject(s.id)}
                className="text-text/25 hover:text-[#FF4757] transition-colors p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add subject form */}
      {adding ? (
        <form onSubmit={handleSubmit(onAdd)} className="space-y-3 bg-white/[0.03] border border-border/[0.07] rounded-xl p-3">
          <div className="grid grid-cols-2 gap-2">
            <Input label="Name" placeholder="e.g. DBMS" error={errors.name?.message} {...register('name')} />
            <Input label="Code" placeholder="e.g. CS401" error={errors.code?.message} {...register('code')} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Credits" type="number" min={0} max={6} error={errors.credits?.message} {...register('credits')} />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text/70">Type</label>
              <select {...register('type')}
                className="w-full appearance-none rounded-xl border border-border/[0.08] bg-surface text-text/90 text-sm px-3 py-2.5 min-h-[44px] outline-none focus:border-[#6C63FF]/60">
                <option value="Theory">Theory</option>
                <option value="Lab">Lab</option>
                <option value="NoCredit">No Credit</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAdding(false)}
              className="flex-1 py-2 rounded-lg border border-border/10 text-text/50 text-xs hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <Button type="submit" size="sm" fullWidth className="flex-1">Add</Button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full py-3 rounded-xl border border-dashed border-border/[0.15] text-text/40 text-sm
                     hover:border-[#6C63FF]/40 hover:text-[#6C63FF] transition-all flex items-center justify-center gap-2">
          <Plus size={16} /> Add subject
        </button>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-border/10 text-text/60 text-sm hover:bg-white/5 transition-colors">
          Back
        </button>
        <Button
          onClick={onNext}
          fullWidth
          className="flex-1"
          variant={semSubjects.length === 0 ? 'secondary' : 'primary'}
        >
          {semSubjects.length === 0 ? 'Skip for now' : `Continue (${semSubjects.length} added)`}
        </Button>
      </div>
    </div>
  )
}
