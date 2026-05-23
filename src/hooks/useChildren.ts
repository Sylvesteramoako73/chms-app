import { useState, useEffect, useCallback } from 'react';
import type { Child, Guardian, ChildCheckIn } from '@/types';
import { supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapChild = (r: any): Child => ({
  id: r.id, firstName: r.first_name, lastName: r.last_name,
  dateOfBirth: r.date_of_birth ?? undefined, gender: r.gender,
  allergies: r.allergies ?? undefined, medicalNotes: r.medical_notes ?? undefined,
  classRoom: r.class_room ?? undefined, qrCode: r.qr_code,
  createdAt: r.created_at ?? new Date().toISOString(),
});
const toChildRow = (c: Child) => ({
  id: c.id, first_name: c.firstName, last_name: c.lastName,
  date_of_birth: c.dateOfBirth ?? null, gender: c.gender,
  allergies: c.allergies ?? null, medical_notes: c.medicalNotes ?? null,
  class_room: c.classRoom ?? null, qr_code: c.qrCode,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapGuardian = (r: any): Guardian => ({
  id: r.id, firstName: r.first_name, lastName: r.last_name,
  phone: r.phone, email: r.email ?? undefined,
  relationship: r.relationship, childIds: r.child_ids ?? [],
  memberId: r.member_id ?? undefined,
  securityCode: r.security_code, isAuthorizedPickup: r.is_authorized_pickup,
});
const toGuardianRow = (g: Guardian) => ({
  id: g.id, first_name: g.firstName, last_name: g.lastName,
  phone: g.phone, email: g.email ?? null,
  relationship: g.relationship, child_ids: g.childIds,
  member_id: g.memberId ?? null,
  security_code: g.securityCode, is_authorized_pickup: g.isAuthorizedPickup,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapCheckIn = (r: any): ChildCheckIn => ({
  id: r.id, childId: r.child_id, guardianId: r.guardian_id,
  checkInTime: r.check_in_time, checkOutTime: r.check_out_time ?? undefined,
  checkInBy: r.check_in_by, checkOutBy: r.check_out_by ?? undefined,
  date: r.date, notes: r.notes ?? undefined, status: r.status,
});
const toCheckInRow = (c: ChildCheckIn) => ({
  id: c.id, child_id: c.childId, guardian_id: c.guardianId,
  check_in_time: c.checkInTime, check_out_time: c.checkOutTime ?? null,
  check_in_by: c.checkInBy, check_out_by: c.checkOutBy ?? null,
  date: c.date, notes: c.notes ?? null, status: c.status,
});

export function useChildren() {
  const [children, setChildren] = useState<Child[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [checkIns, setCheckIns] = useState<ChildCheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: ch }, { data: g }, { data: ci }] = await Promise.all([
        supabase.from('children').select('*').order('created_at', { ascending: false }),
        supabase.from('guardians').select('*'),
        supabase.from('child_checkins').select('*').order('date', { ascending: false }),
      ]);
      setChildren(ch?.map(mapChild) ?? []);
      setGuardians(g?.map(mapGuardian) ?? []);
      setCheckIns(ci?.map(mapCheckIn) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const addChild = useCallback((child: Child) => {
    setChildren(prev => [child, ...prev]);
    supabase.from('children').insert(toChildRow(child)).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const updateChild = useCallback((updated: Child) => {
    setChildren(prev => prev.map(c => c.id === updated.id ? updated : c));
    supabase.from('children').update(toChildRow(updated)).eq('id', updated.id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const deleteChild = useCallback((id: string) => {
    setChildren(prev => prev.filter(c => c.id !== id));
    supabase.from('children').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const addGuardian = useCallback((guardian: Guardian) => {
    setGuardians(prev => [guardian, ...prev]);
    supabase.from('guardians').insert(toGuardianRow(guardian)).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const updateGuardian = useCallback((updated: Guardian) => {
    setGuardians(prev => prev.map(g => g.id === updated.id ? updated : g));
    supabase.from('guardians').update(toGuardianRow(updated)).eq('id', updated.id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const deleteGuardian = useCallback((id: string) => {
    setGuardians(prev => prev.filter(g => g.id !== id));
    supabase.from('guardians').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const checkInChild = useCallback((record: ChildCheckIn) => {
    setCheckIns(prev => [record, ...prev]);
    supabase.from('child_checkins').insert(toCheckInRow(record)).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const checkOutChild = useCallback((id: string, checkOutTime: string, checkOutBy: string) => {
    setCheckIns(prev => prev.map(c =>
      c.id === id ? { ...c, checkOutTime, checkOutBy, status: 'Checked Out' as const } : c
    ));
    supabase.from('child_checkins').update({ check_out_time: checkOutTime, check_out_by: checkOutBy, status: 'Checked Out' }).eq('id', id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  return {
    children, guardians, checkIns, loading,
    addChild, updateChild, deleteChild,
    addGuardian, updateGuardian, deleteGuardian,
    checkInChild, checkOutChild,
  };
}
