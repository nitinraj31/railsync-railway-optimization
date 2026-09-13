import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MapPin,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Compass,
  Layers,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Info,
  Navigation,
  History,
  AlertTriangle,
  Wrench,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { GeoCoordinates } from '../../types';
import { railwayAudio } from '../../services/railwayAudio';
import {
  getHistoricalIncidentsForLocation,
  HistoricalMaintenanceIncident,
} from '../../services/incidentHistoryService';

interface DefectMapThumbnailProps {
  geoCoordinates: GeoCoordinates | null;
  onCoordinatesChange?: (coords: GeoCoordinates) => void;
  corridorId: string;
  assetId: string;
  defectType?: string;
  severity?: string;
  onOpenFullModal?: () => void;
}

// Corridor Geodetic Reference Constants for Delhi Division Corridors
export const CORRIDOR_MAP_CONFIGS: Record<
  string,
  {
    name: string;
    code: string;
    baseLat: number;
    baseLng: number;
    latPerKm: number;
    lngPerKm: number;
    originStation: string;
    destStation: string;
    defaultKm: number;
    minKm: number;
    maxKm: number;
  }
> = {
  C001: {
    name: 'Northern Main Trunk',
    code: 'NDLS-GZB',
    baseLat: 28.6448,
    baseLng: 77.225,
    latPerKm: 0.0035,
    lngPerKm: 0.0072,
    originStation: 'NDLS (New Delhi)',
    destStation: 'GZB (Ghaziabad)',
    defaultKm: 28.4,
    minKm: 25,
    maxKm: 31,
  },
  C002: {
    name: 'Southern High-Speed Spur',
    code: 'NDLS-FDB',
    baseLat: 28.665,
    baseLng: 77.215,
    latPerKm: -0.0065,
    lngPerKm: 0.0032,
    originStation: 'NDLS (New Delhi)',
    destStation: 'FDB (Faridabad)',
    defaultKm: 18.2,
    minKm: 15,
    maxKm: 21,
  },
  C003: {
    name: 'Western Heavy Freight & Passenger',
    code: 'NDLS-ROK',
    baseLat: 28.692,
    baseLng: 76.921,
    latPerKm: 0.0022,
    lngPerKm: -0.0078,
    originStation: 'NDLS (New Delhi)',
    destStation: 'ROK (Rohtak)',
    defaultKm: 32.6,
    minKm: 29,
    maxKm: 35,
  },
  C004: {
    name: 'Eastern Dedicated Freight Feeder',
    code: 'NDLS-PWL',
    baseLat: 28.583,
    baseLng: 77.245,
    latPerKm: -0.0075,
    lngPerKm: 0.0041,
    originStation: 'NZM (Nizamuddin)',
    destStation: 'PWL (Palwal)',
    defaultKm: 22.8,
    minKm: 19,
    maxKm: 25,
  },
};

