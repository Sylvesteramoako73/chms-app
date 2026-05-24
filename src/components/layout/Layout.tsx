import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/toaster';
import { useData } from '@/context/DataContext';
import { useRole } from '@/context/RoleContext';
import { useAuth } from '@/context/AuthContext';
import { Menu, Moon, Sun, ShieldOff, Bell, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { cn } from '@/utils';

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

// ── Notification Bell ──────────────────────────────────────────────────────
function NotificationBell() {
  const { notifications, clearNotifications } = useData();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`chms_read_notifs_${profile?.id ?? 'guest'}`) ?? '[]'); }
    catch { return []; }
  });
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !readIds.includes(n.id)).length;

  const markAllRead = () => {
    const ids = notifications.map(n => n.id);
    setReadIds(ids);
    localStorage.setItem(`chms_read_notifs_${profile?.id ?? 'guest'}`, JSON.stringify(ids));
  };

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open) markAllRead();
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-gold-500 text-navy-900 text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-10 w-80 bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold">Notifications</p>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <button onClick={clearNotifications} className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-6 h-6 mx-auto mb-2 text-muted-foreground opacity-40" />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 30).map(n => {
                  const isUnread = !readIds.includes(n.id);
                  return (
                    <div key={n.id} className={cn('px-4 py-3 space-y-0.5', isUnread && 'bg-gold-500/5')}>
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm font-medium leading-tight', isUnread && 'text-foreground')}>{n.title}</p>
                        {isUnread && <span className="w-2 h-2 rounded-full bg-gold-500 shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                        <span>{n.recipient}</span>
                        {n.createdBy && <><span>·</span><span>{n.createdBy}</span></>}
                        <span>·</span>
                        <span>{format(parseISO(n.createdAt), 'MMM d, h:mm a')}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────
export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme, loading } = useData();
  const location = useLocation();
  const { canAccess, role } = useRole();

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
            Your role <strong>{role}</strong> does not have permission to view this page.
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
          <NotificationBell />
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="w-4 h-4 text-gold-400" /> : <Moon className="w-4 h-4" />}
          </Button>
        </header>

        {/* Desktop top-right controls */}
        <div className="hidden lg:flex items-center gap-1 absolute top-5 right-6 z-30">
          <NotificationBell />
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
