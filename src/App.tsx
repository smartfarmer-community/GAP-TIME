import React, { useState, useEffect } from 'react';
import { User, GeofenceHub, TimeLog, TimeCorrectionRequest, WorkMode } from './types';
import { INITIAL_USERS, INITIAL_HUBS, INITIAL_TIME_LOGS, INITIAL_CORRECTIONS, getDistanceInMeters } from './data';
import GPSSimulator from './components/GPSSimulator';
import EmployeeDashboard from './components/EmployeeDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import AdminPanel from './components/AdminPanel';
import { Clock, Users, Database, ShieldAlert, CheckCircle, Smartphone, MapPin, Wifi, RefreshCw } from 'lucide-react';

export default function App() {
  // --- LOAD INITIAL PERSISTENT STATES FROM LOCALSTORAGE ---
  const [activeUser, setActiveUser] = useState<User>(() => {
    const cached = localStorage.getItem('geolog_active_user');
    return cached ? JSON.parse(cached) : INITIAL_USERS[0]; // Kwame Mensah (Employee with user's email)
  });

  const [hubs, setHubs] = useState<GeofenceHub[]>(() => {
    const cached = localStorage.getItem('geolog_hubs');
    return cached ? JSON.parse(cached) : INITIAL_HUBS;
  });

  const [logs, setLogs] = useState<TimeLog[]>(() => {
    const cached = localStorage.getItem('geolog_time_logs');
    return cached ? JSON.parse(cached) : INITIAL_TIME_LOGS;
  });

  const [corrections, setCorrections] = useState<TimeCorrectionRequest[]>(() => {
    const cached = localStorage.getItem('geolog_corrections');
    return cached ? JSON.parse(cached) : INITIAL_CORRECTIONS;
  });

  const [isOffline, setIsOffline] = useState<boolean>(() => {
    const cached = localStorage.getItem('geolog_is_offline');
    return cached ? JSON.parse(cached) === true : false;
  });

  const [offlineQueue, setOfflineQueue] = useState<TimeLog[]>(() => {
    const cached = localStorage.getItem('geolog_offline_queue');
    return cached ? JSON.parse(cached) : [];
  });

  // GPS Simulation variables
  const [currentLat, setCurrentLat] = useState<number>(6.6713); // Kumasi default
  const [currentLng, setCurrentLng] = useState<number>(-1.6163);
  const [locationScenarioName, setLocationScenarioName] = useState<string>('Inside Kumasi Admin Studio (Center)');

  // Synchronization notice state
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Active UI role view override (default to matching role, but allow side-by-side override)
  const [currentViewMode, setCurrentViewMode] = useState<string>('Employee');

  // Sync state changes with localStorage
  useEffect(() => {
    localStorage.setItem('geolog_active_user', JSON.stringify(activeUser));
  }, [activeUser]);

  useEffect(() => {
    localStorage.setItem('geolog_hubs', JSON.stringify(hubs));
  }, [hubs]);

  useEffect(() => {
    localStorage.setItem('geolog_time_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('geolog_corrections', JSON.stringify(corrections));
  }, [corrections]);

  useEffect(() => {
    localStorage.setItem('geolog_is_offline', JSON.stringify(isOffline));
  }, [isOffline]);

  useEffect(() => {
    localStorage.setItem('geolog_offline_queue', JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  // Keep interface view mode in sync with user's role on profile switch
  const handleUserChange = (newUser: User) => {
    setActiveUser(newUser);
    setCurrentViewMode(newUser.role);
  };

  // Synchronize Offline queue items with central logs
  const handleSyncQueue = () => {
    if (offlineQueue.length === 0) return;

    // Convert cached offline flags to clean online approvals
    const syncedLogs = logs.map(l => {
      const match = offlineQueue.find(q => q.log_id === l.log_id);
      if (match) {
        return {
          ...l,
          is_offline_cached: false
        };
      }
      return l;
    });

    setLogs(syncedLogs);
    setOfflineQueue([]);
    setSyncNotice('Synchronization complete! All locally cached logs sent to the cloud database successfully.');
    setTimeout(() => setSyncNotice(null), 5000);
  };

  // Handle auto-syncing if user switches back to Online
  const handleOfflineToggle = (state: boolean) => {
    setIsOffline(state);
    if (!state && offlineQueue.length > 0) {
      // Sync immediately when back online
      setTimeout(() => {
        handleSyncQueue();
      }, 800);
    }
  };

  const handleGPSChange = (lat: number, lng: number, scenarioName: string) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
    setLocationScenarioName(scenarioName);
  };

  // --- BUSINESS LOGIC HANDLERS ---

  // CLOCK IN Action
  const handleClockIn = (workMode: WorkMode, lat: number, lng: number, verified: boolean) => {
    const newLog: TimeLog = {
      log_id: 'log_' + Date.now(),
      user_id: activeUser.user_id,
      date: new Date().toISOString().split('T')[0],
      work_mode: workMode,
      clock_in_time: new Date().toISOString(),
      clock_out_time: null,
      clock_in_lat: lat,
      clock_in_long: lng,
      clock_out_lat: null,
      clock_out_long: null,
      geofence_verified: verified,
      daily_summary_notes: '',
      status: 'Pending',
      is_offline_cached: isOffline
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);

    if (isOffline) {
      setOfflineQueue([...offlineQueue, newLog]);
    }
  };

  // CLOCK OUT & LOG Action
  const handleClockOut = (lat: number, lng: number, summaryNotes: string) => {
    const activeLogIdx = logs.findIndex(l => l.user_id === activeUser.user_id && l.clock_out_time === null);
    if (activeLogIdx === -1) return;

    const updatedLogs = [...logs];
    const logToClose = { ...updatedLogs[activeLogIdx] };
    
    logToClose.clock_out_time = new Date().toISOString();
    logToClose.clock_out_lat = lat;
    logToClose.clock_out_long = lng;
    logToClose.daily_summary_notes = summaryNotes;
    logToClose.status = 'Pending';
    if (isOffline) {
      logToClose.is_offline_cached = true;
    }

    updatedLogs[activeLogIdx] = logToClose;
    setLogs(updatedLogs);

    if (isOffline) {
      // Update entry inside cached offline queue
      const inQueueIdx = offlineQueue.findIndex(q => q.log_id === logToClose.log_id);
      if (inQueueIdx !== -1) {
        const updatedQueue = [...offlineQueue];
        updatedQueue[inQueueIdx] = logToClose;
        setOfflineQueue(updatedQueue);
      } else {
        setOfflineQueue([...offlineQueue, logToClose]);
      }
    }
  };

  // ADJUSTMENT REQUEST SUBMISSION
  const handleCorrectionSubmit = (correction: Omit<TimeCorrectionRequest, 'id' | 'user_id' | 'status' | 'created_at'>) => {
    const newRequest: TimeCorrectionRequest = {
      id: 'corr_' + Date.now(),
      user_id: activeUser.user_id,
      ...correction,
      status: 'Pending',
      created_at: new Date().toISOString()
    };

    setCorrections([newRequest, ...corrections]);
  };

  // MANAGER TIMESHEET APPROVE
  const handleApproveLog = (logId: string) => {
    setLogs(prev => prev.map(l => l.log_id === logId ? { ...l, status: 'Approved' } : l));
  };

  // MANAGER TIMESHEET REJECT
  const handleRejectLog = (logId: string) => {
    setLogs(prev => prev.map(l => l.log_id === logId ? { ...l, status: 'Rejected' } : l));
  };

  // MANAGER SERVICE CORRECTION APPROVAL
  const handleApproveCorrection = (corrId: string) => {
    const targetIdx = corrections.findIndex(c => c.id === corrId);
    if (targetIdx === -1) return;

    const updatedCorrections = [...corrections];
    const item = { ...updatedCorrections[targetIdx] };
    item.status = 'Approved';
    updatedCorrections[targetIdx] = item;
    setCorrections(updatedCorrections);

    // Create corresponding Approved Log in timesheets
    const generatedLog: TimeLog = {
      log_id: 'log_gen_' + Date.now(),
      user_id: item.user_id,
      date: item.date,
      work_mode: item.requested_work_mode,
      clock_in_time: item.requested_in_time,
      clock_out_time: item.requested_out_time,
      clock_in_lat: 6.6713, // Default Kumasi Administrative center for manual adjustment
      clock_in_long: -1.6163,
      clock_out_lat: 6.6713,
      clock_out_long: -1.6163,
      geofence_verified: true,
      daily_summary_notes: `Manual adjustment approved. Reason: ${item.justification}`,
      status: 'Approved'
    };

    setLogs(prev => [generatedLog, ...prev]);
  };

  // MANAGER SERVICE CORRECTION REJECTION
  const handleRejectCorrection = (corrId: string) => {
    setCorrections(prev => prev.map(c => c.id === corrId ? { ...c, status: 'Rejected' } : c));
  };

  // ADMIN CONFIGURATION ADD HUB
  const handleAddHub = (newHub: GeofenceHub) => {
    setHubs([...hubs, newHub]);
  };

  // ADMIN CONFIGURATION DELETE HUB
  const handleRemoveHub = (locationId: string) => {
    setHubs(prev => prev.filter(h => h.location_id !== locationId));
  };

  // --- GIS VISUAL OVERLAY (MAP CORRELATOR) ---
  // Calculates boundaries scaling inside standard 100% vector SVG widget
  const renderSVGMap = () => {
    // We can map coordinates relative to a bounding space in Kumasi
    // e.g. center = 6.6713, -1.6163
    const originLat = 6.6713;
    const originLng = -1.6163;
    
    // Scale parameters: degree to pixel displacement
    const latScale = 2500; // pixels per degree lat
    const lngScale = 2500; // pixels per degree lng

    const mapWidth = 400;
    const mapHeight = 220;

    const getCoords = (lat: number, lng: number) => {
      // Calculate off center
      const dLat = lat - originLat;
      const dLng = lng - originLng;

      // X coordinate depends on longitude (east/west)
      const x = mapWidth / 2 + dLng * lngScale;
      // Y coordinate depends on latitude (north/south, inverted in SVG screen-space)
      const y = mapHeight / 2 - dLat * latScale;

      return { x, y };
    };

    const userPixel = getCoords(currentLat, currentLng);

    return (
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-100 flex flex-col justify-between">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Live GIS Boundary Overlay Map</span>
          <div className="relative w-full overflow-hidden bg-[#0d1527] border border-slate-850 rounded-lg" style={{ height: `${mapHeight}px` }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${mapWidth} ${mapHeight}`} className="absolute top-0 left-0">
              {/* Coordinates Grid lines */}
              <line x1="0" y1={mapHeight/2} x2={mapWidth} y2={mapHeight/2} stroke="#1b253b" strokeDasharray="3" />
              <line x1={mapWidth/2} y1="0" x2={mapWidth/2} y2={mapHeight} stroke="#1b253b" strokeDasharray="3" />

              {/* Render configured hubs */}
              {hubs.map((hub, idx) => {
                const hubPixel = getCoords(hub.latitude, hub.longitude);
                // Convert radius inside coordinate pixel width approximately
                // radius in meters scale: 1 meter is roughly 0.04 - 0.08 coordinate pixels in this map zoom
                const pixelRadius = Math.max(12, hub.radius_meters * 0.12);

                return (
                  <g key={hub.location_id}>
                    {/* Geofence area circle */}
                    <circle
                      cx={hubPixel.x}
                      cy={hubPixel.y}
                      r={pixelRadius}
                      fill="rgba(20, 184, 166, 0.06)"
                      stroke="rgba(20, 184, 166, 0.45)"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={hubPixel.x}
                      cy={hubPixel.y}
                      r={3}
                      fill="#14b8a6"
                    />
                    {/* Text tags */}
                    <text
                      x={hubPixel.x}
                      y={hubPixel.y - pixelRadius - 4}
                      fill="#94a3b8"
                      fontSize="8"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {hub.location_name.replace('Administrative', 'Admin').replace('Liaison', '')}
                    </text>
                  </g>
                );
              })}

              {/* Pulsing simulated device GPS position */}
              <circle
                cx={userPixel.x}
                cy={userPixel.y}
                r={16}
                fill="rgba(239, 68, 68, 0.12)"
                className="animate-pulse"
              />
              <circle
                cx={userPixel.x}
                cy={userPixel.y}
                r={5}
                fill="#ef4444"
                stroke="#fff"
                strokeWidth="1"
              />

              <path
                d={`M ${userPixel.x} ${userPixel.y} h 22`}
                stroke="#ef4444"
                strokeWidth="0.8"
                strokeDasharray="2"
              />
              <text
                x={userPixel.x + 25}
                y={userPixel.y + 3}
                fill="#ef4444"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                YOU
              </text>
            </svg>
          </div>
        </div>

        <div className="mt-3 text-[10px] text-slate-400 space-y-1">
          <p className="flex justify-between">
            <span>Simulated Coord:</span>
            <strong className="text-white font-mono">{currentLat.toFixed(5)}, {currentLng.toFixed(5)}</strong>
          </p>
          <p className="flex justify-between">
            <span>Selected Scenario:</span>
            <strong className="text-teal-400 truncate max-w-[180px]">{locationScenarioName}</strong>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-850 antialiased p-4 md:p-6 lg:p-8">
      
      {/* APP HEADER */}
      <header className="max-w-7xl mx-auto mb-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-lg">
            <Clock className="h-5.5 w-5.5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
               Company Log Sheet App
            </h1>
            <p className="text-xs text-slate-500">Location-bound tracking and log management for remote & hybrid workforces</p>
          </div>
        </div>

        {/* Dynamic Sync state banners inside the main header */}
        <div className="flex flex-wrap items-center gap-3">
          {isOffline && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="font-semibold">Local Storage Offline Caching ON</span>
            </div>
          )}

          {/* Quick UI perspective selector (role-switching override tab) */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex gap-1">
            {['Employee', 'Manager', 'Admin'].map(mode => (
              <button
                key={mode}
                id={`nav-view-mode-${mode.toLowerCase()}`}
                onClick={() => setCurrentViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  currentViewMode === mode
                    ? 'bg-teal-600 text-white shadow'
                    : 'text-slate-650 hover:bg-slate-200/50 text-slate-600'
                }`}
              >
                {mode === 'Employee' && 'Employee View'}
                {mode === 'Manager' && 'Manager View'}
                {mode === 'Admin' && 'HR / Admin'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* SYNC NOTICES AND ALERTS */}
      {syncNotice && (
        <div id="sync-completed-toast" className="max-w-7xl mx-auto mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-xs flex items-center gap-2 shadow-sm">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <main className="max-w-7xl mx-auto space-y-6">
        
        {/* ROW 1: SANDBOX CONTROLLER & GIS VISUAL RADAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <GPSSimulator
              currentLat={currentLat}
              currentLng={currentLng}
              onGPSChange={handleGPSChange}
              isOffline={isOffline}
              onOfflineToggle={handleOfflineToggle}
              activeUser={activeUser}
              onUserChange={handleUserChange}
              hubs={hubs}
              offlineQueueLength={offlineQueue.length}
              onSyncQueue={handleSyncQueue}
            />
          </div>
          <div className="lg:col-span-4">
            {renderSVGMap()}
          </div>
        </div>

        {/* ROW 2: ACTIVE PERSPECTIVE PANEL DOCK */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-6">
          
          {currentViewMode === 'Employee' && (
            <EmployeeDashboard
              activeUser={activeUser}
              hubs={hubs}
              logs={logs}
              corrections={corrections}
              currentLat={currentLat}
              currentLng={currentLng}
              isOffline={isOffline}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              onSubmitCorrection={handleCorrectionSubmit}
            />
          )}

          {currentViewMode === 'Manager' && (
            <ManagerDashboard
              activeUser={activeUser}
              hubs={hubs}
              logs={logs}
              corrections={corrections}
              onApproveLog={handleApproveLog}
              onRejectLog={handleRejectLog}
              onApproveCorrection={handleApproveCorrection}
              onRejectCorrection={handleRejectCorrection}
            />
          )}

          {currentViewMode === 'Admin' && (
            <AdminPanel
              hubs={hubs}
              logs={logs}
              onAddHub={handleAddHub}
              onRemoveHub={handleRemoveHub}
            />
          )}

        </div>
      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto mt-12 mb-6 text-center text-xs text-slate-400">
        <p>&copy; 2026 Company Log Sheet App. Engineered for Distributed and Hybrid Agriculture Workforces.</p>
        <p className="mt-1">Kumasi Studio &bull; Ejisu Node &bull; Airport Residential, Accra</p>
      </footer>
    </div>
  );
}
