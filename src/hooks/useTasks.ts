import { useState, useEffect, useCallback } from 'react';
import type { Task, TaskStatus } from '@/types';
import { supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapTask = (r: any): Task => ({
  id: r.id,
  title: r.title,
  description: r.description ?? undefined,
  assignedTo: r.assigned_to,
  assignedToName: r.assigned_to_name,
  assignedToPhone: r.assigned_to_phone ?? undefined,
  assignedBy: r.assigned_by,
  assignedByName: r.assigned_by_name,
  status: r.status as TaskStatus,
  priority: r.priority,
  dueDate: r.due_date ?? undefined,
  notificationChannel: r.notification_channel,
  notificationSent: r.notification_sent ?? false,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toTaskRow = (t: Omit<Task, 'createdAt' | 'updatedAt'>) => ({
  id: t.id,
  title: t.title,
  description: t.description ?? null,
  assigned_to: t.assignedTo,
  assigned_to_name: t.assignedToName,
  assigned_to_phone: t.assignedToPhone ?? null,
  assigned_by: t.assignedBy,
  assigned_by_name: t.assignedByName,
  status: t.status,
  priority: t.priority,
  due_date: t.dueDate ?? null,
  notification_channel: t.notificationChannel,
  notification_sent: t.notificationSent,
});

export function useTasks(currentUserId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .or(`assigned_to.eq.${currentUserId},assigned_by.eq.${currentUserId}`)
      .order('created_at', { ascending: false });
    setTasks(data?.map(mapTask) ?? []);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => { load(); }, [load]);

  const addTask = useCallback(async (task: Omit<Task, 'createdAt' | 'updatedAt'>) => {
    const row = toTaskRow(task);
    const { data, error } = await supabase.from('tasks').insert(row).select().single();
    if (!error && data) setTasks(prev => [mapTask(data), ...prev]);
    return error;
  }, []);

  const updateStatus = useCallback(async (id: string, status: TaskStatus) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) setTasks(prev => prev.map(t => t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t));
    return error;
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) setTasks(prev => prev.filter(t => t.id !== id));
    return error;
  }, []);

  const markNotificationSent = useCallback(async (id: string) => {
    await supabase.from('tasks').update({ notification_sent: true }).eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, notificationSent: true } : t));
  }, []);

  return { tasks, loading, addTask, updateStatus, deleteTask, markNotificationSent, reload: load };
}
