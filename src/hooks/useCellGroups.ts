import { useState, useEffect, useCallback } from 'react';
import type { CellGroup, CellMember, CellAttendance, CellReport } from '@/types';
import { supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapCell = (r: any): CellGroup => ({
  id: r.id, name: r.name, leaderId: r.leader_id ?? undefined,
  coLeaderId: r.co_leader_id ?? undefined, meetingDay: r.meeting_day ?? undefined,
  meetingTime: r.meeting_time ?? undefined, location: r.location ?? undefined,
  description: r.description ?? undefined, campusId: r.campus_id ?? undefined,
  isActive: r.is_active ?? true, createdAt: r.created_at ?? new Date().toISOString(),
});
const toCellRow = (c: CellGroup) => ({
  id: c.id, name: c.name, leader_id: c.leaderId ?? null,
  co_leader_id: c.coLeaderId ?? null, meeting_day: c.meetingDay ?? null,
  meeting_time: c.meetingTime ?? null, location: c.location ?? null,
  description: c.description ?? null, campus_id: c.campusId ?? null,
  is_active: c.isActive,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapCellMember = (r: any): CellMember => ({
  id: r.id, cellId: r.cell_id, memberId: r.member_id,
  role: r.role ?? 'Member', joinDate: r.join_date,
});
const toCellMemberRow = (m: CellMember) => ({
  id: m.id, cell_id: m.cellId, member_id: m.memberId,
  role: m.role, join_date: m.joinDate,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapCellAttendance = (r: any): CellAttendance => ({
  id: r.id, cellId: r.cell_id, date: r.date,
  presentMemberIds: r.present_member_ids ?? [],
  topicDiscussed: r.topic_discussed ?? undefined,
  offerings: r.offerings ?? undefined, notes: r.notes ?? undefined,
});
const toCellAttRow = (a: CellAttendance) => ({
  id: a.id, cell_id: a.cellId, date: a.date,
  present_member_ids: a.presentMemberIds,
  topic_discussed: a.topicDiscussed ?? null,
  offerings: a.offerings ?? null, notes: a.notes ?? null,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapReport = (r: any): CellReport => ({
  id: r.id, cellId: r.cell_id, date: r.date, reportedBy: r.reported_by,
  attendance: r.attendance, newVisitors: r.new_visitors, conversions: r.conversions,
  topicCovered: r.topic_covered, highlights: r.highlights ?? undefined,
  challenges: r.challenges ?? undefined, prayerPoints: r.prayer_points ?? undefined,
  createdAt: r.created_at ?? new Date().toISOString(),
});
const toReportRow = (r: CellReport) => ({
  id: r.id, cell_id: r.cellId, date: r.date, reported_by: r.reportedBy,
  attendance: r.attendance, new_visitors: r.newVisitors, conversions: r.conversions,
  topic_covered: r.topicCovered, highlights: r.highlights ?? null,
  challenges: r.challenges ?? null, prayer_points: r.prayerPoints ?? null,
});

export function useCellGroups() {
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [cellMembers, setCellMembers] = useState<CellMember[]>([]);
  const [cellAttendance, setCellAttendance] = useState<CellAttendance[]>([]);
  const [cellReports, setCellReports] = useState<CellReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: cg }, { data: cm }, { data: ca }, { data: cr }] = await Promise.all([
        supabase.from('cell_groups').select('*').order('created_at', { ascending: false }),
        supabase.from('cell_members').select('*'),
        supabase.from('cell_attendance').select('*').order('date', { ascending: false }),
        supabase.from('cell_reports').select('*').order('date', { ascending: false }),
      ]);
      setCellGroups(cg?.map(mapCell) ?? []);
      setCellMembers(cm?.map(mapCellMember) ?? []);
      setCellAttendance(ca?.map(mapCellAttendance) ?? []);
      setCellReports(cr?.map(mapReport) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const addCellGroup = useCallback((cell: CellGroup) => {
    setCellGroups(prev => [cell, ...prev]);
    supabase.from('cell_groups').insert(toCellRow(cell)).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const updateCellGroup = useCallback((updated: CellGroup) => {
    setCellGroups(prev => prev.map(c => c.id === updated.id ? updated : c));
    supabase.from('cell_groups').update(toCellRow(updated)).eq('id', updated.id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const deleteCellGroup = useCallback((id: string) => {
    setCellGroups(prev => prev.filter(c => c.id !== id));
    setCellMembers(prev => prev.filter(m => m.cellId !== id));
    supabase.from('cell_groups').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const assignMemberToCell = useCallback((member: CellMember) => {
    setCellMembers(prev => [...prev, member]);
    supabase.from('cell_members').insert(toCellMemberRow(member)).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const removeMemberFromCell = useCallback((id: string) => {
    setCellMembers(prev => prev.filter(m => m.id !== id));
    supabase.from('cell_members').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const updateCellMemberRole = useCallback((id: string, role: CellMember['role']) => {
    setCellMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
    supabase.from('cell_members').update({ role }).eq('id', id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const addCellAttendance = useCallback((record: CellAttendance) => {
    setCellAttendance(prev => [record, ...prev]);
    supabase.from('cell_attendance').insert(toCellAttRow(record)).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const addCellReport = useCallback((report: CellReport) => {
    setCellReports(prev => [report, ...prev]);
    supabase.from('cell_reports').insert(toReportRow(report)).then(({ error }) => { if (error) console.error(error); });
  }, []);

  return {
    cellGroups, cellMembers, cellAttendance, cellReports, loading,
    addCellGroup, updateCellGroup, deleteCellGroup,
    assignMemberToCell, removeMemberFromCell, updateCellMemberRole,
    addCellAttendance, addCellReport,
  };
}
