import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { registerSchema, type RegisterFormData } from '@/features/auth/schemas/authSchemas';
import { useRegister } from '@/features/auth/hooks/useRegister';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { OAuthButtons } from '@/features/auth/components/OAuthButtons';
import { Button, Input, Field } from '@/shared/components/ui';

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const registerMutation = useRegister();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  return (
    <AuthShell>
      <div className="mb-8">
        <h2 className="text-[1.65rem] font-bold tracking-tight text-forge-white mb-1">Create your account</h2>
        <p className="text-forge-muted text-sm">Get started for free — no credit card required</p>
      </div>

      <OAuthButtons />

      <div className="flex items-center gap-4 my-7 text-steel-600 text-xs font-mono uppercase tracking-widest">
        <div className="flex-1 h-px bg-forge-border" />
        or
        <div className="flex-1 h-px bg-forge-border" />
      </div>

      <form onSubmit={handleSubmit((data) => registerMutation.mutate(data))}>
        <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message} className="mb-4">
          <Input
            id="fullName"
            placeholder="John Doe"
            autoComplete="name"
            error={!!errors.fullName}
            leftIcon={<User className="h-[18px] w-[18px]" />}
            {...register('fullName')}
          />
        </Field>

        <Field label="Email address" htmlFor="reg-email" error={errors.email?.message} className="mb-4">
          <Input
            id="reg-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={!!errors.email}
            leftIcon={<Mail className="h-[18px] w-[18px]" />}
            {...register('email')}
          />
        </Field>

        <Field label="Password" htmlFor="reg-password" error={errors.password?.message} className="mb-4">
          <Input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min 8 chars, uppercase, digit, special"
            autoComplete="new-password"
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

        <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} className="mb-7">
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            autoComplete="new-password"
            error={!!errors.confirmPassword}
            leftIcon={<Lock className="h-[18px] w-[18px]" />}
            {...register('confirmPassword')}
          />
        </Field>

        <Button type="submit" loading={registerMutation.isPending} className="w-full py-3">
          Create account
        </Button>
      </form>

      <p className="text-center mt-7 text-sm text-forge-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-ember-400 font-semibold hover:text-ember-500 transition-colors">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
