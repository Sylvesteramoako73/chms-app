import type { Department, SmallGroup, Member, AttendanceRecord, GivingRecord, EventRecord, Campus, PrayerRequest, PastoralVisit, VolunteerRole, Campaign, Pledge, PledgePayment, AuditLog } from '../types';
import { subDays, subMonths, addDays, format } from 'date-fns';

export const mockCampuses: Campus[] = [
  { id: 'c1', name: 'Main Campus', address: '123 Faith Avenue, Cityville, ST 12345', pastor: 'Pastor James Smith', isMain: true },
  { id: 'c2', name: 'Eastside Branch', address: '456 Grace Boulevard, Eastville, ST 12346', pastor: 'Pastor Mary Johnson', isMain: false },
];

export const mockDepartments: Department[] = [
  { id: 'd1', name: 'Choir', description: 'Music and worship ministry' },
  { id: 'd2', name: 'Ushers', description: 'Greeting, seating and hospitality' },
  { id: 'd3', name: 'Youth', description: 'Youth ministry — ages 13–25' },
  { id: 'd4', name: "Children's Ministry", description: 'Kids church and Sunday school' },
  { id: 'd5', name: 'Media', description: 'AV, broadcast and live streaming' },
];

export const mockSmallGroups: SmallGroup[] = [
  { id: 'sg1', name: 'Men of Valor', meetingDay: 'Tuesday', meetingTime: '19:00' },
  { id: 'sg2', name: 'Women of Grace', meetingDay: 'Wednesday', meetingTime: '18:30' },
  { id: 'sg3', name: 'Young Adults Connect', meetingDay: 'Friday', meetingTime: '19:00' },
];

const firstNames = {
  male: ['John', 'Michael', 'David', 'James', 'Daniel', 'Samuel', 'Emmanuel', 'Joseph', 'Peter', 'Paul', 'Joshua', 'Nathan', 'Benjamin', 'Isaac'],
  female: ['Sarah', 'Mary', 'Ruth', 'Esther', 'Naomi', 'Grace', 'Faith', 'Hope', 'Rebecca', 'Rachel', 'Deborah', 'Miriam', 'Hannah', 'Lydia'],
};
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin'];
const statuses = ['Active', 'Active', 'Active', 'Active', 'Inactive', 'New Convert', 'Visitor'] as const;

export const mockMembers: Member[] = Array.from({ length: 25 }).map((_, i) => ({
  id: `m${i + 1}`,
  firstName: firstNames.male[i % firstNames.male.length],
  lastName: lastNames[i % lastNames.length],
  phone: `+1-555-${Math.floor(1000000 + Math.random() * 9000000)}`,
  email: `${firstNames.male[i % firstNames.male.length].toLowerCase()}${lastNames[i % lastNames.length].toLowerCase()}@example.com`,
  address: `${Math.floor(Math.random() * 1000)} ${lastNames[i % lastNames.length]} Street`,
  dateOfBirth: format(subDays(new Date(), Math.floor(Math.random() * 365 * 30)), 'yyyy-MM-dd'),
  gender: i % 2 === 0 ? 'Male' : 'Female',
  maritalStatus: i % 2 === 0 ? 'Married' : 'Single',
  occupation: 'Software Engineer',
  departmentId: mockDepartments[i % mockDepartments.length].id,
  smallGroupId: mockSmallGroups[i % mockSmallGroups.length].id,
  campusId: mockCampuses[i % mockCampuses.length].id,
  status: statuses[i % statuses.length],
  joinDate: format(subMonths(new Date(), Math.floor(Math.random() * 12)), 'yyyy-MM-dd'),
  baptismDate: i % 3 === 0 ? format(subMonths(new Date(), Math.floor(Math.random() * 12)), 'yyyy-MM-dd') : undefined,
  notes: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
}));

