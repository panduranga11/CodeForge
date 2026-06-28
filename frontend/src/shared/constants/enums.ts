import type { ContestStatus, Difficulty, Language, Verdict } from '@/shared/types';

export const CONTEST_STATUS_LABEL: Record<ContestStatus, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  ACTIVE: 'Live',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const CONTEST_STATUS_COLOR: Record<ContestStatus, string> = {
  DRAFT: 'text-forge-muted',
  SCHEDULED: 'text-blue-400',
  ACTIVE: 'text-success',
  COMPLETED: 'text-steel-400',
  CANCELLED: 'text-red-400',
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  EASY: 'text-success',
  MEDIUM: 'text-warning',
  HARD: 'text-red-500',
};

export const LANGUAGE_LABEL: Record<Language, string> = {
  JAVA: 'Java',
  PYTHON: 'Python',
  CPP: 'C++',
  JAVASCRIPT: 'JavaScript',
};

export const LANGUAGE_MONACO_ID: Record<Language, string> = {
  JAVA: 'java',
  PYTHON: 'python',
  CPP: 'cpp',
  JAVASCRIPT: 'javascript',
};

export const LANGUAGES: Language[] = ['JAVA', 'PYTHON', 'CPP', 'JAVASCRIPT'];

export const VERDICT_LABEL: Record<Verdict, string> = {
  PENDING: 'Judging',
  AC: 'Accepted',
  WA: 'Wrong Answer',
  CE: 'Compilation Error',
  RE: 'Runtime Error',
  TLE: 'Time Limit Exceeded',
  MLE: 'Memory Limit Exceeded',
};
