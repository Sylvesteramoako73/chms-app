import { useState, useEffect, useCallback } from 'react';
import type { Worker, WorkerAttendance, WorkerSchedule } from '@/types';
import { supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapWorker = (r: any): Worker => ({
  id: r.id, memberId: r.member_id ?? undefined,
  firstName: r.first_name, lastName: r.last_name,
  phone: r.phone ?? '', email: r.email ?? undefined,
  departmentId: r.department_id ?? '',
  roleTitle: r.role_title ?? 'Member',
  serviceUnit: r.service_unit ?? undefined,
  status: r.status ?? 'Active',
  joinDate: r.join_date ?? '',
  notes: r.notes ?? undefined,
  createdAt: r.created_at ?? new Date().toISOString(),
});
const toWorkerRow = (w: Worker) => ({
  id: w.id, member_id: w.memberId ?? null,
  first_name: w.firstName, last_name: w.lastName,
  phone: w.phone, email: w.email ?? null,
  department_id: w.departmentId || null,
  role_title: w.roleTitle, service_unit: w.serviceUnit ?? null,
  status: w.status, join_date: w.joinDate, notes: w.notes ?? null,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapAttendance = (r: any): WorkerAttendance => ({
  id: r.id, workerId: r.worker_id, date: r.date,
  serviceType: r.service_type, present: r.present, notes: r.notes ?? undefined,
});
const toAttendanceRow = (a: WorkerAttendance) => ({
  id: a.id, worker_id: a.workerId, date: a.date,
  service_type: a.serviceType, present: a.present, notes: a.notes ?? null,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapSchedule = (r: any): WorkerSchedule => ({
  id: r.id, workerId: r.worker_id, date: r.date,
  startTime: r.start_time, endTime: r.end_time,
  duty: r.duty, departmentId: r.department_id ?? '',
  notes: r.notes ?? undefined, status: r.status ?? 'Scheduled',
});
const toScheduleRow = (s: WorkerSchedule) => ({
  id: s.id, worker_id: s.workerId, date: s.date,
  start_time: s.startTime, end_time: s.endTime,
  duty: s.duty, department_id: s.departmentId || null,
  notes: s.notes ?? null, status: s.status,
});

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerAttendance, setWorkerAttendance] = useState<WorkerAttendance[]>([]);
  const [workerSchedules, setWorkerSchedules] = useState<WorkerSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: w }, { data: wa }, { data: ws }] = await Promise.all([
        supabase.from('workers').select('*').order('created_at', { ascending: false }),
        supabase.from('worker_attendance').select('*').order('date', { ascending: false }),
        supabase.from('worker_schedules').select('*').order('date', { ascending: false }),
      ]);
      setWorkers(w?.map(mapWorker) ?? []);
      setWorkerAttendance(wa?.map(mapAttendance) ?? []);
      setWorkerSchedules(ws?.map(mapSchedule) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const addWorker = useCallback((worker: Worker) => {
    setWorkers(prev => [worker, ...prev]);
    supabase.from('workers').insert(toWorkerRow(worker)).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const updateWorker = useCallback((updated: Worker) => {
    setWorkers(prev => prev.map(w => w.id === updated.id ? updated : w));
    supabase.from('workers').update(toWorkerRow(updated)).eq('id', updated.id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const deleteWorker = useCallback((id: string) => {
    setWorkers(prev => prev.filter(w => w.id !== id));
    supabase.from('workers').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const logWorkerAttendance = useCallback((records: WorkerAttendance[]) => {
    setWorkerAttendance(prev => {
      const filtered = prev.filter(a => !(a.date === records[0]?.date && a.serviceType === records[0]?.serviceType));
      return [...records, ...filtered];
    });
    supabase.from('worker_attendance').upsert(records.map(toAttendanceRow)).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const addWorkerSchedule = useCallback((schedule: WorkerSchedule) => {
    setWorkerSchedules(prev => [schedule, ...prev]);
    supabase.from('worker_schedules').insert(toScheduleRow(schedule)).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const updateWorkerSchedule = useCallback((updated: WorkerSchedule) => {
    setWorkerSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));
    supabase.from('worker_schedules').update(toScheduleRow(updated)).eq('id', updated.id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const deleteWorkerSchedule = useCallback((id: string) => {
    setWorkerSchedules(prev => prev.filter(s => s.id !== id));
    supabase.from('worker_schedules').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  return {
    workers, workerAttendance, workerSchedules, loading,
    addWorker, updateWorker, deleteWorker,
    logWorkerAttendance,
    addWorkerSchedule, updateWorkerSchedule, deleteWorkerSchedule,
  };
}