export const mockAttendance: AttendanceRecord[] = [
  ...Array.from({ length: 8 }).map((_, i) => ({
    id: `a${i + 1}`,
    serviceType: 'Sunday First Service' as const,
    date: format(subDays(new Date(), i * 7), 'yyyy-MM-dd'),
    presentMemberIds: mockMembers.filter((_, mi) => (mi + i) % 5 !== 0).map(m => m.id),
    visitorsCount: 3 + (i % 5),
    campusId: 'c1',
  })),
  ...Array.from({ length: 4 }).map((_, i) => ({
    id: `a${i + 9}`,
    serviceType: 'Midweek' as const,
    date: format(subDays(new Date(), i * 7 + 4), 'yyyy-MM-dd'),
    presentMemberIds: mockMembers.filter((_, mi) => mi % 3 !== 0).map(m => m.id),
    visitorsCount: 1 + (i % 3),
    campusId: 'c1',
  })),
  ...Array.from({ length: 3 }).map((_, i) => ({
    id: `a${i + 13}`,
    serviceType: 'Prayer Meeting' as const,
    date: format(subDays(new Date(), i * 7 + 2), 'yyyy-MM-dd'),
    presentMemberIds: mockMembers.filter((_, mi) => mi % 2 === 0).map(m => m.id),
    visitorsCount: i,
    campusId: 'c1',
  })),
];

const givingTypes = ['Tithe', 'Offering', 'Seed', 'Project', 'Other'] as const;
const paymentMethods = ['Cash', 'Mobile Money', 'Bank Transfer'] as const;
const amounts = [50, 100, 150, 200, 250, 500, 1000];

export const mockGiving: GivingRecord[] = Array.from({ length: 45 }).map((_, i) => ({
  id: `g${i + 1}`,
  memberId: mockMembers[i % 22].id,
  date: format(subDays(new Date(), Math.floor(i * 2.5)), 'yyyy-MM-dd'),
  amount: amounts[i % amounts.length],
  type: givingTypes[i % givingTypes.length],
  paymentMethod: paymentMethods[i % paymentMethods.length],
  campusId: 'c1',
  notes: i % 8 === 0 ? 'Special pledge' : undefined,
}));

export const mockEvents: EventRecord[] = [
  { id: 'e1', title: 'Sunday Worship Service', date: format(addDays(new Date(), 2), 'yyyy-MM-dd'), time: '09:00', location: 'Main Auditorium', description: 'Join us for our weekly Sunday worship service featuring praise, teaching, and fellowship.', organizer: 'Church Admin', expectedAttendance: 200, isRecurring: true, recurringPattern: 'Weekly', campusId: 'c1' },
  { id: 'e2', title: 'Midweek Bible Study', date: format(addDays(new Date(), 4), 'yyyy-MM-dd'), time: '18:30', location: 'Fellowship Hall', description: 'Deep dive into the Word. Currently studying the book of Romans.', organizer: 'Pastoral Team', expectedAttendance: 80, isRecurring: true, recurringPattern: 'Weekly', campusId: 'c1' },
  { id: 'e3', title: 'Youth Conference 2026', date: format(addDays(new Date(), 14), 'yyyy-MM-dd'), time: '10:00', location: 'Main Auditorium', description: 'Annual youth gathering — theme: "Rooted & Rising". Guest speakers, workshops, and worship.', departmentId: 'd3', organizer: 'Youth Pastor', expectedAttendance: 150, isRecurring: false, campusId: 'c1' },
  { id: 'e4', title: "Women's Prayer Breakfast", date: format(addDays(new Date(), 7), 'yyyy-MM-dd'), time: '08:00', location: 'Church Café', description: 'Monthly prayer breakfast for women of the congregation.', organizer: 'Sister Grace Williams', expectedAttendance: 40, isRecurring: true, recurringPattern: 'Monthly', campusId: 'c1' },
  { id: 'e5', title: 'Choir Rehearsal', date: format(addDays(new Date(), 5), 'yyyy-MM-dd'), time: '17:00', location: 'Choir Room', description: 'Weekly rehearsal in preparation for Sunday worship.', departmentId: 'd1', organizer: 'Minister of Music', expectedAttendance: 25, isRecurring: true, recurringPattern: 'Weekly', campusId: 'c1' },
  { id: 'e6', title: 'Community Outreach Day', date: format(addDays(new Date(), 21), 'yyyy-MM-dd'), time: '09:00', location: 'City Park & Surroundings', description: 'Annual community outreach — food distribution, free medical checks, and gospel sharing.', organizer: 'Outreach Committee', expectedAttendance: 300, isRecurring: false, campusId: 'c1' },
  { id: 'e7', title: 'Sunday Second Service', date: format(addDays(new Date(), 2), 'yyyy-MM-dd'), time: '11:30', location: 'Main Auditorium', description: 'Second Sunday morning service for those who prefer a later start.', organizer: 'Church Admin', expectedAttendance: 150, isRecurring: true, recurringPattern: 'Weekly', campusId: 'c1' },
  { id: 'e8', title: "Men's Leadership Summit", date: format(subDays(new Date(), 10), 'yyyy-MM-dd'), time: '08:00', location: 'Conference Room A', description: 'Annual leadership development day for men of the church.', organizer: 'Elder Board', expectedAttendance: 50, isRecurring: false, campusId: 'c1' },
];

