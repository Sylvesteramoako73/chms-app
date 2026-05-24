import { createContext, useContext, useState, type ReactNode } from 'react';

interface CampusContextValue {
  selectedCampusId: string; // 'all' or a specific campus id
  setSelectedCampusId: (id: string) => void;
}

const CampusContext = createContext<CampusContextValue | null>(null);

export function CampusProvider({ children }: { children: ReactNode }) {
  const [selectedCampusId, setSelectedCampusIdState] = useState<string>(
    () => localStorage.getItem('chms_selected_campus') ?? 'all'
  );

  const setSelectedCampusId = (id: string) => {
    setSelectedCampusIdState(id);
    localStorage.setItem('chms_selected_campus', id);
  };

  return (
    <CampusContext.Provider value={{ selectedCampusId, setSelectedCampusId }}>
      {children}
    </CampusContext.Provider>
  );
}

export function useCampus() {
  const ctx = useContext(CampusContext);
  if (!ctx) throw new Error('useCampus must be used within CampusProvider');
  return ctx;
}
