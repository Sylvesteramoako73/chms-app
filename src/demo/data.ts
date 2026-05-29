import type {
  Member, Department, SmallGroup, AttendanceRecord, GivingRecord,
  EventRecord, Campus, PrayerRequest, PastoralVisit, VolunteerRole,
  Campaign, Pledge, PledgePayment, VisitorRecord,
} from '../types';

const d = (daysAgo: number) => {
  const dt = new Date('2026-05-27');
  dt.setDate(dt.getDate() - daysAgo);
  return dt.toISOString().split('T')[0];
};

export const DEMO_CAMPUS_ID = 'demo-campus-main';

export const demoCampuses: Campus[] = [
  { id: DEMO_CAMPUS_ID,        name: 'Grace Cathedral — Main', address: 'Liberation Road, Accra', pastor: 'Rev. Emmanuel Asante', isMain: true },
  { id: 'demo-campus-tema',    name: 'Tema Branch',            address: 'Community 5, Tema',      pastor: 'Rev. Kwame Boateng',   isMain: false },
];

export const demoDepartments: Department[] = [
  { id: 'dept-music',  name: 'Music Ministry',    description: 'Worship team and choir' },
  { id: 'dept-ush',    name: 'Ushering',           description: 'Welcome and seating' },
  { id: 'dept-media',  name: 'Media & Technology', description: 'Sound, lighting, livestream' },
  { id: 'dept-youth',  name: 'Youth Ministry',     description: 'Teen and young adult ministry' },
  { id: 'dept-prayer', name: 'Prayer Team',        description: 'Intercession and prayer meetings' },
  { id: 'dept-men',    name: "Men's Fellowship",   description: "Monthly men's meetings" },
  { id: 'dept-women',  name: "Women's Ministry",   description: "Women's fellowship and care" },
];

export const demoSmallGroups: SmallGroup[] = [
  { id: 'sg-north', name: 'Northside Cell', meetingDay: 'Tuesday',   meetingTime: '18:30' },
  { id: 'sg-south', name: 'Southside Cell', meetingDay: 'Wednesday', meetingTime: '19:00' },
  { id: 'sg-youth', name: 'Youth Cell',     meetingDay: 'Friday',    meetingTime: '17:00' },
];

