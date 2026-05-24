import { createContext, useContext, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface CampusContextValue {
  selectedCampusId: string; // 'all' or a specific branch id
  setSelectedCampusId: (id: string) => void;
  isLocked: boolean; // true for Branch Pastors — cannot change their branch
}

const CampusContext = createContext<CampusContextValue | null>(null);

export function CampusProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [selectedCampusId, setSelectedCampusIdState] = useState<string>(
    () => localStorage.getItem('chms_selected_branch') ?? 'all'
  );

  const isBranchPastor = profile?.role === 'Branch Pastor';
  // Branch Pastors are always locked to their assigned branch
  const effectiveId = isBranchPastor && profile?.branchId ? profile.branchId : selectedCampusId;

  const setSelectedCampusId = (id: string) => {
    if (isBranchPastor) return;
    setSelectedCampusIdState(id);
    localStorage.setItem('chms_selected_branch', id);
  };

  return (
    <CampusContext.Provider value={{ selectedCampusId: effectiveId, setSelectedCampusId, isLocked: isBranchPastor }}>
      {children}
    </CampusContext.Provider>
  );
}

export function useCampus() {
  const ctx = useContext(CampusContext);
  if (!ctx) throw new Error('useCampus must be used within CampusProvider');
  return ctx;
}
