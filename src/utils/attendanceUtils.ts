import type { AttendanceRecord } from '@/types';

export function getMemberAbsenceStreak(memberId: string, attendance: AttendanceRecord[]): number {
  const sundays = [...attendance]
    .filter(a => a.serviceType === 'Sunday First Service')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let streak = 0;
  for (const record of sundays) {
    if (record.presentMemberIds.includes(memberId)) break;
    streak++;
  }
  return streak;
}

export function getMemberAttendanceRate(memberId: string, attendance: AttendanceRecord[]): number {
  const sundays = attendance.filter(a => a.serviceType === 'Sunday First Service');
  if (sundays.length === 0) return 0;
  const attended = sundays.filter(a => a.presentMemberIds.includes(memberId)).length;
  return Math.round((attended / sundays.length) * 100);
}
