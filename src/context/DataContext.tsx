import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Member, Department, SmallGroup, AttendanceRecord, GivingRecord, EventRecord, Campus, PrayerRequest, PastoralVisit, VolunteerRole, Campaign, Pledge, PledgePayment, AuditLog, AuditEntity, AuditAction, VisitorRecord } from '../types';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Row mappers  DB (snake_case) ↔ TypeScript (camelCase)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapMember = (r: any): Member => ({
  id: r.id, firstName: r.first_name, lastName: r.last_name,
  phone: r.phone ?? '', email: r.email ?? '', address: r.address ?? '',
  dateOfBirth: r.date_of_birth ?? undefined, gender: r.gender,
  maritalStatus: r.marital_status, occupation: r.occupation ?? undefined,
  departmentId: r.department_id ?? undefined, smallGroupId: r.small_group_id ?? undefined,
  campusId: r.campus_id ?? undefined, status: r.status, joinDate: r.join_date,
  baptismDate: r.baptism_date ?? undefined, notes: r.notes ?? undefined,
});
const toMemberRow = (m: Member) => ({
  id: m.id, first_name: m.firstName, last_name: m.lastName,
  phone: m.phone, email: m.email, address: m.address,
  date_of_birth: m.dateOfBirth ?? null, gender: m.gender,
  marital_status: m.maritalStatus, occupation: m.occupation ?? null,
  department_id: m.departmentId ?? null, small_group_id: m.smallGroupId ?? null,
  campus_id: m.campusId ?? null, status: m.status, join_date: m.joinDate,
  baptism_date: m.baptismDate ?? null, notes: m.notes ?? null,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapDept = (r: any): Department => ({ id: r.id, name: r.name, leaderId: r.leader_id ?? undefined, description: r.description ?? undefined });
const toDeptRow = (d: Department) => ({ id: d.id, name: d.name, leader_id: d.leaderId ?? null, description: d.description ?? null });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapGroup = (r: any): SmallGroup => ({ id: r.id, name: r.name, leaderId: r.leader_id ?? undefined, meetingDay: r.meeting_day, meetingTime: r.meeting_time });
const toGroupRow = (g: SmallGroup) => ({ id: g.id, name: g.name, leader_id: g.leaderId ?? null, meeting_day: g.meetingDay, meeting_time: g.meetingTime });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapCampus = (r: any): Campus => ({ id: r.id, name: r.name, address: r.address ?? undefined, pastor: r.pastor ?? undefined, isMain: r.is_main });
const toCampusRow = (c: Campus) => ({ id: c.id, name: c.name, address: c.address ?? null, pastor: c.pastor ?? null, is_main: c.isMain });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapAttendance = (r: any): AttendanceRecord => ({ id: r.id, serviceType: r.service_type, date: r.date, presentMemberIds: r.present_member_ids ?? [], visitorsCount: r.visitors_count, campusId: r.campus_id ?? undefined });
const toAttendanceRow = (a: AttendanceRecord) => ({ id: a.id, service_type: a.serviceType, date: a.date, present_member_ids: a.presentMemberIds, visitors_count: a.visitorsCount, campus_id: a.campusId ?? null });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapGiving = (r: any): GivingRecord => ({ id: r.id, memberId: r.member_id ?? undefined, date: r.date, amount: r.amount, type: r.type, paymentMethod: r.payment_method, campusId: r.campus_id ?? undefined, notes: r.notes ?? undefined });
const toGivingRow = (g: GivingRecord) => ({ id: g.id, member_id: g.memberId ?? null, date: g.date, amount: g.amount, type: g.type, payment_method: g.paymentMethod, campus_id: g.campusId ?? null, notes: g.notes ?? null });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapEvent = (r: any): EventRecord => ({ id: r.id, title: r.title, date: r.date, time: r.time, location: r.location, description: r.description, departmentId: r.department_id ?? undefined, campusId: r.campus_id ?? undefined, organizer: r.organizer, expectedAttendance: r.expected_attendance ?? undefined, isRecurring: r.is_recurring, recurringPattern: r.recurring_pattern ?? undefined });
const toEventRow = (e: EventRecord) => ({ id: e.id, title: e.title, date: e.date, time: e.time, location: e.location, description: e.description, department_id: e.departmentId ?? null, campus_id: e.campusId ?? null, organizer: e.organizer, expected_attendance: e.expectedAttendance ?? null, is_recurring: e.isRecurring, recurring_pattern: e.recurringPattern ?? null });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapPrayer = (r: any): PrayerRequest => ({ id: r.id, memberId: r.member_id ?? undefined, title: r.title, body: r.body, category: r.category, isPrivate: r.is_private, isAnswered: r.is_answered, answeredNote: r.answered_note ?? undefined, createdAt: r.created_at });
const toPrayerRow = (p: PrayerRequest) => ({ id: p.id, member_id: p.memberId ?? null, title: p.title, body: p.body, category: p.category, is_private: p.isPrivate, is_answered: p.isAnswered, answered_note: p.answeredNote ?? null, created_at: p.createdAt });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapVisit = (r: any): PastoralVisit => ({ id: r.id, memberId: r.member_id, visitType: r.visit_type, date: r.date, conductedBy: r.conducted_by, notes: r.notes ?? undefined, followUpDate: r.follow_up_date ?? undefined, followUpComplete: r.follow_up_complete });
const toVisitRow = (v: PastoralVisit) => ({ id: v.id, member_id: v.memberId, visit_type: v.visitType, date: v.date, conducted_by: v.conductedBy, notes: v.notes ?? null, follow_up_date: v.followUpDate ?? null, follow_up_complete: v.followUpComplete });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapRole = (r: any): VolunteerRole => ({ id: r.id, eventId: r.event_id, roleName: r.role_name, assignedMemberIds: r.assigned_member_ids ?? [], maxVolunteers: r.max_volunteers ?? undefined });
const toRoleRow = (r: VolunteerRole) => ({ id: r.id, event_id: r.eventId, role_name: r.roleName, assigned_member_ids: r.assignedMemberIds, max_volunteers: r.maxVolunteers ?? null });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapCampaign = (r: any): Campaign => ({ id: r.id, title: r.title, description: r.description ?? undefined, goalAmount: r.goal_amount, startDate: r.start_date, endDate: r.end_date ?? undefined, isActive: r.is_active });
const toCampaignRow = (c: Campaign) => ({ id: c.id, title: c.title, description: c.description ?? null, goal_amount: c.goalAmount, start_date: c.startDate, end_date: c.endDate ?? null, is_active: c.isActive });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapPledge = (r: any): Pledge => ({ id: r.id, campaignId: r.campaign_id, memberId: r.member_id ?? undefined, pledgeAmount: r.pledge_amount, paidAmount: r.paid_amount, pledgeDate: r.pledge_date, notes: r.notes ?? undefined });
const toPledgeRow = (p: Pledge) => ({ id: p.id, campaign_id: p.campaignId, member_id: p.memberId ?? null, pledge_amount: p.pledgeAmount, paid_amount: p.paidAmount, pledge_date: p.pledgeDate, notes: p.notes ?? null });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapPayment = (r: any): PledgePayment => ({ id: r.id, pledgeId: r.pledge_id, amount: r.amount, date: r.date, notes: r.notes ?? undefined });
const toPaymentRow = (p: PledgePayment) => ({ id: p.id, pledge_id: p.pledgeId, amount: p.amount, date: p.date, notes: p.notes ?? null });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapAudit = (r: any): AuditLog => ({ id: r.id, timestamp: r.timestamp, entity: r.entity, action: r.action, entityId: r.entity_id, description: r.description });

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------
interface DataContextType {
  loading: boolean;
  members: Member[];
  departments: Department[];
  smallGroups: SmallGroup[];
  attendance: AttendanceRecord[];
  giving: GivingRecord[];
  events: EventRecord[];
  campuses: Campus[];
  prayerRequests: PrayerRequest[];
  pastoralVisits: PastoralVisit[];
  volunteerRoles: VolunteerRole[];
  campaigns: Campaign[];
  pledges: Pledge[];
  pledgePayments: PledgePayment[];
  auditLogs: AuditLog[];
  visitors: VisitorRecord[];
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  addMember: (member: Member) => void;
  updateMember: (member: Member) => void;
  deleteMember: (id: string) => void;
  importMembers: (members: Member[]) => void;

  addAttendance: (record: AttendanceRecord) => void;

  addGiving: (record: GivingRecord) => void;
  deleteGiving: (id: string) => void;

  addEvent: (event: EventRecord) => void;
  updateEvent: (event: EventRecord) => void;
  deleteEvent: (id: string) => void;

  addDepartment: (dept: Department) => void;
  updateDepartment: (dept: Department) => void;

  addSmallGroup: (group: SmallGroup) => void;
  updateSmallGroup: (group: SmallGroup) => void;

  addCampus: (campus: Campus) => void;
  updateCampus: (campus: Campus) => void;
  deleteCampus: (id: string) => boolean;

  addPrayerRequest: (req: PrayerRequest) => void;
  updatePrayerRequest: (req: PrayerRequest) => void;
  deletePrayerRequest: (id: string) => void;

  addPastoralVisit: (visit: PastoralVisit) => void;
  updatePastoralVisit: (visit: PastoralVisit) => void;
  deletePastoralVisit: (id: string) => void;

  addVolunteerRole: (role: VolunteerRole) => void;
  updateVolunteerRole: (role: VolunteerRole) => void;
  deleteVolunteerRole: (id: string) => void;

  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (campaign: Campaign) => void;
  deleteCampaign: (id: string) => void;

  addPledge: (pledge: Pledge) => void;
  updatePledge: (pledge: Pledge) => void;
  deletePledge: (id: string) => void;
  recordPledgePayment: (payment: PledgePayment) => void;

  addVisitor: (v: VisitorRecord) => void;
  updateVisitor: (v: VisitorRecord) => void;
  deleteVisitor: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [smallGroups, setSmallGroups] = useState<SmallGroup[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [giving, setGiving] = useState<GivingRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [pastoralVisits, setPastoralVisits] = useState<PastoralVisit[]>([]);
  const [volunteerRoles, setVolunteerRoles] = useState<VolunteerRole[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [pledgePayments, setPledgePayments] = useState<PledgePayment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [visitors, setVisitors] = useState<VisitorRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem('chms_visitors') ?? '[]'); }
    catch { return []; }
  });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    localStorage.setItem('chms_visitors', JSON.stringify(visitors));
  }, [visitors]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // Load all data from Supabase on mount
  useEffect(() => {
    async function loadAll() {
      const [
        { data: m }, { data: d }, { data: sg }, { data: c },
        { data: att }, { data: g }, { data: ev },
        { data: pr }, { data: pv }, { data: vr },
        { data: cam }, { data: pl }, { data: pp }, { data: al },
      ] = await Promise.all([
        supabase.from('members').select('*').order('created_at', { ascending: false }),
        supabase.from('departments').select('*'),
        supabase.from('small_groups').select('*'),
        supabase.from('campuses').select('*'),
        supabase.from('attendance_records').select('*').order('date', { ascending: false }),
        supabase.from('giving_records').select('*').order('date', { ascending: false }),
        supabase.from('events').select('*').order('date', { ascending: false }),
        supabase.from('prayer_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('pastoral_visits').select('*').order('date', { ascending: false }),
        supabase.from('volunteer_roles').select('*'),
        supabase.from('campaigns').select('*').order('start_date', { ascending: false }),
        supabase.from('pledges').select('*').order('pledge_date', { ascending: false }),
        supabase.from('pledge_payments').select('*').order('date', { ascending: false }),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(500),
      ]);
      setMembers(m?.map(mapMember) ?? []);
      setDepartments(d?.map(mapDept) ?? []);
      setSmallGroups(sg?.map(mapGroup) ?? []);
      setCampuses(c?.map(mapCampus) ?? []);
      setAttendance(att?.map(mapAttendance) ?? []);
      setGiving(g?.map(mapGiving) ?? []);
      setEvents(ev?.map(mapEvent) ?? []);
      setPrayerRequests(pr?.map(mapPrayer) ?? []);
      setPastoralVisits(pv?.map(mapVisit) ?? []);
      setVolunteerRoles(vr?.map(mapRole) ?? []);
      setCampaigns(cam?.map(mapCampaign) ?? []);
      setPledges(pl?.map(mapPledge) ?? []);
      setPledgePayments(pp?.map(mapPayment) ?? []);
      setAuditLogs(al?.map(mapAudit) ?? []);
      setLoading(false);
    }
    loadAll();
  }, []);

  // Audit helper — optimistic local + async save
  const audit = (action: AuditAction, entity: AuditEntity, entityId: string, description: string) => {
    const log: AuditLog = { id: `al${Date.now()}`, timestamp: new Date().toISOString(), entity, action, entityId, description };
    setAuditLogs(prev => [log, ...prev]);
    supabase.from('audit_logs').insert({ id: log.id, timestamp: log.timestamp, entity: log.entity, action: log.action, entity_id: log.entityId, description: log.description })
      .then(({ error }) => { if (error) console.error('Audit log failed:', error); });
  };

  // ---------------------------------------------------------------------------
  // Members
  // ---------------------------------------------------------------------------
  const addMember = (member: Member) => {
    setMembers(prev => [member, ...prev]);
    audit('CREATE', 'Member', member.id, `Added member ${member.firstName} ${member.lastName}`);
    supabase.from('members').insert(toMemberRow(member)).then(({ error }) => { if (error) console.error(error); });
  };
  const updateMember = (updated: Member) => {
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
    audit('UPDATE', 'Member', updated.id, `Updated member ${updated.firstName} ${updated.lastName}`);
    supabase.from('members').update(toMemberRow(updated)).eq('id', updated.id).then(({ error }) => { if (error) console.error(error); });
  };
  const deleteMember = (id: string) => {
    const m = members.find(x => x.id === id);
    setMembers(prev => prev.filter(x => x.id !== id));
    if (m) audit('DELETE', 'Member', id, `Deleted member ${m.firstName} ${m.lastName}`);
    supabase.from('members').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  };
  const importMembers = (newMembers: Member[]) => {
    setMembers(prev => [...newMembers, ...prev]);
    audit('CREATE', 'Member', 'bulk', `Imported ${newMembers.length} members via CSV`);
    supabase.from('members').insert(newMembers.map(toMemberRow)).then(({ error }) => { if (error) console.error(error); });
  };

  // ---------------------------------------------------------------------------
  // Attendance
  // ---------------------------------------------------------------------------
  const addAttendance = (record: AttendanceRecord) => {
    setAttendance(prev => [record, ...prev]);
    audit('CREATE', 'Attendance', record.id, `Logged ${record.serviceType} (${record.presentMemberIds.length} present)`);
    supabase.from('attendance_records').insert(toAttendanceRow(record)).then(({ error }) => { if (error) console.error(error); });
  };

  // ---------------------------------------------------------------------------
  // Giving
  // ---------------------------------------------------------------------------
  const addGiving = (record: GivingRecord) => {
    setGiving(prev => [record, ...prev]);
    audit('CREATE', 'Giving', record.id, `Recorded ₵${record.amount} ${record.type}`);
    supabase.from('giving_records').insert(toGivingRow(record)).then(({ error }) => { if (error) console.error(error); });
  };
  const deleteGiving = (id: string) => {
    setGiving(prev => prev.filter(g => g.id !== id));
    audit('DELETE', 'Giving', id, 'Deleted giving record');
    supabase.from('giving_records').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  };

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------
  const addEvent = (event: EventRecord) => {
    setEvents(prev => [event, ...prev]);
    audit('CREATE', 'Event', event.id, `Created event: ${event.title}`);
    supabase.from('events').insert(toEventRow(event)).then(({ error }) => { if (error) console.error(error); });
  };
  const updateEvent = (updated: EventRecord) => {
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
    audit('UPDATE', 'Event', updated.id, `Updated event: ${updated.title}`);
    supabase.from('events').update(toEventRow(updated)).eq('id', updated.id).then(({ error }) => { if (error) console.error(error); });
  };
  const deleteEvent = (id: string) => {
    const e = events.find(x => x.id === id);
    setEvents(prev => prev.filter(x => x.id !== id));
    if (e) audit('DELETE', 'Event', id, `Deleted event: ${e.title}`);
    supabase.from('events').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  };

  // ---------------------------------------------------------------------------
  // Departments
  // ---------------------------------------------------------------------------
  const addDepartment = (dept: Department) => {
    setDepartments(prev => [...prev, dept]);
    audit('CREATE', 'Department', dept.id, `Added department: ${dept.name}`);
    supabase.from('departments').insert(toDeptRow(dept)).then(({ error }) => { if (error) console.error(error); });
  };
  const updateDepartment = (updated: Department) => {
    setDepartments(prev => prev.map(d => d.id === updated.id ? updated : d));
    audit('UPDATE', 'Department', updated.id, `Updated department: ${updated.name}`);
    supabase.from('departments').update(toDeptRow(updated)).eq('id', updated.id).then(({ error }) => { if (error) console.error(error); });
  };

  // ---------------------------------------------------------------------------
  // Small Groups
  // ---------------------------------------------------------------------------
  const addSmallGroup = (group: SmallGroup) => {
    setSmallGroups(prev => [...prev, group]);
    audit('CREATE', 'SmallGroup', group.id, `Added small group: ${group.name}`);
    supabase.from('small_groups').insert(toGroupRow(group)).then(({ error }) => { if (error) console.error(error); });
  };
  const updateSmallGroup = (updated: SmallGroup) => {
    setSmallGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
    audit('UPDATE', 'SmallGroup', updated.id, `Updated group: ${updated.name}`);
    supabase.from('small_groups').update(toGroupRow(updated)).eq('id', updated.id).then(({ error }) => { if (error) console.error(error); });
  };

  // ---------------------------------------------------------------------------
  // Campuses
  // ---------------------------------------------------------------------------
  const addCampus = (campus: Campus) => {
    setCampuses(prev => [...prev, campus]);
    audit('CREATE', 'Campus', campus.id, `Added campus: ${campus.name}`);
    supabase.from('campuses').insert(toCampusRow(campus)).then(({ error }) => { if (error) console.error(error); });
  };
  const updateCampus = (updated: Campus) => {
    setCampuses(prev => prev.map(c => c.id === updated.id ? updated : c));
    audit('UPDATE', 'Campus', updated.id, `Updated campus: ${updated.name}`);
    supabase.from('campuses').update(toCampusRow(updated)).eq('id', updated.id).then(({ error }) => { if (error) console.error(error); });
  };
  const deleteCampus = (id: string): boolean => {
    if (members.some(m => m.campusId === id)) return false;
    const c = campuses.find(x => x.id === id);
    setCampuses(prev => prev.filter(x => x.id !== id));
    if (c) audit('DELETE', 'Campus', id, `Deleted campus: ${c.name}`);
    supabase.from('campuses').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
    return true;
  };

  // ---------------------------------------------------------------------------
  // Prayer Requests
  // ---------------------------------------------------------------------------
  const addPrayerRequest = (req: PrayerRequest) => {
    setPrayerRequests(prev => [req, ...prev]);
    audit('CREATE', 'PrayerRequest', req.id, `New prayer request: ${req.title}`);
    supabase.from('prayer_requests').insert(toPrayerRow(req)).then(({ error }) => { if (error) console.error(error); });
  };
  const updatePrayerRequest = (updated: PrayerRequest) => {
    setPrayerRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
    audit('UPDATE', 'PrayerRequest', updated.id, `Updated prayer request: ${updated.title}`);
    supabase.from('prayer_requests').update(toPrayerRow(updated)).eq('id', updated.id).then(({ error }) => { if (error) console.error(error); });
  };
  const deletePrayerRequest = (id: string) => {
    setPrayerRequests(prev => prev.filter(r => r.id !== id));
    audit('DELETE', 'PrayerRequest', id, 'Deleted prayer request');
    supabase.from('prayer_requests').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  };

  // ---------------------------------------------------------------------------
  // Pastoral Visits
  // ---------------------------------------------------------------------------
  const addPastoralVisit = (visit: PastoralVisit) => {
    setPastoralVisits(prev => [visit, ...prev]);
    audit('CREATE', 'PastoralVisit', visit.id, `Logged ${visit.visitType} by ${visit.conductedBy}`);
    supabase.from('pastoral_visits').insert(toVisitRow(visit)).then(({ error }) => { if (error) console.error(error); });
  };
  const updatePastoralVisit = (updated: PastoralVisit) => {
    setPastoralVisits(prev => prev.map(v => v.id === updated.id ? updated : v));
    audit('UPDATE', 'PastoralVisit', updated.id, 'Updated pastoral visit');
    supabase.from('pastoral_visits').update(toVisitRow(updated)).eq('id', updated.id).then(({ error }) => { if (error) console.error(error); });
  };
  const deletePastoralVisit = (id: string) => {
    setPastoralVisits(prev => prev.filter(v => v.id !== id));
    audit('DELETE', 'PastoralVisit', id, 'Deleted pastoral visit');
    supabase.from('pastoral_visits').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  };

  // ---------------------------------------------------------------------------
  // Volunteer Roles
  // ---------------------------------------------------------------------------
  const addVolunteerRole = (role: VolunteerRole) => {
    setVolunteerRoles(prev => [...prev, role]);
    audit('CREATE', 'VolunteerRole', role.id, `Added role: ${role.roleName}`);
    supabase.from('volunteer_roles').insert(toRoleRow(role)).then(({ error }) => { if (error) console.error(error); });
  };
  const updateVolunteerRole = (updated: VolunteerRole) => {
    setVolunteerRoles(prev => prev.map(r => r.id === updated.id ? updated : r));
    supabase.from('volunteer_roles').update(toRoleRow(updated)).eq('id', updated.id).then(({ error }) => { if (error) console.error(error); });
  };
  const deleteVolunteerRole = (id: string) => {
    setVolunteerRoles(prev => prev.filter(r => r.id !== id));
    audit('DELETE', 'VolunteerRole', id, 'Deleted volunteer role');
    supabase.from('volunteer_roles').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  };

  // ---------------------------------------------------------------------------
  // Campaigns
  // ---------------------------------------------------------------------------
  const addCampaign = (campaign: Campaign) => {
    setCampaigns(prev => [campaign, ...prev]);
    audit('CREATE', 'Campaign', campaign.id, `Created campaign: ${campaign.title}`);
    supabase.from('campaigns').insert(toCampaignRow(campaign)).then(({ error }) => { if (error) console.error(error); });
  };
  const updateCampaign = (updated: Campaign) => {
    setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
    audit('UPDATE', 'Campaign', updated.id, `Updated campaign: ${updated.title}`);
    supabase.from('campaigns').update(toCampaignRow(updated)).eq('id', updated.id).then(({ error }) => { if (error) console.error(error); });
  };
  const deleteCampaign = (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    audit('DELETE', 'Campaign', id, 'Deleted campaign');
    supabase.from('campaigns').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  };

  // ---------------------------------------------------------------------------
  // Pledges
  // ---------------------------------------------------------------------------
  const addPledge = (pledge: Pledge) => {
    setPledges(prev => [pledge, ...prev]);
    audit('CREATE', 'Pledge', pledge.id, `New pledge: ₵${pledge.pledgeAmount}`);
    supabase.from('pledges').insert(toPledgeRow(pledge)).then(({ error }) => { if (error) console.error(error); });
  };
  const updatePledge = (updated: Pledge) => {
    setPledges(prev => prev.map(p => p.id === updated.id ? updated : p));
    supabase.from('pledges').update(toPledgeRow(updated)).eq('id', updated.id).then(({ error }) => { if (error) console.error(error); });
  };
  const deletePledge = (id: string) => {
    setPledges(prev => prev.filter(p => p.id !== id));
    audit('DELETE', 'Pledge', id, 'Deleted pledge');
    supabase.from('pledges').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  };
  const recordPledgePayment = (payment: PledgePayment) => {
    setPledgePayments(prev => [payment, ...prev]);
    setPledges(prev => prev.map(p => p.id === payment.pledgeId ? { ...p, paidAmount: Math.min(p.paidAmount + payment.amount, p.pledgeAmount) } : p));
    audit('UPDATE', 'Pledge', payment.pledgeId, `Payment recorded: ₵${payment.amount}`);
    supabase.from('pledge_payments').insert(toPaymentRow(payment)).then(({ error }) => { if (error) console.error(error); });
    const pledge = pledges.find(p => p.id === payment.pledgeId);
    if (pledge) {
      const newPaid = Math.min(pledge.paidAmount + payment.amount, pledge.pledgeAmount);
      supabase.from('pledges').update({ paid_amount: newPaid }).eq('id', payment.pledgeId).then(({ error }) => { if (error) console.error(error); });
    }
  };

  // ---------------------------------------------------------------------------
  // Visitors (localStorage)
  // ---------------------------------------------------------------------------
  const addVisitor = (v: VisitorRecord) => setVisitors(prev => [v, ...prev]);
  const updateVisitor = (v: VisitorRecord) => setVisitors(prev => prev.map(x => x.id === v.id ? v : x));
  const deleteVisitor = (id: string) => setVisitors(prev => prev.filter(x => x.id !== id));

  return (
    <DataContext.Provider value={{
      loading,
      members, departments, smallGroups, attendance, giving, events, campuses,
      prayerRequests, pastoralVisits, volunteerRoles, campaigns, pledges, pledgePayments, auditLogs,
      visitors,
      theme, toggleTheme,
      addMember, updateMember, deleteMember, importMembers,
      addAttendance,
      addGiving, deleteGiving,
      addEvent, updateEvent, deleteEvent,
      addDepartment, updateDepartment,
      addSmallGroup, updateSmallGroup,
      addCampus, updateCampus, deleteCampus,
      addPrayerRequest, updatePrayerRequest, deletePrayerRequest,
      addPastoralVisit, updatePastoralVisit, deletePastoralVisit,
      addVolunteerRole, updateVolunteerRole, deleteVolunteerRole,
      addCampaign, updateCampaign, deleteCampaign,
      addPledge, updatePledge, deletePledge, recordPledgePayment,
      addVisitor, updateVisitor, deleteVisitor,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
}