export const demoMembers: Member[] = [
  { id: 'mem-001', firstName: 'Emmanuel', lastName: 'Kwarteng',  address: '', gender: 'Male',   maritalStatus: 'Married',  status: 'Active',   joinDate: '2018-03-10', phone: '0244100001', email: 'ekwarteng@demo.com',  departmentId: 'dept-music',  campusId: DEMO_CAMPUS_ID,       dateOfBirth: '1985-06-15' },
  { id: 'mem-002', firstName: 'Abena',    lastName: 'Asante',    address: '', gender: 'Female', maritalStatus: 'Single',   status: 'Active',   joinDate: '2019-07-22', phone: '0244100002', email: 'aasante@demo.com',    departmentId: 'dept-ush',    campusId: DEMO_CAMPUS_ID,       dateOfBirth: '1993-02-28' },
  { id: 'mem-003', firstName: 'Kwame',    lastName: 'Mensah',    address: '', gender: 'Male',   maritalStatus: 'Married',  status: 'Active',   joinDate: '2017-01-05', phone: '0244100003', email: 'kmensah@demo.com',    departmentId: 'dept-media',  campusId: DEMO_CAMPUS_ID,       dateOfBirth: '1980-11-03' },
  { id: 'mem-004', firstName: 'Ama',      lastName: 'Boateng',   address: '', gender: 'Female', maritalStatus: 'Single',   status: 'Active',   joinDate: '2021-04-18', phone: '0244100004', email: 'aboateng@demo.com',   departmentId: 'dept-youth',  campusId: DEMO_CAMPUS_ID,       dateOfBirth: '2000-08-17' },
  { id: 'mem-005', firstName: 'Joseph',   lastName: 'Owusu',     address: '', gender: 'Male',   maritalStatus: 'Married',  status: 'Active',   joinDate: '2016-09-30', phone: '0244100005', email: 'jowusu@demo.com',     departmentId: 'dept-prayer', campusId: DEMO_CAMPUS_ID,       dateOfBirth: '1976-04-09' },
  { id: 'mem-006', firstName: 'Grace',    lastName: 'Amoah',     address: '', gender: 'Female', maritalStatus: 'Married',  status: 'Active',   joinDate: '2015-02-14', phone: '0244100006', email: 'gamoah@demo.com',     departmentId: 'dept-women',  campusId: DEMO_CAMPUS_ID,       dateOfBirth: '1972-12-25' },
  { id: 'mem-007', firstName: 'Daniel',   lastName: 'Ansah',     address: '', gender: 'Male',   maritalStatus: 'Married',  status: 'Active',   joinDate: '2014-11-01', phone: '0244100007', email: 'dansah@demo.com',     departmentId: 'dept-men',    campusId: DEMO_CAMPUS_ID,       dateOfBirth: '1969-07-21' },
  { id: 'mem-008', firstName: 'Priscilla',lastName: 'Frimpong',  address: '', gender: 'Female', maritalStatus: 'Single',   status: 'Active',   joinDate: '2022-06-05', phone: '0244100008', email: 'pfrimpong@demo.com',  departmentId: 'dept-ush',    campusId: DEMO_CAMPUS_ID,       dateOfBirth: '1997-03-12' },
  { id: 'mem-009', firstName: 'Samuel',   lastName: 'Dartey',    address: '', gender: 'Male',   maritalStatus: 'Married',  status: 'Active',   joinDate: '2020-10-20', phone: '0244100009', email: 'sdartey@demo.com',    departmentId: 'dept-music',  campusId: DEMO_CAMPUS_ID,       dateOfBirth: '1988-09-04' },
  { id: 'mem-010', firstName: 'Comfort',  lastName: 'Agyemang',  address: '', gender: 'Female', maritalStatus: 'Single',   status: 'Active',   joinDate: '2023-01-08', phone: '0244100010', email: 'cagyemang@demo.com',  departmentId: 'dept-youth',  campusId: DEMO_CAMPUS_ID,       dateOfBirth: '2002-05-30' },
  { id: 'mem-011', firstName: 'Isaac',    lastName: 'Oppong',    address: '', gender: 'Male',   maritalStatus: 'Single',   status: 'Active',   joinDate: '2018-08-16', phone: '0244100011', email: 'ioppong@demo.com',    departmentId: 'dept-media',  campusId: DEMO_CAMPUS_ID,       dateOfBirth: '1991-01-18' },
  { id: 'mem-012', firstName: 'Rebecca',  lastName: 'Asare',     address: '', gender: 'Female', maritalStatus: 'Married',  status: 'Active',   joinDate: '2013-05-26', phone: '0244100012', email: 'rasare@demo.com',     departmentId: 'dept-prayer', campusId: DEMO_CAMPUS_ID,       dateOfBirth: '1968-10-11' },
  { id: 'mem-013', firstName: 'Frank',    lastName: 'Adjei',     address: '', gender: 'Male',   maritalStatus: 'Single',   status: 'Active',   joinDate: '2024-02-14', phone: '0244100013', email: 'fadjei@demo.com',     departmentId: 'dept-music',  campusId: 'demo-campus-tema',   dateOfBirth: '1995-04-22' },
  { id: 'mem-014', firstName: 'Nana',     lastName: 'Akosua',    address: '', gender: 'Female', maritalStatus: 'Married',  status: 'Active',   joinDate: '2019-11-30', phone: '0244100014', email: 'nakosua@demo.com',    departmentId: 'dept-women',  campusId: 'demo-campus-tema',   dateOfBirth: '1978-07-07' },
  { id: 'mem-015', firstName: 'Yaw',      lastName: 'Darko',     address: '', gender: 'Male',   maritalStatus: 'Married',  status: 'Inactive', joinDate: '2015-03-11', phone: '0244100015', email: 'ydarko@demo.com',                          campusId: DEMO_CAMPUS_ID,       dateOfBirth: '1973-02-02' },
];

