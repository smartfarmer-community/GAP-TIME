import React, { useState, useEffect } from 'react';
import { User, GeofenceHub, TimeLog, TimeCorrectionRequest, WorkMode } from '../types';
import { getDistanceInMeters } from '../data';
import { Play, Square, Calendar, MapPin, CheckCircle, AlertTriangle, Clock, History, FileText, Send, Wifi } from 'lucide-react';

interface EmployeeDashboardProps {
  activeUser: User;
  hubs: GeofenceHub[];
  logs: TimeLog[];
  corrections: TimeCorrectionRequest[];
  currentLat: number;
  currentLng: number;
  isOffline: boolean;
  onClockIn: (workMode: WorkMode, lat: number, lng: number, verified: boolean) => void;
  onClockOut: (lat: number, lng: number, notes: string) => void;
  onSubmitCorrection: (correction: Omit<TimeCorrectionRequest, 'id' | 'user_id' | 'status' | 'created_at'>) => void;
}

export default function EmployeeDashboard({
  activeUser,
  hubs,
  logs,
  corrections,
  currentLat,
  currentLng,
  isOffline,
  onClockIn,
  onClockOut,
  onSubmitCorrection
}: EmployeeDashboardProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'clock' | 'history' | 'correction'>('clock');

  // Input states
  const [workMode, setWorkMode] = useState<WorkMode>(activeUser.default_work_mode);
  const [notes, setNotes] = useState('');

  // Correction Request states
  const [corrDate, setCorrDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [corrMode, setCorrMode] = useState<WorkMode>('On-Site');
  const [corrIn, setCorrIn] = useState('08:00');
  const [corrOut, setCorrOut] = useState('17:00');
  const [corrReason, setCorrReason] = useState('');
  const [corrSuccess, setCorrSuccess] = useState(false);

  // Live timer for active log
  const activeLog = logs.find(l => l.user_id === activeUser.user_id && l.clock_out_time === null);
  const [elapsed, setElapsed] = useState('');

  // Update timer ticks
  useEffect(() => {
    if (!activeLog) {
      setElapsed('');
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(activeLog.clock_in_time).getTime();
      const now = new Date().getTime();
      const diffMs = Math.max(0, now - start);
      
      const secs = Math.floor((diffMs / 1000) % 60);
      const mins = Math.floor((diffMs / 1000 / 60) % 60);
      const hrs = Math.floor(diffMs / 1000 / 60 / 60);

      const display = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      setElapsed(display);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeLog]);

  // Geofence precheck
  let nearestHub: GeofenceHub | null = null;
  let minDistance = Infinity;

  hubs.forEach(h => {
    const dist = getDistanceInMeters(currentLat, currentLng, h.latitude, h.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearestHub = h;
    }
  });

  const isGeofenceValid = nearestHub ? minDistance <= nearestHub.radius_meters : false;
  const isClockInBlocked = workMode === 'On-Site' && !isGeofenceValid;

  const handleClockInAction = () => {
    if (isClockInBlocked) return;
    onClockIn(workMode, currentLat, currentLng, workMode === 'On-Site' ? isGeofenceValid : true);
  };

  const handleClockOutAction = (e: React.FormEvent) => {
    e.preventDefault();
    onClockOut(currentLat, currentLng, notes);
    setNotes('');
  };

  const handleCorrectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!corrReason.trim()) return;

    // Build the mock ISO strings for target date
    const inTimeISO = new Date(`${corrDate}T${corrIn}:00Z`).toISOString();
    const outTimeISO = new Date(`${corrDate}T${corrOut}:00Z`).toISOString();

    onSubmitCorrection({
      date: corrDate,
      requested_work_mode: corrMode,
      requested_in_time: inTimeISO,
      requested_out_time: outTimeISO,
      justification: corrReason
    });

    setCorrReason('');
    setCorrSuccess(true);
    setTimeout(() => setCorrSuccess(false), 4000);
  };

  const myHistory = logs.filter(l => l.user_id === activeUser.user_id);
  const myCorrections = corrections.filter(c => c.user_id === activeUser.user_id);

  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="flex border-b border-slate-200">
        <button
          id="tab-clock-shift"
          onClick={() => setActiveTab('clock')}
          className={`flex items-center gap-2 px-6 py-3 cursor-pointer text-sm font-medium border-b-2 transition-all ${
            activeTab === 'clock'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Clock & Shift Tracker</span>
        </button>
        <button
          id="tab-timesheet-history"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-3 cursor-pointer text-sm font-medium border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="h-4 w-4" />
          <span>My Timesheet History</span>
        </button>
        <button
          id="tab-correction-request"
          onClick={() => setActiveTab('correction')}
          className={`flex items-center gap-2 px-6 py-3 cursor-pointer text-sm font-medium border-b-2 transition-all ${
            activeTab === 'correction'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Manual Adjustment Requests</span>
        </button>
      </div>

      {/* CLOCK SHIFT TAB */}
      {activeTab === 'clock' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 bg-white p-6 rounded-xl border border-slate-150 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Shift Actions</h3>
                <p className="text-xs text-slate-500 mb-1">Select your work status and clock in precisely</p>
              </div>
              <div className="flex items-center gap-1 bg-teal-50 px-2.5 py-1 rounded text-teal-700 text-xs font-semibold">
                <MapPin className="h-3 w-3" />
                <span>Geotagging Enabled</span>
              </div>
            </div>

            {!activeLog ? (
              /* CLOCKED OUT VIEW */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Shift Mode Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { mode: 'On-Site', desc: 'Centralized Hub' },
                      { mode: 'Field', desc: 'Agricultural / Field' },
                      { mode: 'Remote', desc: 'Distributed WFH' }
                    ].map(item => (
                      <button
                        key={item.mode}
                        id={`btn-mode-${item.mode.toLowerCase()}`}
                        type="button"
                        onClick={() => setWorkMode(item.mode as WorkMode)}
                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                          workMode === item.mode
                            ? 'bg-teal-50 border-teal-500 text-teal-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block font-bold text-xs">{item.mode}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Geofence boundaries visual helper */}
                {workMode === 'On-Site' && (
                  <div className="p-3 bg-slate-50 text-slate-700 rounded-lg text-xs border border-slate-200 space-y-2">
                    <p className="font-semibold text-slate-800 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-teal-500" />
                       Kumasi/Hub Coordinates Enforcement
                    </p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      To log an On-Site shift, the device GPS must be within {nearestHub?.radius_meters} meters of {nearestHub?.location_name}.
                    </p>
                    <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200/60">
                      <span>Nearest Hub Range:</span>
                      <span className={`font-mono font-bold ${isGeofenceValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {minDistance.toFixed(1)}m
                      </span>
                    </div>
                  </div>
                )}

                {isClockInBlocked && (
                  <div id="geofence-warning-block" className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold mb-0.5">Geofence out-of-bounds warning</p>
                      <p className="leading-relaxed text-[11px] text-rose-700">
                        You cannot clock in to <strong>On-Site</strong> shift status from your current location ({minDistance.toFixed(1)}m away). Please coordinate with your supervisor, shift to <strong>Field</strong> or <strong>Remote</strong> log tracking, or submit a manual adjustment.
                      </p>
                    </div>
                  </div>
                )}

                <button
                  id="employee-clock-in-btn"
                  onClick={handleClockInAction}
                  disabled={isClockInBlocked}
                  className={`w-full py-3.5 rounded-xl text-sm font-semibold tracking-wide shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    isClockInBlocked
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-teal-600 hover:bg-teal-700 text-white hover:shadow'
                  }`}
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Clock In Shift ({workMode})</span>
                </button>
              </div>
            ) : (
              /* CLOCKED IN ACTIVE VIEW */
              <form onSubmit={handleClockOutAction} className="space-y-4">
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-center relative overflow-hidden">
                  <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>Active</span>
                  </div>
                  {activeLog.is_offline_cached && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                      <Wifi className="h-3 w-3" />
                      <span>Cached</span>
                    </div>
                  )}

                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                    Shift Mode: {activeLog.work_mode}
                  </span>
                  
                  {/* Elapsed Timer clock */}
                  <span className="font-mono text-3xl font-extrabold text-slate-800 tracking-wider block mb-1">
                    {elapsed || '00:00:00'}
                  </span>

                  <p className="text-[11px] text-slate-500">
                    Started today at {new Date(activeLog.clock_in_time).toLocaleTimeString()}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-200 text-left grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-400 block uppercase font-medium">Logged Lat</span>
                      <span className="font-mono text-slate-800 font-semibold">{activeLog.clock_in_lat?.toFixed(5) || 'No GPS'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase font-medium">Logged Lng</span>
                      <span className="font-mono text-slate-800 font-semibold">{activeLog.clock_in_long?.toFixed(5) || 'No GPS'}</span>
                    </div>
                  </div>
                </div>

                {/* Daily achievements summary input */}
                <div>
                  <label htmlFor="daily-summary-textarea" className="block text-xs font-semibold text-slate-700 mb-1">
                    Daily Log Sheet Achievements <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="daily-summary-textarea"
                    required
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter details of tasks completed, agricultural fields audited, metrics compiled, or client cooperations managed..."
                    rows={4}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  ></textarea>
                </div>

                <button
                  id="employee-clock-out-btn"
                  type="submit"
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Square className="h-4 w-4 fill-current" />
                  <span>Clock Out & Submit Daily Log</span>
                </button>
              </form>
            )}
          </div>

          {/* RIGHT SIDE: REALTIME STATUS & STATS CARD */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl text-white shadow-sm">
              <h4 className="text-sm font-bold text-teal-400 uppercase tracking-widest mb-3">Profile Statistics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-700/30">
                  <span className="text-[10px] text-slate-400 block">Total Shifts</span>
                  <span className="font-mono text-xl font-bold">{myHistory.length}</span>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-700/30">
                  <span className="text-[10px] text-slate-400 block">Pending Reviews</span>
                  <span className="font-mono text-xl font-bold">
                    {myHistory.filter(l => l.status === 'Pending').length + myCorrections.filter(c => c.status === 'Pending').length}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-300 space-y-2">
                <div className="flex justify-between">
                  <span>Name:</span>
                  <strong className="text-white">{activeUser.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Role:</span>
                  <strong className="text-white">{activeUser.role}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Duty Domain:</span>
                  <strong className="text-emerald-400">{activeUser.department}</strong>
                </div>
              </div>
            </div>

            {/* QUICK STEPS INSTRUCTIONS */}
            <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-4 text-xs text-amber-900 leading-relaxed space-y-2">
              <h5 className="font-bold flex items-center gap-1.5 text-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Attendance Policy Summary
              </h5>
              <ul className="list-disc pl-4 space-y-1 text-slate-700 text-xs">
                <li>On-Site work requires physical device proximity to Kumasi Administrative Studio, Ejisu Hub, or Accra.</li>
                <li>Offline clocks are preserved inside local storage and synchronized with our central db once connections restore.</li>
                <li>Clock-outs require typing logged summary sheet notes explaining achievements of specific work.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* MY TIMESHEET HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-semibold text-slate-800">My Registered Timesheets</h3>
              <p className="text-xs text-slate-500">Comprehensive list of physical and remote work shift records</p>
            </div>
          </div>

          {myHistory.length === 0 ? (
            <div className="text-center py-10">
              <History className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No shift hours recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase bg-slate-50">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Shift Status</th>
                    <th className="py-2.5 px-3">Clock In</th>
                    <th className="py-2.5 px-3">Clock Out</th>
                    <th className="py-2.5 px-3">Geofenced?</th>
                    <th className="py-2.5 px-3">Achievements Preview</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {myHistory.map(l => {
                    const durationInMin = l.clock_out_time
                      ? Math.round((new Date(l.clock_out_time).getTime() - new Date(l.clock_in_time).getTime()) / 60000)
                      : 0;
                    const hours = Math.floor(durationInMin / 60);
                    const minutes = durationInMin % 60;

                    return (
                      <tr key={l.log_id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-semibold text-slate-700">{l.date}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            l.work_mode === 'On-Site' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/40' :
                            l.work_mode === 'Field' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/40' :
                            'bg-violet-50 text-violet-700 border border-violet-200/40'
                          }`}>
                            {l.work_mode}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="block font-medium text-slate-700">
                            {new Date(l.clock_in_time).toLocaleTimeString()}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {l.clock_in_lat?.toFixed(4)}, {l.clock_in_long?.toFixed(4)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {l.clock_out_time ? (
                            <>
                              <span className="block font-medium text-slate-700">
                                {new Date(l.clock_out_time).toLocaleTimeString()}
                              </span>
                              <span className="block text-[10px] text-slate-400 font-mono">
                                {l.clock_out_lat?.toFixed(4)}, {l.clock_out_long?.toFixed(4)}
                              </span>
                            </>
                          ) : (
                            <span className="text-amber-600 font-semibold animate-pulse">On-Going</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {l.work_mode !== 'On-Site' ? (
                            <span className="text-slate-400">—</span>
                          ) : l.geofence_verified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                              <CheckCircle className="h-3 w-3" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-medium bg-rose-50 px-1.5 py-0.5 rounded">
                              <AlertTriangle className="h-3 w-3" /> Out Of Bounds
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate text-[11px] text-slate-500" title={l.daily_summary_notes}>
                          {l.daily_summary_notes || <span className="italic text-slate-300">Pending clock out...</span>}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            l.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                            l.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ADJUSTMENT REQUESTS TAB */}
      {activeTab === 'correction' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Submit Adjustment Form</h3>
              <p className="text-xs text-slate-500">In case of tablet batteries failing, physical errors, or forgot to clock operations</p>
            </div>

            {corrSuccess && (
              <div id="correction-success-alert" className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>Adjustment requested successfully. Sent to supervisor approval queue.</span>
              </div>
            )}

            <form onSubmit={handleCorrectionSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="corr-date-input" className="block text-xs font-bold text-slate-500 mb-1">Target Date</label>
                  <input
                    id="corr-date-input"
                    type="date"
                    required
                    value={corrDate}
                    onChange={(e) => setCorrDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="corr-mode-select" className="block text-xs font-bold text-slate-500 mb-1">Shift Mode</label>
                  <select
                    id="corr-mode-select"
                    value={corrMode}
                    onChange={(e) => setCorrMode(e.target.value as WorkMode)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800"
                  >
                    <option value="On-Site">On-Site</option>
                    <option value="Field">Field</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="corr-in-input" className="block text-xs font-bold text-slate-500 mb-1">Clock In Time</label>
                  <input
                    id="corr-in-input"
                    type="time"
                    required
                    value={corrIn}
                    onChange={(e) => setCorrIn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="corr-out-input" className="block text-xs font-bold text-slate-500 mb-1">Clock Out Time</label>
                  <input
                    id="corr-out-input"
                    type="time"
                    required
                    value={corrOut}
                    onChange={(e) => setCorrOut(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="corr-reason-textarea" className="block text-xs font-bold text-slate-500 mb-1">Reason & Justification</label>
                <textarea
                  id="corr-reason-textarea"
                  required
                  placeholder="Justify your request (e.g., Tablet battery died at 15:00 during field agronomy checks. Complete off-grid location.)"
                  value={corrReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                ></textarea>
              </div>

              <button
                id="submit-correction-btn"
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 rounded text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit Adjustment Request</span>
              </button>
            </form>
          </div>

          <div className="md:col-span-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Adjustment Histories</h3>
              <p className="text-xs text-slate-500">Submission approvals tracking</p>
            </div>

            {myCorrections.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No manual correction logs generated.</p>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {myCorrections.map(c => (
                  <div key={c.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-100">
                      <div>
                        <span className="font-bold text-slate-800 block">{c.date}</span>
                        <span className="text-[10px] text-slate-400 block uppercase">{c.requested_work_mode} status</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                        c.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 text-[11px] gap-1 text-slate-500">
                      <div>Clock In: <strong className="text-slate-700">{new Date(c.requested_in_time).toISOString().split('T')[1].substring(0, 5)}</strong></div>
                      <div>Clock Out: <strong className="text-slate-700">{new Date(c.requested_out_time).toISOString().split('T')[1].substring(0, 5)}</strong></div>
                    </div>

                    <p className="text-[11px] text-slate-500 italic border-l-2 border-slate-350 pl-2 leading-relaxed">
                      "{c.justification}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
