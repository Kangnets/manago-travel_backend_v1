export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EARLY_LEAVE = 'early-leave',
  HALF_DAY = 'half-day',
}

export interface Attendance {
  id: string;
  agencyId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  workHours?: number;
  status: AttendanceStatus;
  memo?: string;
  created: string;
  updated: string;
}
