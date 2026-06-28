import { cn } from '@/shared/lib/cn';

interface Tab {
  value: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 border-b border-forge-border', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'relative px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer',
            value === tab.value
              ? 'text-ember-500'
              : 'text-forge-muted hover:text-forge-text',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-xs text-forge-muted">({tab.count})</span>
          )}
          {value === tab.value && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ember-500 rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
