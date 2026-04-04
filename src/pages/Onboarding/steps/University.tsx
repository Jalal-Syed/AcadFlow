import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GraduationCap } from 'lucide-react'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useProfileStore } from '@/stores/useProfileStore'
import { GRADING_SCALES } from '@/constants/grading'
import type { UniversityId, DegreeType } from '@/types'

const schema = z.object({
  universityId:  z.string().min(1, 'Select a university'),
  degree:        z.string().min(1, 'Select degree type'),
  branch:        z.string().min(2, 'Branch / specialisation required'),
  totalSemesters: z.coerce.number().min(4).max(10),
})

type FormData = z.infer<typeof schema>

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
  { value: 'BTech',      label: 'B.Tech (4 years / 8 sem)' },
  { value: 'Diploma',    label: 'Diploma (3 years / 6 sem)' },
  { value: 'MTech',      label: 'M.Tech (2 years / 4 sem)' },
  { value: 'Integrated', label: 'Integrated B.Tech+M.Tech (5 years / 10 sem)' },
]

const SEMESTER_COUNT: Record<string, number> = {
  BTech: 8, Diploma: 6, MTech: 4, Integrated: 10,
}

interface UniversityStepProps {
  onNext: () => void
  onBack: () => void
}

export default function UniversityStep({ onNext, onBack }: UniversityStepProps) {
  const { profile, updateProfile, setGradingScale } = useProfileStore()

  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      universityId:   profile?.universityId ?? 'JNTUH',
      degree:         profile?.degree ?? 'BTech',
      branch:         profile?.branch ?? '',
      totalSemesters: profile?.totalSemesters ?? 8,
    },
  })

  const uniId  = watch('universityId')

  const onSubmit = (data: FormData) => {
    const semCount = SEMESTER_COUNT[data.degree] ?? Number(data.totalSemesters)

    // Find matching grading scale
    const scaleEntry = Object.values(GRADING_SCALES).find(
      s => s.universityId === data.universityId
    )
    if (scaleEntry) setGradingScale(scaleEntry)

    updateProfile({
      universityId:   data.universityId as UniversityId,
      degree:         data.degree as DegreeType,
      branch:         data.branch,
      totalSemesters: semCount,
      gradingScaleId: scaleEntry?.id ?? 'jntuh-r25',
    })
    onNext()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-center pb-1">
        <div className="w-14 h-14 rounded-2xl bg-[rgba(0,245,212,0.1)] border border-[#00F5D4]/30 flex items-center justify-center">
          <GraduationCap size={24} className="text-[#00F5D4]" />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Controller
          name="universityId"
          control={control}
          render={({ field }) => (
            <Select
              label="University"
              options={UNIVERSITY_OPTIONS}
              error={errors.universityId?.message}
              {...field}
            />
          )}
        />

        {uniId === 'Custom' && (
          <p className="text-xs text-[#FFA502] bg-[rgba(255,165,2,0.08)] border border-[#FFA502]/20 rounded-xl px-3 py-2">
            You'll be able to set a custom grading scale in Settings after setup.
          </p>
        )}

        <Controller
          name="degree"
          control={control}
          render={({ field }) => (
            <Select
              label="Degree"
              options={DEGREE_OPTIONS}
              error={errors.degree?.message}
              {...field}
            />
          )}
        />

        <Input
          label="Branch / Specialisation"
          placeholder="e.g. CSE, ECE, Mechanical"
          error={errors.branch?.message}
          {...register('branch')}
        />

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onBack}
            className="flex-1 py-3 rounded-xl border border-border/10 text-text/60 text-sm hover:bg-white/5 transition-colors">
            Back
          </button>
          <Button type="submit" fullWidth className="flex-1">Continue</Button>
        </div>
      </form>
    </div>
  )
}
