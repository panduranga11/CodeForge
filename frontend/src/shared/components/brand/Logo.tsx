import { cn } from '@/shared/lib/cn';

const sizeMap = {
  sm: { svg: 28, text: 'text-lg' },
  md: { svg: 36, text: 'text-xl' },
  lg: { svg: 48, text: 'text-[1.75rem]' },
} as const;

interface LogoProps {
  size?: keyof typeof sizeMap;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const { svg, text } = sizeMap[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg width={svg} height={svg} viewBox="0 0 48 48" fill="none">
        <path d="M14 8L6 24L14 40" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M34 8L42 24L34 40" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M28 6L20 42" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="24" cy="24" r="3" fill="#f97316" opacity="0.6">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
      {showText && (
        <span className={cn('font-bold tracking-tight text-forge-white', text)}>
          Code<span className="text-ember-500">Forge</span>
        </span>
      )}
    </div>
  );
}
