import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, CheckCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { contestApi } from '@/features/contests/services/contestApi';
import { qk } from '@/shared/constants/queryKeys';
import {
  PageHeader, Field, Textarea, Select, Input, Button, Card,
  Badge, Skeleton, EmptyState,
} from '@/shared/components/ui';
import type { AxiosError } from 'axios';
import type { ApiResponse, TestCaseType } from '@/shared/types';

export function AddTestCasePage() {
  const { contestId, problemId } = useParams<{ contestId: string; problemId: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [input, setInput] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [type, setType] = useState<TestCaseType>('SAMPLE');
  const [scoreWeight, setScoreWeight] = useState(0);

  const { data: problemData } = useQuery({
    queryKey: qk.problem(contestId!, problemId!),
    queryFn: () => contestApi.getProblem(contestId!, problemId!),
    enabled: !!contestId && !!problemId,
  });

  const { data: testCasesData, isLoading } = useQuery({
    queryKey: qk.testCases(contestId!, problemId!),
    queryFn: () => contestApi.getTestCases(contestId!, problemId!),
    enabled: !!contestId && !!problemId,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      contestApi.createTestCase(contestId!, problemId!, { input, expectedOutput, type, scoreWeight }),
    onSuccess: () => {
      toast.success('Test case added!');
      setInput(''); setExpectedOutput(''); setScoreWeight(0);
      queryClient.invalidateQueries({ queryKey: qk.testCases(contestId!, problemId!) });
    },
    onError: (err: AxiosError<ApiResponse<never>>) => toast.error(err.response?.data?.message ?? 'Failed to add test case'),
  });

  const problem = problemData?.data;
  const testCases = testCasesData?.data ?? [];
  const sampleCases = testCases.filter((tc) => tc.type === 'SAMPLE');
  const hiddenCases = testCases.filter((tc) => tc.type === 'HIDDEN');

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Test Cases"
        subtitle={problem ? `For problem: ${problem.title}` : undefined}
        actions={
          testCases.length > 0 ? (
            <Button variant="surface" leftIcon={<CheckCircle className="h-4 w-4 text-success" />} onClick={() => navigate(`/contests/${contestId}`)}>
              Done
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Add */}
        <div>
          <h2 className="text-lg font-semibold text-forge-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-ember-500" /> Add Test Case
          </h2>

          <Card>
            <div className="space-y-4">
              <Field label="Input" htmlFor="tc-input">
                <Textarea id="tc-input" rows={4} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter test input..." className="font-mono" />
              </Field>

              <Field label="Expected Output" htmlFor="tc-output">
                <Textarea id="tc-output" rows={4} value={expectedOutput} onChange={(e) => setExpectedOutput(e.target.value)} placeholder="Enter expected output..." className="font-mono" />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Type" htmlFor="tc-type">
                  <Select
                    id="tc-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as TestCaseType)}
                    options={[
                      { value: 'SAMPLE', label: 'Sample (visible)' },
                      { value: 'HIDDEN', label: 'Hidden (grading)' },
                    ]}
                  />
                </Field>
                <Field label="Score Weight" htmlFor="tc-weight">
                  <Input id="tc-weight" type="number" min={0} value={scoreWeight} onChange={(e) => setScoreWeight(Number(e.target.value))} />
                </Field>
              </div>

              <Button
                className="w-full"
                loading={addMutation.isPending}
                disabled={!input.trim() || !expectedOutput.trim()}
                onClick={() => addMutation.mutate()}
              >
                Add Test Case
              </Button>
            </div>
          </Card>
        </div>

        {/* Right: Existing */}
        <div>
          <h2 className="text-lg font-semibold text-forge-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Existing ({testCases.length})
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : testCases.length === 0 ? (
            <EmptyState title="No test cases yet" description="Add your first one!" />
          ) : (
            <div className="space-y-4">
              {sampleCases.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-forge-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Sample Cases ({sampleCases.length})
                  </h3>
                  <div className="space-y-2">
                    {sampleCases.map((tc, idx) => (
                      <Card key={tc.id}>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="ac">Sample #{idx + 1}</Badge>
                          {tc.scoreWeight > 0 && <span className="text-xs text-forge-muted">Weight: {tc.scoreWeight}</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] text-steel-400 uppercase tracking-wider mb-1">Input</p>
                            <pre className="bg-forge-surface rounded-lg p-2.5 text-xs font-mono text-forge-text overflow-x-auto max-h-24">{tc.input}</pre>
                          </div>
                          <div>
                            <p className="text-[10px] text-steel-400 uppercase tracking-wider mb-1">Output</p>
                            <pre className="bg-forge-surface rounded-lg p-2.5 text-xs font-mono text-forge-text overflow-x-auto max-h-24">{tc.expectedOutput}</pre>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {hiddenCases.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-forge-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5" /> Hidden Cases ({hiddenCases.length})
                  </h3>
                  <div className="space-y-2">
                    {hiddenCases.map((tc, idx) => (
                      <Card key={tc.id} className="border-violet-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="neutral">Hidden #{idx + 1}</Badge>
                          {tc.scoreWeight > 0 && <span className="text-xs text-forge-muted">Weight: {tc.scoreWeight}</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] text-steel-400 uppercase tracking-wider mb-1">Input</p>
                            <pre className="bg-forge-surface rounded-lg p-2.5 text-xs font-mono text-forge-text overflow-x-auto max-h-24">{tc.input}</pre>
                          </div>
                          <div>
                            <p className="text-[10px] text-steel-400 uppercase tracking-wider mb-1">Output</p>
                            <pre className="bg-forge-surface rounded-lg p-2.5 text-xs font-mono text-forge-text overflow-x-auto max-h-24">{tc.expectedOutput}</pre>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
