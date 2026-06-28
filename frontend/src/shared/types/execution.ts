export type Language = 'JAVA' | 'PYTHON' | 'CPP' | 'JAVASCRIPT';
export type Verdict = 'PENDING' | 'AC' | 'WA' | 'CE' | 'RE' | 'TLE' | 'MLE';

export interface Submission {
  id: string;
  userId: string;
  problemId: string;
  contestId: string | null;
  language: Language;
  verdict: Verdict;
  executionTime: number | null;
  memoryUsed: number | null;
  errorMessage: string | null;
  submittedAt: string;
  testResults: TestResult[];
}

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  executionTime: number;
  memoryUsed: number;
}

export interface CreateSubmissionRequest {
  problemId: string;
  contestId?: string;
  language: Language;
  sourceCode: string;
}
