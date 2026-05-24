export type UserRole = 'Administrator' | 'Pastor' | 'Department Head' | 'Data Entry';
export type MemberStatus = 'Active' | 'Inactive' | 'New Convert' | 'Visitor';
export type Gender = 'Male' | 'Female';
export type MaritalStatus = 'Single' | 'Married' | 'Divorced' | 'Widowed';
export type GivingType = 'Tithe' | 'Offering' | 'Seed' | 'Project' | 'Other';
export type PaymentMethod = 'Cash' | 'Mobile Money' | 'Bank Transfer';
export type ServiceType = 'Sunday First Service' | 'Sunday Second Service' | 'Midweek' | 'Prayer Meeting' | 'Special Program';
export type PrayerCategory = 'Health' | 'Family' | 'Finance' | 'Spiritual' | 'Work' | 'Other';
export type VisitType = 'Home Visit' | 'Hospital Visit' | 'Phone Call' | 'Counseling' | 'Follow-up';
export type VisitorFollowUpStatus = 'Pending' | 'Contacted' | 'Revisited' | 'Converted';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type AuditEntity =
  | 'Member' | 'Attendance' | 'Giving' | 'Event' | 'Department' | 'SmallGroup'
  | 'PrayerRequest' | 'PastoralVisit' | 'VolunteerRole' | 'Campaign' | 'Pledge' | 'Campus';

export interface Department {
  id: string;
  name: string;
  leaderId?: string;
  description?: string;
}

export interface SmallGroup {
  id: string;
  name: string;
  leaderId?: string;
  meetingDay: string;
  meetingTime: string;
}

export interface Campus {
  id: string;
  name: string;
  address?: string;
  pastor?: string;
  isMain: boolean;
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  dateOfBirth?: string;
  gender: Gender;
  maritalStatus: MaritalStatus;
  occupation?: string;
  departmentId?: string;
  smallGroupId?: string;
  campusId?: string;
  status: MemberStatus;
  joinDate: string;
  baptismDate?: string;
  notes?: string;
  avatarUrl?: string;
}

export interface AttendanceRecord {
  id: string;
  serviceType: ServiceType;
  date: string;
  presentMemberIds: string[];
  visitorsCount: number;
  campusId?: string;
  maleCount?: number;
  femaleCount?: number;
  childrenCount?: number;
  quickCount?: number;
}

export interface GivingRecord {
  id: string;
  memberId?: string;
  date: string;
  amount: number;
  type: GivingType;
  paymentMethod: PaymentMethod;
  campusId?: string;
  notes?: string;
}

export interface EventRecord {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  departmentId?: string;
  campusId?: string;
  organizer: string;
  expectedAttendance?: number;
  isRecurring: boolean;
  recurringPattern?: 'Weekly' | 'Monthly' | 'Yearly';
}

export interface PrayerRequest {
  id: string;
  memberId?: string;
  title: string;
  body: string;
  category: PrayerCategory;
  isPrivate: boolean;
  isAnswered: boolean;
  answeredNote?: string;
  createdAt: string;
}

export interface PastoralVisit {
  id: string;
  memberId: string;
  visitType: VisitType;
  date: string;
  conductedBy: string;
  notes?: string;
  followUpDate?: string;
  followUpComplete: boolean;
}

export interface VolunteerRole {
  id: string;
  eventId: string;
  roleName: string;
  assignedMemberIds: string[];
  maxVolunteers?: number;
}

export interface Campaign {
  id: string;
  title: string;
  description?: string;
  goalAmount: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

export interface Pledge {
  id: string;
  campaignId: string;
  memberId?: string;
  pledgeAmount: number;
  paidAmount: number;
  pledgeDate: string;
  notes?: string;
}

export interface PledgePayment {
  id: string;
  pledgeId: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface VisitorRecord {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  visitDate: string;
  serviceAttended?: string;
  howHeard?: string;
  followUpStatus: VisitorFollowUpStatus;
  followUpDate?: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  entity: AuditEntity;
  action: AuditAction;
  entityId: string;
  description: string;
}

// ============================================================
// OUTREACH & EVANGELISM
// ============================================================
export type OutreachType = 'House-to-House' | 'Street Evangelism' | 'Campus Outreach' | 'Community Event' | 'Online' | 'Other';
export type OutreachFollowUpStatus = 'Contacted' | 'Invited' | 'Attended' | 'Converted';
export type InterestLevel = 'High' | 'Medium' | 'Low';

export interface OutreachActivity {
  id: string;
  title: string;
  type: OutreachType;
  date: string;
  location: string;
  teamMemberIds: string[];
  prospectsReached: number;
  notes?: string;
}

export interface OutreachProspect {
  id: string;
  activityId?: string;
  name: string;
  phone?: string;
  address?: string;
  interestLevel: InterestLevel;
  status: OutreachFollowUpStatus;
  notes?: string;
  createdAt: string;
}

// ============================================================
// IN-APP NOTIFICATIONS
// ============================================================
export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  recipient: string;
  createdAt: string;
  createdBy?: string;
}

// ============================================================
// ASSETS & FACILITY MANAGEMENT
// ============================================================
export type AssetCategory = 'Equipment' | 'Instrument' | 'Vehicle' | 'Furniture' | 'Electronics' | 'Building' | 'Other';
export type AssetCondition = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Out of Service';
export type AssetStatus = 'Active' | 'In Maintenance' | 'Disposed';
export type FacilityType = 'Sanctuary' | 'Hall' | 'Office' | 'Classroom' | 'Kitchen' | 'Storage' | 'Outdoor' | 'Other';
export type MaintenanceType = 'Preventive' | 'Repair' | 'Inspection' | 'Replacement';
export type MaintenanceStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  serialNumber?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currentValue?: number;
  condition: AssetCondition;
  status: AssetStatus;
  facilityId?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
}

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  capacity?: number;
  features: string[];
  notes?: string;
}

