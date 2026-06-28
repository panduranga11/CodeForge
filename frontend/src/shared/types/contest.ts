export type ContestStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type Visibility = 'PUBLIC' | 'PRIVATE';
export type RegType = 'OPEN' | 'INVITE_ONLY';
export type ScoringMode = 'POINTS' | 'PENALTY_TIME' | 'PERCENTAGE';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type ProblemStatus = 'DRAFT' | 'PUBLISHED';
export type TestCaseType = 'SAMPLE' | 'HIDDEN';

export type ProblemCategory =
  | 'ARRAYS' | 'STRINGS' | 'LINKED_LIST' | 'TREES' | 'GRAPHS'
  | 'DYNAMIC_PROGRAMMING' | 'GREEDY' | 'BACKTRACKING'
  | 'SORTING' | 'SEARCHING' | 'MATH' | 'SQL'
  | 'SYSTEM_DESIGN' | 'MISCELLANEOUS';

export interface Contest {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: ContestStatus;
  visibility: Visibility;
  regType: RegType;
  scoringMode: ScoringMode;
  maxParticipants: number | null;
  inviteCode: string;
  inviteLink: string;
  hostId: string;
  participantCount: number;
  problemCount: number;
  createdAt: string;
}

export interface CreateContestRequest {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  visibility: Visibility;
  regType: RegType;
  scoringMode: ScoringMode;
  maxParticipants?: number;
}

export interface Problem {
  id: string;
  contestId: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  category: ProblemCategory;
  timeLimit: number;
  memoryLimit: number;
  inputFormat: string;
  outputFormat: string;
  constraintsText: string;
  explanation: string | null;
  tags: string | null;
  points: number;
  sequenceNo: number;
  status: ProblemStatus;
  sampleTestCases: TestCase[];
  createdAt: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  type: TestCaseType;
  scoreWeight: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  score: number;
  penaltyTime: number;
  problemsSolved: number;
  lastAcTime: string;
}

export interface JoinContestResponse {
  contestId: string;
  contestTitle: string;
  message: string;
}