const memberIds = demoMembers.filter(m => m.campusId === DEMO_CAMPUS_ID && m.status === 'Active').map(m => m.id);

export const demoAttendance: AttendanceRecord[] = [
  { id: 'att-001', serviceType: 'Sunday First Service',  date: d(7),  presentMemberIds: memberIds.slice(0, 10), visitorsCount: 8,  campusId: DEMO_CAMPUS_ID },
  { id: 'att-002', serviceType: 'Sunday Second Service', date: d(7),  presentMemberIds: memberIds.slice(2, 11), visitorsCount: 5,  campusId: DEMO_CAMPUS_ID },
  { id: 'att-003', serviceType: 'Midweek',               date: d(10), presentMemberIds: memberIds.slice(0, 7),  visitorsCount: 2,  campusId: DEMO_CAMPUS_ID },
  { id: 'att-004', serviceType: 'Sunday First Service',  date: d(14), presentMemberIds: memberIds.slice(1, 12), visitorsCount: 11, campusId: DEMO_CAMPUS_ID },
  { id: 'att-005', serviceType: 'Sunday Second Service', date: d(14), presentMemberIds: memberIds.slice(0, 9),  visitorsCount: 6,  campusId: DEMO_CAMPUS_ID },
  { id: 'att-006', serviceType: 'Sunday First Service',  date: d(21), presentMemberIds: memberIds.slice(0, 11), visitorsCount: 9,  campusId: DEMO_CAMPUS_ID },
  { id: 'att-007', serviceType: 'Prayer Meeting',        date: d(4),  presentMemberIds: memberIds.slice(4, 10), visitorsCount: 1,  campusId: DEMO_CAMPUS_ID },
];

export const demoGiving: GivingRecord[] = [
  { id: 'giv-001', memberId: 'mem-001', date: d(7),  amount: 500,  type: 'Tithe',    paymentMethod: 'Mobile Money',  campusId: DEMO_CAMPUS_ID },
  { id: 'giv-002', memberId: 'mem-002', date: d(7),  amount: 200,  type: 'Offering', paymentMethod: 'Cash',          campusId: DEMO_CAMPUS_ID },
  { id: 'giv-003', memberId: 'mem-003', date: d(7),  amount: 1200, type: 'Tithe',    paymentMethod: 'Mobile Money',  campusId: DEMO_CAMPUS_ID },
  { id: 'giv-004', memberId: 'mem-004', date: d(7),  amount: 100,  type: 'Offering', paymentMethod: 'Cash',          campusId: DEMO_CAMPUS_ID },
  { id: 'giv-005', memberId: 'mem-005', date: d(7),  amount: 800,  type: 'Tithe',    paymentMethod: 'Bank Transfer', campusId: DEMO_CAMPUS_ID },
  { id: 'giv-006', memberId: 'mem-006', date: d(7),  amount: 300,  type: 'Seed',     paymentMethod: 'Cash',          campusId: DEMO_CAMPUS_ID },
  { id: 'giv-007', memberId: 'mem-007', date: d(7),  amount: 2000, type: 'Tithe',    paymentMethod: 'Bank Transfer', campusId: DEMO_CAMPUS_ID },
  { id: 'giv-008', memberId: 'mem-008', date: d(14), amount: 150,  type: 'Offering', paymentMethod: 'Cash',          campusId: DEMO_CAMPUS_ID },
  { id: 'giv-009', memberId: 'mem-009', date: d(14), amount: 600,  type: 'Tithe',    paymentMethod: 'Mobile Money',  campusId: DEMO_CAMPUS_ID },
  { id: 'giv-010', memberId: 'mem-010', date: d(14), amount: 50,   type: 'Offering', paymentMethod: 'Cash',          campusId: DEMO_CAMPUS_ID },
  { id: 'giv-011', memberId: 'mem-011', date: d(14), amount: 400,  type: 'Tithe',    paymentMethod: 'Mobile Money',  campusId: DEMO_CAMPUS_ID },
  { id: 'giv-012', memberId: 'mem-012', date: d(14), amount: 750,  type: 'Tithe',    paymentMethod: 'Bank Transfer', campusId: DEMO_CAMPUS_ID },
  { id: 'giv-013', memberId: 'mem-001', date: d(35), amount: 500,  type: 'Tithe',    paymentMethod: 'Mobile Money',  campusId: DEMO_CAMPUS_ID },
  { id: 'giv-014', memberId: 'mem-003', date: d(35), amount: 1200, type: 'Tithe',    paymentMethod: 'Mobile Money',  campusId: DEMO_CAMPUS_ID },
  { id: 'giv-015', memberId: 'mem-007', date: d(35), amount: 2000, type: 'Tithe',    paymentMethod: 'Bank Transfer', campusId: DEMO_CAMPUS_ID },
  { id: 'giv-016', memberId: 'mem-005', date: d(35), amount: 800,  type: 'Tithe',    paymentMethod: 'Bank Transfer', campusId: DEMO_CAMPUS_ID },
  { id: 'giv-017', memberId: 'mem-009', date: d(35), amount: 600,  type: 'Tithe',    paymentMethod: 'Mobile Money',  campusId: DEMO_CAMPUS_ID },
  { id: 'giv-018', memberId: 'mem-013', date: d(7),  amount: 250,  type: 'Tithe',    paymentMethod: 'Cash',          campusId: 'demo-campus-tema' },
];

