import React, { useState } from 'react';
import { GeofenceHub, TimeLog, User } from '../types';
import { INITIAL_USERS } from '../data';
import { Database, Plus, Trash2, Map, Download, CheckCircle, FileSpreadsheet, MapPin } from 'lucide-react';

interface AdminPanelProps {
  hubs: GeofenceHub[];
  logs: TimeLog[];
  onAddHub: (hub: GeofenceHub) => void;
  onRemoveHub: (locationId: string) => void;
}

export default function AdminPanel({
  hubs,
  logs,
  onAddHub,
  onRemoveHub
}: AdminPanelProps) {
  // New Hub State
  const [newHubName, setNewHubName] = useState('');
  const [newHubLat, setNewHubLat] = useState('6.6713');
  const [newHubLng, setNewHubLng] = useState('-1.6163');
  const [newHubRadius, setNewHubRadius] = useState('100');
  const [hubActionSuccess, setHubActionSuccess] = useState(false);

  // Filters State for Export
  const [filterDept, setFilterDept] = useState('All');
  const [filterUser, setFilterUser] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Add hub action
  const handleAddHub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHubName.trim()) return;

    const lat = parseFloat(newHubLat);
    const lng = parseFloat(newHubLng);
    const radius = parseFloat(newHubRadius);

    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) return;

    onAddHub({
      location_id: 'hub_' + Date.now(),
      location_name: newHubName,
      latitude: lat,
      longitude: lng,
      radius_meters: radius
    });

    setNewHubName('');
    setHubActionSuccess(true);
    setTimeout(() => setHubActionSuccess(false), 3000);
  };

  // Filter logs for CSV aggregation
  const filteredLogs = logs.filter(l => {
    const u = INITIAL_USERS.find(user => user.user_id === l.user_id);
    if (!u) return false;

    // Dept Filter
    if (filterDept !== 'All' && u.department !== filterDept) return false;

    // User Filter
    if (filterUser !== 'All' && l.user_id !== filterUser) return false;

    // Status Filter
    if (filterStatus !== 'All' && l.status !== filterStatus) return false;

    // Date Range Filters
    if (filterStartDate && l.date < filterStartDate) return false;
    if (filterEndDate && l.date > filterEndDate) return false;

    return true;
  });

  // Calculate high level metrics
  const totalHours = filteredLogs.reduce((acc, l) => {
    if (!l.clock_out_time) return acc;
    const durMs = new Date(l.clock_out_time).getTime() - new Date(l.clock_in_time).getTime();
    return acc + (durMs / (1000 * 60 * 60));
  }, 0);

  const totalShifts = filteredLogs.length;
  
  const onSiteLogs = filteredLogs.filter(l => l.work_mode === 'On-Site');
  const totalOnSite = onSiteLogs.length;
  const verifiedOnSite = onSiteLogs.filter(l => l.geofence_verified).length;
  const flagRate = totalOnSite > 0 ? ((totalOnSite - verifiedOnSite) / totalOnSite) * 100 : 0;

  // Real CSV trigger function
  const handleCSVDownload = () => {
    if (filteredLogs.length === 0) return;

    // Compile rows
    const headers = [
      'Log ID',
      'Employee Name',
      'Employee Email',
      'Department',
      'Reporting Date',
      'Work Mode',
      'Clock In Time',
      'Clock Out Time',
      'Logged Hours',
      'Geofence Verified (On-Site)',
      'Achievements Log',
      'Approval Status'
    ];

    const rows = filteredLogs.map(l => {
      const u = INITIAL_USERS.find(user => user.user_id === l.user_id);
      
      const loggedHours = l.clock_out_time
        ? ((new Date(l.clock_out_time).getTime() - new Date(l.clock_in_time).getTime()) / (1000 * 60 * 60)).toFixed(2)
        : '0.00 (Active)';

      const escapedNotes = l.daily_summary_notes
        ? l.daily_summary_notes.replace(/"/g, '""')
        : '';

      return [
        l.log_id,
        u?.name || 'Unknown',
        u?.email || 'N/A',
        u?.department || 'N/A',
        l.date,
        l.work_mode,
        l.clock_in_time ? new Date(l.clock_in_time).toLocaleString().replace(',', ' ') : '',
        l.clock_out_time ? new Date(l.clock_out_time).toLocaleString().replace(',', ' ') : 'Active',
        loggedHours,
        l.work_mode === 'On-Site' ? (l.geofence_verified ? 'YES' : 'NO_ALARM') : 'N/A',
        `"${escapedNotes}"`,
        l.status
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    // Create browser action
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `geolog_payroll_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const departments = ['Operations', 'Capital & Partnerships', 'Finance', 'Field Agronomy'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: GEOFENCE HUB MANAGEMENT */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Geofence Hubs ({hubs.length})</h3>
              <p className="text-xs text-slate-500">Configure central locations and radius boundaries</p>
            </div>
            <Map className="h-4.5 w-4.5 text-teal-600" />
          </div>

          {hubActionSuccess && (
            <div id="hub-action-notice" className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium rounded flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Geofenced Hub updated successfully!</span>
            </div>
          )}

          {/* Current Hub list */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {hubs.map(h => (
              <div key={h.location_id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 block flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-teal-500 fill-teal-100" />
                    {h.location_name}
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-400 font-mono">
                    <span>Lat: {h.latitude.toFixed(4)}</span>
                    <span>Lng: {h.longitude.toFixed(4)}</span>
                    <span className="text-teal-600 font-semibold font-sans">Radius: {h.radius_meters}m</span>
                  </div>
                </div>
                <button
                  id={`remove-hub-btn-${h.location_id}`}
                  onClick={() => onRemoveHub(h.location_id)}
                  title="Delete Hub"
                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Inline Add Hub form */}
          <form onSubmit={handleAddHub} className="bg-slate-50/50 p-4 border border-slate-200 rounded-xl space-y-3 pt-3">
            <span className="text-xs font-bold text-slate-800 block">Register New Hub Boundary</span>
            
            <div className="space-y-2">
              <div>
                <label htmlFor="new-hub-name-input" className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5">Hub / Studio Name</label>
                <input
                  id="new-hub-name-input"
                  type="text"
                  required
                  placeholder="e.g. Accra Logistics Terminal"
                  value={newHubName}
                  onChange={(e) => setNewHubName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="new-hub-lat-input" className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5">Latitude</label>
                  <input
                    id="new-hub-lat-input"
                    type="text"
                    required
                    value={newHubLat}
                    onChange={(e) => setNewHubLat(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-xs font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="new-hub-long-input" className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5">Longitude</label>
                  <input
                    id="new-hub-long-input"
                    type="text"
                    required
                    value={newHubLng}
                    onChange={(e) => setNewHubLng(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-xs font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="new-hub-radius-input" className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5">Radius (m)</label>
                  <input
                    id="new-hub-radius-input"
                    type="number"
                    required
                    value={newHubRadius}
                    onChange={(e) => setNewHubRadius(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-800"
                  />
                </div>
              </div>

              <button
                id="submit-new-hub-btn"
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Register Hub Area
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: REVENUE & EXPORT HUB */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Payroll & Reporting Engine</h3>
              <p className="text-xs text-slate-500">Filter datasets and generate authorized CSV payouts exports</p>
            </div>
            <Database className="h-4.5 w-4.5 text-slate-400" />
          </div>

          {/* Aggregate payroll summaries */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-center">
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 block mb-0.5">Logged Hours</span>
              <span className="font-mono text-lg font-black text-slate-800">{totalHours.toFixed(1)} hrs</span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 block mb-0.5">Total Days</span>
              <span className="font-mono text-lg font-black text-slate-800">{totalShifts} days</span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 block mb-0.5">Geofence Out%</span>
              <span className="font-mono text-lg font-black text-rose-600">{flagRate.toFixed(0)}%</span>
            </div>
          </div>

          {/* Filtering interfaces */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Filter Export Dataset</span>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Department Filter</span>
                <select
                  id="filter-dept-dropdown"
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800"
                >
                  <option value="All">All Departments</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Personnel</span>
                <select
                  id="filter-user-dropdown"
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800"
                >
                  <option value="All">All Personnel</option>
                  {INITIAL_USERS.map(u => (
                    <option key={u.user_id} value={u.user_id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Approval Status</span>
                <select
                  id="filter-status-dropdown"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800"
                >
                  <option value="All">All Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Date Span From</span>
                <input
                  id="filter-start-date"
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Date Span To</span>
                <input
                  id="filter-end-date"
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500">
              Matches <strong className="text-slate-800">{filteredLogs.length} matching rows</strong> for export.
            </span>
            <button
              id="export-csv-payroll-btn"
              onClick={handleCSVDownload}
              disabled={filteredLogs.length === 0}
              className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                filteredLogs.length === 0
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-md'
              }`}
            >
              <Download className="h-4 w-4" /> Export Payroll CSV Dataset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
