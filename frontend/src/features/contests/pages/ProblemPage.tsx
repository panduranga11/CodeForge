import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Play, Clock, HardDrive, Lock, ChevronLeft, ChevronRight,
  Copy, Check, Terminal, WrapText, Minus, Plus, X,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { contestApi } from '@/features/contests/services/contestApi';
import { executionApi } from '@/features/contests/services/executionApi';
import { useSubmissionJudge } from '@/features/contests/hooks/useSubmissionJudge';
import { qk } from '@/shared/constants/queryKeys';
import { LANGUAGE_LABEL, LANGUAGE_MONACO_ID } from '@/shared/constants/enums';
import { VERDICT_LABEL } from '@/shared/lib/verdict';
import { cn } from '@/shared/lib/cn';
import { Button, Badge, Select, Tabs, Spinner, Skeleton } from '@/shared/components/ui';
import { Topbar } from '@/shared/components/layout/Topbar';
import type { Monaco } from '@monaco-editor/react';
import type { Language, Verdict, TestResult, RunResponse, Problem } from '@/shared/types';

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

function seqLabel(n: number) {
  return String.fromCharCode(64 + n);
}

function formatCountdown(ms: number) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function ProblemPage() {
  const { contestId, problemId } = useParams<{ contestId: string; problemId: string }>();
  const navigate = useNavigate();

  const [language, setLanguage] = useState<Language>('JAVA');
  const [sourceCode, setSourceCode] = useState('');
  const [activeTab, setActiveTab] = useState('description');
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on');

  // Resizable split
  const [splitPct, setSplitPct] = useState(35);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Run panel
  const [showRunPanel, setShowRunPanel] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [runResult, setRunResult] = useState<RunResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Countdown
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const judge = useSubmissionJudge();

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: problemData, isLoading, error } = useQuery({
    queryKey: qk.problem(contestId!, problemId!),
    queryFn: () => contestApi.getProblem(contestId!, problemId!),
    enabled: !!contestId && !!problemId,
    retry: false,
  });

  const { data: problemsData } = useQuery({
    queryKey: qk.problems(contestId!),
    queryFn: () => contestApi.getProblems(contestId!),
    enabled: !!contestId,
  });

  const { data: contestData } = useQuery({
    queryKey: qk.contest(contestId!),
    queryFn: () => contestApi.getById(contestId!),
    enabled: !!contestId,
  });

  const { data: submissionsData } = useQuery({
    queryKey: qk.submissions(contestId),
    queryFn: () => executionApi.getAll({ contestId }),
    enabled: !!contestId,
  });

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    const endTime = contestData?.data?.endTime;
    if (!endTime) return;
    const update = () => setTimeLeft(Math.max(0, new Date(endTime).getTime() - Date.now()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [contestData?.data?.endTime]);

  // ── Drag divider ─────────────────────────────────────────────────────────
  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(Math.max(pct, 20), 70));
    };
    const onMouseUp = () => { isDragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); submitMutation.mutate(); }
      if (e.ctrlKey && e.key === 'r')     { e.preventDefault(); handleRun(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ── Submit ────────────────────────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: () =>
      executionApi.submit({ problemId: problemId!, contestId, language, sourceCode }),
    onSuccess: (data) => { toast.success('Submitted!'); judge.startJudging(data.data.id); },
    onError: (err: import('axios').AxiosError<import('@/shared/types').ApiResponse<never>>) => {
      const code = err.response?.data?.errorCode;
      if (code === 'CONTEST_NOT_ACTIVE') {
        toast.error('Contest has ended — submissions are no longer accepted');
      } else {
        toast.error(err.response?.data?.message ?? 'Submission failed');
      }
    },
  });

  // ── Run ───────────────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!sourceCode.trim()) return;
    setShowRunPanel(true);
    setIsRunning(true);
    setRunResult(null);
    try {
      const res = await executionApi.run({ language, sourceCode, customInput });
      setRunResult(res.data);
    } catch {
      toast.error('Run failed');
    } finally {
      setIsRunning(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const problem = problemData?.data;
  const contest = contestData?.data;
  const sortedProblems: Problem[] = [...(problemsData?.data ?? [])].sort(
    (a, b) => a.sequenceNo - b.sequenceNo,
  );
  const currentIdx = sortedProblems.findIndex((p) => p.id === problemId);
  const prevProblem = currentIdx > 0 ? sortedProblems[currentIdx - 1] : null;
  const nextProblem = currentIdx < sortedProblems.length - 1 ? sortedProblems[currentIdx + 1] : null;
  const submissions = (submissionsData?.data?.content ?? []).filter((s) => s.problemId === problemId);

  const timerColor =
    timeLeft === null ? 'text-forge-muted' :
    timeLeft < 5 * 60 * 1000 ? 'text-red-400' :
    timeLeft < 10 * 60 * 1000 ? 'text-ember-400' :
    'text-forge-muted';

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col bg-forge-black overflow-hidden">
        <div className="h-14 border-b border-forge-border flex items-center px-4 gap-4 flex-shrink-0">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-5 w-56 flex-1" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div style={{ width: '35%' }} className="border-r border-forge-border p-6 space-y-3 flex-shrink-0">
            <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" /><Skeleton className="h-4 w-full mt-6" />
            <Skeleton className="h-4 w-3/4" /><Skeleton className="h-28 w-full mt-4 rounded-xl" />
          </div>
          <div className="flex-1 flex flex-col">
            <div className="h-14 border-b border-forge-border flex items-center px-4 gap-4">
              <Skeleton className="h-8 w-36" /><Skeleton className="h-8 w-24 ml-auto" />
            </div>
            <div className="flex-1 bg-[#111113]" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : null;
    const apiMessage = axios.isAxiosError(error) ? error.response?.data?.message : null;
    const isScheduled = apiMessage?.includes('not available yet');
    return (
      <div className="h-screen flex flex-col bg-forge-black overflow-hidden">
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-forge-black overflow-hidden">
      {/* Topbar */}
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
            {timeLeft !== null && (
              <span className={cn('text-sm font-mono font-semibold tabular-nums flex items-center gap-1.5 ml-1', timerColor)}>
                <Clock className="w-3.5 h-3.5" />
                {formatCountdown(timeLeft)}
              </span>
            )}
          </div>
        }
      />

      {/* Main split */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden min-h-0">

        {/* ── Left: Problem Panel ──────────────────────────────────────────── */}
        <div
          style={{ width: `${splitPct}%` }}
          className="flex flex-col overflow-hidden flex-shrink-0 min-w-0"
        >
          {/* Problem navigation strip */}
          {sortedProblems.length > 0 && (
            <div className="flex items-center gap-1 px-3 py-2 border-b border-forge-border bg-forge-surface/30 flex-shrink-0">
              <button
                onClick={() => prevProblem && navigate(`/contests/${contestId}/problems/${prevProblem.id}`)}
                disabled={!prevProblem}
                className="p-1 rounded hover:bg-forge-surface disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-forge-muted" />
              </button>

              <div className="flex items-center gap-1 flex-1 justify-center">
                {sortedProblems.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/contests/${contestId}/problems/${p.id}`)}
                    title={p.title}
                    className={cn(
                      'w-7 h-7 rounded text-xs font-bold transition-all duration-150',
                      p.id === problemId
                        ? 'bg-ember-500/20 text-ember-400 ring-1 ring-ember-500/40'
                        : 'text-forge-muted hover:text-forge-text hover:bg-forge-surface',
                    )}
                  >
                    {seqLabel(p.sequenceNo)}
                  </button>
                ))}
              </div>

              <button
                onClick={() => nextProblem && navigate(`/contests/${contestId}/problems/${nextProblem.id}`)}
                disabled={!nextProblem}
                className="p-1 rounded hover:bg-forge-surface disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 text-forge-muted" />
              </button>
            </div>
          )}

          {/* Tabs */}
          <Tabs
            tabs={[
              { value: 'description', label: 'Description' },
              { value: 'submissions', label: 'Submissions', count: submissions.length },
            ]}
            value={activeTab}
            onChange={setActiveTab}
            className="px-4 flex-shrink-0"
          />

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 min-h-0">
            {activeTab === 'description' ? (
              <div className="space-y-6 text-sm text-forge-text leading-relaxed">
                <p className="whitespace-pre-wrap text-[0.9rem] leading-7">{problem.description}</p>

                <Section title="Input Format">
                  <p className="whitespace-pre-wrap">{problem.inputFormat}</p>
                </Section>

                <Section title="Output Format">
                  <p className="whitespace-pre-wrap">{problem.outputFormat}</p>
                </Section>

                <Section title="Constraints">
                  <p className="whitespace-pre-wrap font-mono text-xs text-forge-text/90 leading-6">
                    {problem.constraintsText}
                  </p>
                </Section>

                {problem.sampleTestCases.length > 0 && (
                  <Section title="Sample Test Cases">
                    {problem.sampleTestCases.map((tc, idx) => (
                      <div key={tc.id} className="mb-5">
                        <p className="text-xs font-semibold text-forge-muted mb-2">Example {idx + 1}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <TestCaseBox label="Input" value={tc.input} />
                          <TestCaseBox label="Output" value={tc.expectedOutput} />
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
                    <div key={sub.id} className="flex items-center gap-4 p-3 rounded-lg bg-forge-surface border border-forge-border/50">
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

        {/* ── Drag Handle ───────────────────────────────────────────────────── */}
        <div
          onMouseDown={onDividerMouseDown}
          className="w-1 flex-shrink-0 bg-forge-border hover:bg-ember-500/50 active:bg-ember-500/70 cursor-col-resize transition-colors duration-150 relative group select-none"
        >
          <div className="absolute inset-y-0 -left-2 -right-2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1 h-1 rounded-full bg-ember-400/80 block" />
            ))}
          </div>
        </div>

        {/* ── Right: Editor Panel ───────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Editor toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-forge-border flex-shrink-0">
            <Select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              options={LANG_OPTIONS}
              className="w-36"
            />

            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => setFontSize((s) => Math.max(10, s - 1))}
                className="p-1.5 rounded text-forge-muted hover:text-forge-text hover:bg-forge-surface transition-colors"
                title="Decrease font size"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs text-forge-muted w-6 text-center tabular-nums">{fontSize}</span>
              <button
                onClick={() => setFontSize((s) => Math.min(24, s + 1))}
                className="p-1.5 rounded text-forge-muted hover:text-forge-text hover:bg-forge-surface transition-colors"
                title="Increase font size"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <button
              onClick={() => setWordWrap((w) => w === 'on' ? 'off' : 'on')}
              className={cn(
                'p-1.5 rounded transition-colors',
                wordWrap === 'on'
                  ? 'text-ember-400 bg-ember-500/10'
                  : 'text-forge-muted hover:text-forge-text hover:bg-forge-surface',
              )}
              title="Toggle word wrap"
            >
              <WrapText className="w-3.5 h-3.5" />
            </button>

            <div className="flex-1" />

            <button
              onClick={() => { setShowRunPanel((v) => !v); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                showRunPanel
                  ? 'bg-forge-surface text-forge-text ring-1 ring-forge-border'
                  : 'text-forge-muted hover:text-forge-text hover:bg-forge-surface',
              )}
              title="Toggle run panel (Ctrl+R)"
            >
              <Terminal className="w-3.5 h-3.5" />
              Console
            </button>

            <Button
              leftIcon={submitMutation.isPending ? undefined : <Play className="h-3.5 w-3.5" />}
              loading={submitMutation.isPending}
              disabled={!sourceCode.trim()}
              onClick={() => submitMutation.mutate()}
              size="sm"
              title="Submit (Ctrl+Enter)"
            >
              Submit
            </Button>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-0">
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
                  fontSize,
                  fontFamily: "'JetBrains Mono', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  padding: { top: 16, bottom: 16 },
                  lineNumbers: 'on',
                  renderLineHighlight: 'line',
                  wordWrap,
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                }}
              />
            </Suspense>
          </div>

          {/* Run Panel */}
          {showRunPanel && (
            <div className="flex-shrink-0 border-t border-forge-border bg-[#0e0e10]" style={{ height: 220 }}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-forge-border/60">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-forge-muted" />
                  <span className="text-xs font-semibold text-forge-muted uppercase tracking-wider">Console</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="surface"
                    leftIcon={isRunning ? undefined : <Play className="w-3 h-3" />}
                    loading={isRunning}
                    disabled={!sourceCode.trim()}
                    onClick={handleRun}
                  >
                    Run
                  </Button>
                  <button
                    onClick={() => setShowRunPanel(false)}
                    className="p-1 rounded text-forge-muted hover:text-forge-text hover:bg-forge-surface transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex h-[calc(100%-41px)]">
                {/* Custom Input */}
                <div className="w-1/2 border-r border-forge-border/60 flex flex-col">
                  <p className="text-[10px] font-semibold text-forge-muted uppercase tracking-wider px-3 pt-2 pb-1">
                    Custom Input
                  </p>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="flex-1 bg-transparent text-xs font-mono text-forge-text px-3 pb-2 resize-none outline-none placeholder:text-forge-muted/50"
                    placeholder="Enter input..."
                    spellCheck={false}
                  />
                </div>
                {/* Output */}
                <div className="flex-1 flex flex-col">
                  <p className="text-[10px] font-semibold text-forge-muted uppercase tracking-wider px-3 pt-2 pb-1">
                    Output
                    {runResult && (
                      <span className="ml-2 text-forge-muted/60 font-normal normal-case tracking-normal">
                        {runResult.executionTimeMs}ms
                      </span>
                    )}
                  </p>
                  <div className="flex-1 px-3 pb-2 overflow-auto">
                    {isRunning ? (
                      <div className="flex items-center gap-2 pt-1">
                        <Spinner size="sm" />
                        <span className="text-xs text-forge-muted">Running...</span>
                      </div>
                    ) : runResult ? (
                      runResult.compiled ? (
                        <pre className={cn(
                          'text-xs font-mono whitespace-pre-wrap',
                          runResult.stderr ? 'text-red-400' : 'text-green-400',
                        )}>
                          {runResult.stderr || runResult.stdout || '(no output)'}
                        </pre>
                      ) : (
                        <pre className="text-xs font-mono text-red-400 whitespace-pre-wrap">
                          Compilation Error:{'\n'}{runResult.stderr}
                        </pre>
                      )
                    ) : (
                      <p className="text-xs text-forge-muted/50 pt-1">Press Run to see output</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Judge Result */}
          {judge.status !== 'idle' && (
            <div className={cn(
              'border-t transition-all duration-300 flex-shrink-0',
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

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-bold text-steel-400 uppercase tracking-widest mb-3 flex items-center gap-2">
        <span className="w-4 h-px bg-steel-600 block" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function TestCaseBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-steel-400">{label}</p>
        <button
          onClick={copy}
          className="p-1 rounded text-forge-muted hover:text-forge-text transition-colors"
          title="Copy"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
      <pre className="bg-forge-surface border border-forge-border/50 rounded-lg p-3 text-xs font-mono overflow-x-auto text-forge-text leading-5">
        {value}
      </pre>
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
