import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, CalendarCheck, Coins,
  CalendarDays, Settings, MessageSquare, PieChart, Building2, X,
  Heart, HeartHandshake, ClipboardList, Target, LogOut, Church, UserPlus,
} from 'lucide-react';
import { cn } from '@/utils';
import { useRole, type UserRole } from '@/context/RoleContext';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Members', path: '/members', icon: Users },
  { name: 'Attendance', path: '/attendance', icon: CalendarCheck },
  { name: 'Tithes & Giving', path: '/giving', icon: Coins },
  { name: 'Events', path: '/events', icon: CalendarDays },
  { name: 'Departments', path: '/departments', icon: Building2 },
  { name: 'Prayer Requests', path: '/prayer', icon: Heart },
  { name: 'Pastoral Care', path: '/pastoral', icon: HeartHandshake },
  { name: 'Volunteers', path: '/volunteers', icon: ClipboardList },
  { name: 'Pledges', path: '/pledges', icon: Target },
  { name: 'Visitor Follow-up', path: '/visitors', icon: UserPlus },
  { name: 'Communication', path: '/communication', icon: MessageSquare },
  { name: 'Reports', path: '/reports', icon: PieChart },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const ROLE_BADGE: Record<UserRole, string> = {
  Administrator: 'bg-gold-500/20 text-gold-500',
  Pastor: 'bg-sage-500/20 text-sage-400',
  'Department Head': 'bg-blue-500/20 text-blue-400',
  'Data Entry': 'bg-navy-700 text-navy-400',
};

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function SidebarContent({ onClose }: { onClose: () => void }) {
  const { canAccess, role } = useRole();
  const { profile, signOut } = useAuth();

  const visibleNav = navItems.filter(item => canAccess(item.path));
  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gold-500 rounded-sm flex items-center justify-center text-navy-900">
            <Church className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-gold-500 tracking-tight leading-tight">ChurchCare</h1>
            <p className="text-[10px] text-navy-500 uppercase tracking-widest font-semibold leading-tight">Manage. Serve. Grow.</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden text-navy-400 hover:text-white transition-colors p-1 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative text-sm font-medium',
                isActive
                  ? 'bg-navy-800 text-white'
                  : 'text-navy-300 hover:bg-navy-800/60 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-gold-500 rounded-r-full" />
                )}
                <item.icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-gold-400' : 'text-navy-500 group-hover:text-navy-300')} />
                {item.name}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-navy-800 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center shrink-0 border border-navy-600 text-white font-bold text-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.name ?? 'User'}</p>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${ROLE_BADGE[role]}`}>
              {role}
            </span>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-navy-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 h-screen sticky top-0 flex-col bg-navy-900 border-r border-navy-800 shadow-2xl z-20 shrink-0">
        <SidebarContent onClose={() => {}} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 h-full w-60 bg-navy-900 border-r border-navy-800 shadow-2xl z-50 lg:hidden flex flex-col"
            >
              <SidebarContent onClose={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