export const DefectMapThumbnail: React.FC<DefectMapThumbnailProps> = ({
  geoCoordinates,
  onCoordinatesChange,
  corridorId,
  assetId,
  defectType,
  severity,
  onOpenFullModal,
}) => {
  const [mapLayer, setMapLayer] = useState<'SCHEMATIC_PWAY' | 'TOPO_RADAR'>('SCHEMATIC_PWAY');
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 0.7 = macro, 1 = normal, 1.5 = micro
  const [selectedTrack, setSelectedTrack] = useState<'UP_MAIN' | 'DN_MAIN'>('UP_MAIN');
  const [isKmConfirmed, setIsKmConfirmed] = useState<boolean>(false);
  const [hoveredKm, setHoveredKm] = useState<number | null>(null);

  // Incident History from Audit Logs states
  const [showIncidentHistory, setShowIncidentHistory] = useState<boolean>(true);
  const [selectedHistoricalIncident, setSelectedHistoricalIncident] = useState<HistoricalMaintenanceIncident | null>(null);
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');

  const svgRef = useRef<SVGSVGElement | null>(null);

  const corridor = useMemo(() => {
    return (
      CORRIDOR_MAP_CONFIGS[corridorId] || {
        name: 'Main Railway Trunk',
        code: corridorId,
        baseLat: 28.6448,
        baseLng: 77.225,
        latPerKm: 0.0035,
        lngPerKm: 0.0072,
        originStation: 'Origin Junction',
        destStation: 'Terminus Yard',
        defaultKm: 28.4,
        minKm: 25,
        maxKm: 31,
      }
    );
  }, [corridorId]);

  // Parse or compute Current Kilometer from chainage string or coordinates
  const currentKm = useMemo(() => {
    if (!geoCoordinates) return corridor.defaultKm;

    if (geoCoordinates.railwayChainageKm) {
      // Try extracting KM e.g. "KM 28.4/4 Up Main" or "KM 28.4" or "KM 28"
      const match = geoCoordinates.railwayChainageKm.match(/KM\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (match && match[1]) {
        return parseFloat(match[1]);
      }
    }

    // Fallback: calculate from latitude offset
    const latDiff = geoCoordinates.latitude - corridor.baseLat;
    const computed = corridor.defaultKm + (latDiff / corridor.latPerKm);
    return Math.max(1, Math.round(computed * 10) / 10);
  }, [geoCoordinates, corridor]);

  // Derive visible KM range on screen based on center KM and zoomLevel
  const spanKm = useMemo(() => {
    // Zoom 0.7 => 8 km span; Zoom 1.0 => 4 km span; Zoom 1.5 => 2 km span
    return 4 / zoomLevel;
  }, [zoomLevel]);

  const minVisibleKm = useMemo(() => currentKm - spanKm / 2, [currentKm, spanKm]);
  const maxVisibleKm = useMemo(() => currentKm + spanKm / 2, [currentKm, spanKm]);

  // Retrieve historical maintenance issues for this GPS location and corridor from audit logs
  const historicalIncidents = useMemo(() => {
    return getHistoricalIncidentsForLocation(corridorId, currentKm, geoCoordinates);
  }, [corridorId, currentKm, geoCoordinates]);

  // Filter visible incidents according to current zoom span and severity filter
  const visibleIncidents = useMemo(() => {
    return historicalIncidents.filter((inc) => {
      if (incidentSeverityFilter !== 'ALL' && inc.severity !== incidentSeverityFilter) return false;
      return inc.chainageKm >= minVisibleKm - 0.25 && inc.chainageKm <= maxVisibleKm + 0.25;
    });
  }, [historicalIncidents, minVisibleKm, maxVisibleKm, incidentSeverityFilter]);

  // Nearest catenary mast number (typically every 50-100m, odd for UP, even for DN in Indian Railways)
  const mastNumber = useMemo(() => {
    const kmInt = Math.floor(currentKm);
    const fraction = currentKm - kmInt;
    const mastIndex = Math.floor(fraction * 20); // 20 masts per km approx
    const parity = selectedTrack === 'UP_MAIN' ? 1 : 2;
    return `${kmInt}/${mastIndex * 2 + parity}`;
  }, [currentKm, selectedTrack]);

  // Distance to nearest station
  const distanceToOrigin = Math.max(0.5, currentKm).toFixed(1);

  // SVG coordinate transformation: Map KM to SVG X coordinate (0 to 600)
  const kmToSvgX = (km: number) => {
    return ((km - minVisibleKm) / spanKm) * 580 + 10;
  };

  const svgXtoKm = (x: number) => {
    const clampedX = Math.max(10, Math.min(590, x));
    const ratio = (clampedX - 10) / 580;
    const calculatedKm = minVisibleKm + ratio * spanKm;
    return Math.round(calculatedKm * 10) / 10;
  };

  // Click on track to reposition pin & update KM Post
  const handleTrackClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const relativeX = (clickX / rect.width) * 600;

    const clickedY = e.clientY - rect.top;
    const relativeY = (clickedY / rect.height) * 220;

    // If clicked closer to bottom track, set DN_MAIN, else UP_MAIN
    const clickedTrack = relativeY > 120 ? 'DN_MAIN' : 'UP_MAIN';
    setSelectedTrack(clickedTrack);

    const newKm = svgXtoKm(relativeX);
    updateLocationToKm(newKm, clickedTrack);
  };

  // Update Coordinates and Chainage string to exact KM
  const updateLocationToKm = (newKm: number, track: 'UP_MAIN' | 'DN_MAIN' = selectedTrack) => {
    const kmDelta = newKm - corridor.defaultKm;
    const newLat = Number((corridor.baseLat + kmDelta * corridor.latPerKm).toFixed(6));
    const newLng = Number((corridor.baseLng + kmDelta * corridor.lngPerKm).toFixed(6));
    const trackLabel = track === 'UP_MAIN' ? 'Up Main' : 'Dn Main';
    const chainagePost = `KM ${newKm.toFixed(1)}/4 ${trackLabel}`;

    const updatedCoords: GeoCoordinates = {
      latitude: newLat,
      longitude: newLng,
      accuracyMeters: 2.8,
      altitudeMeters: geoCoordinates?.altitudeMeters || 215,
      capturedAt: new Date().toISOString(),
      source: geoCoordinates?.source || 'CORRIDOR_ANCHOR',
      railwayChainageKm: chainagePost,
    };

    if (onCoordinatesChange) {
      onCoordinatesChange(updatedCoords);
    }
    setIsKmConfirmed(true);
    railwayAudio.playBeep(880, 0.08);
  };

  // Nudge along chainage by +/- 100 meters
  const handleNudgeKm = (deltaKm: number) => {
    const nextKm = Math.round((currentKm + deltaKm) * 10) / 10;
    updateLocationToKm(nextKm, selectedTrack);
  };

  // Toggle track line (Up vs Down Main)
  const handleToggleTrack = () => {
    const nextTrack = selectedTrack === 'UP_MAIN' ? 'DN_MAIN' : 'UP_MAIN';
    setSelectedTrack(nextTrack);
    updateLocationToKm(currentKm, nextTrack);
  };

  // Reset confirmation state when coordinates change externally
  useEffect(() => {
    setIsKmConfirmed(false);
  }, [geoCoordinates?.latitude, geoCoordinates?.longitude]);

  // Generate Kilometer Posts ticks and labels for the visible span
  const kmMarkers = useMemo(() => {
    const markers: { km: number; x: number; isMajor: boolean }[] = [];
    const start = Math.floor(minVisibleKm);
    const end = Math.ceil(maxVisibleKm);

    for (let k = start; k <= end; k += 0.2) {
      const roundedK = Math.round(k * 10) / 10;
      if (roundedK >= minVisibleKm - 0.2 && roundedK <= maxVisibleKm + 0.2) {
        markers.push({
          km: roundedK,
          x: kmToSvgX(roundedK),
          isMajor: Math.abs(roundedK - Math.round(roundedK)) < 0.05,
        });
      }
    }
    return markers;
  }, [minVisibleKm, maxVisibleKm, kmToSvgX]);

  // Pin X and Y coordinates
  const pinX = kmToSvgX(currentKm);
  const pinY = selectedTrack === 'UP_MAIN' ? 82 : 142;

  const googleMapsUrl = geoCoordinates
    ? `https://www.google.com/maps?q=${geoCoordinates.latitude},${geoCoordinates.longitude}`
    : `https://www.google.com/maps?q=${corridor.baseLat},${corridor.baseLng}`;

  return (
    <div
      id="defect-map-thumbnail-container"
      className="p-3 rounded-xl bg-slate-950 border border-sky-600/70 shadow-lg space-y-2.5 font-mono text-slate-200"
    >
      {/* Header & Map Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-950 border border-rose-600 text-rose-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Track Kilometer-Post Map Preview
              </span>
              {geoCoordinates ? (
                isKmConfirmed ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>KM CONFIRMED</span>
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-700 flex items-center gap-1">
                    <Crosshair className="w-3 h-3 text-sky-400" />
                    <span>PINNED FIX</span>
                  </span>
                )
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                  CORRIDOR PREVIEW
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Corridor: <span className="text-sky-300 font-semibold">{corridor.code}</span> ({corridor.name})
            </p>
          </div>
        </div>

        {/* Action Buttons: Incident History, Layers, Zoom, Enlarge */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* Incident History Toggle Button */}
          <button
            type="button"
            id="btn-toggle-incident-history"
            onClick={() => {
              const nextState = !showIncidentHistory;
              setShowIncidentHistory(nextState);
              if (!nextState) setSelectedHistoricalIncident(null);
              railwayAudio.playBeep(nextState ? 880 : 440, 0.05);
            }}
            className={`p-1.5 px-2 rounded-lg text-[10px] font-bold font-mono flex items-center gap-1.5 border transition-all cursor-pointer ${
              showIncidentHistory
                ? 'bg-amber-950/90 text-amber-300 border-amber-500 shadow-md shadow-amber-950/60 ring-1 ring-amber-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Toggle Historical Maintenance Issues from Audit Logs at this GPS Location"
          >
            <History className={`w-3.5 h-3.5 ${showIncidentHistory ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Incident History</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                showIncidentHistory ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {historicalIncidents.length}
            </span>
          </button>

          {/* Layer switcher */}
          <button
            type="button"
            id="btn-toggle-map-layer"
            onClick={() => {
              setMapLayer(mapLayer === 'SCHEMATIC_PWAY' ? 'TOPO_RADAR' : 'SCHEMATIC_PWAY');
              railwayAudio.playBeep(650, 0.04);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
            title={`Toggle Map Style (Current: ${mapLayer === 'SCHEMATIC_PWAY' ? 'Schematic P-Way' : 'Satellite Topo Radar'})`}
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">{mapLayer === 'SCHEMATIC_PWAY' ? 'P-Way' : 'Radar'}</span>
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.25))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Zoom out track view"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.min(1.8, prev + 0.25))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Zoom in to sleepers & mast resolution"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Open Detailed Geodetic Modal */}
          {onOpenFullModal && (
            <button
              type="button"
              id="btn-enlarge-map-modal"
              onClick={onOpenFullModal}
              className="p-1.5 rounded-lg bg-sky-900/80 hover:bg-sky-800 text-sky-200 border border-sky-600/70 transition-colors cursor-pointer"
              title="Inspect Fullscreen Spatial Radar"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SVG Interactive Railway Map Viewport */}
      <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-[#060b17] select-none">
        <svg
          ref={svgRef}
          viewBox="0 0 600 220"
          className="w-full h-48 md:h-52 cursor-crosshair transition-colors"
          onClick={handleTrackClick}
          onMouseMove={(e) => {
            if (!svgRef.current) return;
            const rect = svgRef.current.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * 600;
            setHoveredKm(svgXtoKm(relX));
          }}
          onMouseLeave={() => setHoveredKm(null)}
        >
          <defs>
            {/* Ballast corridor gradient */}
            <linearGradient id="ballastGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="1" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.8" />
            </linearGradient>

            {/* Topo radar grid pattern */}
            <pattern id="radarGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.8" />
            </pattern>

            {/* Radar scan lines */}
            <linearGradient id="radarSweep" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Background Layer */}
          <rect width="600" height="220" fill={mapLayer === 'SCHEMATIC_PWAY' ? '#070d1a' : '#030712'} />

          {/* Topo Radar Layer Details */}
          {mapLayer === 'TOPO_RADAR' && (
            <>
              <rect width="600" height="220" fill="url(#radarGrid)" />
              {/* Simulated elevation contour lines */}
              <path
                d="M 0 45 Q 150 30 300 50 T 600 35"
                fill="none"
                stroke="#0284c7"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity="0.3"
              />
              <path
                d="M 0 180 Q 200 195 400 175 T 600 190"
                fill="none"
                stroke="#0284c7"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity="0.3"
              />
              {/* Radar sweep */}
              <rect width="600" height="220" fill="url(#radarSweep)" />
            </>
          )}

          {/* Right of Way (RoW) Boundary Lines */}
          <line x1="0" y1="40" x2="600" y2="40" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
          <line x1="0" y1="185" x2="600" y2="185" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
          <text x="8" y="34" fill="#64748b" fontSize="8" fontFamily="monospace">
            RAILWAY BOUNDARY / CABLE TROUGH (NORTH)
          </text>
          <text x="8" y="197" fill="#64748b" fontSize="8" fontFamily="monospace">
            RAILWAY BOUNDARY / DRAINAGE EMBANKMENT (SOUTH)
          </text>

          {/* Ballast Bed */}
          <rect x="0" y="55" width="600" height="115" fill="url(#ballastGrad)" rx="4" />

          {/* Cross Sleepers (perpendicular lines along tracks) */}
          {Array.from({ length: 45 }).map((_, i) => {
            const xPos = i * 13.5 + 4;
            return (
              <line
                key={`sleeper-${i}`}
                x1={xPos}
                y1="68"
                x2={xPos}
                y2="158"
                stroke="#334155"
                strokeWidth="2.5"
                opacity="0.65"
              />
            );
          })}

          {/* UP MAIN LINE (Top Track) */}
          {/* Steel Rails */}
          <line x1="0" y1="78" x2="600" y2="78" stroke="#94a3b8" strokeWidth="3" />
          <line x1="0" y1="86" x2="600" y2="86" stroke="#94a3b8" strokeWidth="3" />
          <text x="12" y="72" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
            UP MAIN LINE → [{corridor.destStation}]
          </text>

          {/* DN MAIN LINE (Bottom Track) */}
          {/* Steel Rails */}
          <line x1="0" y1="138" x2="600" y2="138" stroke="#94a3b8" strokeWidth="3" />
          <line x1="0" y1="146" x2="600" y2="146" stroke="#94a3b8" strokeWidth="3" />
          <text x="12" y="162" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
            ← DN MAIN LINE [{corridor.originStation}]
          </text>

          {/* Catenary Mast Masts & Overhead OHE Drops */}
          {Array.from({ length: 9 }).map((_, i) => {
            const mastX = i * 72 + 20;
            return (
              <g key={`mast-${i}`}>
                {/* Mast structure pole */}
                <line x1={mastX} y1="46" x2={mastX} y2="178" stroke="#475569" strokeWidth="2" />
                <circle cx={mastX} cy="46" r="3" fill="#0284c7" />
                <circle cx={mastX} cy="178" r="3" fill="#0284c7" />
                <line x1={mastX - 4} y1="112" x2={mastX + 4} y2="112" stroke="#64748b" strokeWidth="1.5" />
              </g>
            );
          })}

          {/* Track Kilometer Posts (Milestones on Ground) */}
          {kmMarkers.map((marker, idx) => {
            if (marker.isMajor) {
              return (
                <g key={`km-${idx}`}>
                  {/* Vertical milestone line */}
                  <line
                    x1={marker.x}
                    y1="50"
                    x2={marker.x}
                    y2="175"
                    stroke="#f59e0b"
                    strokeWidth="1.2"
                    strokeDasharray="4,3"
                    opacity="0.6"
                  />
                  {/* Physical KM Stone Post Graphic */}
                  <path
                    d={`M ${marker.x - 14} 210 L ${marker.x + 14} 210 L ${marker.x + 14} 188 A 14 14 0 0 0 ${marker.x - 14} 188 Z`}
                    fill="#fef08a"
                    stroke="#b45309"
                    strokeWidth="1.2"
                  />
                  {/* Top curved yellow section of milestone */}
                  <path
                    d={`M ${marker.x - 14} 193 L ${marker.x + 14} 193 L ${marker.x + 14} 188 A 14 14 0 0 0 ${marker.x - 14} 188 Z`}
                    fill="#eab308"
                  />
                  {/* Kilometer text inside stone */}
                  <text
                    x={marker.x}
                    y="204"
                    textAnchor="middle"
                    fill="#0f172a"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {Math.round(marker.km)} KM
                  </text>
                </g>
              );
            } else {
              // Minor 100m/200m catenary telegraph tick
              return (
                <g key={`tenth-${idx}`}>
                  <line
                    x1={marker.x}
                    y1="108"
                    x2={marker.x}
                    y2="118"
                    stroke="#64748b"
                    strokeWidth="1"
                  />
                  <text
                    x={marker.x}
                    y="105"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="7.5"
                    fontFamily="monospace"
                  >
                    /{(Math.round(marker.km * 10) % 10)}
                  </text>
                </g>
              );
            }
          })}

          {/* Interactive Hover KM Guide */}
          {hoveredKm !== null && (
            <g transform={`translate(${kmToSvgX(hoveredKm)}, 0)`} opacity="0.8">
              <line x1="0" y1="20" x2="0" y2="200" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,2" />
              <rect x="-35" y="8" width="70" height="15" rx="3" fill="#0f172a" stroke="#0284c7" strokeWidth="1" />
              <text x="0" y="19" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                KM {hoveredKm.toFixed(1)}
              </text>
            </g>
          )}

          {/* PINNED DEFECT MARKER & RADAR PULSE */}
          {geoCoordinates && (
            <g id="defect-pinned-marker-group">
              {/* Radar Pulsing Rings */}
              <circle cx={pinX} cy={pinY} r="28" fill="none" stroke="#f43f5e" strokeWidth="1.2" opacity="0.3">
                <animate attributeName="r" values="10;36" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={pinX} cy={pinY} r="18" fill="none" stroke="#f43f5e" strokeWidth="1.2" opacity="0.6">
                <animate attributeName="r" values="6;24" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0" dur="2s" repeatCount="indefinite" />
              </circle>

              {/* Crosshair lines */}
              <line x1={pinX - 16} y1={pinY} x2={pinX + 16} y2={pinY} stroke="#ffffff" strokeWidth="1" opacity="0.7" />
              <line x1={pinX} y1={pinY - 16} x2={pinX} y2={pinY + 16} stroke="#ffffff" strokeWidth="1" opacity="0.7" />

              {/* Target Core Marker Pin */}
              <circle cx={pinX} cy={pinY} r="7.5" fill="#e11d48" stroke="#ffffff" strokeWidth="2.5" />
              <circle cx={pinX} cy={pinY} r="2.5" fill="#ffffff" />

              {/* Pin KM Callout Tag */}
              <g transform={`translate(${Math.min(480, Math.max(75, pinX))}, ${pinY > 110 ? pinY - 42 : pinY + 36})`}>
                <rect
                  x="-72"
                  y="-14"
                  width="144"
                  height="26"
                  rx="6"
                  fill="#020617"
                  stroke={severity === 'CRITICAL' ? '#f43f5e' : '#38bdf8'}
                  strokeWidth="1.5"
                  opacity="0.95"
                />
                <text
                  x="0"
                  y="2"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  📍 KM {currentKm.toFixed(1)}/4 {selectedTrack === 'UP_MAIN' ? 'UP' : 'DN'}
                </text>
              </g>
            </g>
          )}

          {/* HISTORICAL MAINTENANCE INCIDENT MARKERS FROM AUDIT LOGS */}
          {showIncidentHistory &&
            visibleIncidents.map((inc) => {
              const incX = kmToSvgX(inc.chainageKm);
              const incY = inc.track === 'UP_MAIN' ? 82 : 142;
              const isSelected = selectedHistoricalIncident?.id === inc.id;
              const sevColor =
                inc.severity === 'CRITICAL'
                  ? '#ef4444'
                  : inc.severity === 'HIGH'
                  ? '#f59e0b'
                  : '#38bdf8';

              const stemTop = inc.track === 'UP_MAIN' ? 38 : 158;

              return (
                <g
                  key={`incident-${inc.id}`}
                  id={`historical-marker-${inc.id}`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedHistoricalIncident(isSelected ? null : inc);
                    railwayAudio.playBeep(isSelected ? 440 : 820, 0.04);
                  }}
                >
                  {/* Stem line from marker tag down to rail coordinate */}
                  <line
                    x1={incX}
                    y1={stemTop}
                    x2={incX}
                    y2={incY}
                    stroke={sevColor}
                    strokeWidth={isSelected ? '2' : '1.2'}
                    strokeDasharray="3,2"
                    opacity={isSelected ? 1 : 0.75}
                  />

                  {/* Pulsing beacon if selected */}
                  {isSelected && (
                    <circle
                      cx={incX}
                      cy={stemTop}
                      r="16"
                      fill="none"
                      stroke={sevColor}
                      strokeWidth="2"
                    >
                      <animate attributeName="r" values="10;22" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.9;0" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Incident Target Halo on the rail */}
                  <circle
                    cx={incX}
                    cy={incY}
                    r={isSelected ? '6' : '4'}
                    fill={sevColor}
                    stroke="#020617"
                    strokeWidth="1.5"
                  />

                  {/* Diamond / Warning Flag on Stem */}
                  <g transform={`translate(${incX}, ${stemTop})`}>
                    {/* Diamond badge */}
                    <polygon
                      points="0,-10 10,0 0,10 -10,0"
                      fill={isSelected ? '#78350f' : '#1e1b4b'}
                      stroke={sevColor}
                      strokeWidth={isSelected ? '2.2' : '1.5'}
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      !
                    </text>

                    {/* Small Audit ID Tag */}
                    <rect
                      x="-36"
                      y={inc.track === 'UP_MAIN' ? -25 : 12}
                      width="72"
                      height="15"
                      rx="3"
                      fill="#020617"
                      stroke={isSelected ? '#fbbf24' : '#475569'}
                      strokeWidth={isSelected ? '1.5' : '0.8'}
                    />
                    <text
                      x="0"
                      y={inc.track === 'UP_MAIN' ? -15 : 22}
                      textAnchor="middle"
                      fill={isSelected ? '#fde68a' : '#cbd5e1'}
                      fontSize="7.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {inc.auditLogId}
                    </text>
                  </g>
                </g>
              );
            })}

          {/* Compass Rose in upper right */}
          <g transform="translate(565, 30)">
            <circle cx="0" cy="0" r="14" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <polygon points="0,-10 3,0 -3,0" fill="#f43f5e" />
            <polygon points="0,10 3,0 -3,0" fill="#94a3b8" />
            <text x="0" y="-12" textAnchor="middle" fill="#f43f5e" fontSize="7.5" fontWeight="bold">
              N
            </text>
          </g>

          {/* Scale bar in lower left */}
          <g transform="translate(14, 208)">
            <line x1="0" y1="0" x2="60" y2="0" stroke="#94a3b8" strokeWidth="2" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="60" y1="-3" x2="60" y2="3" stroke="#94a3b8" strokeWidth="1.5" />
            <text x="30" y="-4" textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">
              {Math.round((spanKm * 1000) / 10)}m
            </text>
          </g>
        </svg>

        {/* Empty state overlay when coordinates are not logged yet */}
        {!geoCoordinates && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center">
            <div className="p-2 rounded-full bg-sky-950/80 border border-sky-600 text-sky-400 mb-2">
              <Crosshair className="w-5 h-5 animate-pulse" />
            </div>
            <strong className="text-xs text-white">Click Anywhere Along Track to Pin KM Post</strong>
            <p className="text-[11px] text-slate-300 mt-0.5 max-w-sm">
              Click to plant defect location along {corridor.code} permanent way, or use Log Geo-coordinates below.
            </p>
          </div>
        )}
      </div>

      {/* Track Kilometer-Post Confirmation & Fine-Tuning Bar */}
      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          {/* Current KM Post Reading */}
          <div>
            <span className="text-[10px] text-slate-400 block">CURRENT PINNED CHAINAGE POST:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-amber-300 font-mono tracking-wide">
                KM {currentKm.toFixed(1)}/4 {selectedTrack === 'UP_MAIN' ? 'Up Main' : 'Dn Main'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Mast {mastNumber}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {distanceToOrigin} km from {corridor.originStation} | Datum: WGS-84 GNSS
            </p>
          </div>

          {/* Confirm Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              id="btn-confirm-km-post"
              onClick={() => {
                setIsKmConfirmed(true);
                updateLocationToKm(currentKm, selectedTrack);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                isKmConfirmed
                  ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-600 shadow-md shadow-emerald-950'
                  : 'bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white shadow-md shadow-sky-950'
              }`}
              title="Confirm track kilometer-post for engineering gangs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isKmConfirmed ? 'KM Confirmed ✓' : 'Confirm KM Post'}</span>
            </button>
          </div>
        </div>

        {/* Nudge & Track Adjusters */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Track Line:</span>
            <button
              type="button"
              onClick={() => {
                setSelectedTrack('UP_MAIN');
                updateLocationToKm(currentKm, 'UP_MAIN');
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer border ${
                selectedTrack === 'UP_MAIN'
                  ? 'bg-sky-950 text-sky-200 border-sky-600 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              UP Main
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedTrack('DN_MAIN');
                updateLocationToKm(currentKm, 'DN_MAIN');
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer border ${
                selectedTrack === 'DN_MAIN'
                  ? 'bg-sky-950 text-sky-200 border-sky-600 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              DN Main
            </button>
          </div>

          {/* Micro-Chainage Nudge Buttons */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">Fine-tune:</span>
            <button
              type="button"
              id="btn-nudge-km-minus"
              onClick={() => handleNudgeKm(-0.1)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono border border-slate-700 transition-colors cursor-pointer"
              title="Shift 100m backward along track chainage"
            >
              -100m
            </button>
            <button
              type="button"
              id="btn-nudge-km-plus"
              onClick={() => handleNudgeKm(0.1)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono border border-slate-700 transition-colors cursor-pointer"
              title="Shift 100m forward along track chainage"
            >
              +100m
            </button>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-sky-200 text-[10px] font-mono border border-slate-700 flex items-center gap-1 transition-colors"
              title="Verify pinned site on Google Maps satellite imagery"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              <span>Ext Map</span>
            </a>
          </div>
        </div>
      </div>

      {/* Historical Maintenance Incidents from Audit Logs Drawer */}
      {showIncidentHistory && (
        <div
          id="incident-history-panel"
          className="p-3 rounded-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/50 shadow-lg space-y-2.5"
        >
          {/* Panel Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-600/70 text-amber-400">
                <History className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                    Historical Maintenance Issues
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700 font-mono">
                    {historicalIncidents.length} AUDIT LOG RECORDS
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Track-section historical failures & rectifications at this GPS location ({corridor.code})
                </p>
              </div>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-slate-500 mr-1">Filter:</span>
              {(['ALL', 'CRITICAL', 'HIGH'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => {
                    setIncidentSeverityFilter(sev);
                    railwayAudio.playBeep(600, 0.03);
                  }}
                  className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer border ${
                    incidentSeverityFilter === sev
                      ? 'bg-amber-950 text-amber-200 border-amber-600 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Incident In-Depth Detail Card */}
          {selectedHistoricalIncident && (
            <div
              id="selected-historical-incident-card"
              className="p-2.5 rounded-lg bg-slate-950 border border-amber-500/70 shadow-md space-y-2 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                      selectedHistoricalIncident.severity === 'CRITICAL'
                        ? 'bg-rose-950 text-rose-300 border-rose-600'
                        : selectedHistoricalIncident.severity === 'HIGH'
                        ? 'bg-amber-950 text-amber-300 border-amber-600'
                        : 'bg-sky-950 text-sky-300 border-sky-600'
                    }`}
                  >
                    {selectedHistoricalIncident.severity}
                  </span>
                  <span className="font-bold text-white font-mono text-xs">
                    {selectedHistoricalIncident.auditLogId}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {selectedHistoricalIncident.dateFormatted}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      updateLocationToKm(
                        selectedHistoricalIncident.chainageKm,
                        selectedHistoricalIncident.track
                      );
                      railwayAudio.playBeep(920, 0.05);
                    }}
                    className="px-2 py-0.5 rounded bg-sky-900/80 hover:bg-sky-800 text-sky-200 border border-sky-600 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                    title="Center map on this historical incident chainage"
                  >
                    <Crosshair className="w-3 h-3 text-sky-400" />
                    <span>Center Map</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedHistoricalIncident(null)}
                    className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-800"
                    title="Close detail view"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Incident Title */}
              <div>
                <h4 className="font-semibold text-amber-200 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>{selectedHistoricalIncident.issueType}</span>
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {selectedHistoricalIncident.defectSummary}
                </p>
              </div>

              {/* Action Taken & Verification Details */}
              <div className="p-2 rounded bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="flex items-start gap-1.5 text-[11px] text-emerald-300">
                  <Wrench className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-200 block text-[10px]">MAINTENANCE REMEDY APPLIED:</span>
                    <span>{selectedHistoricalIncident.maintenanceActionTaken}</span>
                  </div>
                </div>

                {selectedHistoricalIncident.speedRestrictionImposed && (
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-mono pt-1 border-t border-slate-800">
                    <ShieldAlert className="w-3 h-3 text-amber-400" />
                    <span>Speed Caution: {selectedHistoricalIncident.speedRestrictionImposed}</span>
                  </div>
                )}
              </div>

              {/* Auditor Sign-off Bar */}
              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span>
                  Audited & Certified by: <strong className="text-sky-300">{selectedHistoricalIncident.auditedBy}</strong> ({selectedHistoricalIncident.auditorRole})
                </span>
                <span className="text-emerald-400 font-bold font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{selectedHistoricalIncident.status}</span>
                </span>
              </div>
            </div>
          )}

          {/* Historical Incident Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {historicalIncidents.map((inc) => {
              const isSelected = selectedHistoricalIncident?.id === inc.id;
              const isNearFix = inc.distanceMetersFromFix <= 150;

              return (
                <div
                  key={inc.id}
                  id={`incident-item-${inc.id}`}
                  onClick={() => {
                    setSelectedHistoricalIncident(isSelected ? null : inc);
                    railwayAudio.playBeep(isSelected ? 440 : 750, 0.04);
                  }}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer text-left space-y-1.5 ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          inc.severity === 'CRITICAL'
                            ? 'bg-rose-500 animate-pulse'
                            : inc.severity === 'HIGH'
                            ? 'bg-amber-500'
                            : 'bg-sky-500'
                        }`}
                      />
                      <span className="text-[10px] font-bold text-white font-mono">
                        {inc.auditLogId}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {inc.dateFormatted.split(',')[0]}
                      </span>
                    </div>

                    {/* Proximity Tag */}
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${
                        isNearFix
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {inc.distanceMetersFromFix === 0
                        ? 'Exact GPS Spot (0m)'
                        : `${inc.distanceMetersFromFix}m from fix`}
                    </span>
                  </div>

                  {/* Title & Post */}
                  <div>
                    <h5 className="text-[11px] font-semibold text-slate-200 line-clamp-1">
                      {inc.issueType}
                    </h5>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Location: <span className="text-amber-300">{inc.chainagePost}</span> ({inc.department})
                    </p>
                  </div>

                  {/* Action summary */}
                  <p className="text-[10px] text-slate-400 line-clamp-1 border-t border-slate-900 pt-1">
                    ↳ Remedy: {inc.maintenanceActionTaken}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