export const mockPrayerRequests: PrayerRequest[] = [
  { id: 'pr1', memberId: 'm1', title: 'Healing for my mother', body: 'My mother is recovering from surgery. Please pray for quick healing and strength for our family during this time.', category: 'Health', isPrivate: false, isAnswered: false, createdAt: format(subDays(new Date(), 2), 'yyyy-MM-dd') },
  { id: 'pr2', memberId: 'm3', title: 'Career guidance needed', body: 'Seeking wisdom for an important career decision. Need clarity and peace about the direction to take.', category: 'Work', isPrivate: false, isAnswered: false, createdAt: format(subDays(new Date(), 5), 'yyyy-MM-dd') },
  { id: 'pr3', title: 'Financial breakthrough', body: 'Pray for financial breakthrough and debt resolution. Trusting God for a miracle in this situation.', category: 'Finance', isPrivate: true, isAnswered: false, createdAt: format(subDays(new Date(), 7), 'yyyy-MM-dd') },
  { id: 'pr4', memberId: 'm5', title: 'Praise — Got the job!', body: 'Thank you all for praying. I got the job I applied for! God is faithful and this is such a blessing.', category: 'Work', isPrivate: false, isAnswered: true, answeredNote: 'Prayer answered — member received the job offer within 2 weeks.', createdAt: format(subDays(new Date(), 14), 'yyyy-MM-dd') },
  { id: 'pr5', memberId: 'm7', title: 'Restored family relationship', body: 'Praying for restoration in my relationship with my son. We have not spoken in months and my heart is broken.', category: 'Family', isPrivate: false, isAnswered: false, createdAt: format(subDays(new Date(), 10), 'yyyy-MM-dd') },
  { id: 'pr6', memberId: 'm2', title: 'Healing from chronic pain', body: 'Have been dealing with chronic back pain for over a year. Praying for healing and for doctors to have wisdom.', category: 'Health', isPrivate: false, isAnswered: false, createdAt: format(subDays(new Date(), 3), 'yyyy-MM-dd') },
  { id: 'pr7', memberId: 'm9', title: 'Spiritual growth & discipline', body: 'Praying for deeper spiritual discipline, especially in daily Bible reading and a consistent prayer life.', category: 'Spiritual', isPrivate: false, isAnswered: false, createdAt: format(subDays(new Date(), 6), 'yyyy-MM-dd') },
  { id: 'pr8', memberId: 'm11', title: 'New job answered!', body: 'God provided a new position with better work-life balance. Standing in faith that this is His provision!', category: 'Work', isPrivate: false, isAnswered: true, answeredNote: 'Found a new job within 3 weeks of prayer request.', createdAt: format(subDays(new Date(), 20), 'yyyy-MM-dd') },
  { id: 'pr9', title: 'Salvation for my household', body: 'Praying for peace and salvation to come to my entire family. Standing on the promise that my household shall be saved.', category: 'Spiritual', isPrivate: false, isAnswered: false, createdAt: format(subDays(new Date(), 1), 'yyyy-MM-dd') },
  { id: 'pr10', memberId: 'm14', title: 'Safe relocation', body: 'Moving to a new city next month. Praying for a smooth transition, housing, and a new church community to plug into.', category: 'Family', isPrivate: false, isAnswered: false, createdAt: format(subDays(new Date(), 8), 'yyyy-MM-dd') },
];

