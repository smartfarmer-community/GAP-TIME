import React, { useState } from 'react';
import { User, GeofenceHub } from '../types';
import { GPS_SCENARIOS, INITIAL_USERS, getDistanceInMeters } from '../data';
import { Navigation, Wifi, WifiOff, MapPin, Users } from 'lucide-react';

interface GPSSimulatorProps {
  currentLat: number;
  currentLng: number;
  onGPSChange: (lat: number, lng: number, scenarioName: string) => void;
  isOffline: boolean;
  onOfflineToggle: (state: boolean) => void;
  activeUser: User;
  onUserChange: (user: User) => void;
  hubs: GeofenceHub[];
  offlineQueueLength: number;
  onSyncQueue: () => void;
}

export default function GPSSimulator({
  currentLat,
  currentLng,
  onGPSChange,
  isOffline,
  onOfflineToggle,
  activeUser,
  onUserChange,
  hubs,
  offlineQueueLength,
  onSyncQueue
}: GPSSimulatorProps) {
  const [customLat, setCustomLat] = useState(currentLat.toString());
  const [customLng, setCustomLng] = useState(currentLng.toString());
  const [selectedScenario, setSelectedScenario] = useState('Inside Kumasi Admin Studio (Center)');

  // Find nearest hub and calculate distance
  let nearestHub: GeofenceHub | null = null;
  let minDistance = Infinity;

  hubs.forEach(h => {
    const dist = getDistanceInMeters(currentLat, currentLng, h.latitude, h.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearestHub = h;
    }
  });

  const handleScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scenarioName = e.target.value;
    setSelectedScenario(scenarioName);
    const scenario = GPS_SCENARIOS.find(s => s.name === scenarioName);
    if (scenario) {
      onGPSChange(scenario.latitude, scenario.longitude, scenario.name);
      setCustomLat(scenario.latitude.toString());
      setCustomLng(scenario.longitude.toString());
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      onGPSChange(lat, lng, 'Custom Coordinates');
      setSelectedScenario('Custom Coordinates');
    }
  };

  return (
    <div id="gps-simulator-panel" className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-mono text-xs tracking-wider text-slate-400 font-semibold uppercase">Interactive Testing Sandbox</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Offline switch */}
          <button
            id="toggle-offline-btn"
            onClick={() => onOfflineToggle(!isOffline)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isOffline
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
            }`}
          >
            {isOffline ? (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                <span>Simulating Offline Mode</span>
              </>
            ) : (
              <>
                <Wifi className="h-3.5 w-3.5" />
                <span>Online / Database Synced</span>
              </>
            )}
          </button>

          {isOffline && offlineQueueLength > 0 && (
            <button
              id="sync-logs-btn"
              onClick={onSyncQueue}
              className="bg-sky-600 hover:bg-sky-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            >
              Sync Cached Logs ({offlineQueueLength})
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Scope / Role Changer */}
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <Users className="h-3 w-3 text-teal-400" /> Active Profile Scope
          </label>
          <select
            id="select-user-role-dropdown"
            value={activeUser.user_id}
            onChange={(e) => {
              const u = INITIAL_USERS.find(user => user.user_id === e.target.value);
              if (u) onUserChange(u);
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
          >
            {INITIAL_USERS.map(u => (
              <option key={u.user_id} value={u.user_id}>
                {u.name} ({u.role} - {u.department})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Switching profiles simulates logging in from different terminals or mobile devices.
          </p>
        </div>

        {/* Location Simulator Choice */}
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <Navigation className="h-3 w-3 text-sky-400" /> Simulated GPS Position
          </label>
          <select
            id="select-location-scenario"
            value={selectedScenario}
            onChange={handleScenarioChange}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
          >
            {GPS_SCENARIOS.map(s => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
            <option value="Custom Coordinates">Custom Coordinates</option>
          </select>

          <form onSubmit={handleCustomSubmit} className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <span className="text-[10px] text-slate-400 block">Latitude</span>
              <input
                id="input-gps-lat"
                type="text"
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-xs font-mono text-white"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Longitude</span>
              <input
                id="input-gps-long"
                type="text"
                value={customLng}
                onChange={(e) => setCustomLng(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-xs font-mono text-white"
              />
            </div>
            <button
              id="submit-coords-btn"
              type="submit"
              className="col-span-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-1.5 rounded text-xs transition-colors cursor-pointer"
            >
              Update Coordinates
            </button>
          </form>
        </div>

        {/* Current Bounds Display */}
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60 flex flex-col justify-between">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-rose-400" /> Boundary Diagnostics
            </label>
            {nearestHub ? (
              <div className="space-y-1">
                <p className="text-xs text-teal-300 font-medium truncate">
                  Nearest Hub: {nearestHub.location_name}
                </p>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Measured Distance:</span>
                  <span className="font-mono text-white">{(minDistance).toFixed(1)}m</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Allowed Hub Radius:</span>
                  <span className="font-mono text-white">{nearestHub.radius_meters}m</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No hubs registered.</p>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80">
            {nearestHub && minDistance <= nearestHub.radius_meters ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-center text-xs font-medium">
                Within Geofence limit of {nearestHub.location_name}
              </div>
            ) : (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-1 rounded text-center text-xs font-medium">
                Geofence Out Of Limits for On-Site Logs
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
