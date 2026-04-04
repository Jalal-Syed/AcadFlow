import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useProfileStore } from '@/stores/useProfileStore'

const schema = z.object({
  name:    z.string().min(2, 'Name must be at least 2 characters'),
  college: z.string().min(3, 'College name required'),
  rollNo:  z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface ProfileProps {
  onNext: () => void
  onBack: () => void
}

export default function Profile({ onNext, onBack }: ProfileProps) {
  const { profile, setProfile, updateProfile } = useProfileStore()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:    profile?.name ?? '',
      college: profile?.college ?? '',
      rollNo:  profile?.rollNo ?? '',
    },
  })

  const onSubmit = (data: FormData) => {
    if (!profile) {
      setProfile({
        id:                  crypto.randomUUID(),
        name:                data.name,
        college:             data.college,
        rollNo:              data.rollNo ?? '',
        universityId:        'JNTUH',
        degree:              'BTech',
        branch:              '',
        totalSemesters:      8,
        currentSemester:     1,
        attendanceThreshold: 75,
        gradingScaleId:      'jntuh-r25',
        onboardingComplete:  false,   // Bug #5 fix — explicitly initialise
        createdAt:           new Date().toISOString(),
        updatedAt:           new Date().toISOString(),
      })
    } else {
      updateProfile({ name: data.name, college: data.college, rollNo: data.rollNo ?? '' })
    }
    onNext()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2 pb-2">
        <div className="w-14 h-14 rounded-2xl bg-[rgba(108,99,255,0.15)] border border-[#6C63FF]/30 flex items-center justify-center">
          <User size={24} className="text-[#6C63FF]" />
        </div>
        <p className="text-text/50 text-xs text-center">
          This stays on your device. We don't store anything.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Your name"    placeholder="e.g. Ravi Kumar"         error={errors.name?.message}    {...register('name')} />
        <Input label="College name" placeholder="e.g. CBIT, Hyderabad"    error={errors.college?.message} {...register('college')} />
        <Input label="Roll number"  placeholder="e.g. 22B81A0501 (optional)"                               {...register('rollNo')} />

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
