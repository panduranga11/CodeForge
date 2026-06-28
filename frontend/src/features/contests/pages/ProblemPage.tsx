import { useState, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Play, Clock, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import { contestApi } from '@/features/contests/services/contestApi';
import { executionApi } from '@/features/contests/services/executionApi';
import { useSubmissionJudge } from '@/features/contests/hooks/useSubmissionJudge';
import { qk } from '@/shared/constants/queryKeys';
import { LANGUAGE_LABEL, LANGUAGE_MONACO_ID } from '@/shared/constants/enums';
import { VERDICT_LABEL, VERDICT_COLOR } from '@/shared/lib/verdict';
import {
  Button, Badge, Select, Tabs, Spinner, Skeleton,
} from '@/shared/components/ui';
import { Topbar } from '@/shared/components/layout/Topbar';
import type { Language, Verdict } from '@/shared/types';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

const LANG_OPTIONS = (['JAVA', 'PYTHON', 'CPP', 'JAVASCRIPT'] as Language[]).map((l) => ({
  value: l,
  label: LANGUAGE_LABEL[l],
}));

const VERDICT_BADGE: Record<Verdict, 'ac' | 'wa' | 'ce' | 're' | 'tle' | 'mle' | 'pending'> = {
  PENDING: 'pending', AC: 'ac', WA: 'wa', CE: 'ce', RE: 're', TLE: 'tle', MLE: 'mle',
};

export function ProblemPage() {
  const { contestId, problemId } = useParams<{ contestId: string; problemId: string }>();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>('JAVA');
  const [sourceCode, setSourceCode] = useState('');
  const [activeTab, setActiveTab] = useState('description');
  const judge = useSubmissionJudge();

  const { data: problemData, isLoading } = useQuery({
    queryKey: qk.problem(contestId!, problemId!),
    queryFn: () => contestApi.getProblem(contestId!, problemId!),
    enabled: !!contestId && !!problemId,
  });

  const { data: submissionsData } = useQuery({
    queryKey: qk.submissions(contestId),
    queryFn: () => executionApi.getAll({ contestId }),
    enabled: !!contestId,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      executionApi.submit({
        problemId: problemId!,
        contestId,
        language,
        sourceCode,
      }),
    onSuccess: (data) => {
      toast.success('Solution submitted!');
      judge.startJudging(data.data.id);
    },
    onError: () => toast.error('Submission failed'),
  });

  const problem = problemData?.data;
  const submissions = (submissionsData?.data?.content ?? []).filter((s) => s.problemId === problemId);

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-96 mt-4" /></div>;
  }

  if (!problem) {
    return (
      <div className="p-8 text-center">
        <p className="text-forge-muted">Problem not found</p>
        <Button variant="surface" className="mt-4" onClick={() => navigate(`/contests/${contestId}`)}>Back</Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-forge-black">
      <Topbar
        backTo={`/contests/${contestId}`}
        backLabel="Contest"
        title={problem.title}
        right={
          <div className="flex items-center gap-3">
            <Badge variant={problem.difficulty === 'EASY' ? 'easy' : problem.difficulty === 'MEDIUM' ? 'medium' : 'hard'}>
              {problem.difficulty}
            </Badge>
            <span className="text-xs text-forge-muted flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {problem.timeLimit}s
            </span>
            <span className="text-xs text-forge-muted flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" /> {problem.memoryLimit}MB
            </span>
            <span className="text-sm font-medium text-ember-400">{problem.points} pts</span>
          </div>
        }
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
        {/* Left: Problem Statement */}
        <div className="border-r border-forge-border flex flex-col overflow-hidden">
          <Tabs
            tabs={[
              { value: 'description', label: 'Description' },
              { value: 'submissions', label: 'Submissions', count: submissions.length },
            ]}
            value={activeTab}
            onChange={setActiveTab}
            className="px-4"
          />

          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'description' ? (
              <div className="space-y-5 text-sm text-forge-text leading-relaxed">
                <p className="whitespace-pre-wrap">{problem.description}</p>

                <Section title="Input Format">
                  <p className="whitespace-pre-wrap">{problem.inputFormat}</p>
                </Section>

                <Section title="Output Format">
                  <p className="whitespace-pre-wrap">{problem.outputFormat}</p>
                </Section>

                <Section title="Constraints">
                  <p className="whitespace-pre-wrap">{problem.constraintsText}</p>
                </Section>

                {problem.sampleTestCases.length > 0 && (
                  <Section title="Sample Test Cases">
                    {problem.sampleTestCases.map((tc, idx) => (
                      <div key={tc.id} className="mb-4">
                        <p className="text-xs text-forge-muted mb-1.5">Example {idx + 1}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-steel-400 mb-1">Input</p>
                            <pre className="bg-forge-surface rounded-lg p-3 text-xs font-mono overflow-x-auto">{tc.input}</pre>
                          </div>
                          <div>
                            <p className="text-xs text-steel-400 mb-1">Output</p>
                            <pre className="bg-forge-surface rounded-lg p-3 text-xs font-mono overflow-x-auto">{tc.expectedOutput}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </Section>
                )}

                {problem.explanation && (
                  <Section title="Explanation">
                    <p className="whitespace-pre-wrap">{problem.explanation}</p>
                  </Section>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {submissions.length === 0 ? (
                  <p className="text-forge-muted text-sm text-center py-8">No submissions yet</p>
                ) : (
                  submissions.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-4 p-3 rounded-lg bg-forge-surface">
                      <Badge variant={VERDICT_BADGE[sub.verdict]}>{VERDICT_LABEL[sub.verdict]}</Badge>
                      <span className="text-xs text-forge-muted">{LANGUAGE_LABEL[sub.language]}</span>
                      {sub.executionTime != null && (
                        <span className="text-xs text-forge-muted">{sub.executionTime}ms</span>
                      )}
                      <span className="text-xs text-forge-muted ml-auto">
                        {sub.testResults.filter((t) => t.passed).length}/{sub.testResults.length} passed
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Code Editor */}
        <div className="flex flex-col overflow-hidden">
          {/* Editor Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-forge-border">
            <Select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              options={LANG_OPTIONS}
              className="w-40"
            />
            <Button
              leftIcon={submitMutation.isPending ? undefined : <Play className="h-4 w-4" />}
              loading={submitMutation.isPending}
              disabled={!sourceCode.trim()}
              onClick={() => submitMutation.mutate()}
            >
              Submit
            </Button>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1">
            <Suspense fallback={<div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>}>
              <MonacoEditor
                height="100%"
                language={LANGUAGE_MONACO_ID[language]}
                value={sourceCode}
                onChange={(v) => setSourceCode(v ?? '')}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  padding: { top: 16, bottom: 16 },
                  lineNumbers: 'on',
                  renderLineHighlight: 'line',
                  wordWrap: 'on',
                }}
              />
            </Suspense>
          </div>

          {/* Judge Result */}
          {judge.status !== 'idle' && (
            <div className={`px-4 py-3 border-t border-forge-border flex items-center gap-3 ${
              judge.verdict === 'AC' ? 'bg-success/5' :
              judge.status === 'judging' ? 'bg-blue-500/5' :
              'bg-red-500/5'
            }`}>
              {judge.status === 'judging' ? (
                <>
                  <Spinner size="sm" />
                  <span className="text-sm text-blue-400 font-medium">Judging...</span>
                  {judge.submission?.testResults && (
                    <span className="text-xs text-forge-muted">
                      {judge.submission.testResults.filter((t) => t.passed).length} tests passed
                    </span>
                  )}
                </>
              ) : judge.status === 'error' ? (
                <span className="text-sm text-red-400 font-medium">Judging timed out</span>
              ) : judge.verdict ? (
                <>
                  <Badge variant={VERDICT_BADGE[judge.verdict]}>{VERDICT_LABEL[judge.verdict]}</Badge>
                  {judge.submission?.executionTime != null && (
                    <span className="text-xs text-forge-muted">{judge.submission.executionTime}ms</span>
                  )}
                  {judge.submission?.testResults && (
                    <span className="text-xs text-forge-muted">
                      {judge.submission.testResults.filter((t) => t.passed).length}/{judge.submission.testResults.length} passed
                    </span>
                  )}
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={judge.reset}>Dismiss</Button>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-forge-muted uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}
