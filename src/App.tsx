import { Routes, Route } from 'react-router-dom';
import { useBirthdayWA } from './hooks/useBirthdayWA';
import { Layout } from './components/layout/Layout';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import MemberProfile from './pages/MemberProfile';
import Attendance from './pages/Attendance';
import Giving from './pages/Giving';
import Events from './pages/Events';
import Departments from './pages/Departments';
import Communication from './pages/Communication';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import PrayerRequests from './pages/PrayerRequests';
import PastoralCare from './pages/PastoralCare';
import Volunteers from './pages/Volunteers';
import Pledges from './pages/Pledges';
import Visitors from './pages/Visitors';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 bg-gold-500 rounded-sm flex items-center justify-center mx-auto animate-pulse">
          <span className="font-bold text-2xl text-navy-900">C</span>
        </div>
        <p className="text-navy-300 text-sm">Loading ChurchCare…</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  useBirthdayWA();
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="members" element={<Members />} />
        <Route path="members/:id" element={<MemberProfile />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="giving" element={<Giving />} />
        <Route path="events" element={<Events />} />
        <Route path="departments" element={<Departments />} />
        <Route path="communication" element={<Communication />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="prayer" element={<PrayerRequests />} />
        <Route path="pastoral" element={<PastoralCare />} />
        <Route path="volunteers" element={<Volunteers />} />
        <Route path="pledges" element={<Pledges />} />
        <Route path="visitors" element={<Visitors />} />
      </Route>
    </Routes>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthPage />;

  return <AppRoutes />;
}

export default App;
