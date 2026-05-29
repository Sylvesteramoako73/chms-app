import React from 'react';
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
import Outreach from './pages/Outreach';
import Assets from './pages/Assets';
import Workers from './pages/Workers';
import Automation from './pages/Automation';
import ChildCheckin from './pages/ChildCheckin';
import Media from './pages/Media';
import CellGroups from './pages/CellGroups';
import Tasks from './pages/Tasks';
import WhatsApp from './pages/WhatsApp';
import Accounting from './pages/Accounting';
import Upgrade from './pages/Upgrade';
import { UpgradePrompt } from './components/UpgradePrompt';
import { usePackage, type PlanFeatures } from './context/PackageContext';

function PlanGate({ feature, children }: { feature: keyof PlanFeatures; children: React.ReactNode }) {
  const { hasFeature } = usePackage();
  if (!hasFeature(feature)) return <UpgradePrompt feature={feature} />;
  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <img src="/logo.png" alt="Faith ChurchCare" className="w-48 h-auto mx-auto animate-pulse" />
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
        <Route path="communication" element={<PlanGate feature="bulkMessaging"><Communication /></PlanGate>} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="prayer" element={<PlanGate feature="prayerPastoral"><PrayerRequests /></PlanGate>} />
        <Route path="pastoral" element={<PlanGate feature="prayerPastoral"><PastoralCare /></PlanGate>} />
        <Route path="volunteers" element={<PlanGate feature="volunteers"><Volunteers /></PlanGate>} />
        <Route path="pledges" element={<PlanGate feature="pledges"><Pledges /></PlanGate>} />
        <Route path="visitors" element={<Visitors />} />
        <Route path="outreach" element={<Outreach />} />
        <Route path="assets" element={<Assets />} />
        <Route path="workers" element={<Workers />} />
        <Route path="automation" element={<PlanGate feature="bulkMessaging"><Automation /></PlanGate>} />
        <Route path="children" element={<ChildCheckin />} />
        <Route path="media" element={<Media />} />
        <Route path="cells" element={<CellGroups />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="whatsapp" element={<PlanGate feature="bulkMessaging"><WhatsApp /></PlanGate>} />
        <Route path="accounting" element={<PlanGate feature="accounting"><Accounting /></PlanGate>} />
        <Route path="upgrade" element={<Upgrade />} />
      </Route>
    </Routes>
  );
}

function App() {
  const { user, loading, isDemo } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user && !isDemo) return <AuthPage />;

  return <AppRoutes />;
}

export default App;
