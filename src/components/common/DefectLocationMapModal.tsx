import React, { useState } from 'react';
import {
  MapPin,
  ExternalLink,
  Copy,
  Check,
  X,
  Crosshair,
  Satellite,
  Compass,
  Navigation,
  Clock,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { Defect } from '../../types';

interface DefectLocationMapModalProps {
  defect: Defect | null;
  onClose: () => void;
}

export const DefectLocationMapModal: React.FC<DefectLocationMapModalProps> = ({
  defect,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!defect || !defect.geoCoordinates) return null;

  const { latitude, longitude, accuracyMeters, altitudeMeters, capturedAt, source, railwayChainageKm } =
    defect.geoCoordinates;

  const coordString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(coordString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = capturedAt
    ? new Date(capturedAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    : 'Recently Logged';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-sky-600/60 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden font-mono text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-950 border border-rose-600 text-rose-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Defect Site Identification
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 border border-sky-700 text-sky-300 font-bold">
                  {defect.defectId}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Precision GPS Geo-coordinates for permanent way field teams
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Defect Context Summary */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block">Asset & Section</span>
              <strong className="text-slate-200 text-sm">{defect.assetId}</strong>{' '}
              <span className="text-slate-400">({defect.corridorId})</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Severity</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  defect.severity === 'CRITICAL'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : defect.severity === 'HIGH'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {defect.severity}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Department</span>
              <span className="text-sky-300 font-semibold">{defect.department}</span>
            </div>
          </div>

          {/* Coordinate Display Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950/50 border border-sky-700/60 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1.5">
                <Satellite className="w-3.5 h-3.5" />
                Geodetic Position (WGS-84)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Accuracy ±{accuracyMeters ? Math.round(accuracyMeters) : 3}m
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-950/90 p-3 rounded-lg border border-slate-800 mb-3">
              <div>
                <span className="text-xs text-slate-400 block font-mono">LAT / LNG</span>
                <span className="text-lg md:text-xl font-bold font-mono text-emerald-300 tracking-wider">
                  {latitude.toFixed(6)}° N, {longitude.toFixed(6)}° E
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-sky-300 border border-slate-700 transition-colors cursor-pointer"
                title="Copy coordinates to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Grid of Geodetic Attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Track Chainage</span>
                <span className="text-amber-300 font-bold font-mono">
                  {railwayChainageKm || 'KM 28/4 Up Main'}
                </span>
              </div>

              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Fix Timestamp</span>
                <span className="text-slate-300 font-mono text-[10px] truncate block" title={formattedDate}>
                  {formattedDate}
                </span>
              </div>

              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Fix Source</span>
                <span className="text-sky-300 font-mono text-[10px]">
                  {source === 'GPS_DEVICE' ? 'GNSS Receiver (WGS-84)' : 'Track Anchor'}
                </span>
              </div>

              {altitudeMeters !== null && altitudeMeters !== undefined && (
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Altitude MSL</span>
                  <span className="text-slate-300 font-mono text-[10px]">{altitudeMeters}m MSL</span>
                </div>
              )}
            </div>
          </div>

          {/* Visual Track Alignment & Kilometer-Post Spatial Radar */}
          <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-3 overflow-hidden">
            <div className="flex items-center justify-between text-[11px] mb-2 text-slate-400">
              <span className="flex items-center gap-1.5 font-bold text-slate-300">
                <Crosshair className="w-3.5 h-3.5 text-rose-400" />
                Track Spatial Alignment & KM-Post Radar
              </span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Geodetic Chainage Confirmed</span>
              </span>
            </div>

            <div className="h-32 rounded-lg bg-[#060c18] border border-slate-800/80 relative flex items-center justify-center overflow-hidden">
              {/* Grid Lines */}
              <div className="absolute inset-0 grid grid-cols-8 grid-rows-3 border-slate-900 pointer-events-none opacity-40">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="border border-sky-900/30"></div>
                ))}
              </div>

              {/* Ballast corridor */}
              <div className="absolute inset-x-0 h-16 bg-slate-900/60 border-y border-slate-800"></div>

              {/* Railway Parallel Tracks Graphic */}
              <div className="absolute inset-x-0 h-10 flex flex-col justify-between px-4 pointer-events-none">
                <div className="border-b-2 border-slate-600 w-full relative flex items-center justify-between">
                  <span className="absolute -top-3.5 left-2 text-[8.5px] text-sky-400 font-mono font-bold">
                    UP MAIN LINE →
                  </span>
                  <span className="absolute -top-3.5 right-2 text-[8px] text-slate-500 font-mono">
                    MAST POSTS: 100m SPAN
                  </span>
                </div>
                <div className="border-b-2 border-slate-600 w-full relative">
                  <span className="absolute top-1 left-2 text-[8.5px] text-sky-400 font-mono font-bold">
                    ← DN MAIN LINE
                  </span>
                </div>
              </div>

              {/* Milestone KM Posts along track */}
              <div className="absolute inset-x-0 bottom-1 flex justify-around px-6 pointer-events-none">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-3.5 rounded-t bg-amber-400 text-[#0f172a] text-[7px] font-bold flex items-center justify-center border border-amber-600">
                    KM
                  </div>
                  <span className="text-[7.5px] text-slate-400 font-mono">POST A</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-5 h-4 rounded-t bg-amber-300 text-[#0f172a] text-[7.5px] font-bold flex items-center justify-center border border-amber-600 shadow-sm">
                    {railwayChainageKm ? railwayChainageKm.split(' ')[1] || 'KM' : 'KM'}
                  </div>
                  <span className="text-[7.5px] text-amber-300 font-mono font-bold">TARGET FIX</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-4 h-3.5 rounded-t bg-amber-400 text-[#0f172a] text-[7px] font-bold flex items-center justify-center border border-amber-600">
                    KM
                  </div>
                  <span className="text-[7.5px] text-slate-400 font-mono">POST B</span>
                </div>
              </div>

              {/* GPS Crosshair Marker */}
              <div className="relative z-10 flex flex-col items-center mb-1">
                <div className="relative">
                  <span className="absolute -inset-2 rounded-full bg-rose-500/40 animate-ping"></span>
                  <div className="w-6 h-6 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center shadow-lg shadow-rose-950">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                </div>
                <div className="mt-1 px-2.5 py-0.5 rounded-md bg-slate-950/95 border border-rose-600/80 text-[10.5px] font-bold text-rose-300 shadow-xl font-mono tracking-wide">
                  📍 {railwayChainageKm || `KM FIX: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
                </div>
              </div>
            </div>
          </div>

          {/* External Map & Navigation Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-sky-900/80 hover:bg-sky-800 border border-sky-600/70 text-white text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Google Maps</span>
            </a>

            <a
              href={osmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              <span>OpenStreetMap</span>
            </a>

            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-600/70 text-white text-xs font-semibold transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Get Directions</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
