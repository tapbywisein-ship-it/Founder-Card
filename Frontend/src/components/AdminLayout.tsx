import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAppStore } from '@/store/appStore';
import {
  LayoutDashboard, Users, Calendar, BarChart3, Settings, LogOut, Shield, Sparkles,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { label: 'Users', icon: Users, path: '/admin/users' },
  { label: 'Events', icon: Calendar, path: '/admin/events' },
  { label: 'Founder Cards', icon: Sparkles, path: '/admin/founder-cards' },
  { label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
  { label: 'Permissions', icon: Shield, path: '/admin/permissions' },
  { label: 'Settings', icon: Settings, path: '/admin/settings' },
];

export const AdminLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAppStore((s) => s.logout);
  // Belt-and-braces: ProtectedRoute already gates the routes, but defending
  // here too means a non-admin can never accidentally see the admin nav (e.g.
  // if a future page reuses this layout outside the guarded route).
  const role = useAppStore((s) => s.user?.role);
  const handleLogout = () => { logout(); navigate('/login'); };

  if (role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-center px-6">
        <div>
          <p className="text-sm text-muted-foreground">You don't have access to this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex flex-col w-60 border-r border-border p-4 fixed h-full z-40 bg-background">
        <div className="mb-1 px-2"><Logo /></div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground mb-6 px-2">
          <Shield className="w-3 h-3" /> Admin
        </p>
        <nav className="flex-1 space-y-0.5" aria-label="Admin">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-accent text-primary font-medium border-l-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="w-4 h-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 md:ml-60 min-h-screen">
        <main className="p-4 md:p-8 max-w-xwide mx-auto">{children}</main>
      </div>
    </div>
  );
};
