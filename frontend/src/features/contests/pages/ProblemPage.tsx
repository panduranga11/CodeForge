import { useState, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Play, Clock, HardDrive, Lock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { contestApi } from '@/features/contests/services/contestApi';
import { executionApi } from '@/features/contests/services/executionApi';
import { useSubmissionJudge } from '@/features/contests/hooks/useSubmissionJudge';
import { qk } from '@/shared/constants/queryKeys';
import { LANGUAGE_LABEL, LANGUAGE_MONACO_ID } from '@/shared/constants/enums';
import { VERDICT_LABEL, VERDICT_COLOR } from '@/shared/lib/verdict';
import { cn } from '@/shared/lib/cn';
import {
  Button, Badge, Select, Tabs, Spinner, Skeleton,
} from '@/shared/components/ui';
import { Topbar } from '@/shared/components/layout/Topbar';
import type { Monaco } from '@monaco-editor/react';
import type { Language, Verdict, TestResult } from '@/shared/types';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

function defineForgeTheme(monaco: Monaco) {
  monaco.editor.defineTheme('forge-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'fb923c' },
      { token: 'string', foreground: '86efac' },
      { token: 'comment', foreground: '52525b', fontStyle: 'italic' },
      { token: 'number', foreground: 'c084fc' },
      { token: 'type', foreground: '60a5fa' },
      { token: 'delimiter', foreground: '71717a' },
    ],
    colors: {
      'editor.background': '#111113',
      'editor.foreground': '#e4e4e7',
      'editor.lineHighlightBackground': '#18181b80',
      'editor.selectionBackground': '#f9731625',
      'editor.inactiveSelectionBackground': '#f9731610',
      'editorLineNumber.foreground': '#3f3f46',
      'editorLineNumber.activeForeground': '#71717a',
      'editorCursor.foreground': '#f97316',
      'editor.findMatchBackground': '#f9731640',
      'editorIndentGuide.background1': '#27272a',
      'editorIndentGuide.activeBackground1': '#3f3f46',
      'scrollbarSlider.background': '#27272a80',
      'scrollbarSlider.hoverBackground': '#3f3f46',
    },
  });
}

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

  const { data: problemData, isLoading, error } = useQuery({
    queryKey: qk.problem(contestId!, problemId!),
    queryFn: () => contestApi.getProblem(contestId!, problemId!),
    enabled: !!contestId && !!problemId,
    retry: false,
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
    return (
      <div className="h-screen flex flex-col bg-forge-black">
        <div className="h-14 border-b border-forge-border flex items-center px-4 gap-4 flex-shrink-0">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-5 w-56 flex-1" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-14" />
        </div>
        <div className="flex-1 grid grid-cols-2 overflow-hidden">
          <div className="border-r border-forge-border p-6 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full mt-6" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-28 w-full mt-4 rounded-xl" />
            <Skeleton className="h-4 w-full mt-4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex flex-col">
            <div className="h-14 border-b border-forge-border flex items-center px-4 gap-4">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-8 w-24 ml-auto" />
            </div>
            <div className="flex-1 bg-[#111113]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : null;
    const apiMessage = axios.isAxiosError(error) ? error.response?.data?.message : null;
    const isScheduled = apiMessage?.includes('not available yet');
    return (
      <div className="h-screen flex flex-col bg-forge-black">
        <Topbar title="Problems" onBack={() => navigate(`/contests/${contestId}`)} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-forge-surface border border-forge-border flex items-center justify-center">
            <Lock className="w-7 h-7 text-forge-muted" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-forge-white mb-1">
              {status === 403
                ? isScheduled ? 'Contest Not Started Yet' : 'Registration Required'
                : 'Problem Unavailable'}
            </h2>
            <p className="text-sm text-forge-muted max-w-xs">
              {status === 403
                ? isScheduled
                  ? 'Problems will be unlocked when the contest goes live.'
                  : 'You need to register for this contest to access its problems.'
                : 'This problem could not be loaded.'}
            </p>
          </div>
          <Button variant="surface" onClick={() => navigate(`/contests/${contestId}`)}>
            Back to Contest
          </Button>
        </div>
      </div>
    );
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
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center h-full gap-3 bg-[#111113]">
                <Spinner size="lg" />
                <span className="text-xs text-forge-muted">Loading editor...</span>
              </div>
            }>
              <MonacoEditor
                height="100%"
                language={LANGUAGE_MONACO_ID[language]}
                value={sourceCode}
                onChange={(v) => setSourceCode(v ?? '')}
                theme="forge-dark"
                beforeMount={defineForgeTheme}
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  padding: { top: 16, bottom: 16 },
                  lineNumbers: 'on',
                  renderLineHighlight: 'line',
                  wordWrap: 'on',
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                }}
              />
            </Suspense>
          </div>

          {/* Judge Result */}
          {judge.status !== 'idle' && (
            <div className={cn(
              'border-t transition-all duration-300',
              judge.verdict === 'AC'
                ? 'border-t-success/40 bg-success/5'
                : judge.status === 'judging'
                ? 'border-t-forge-border bg-forge-surface/60'
                : judge.status === 'error'
                ? 'border-t-forge-border bg-forge-surface/60'
                : 'border-t-destructive/40 bg-red-500/5',
            )}>
              <div className="px-4 py-3">
                {judge.status === 'judging' ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                      </span>
                      <span className="text-sm font-medium text-blue-300">Judging your solution</span>
                      {judge.submission?.testResults && judge.submission.testResults.length > 0 && (
                        <span className="text-xs text-forge-muted">
                          · {judge.submission.testResults.filter((t) => t.passed).length} passed
                          {judge.submission.testResults.some((t) => !t.passed) && (
                            <span className="text-red-400 ml-1">
                              · {judge.submission.testResults.filter((t) => !t.passed).length} failed
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <JudgeDots testResults={judge.submission?.testResults} judging />
                  </>
                ) : judge.status === 'error' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-400 font-medium">Judging timed out — please try again</span>
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={judge.reset}>Dismiss</Button>
                  </div>
                ) : judge.verdict ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Badge variant={VERDICT_BADGE[judge.verdict]}>{VERDICT_LABEL[judge.verdict]}</Badge>
                      {judge.submission?.executionTime != null && (
                        <span className="text-xs text-forge-muted">{judge.submission.executionTime}ms</span>
                      )}
                      {judge.submission?.testResults && (
                        <span className="text-xs text-forge-muted">
                          {judge.submission.testResults.filter((t) => t.passed).length}/{judge.submission.testResults.length} tests passed
                        </span>
                      )}
                      {judge.submission?.memoryUsed != null && (
                        <span className="text-xs text-forge-muted">{judge.submission.memoryUsed} KB</span>
                      )}
                      <Button variant="ghost" size="sm" className="ml-auto" onClick={judge.reset}>Dismiss</Button>
                    </div>
                    <JudgeDots testResults={judge.submission?.testResults} judging={false} />
                    {judge.submission?.errorMessage && (
                      <pre className="mt-2 text-xs font-mono text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 overflow-x-auto max-h-28 whitespace-pre-wrap">
                        {judge.submission.errorMessage}
                      </pre>
                    )}
                  </>
                ) : null}
              </div>
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

function JudgeDots({ testResults, judging }: { testResults?: TestResult[]; judging: boolean }) {
  const results = testResults ?? [];
  if (results.length === 0 && !judging) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-2">
      {results.map((r, i) => (
        <span
          key={i}
          title={r.passed ? `Test ${i + 1}: Passed (${r.executionTime}ms)` : `Test ${i + 1}: Failed`}
          className={cn(
            'inline-block w-3 h-3 rounded-full transition-all duration-300',
            r.passed
              ? 'bg-success shadow-[0_0_6px_rgba(34,197,94,0.6)]'
              : 'bg-destructive shadow-[0_0_6px_rgba(239,68,68,0.6)]',
          )}
        />
      ))}
      {judging &&
        [0, 1, 2, 3, 4].map((i) => (
          <span
            key={`p-${i}`}
            className="inline-block w-3 h-3 rounded-full bg-forge-border animate-pulse"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}
    </div>
  );
}
