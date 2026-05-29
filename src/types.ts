// Database Schemas for Time Sheet & Log Sheet Application

export type UserRole = 'Employee' | 'Manager' | 'Admin';

export type WorkMode = 'On-Site' | 'Field' | 'Remote';

export type LogStatus = 'Pending' | 'Approved' | 'Rejected';

export interface User {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  default_work_mode: WorkMode;
}

export interface GeofenceHub {
  location_id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

export interface TimeLog {
  log_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  work_mode: WorkMode;
  clock_in_time: string; // ISO string or empty
  clock_out_time: string | null; // ISO string or null
  clock_in_lat: number | null;
  clock_in_long: number | null;
  clock_out_lat: number | null;
  clock_out_long: number | null;
  geofence_verified: boolean;
  daily_summary_notes: string;
  status: LogStatus;
  correction_notes?: string; // Optional reasoning for manual adjustment
  is_offline_cached?: boolean; // Offline Mode indicator
}

export interface TimeCorrectionRequest {
  id: string;
  user_id: string;
  date: string;
  requested_work_mode: WorkMode;
  requested_in_time: string;
  requested_out_time: string;
  justification: string;
  status: LogStatus;
  created_at: string;
}