export const mockPastoralVisits: PastoralVisit[] = [
  { id: 'pv1', memberId: 'm4', visitType: 'Home Visit', date: format(subDays(new Date(), 3), 'yyyy-MM-dd'), conductedBy: 'Pastor James', notes: 'Member recovering from illness. Prayed together. Family in good spirits and grateful for the visit.', followUpDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'), followUpComplete: false },
  { id: 'pv2', memberId: 'm8', visitType: 'Phone Call', date: format(subDays(new Date(), 7), 'yyyy-MM-dd'), conductedBy: 'Elder Paul', notes: 'Member has been absent for 3 weeks. Called to check in. Will follow up with a home visit next week.', followUpDate: format(addDays(new Date(), 3), 'yyyy-MM-dd'), followUpComplete: false },
  { id: 'pv3', memberId: 'm12', visitType: 'Hospital Visit', date: format(subDays(new Date(), 14), 'yyyy-MM-dd'), conductedBy: 'Pastor James', notes: "Member had major surgery. Visited at St. Luke's Hospital. Good recovery progress and great spirits.", followUpComplete: true },
  { id: 'pv4', memberId: 'm6', visitType: 'Counseling', date: format(subDays(new Date(), 5), 'yyyy-MM-dd'), conductedBy: 'Deacon Thomas', notes: 'Pre-marital counseling session 2 of 4. Covered communication styles and financial planning together.', followUpDate: format(addDays(new Date(), 10), 'yyyy-MM-dd'), followUpComplete: false },
  { id: 'pv5', memberId: 'm15', visitType: 'Home Visit', date: format(subDays(new Date(), 20), 'yyyy-MM-dd'), conductedBy: 'Pastor James', notes: 'New convert follow-up. Provided Bible study materials. Very eager and hungry to grow in faith.', followUpComplete: true },
  { id: 'pv6', memberId: 'm2', visitType: 'Follow-up', date: format(subDays(new Date(), 2), 'yyyy-MM-dd'), conductedBy: 'Elder Paul', notes: 'Checking on member who mentioned feeling overwhelmed at work. Provided encouragement and prayer support.', followUpDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'), followUpComplete: false },
  { id: 'pv7', memberId: 'm10', visitType: 'Phone Call', date: format(subDays(new Date(), 10), 'yyyy-MM-dd'), conductedBy: 'Deacon Thomas', notes: 'Birthday call. Member appreciated the gesture greatly and confirmed they will return to service next Sunday.', followUpComplete: true },
  { id: 'pv8', memberId: 'm18', visitType: 'Counseling', date: format(subDays(new Date(), 1), 'yyyy-MM-dd'), conductedBy: 'Pastor James', notes: 'Grief counseling — member recently lost a parent. Arranged additional support and connected with a counselor.', followUpDate: format(addDays(new Date(), 5), 'yyyy-MM-dd'), followUpComplete: false },
];

export const mockVolunteerRoles: VolunteerRole[] = [
  { id: 'vr1', eventId: 'e1', roleName: 'Usher', assignedMemberIds: ['m1', 'm3', 'm7'], maxVolunteers: 6 },
  { id: 'vr2', eventId: 'e1', roleName: 'Choir', assignedMemberIds: ['m2', 'm4', 'm6', 'm8'], maxVolunteers: 20 },
  { id: 'vr3', eventId: 'e1', roleName: 'AV / Media', assignedMemberIds: ['m5', 'm11'], maxVolunteers: 4 },
  { id: 'vr4', eventId: 'e1', roleName: "Children's Church", assignedMemberIds: ['m9', 'm13'], maxVolunteers: 5 },
  { id: 'vr5', eventId: 'e2', roleName: 'Worship Leader', assignedMemberIds: ['m2'], maxVolunteers: 2 },
  { id: 'vr6', eventId: 'e2', roleName: 'Usher', assignedMemberIds: ['m14', 'm16'] },
  { id: 'vr7', eventId: 'e3', roleName: 'Registration', assignedMemberIds: ['m10', 'm12', 'm15'], maxVolunteers: 5 },
  { id: 'vr8', eventId: 'e3', roleName: 'Security', assignedMemberIds: ['m17', 'm19'], maxVolunteers: 4 },
  { id: 'vr9', eventId: 'e5', roleName: 'Choir Members', assignedMemberIds: ['m2', 'm4', 'm6', 'm8', 'm20'] },
];

export const mockCampaigns: Campaign[] = [
  { id: 'camp1', title: 'Building Fund 2026', description: 'Expanding the main auditorium to seat 500 worshippers and adding new classrooms.', goalAmount: 250000, startDate: format(subMonths(new Date(), 2), 'yyyy-MM-dd'), endDate: format(addDays(new Date(), 365), 'yyyy-MM-dd'), isActive: true },
  { id: 'camp2', title: 'Missions Trip — Kenya', description: 'Supporting our annual outreach mission to Nairobi, Kenya — medical care and gospel sharing.', goalAmount: 30000, startDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd'), endDate: format(addDays(new Date(), 90), 'yyyy-MM-dd'), isActive: true },
  { id: 'camp3', title: 'Church Van Purchase', description: 'Purchasing a 15-passenger church van for the transportation ministry.', goalAmount: 45000, startDate: format(subMonths(new Date(), 4), 'yyyy-MM-dd'), endDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'), isActive: false },
];

export const mockPledges: Pledge[] = [
  { id: 'pl1', campaignId: 'camp1', memberId: 'm1', pledgeAmount: 5000, paidAmount: 2500, pledgeDate: format(subMonths(new Date(), 2), 'yyyy-MM-dd'), notes: 'Paying in monthly installments' },
  { id: 'pl2', campaignId: 'camp1', memberId: 'm3', pledgeAmount: 10000, paidAmount: 5000, pledgeDate: format(subMonths(new Date(), 2), 'yyyy-MM-dd') },
  { id: 'pl3', campaignId: 'camp1', memberId: 'm5', pledgeAmount: 3000, paidAmount: 3000, pledgeDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd'), notes: 'Paid in full — praised God!' },
  { id: 'pl4', campaignId: 'camp1', memberId: 'm7', pledgeAmount: 2000, paidAmount: 500, pledgeDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd') },
  { id: 'pl5', campaignId: 'camp2', memberId: 'm9', pledgeAmount: 1000, paidAmount: 500, pledgeDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd') },
  { id: 'pl6', campaignId: 'camp2', memberId: 'm11', pledgeAmount: 2000, paidAmount: 2000, pledgeDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd'), notes: 'Fully paid — faithful giver' },
  { id: 'pl7', campaignId: 'camp2', memberId: 'm13', pledgeAmount: 500, paidAmount: 250, pledgeDate: format(subDays(new Date(), 20), 'yyyy-MM-dd') },
  { id: 'pl8', campaignId: 'camp3', memberId: 'm15', pledgeAmount: 5000, paidAmount: 5000, pledgeDate: format(subMonths(new Date(), 3), 'yyyy-MM-dd') },
  { id: 'pl9', campaignId: 'camp1', memberId: 'm2', pledgeAmount: 8000, paidAmount: 3000, pledgeDate: format(subMonths(new Date(), 2), 'yyyy-MM-dd') },
  { id: 'pl10', campaignId: 'camp1', memberId: 'm4', pledgeAmount: 1500, paidAmount: 750, pledgeDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd') },
];

export const mockPledgePayments: PledgePayment[] = [
  { id: 'pp1', pledgeId: 'pl1', amount: 1000, date: format(subMonths(new Date(), 1), 'yyyy-MM-dd'), notes: 'First installment' },
  { id: 'pp2', pledgeId: 'pl1', amount: 1500, date: format(subDays(new Date(), 15), 'yyyy-MM-dd'), notes: 'Second installment' },
  { id: 'pp3', pledgeId: 'pl2', amount: 5000, date: format(subMonths(new Date(), 1), 'yyyy-MM-dd') },
  { id: 'pp4', pledgeId: 'pl3', amount: 3000, date: format(subMonths(new Date(), 1), 'yyyy-MM-dd'), notes: 'Full payment' },
  { id: 'pp5', pledgeId: 'pl5', amount: 500, date: format(subDays(new Date(), 10), 'yyyy-MM-dd') },
  { id: 'pp6', pledgeId: 'pl6', amount: 2000, date: format(subMonths(new Date(), 1), 'yyyy-MM-dd') },
  { id: 'pp7', pledgeId: 'pl8', amount: 5000, date: format(subMonths(new Date(), 3), 'yyyy-MM-dd') },
  { id: 'pp8', pledgeId: 'pl9', amount: 3000, date: format(subMonths(new Date(), 1), 'yyyy-MM-dd') },
];

export const mockAuditLogs: AuditLog[] = [
  { id: 'al1', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), entity: 'Member', action: 'CREATE', entityId: 'm25', description: 'Added member Hannah Martin' },
  { id: 'al2', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), entity: 'Member', action: 'UPDATE', entityId: 'm3', description: 'Updated member David Williams — status changed to Active' },
  { id: 'al3', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), entity: 'Attendance', action: 'CREATE', entityId: 'a1', description: 'Logged Sunday First Service attendance (20 present, 5 visitors)' },
  { id: 'al4', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), entity: 'Giving', action: 'CREATE', entityId: 'g45', description: 'Recorded $500 Tithe from John Smith' },
  { id: 'al5', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), entity: 'Event', action: 'CREATE', entityId: 'e3', description: 'Created event: Youth Conference 2026' },
  { id: 'al6', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), entity: 'Event', action: 'UPDATE', entityId: 'e1', description: 'Updated event: Sunday Worship Service — time changed to 09:00' },
  { id: 'al7', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), entity: 'PrayerRequest', action: 'CREATE', entityId: 'pr1', description: 'New prayer request from John Smith — Health' },
  { id: 'al8', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), entity: 'PastoralVisit', action: 'CREATE', entityId: 'pv1', description: 'Logged home visit for member m4 by Pastor James' },
  { id: 'al9', timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), entity: 'Member', action: 'UPDATE', entityId: 'm7', description: 'Updated member James Garcia — department changed to Youth' },
  { id: 'al10', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), entity: 'Giving', action: 'DELETE', entityId: 'g10', description: 'Deleted giving record — duplicate entry removed' },
  { id: 'al11', timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), entity: 'Campaign', action: 'CREATE', entityId: 'camp1', description: 'Created campaign: Building Fund 2026 ($250,000 goal)' },
  { id: 'al12', timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), entity: 'Pledge', action: 'CREATE', entityId: 'pl1', description: 'New pledge from member m1 — $5,000 for Building Fund' },
  { id: 'al13', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), entity: 'Department', action: 'UPDATE', entityId: 'd3', description: 'Updated department: Youth — description updated' },
  { id: 'al14', timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), entity: 'Member', action: 'CREATE', entityId: 'm20', description: 'Added member Deborah Anderson' },
  { id: 'al15', timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), entity: 'Campus', action: 'CREATE', entityId: 'c2', description: 'Added campus: Eastside Branch' },
];
