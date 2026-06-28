import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { loginSchema, type LoginFormData } from '@/features/auth/schemas/authSchemas';
import { useLogin } from '@/features/auth/hooks/useLogin';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { OAuthButtons } from '@/features/auth/components/OAuthButtons';
import { Button, Input, Field } from '@/shared/components/ui';

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <AuthShell>
      <div className="mb-8">
        <h2 className="text-[1.65rem] font-bold tracking-tight text-forge-white mb-1">Welcome back</h2>
        <p className="text-forge-muted text-sm">Sign in to your account to continue</p>
      </div>

      <OAuthButtons />

      <div className="flex items-center gap-4 my-7 text-steel-600 text-xs font-mono uppercase tracking-widest">
        <div className="flex-1 h-px bg-forge-border" />
        or continue with email
        <div className="flex-1 h-px bg-forge-border" />
      </div>

      <form onSubmit={handleSubmit((data) => login.mutate(data))}>
        <Field label="Email address" htmlFor="email" error={errors.email?.message} className="mb-5">
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={!!errors.email}
            leftIcon={<Mail className="h-[18px] w-[18px]" />}
            {...register('email')}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password?.message} className="mb-5">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            autoComplete="current-password"
            error={!!errors.password}
            leftIcon={<Lock className="h-[18px] w-[18px]" />}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-steel-600 hover:text-forge-text transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            }
            {...register('password')}
          />
        </Field>

        <div className="flex items-center justify-between mb-7">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-steel-400">
            <input type="checkbox" className="w-4 h-4 rounded border-forge-border bg-forge-surface accent-ember-500" />
            Remember me
          </label>
          <Link to="#" className="text-sm font-medium text-ember-400 hover:text-ember-500 transition-colors">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={login.isPending} className="w-full py-3">
          Sign in to CodeForge
        </Button>
      </form>

      <p className="text-center mt-7 text-sm text-forge-muted">
        Don't have an account?{' '}
        <Link to="/register" className="text-ember-400 font-semibold hover:text-ember-500 transition-colors">
          Create one free
        </Link>
      </p>
    </AuthShell>
  );
}
