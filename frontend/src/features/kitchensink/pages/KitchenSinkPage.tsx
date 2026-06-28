import { useState } from 'react';
import { Search, Plus, Trash2, Trophy, Code, Users, Zap } from 'lucide-react';
import {
  Button, Input, Textarea, Select, Label, Field,
  Card, CardHeader, CardTitle, CardContent,
  Badge, Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter,
  Tabs, Skeleton, Spinner, EmptyState, StatCard,
  PageHeader, Pagination, CopyButton, Avatar, Tooltip,
} from '@/shared/components/ui';
import { Logo } from '@/shared/components/brand/Logo';

export function KitchenSinkPage() {
  const [tab, setTab] = useState('buttons');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [selectVal, setSelectVal] = useState('');

  return (
    <div className="min-h-screen bg-forge-black p-8 space-y-12">
      <PageHeader
        title="Kitchen Sink"
        subtitle="Every design system primitive in one place"
        actions={<Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>Action</Button>}
      />

      {/* Brand */}
      <Section title="Brand">
        <div className="flex items-center gap-8">
          <Logo size="sm" />
          <Logo size="md" />
          <Logo size="lg" />
          <Logo size="md" showText={false} />
        </div>
      </Section>

      {/* Buttons */}
      <Section title="Button">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="surface">Surface</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="icon"><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button leftIcon={<Plus className="h-4 w-4" />}>With Icon</Button>
          <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />}>Delete</Button>
        </div>
      </Section>

      {/* Form Controls */}
      <Section title="Form Controls">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          <Field label="Email" htmlFor="email" required>
            <Input id="email" placeholder="you@example.com" leftIcon={<Search className="h-4 w-4" />} />
          </Field>
          <Field label="With Error" htmlFor="err" error="This field is required" required>
            <Input id="err" placeholder="Error state" error />
          </Field>
          <Field label="Select Language" htmlFor="lang">
            <Select
              id="lang"
              value={selectVal}
              onChange={(e) => setSelectVal(e.target.value)}
              placeholder="Choose..."
              options={[
                { value: 'JAVA', label: 'Java' },
                { value: 'PYTHON', label: 'Python' },
                { value: 'CPP', label: 'C++' },
              ]}
            />
          </Field>
          <Field label="Description" htmlFor="desc" hint="Max 500 characters">
            <Textarea id="desc" placeholder="Enter description..." />
          </Field>
        </div>
      </Section>

      {/* Badges */}
      <Section title="Badge">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-forge-muted w-20">Status:</span>
            <Badge variant="draft">Draft</Badge>
            <Badge variant="scheduled">Scheduled</Badge>
            <Badge variant="active">Live</Badge>
            <Badge variant="completed">Completed</Badge>
            <Badge variant="cancelled">Cancelled</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-forge-muted w-20">Verdict:</span>
            <Badge variant="ac">AC</Badge>
            <Badge variant="wa">WA</Badge>
            <Badge variant="ce">CE</Badge>
            <Badge variant="re">RE</Badge>
            <Badge variant="tle">TLE</Badge>
            <Badge variant="mle">MLE</Badge>
            <Badge variant="pending">Judging</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-forge-muted w-20">Difficulty:</span>
            <Badge variant="easy">Easy</Badge>
            <Badge variant="medium">Medium</Badge>
            <Badge variant="hard">Hard</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-forge-muted w-20">Other:</span>
            <Badge variant="neutral">Neutral</Badge>
            <Badge variant="ember">Ember</Badge>
          </div>
        </div>
      </Section>

      {/* Cards */}
      <Section title="Card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader><CardTitle>Default Card</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-forge-muted">Basic card content</p></CardContent>
          </Card>
          <Card interactive>
            <CardHeader><CardTitle>Interactive</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-forge-muted">Hover me for glow effect</p></CardContent>
          </Card>
          <Card glow>
            <CardHeader><CardTitle>Glow</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-forge-muted">Always glowing</p></CardContent>
          </Card>
        </div>
      </Section>

      {/* Tabs */}
      <Section title="Tabs">
        <Tabs
          tabs={[
            { value: 'buttons', label: 'Buttons' },
            { value: 'forms', label: 'Forms', count: 4 },
            { value: 'feedback', label: 'Feedback' },
          ]}
          value={tab}
          onChange={setTab}
        />
        <p className="mt-3 text-sm text-forge-muted">Selected: {tab}</p>
      </Section>

      {/* Stat Cards */}
      <Section title="StatCard">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={<Trophy className="h-5 w-5" />} label="Contests" value={12} />
          <StatCard icon={<Code className="h-5 w-5" />} label="Submissions" value={148} accent="text-blue-400" />
          <StatCard icon={<Users className="h-5 w-5" />} label="Problems Solved" value={42} accent="text-success" />
        </div>
      </Section>

      {/* Avatar */}
      <Section title="Avatar">
        <div className="flex items-center gap-4">
          <Avatar name="John Doe" size="sm" />
          <Avatar name="Jane Smith" size="md" />
          <Avatar name="Bob" size="lg" />
        </div>
      </Section>

      {/* Loading States */}
      <Section title="Loading States">
        <div className="flex items-center gap-6 mb-4">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </div>
        <div className="space-y-3 max-w-md">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Section>

      {/* Empty State */}
      <Section title="EmptyState">
        <EmptyState
          icon={<Zap className="h-12 w-12" />}
          title="No contests yet"
          description="Create your first contest to get started"
          action={<Button leftIcon={<Plus className="h-4 w-4" />}>Create Contest</Button>}
        />
      </Section>

      {/* Tooltip & Copy */}
      <Section title="Tooltip & CopyButton">
        <div className="flex items-center gap-6">
          <Tooltip content="This is a tooltip">
            <Button variant="surface">Hover me</Button>
          </Tooltip>
          <CopyButton value="ABC-123-XYZ">Copy Invite Code</CopyButton>
        </div>
      </Section>

      {/* Dialog */}
      <Section title="Dialog">
        <Button variant="surface" onClick={() => setDialogOpen(true)}>Open Dialog</Button>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-forge-muted">Are you sure you want to proceed? This action cannot be undone.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => setDialogOpen(false)}>Delete</Button>
          </DialogFooter>
        </Dialog>
      </Section>

      {/* Pagination */}
      <Section title="Pagination">
        <Pagination page={page} totalPages={10} onPageChange={setPage} />
      </Section>

      {/* Label standalone */}
      <Section title="Label">
        <div className="flex gap-4">
          <Label>Normal Label</Label>
          <Label required>Required Label</Label>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-forge-white mb-4 pb-2 border-b border-forge-border">{title}</h2>
      {children}
    </section>
  );
}
