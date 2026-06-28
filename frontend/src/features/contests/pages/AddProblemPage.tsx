import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { contestApi } from '@/features/contests/services/contestApi';
import { PageHeader, Field, Input, Textarea, Select, Button } from '@/shared/components/ui';
import type { AxiosError } from 'axios';
import type { ApiResponse, ProblemCategory } from '@/shared/types';

const CATEGORIES: Array<{ value: string; label: string }> = [
  'ARRAYS', 'STRINGS', 'LINKED_LIST', 'TREES', 'GRAPHS',
  'DYNAMIC_PROGRAMMING', 'GREEDY', 'BACKTRACKING',
  'SORTING', 'SEARCHING', 'MATH', 'SQL', 'SYSTEM_DESIGN', 'MISCELLANEOUS',
].map((c) => ({ value: c, label: c.replace(/_/g, ' ') }));

const problemSchema = z.object({
  title: z.string().min(5, 'At least 5 characters').max(200),
  description: z.string().min(10, 'At least 10 characters').max(10000),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  category: z.string().min(1, 'Required'),
  timeLimit: z.coerce.number().int().min(1).max(10),
  memoryLimit: z.coerce.number().int().min(16).max(512),
  inputFormat: z.string().min(1, 'Required').max(2000),
  outputFormat: z.string().min(1, 'Required').max(2000),
  constraintsText: z.string().min(1, 'Required').max(2000),
  explanation: z.string().max(2000).optional(),
  tags: z.string().max(500).optional(),
  points: z.coerce.number().int().min(1),
  sequenceNo: z.coerce.number().int().min(1),
});

type ProblemForm = z.infer<typeof problemSchema>;

export function AddProblemPage() {
  const { contestId } = useParams<{ contestId: string }>();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<ProblemForm>({
    resolver: zodResolver(problemSchema) as ReturnType<typeof zodResolver>,
    defaultValues: { difficulty: 'MEDIUM', category: 'ARRAYS', timeLimit: 2, memoryLimit: 256, points: 100, sequenceNo: 1 },
  });

  const mutation = useMutation({
    mutationFn: (data: ProblemForm) =>
      contestApi.createProblem(contestId!, {
        title: data.title, description: data.description,
        difficulty: data.difficulty, category: data.category as ProblemCategory,
        timeLimit: data.timeLimit, memoryLimit: data.memoryLimit,
        inputFormat: data.inputFormat, outputFormat: data.outputFormat,
        constraintsText: data.constraintsText,
        explanation: data.explanation ?? null, tags: data.tags ?? null,
        points: data.points, sequenceNo: data.sequenceNo,
      }),
    onSuccess: (res) => { toast.success('Problem created! Now add test cases.'); navigate(`/contests/${contestId}/problems/${res.data.id}/testcases`); },
    onError: (err: AxiosError<ApiResponse<never>>) => toast.error(err.response?.data?.message ?? 'Failed to create problem'),
  });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Add Problem"
        subtitle="Create a coding problem for your contest"
        actions={<Button variant="ghost" onClick={() => navigate(`/contests/${contestId}`)}>Cancel</Button>}
      />

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
        <Field label="Title" htmlFor="p-title" error={errors.title?.message} required>
          <Input id="p-title" placeholder="e.g. Two Sum" error={!!errors.title} {...register('title')} />
        </Field>

        <Field label="Description" htmlFor="p-desc" error={errors.description?.message} required>
          <Textarea id="p-desc" rows={6} placeholder="Describe the problem in detail..." error={!!errors.description} {...register('description')} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Difficulty" htmlFor="p-diff">
            <Select id="p-diff" options={[{ value: 'EASY', label: 'Easy' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HARD', label: 'Hard' }]} {...register('difficulty')} />
          </Field>
          <Field label="Category" htmlFor="p-cat">
            <Select id="p-cat" options={CATEGORIES} {...register('category')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Time Limit (seconds)" htmlFor="p-time" error={errors.timeLimit?.message}>
            <Input id="p-time" type="number" min={1} max={10} error={!!errors.timeLimit} {...register('timeLimit')} />
          </Field>
          <Field label="Memory Limit (MB)" htmlFor="p-mem" error={errors.memoryLimit?.message}>
            <Input id="p-mem" type="number" min={16} max={512} error={!!errors.memoryLimit} {...register('memoryLimit')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Points" htmlFor="p-pts" error={errors.points?.message}>
            <Input id="p-pts" type="number" min={1} error={!!errors.points} {...register('points')} />
          </Field>
          <Field label="Sequence No." htmlFor="p-seq" error={errors.sequenceNo?.message}>
            <Input id="p-seq" type="number" min={1} error={!!errors.sequenceNo} {...register('sequenceNo')} />
          </Field>
        </div>

        <Field label="Input Format" htmlFor="p-inf" error={errors.inputFormat?.message} required>
          <Textarea id="p-inf" rows={3} placeholder="Describe the input format..." error={!!errors.inputFormat} {...register('inputFormat')} />
        </Field>

        <Field label="Output Format" htmlFor="p-outf" error={errors.outputFormat?.message} required>
          <Textarea id="p-outf" rows={3} placeholder="Describe the expected output..." error={!!errors.outputFormat} {...register('outputFormat')} />
        </Field>

        <Field label="Constraints" htmlFor="p-const" error={errors.constraintsText?.message} required>
          <Textarea id="p-const" rows={3} placeholder="e.g. 1 <= n <= 10^5" error={!!errors.constraintsText} {...register('constraintsText')} />
        </Field>

        <Field label="Explanation" htmlFor="p-expl" hint="Optional walkthrough of sample test cases">
          <Textarea id="p-expl" rows={3} placeholder="Optional explanation..." {...register('explanation')} />
        </Field>

        <Field label="Tags" htmlFor="p-tags" hint="Optional, comma-separated">
          <Input id="p-tags" placeholder="e.g. hash-map, two-pointer" {...register('tags')} />
        </Field>

        <Button type="submit" loading={mutation.isPending} className="w-full py-3">
          Create Problem & Add Test Cases
        </Button>
      </form>
    </div>
  );
}