export const demoEvents: EventRecord[] = [
  { id: 'ev-001', title: 'Sunday First Service',   date: d(-7),  time: '07:30', location: 'Main Auditorium',         description: 'Weekly first service',                      organizer: 'Rev. Asante', isRecurring: true,  recurringPattern: 'Weekly', campusId: DEMO_CAMPUS_ID },
  { id: 'ev-002', title: 'Sunday Second Service',  date: d(-7),  time: '09:30', location: 'Main Auditorium',         description: 'Weekly second service',                     organizer: 'Rev. Asante', isRecurring: true,  recurringPattern: 'Weekly', campusId: DEMO_CAMPUS_ID },
  { id: 'ev-003', title: 'Annual Youth Convention',date: d(-14), time: '10:00', location: 'Convention Centre, Accra', description: 'Annual gathering for youth 13–35',          organizer: 'Youth Dept',  departmentId: 'dept-youth', expectedAttendance: 300, isRecurring: false, campusId: DEMO_CAMPUS_ID },
  { id: 'ev-004', title: 'Harvest Thanksgiving',   date: d(-30), time: '08:00', location: 'Main Auditorium',         description: 'Annual harvest celebration',                 organizer: 'Rev. Asante', expectedAttendance: 500, isRecurring: false, campusId: DEMO_CAMPUS_ID },
  { id: 'ev-005', title: 'Prayer & Fasting Week',  date: d(-45), time: '06:00', location: 'Prayer Room',             description: '7-day corporate prayer and fasting',         organizer: 'Prayer Team', departmentId: 'dept-prayer', isRecurring: false, campusId: DEMO_CAMPUS_ID },
];

