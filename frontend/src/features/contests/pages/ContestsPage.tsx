import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Users, Calendar, Plus, Compass, Cpu, Trophy } from 'lucide-react';
import { contestApi } from '@/features/contests/services/contestApi';
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

const PUBLIC_STATUS_FILTERS: Array<{ label: string; value: ContestStatus | 'ALL' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Upcoming', value: 'SCHEDULED' },
  { label: 'Completed', value: 'COMPLETED' },
];

const MY_STATUS_FILTERS: Array<{ label: string; value: ContestStatus | 'ALL' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Upcoming', value: 'SCHEDULED' },
  { label: 'Completed', value: 'COMPLETED' },
];

type Tab = 'all' | 'my';
type Role = 'hosting' | 'joined';

const STATUS_ACCENT: Record<string, string> = {
  ACTIVE: 'border-l-4 border-l-success',
  SCHEDULED: 'border-l-4 border-l-blue-400',
  DRAFT: 'border-l-4 border-l-ember-500',
  COMPLETED: 'border-l-4 border-l-forge-muted',
  CANCELLED: 'border-l-4 border-l-red-500',
};

function ContestCard({ contest, role }: { contest: Contest; role?: Role }) {
  return (
    <Link to={`/contests/${contest.id}`}>
      <Card interactive className={`h-full ${STATUS_ACCENT[contest.status] ?? ''}`}>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant={STATUS_BADGE_VARIANT[contest.status] ?? 'neutral'}>
              {CONTEST_STATUS_LABEL[contest.status]}
            </Badge>
            {contest.visibility === 'PRIVATE' && <Badge variant="neutral">Private</Badge>}
            {role && (
              <span className="ml-auto flex items-center gap-1 text-xs font-medium text-forge-muted">
                {role === 'hosting'
                  ? <><Cpu className="w-3 h-3 text-ember-400" /><span className="text-ember-400">Hosting</span></>
                  : <><Trophy className="w-3 h-3 text-blue-400" /><span className="text-blue-400">Joined</span></>
                }
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-forge-white mb-2 truncate">{contest.title}</h3>
          <p className="text-sm text-forge-muted line-clamp-2 mb-4">{contest.description}</p>
          <div className="flex items-center gap-3 text-xs text-steel-400">
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {contest.participantCount ?? 0}</span>
            <span className="mx-0.5 text-forge-border">·</span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDateTime(contest.startTime)}</span>
            <span className="mx-0.5 text-forge-border">·</span>
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
  const navigate = useNavigate();

  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: qk.contests('all', page),
    queryFn: () => contestApi.getAll(page, 12),
    enabled: activeTab === 'all',
  });

  const { data: hostedData, isLoading: hostedLoading } = useQuery({
    queryKey: qk.contests('my', page),
    queryFn: () => contestApi.myContests(0, 50),
    enabled: activeTab === 'my',
  });

  const { data: joinedData, isLoading: joinedLoading } = useQuery({
    queryKey: qk.contests('participating', page),
    queryFn: () => contestApi.participating(0, 50),
    enabled: activeTab === 'my',
  });

  // Merge hosted + joined, hosting takes precedence over joined
  const myContestsWithRole: Array<{ contest: Contest; role: Role }> = (() => {
    const map = new Map<string, { contest: Contest; role: Role }>();
    for (const c of joinedData?.data?.content ?? []) {
      map.set(c.id, { contest: c, role: 'joined' });
    }
    for (const c of hostedData?.data?.content ?? []) {
      map.set(c.id, { contest: c, role: 'hosting' });
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.contest.startTime).getTime() - new Date(a.contest.startTime).getTime()
    );
  })();

  const totalPages = activeTab === 'all' ? (allData?.data?.totalPages ?? 0) : 1;
  const isLoading = activeTab === 'all' ? allLoading : (hostedLoading || joinedLoading);

  const allContests = activeTab === 'all' ? (allData?.data?.content ?? []) : [];

  const filteredAll = allContests.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredMy = myContestsWithRole.filter(({ contest: c }) => {
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
          {(activeTab === 'my' ? MY_STATUS_FILTERS : PUBLIC_STATUS_FILTERS).map((f) => (
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
      ) : activeTab === 'all' ? (
        filteredAll.length === 0 ? (
          <EmptyState
            icon={<Compass className="h-12 w-12" />}
            title="No contests found"
            description="Try adjusting your filters or search terms"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAll.map((contest) => <ContestCard key={contest.id} contest={contest} />)}
          </div>
        )
      ) : (
        filteredMy.length === 0 ? (
          <EmptyState
            icon={<Compass className="h-12 w-12" />}
            title="No contests yet"
            description="Host a contest or join one to see it here"
            action={
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/contests/create')}>
                Host a Contest
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMy.map(({ contest, role }) => (
              <ContestCard key={contest.id} contest={contest} role={role} />
            ))}
          </div>
        )
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-8" />
    </div>
  );
}
