import { useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/toaster';
import { useData } from '@/context/DataContext';
import { useRole } from '@/context/RoleContext';
import { Menu, Moon, Sun, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/members': 'Members',
  '/attendance': 'Attendance',
  '/giving': 'Tithes & Giving',
  '/events': 'Events',
  '/departments': 'Departments',
  '/communication': 'Communication',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme, loading } = useData();
  const location = useLocation();

  const { canAccess, currentUser } = useRole();

  // Guard: redirect restricted routes to dashboard
  const basePath = '/' + location.pathname.split('/')[1];
  if (basePath !== '/' && !canAccess(basePath)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <ShieldOff className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">
            Your role <strong>{currentUser.role}</strong> does not have permission to view this page.
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-900">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-gold-500 rounded-sm flex items-center justify-center mx-auto animate-pulse">
            <span className="font-bold text-2xl text-navy-900">C</span>
          </div>
          <p className="text-navy-300 text-sm">Loading church data…</p>
        </div>
      </div>
    );
  }
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'ChurchCare';

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border/40">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <h2 className="font-display font-semibold text-lg flex-1">{pageTitle}</h2>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="w-4 h-4 text-gold-400" /> : <Moon className="w-4 h-4" />}
          </Button>
        </header>

        {/* Desktop theme toggle */}
        <div className="hidden lg:block absolute top-5 right-6 z-30">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">
            {theme === 'dark' ? <Sun className="w-4 h-4 text-gold-400" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>

        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <Outlet key={location.pathname} />
            </AnimatePresence>
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