export const demoPrayerRequests: PrayerRequest[] = [
  { id: 'pr-001', memberId: 'mem-004', title: 'University Exams',   body: 'Please pray for strength and wisdom during final exams.',      category: 'Spiritual', isPrivate: false, isAnswered: false, createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'pr-002', memberId: 'mem-006', title: 'Family Healing',     body: 'Prayer needed for husband recovering from surgery.',           category: 'Health',    isPrivate: false, isAnswered: false, createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'pr-003', memberId: 'mem-009', title: 'Business Breakthrough', body: 'Trusting God for favour with a new contract.',             category: 'Finance',   isPrivate: false, isAnswered: false, createdAt: new Date(Date.now() - 8 * 86400000).toISOString() },
  { id: 'pr-004', memberId: 'mem-012', title: 'Church Growth',      body: 'Interceding for souls to be won to Christ this month.',       category: 'Other',     isPrivate: false, isAnswered: true,  answeredNote: 'We recorded 14 new salvations last Sunday!', createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
];

export const demoPastoralVisits: PastoralVisit[] = [
  { id: 'pv-001', memberId: 'mem-015', visitType: 'Home Visit',    date: d(10), conductedBy: 'Rev. Asante', notes: 'Encouraged Yaw after extended absence. Committed to returning.', followUpDate: d(-7), followUpComplete: false },
  { id: 'pv-002', memberId: 'mem-006', visitType: 'Hospital Visit',date: d(6),  conductedBy: 'Pastor Kofi', notes: 'Visited Grace at Ridge Hospital. Husband doing well post-op.',   followUpComplete: true },
  { id: 'pv-003', memberId: 'mem-005', visitType: 'Counseling',    date: d(3),  conductedBy: 'Rev. Asante', notes: 'Marriage counselling session. Follow-up scheduled.',              followUpDate: d(-14), followUpComplete: false },
];

export const demoVolunteerRoles: VolunteerRole[] = [
  { id: 'vr-001', eventId: 'ev-003', roleName: 'Usher',          assignedMemberIds: ['mem-002', 'mem-008'], maxVolunteers: 5 },
  { id: 'vr-002', eventId: 'ev-003', roleName: 'Media Operator', assignedMemberIds: ['mem-011'],            maxVolunteers: 2 },
  { id: 'vr-003', eventId: 'ev-003', roleName: 'Worship Lead',   assignedMemberIds: ['mem-001', 'mem-009'], maxVolunteers: 3 },
];

export const demoCampaigns: Campaign[] = [
  { id: 'camp-001', title: 'Church Building Fund',  description: 'Raise funds for the new 1000-seat auditorium.',  goalAmount: 500000, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true },
  { id: 'camp-002', title: 'Missions Support 2026', description: 'Support missionaries in the Northern Region.',   goalAmount: 50000,  startDate: '2026-03-01', isActive: true },
];

export const demoPledges: Pledge[] = [
  { id: 'pl-001', campaignId: 'camp-001', memberId: 'mem-007', pledgeAmount: 10000, paidAmount: 4000, pledgeDate: '2026-01-15' },
  { id: 'pl-002', campaignId: 'camp-001', memberId: 'mem-003', pledgeAmount: 5000,  paidAmount: 2500, pledgeDate: '2026-01-15' },
  { id: 'pl-003', campaignId: 'camp-001', memberId: 'mem-005', pledgeAmount: 3000,  paidAmount: 1000, pledgeDate: '2026-02-01' },
  { id: 'pl-004', campaignId: 'camp-002', memberId: 'mem-001', pledgeAmount: 1200,  paidAmount: 600,  pledgeDate: '2026-03-05' },
];

export const demoPledgePayments: PledgePayment[] = [
  { id: 'pp-001', pledgeId: 'pl-001', amount: 2000, date: d(60), notes: 'First installment' },
  { id: 'pp-002', pledgeId: 'pl-001', amount: 2000, date: d(30), notes: 'Second installment' },
  { id: 'pp-003', pledgeId: 'pl-002', amount: 2500, date: d(45), notes: 'Single payment' },
  { id: 'pp-004', pledgeId: 'pl-003', amount: 1000, date: d(20) },
  { id: 'pp-005', pledgeId: 'pl-004', amount: 600,  date: d(10) },
];

export const demoVisitors: VisitorRecord[] = [
  { id: 'vis-001', name: 'Kofi Tetteh',  phone: '0244200001', email: 'ktetteh@demo.com', visitDate: d(7),  howHeard: 'Friend',       followUpStatus: 'Contacted', notes: 'Interested in joining Youth Ministry' },
  { id: 'vis-002', name: 'Akua Bonsu',   phone: '0244200002',                             visitDate: d(7),  howHeard: 'Social Media', followUpStatus: 'Pending' },
  { id: 'vis-003', name: 'Prince Narko', phone: '0244200003', email: 'pnarko@demo.com',  visitDate: d(14), howHeard: 'Walk-in',      followUpStatus: 'Converted', notes: 'Officially joined as member' },
];