export interface MaintenanceRecord {
  id: string;
  entityType: 'Asset' | 'Facility';
  entityId: string;
  title: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  reportedDate: string;
  completedDate?: string;
  cost?: number;
  performedBy?: string;
  notes?: string;
  createdAt: string;
}

// ============================================================
// WORKERS MANAGEMENT
// ============================================================
export type WorkerStatus = 'Active' | 'Inactive' | 'Suspended' | 'On Leave';

export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract';

export interface Worker {
  id: string;
  memberId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  jobTitle: string;
  employmentType: EmploymentType;
  status: WorkerStatus;
  startDate: string;
  notes?: string;
  createdAt: string;
}

export interface WorkerAttendance {
  id: string;
  workerId: string;
  date: string;
  serviceType: string;
  present: boolean;
  notes?: string;
}

export interface WorkerSchedule {
  id: string;
  workerId: string;
  date: string;
  startTime: string;
  endTime: string;
  duty: string;
  notes?: string;
  status: 'Scheduled' | 'Confirmed' | 'Cancelled';
}

// ============================================================
// AUTOMATION / REMINDER SYSTEM
// ============================================================
export type ReminderType = 'Birthday' | 'Anniversary' | 'Event' | 'Meeting' | 'Custom';
export type ReminderChannel = 'SMS' | 'WhatsApp' | 'Email';
export type ReminderStatus = 'Sent' | 'Failed' | 'Pending';

export interface ReminderTemplate {
  id: string;
  name: string;
  type: ReminderType;
  channel: ReminderChannel;
  subject?: string;
  body: string;
  isActive: boolean;
  daysBeforeEvent: number;
  createdAt: string;
}

export interface ReminderLog {
  id: string;
  templateId?: string;
  templateName?: string;
  recipientName: string;
  recipientContact: string;
  channel: ReminderChannel;
  type: ReminderType;
  message: string;
  sentAt: string;
  status: ReminderStatus;
}

// ============================================================
// CHILD CHECK-IN SYSTEM
// ============================================================
export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender: Gender;
  allergies?: string;
  medicalNotes?: string;
  classRoom?: string;
  qrCode: string;
  createdAt: string;
}

export interface Guardian {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  relationship: string;
  childIds: string[];
  memberId?: string;
  securityCode: string;
  isAuthorizedPickup: boolean;
}

export interface ChildCheckIn {
  id: string;
  childId: string;
  guardianId: string;
  checkInTime: string;
  checkOutTime?: string;
  checkInBy: string;
  checkOutBy?: string;
  date: string;
  notes?: string;
  status: 'Checked In' | 'Checked Out';
}

// ============================================================
// SERMON & MEDIA LIBRARY
// ============================================================
export interface Preacher {
  id: string;
  name: string;
  title?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface SermonCategory {
  id: string;
  name: string;
  color: string;
}

export interface Sermon {
  id: string;
  title: string;
  preacherId?: string;
  categoryId?: string;
  scripture?: string;
  description?: string;
  date: string;
  audioUrl?: string;
  videoUrl?: string;
  pdfUrl?: string;
  thumbnailUrl?: string;
  tags: string[];
  duration?: string;
  isFeatured: boolean;
  viewCount: number;
  createdAt: string;
}

// ============================================================
// CELL / SMALL GROUP MANAGEMENT
// ============================================================
export interface CellGroup {
  id: string;
  name: string;
  leaderId?: string;
  coLeaderId?: string;
  meetingDay?: string;
  meetingTime?: string;
  location?: string;
  description?: string;
  campusId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CellMember {
  id: string;
  cellId: string;
  memberId: string;
  role: 'Leader' | 'Co-Leader' | 'Member';
  joinDate: string;
}

export interface CellAttendance {
  id: string;
  cellId: string;
  date: string;
  presentMemberIds: string[];
  topicDiscussed?: string;
  offerings?: number;
  notes?: string;
}

export interface CellReport {
  id: string;
  cellId: string;
  date: string;
  reportedBy: string;
  attendance: number;
  newVisitors: number;
  conversions: number;
  topicCovered: string;
  highlights?: string;
  challenges?: string;
  prayerPoints?: string;
  createdAt: string;
}
