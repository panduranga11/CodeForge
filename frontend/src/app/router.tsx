import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { ProtectedRoute } from '@/shared/components/feedback/ProtectedRoute';
import { GuestRoute } from '@/shared/components/feedback/GuestRoute';
import { NotFound } from '@/shared/components/feedback/NotFound';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { OAuthCallbackPage } from '@/features/auth/pages/OAuthCallbackPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { ContestsPage } from '@/features/contests/pages/ContestsPage';
import { ContestDetailPage } from '@/features/contests/pages/ContestDetailPage';
import { CreateContestPage } from '@/features/contests/pages/CreateContestPage';
import { ProblemPage } from '@/features/contests/pages/ProblemPage';
import { AddProblemPage } from '@/features/contests/pages/AddProblemPage';
import { AddTestCasePage } from '@/features/contests/pages/AddTestCasePage';
import { LeaderboardPage } from '@/features/contests/pages/LeaderboardPage';
import { ProfilePage } from '@/features/profile/pages/ProfilePage';
import { JoinContestPage } from '@/features/contests/pages/JoinContestPage';
import { KitchenSinkPage } from '@/features/kitchensink/pages/KitchenSinkPage';
import { Navigate } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  { path: '/oauth/callback', element: <OAuthCallbackPage /> },
  { path: '/join/:inviteCode', element: <JoinContestPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/contests', element: <ContestsPage /> },
          { path: '/contests/create', element: <CreateContestPage /> },
          { path: '/contests/:id', element: <ContestDetailPage /> },
          { path: '/contests/:contestId/problems/add', element: <AddProblemPage /> },
          { path: '/contests/:contestId/problems/:problemId/testcases', element: <AddTestCasePage /> },
          { path: '/contests/:contestId/leaderboard', element: <LeaderboardPage /> },
          { path: '/profile', element: <ProfilePage /> },
        ],
      },
      { path: '/contests/:contestId/problems/:problemId', element: <ProblemPage /> },
    ],
  },
  { path: '/_kitchensink', element: <KitchenSinkPage /> },
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <NotFound /> },
]);
