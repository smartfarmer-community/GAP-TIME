import React from 'react';
import { User, GeofenceHub, TimeLog, TimeCorrectionRequest } from '../types';
import { INITIAL_USERS, getDistanceInMeters } from '../data';
import { Check, X, ShieldAlert, BadgeInfo, Play, Clock, MapPin, Search } from 'lucide-react';

interface ManagerDashboardProps {
  activeUser: User;
  hubs: GeofenceHub[];
  logs: TimeLog[];
  corrections: TimeCorrectionRequest[];
  onApproveLog: (logId: string) => void;
  onRejectLog: (logId: string) => void;
  onApproveCorrection: (corrId: string) => void;
  onRejectCorrection: (corrId: string) => void;
}

export default function ManagerDashboard({
  activeUser,
  hubs,
  logs,
  corrections,
  onApproveLog,
  onRejectLog,
  onApproveCorrection,
  onRejectCorrection
}: ManagerDashboardProps) {

  // Live active workforce count
  const activeWorking = logs.filter(l => l.clock_out_time === null);
  const totalEmployees = INITIAL_USERS.filter(u => u.role === 'Employee').length;

  const onSiteCount = activeWorking.filter(l => l.work_mode === 'On-Site').length;
  const fieldCount = activeWorking.filter(l => l.work_mode === 'Field').length;
  const remoteCount = activeWorking.filter(l => l.work_mode === 'Remote').length;

  // Pending logs to review
  const pendingLogs = logs.filter(l => l.status === 'Pending' && l.clock_out_time !== null);
  
  // Pending corrections to review
  const pendingCorrections = corrections.filter(c => c.status === 'Pending');

  // Discrepancy list: On-Site clock-ins where geofence_verified is false
  const discrepancies = logs.filter(l => l.work_mode === 'On-Site' && !l.geofence_verified);

  return (
    <div className="space-y-6">
      {/* Overview Bento Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex flex-col justify-end">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Live Roster Count</span>
          <span className="font-mono text-2xl font-black text-slate-800">{activeWorking.length} / {totalEmployees}</span>
          <span className="text-[10px] text-slate-500 mt-1">Employees active today</span>
        </div>
        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col justify-end">
          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">On-Site Active</span>
          <span className="font-mono text-2xl font-black text-indigo-800">{onSiteCount}</span>
          <span className="text-[10px] text-indigo-500 mt-1">Central office hubs</span>
        </div>
        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-end">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Field Operators</span>
          <span className="font-mono text-2xl font-black text-emerald-800">{fieldCount}</span>
          <span className="text-[10px] text-emerald-500 mt-1">Logging off-site geo-tags</span>
        </div>
        <div className="bg-violet-50/50 p-4 rounded-xl border border-violet-100 flex flex-col justify-end">
          <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider block">Remote Staff</span>
          <span className="font-mono text-2xl font-black text-violet-800">{remoteCount}</span>
          <span className="text-[10px] text-violet-500 mt-1">IP & Self-Declared WFH</span>
        </div>
      </div>

      {/* DISCREPANCY & ALERTS CAROUSEL */}
      {discrepancies.length > 0 && (
        <div id="discrepancy-alerts-section" className="bg-rose-50 border border-rose-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-600 animate-bounce" />
            <span className="font-bold text-sm text-rose-800">High Discrepancy Geofence Alerts ({discrepancies.length})</span>
          </div>
          <p className="text-xs text-rose-700 leading-relaxed max-w-2xl">
            The following personnel marked their shift as "On-Site" but triggered clock-in events outside our configured radius limits. Review coordinates immediately before running payroll.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {discrepancies.map(disc => {
              const u = INITIAL_USERS.find(user => user.user_id === disc.user_id);
              
              // Calculate how many meters off the nearest hub boundary they are
              let closestHub: GeofenceHub | null = null;
              let closestDist = Infinity;
              hubs.forEach(h => {
                const d = getDistanceInMeters(disc.clock_in_lat || 0, disc.clock_in_long || 0, h.latitude, h.longitude);
                if (d < closestDist) {
                  closestDist = d;
                  closestHub = h;
                }
              });

              return (
                <div key={disc.log_id} className="bg-white border border-rose-200/60 rounded-lg p-3 text-xs flex justify-between items-start gap-4 shadow-sm">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800 block">{u?.name || 'Unknown Employee'} ({u?.department})</span>
                    <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded uppercase">
                      Failed Geofence ({disc.date})
                    </span>
                    <p className="text-[10px] text-slate-500 leading-normal mt-1 leading-relaxed">
                      Logged from lat {disc.clock_in_lat?.toFixed(4)}, lng {disc.clock_in_long?.toFixed(4)}. Outside <strong>{closestHub?.location_name}</strong> boundary by <strong>{(closestDist).toFixed(0)} meters</strong>!
                    </p>
                  </div>
                  {disc.status === 'Pending' && (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        id={`approve-disc-btn-${disc.log_id}`}
                        onClick={() => onApproveLog(disc.log_id)}
                        className="bg-emerald-600 text-white p-1 rounded hover:bg-emerald-500 transition-colors cursor-pointer"
                        title="Approve Anyway"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        id={`reject-disc-btn-${disc.log_id}`}
                        onClick={() => onRejectLog(disc.log_id)}
                        className="bg-rose-600 text-white p-1 rounded hover:bg-rose-500 transition-colors cursor-pointer"
                        title="Reject Attendance"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CORE QUEUES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT / COLUMN: PENDING APPROVAL QUEUE */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-semibold text-slate-800">Pending Review Queue</h3>
            <p className="text-xs text-slate-500">Approve or reject submitted logs and manual adjustments</p>
          </div>

          {/* Sub queue 1: Timesheets */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="h-4 w-4" /> Shift Timesheets Pending ({pendingLogs.length})
            </h4>

            {pendingLogs.length === 0 ? (
              <p className="text-xs italic text-slate-400 py-4 bg-slate-50 rounded border border-dashed border-slate-200 text-center">
                All daily log submissions up to date! Good job.
              </p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {pendingLogs.map(p => {
                  const u = INITIAL_USERS.find(user => user.user_id === p.user_id);
                  const inTime = new Date(p.clock_in_time);
                  const outTime = p.clock_out_time ? new Date(p.clock_out_time) : null;
                  
                  return (
                    <div id={`pending-log-card-${p.log_id}`} key={p.log_id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-slate-800 block text-sm">{u?.name}</span>
                          <span className="text-[10px] text-slate-400">{u?.department} &bull; {p.date}</span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            id={`approve-log-btn-${p.log_id}`}
                            onClick={() => onApproveLog(p.log_id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-2 py-1.5 rounded cursor-pointer transition-colors flex items-center gap-1"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            id={`reject-log-btn-${p.log_id}`}
                            onClick={() => onRejectLog(p.log_id)}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-medium px-2 py-1.5 rounded cursor-pointer transition-colors flex items-center gap-1"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded border border-slate-200/60 text-[10px]">
                        <div>
                          <span className="text-slate-400 font-bold block uppercase">Declared Mode</span>
                          <span className="font-semibold text-indigo-700">{p.work_mode}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block uppercase">In Time</span>
                          <span>{inTime.toLocaleTimeString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block uppercase">Out Time</span>
                          <span>{outTime ? outTime.toLocaleTimeString() : 'Active'}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed border-l-2 border-teal-500 pl-2 bg-white py-1.5 pr-2 rounded">
                        <strong>Log Note:</strong> "{p.daily_summary_notes}"
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sub queue 2: Time corrections (adjustment requests) */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <BadgeInfo className="h-4 w-4" /> Manual Adjustment/Correction Requests ({pendingCorrections.length})
            </h4>

            {pendingCorrections.length === 0 ? (
              <p className="text-xs italic text-slate-400 py-4 bg-slate-50 rounded border border-dashed border-slate-200 text-center">
                No correction requests waiting.
              </p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {pendingCorrections.map(c => {
                  const u = INITIAL_USERS.find(user => user.user_id === c.user_id);
                  const inDisplay = new Date(c.requested_in_time).toLocaleTimeString();
                  const outDisplay = new Date(c.requested_out_time).toLocaleTimeString();

                  return (
                    <div id={`pending-corr-card-${c.id}`} key={c.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-slate-800 block text-sm">{u?.name}</span>
                          <span className="text-[10px] text-slate-400">{u?.department} &bull; Requested on {c.date}</span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            id={`approve-corr-btn-${c.id}`}
                            onClick={() => onApproveCorrection(c.id)}
                            className="bg-emerald-650 hover:bg-emerald-600 text-white font-medium px-2 py-1 rounded cursor-pointer text-[11px] transition-all flex items-center gap-1 bg-emerald-600"
                          >
                            <Check className="h-3 w-3" /> Approve
                          </button>
                          <button
                            id={`reject-corr-btn-${c.id}`}
                            onClick={() => onRejectCorrection(c.id)}
                            className="bg-rose-650 hover:bg-rose-600 text-white font-medium px-2 py-1 rounded cursor-pointer text-[11px] transition-all flex items-center gap-1 bg-rose-600"
                          >
                            <X className="h-3 w-3" /> Reject
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-white p-2 text-[10px] rounded border border-slate-200">
                        <div>
                          <span className="text-slate-400 block font-bold uppercase">Requested Mode</span>
                          <span className="font-semibold text-teal-700">{c.requested_work_mode}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold uppercase">Requested In</span>
                          <span>{inDisplay}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold uppercase">Requested Out</span>
                          <span>{outDisplay}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 italic bg-amber-50/50 border-l-2 border-amber-400 p-2 rounded">
                        <strong>Employee Comment:</strong> "{c.justification}"
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE TEAM ROSTER MAP / BOARD */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Live Team Roster</h3>
              <p className="text-xs text-slate-500">Employees currently clocked-in right now</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>

          {activeWorking.length === 0 ? (
            <div className="text-center py-10">
              <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 italic">No team members clocked-in at this hour.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeWorking.map(act => {
                const u = INITIAL_USERS.find(user => user.user_id === act.user_id);
                
                return (
                  <div key={act.log_id} className="p-3.5 bg-slate-50/55 hover:bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800 block">{u?.name}</span>
                        <span className="text-[10px] text-slate-400">{u?.department}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        act.work_mode === 'On-Site' ? 'bg-indigo-100 text-indigo-800' :
                        act.work_mode === 'Field' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-violet-100 text-violet-850'
                      }`}>
                        {act.work_mode}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-150 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium overflow-hidden truncate mr-2 flex items-center gap-1 shrink-0">
                        <MapPin className="h-3 w-3 text-sky-500" />
                        <span>Instant Coord:</span>
                        <strong className="text-slate-700 font-mono">{act.clock_in_lat?.toFixed(4)}, {act.clock_in_long?.toFixed(4)}</strong>
                      </span>
                      {act.work_mode === 'On-Site' && (
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${act.geofence_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700 font-extrabold animate-pulse'}`}>
                          {act.geofence_verified ? 'Fenced' : 'Mismatched'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
