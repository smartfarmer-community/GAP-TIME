import { User, GeofenceHub, TimeLog, TimeCorrectionRequest } from './types';

// Seed Users List
export const INITIAL_USERS: User[] = [
  {
    user_id: 'emp1',
    name: 'Kwame Mensah',
    email: 'rabboniaugustine762@gmail.com', // Assigned user's email for seamless testing
    role: 'Employee',
    department: 'Field Agronomy',
    default_work_mode: 'Field',
  },
  {
    user_id: 'emp2',
    name: 'Ekow Essam',
    email: 'ekow@company.com',
    role: 'Employee',
    department: 'Operations',
    default_work_mode: 'On-Site',
  },
  {
    user_id: 'mgr1',
    name: 'Abena Osei',
    email: 'abena@company.com',
    role: 'Manager',
    department: 'Operations',
    default_work_mode: 'On-Site',
  },
  {
    user_id: 'adm1',
    name: 'Kojo Boateng',
    email: 'kojo@company.com',
    role: 'Admin',
    department: 'Finance',
    default_work_mode: 'Remote',
  }
];

// Seed Geofence Hubs
export const INITIAL_HUBS: GeofenceHub[] = [
  {
    location_id: 'hub1',
    location_name: 'Kumasi Administrative Studio',
    latitude: 6.6713,
    longitude: -1.6163,
    radius_meters: 100, // 100m geofence radius
  },
  {
    location_id: 'hub2',
    location_name: 'Main Processing Plant (Ejisu)',
    latitude: 6.7423,
    longitude: -1.5312,
    radius_meters: 200,
  },
  {
    location_id: 'hub3',
    location_name: 'Accra Liaison Office (Airport Residential)',
    latitude: 5.6037,
    longitude: -0.1870,
    radius_meters: 75,
  }
];

// Seed Time Logs
export const INITIAL_TIME_LOGS: TimeLog[] = [
  {
    log_id: 'log_prev1',
    user_id: 'emp1',
    date: '2026-05-28',
    work_mode: 'Field',
    clock_in_time: '2026-05-28T08:15:30Z',
    clock_out_time: '2026-05-28T17:05:12Z',
    clock_in_lat: 6.6850,
    clock_in_long: -1.6240,
    clock_out_lat: 6.6912,
    clock_out_long: -1.6185,
    geofence_verified: true, // Field does not block, but captures coordinate
    daily_summary_notes: 'Visited smallholder farming cooperative in Offinso. Reviewed soil moisture parameters.',
    status: 'Approved'
  },
  {
    log_id: 'log_prev2',
    user_id: 'emp2',
    date: '2026-05-28',
    work_mode: 'On-Site',
    clock_in_time: '2026-05-28T07:45:10Z',
    clock_out_time: '2026-05-28T16:30:00Z',
    clock_in_lat: 6.67135, // within Kumasi Administrative Studio 100m
    clock_in_long: -1.61628,
    clock_out_lat: 6.67129,
    clock_out_long: -1.61634,
    geofence_verified: true,
    daily_summary_notes: 'Assisted with seed sorting and warehouse inventory cataloging.',
    status: 'Approved'
  },
  {
    log_id: 'log_prev3',
    user_id: 'emp2',
    date: '2026-05-29',
    work_mode: 'On-Site',
    clock_in_time: '2026-05-29T08:02:15Z',
    clock_out_time: null, // Still active/clocked-in
    clock_in_lat: 6.67142, // within Kumasi Administrative Studio 100m
    clock_in_long: -1.61655,
    clock_out_lat: null,
    clock_out_long: null,
    geofence_verified: true,
    daily_summary_notes: '',
    status: 'Pending'
  },
  {
    log_id: 'log_anomaly1',
    user_id: 'emp2',
    date: '2026-05-27',
    work_mode: 'On-Site',
    clock_in_time: '2026-05-27T09:30:00Z',
    clock_out_time: '2026-05-27T17:30:00Z',
    clock_in_lat: 6.8123, // Outside geofence! (Simulated discrepancy alert)
    clock_in_long: -1.4512,
    clock_out_lat: 6.8124,
    clock_out_long: -1.4510,
    geofence_verified: false, // Geofence discrepancy alert
    daily_summary_notes: 'Claimed to work at Kumasi, but logged from outer ring. Overdue attendance.',
    status: 'Pending'
  }
];

// Seed Correction Requests
export const INITIAL_CORRECTIONS: TimeCorrectionRequest[] = [
  {
    id: 'corr1',
    user_id: 'emp1',
    date: '2026-05-26',
    requested_work_mode: 'Remote',
    requested_in_time: '2026-05-26T08:00:00Z',
    requested_out_time: '2026-05-26T17:00:00Z',
    justification: 'Battery on field tablet died completely during afternoon remote agronomy review. Requesting manual adjustments.',
    status: 'Pending',
    created_at: '2026-05-28T18:22:15Z'
  }
];

// Haversine formula to compute exact distance in meters between two geocoordinates
export function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // returns distance in meters
}

// Simulated GPS scenarios for testing & sandbox preview environments
export interface GPSScenario {
  name: string;
  latitude: number;
  longitude: number;
  description: string;
}

export const GPS_SCENARIOS: GPSScenario[] = [
  {
    name: 'Inside Kumasi Admin Studio (Center)',
    latitude: 6.6713,
    longitude: -1.6163,
    description: 'Perfectly centered in the Kumasi administrative office.',
  },
  {
    name: 'Near Kumasi Admin Studio (75m away)',
    latitude: 6.6719,
    longitude: -1.6165,
    description: 'Within the 100-meter radius geofenced office parameter.',
  },
  {
    name: 'Outside office bounds (Kumasi Airport - 6km away)',
    latitude: 6.7135,
    longitude: -1.5904,
    description: 'Simulates field travel or off-site discrepancy.',
  },
  {
    name: 'Inside Main Processing Plant (Ejisu)',
    latitude: 6.7423,
    longitude: -1.5312,
    description: 'Perfectly within Ejisu main hub bounds.',
  },
  {
    name: 'Remote Location (Accra Mall)',
    latitude: 5.6175,
    longitude: -0.1691,
    description: 'Simulates remote and home-based reporting.',
  }
];
