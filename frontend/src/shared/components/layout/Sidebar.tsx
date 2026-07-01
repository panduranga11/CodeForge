import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/hooks/useAuthStore';
import { authApi } from '@/features/auth/services/authApi';
import {
  LayoutDashboard, Trophy, User, LogOut, Plus, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Logo } from '@/shared/components/brand/Logo';
import { Avatar } from '@/shared/components/ui';
import { cn } from '@/shared/lib/cn';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/contests', label: 'Contests', icon: Trophy },
  { to: '/profile', label: 'Profile', icon: User },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, accessToken, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      if (accessToken && refreshToken) {
        await authApi.logout(accessToken, refreshToken);
      }
    } catch {
      // logout even if API fails
    }
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen flex flex-col border-r border-forge-border bg-forge-dark transition-all duration-300 z-40',
        collapsed ? 'w-[72px]' : 'w-[250px]',
      )}
    >
      {/* Ember accent edge */}
      <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-ember-500/30 to-transparent" />

      {/* Logo */}
      <div className="flex items-center px-4 h-16 border-b border-forge-border flex-shrink-0">
        <Logo size="sm" showText={!collapsed} />
      </div>

      {/* Host CTA */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={() => navigate('/contests/create')}
          className={cn(
            'flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-gradient-to-r from-ember-600 to-ember-500 text-white font-medium text-sm hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all cursor-pointer',
            collapsed ? 'px-0' : 'px-4',
          )}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Host a Contest</span>}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-ember-500/10 text-ember-400 border border-ember-500/20'
                  : 'text-forge-muted hover:text-forge-text hover:bg-forge-surface',
                collapsed && 'justify-center',
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + Collapse */}
      <div className="border-t border-forge-border p-3 space-y-2">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar name={user.fullName} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-forge-text truncate">{user.fullName}</p>
              <p className="text-xs text-forge-muted truncate">{user.role}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-forge-muted hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer',
            collapsed && 'justify-center',
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-1.5 text-forge-muted hover:text-forge-text transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
