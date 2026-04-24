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
