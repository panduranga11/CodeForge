import { type ReactNode } from 'react';
import { Logo } from '@/shared/components/brand/Logo';
import { EmberField } from '@/shared/components/brand/EmberField';

interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left: Branding */}
      <div className="relative hidden lg:flex flex-col justify-center p-16 overflow-hidden bg-forge-black">
        <EmberField />

        <div className="relative z-10">
          <div className="mb-12 animate-[fadeSlideUp_0.8s_ease-out]">
            <Logo size="lg" />
          </div>

          <h1 className="text-[2.8rem] font-bold leading-[1.15] tracking-[-0.04em] text-forge-white max-w-[480px] mb-6 animate-[fadeSlideUp_0.8s_ease-out_0.15s_both]">
            Where code is<br />
            <span className="bg-gradient-to-r from-ember-400 to-ember-600 bg-clip-text text-transparent">
              forged under fire.
            </span>
          </h1>

          <p className="text-forge-muted text-[1.05rem] leading-relaxed max-w-[420px] mb-12 animate-[fadeSlideUp_0.8s_ease-out_0.3s_both]">
            Compete in real-time coding contests, solve challenging problems,
            and sharpen your skills with AI-powered feedback — all in one platform.
          </p>

          {/* Code preview */}
          <div className="bg-forge-surface border border-forge-border rounded-xl p-5 max-w-[400px] font-mono text-[0.82rem] leading-[1.8] relative animate-[fadeSlideUp_0.8s_ease-out_0.45s_both]">
            <div className="absolute inset-[-1px] rounded-[13px] p-px bg-gradient-to-b from-ember-500/20 to-transparent pointer-events-none" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />
            <div className="flex gap-1.5 mb-4">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              <span className="w-2 h-2 rounded-full bg-[#eab308]" />
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
            </div>
            <div className="text-steel-600 italic">{'// your next contest awaits'}</div>
            <div><span className="text-[#c084fc]">const</span> <span className="text-[#60a5fa]">solve</span> = (<span className="text-ember-400">challenge</span>) =&gt; {'{'}</div>
            <div>&nbsp;&nbsp;<span className="text-[#c084fc]">return</span> challenge</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;.<span className="text-[#60a5fa]">think</span>()</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;.<span className="text-[#60a5fa]">code</span>()</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;.<span className="text-[#60a5fa]">submit</span>(<span className="text-[#34d399]">'with confidence'</span>);</div>
            <div>{'};'}</div>
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex items-center justify-center p-6 bg-forge-dark relative border-l border-forge-border">
        <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-ember-500/30 to-transparent hidden lg:block" />

        <div className="w-full max-w-[420px] animate-[fadeSlideUp_0.6s_ease-out_0.2s_both]">
          {/* Mobile logo */}
          <div className="mb-6 lg:hidden">
            <Logo size="md" />
          </div>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
