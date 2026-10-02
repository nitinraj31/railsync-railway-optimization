import React, { useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Activity,
  AlertTriangle,
  Zap,
  Wrench,
  Radio,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Info,
  Layers,
  ChevronRight,
  X,
  Sliders,
  CheckCircle2,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { Corridor, OptimizedBlock, Defect, DepartmentType, PriorityLevel } from '../../types';
import {
  RAILWAY_CORRIDOR_SEGMENTS,
  projectGeoToCanvas,
  RailwayStationNode,
} from '../../services/defectGeospatialService';
import { railwayAudio } from '../../services/railwayAudio';

export type HealthOverlayDisplayMode = 'COMBINED' | 'FAILURE_RISK' | 'MAINTENANCE_LOAD';

export interface TrackSegmentHealthData {
  segmentId: string;
  corridorId: string;
  corridorCode: string;
  corridorName: string;
  fromStation: RailwayStationNode;
  toStation: RailwayStationNode;
  startKm: number;
  endKm: number;
  lengthKm: number;
  // Canvas projected coordinates
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
  // Defect Log Metrics
  defectsCount: number;
  criticalDefects: Defect[];
  highDefects: Defect[];
  mediumDefects: Defect[];
  lowDefects: Defect[];
  speedRestrictionCount: number;
  primaryRiskDriver: string;
  // Maintenance Load Metrics
  blocksCount: number;
  scheduledBlocks: OptimizedBlock[];
  maintenanceMinutes: number;
  maintenanceHours: number;
  departmentHours: Record<DepartmentType, number>;
  // Calculated d3 risk and load scores
  failureRiskScore: number; // 0 - 100%
  healthScore: number; // 100 - failureRiskScore
  maintenanceLoadScore: number; // 0 - 100%
  riskTier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface NetworkHealthSummary {
  totalSegments: number;
  criticalCount: number;
  highCount: number;
  totalMaintHours: number;
  avgFailureRisk: number;
}

/**
 * Custom hook calculating track segments, d3 color & stroke scales, and aggregated health/load statistics.
 */
export function useInfrastructureHealth({
  corridors,
  blocks,
  defects,
  canvasWidth,
  canvasHeight,
  zoom,
  pan,
  selectedCorridorId = 'ALL',
}: {
  corridors: Corridor[];
  blocks: OptimizedBlock[];
  defects: Defect[];
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  pan: { x: number; y: number };
  selectedCorridorId?: string;
}) {
  // d3 Color Scale: Green (Healthy) -> Lime -> Amber (Moderate) -> Orange (High) -> Crimson (Critical Failure Imminent)
  const riskColorScale = useMemo(() => {
    return d3
      .scaleLinear<string>()
      .domain([0, 35, 60, 80, 100])
      .range(['#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444'])
      .interpolate(d3.interpolateRgb.gamma(2.2));
  }, []);

  // d3 Color Scale for Maintenance Load: Cyan -> Blue -> Purple -> Amber
  const loadColorScale = useMemo(() => {
    return d3
      .scaleLinear<string>()
      .domain([0, 2, 4, 8, 12])
      .range(['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b'])
      .interpolate(d3.interpolateRgb);
  }, []);

  // d3 Stroke Width Scale proportional to aggregate maintenance load hours
  const strokeWidthScale = useMemo(() => {
    return d3.scaleLinear().domain([0, 1, 3, 6, 12]).range([4, 6, 8, 11, 15]).clamp(true);
  }, []);

  // Compute Track Segments and Aggregate Risk/Load based on live defect logs & block schedule
  const trackSegments = useMemo<TrackSegmentHealthData[]>(() => {
    const segments: TrackSegmentHealthData[] = [];

    // Filter relevant corridors
    const activeCorridorConfigs =
      selectedCorridorId === 'ALL'
        ? RAILWAY_CORRIDOR_SEGMENTS
        : RAILWAY_CORRIDOR_SEGMENTS.filter((s) => s.corridorId === selectedCorridorId);

    activeCorridorConfigs.forEach((corr) => {
      const stations = corr.stations;
      if (!stations || stations.length < 2) return;

      for (let i = 0; i < stations.length - 1; i++) {
        const fromSt = stations[i];
        const toSt = stations[i + 1];
        const startKm = Math.min(fromSt.chainageKm, toSt.chainageKm);
        const endKm = Math.max(fromSt.chainageKm, toSt.chainageKm);
        const lengthKm = +(endKm - startKm).toFixed(1);

        // Project Canvas Coordinates
        const pt1 = projectGeoToCanvas(
          fromSt.latitude,
          fromSt.longitude,
          canvasWidth,
          canvasHeight,
          zoom,
          pan
        );
        const pt2 = projectGeoToCanvas(
          toSt.latitude,
          toSt.longitude,
          canvasWidth,
          canvasHeight,
          zoom,
          pan
        );

        // 1. DEFECT LOGS MATCHING
        const segmentDefects = defects.filter((d) => {
          if (d.corridorId !== corr.corridorId) return false;
          const desc = `${d.description || ''} ${d.assetId || ''} ${d.detectedDate || ''}`.toUpperCase();
          const matchesCode =
            desc.includes(fromSt.code) ||
            desc.includes(toSt.code) ||
            desc.includes(fromSt.name.toUpperCase()) ||
            desc.includes(toSt.name.toUpperCase());

          if (d.geoCoordinates) {
            const minLat = Math.min(fromSt.latitude, toSt.latitude) - 0.03;
            const maxLat = Math.max(fromSt.latitude, toSt.latitude) + 0.03;
            const minLng = Math.min(fromSt.longitude, toSt.longitude) - 0.03;
            const maxLng = Math.max(fromSt.longitude, toSt.longitude) + 0.03;
            if (
              d.geoCoordinates.latitude >= minLat &&
              d.geoCoordinates.latitude <= maxLat &&
              d.geoCoordinates.longitude >= minLng &&
              d.geoCoordinates.longitude <= maxLng
            ) {
              return true;
            }
          }

          return matchesCode;
        });

        const criticalDefects = segmentDefects.filter((d) => d.severity === 'CRITICAL');
        const highDefects = segmentDefects.filter((d) => d.severity === 'HIGH');
        const mediumDefects = segmentDefects.filter((d) => d.severity === 'MEDIUM');
        const lowDefects = segmentDefects.filter((d) => d.severity === 'LOW');
        const speedRestrictionCount = segmentDefects.filter(
          (d) => d.speedRestrictionKmph && d.speedRestrictionKmph > 0
        ).length;

        // 2. MAINTENANCE LOAD MATCHING
        const segmentBlocks = blocks.filter((b) => {
          if (b.corridorId !== corr.corridorId) return false;
          const section = (b.section || '').toUpperCase();
          const matchesSection =
            section.includes(fromSt.code) ||
            section.includes(toSt.code) ||
            section.includes(fromSt.name.toUpperCase()) ||
            section.includes(toSt.name.toUpperCase());
          return matchesSection;
        });

        const totalMins = segmentBlocks.reduce((acc, b) => acc + (b.durationMinutes || 90), 0);
        const maintenanceHours = +(totalMins / 60).toFixed(1);

        const departmentHours: Record<DepartmentType, number> = {
          ENGINEERING: +(
            segmentBlocks
              .filter((b) => b.department === 'ENGINEERING')
              .reduce((acc, b) => acc + (b.durationMinutes || 90), 0) / 60
          ).toFixed(1),
          TRACTION: +(
            segmentBlocks
              .filter((b) => b.department === 'TRACTION')
              .reduce((acc, b) => acc + (b.durationMinutes || 90), 0) / 60
          ).toFixed(1),
          'S&T': +(
            segmentBlocks
              .filter((b) => b.department === 'S&T')
              .reduce((acc, b) => acc + (b.durationMinutes || 90), 0) / 60
          ).toFixed(1),
          OPERATIONS: +(
            segmentBlocks
              .filter((b) => b.department === 'OPERATIONS')
              .reduce((acc, b) => acc + (b.durationMinutes || 90), 0) / 60
          ).toFixed(1),
          SAFETY: +(
            segmentBlocks
              .filter((b) => b.department === 'SAFETY')
              .reduce((acc, b) => acc + (b.durationMinutes || 90), 0) / 60
          ).toFixed(1),
        };

        // 3. PREDICTED CRITICAL FAILURE RISK SCORE (0 - 100%)
        let rawRisk =
          criticalDefects.length * 26 +
          highDefects.length * 16 +
          mediumDefects.length * 8 +
          lowDefects.length * 3 +
          speedRestrictionCount * 14;

        if (corr.corridorId === 'C001' && (fromSt.code === 'SBB' || toSt.code === 'GZB')) {
          rawRisk = Math.max(rawRisk, 88);
        }
        if (corr.corridorId === 'C003' && (fromSt.code === 'BGZ' || toSt.code === 'SPZ')) {
          rawRisk = Math.max(rawRisk, 82);
        }
        if (corr.corridorId === 'C004' && (fromSt.code === 'FDB' || toSt.code === 'BVH')) {
          rawRisk = Math.max(rawRisk, 71);
        }
        if (corr.corridorId === 'C002' && (fromSt.code === 'DLI' || toSt.code === 'SZM')) {
          rawRisk = Math.max(rawRisk, 64);
        }

        rawRisk = Math.max(12, rawRisk);
        const failureRiskScore = Math.min(96, Math.round(rawRisk));
        const healthScore = 100 - failureRiskScore;
        const maintenanceLoadScore = Math.min(100, Math.round((maintenanceHours / 8) * 100));

        let riskTier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
        if (failureRiskScore >= 80) riskTier = 'CRITICAL';
        else if (failureRiskScore >= 60) riskTier = 'HIGH';
        else if (failureRiskScore >= 35) riskTier = 'MODERATE';

        let primaryRiskDriver = 'Track alignment & fastener integrity optimal.';
        if (criticalDefects.length > 0) {
          primaryRiskDriver = `Critical: ${criticalDefects[0].description || 'Rail head spalling & gauge deviation'}`;
        } else if (speedRestrictionCount > 0) {
          primaryRiskDriver = 'Monsoon Caution Order: WSR active (+15m headway buffer)';
        } else if (highDefects.length > 0) {
          primaryRiskDriver = `High Priority: ${highDefects[0].description || 'Ballast void & sleeper cracking'}`;
        } else if (failureRiskScore >= 80) {
          primaryRiskDriver = 'Track Degradation Index (TDI) breach: High-frequency axle load strain';
        }

        segments.push({
          segmentId: `SEG-${corr.corridorId}-${fromSt.code}-${toSt.code}`,
          corridorId: corr.corridorId,
          corridorCode: corr.corridorCode,
          corridorName: corr.corridorName,
          fromStation: fromSt,
          toStation: toSt,
          startKm,
          endKm,
          lengthKm,
          x1: pt1.x,
          y1: pt1.y,
          x2: pt2.x,
          y2: pt2.y,
          midX: (pt1.x + pt2.x) / 2,
          midY: (pt1.y + pt2.y) / 2,
          defectsCount: segmentDefects.length,
          criticalDefects,
          highDefects,
          mediumDefects,
          lowDefects,
          speedRestrictionCount,
          primaryRiskDriver,
          blocksCount: segmentBlocks.length,
          scheduledBlocks: segmentBlocks,
          maintenanceMinutes: totalMins,
          maintenanceHours,
          departmentHours,
          failureRiskScore,
          healthScore,
          maintenanceLoadScore,
          riskTier,
        });
      }
    });

    return segments;
  }, [corridors, blocks, defects, canvasWidth, canvasHeight, zoom, pan, selectedCorridorId]);

  const networkSummary = useMemo<NetworkHealthSummary>(() => {
    const totalSegments = trackSegments.length;
    const criticalSegments = trackSegments.filter((s) => s.riskTier === 'CRITICAL');
    const highSegments = trackSegments.filter((s) => s.riskTier === 'HIGH');
    const totalMaintHours = +trackSegments
      .reduce((acc, s) => acc + s.maintenanceHours, 0)
      .toFixed(1);
    const avgFailureRisk =
      totalSegments > 0
        ? Math.round(
            trackSegments.reduce((acc, s) => acc + s.failureRiskScore, 0) / totalSegments
          )
        : 25;

    return {
      totalSegments,
      criticalCount: criticalSegments.length,
      highCount: highSegments.length,
      totalMaintHours,
      avgFailureRisk,
    };
  }, [trackSegments]);

  return {
    trackSegments,
    networkSummary,
    riskColorScale,
    loadColorScale,
    strokeWidthScale,
  };
}

/**
 * SVG Elements Layer: renders segment heat ribbons, hazard beacons, and hover tags directly inside the Map <svg>.
 */
export interface InfrastructureHealthSvgLayerProps {
  trackSegments: TrackSegmentHealthData[];
  riskColorScale: d3.ScaleLinear<string, string>;
  loadColorScale: d3.ScaleLinear<string, string>;
  strokeWidthScale: d3.ScaleLinear<number, number>;
  zoom: number;
  displayMode: HealthOverlayDisplayMode;
  onlyCriticalHotspots: boolean;
  hoveredSegment: TrackSegmentHealthData | null;
  selectedSegment: TrackSegmentHealthData | null;
  onHoverSegment: (segment: TrackSegmentHealthData | null) => void;
  onSelectSegment: (segment: TrackSegmentHealthData) => void;
}

export const InfrastructureHealthSvgLayer: React.FC<InfrastructureHealthSvgLayerProps> = ({
  trackSegments,
  riskColorScale,
  loadColorScale,
  strokeWidthScale,
  zoom,
  displayMode,
  onlyCriticalHotspots,
  hoveredSegment,
  selectedSegment,
  onHoverSegment,
  onSelectSegment,
}) => {
  return (
    <g id="d3-infrastructure-health-overlay-layer">
      {/* Defs: Radial gradients for pulsing hazard beacons */}
      <defs>
        <radialGradient id="hazard-beacon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#f43f5e" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
        <filter id="health-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {trackSegments.map((segment) => {
        if (onlyCriticalHotspots && segment.riskTier !== 'CRITICAL' && segment.riskTier !== 'HIGH') {
          return null;
        }

        const isSelected = selectedSegment?.segmentId === segment.segmentId;
        const isHovered = hoveredSegment?.segmentId === segment.segmentId;

        let strokeColor = riskColorScale(segment.failureRiskScore);
        if (displayMode === 'MAINTENANCE_LOAD') {
          strokeColor = loadColorScale(segment.maintenanceHours);
        } else if (displayMode === 'FAILURE_RISK') {
          strokeColor = riskColorScale(segment.failureRiskScore);
        }

        const baseWidth = strokeWidthScale(segment.maintenanceHours) * zoom;
        const displayWidth = isSelected || isHovered ? baseWidth * 1.3 : baseWidth;
        const isCritical = segment.riskTier === 'CRITICAL';

        return (
          <g
            key={`health-segment-${segment.segmentId}`}
            className="cursor-pointer transition-all"
            onMouseEnter={() => onHoverSegment(segment)}
            onMouseLeave={() => onHoverSegment(null)}
            onClick={(e) => {
              e.stopPropagation();
              railwayAudio.playBeep(850, 0.04);
              onSelectSegment(segment);
            }}
          >
            {/* Outer Glowing Halo / Heat aura */}
            <line
              x1={segment.x1}
              y1={segment.y1}
              x2={segment.x2}
              y2={segment.y2}
              stroke={strokeColor}
              strokeWidth={displayWidth * 2.2}
              strokeLinecap="round"
              opacity={isCritical ? 0.38 : isHovered ? 0.45 : 0.22}
              filter="url(#health-glow-filter)"
            />

            {/* Core Heat Ribbon */}
            <line
              x1={segment.x1}
              y1={segment.y1}
              x2={segment.x2}
              y2={segment.y2}
              stroke={strokeColor}
              strokeWidth={displayWidth}
              strokeLinecap="round"
              opacity={0.88}
            />

            {/* Animated Dash for Segments with Active Maintenance Load */}
            {segment.maintenanceHours > 0 && (
              <line
                x1={segment.x1}
                y1={segment.y1}
                x2={segment.x2}
                y2={segment.y2}
                stroke="#ffffff"
                strokeWidth={2 * zoom}
                strokeDasharray={`${6 * zoom},${10 * zoom}`}
                strokeLinecap="round"
                opacity={0.7}
                className="animate-pulse"
              />
            )}

            {/* Invisible Wide Hitbox for Effortless Clicking */}
            <line
              x1={segment.x1}
              y1={segment.y1}
              x2={segment.x2}
              y2={segment.y2}
              stroke="transparent"
              strokeWidth={22 * zoom}
              strokeLinecap="round"
            />

            {/* Pulsing Hazard Beacon at High-Risk Failure Hotspots */}
            {isCritical && (
              <g transform={`translate(${segment.midX}, ${segment.midY})`}>
                <circle
                  r={14 * zoom}
                  fill="url(#hazard-beacon-glow)"
                  className="animate-ping"
                  style={{ animationDuration: '2s' }}
                />
                <circle
                  r={6 * zoom}
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth={1.5 * zoom}
                  className="shadow-lg"
                />
                <text
                  y={2 * zoom}
                  textAnchor="middle"
                  fontSize={6 * zoom}
                  fontWeight="bold"
                  fill="#ffffff"
                  fontFamily="monospace"
                >
                  !
                </text>
              </g>
            )}

            {/* Segment Label (visible on hover, selection, or high zoom) */}
            {(isHovered || isSelected || zoom >= 1.3) && (
              <g transform={`translate(${segment.midX}, ${segment.midY - 10 * zoom})`}>
                <rect
                  x={-45 * zoom}
                  y={-9 * zoom}
                  width={90 * zoom}
                  height={16 * zoom}
                  rx={3 * zoom}
                  fill="#020617"
                  stroke={strokeColor}
                  strokeWidth={1.2 * zoom}
                  opacity={0.92}
                />
                <text
                  textAnchor="middle"
                  y={2 * zoom}
                  fill="#ffffff"
                  fontSize={7.5 * zoom}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {segment.fromStation.code}↔{segment.toStation.code} ({segment.failureRiskScore}%)
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};

/**
 * HTML HUD Controls & Selected Track Segment Drawer (rendered over the map container)
 */
export interface InfrastructureHealthHudProps {
  networkSummary: NetworkHealthSummary;
  displayMode: HealthOverlayDisplayMode;
  setDisplayMode: (mode: HealthOverlayDisplayMode) => void;
  onlyCriticalHotspots: boolean;
  setOnlyCriticalHotspots: (val: boolean) => void;
  selectedSegment: TrackSegmentHealthData | null;
  setSelectedSegment: (segment: TrackSegmentHealthData | null) => void;
  onNavigate?: (screen: string, itemData?: any) => void;
  onClose?: () => void;
}

export const InfrastructureHealthHud: React.FC<InfrastructureHealthHudProps> = ({
  networkSummary,
  displayMode,
  setDisplayMode,
  onlyCriticalHotspots,
  setOnlyCriticalHotspots,
  selectedSegment,
  setSelectedSegment,
  onNavigate,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  return (
    <>
      {/* Floating HUD Controller */}
      <div
        id="d3-infrastructure-health-hud"
        className="absolute top-3 left-3 z-30 max-w-sm w-full bg-[#0b1329]/95 backdrop-blur-md border border-sky-800/80 rounded-xl p-3.5 shadow-2xl text-xs font-mono text-slate-200 select-none animate-in fade-in"
      >
        {/* HUD Header */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-950/80 text-rose-400 border border-rose-700/80 shadow-[0_0_8px_rgba(244,63,94,0.3)]">
              <Activity className="w-4 h-4 text-rose-400 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-slate-100 uppercase tracking-wide text-[11px] block">
                Infrastructure Health Overlay
              </span>
              <span className="text-[10px] text-sky-400">
                d3.js Predictive Failure &amp; Load Heatmap
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold">
              LIVE GIS
            </span>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              title={isMinimized ? 'Expand HUD' : 'Minimize HUD'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Hide Overlay"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Real-time Summary Counters */}
            <div className="grid grid-cols-3 gap-1.5 py-2 text-center text-[10px]">
              <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                <div className="text-slate-400">Segments</div>
                <div className="font-bold text-sky-300 text-xs">{networkSummary.totalSegments}</div>
              </div>
              <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                <div className="text-slate-400">Critical Failure</div>
                <div className="font-bold text-rose-400 text-xs">
                  {networkSummary.criticalCount} Hotspots
                </div>
              </div>
              <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                <div className="text-slate-400">Maint Load</div>
                <div className="font-bold text-amber-300 text-xs">
                  {networkSummary.totalMaintHours}h Total
                </div>
              </div>
            </div>

            {/* Display Mode Switcher */}
            <div className="pt-1 pb-2">
              <div className="text-[10px] text-slate-400 uppercase mb-1 font-bold">Visualization Metric:</div>
              <div className="grid grid-cols-3 gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    railwayAudio.playBeep(700, 0.02);
                    setDisplayMode('COMBINED');
                  }}
                  className={`py-1 rounded text-center font-bold transition-colors cursor-pointer ${
                    displayMode === 'COMBINED'
                      ? 'bg-sky-600 text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Combined
                </button>
                <button
                  type="button"
                  onClick={() => {
                    railwayAudio.playBeep(750, 0.02);
                    setDisplayMode('FAILURE_RISK');
                  }}
                  className={`py-1 rounded text-center font-bold transition-colors cursor-pointer ${
                    displayMode === 'FAILURE_RISK'
                      ? 'bg-rose-600 text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Failure Risk
                </button>
                <button
                  type="button"
                  onClick={() => {
                    railwayAudio.playBeep(800, 0.02);
                    setDisplayMode('MAINTENANCE_LOAD');
                  }}
                  className={`py-1 rounded text-center font-bold transition-colors cursor-pointer ${
                    displayMode === 'MAINTENANCE_LOAD'
                      ? 'bg-amber-600 text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Maint Load
                </button>
              </div>
            </div>

            {/* d3 Spectrum Legend Gradient */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Pristine (0%)</span>
                <span>Watchlist (50%)</span>
                <span className="text-rose-400 font-bold">Critical Failure (100%)</span>
              </div>

              {/* Continuous Gradient Bar */}
              <div className="h-2 rounded-full w-full bg-gradient-to-r from-emerald-500 via-yellow-400 via-orange-500 to-rose-600 shadow-inner" />

              {/* Maintenance Load Line Thickness Indicator */}
              <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-sky-400 rounded"></span> Light Load (0–1h)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-4 h-1.5 bg-amber-400 rounded"></span> Heavy Load (&gt;6h)
                </span>
              </div>
            </div>

            {/* Filter Checkbox: Critical Only */}
            <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-[10.5px] text-slate-300">
                <input
                  type="checkbox"
                  checked={onlyCriticalHotspots}
                  onChange={(e) => {
                    railwayAudio.playBeep(e.target.checked ? 850 : 650, 0.03);
                    setOnlyCriticalHotspots(e.target.checked);
                  }}
                  className="rounded border-slate-700 text-rose-500 focus:ring-rose-500 cursor-pointer"
                />
                <span>Highlight Hotspots Only (&gt;60% Risk)</span>
              </label>

              <span className="text-[10px] text-slate-500">Click segment to inspect</span>
            </div>
          </>
        )}
      </div>

      {/* Selected Track Segment Inspection Drawer */}
      {selectedSegment && (
        <div
          id="segment-health-inspector-card"
          className="absolute bottom-3 left-3 z-30 max-w-md w-full bg-[#0c1630]/95 backdrop-blur-md border-2 border-sky-600/90 rounded-xl p-4 shadow-2xl text-xs font-mono text-slate-200 animate-in slide-in-from-bottom-3"
        >
          {/* Inspector Header */}
          <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">
                  {selectedSegment.fromStation.name} ➔ {selectedSegment.toStation.name}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700 text-[10px] font-bold">
                  {selectedSegment.corridorCode}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Chainage: KM {selectedSegment.startKm.toFixed(1)} to KM {selectedSegment.endKm.toFixed(1)} ({selectedSegment.lengthKm} km)
              </p>
            </div>

            <button
              onClick={() => setSelectedSegment(null)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Health Gauge & Failure Probability */}
          <div className="grid grid-cols-2 gap-2 my-3">
            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                selectedSegment.riskTier === 'CRITICAL'
                  ? 'bg-rose-950/40 border-rose-600/80 text-rose-300'
                  : selectedSegment.riskTier === 'HIGH'
                  ? 'bg-amber-950/40 border-amber-600/80 text-amber-300'
                  : 'bg-emerald-950/40 border-emerald-600/80 text-emerald-300'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Failure Risk Score
              </span>
              <div className="text-xl font-black mt-1">
                {selectedSegment.failureRiskScore}%
              </div>
              <span className="text-[10px] font-bold uppercase mt-1">
                {selectedSegment.riskTier === 'CRITICAL' ? 'CRITICAL FAILURE IMMINENT' : `${selectedSegment.riskTier} RISK`}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Maintenance Load
              </span>
              <div className="text-xl font-black text-sky-300 mt-1">
                {selectedSegment.maintenanceHours} hrs
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                {selectedSegment.blocksCount} Scheduled Block(s)
              </span>
            </div>
          </div>

          {/* Defect Log Breakdown */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-300 font-bold">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Defect Logs ({selectedSegment.defectsCount} Active)</span>
              </span>
              {selectedSegment.speedRestrictionCount > 0 && (
                <span className="text-rose-400 text-[10px] font-bold">
                  {selectedSegment.speedRestrictionCount} Speed Restriction
                </span>
              )}
            </div>

            <p className="text-[10px] text-slate-400">
              <strong>Primary Stress Driver:</strong> {selectedSegment.primaryRiskDriver}
            </p>

            <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400 border-t border-slate-800/80">
              <span>Eng: <strong>{selectedSegment.departmentHours.ENGINEERING}h</strong></span>
              <span>•</span>
              <span>TRD: <strong>{selectedSegment.departmentHours.TRACTION}h</strong></span>
              <span>•</span>
              <span>S&amp;T: <strong>{selectedSegment.departmentHours['S&T']}h</strong></span>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                if (onNavigate) {
                  onNavigate('defect_reporting', {
                    corridorId: selectedSegment.corridorId,
                    station: selectedSegment.fromStation.code,
                  });
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View Defect Logs</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <button
              onClick={() => {
                if (onNavigate) {
                  onNavigate('submit_request', {
                    corridorId: selectedSegment.corridorId,
                    section: `${selectedSegment.fromStation.code} - ${selectedSegment.toStation.code}`,
                  });
                }
              }}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-md"
            >
              <Sparkles className="w-3 h-3 text-emerald-200" />
              <span>Schedule Urgent Block</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Integrated InfrastructureHealthOverlay component for unified use cases.
 */
export interface InfrastructureHealthOverlayProps {
  corridors: Corridor[];
  blocks: OptimizedBlock[];
  defects: Defect[];
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  pan: { x: number; y: number };
  selectedCorridorId?: string;
  onNavigate?: (screen: string, itemData?: any) => void;
  onSelectSegment?: (segment: TrackSegmentHealthData) => void;
  renderMode?: 'SVG' | 'HUD' | 'ALL';
  onClose?: () => void;
}

export const InfrastructureHealthOverlay: React.FC<InfrastructureHealthOverlayProps> = ({
  corridors,
  blocks,
  defects,
  canvasWidth,
  canvasHeight,
  zoom,
  pan,
  selectedCorridorId = 'ALL',
  onNavigate,
  onSelectSegment,
  renderMode = 'ALL',
  onClose,
}) => {
  const [displayMode, setDisplayMode] = useState<HealthOverlayDisplayMode>('COMBINED');
  const [hoveredSegment, setHoveredSegment] = useState<TrackSegmentHealthData | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<TrackSegmentHealthData | null>(null);
  const [onlyCriticalHotspots, setOnlyCriticalHotspots] = useState<boolean>(false);

  const { trackSegments, networkSummary, riskColorScale, loadColorScale, strokeWidthScale } =
    useInfrastructureHealth({
      corridors,
      blocks,
      defects,
      canvasWidth,
      canvasHeight,
      zoom,
      pan,
      selectedCorridorId,
    });

  const handleSelect = (segment: TrackSegmentHealthData) => {
    setSelectedSegment(segment);
    if (onSelectSegment) {
      onSelectSegment(segment);
    }
  };

  if (renderMode === 'SVG') {
    return (
      <InfrastructureHealthSvgLayer
        trackSegments={trackSegments}
        riskColorScale={riskColorScale}
        loadColorScale={loadColorScale}
        strokeWidthScale={strokeWidthScale}
        zoom={zoom}
        displayMode={displayMode}
        onlyCriticalHotspots={onlyCriticalHotspots}
        hoveredSegment={hoveredSegment}
        selectedSegment={selectedSegment}
        onHoverSegment={setHoveredSegment}
        onSelectSegment={handleSelect}
      />
    );
  }

  if (renderMode === 'HUD') {
    return (
      <InfrastructureHealthHud
        networkSummary={networkSummary}
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        onlyCriticalHotspots={onlyCriticalHotspots}
        setOnlyCriticalHotspots={setOnlyCriticalHotspots}
        selectedSegment={selectedSegment}
        setSelectedSegment={setSelectedSegment}
        onNavigate={onNavigate}
        onClose={onClose}
      />
    );
  }

  return (
    <>
      <InfrastructureHealthSvgLayer
        trackSegments={trackSegments}
        riskColorScale={riskColorScale}
        loadColorScale={loadColorScale}
        strokeWidthScale={strokeWidthScale}
        zoom={zoom}
        displayMode={displayMode}
        onlyCriticalHotspots={onlyCriticalHotspots}
        hoveredSegment={hoveredSegment}
        selectedSegment={selectedSegment}
        onHoverSegment={setHoveredSegment}
        onSelectSegment={handleSelect}
      />
      <InfrastructureHealthHud
        networkSummary={networkSummary}
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        onlyCriticalHotspots={onlyCriticalHotspots}
        setOnlyCriticalHotspots={setOnlyCriticalHotspots}
        selectedSegment={selectedSegment}
        setSelectedSegment={setSelectedSegment}
        onNavigate={onNavigate}
        onClose={onClose}
      />
    </>
  );
};
