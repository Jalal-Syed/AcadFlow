import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useProfileStore } from '@/stores/useProfileStore'
import { useSemesterStore } from '@/stores/useSemesterStore'

const schema = z.object({
  semesterNumber:      z.coerce.number().min(1).max(10),
  academicYear:        z.string().min(4, 'e.g. 2025-26'),
  startDate:           z.string().min(1, 'Required'),
  endDate:             z.string().min(1, 'Required'),
  attendanceThreshold: z.coerce.number().min(50).max(100),
})

type FormData = z.infer<typeof schema>

interface SemesterStepProps {
  onNext: () => void
  onBack: () => void
}

export default function SemesterStep({ onNext, onBack }: SemesterStepProps) {
  const { profile, updateProfile } = useProfileStore()
  const { addSemester, setActiveSemester } = useSemesterStore()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      semesterNumber:      profile?.currentSemester ?? 1,
      academicYear:        '2025-26',
      startDate:           '',
      endDate:             '',
      attendanceThreshold: profile?.attendanceThreshold ?? 75,
    },
  })

  const onSubmit = (data: FormData) => {
    const semId = crypto.randomUUID()
    addSemester({
      id:               semId,
      number:           data.semesterNumber,
      academicYear:     data.academicYear,
      startDate:        data.startDate,
      endDate:          data.endDate,
      isActive:         true,
      isArchived:       false,
    })
    setActiveSemester(semId)
    updateProfile({
      currentSemester:     data.semesterNumber,
      attendanceThreshold: data.attendanceThreshold,
    })
    onNext()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-center pb-1">
        <div className="w-14 h-14 rounded-2xl bg-[rgba(255,165,2,0.1)] border border-[#FFA502]/30 flex items-center justify-center">
          <Calendar size={24} className="text-[#FFA502]" />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Current semester"
            type="number" min={1} max={10}
            error={errors.semesterNumber?.message}
            {...register('semesterNumber')}
          />
          <Input
            label="Academic year"
            placeholder="2025-26"
            error={errors.academicYear?.message}
            {...register('academicYear')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Sem start date"
            type="date"
            error={errors.startDate?.message}
            {...register('startDate')}
          />
          <Input
            label="Sem end date"
            type="date"
            error={errors.endDate?.message}
            {...register('endDate')}
          />
        </div>

        <div>
          <Input
            label="Attendance threshold (%)"
            type="number" min={50} max={100}
            hint="JNTUH default is 75%. Your college may differ."
            error={errors.attendanceThreshold?.message}
            {...register('attendanceThreshold')}
          />
        </div>

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
