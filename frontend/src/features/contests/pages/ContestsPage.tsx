import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Search, Users, Clock, Plus, Compass } from 'lucide-react';
import { contestApi } from '@/features/contests/services/contestApi';
import { useAuthStore } from '@/features/auth/hooks/useAuthStore';
import { qk } from '@/shared/constants/queryKeys';
import { CONTEST_STATUS_LABEL } from '@/shared/constants/enums';
import { formatDateTime } from '@/shared/lib/format';
import {
  PageHeader, Tabs, Badge, Card, CardContent, Input, Button,
  Skeleton, EmptyState, Pagination,
} from '@/shared/components/ui';
import type { ContestStatus, Contest } from '@/shared/types';

const STATUS_BADGE_VARIANT: Record<string, 'active' | 'scheduled' | 'completed' | 'draft' | 'cancelled'> = {
  ACTIVE: 'active', SCHEDULED: 'scheduled', COMPLETED: 'completed', DRAFT: 'draft', CANCELLED: 'cancelled',
};

const statusFilters: Array<{ label: string; value: ContestStatus | 'ALL' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'Completed', value: 'COMPLETED' },
];

type Tab = 'all' | 'my';

function ContestCard({ contest }: { contest: Contest }) {
  return (
    <Link to={`/contests/${contest.id}`}>
      <Card interactive className="h-full">
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant={STATUS_BADGE_VARIANT[contest.status] ?? 'neutral'}>
              {CONTEST_STATUS_LABEL[contest.status]}
            </Badge>
            {contest.visibility === 'PRIVATE' && <Badge variant="neutral">Private</Badge>}
          </div>
          <h3 className="text-lg font-semibold text-forge-white mb-2 truncate">{contest.title}</h3>
          <p className="text-sm text-forge-muted line-clamp-2 mb-4">{contest.description}</p>
          <div className="flex items-center gap-4 text-xs text-steel-400">
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {contest.participantCount}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDateTime(contest.startTime)}</span>
            <span>{contest.problemCount} problems</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ContestsPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContestStatus | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: qk.contests('all', page),
    queryFn: () => contestApi.getAll(page, 12),
    enabled: activeTab === 'all',
  });

  const { data: myData, isLoading: myLoading } = useQuery({
    queryKey: qk.contests('my', page),
    queryFn: () => contestApi.getAll(page, 50),
    enabled: activeTab === 'my',
  });

  const rawContests = activeTab === 'all'
    ? (allData?.data?.content ?? [])
    : (myData?.data?.content ?? []).filter((c) => c.hostId === user?.id);

  const totalPages = activeTab === 'all' ? (allData?.data?.totalPages ?? 0) : 1;
  const isLoading = activeTab === 'all' ? allLoading : myLoading;

  const filtered = rawContests.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as Tab);
    setPage(0);
    setStatusFilter('ALL');
    setSearch('');
  };

  return (
    <div>
      <PageHeader
        title="Contests"
        subtitle="Browse and join coding competitions"
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/contests/create')}>
            Host a Contest
          </Button>
        }
      />

      <Tabs
        tabs={[
          { value: 'all', label: 'All Contests' },
          { value: 'my', label: 'My Contests' },
        ]}
        value={activeTab}
        onChange={handleTabChange}
        className="mb-6"
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search contests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex items-center gap-2">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                statusFilter === f.value
                  ? 'bg-ember-500/15 text-ember-400 border border-ember-500/25'
                  : 'text-forge-muted hover:text-forge-text hover:bg-forge-surface border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Compass className="h-12 w-12" />}
          title={activeTab === 'my' ? 'No contests hosted yet' : 'No contests found'}
          description={activeTab === 'my' ? 'Create your first contest and start hosting!' : 'Try adjusting your filters or search terms'}
          action={activeTab === 'my' ? (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/contests/create')}>
              Host a Contest
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((contest) => <ContestCard key={contest.id} contest={contest} />)}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-8" />
    </div>
  );
}
