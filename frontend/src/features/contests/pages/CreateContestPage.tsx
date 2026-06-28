import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { contestApi } from '@/features/contests/services/contestApi';
import { PageHeader, Field, Input, Textarea, Select, Button } from '@/shared/components/ui';
import type { AxiosError } from 'axios';
import type { ApiResponse } from '@/shared/types';

const contestSchema = z.object({
  title: z.string().min(5, 'At least 5 characters').max(200),
  description: z.string().min(10, 'At least 10 characters').max(5000),
  startTime: z.string().min(1, 'Required'),
  endTime: z.string().min(1, 'Required'),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
  regType: z.enum(['OPEN', 'INVITE_ONLY']),
  scoringMode: z.enum(['POINTS', 'PENALTY_TIME', 'PERCENTAGE']),
  maxParticipants: z.coerce.number().int().positive().optional(),
});

type ContestForm = z.infer<typeof contestSchema>;

export function CreateContestPage() {
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<ContestForm>({
    resolver: zodResolver(contestSchema) as ReturnType<typeof zodResolver>,
    defaultValues: { visibility: 'PUBLIC', regType: 'OPEN', scoringMode: 'POINTS' },
  });

  const mutation = useMutation({
    mutationFn: (data: ContestForm) =>
      contestApi.hostContest({
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        visibility: data.visibility,
        regType: data.regType,
        scoringMode: data.scoringMode,
        maxParticipants: data.maxParticipants ? Number(data.maxParticipants) : undefined,
      }),
    onSuccess: (res) => { toast.success('Contest created!'); navigate(`/contests/${res.data.id}`); },
    onError: (err: AxiosError<ApiResponse<never>>) => toast.error(err.response?.data?.message ?? 'Failed to create contest'),
  });

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Host a Contest"
        subtitle="Create a coding competition and invite participants"
        actions={<Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>}
      />

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
        <Field label="Title" htmlFor="title" error={errors.title?.message} required>
          <Input id="title" placeholder="e.g. Weekly Algorithm Challenge #12" error={!!errors.title} {...register('title')} />
        </Field>

        <Field label="Description" htmlFor="description" error={errors.description?.message} required>
          <Textarea id="description" rows={4} placeholder="Describe your contest..." error={!!errors.description} {...register('description')} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Time" htmlFor="startTime" error={errors.startTime?.message} required>
            <Input id="startTime" type="datetime-local" error={!!errors.startTime} {...register('startTime')} />
          </Field>
          <Field label="End Time" htmlFor="endTime" error={errors.endTime?.message} required>
            <Input id="endTime" type="datetime-local" error={!!errors.endTime} {...register('endTime')} />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Visibility" htmlFor="visibility">
            <Select id="visibility" options={[{ value: 'PUBLIC', label: 'Public' }, { value: 'PRIVATE', label: 'Private' }]} {...register('visibility')} />
          </Field>
          <Field label="Registration" htmlFor="regType">
            <Select id="regType" options={[{ value: 'OPEN', label: 'Open' }, { value: 'INVITE_ONLY', label: 'Invite Only' }]} {...register('regType')} />
          </Field>
          <Field label="Scoring" htmlFor="scoringMode">
            <Select id="scoringMode" options={[{ value: 'POINTS', label: 'Points' }, { value: 'PENALTY_TIME', label: 'Penalty Time' }, { value: 'PERCENTAGE', label: 'Percentage' }]} {...register('scoringMode')} />
          </Field>
        </div>

        <Field label="Max Participants" htmlFor="maxParticipants" hint="Leave empty for unlimited">
          <Input id="maxParticipants" type="number" placeholder="Unlimited" {...register('maxParticipants')} />
        </Field>

        <Button type="submit" loading={mutation.isPending} className="w-full py-3">
          Create Contest
        </Button>
      </form>
    </div>
  );
}
