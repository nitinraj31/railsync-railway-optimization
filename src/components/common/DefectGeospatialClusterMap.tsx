import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Layers,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Crosshair,
  ShieldAlert,
  Info,
  Radio,
  Wrench,
  Zap,
  ExternalLink,
  Eye,
  Sliders,
  Compass,
  FileText,
  Clock,
  Sparkles,
  Search,
  X,
  ChevronRight,
  ShieldCheck,
  AlertOctagon,
} from 'lucide-react';
import { Defect, DepartmentType, PriorityLevel } from '../../types';
import {
  RAILWAY_NETWORK_BOUNDS,
  RAILWAY_CORRIDOR_SEGMENTS,
  projectGeoToCanvas,
  projectCanvasToGeo,
  clusterDefectsGeographically,
  computeCriticalHeatmapZones,
  DefectGeographicCluster,
  HighRiskMaintenanceZone,
  findNearestStation,
} from '../../services/defectGeospatialService';
import { railwayAudio } from '../../services/railwayAudio';

// Dynamic cluster recalculation animation models
interface DispersionRay {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isCrit: boolean;
}

interface RecalculationShockwave {
  id: string;
  x: number;
  y: number;
  maxRadius: number;
  hasCritical: boolean;
}

interface RecalculationHUD {
  message: string;
  submessage: string;
  type: 'SPLIT' | 'MERGE' | 'UPDATE';
}

interface DefectGeospatialClusterMapProps {
  defects: Defect[];
  onSelectDefect?: (defectId: string) => void;
  onOpenDefectLocationModal?: (defect: Defect) => void;
  onOpenDefectPhotoModal?: (defect: Defect) => void;
  onFilterRegistryByCluster?: (defectIds: string[]) => void;
}

export const DefectGeospatialClusterMap: React.FC<DefectGeospatialClusterMapProps> = ({
  defects,
  onSelectDefect,
  onOpenDefectLocationModal,
  onOpenDefectPhotoModal,
  onFilterRegistryByCluster,
}) => {
  // SVG Canvas dimensions
  const SVG_WIDTH = 900;
  const SVG_HEIGHT = 620;

  // Viewport navigation state (Pan & Zoom)
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Map Layer Controls
  const [enableClustering, setEnableClustering] = useState<boolean>(true);
  const [enableHeatmap, setEnableHeatmap] = useState<boolean>(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.85);
  const [heatmapRadius, setHeatmapRadius] = useState<number>(55);
  const [showZoneCallouts, setShowZoneCallouts] = useState<boolean>(true);
  const [showCorridorTracks, setShowCorridorTracks] = useState<boolean>(true);
  const [showStationLabels, setShowStationLabels] = useState<boolean>(true);

  // Recalculation and Spatial Awareness Animation State
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [recalculationHUD, setRecalculationHUD] = useState<RecalculationHUD | null>(null);
  const [dispersionRays, setDispersionRays] = useState<DispersionRay[]>([]);
  const [recalculationShockwaves, setRecalculationShockwaves] = useState<RecalculationShockwave[]>([]);

  // History tracking for calculating marker origin coordinates across zoom updates
  const prevZoomRef = useRef<number>(zoom);
  const prevDefectPosRef = useRef<
    Map<string, { screenX: number; screenY: number; clusterScreenX?: number; clusterScreenY?: number }>
  >(new Map());
  const recalcTimerRef = useRef<any>(null);
  const hudTimerRef = useRef<any>(null);

  // Filters
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterCorridor, setFilterCorridor] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected & Hovered Cluster / Defect
  const [hoveredCluster, setHoveredCluster] = useState<DefectGeographicCluster | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<DefectGeographicCluster | null>(null);
  const [selectedZone, setSelectedZone] = useState<HighRiskMaintenanceZone | null>(null);

  // Mouse cursor geodetic coordinates HUD
  const [cursorGeo, setCursorGeo] = useState<{ lat: number; lng: number } | null>(null);

  // Filter defects according to toolbar controls
  const filteredDefects = useMemo(() => {
    return defects.filter((d) => {
      if (filterDept !== 'ALL' && d.department !== filterDept) return false;
      if (filterSeverity === 'CRITICAL' && d.severity !== 'CRITICAL') return false;
      if (filterSeverity === 'HIGH_PLUS' && d.severity !== 'CRITICAL' && d.severity !== 'HIGH') return false;
      if (filterCorridor !== 'ALL' && d.corridorId !== filterCorridor) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchAsset = d.assetId.toLowerCase().includes(q);
        const matchId = d.defectId.toLowerCase().includes(q);
        const matchType = d.defectType.toLowerCase().includes(q);
        const matchChainage = d.geoCoordinates?.railwayChainageKm?.toLowerCase().includes(q);
        if (!matchAsset && !matchId && !matchType && !matchChainage) return false;
      }
      return true;
    });
  }, [defects, filterDept, filterSeverity, filterCorridor, searchQuery]);

  // Spatial clustering calculation
  const { clusters, singleDefects, allClusters, clusterRadiusKm } = useMemo(() => {
    return clusterDefectsGeographically(
      filteredDefects,
      SVG_WIDTH,
      SVG_HEIGHT,
      zoom,
      pan,
      enableClustering
    );
  }, [filteredDefects, zoom, pan, enableClustering]);

  // Geospatial critical density heatmap calculation
  const highRiskZones = useMemo(() => {
    return computeCriticalHeatmapZones(filteredDefects, SVG_WIDTH, SVG_HEIGHT, zoom, pan);
  }, [filteredDefects, zoom, pan]);

  // Critical defects list for heatmap glow calculation
  const criticalDefects = useMemo(() => {
    return filteredDefects.filter(
      (d) =>
        (d.severity === 'CRITICAL' || d.aiVisualAnalysis?.suggestedPriority === 'CRITICAL') &&
        d.geoCoordinates &&
        typeof d.geoCoordinates.latitude === 'number'
    );
  }, [filteredDefects]);

  // Record marker positions after each render cycle to serve as animation origins for next zoom
  useEffect(() => {
    const newMap = new Map<
      string,
      { screenX: number; screenY: number; clusterScreenX?: number; clusterScreenY?: number }
    >();
    for (const s of singleDefects) {
      if (s.defects[0]) {
        newMap.set(s.defects[0].defectId, {
          screenX: s.screenX,
          screenY: s.screenY,
        });
      }
    }
    for (const c of clusters) {
      for (const d of c.defects) {
        newMap.set(d.defectId, {
          screenX: c.screenX,
          screenY: c.screenY,
          clusterScreenX: c.screenX,
          clusterScreenY: c.screenY,
        });
      }
    }
    prevDefectPosRef.current = newMap;
    prevZoomRef.current = zoom;
  }, [clusters, singleDefects, zoom, pan]);

  // Trigger dynamic visual dispersion and consolidation animations
  const triggerRecalculationVisuals = useCallback(
    (oldZoom: number, nextZoom: number) => {
      const isZoomIn = nextZoom > oldZoom;
      const isZoomOut = nextZoom < oldZoom;

      if (Math.abs(nextZoom - oldZoom) < 0.04) return;

      setIsRecalculating(true);

      if (isZoomIn) {
        // Zoom in: defects separating out of clusters into individual pins
        const rays: DispersionRay[] = [];
        const prevMap = prevDefectPosRef.current;

        for (const s of singleDefects) {
          const d = s.defects[0];
          if (!d) continue;
          const prev = prevMap.get(d.defectId);
          if (prev && prev.clusterScreenX !== undefined && prev.clusterScreenY !== undefined) {
            const dist = Math.hypot(s.screenX - prev.clusterScreenX, s.screenY - prev.clusterScreenY);
            if (dist > 8) {
              rays.push({
                id: `ray-${d.defectId}-${Date.now()}`,
                fromX: prev.clusterScreenX,
                fromY: prev.clusterScreenY,
                toX: s.screenX,
                toY: s.screenY,
                isCrit: d.severity === 'CRITICAL',
              });
            }
          }
        }

        setRecalculationHUD({
          message: 'Dynamic Cluster Recalculation (Zoom In)',
          submessage: `Splitting into higher resolution flaw pins (${clusterRadiusKm.toFixed(1)} km aggregation threshold)`,
          type: 'SPLIT',
        });

        setDispersionRays(rays.slice(0, 24));

        // Spatial audio feedback
        railwayAudio.playBeep(640, 0.03);
        setTimeout(() => railwayAudio.playBeep(840, 0.04), 45);
      } else if (isZoomOut) {
        // Zoom out: defects consolidating into sector clusters
        const shockwaves: RecalculationShockwave[] = [];
        for (const c of clusters) {
          shockwaves.push({
            id: `wave-${c.id}-${Date.now()}`,
            x: c.screenX,
            y: c.screenY,
            maxRadius: Math.min(65, 20 + c.totalCount * 3.5),
            hasCritical: c.criticalCount > 0,
          });
        }

        setRecalculationHUD({
          message: 'Dynamic Cluster Consolidation (Zoom Out)',
          submessage: `Consolidating flaws into sector clusters (${clusterRadiusKm.toFixed(1)} km aggregation threshold)`,
          type: 'MERGE',
        });

        setRecalculationShockwaves(shockwaves);

        // Spatial audio feedback
        railwayAudio.playBeep(840, 0.03);
        setTimeout(() => railwayAudio.playBeep(640, 0.04), 45);
      }

      if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current);
      recalcTimerRef.current = setTimeout(() => {
        setDispersionRays([]);
        setRecalculationShockwaves([]);
        setIsRecalculating(false);
      }, 950);

      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
      hudTimerRef.current = setTimeout(() => {
        setRecalculationHUD(null);
      }, 2800);
    },
    [singleDefects, clusters, clusterRadiusKm]
  );

  // Reset zoom & pan to default
  const handleResetView = () => {
    triggerRecalculationVisuals(zoom, 1.0);
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setSelectedCluster(null);
    setSelectedZone(null);
    railwayAudio.playBeep(440, 0.04);
  };

  // Zoom to specific point
  const handleZoomIn = () => {
    const next = Math.min(3.5, Math.round((zoom + 0.35) * 100) / 100);
    triggerRecalculationVisuals(zoom, next);
    setZoom(next);
  };

  const handleZoomOut = () => {
    const next = Math.max(0.8, Math.round((zoom - 0.35) * 100) / 100);
    triggerRecalculationVisuals(zoom, next);
    setZoom(next);
  };

  // Preset zoom levels to easily observe cluster transition dynamics
  const handleSetZoomPreset = (targetZoom: number) => {
    if (Math.abs(targetZoom - zoom) > 0.05) {
      triggerRecalculationVisuals(zoom, targetZoom);
      setZoom(targetZoom);
    }
  };

  // Replay/pulse cluster recalculation
  const handleReplayRecalculation = () => {
    const testNext = zoom >= 2.0 ? Math.max(0.9, zoom - 0.5) : Math.min(3.2, zoom + 0.5);
    triggerRecalculationVisuals(zoom, testNext);
    setZoom(testNext);
  };

  // Focus and zoom into a specific cluster
  const handleFocusCluster = (cluster: DefectGeographicCluster) => {
    setSelectedCluster(cluster);
    setSelectedZone(null);
    const targetZoom = Math.max(2.2, zoom);
    if (targetZoom !== zoom) {
      triggerRecalculationVisuals(zoom, targetZoom);
    }
    // Center cluster on screen
    const { minLat, maxLat, minLng, maxLng } = RAILWAY_NETWORK_BOUNDS;
    const paddingX = 40;
    const paddingY = 40;
    const usableWidth = SVG_WIDTH - paddingX * 2;
    const usableHeight = SVG_HEIGHT - paddingY * 2;
    const normX = (cluster.centroid.longitude - minLng) / (maxLng - minLng);
    const normY = (maxLat - cluster.centroid.latitude) / (maxLat - minLat);
    const baseX = paddingX + normX * usableWidth;
    const baseY = paddingY + normY * usableHeight;

    const centerX = SVG_WIDTH / 2;
    const centerY = SVG_HEIGHT / 2;

    const newPanX = -(baseX - centerX) * targetZoom;
    const newPanY = -(baseY - centerY) * targetZoom;

    setZoom(targetZoom);
    setPan({ x: newPanX, y: newPanY });
    railwayAudio.playBeep(880, 0.06);
  };

  // Focus on a high-risk zone
  const handleFocusZone = (zone: HighRiskMaintenanceZone) => {
    setSelectedZone(zone);
    setSelectedCluster(null);
    const targetZoom = 2.4;
    const { minLat, maxLat, minLng, maxLng } = RAILWAY_NETWORK_BOUNDS;
    const paddingX = 40;
    const paddingY = 40;
    const usableWidth = SVG_WIDTH - paddingX * 2;
    const usableHeight = SVG_HEIGHT - paddingY * 2;
    const normX = (zone.centroid.longitude - minLng) / (maxLng - minLng);
    const normY = (maxLat - zone.centroid.latitude) / (maxLat - minLat);
    const baseX = paddingX + normX * usableWidth;
    const baseY = paddingY + normY * usableHeight;

    const centerX = SVG_WIDTH / 2;
    const centerY = SVG_HEIGHT / 2;

    const newPanX = -(baseX - centerX) * targetZoom;
    const newPanY = -(baseY - centerY) * targetZoom;

    setZoom(targetZoom);
    setPan({ x: newPanX, y: newPanY });
    railwayAudio.playBeep(920, 0.06);
  };

  // Mouse pan drag handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // only left click
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
    const svgY = ((e.clientY - rect.top) / rect.height) * SVG_HEIGHT;

    const geo = projectCanvasToGeo(svgX, svgY, SVG_WIDTH, SVG_HEIGHT, zoom, pan);
    setCursorGeo({ lat: geo.latitude, lng: geo.longitude });

    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom via wheel
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.18 : 0.84;
    const nextZoom = Math.min(3.5, Math.max(0.8, Math.round(zoom * zoomFactor * 100) / 100));
    if (Math.abs(nextZoom - zoom) > 0.04) {
      triggerRecalculationVisuals(zoom, nextZoom);
      setZoom(nextZoom);
    }
  };

  // Total summary counts
  const networkCriticalCount = useMemo(() => {
    return filteredDefects.filter((d) => d.severity === 'CRITICAL').length;
  }, [filteredDefects]);

  const networkNonCriticalCount = filteredDefects.length - networkCriticalCount;

  return (
    <div
      id="defect-geospatial-cluster-map-container"
      className="bg-[#080e1e] border border-sky-900/80 rounded-2xl p-4 sm:p-5 shadow-2xl font-mono text-slate-200 space-y-4"
    >
      {/* =========================================================================
          TOP HEADER: Map Title & Status Summary
         ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-rose-950/90 border border-rose-600 text-rose-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span>Geospatial Critical Defect Density Heatmap</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-sky-950/80 border border-sky-700 text-sky-300 text-[11px] flex items-center gap-1">
              <Layers className="w-3 h-3 text-sky-400" />
              <span>Auto-Clustered Network GIS View</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-mono">
              Delhi Division (NDLS / GZB / PNP / ROK / PWL)
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span>Railway Network Defect Cluster Radar &amp; High-Risk Maintenance Zones</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time GIS clustering of localized track flaws, contrasting CRITICAL vs. NON-CRITICAL defect distributions to pinpoint urgent track possession zones.
          </p>
        </div>

        {/* Global Critical vs Non-Critical Count Pill Badges */}
        <div className="flex items-center gap-2 shrink-0 bg-slate-950/90 p-2.5 rounded-xl border border-slate-800">
          <div className="text-center px-2">
            <span className="text-[9px] text-slate-400 uppercase font-bold block">Mapped Defects</span>
            <span className="text-base font-bold text-white font-mono">{filteredDefects.length}</span>
          </div>

          <div className="w-px h-7 bg-slate-800" />

          <div className="text-center px-2">
            <span className="text-[9px] text-rose-400 uppercase font-bold block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              <span>Critical</span>
            </span>
            <span className="text-base font-bold text-rose-400 font-mono">{networkCriticalCount}</span>
          </div>

          <div className="w-px h-7 bg-slate-800" />

          <div className="text-center px-2">
            <span className="text-[9px] text-amber-300 uppercase font-bold block">Non-Critical</span>
            <span className="text-base font-bold text-amber-300 font-mono">{networkNonCriticalCount}</span>
          </div>

          <div className="w-px h-7 bg-slate-800" />

          <div className="text-center px-2">
            <span className="text-[9px] text-sky-400 uppercase font-bold block">Clusters</span>
            <span className="text-base font-bold text-sky-300 font-mono">{clusters.length}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAP CONTROLS TOOLBAR: Heatmap, Clustering, Filters & Search
         ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-[#0a1224] p-3 rounded-xl border border-slate-800">
        {/* Layer Toggles */}
        <div className="md:col-span-5 flex flex-wrap items-center gap-2">
          {/* Heatmap Layer Toggle */}
          <button
            type="button"
            id="btn-toggle-critical-heatmap"
            onClick={() => {
              setEnableHeatmap(!enableHeatmap);
              railwayAudio.playBeep(!enableHeatmap ? 880 : 440, 0.04);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer ${
              enableHeatmap
                ? 'bg-rose-950 text-rose-200 border-rose-500 shadow-md shadow-rose-950/50 ring-1 ring-rose-500/50'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-700'
            }`}
            title="Toggle CRITICAL Defect Density Heatmap Layer"
          >
            <Flame className={`w-3.5 h-3.5 ${enableHeatmap ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
            <span>Heatmap Layer: {enableHeatmap ? 'ACTIVE' : 'OFF'}</span>
          </button>

          {/* Auto-Clustering Toggle */}
          <button
            type="button"
            id="btn-toggle-marker-clustering"
            onClick={() => {
              setEnableClustering(!enableClustering);
              railwayAudio.playBeep(660, 0.04);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer ${
              enableClustering
                ? 'bg-sky-950 text-sky-200 border-sky-500 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-700'
            }`}
            title="Toggle Geographic Defect Marker Clustering"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Auto-Clustering: {enableClustering ? 'ON' : 'OFF'}</span>
          </button>

          {/* High-Risk Zone Callouts Toggle */}
          <button
            type="button"
            id="btn-toggle-zone-callouts"
            onClick={() => {
              setShowZoneCallouts(!showZoneCallouts);
              railwayAudio.playBeep(700, 0.03);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all border cursor-pointer ${
              showZoneCallouts
                ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title="Toggle High-Risk Maintenance Zone Callouts"
          >
            <span>Danger Zones</span>
          </button>

          {/* Dynamic Recalculation Pulse Test Button */}
          <button
            type="button"
            id="btn-trigger-recalculation-pulse"
            onClick={handleReplayRecalculation}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border border-sky-600/60 bg-sky-950/40 hover:bg-sky-900/60 text-sky-200 cursor-pointer shadow-sm"
            title="Re-trigger Dynamic Cluster Recalculation Transition Pulse"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>Recalculate Pulse</span>
          </button>
        </div>

        {/* Filters: Department & Severity */}
        <div className="md:col-span-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Dept:</span>
            <select
              id="select-map-dept-filter"
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                railwayAudio.playBeep(600, 0.03);
              }}
              className="bg-transparent text-xs text-sky-300 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">All Depts</option>
              <option value="ENGINEERING" className="bg-slate-900 text-slate-200">P-Way Engineering</option>
              <option value="S&T" className="bg-slate-900 text-slate-200">S&amp;T Signaling</option>
              <option value="TRACTION" className="bg-slate-900 text-slate-200">Traction (25kV OHE)</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Severity:</span>
            <select
              id="select-map-severity-filter"
              value={filterSeverity}
              onChange={(e) => {
                setFilterSeverity(e.target.value);
                railwayAudio.playBeep(600, 0.03);
              }}
              className="bg-transparent text-xs text-rose-300 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">All Severities</option>
              <option value="CRITICAL" className="bg-slate-900 text-rose-400">CRITICAL Only</option>
              <option value="HIGH_PLUS" className="bg-slate-900 text-amber-300">High + Critical</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="md:col-span-3 flex items-center gap-2">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-map-search"
              placeholder="Search Asset, KM, Flaw..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-7 py-1 text-xs text-slate-200 focus:border-sky-500 focus:outline-none font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          HEATMAP SLIDER CONTROLS (EXPANDED WHEN HEATMAP IS ACTIVE)
         ========================================================================= */}
      {enableHeatmap && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 bg-gradient-to-r from-rose-950/40 via-slate-950 to-slate-900 rounded-xl border border-rose-900/60 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-rose-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-rose-400" />
              <span>Heatmap Density Rendering Parameters:</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono">Heat Radius:</span>
              <input
                type="range"
                min="30"
                max="90"
                step="5"
                value={heatmapRadius}
                onChange={(e) => setHeatmapRadius(parseInt(e.target.value, 10))}
                className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <span className="text-slate-300 font-mono w-8">{heatmapRadius}px</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono">Intensity Opacity:</span>
              <input
                type="range"
                min="0.3"
                max="1.0"
                step="0.05"
                value={heatmapOpacity}
                onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <span className="text-slate-300 font-mono w-9">{Math.round(heatmapOpacity * 100)}%</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <span>{criticalDefects.length} Critical Radiation Sources Active</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN MAP CANVAS & SIDEBAR CONTAINER
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* The SVG GIS Railway Map Viewport (8 cols on lg) */}
        <div className="lg:col-span-8 bg-[#040814] rounded-xl border border-slate-800 relative overflow-hidden flex flex-col shadow-inner">
          {/* Spatial Recalculation Notification HUD */}
          <AnimatePresence>
            {recalculationHUD && (
              <motion.div
                initial={{ opacity: 0, y: -16, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="absolute top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
              >
                <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-950/95 border border-sky-500/80 shadow-2xl shadow-sky-950/80 text-xs font-mono backdrop-blur-md">
                  <div className="relative flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping absolute" />
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-bold tracking-wide flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-sky-400" />
                      <span>{recalculationHUD.message}</span>
                    </span>
                    <span className="text-[10px] text-sky-300">
                      {recalculationHUD.submessage}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 pl-2 border-l border-slate-800 text-[10px] text-slate-400">
                    <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 font-bold border border-sky-800">
                      {zoom.toFixed(1)}x
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 font-bold border border-slate-800">
                      ~{clusterRadiusKm.toFixed(1)} km
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Zoom and Reset Action Overlay with Quick Tier Presets */}
          <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5 bg-slate-950/90 p-1.5 rounded-xl border border-slate-700 shadow-xl backdrop-blur-md">
            <button
              type="button"
              id="btn-map-zoom-in"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="Zoom In (Cluster Dispersion to Flaw Pins)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="btn-map-zoom-out"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="Zoom Out (Consolidate into Corridor Clusters)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="btn-map-reset-view"
              onClick={handleResetView}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="Reset View to Division Overview"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Quick Zoom Tier Presets */}
            <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-800 text-center">
              {[
                { label: '1.0x', title: 'Network Overview (6.5 km radius)', target: 1.0 },
                { label: '1.8x', title: 'Corridor Level (3.6 km radius)', target: 1.8 },
                { label: '2.6x', title: 'Station Yard (2.5 km radius)', target: 2.6 },
                { label: '3.4x', title: 'Flaw Isolation (1.2 km radius)', target: 3.4 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  id={`btn-map-zoom-preset-${preset.label.replace('.', '_')}`}
                  onClick={() => handleSetZoomPreset(preset.target)}
                  className={`px-1 py-0.5 rounded text-[8.5px] font-mono font-bold transition-all cursor-pointer ${
                    Math.abs(zoom - preset.target) < 0.2
                      ? 'bg-sky-600 text-white shadow-sm ring-1 ring-sky-400'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title={preset.title}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Corridors Legend & Track Overlay */}
          <div className="absolute top-3 left-3 z-30 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-[10.5px] font-mono shadow-xl backdrop-blur-md max-w-xs space-y-1.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1 font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                <span>IR Delhi Corridors</span>
              </span>
              <span className="text-[9px] text-slate-500">Zoom: {zoom.toFixed(1)}x</span>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              {RAILWAY_CORRIDOR_SEGMENTS.map((seg) => (
                <button
                  key={seg.corridorId}
                  type="button"
                  onClick={() => {
                    setFilterCorridor(filterCorridor === seg.corridorId ? 'ALL' : seg.corridorId);
                    railwayAudio.playBeep(700, 0.03);
                  }}
                  className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] text-left transition-colors cursor-pointer ${
                    filterCorridor === seg.corridorId
                      ? 'bg-slate-800 text-white font-bold ring-1 ring-sky-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="truncate">{seg.corridorCode}</span>
                </button>
              ))}
            </div>

            {/* Heatmap Legend */}
            {enableHeatmap && (
              <div className="pt-1 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1">
                  <span>Critical Density:</span>
                  <span className="text-rose-400 font-bold">Extreme Zone</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-600" />
              </div>
            )}
          </div>

          {/* The Interactive SVG Canvas */}
          <div className="relative w-full h-[520px] select-none cursor-grab active:cursor-grabbing">
            <svg
              id="svg-railway-geospatial-cluster-map"
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="w-full h-full"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                handleMouseUp();
                setCursorGeo(null);
              }}
              onWheel={handleWheel}
            >
              {/* GIS Definitions: Gradients, Filters & Heatmap Glow */}
              <defs>
                {/* Radial Gaussian gradient for CRITICAL defect density heat */}
                <radialGradient id="criticalHeatRadialGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
                  <stop offset="35%" stopColor="#f43f5e" stopOpacity="0.55" />
                  <stop offset="70%" stopColor="#f97316" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.0" />
                </radialGradient>

                {/* Extreme risk zone contour gradient */}
                <radialGradient id="extremeZoneGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#b91c1c" stopOpacity="0.7" />
                  <stop offset="60%" stopColor="#ef4444" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                </radialGradient>

                {/* Subtle track bed filter glow */}
                <filter id="trackGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background GIS Grid Lines */}
              <g opacity="0.18">
                {Array.from({ length: 18 }).map((_, i) => (
                  <line
                    key={`grid-x-${i}`}
                    x1={i * 50}
                    y1="0"
                    x2={i * 50}
                    y2={SVG_HEIGHT}
                    stroke="#38bdf8"
                    strokeWidth="0.5"
                    strokeDasharray="2,4"
                  />
                ))}
                {Array.from({ length: 13 }).map((_, i) => (
                  <line
                    key={`grid-y-${i}`}
                    x1="0"
                    y1={i * 50}
                    x2={SVG_WIDTH}
                    y2={i * 50}
                    stroke="#38bdf8"
                    strokeWidth="0.5"
                    strokeDasharray="2,4"
                  />
                ))}
              </g>

              {/* ===============================================================
                  LAYER 1: Railway Network Corridors & Track Schematic Lines
                 =============================================================== */}
              {showCorridorTracks &&
                RAILWAY_CORRIDOR_SEGMENTS.map((seg) => {
                  const points = seg.stations.map((st) => {
                    const pos = projectGeoToCanvas(
                      st.latitude,
                      st.longitude,
                      SVG_WIDTH,
                      SVG_HEIGHT,
                      zoom,
                      pan
                    );
                    return `${pos.x},${pos.y}`;
                  });
                  const pathStr = `M ${points.join(' L ')}`;

                  return (
                    <g key={`track-seg-${seg.corridorId}`}>
                      {/* Outer ballast bed */}
                      <path
                        d={pathStr}
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth={14 * Math.sqrt(zoom)}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.8"
                      />
                      {/* Double track parallel rail paths */}
                      <path
                        d={pathStr}
                        fill="none"
                        stroke="#334155"
                        strokeWidth={5 * Math.sqrt(zoom)}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.9"
                      />
                      {/* Corridor Centerline Colored Ribbon */}
                      <path
                        d={pathStr}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={2.2 * Math.sqrt(zoom)}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.85"
                      />

                      {/* Station Nodes along Corridor */}
                      {seg.stations.map((st) => {
                        const stPos = projectGeoToCanvas(
                          st.latitude,
                          st.longitude,
                          SVG_WIDTH,
                          SVG_HEIGHT,
                          zoom,
                          pan
                        );
                        return (
                          <g key={`station-${st.code}`}>
                            <circle
                              cx={stPos.x}
                              cy={stPos.y}
                              r={st.isJunction ? 5.5 : 3.5}
                              fill="#090f1d"
                              stroke={seg.color}
                              strokeWidth={st.isJunction ? 2.5 : 1.5}
                            />
                            {showStationLabels && (
                              <text
                                x={stPos.x + 8}
                                y={stPos.y + 3}
                                fill="#94a3b8"
                                fontSize="9"
                                fontFamily="monospace"
                                fontWeight={st.isJunction ? 'bold' : 'normal'}
                                className="pointer-events-none"
                              >
                                {st.name} {st.isJunction ? '★' : ''}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

              {/* ===============================================================
                  LAYER 2: GEOSPATIAL HEATMAP LAYER (CRITICAL DEFECT DENSITY)
                 =============================================================== */}
              {enableHeatmap && (
                <g id="geospatial-critical-heatmap-layer" opacity={heatmapOpacity}>
                  {/* Radial Heat Circles for every CRITICAL defect */}
                  {criticalDefects.map((critDefect, idx) => {
                    const pos = projectGeoToCanvas(
                      critDefect.geoCoordinates!.latitude,
                      critDefect.geoCoordinates!.longitude,
                      SVG_WIDTH,
                      SVG_HEIGHT,
                      zoom,
                      pan
                    );
                    const dynamicRadius = heatmapRadius * Math.sqrt(zoom);

                    return (
                      <g key={`heat-source-${critDefect.defectId}-${idx}`}>
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={dynamicRadius}
                          fill="url(#criticalHeatRadialGradient)"
                          className="pointer-events-none"
                        />
                        {/* Inner high-intensity core glow */}
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={dynamicRadius * 0.35}
                          fill="#ef4444"
                          opacity="0.4"
                          className="pointer-events-none"
                        />
                      </g>
                    );
                  })}

                  {/* High-Density Critical Hazard Danger Contours & Zones */}
                  {highRiskZones.map((zone) => {
                    return (
                      <g key={`hazard-zone-${zone.id}`} className="pointer-events-none">
                        {/* Pulsing Zone Outer Halo */}
                        <circle
                          cx={zone.screenX}
                          cy={zone.screenY}
                          r={zone.screenRadius}
                          fill="url(#extremeZoneGradient)"
                        />
                        {/* Dashed Perimeter Ring */}
                        <circle
                          cx={zone.screenX}
                          cy={zone.screenY}
                          r={zone.screenRadius}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="1.8"
                          strokeDasharray="5,4"
                          opacity="0.8"
                        />

                        {/* Zone Identifier Banner on Map */}
                        {showZoneCallouts && (
                          <g transform={`translate(${zone.screenX}, ${zone.screenY - zone.screenRadius - 10})`}>
                            <rect
                              x="-85"
                              y="-18"
                              width="170"
                              height="22"
                              rx="5"
                              fill="#450a0a"
                              stroke="#ef4444"
                              strokeWidth="1.2"
                              opacity="0.95"
                            />
                            <text
                              x="0"
                              y="-4"
                              textAnchor="middle"
                              fill="#fecaca"
                              fontSize="8.5"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              🔥 {zone.zoneCode}: {zone.criticalDefectsCount} CRITICAL FLAWS
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              )}

              {/* ===============================================================
                  LAYER 2.8: DYNAMIC CLUSTER RECALCULATION TRANSITION (DISPERSION RAYS & SHOCKWAVES)
                 =============================================================== */}
              <g id="geospatial-cluster-recalculation-layer" pointerEvents="none">
                {/* Catchment Shockwaves on Zoom-Out Consolidation */}
                {recalculationShockwaves.map((sw) => (
                  <motion.circle
                    key={sw.id}
                    cx={sw.x}
                    cy={sw.y}
                    fill="none"
                    stroke={sw.hasCritical ? '#ef4444' : '#0284c7'}
                    initial={{ r: 12, opacity: 0.95, strokeWidth: 3 }}
                    animate={{ r: sw.maxRadius, opacity: 0, strokeWidth: 0.5 }}
                    transition={{ duration: 0.85, ease: 'easeOut' }}
                  />
                ))}

                {/* Laser/Spoke Dispersion Rays on Zoom-In Recalculation */}
                {dispersionRays.map((ray) => (
                  <g key={ray.id}>
                    <motion.line
                      x1={ray.fromX}
                      y1={ray.fromY}
                      x2={ray.toX}
                      y2={ray.toY}
                      stroke={ray.isCrit ? '#ef4444' : '#38bdf8'}
                      strokeWidth={ray.isCrit ? 2.2 : 1.6}
                      strokeDasharray="4,4"
                      initial={{ pathLength: 0, opacity: 0.95 }}
                      animate={{ pathLength: 1, opacity: [0.95, 0.7, 0] }}
                      transition={{ duration: 0.85, ease: 'easeOut' }}
                    />
                    <motion.circle
                      cx={ray.fromX}
                      cy={ray.fromY}
                      fill="none"
                      stroke={ray.isCrit ? '#ef4444' : '#38bdf8'}
                      initial={{ r: 4, opacity: 0.9, strokeWidth: 2 }}
                      animate={{ r: 24, opacity: 0, strokeWidth: 0.5 }}
                      transition={{ duration: 0.75, ease: 'easeOut' }}
                    />
                  </g>
                ))}
              </g>

              {/* ===============================================================
                  LAYER 3: DEFECT MARKERS & GEOGRAPHIC CLUSTER BUBBLES
                 =============================================================== */}
              {/* 3A: Single Unclustered Defect Pins */}
              {singleDefects.map((item) => {
                const defect = item.defects[0];
                if (!defect) return null;
                const isCrit = defect.severity === 'CRITICAL';
                const isHigh = defect.severity === 'HIGH';
                const pinColor = isCrit ? '#ef4444' : isHigh ? '#f59e0b' : '#38bdf8';
                const isSelected = selectedCluster?.id === item.id;
                const prev = prevDefectPosRef.current.get(defect.defectId);
                const startX = prev ? (prev.clusterScreenX ?? prev.screenX) : item.screenX;
                const startY = prev ? (prev.clusterScreenY ?? prev.screenY) : item.screenY;

                return (
                  <motion.g
                    key={`single-pin-${defect.defectId}`}
                    initial={
                      isRecalculating && prev
                        ? {
                            x: startX,
                            y: startY,
                            scale: 0.35,
                            opacity: 0.4,
                          }
                        : false
                    }
                    animate={{
                      x: item.screenX,
                      y: item.screenY,
                      scale: isSelected ? 1.3 : 1,
                      opacity: 1,
                    }}
                    transition={
                      isDragging
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 240, damping: 24, mass: 0.7 }
                    }
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCluster(item);
                      setSelectedZone(null);
                      if (onSelectDefect) onSelectDefect(defect.defectId);
                      railwayAudio.playBeep(isCrit ? 880 : 600, 0.04);
                    }}
                    onMouseEnter={() => setHoveredCluster(item)}
                    onMouseLeave={() => setHoveredCluster(null)}
                  >
                    {/* Pulsing ring for critical */}
                    {isCrit && (
                      <circle cx="0" cy="0" r="14" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.8">
                        <animate attributeName="r" values="8;18;8" dur="1.8s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.9;0.1;0.9" dur="1.8s" repeatCount="indefinite" />
                      </circle>
                    )}

                    <circle
                      cx="0"
                      cy="0"
                      r={isSelected ? 10 : 7.5}
                      fill={pinColor}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
                    />

                    {/* Department Miniature Icon / Glyph */}
                    <text
                      x="0"
                      y="3"
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="7.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                      className="pointer-events-none"
                    >
                      {defect.department === 'ENGINEERING' ? 'W' : defect.department === 'S&T' ? 'S' : 'T'}
                    </text>
                  </motion.g>
                );
              })}

              {/* 3B: Defect Cluster Bubbles with Count & Critical Indicator */}
              {clusters.map((cluster) => {
                const hasCritical = cluster.criticalCount > 0;
                const isSelected = selectedCluster?.id === cluster.id;
                const isHovered = hoveredCluster?.id === cluster.id;

                // Size scales with total count
                const baseRadius = Math.min(26, 14 + cluster.totalCount * 1.8);
                const bubbleRadius = isHovered || isSelected ? baseRadius * 1.15 : baseRadius;

                // Border and fill styling based on critical presence
                const bubbleFill = hasCritical ? '#7f1d1d' : '#0c4a6e';
                const bubbleStroke = hasCritical ? '#ef4444' : '#0284c7';

                // Find start position from previous members if recalculating
                let sumX = 0;
                let sumY = 0;
                let matchCount = 0;
                for (const d of cluster.defects) {
                  const prev = prevDefectPosRef.current.get(d.defectId);
                  if (prev) {
                    sumX += prev.screenX;
                    sumY += prev.screenY;
                    matchCount++;
                  }
                }
                const startX = matchCount > 0 ? sumX / matchCount : cluster.screenX;
                const startY = matchCount > 0 ? sumY / matchCount : cluster.screenY;

                return (
                  <motion.g
                    key={`cluster-marker-${cluster.id}`}
                    initial={
                      isRecalculating && matchCount > 0
                        ? {
                            x: startX,
                            y: startY,
                            scale: 0.45,
                            opacity: 0.35,
                          }
                        : false
                    }
                    animate={{
                      x: cluster.screenX,
                      y: cluster.screenY,
                      scale: isSelected ? 1.15 : 1,
                      opacity: 1,
                    }}
                    transition={
                      isDragging
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 240, damping: 24, mass: 0.75 }
                    }
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCluster(cluster);
                      setSelectedZone(null);
                      railwayAudio.playBeep(hasCritical ? 880 : 660, 0.05);
                    }}
                    onMouseEnter={() => setHoveredCluster(cluster)}
                    onMouseLeave={() => setHoveredCluster(null)}
                  >
                    {/* Danger Radar Rings for Clusters containing CRITICAL defects */}
                    {hasCritical && (
                      <>
                        <circle
                          cx="0"
                          cy="0"
                          r={bubbleRadius + 8}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="1.8"
                          opacity="0.75"
                        >
                          <animate
                            attributeName="r"
                            values={`${bubbleRadius + 4};${bubbleRadius + 16};${bubbleRadius + 4}`}
                            dur="2s"
                            repeatCount="indefinite"
                          />
                          <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <circle
                          cx="0"
                          cy="0"
                          r={bubbleRadius + 3}
                          fill="#ef4444"
                          opacity="0.25"
                        />
                      </>
                    )}

                    {/* Main Cluster Circle with smooth spring radius & styling */}
                    <motion.circle
                      cx="0"
                      cy="0"
                      r={bubbleRadius}
                      animate={{ r: bubbleRadius }}
                      transition={
                        isDragging
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 260, damping: 22 }
                      }
                      fill={bubbleFill}
                      stroke={bubbleStroke}
                      strokeWidth={isSelected ? 3 : 2}
                      filter="drop-shadow(0 4px 8px rgba(0,0,0,0.9))"
                    />

                    {/* Total Defect Count inside Cluster */}
                    <text
                      x="0"
                      y={hasCritical ? '-1' : '4'}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={bubbleRadius * 0.62}
                      fontWeight="900"
                      fontFamily="monospace"
                      className="pointer-events-none"
                    >
                      {cluster.totalCount}
                    </text>

                    {/* Integrated Mini Tag: Critical vs Non-Critical Count preview */}
                    <motion.g
                      transform={`translate(0, ${bubbleRadius + 11})`}
                      animate={{ y: bubbleRadius + 11 }}
                      transition={
                        isDragging
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 260, damping: 22 }
                      }
                    >
                      <rect
                        x="-38"
                        y="-8"
                        width="76"
                        height="16"
                        rx="4"
                        fill="#020617"
                        stroke={hasCritical ? '#ef4444' : '#38bdf8'}
                        strokeWidth="1"
                        opacity="0.95"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fontSize="7.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                        className="pointer-events-none"
                      >
                        <tspan fill="#f87171">🔴 {cluster.criticalCount}</tspan>
                        <tspan fill="#94a3b8"> | </tspan>
                        <tspan fill="#38bdf8">⚪ {cluster.nonCriticalCount}</tspan>
                      </text>
                    </motion.g>
                  </motion.g>
                );
              })}
            </svg>

            {/* =========================================================================
                SUMMARY TOOLTIP (ON HOVER): CRITICAL vs. NON-CRITICAL BREAKDOWN
               ========================================================================= */}
            {hoveredCluster && !selectedCluster && (
              <div
                className="absolute z-40 pointer-events-none bg-slate-950/95 border border-sky-500/80 rounded-xl p-3 text-xs font-mono shadow-2xl backdrop-blur-md max-w-xs animate-in fade-in duration-100"
                style={{
                  left: Math.min(SVG_WIDTH - 260, Math.max(15, hoveredCluster.screenX + 15)),
                  top: Math.min(420, Math.max(15, hoveredCluster.screenY - 80)),
                }}
              >
                {/* Tooltip Header */}
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800 mb-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span className="font-bold text-white uppercase tracking-wider truncate">
                      {hoveredCluster.label}
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                    {hoveredCluster.chainageRange}
                  </span>
                </div>

                {/* THE CORE REQUIREMENT: SUMMARY TOOLTIP SHOWING COUNT OF CRITICAL vs. NON-CRITICAL */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase text-slate-400 font-bold flex items-center justify-between">
                    <span>Geographic Cluster Breakdown</span>
                    <span className="text-slate-300">Total: {hoveredCluster.totalCount} Defects</span>
                  </div>

                  {/* Dual Count Metric Comparison Cards */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* CRITICAL DEFECTS COUNT */}
                    <div
                      className={`p-2 rounded-lg border text-center ${
                        hoveredCluster.criticalCount > 0
                          ? 'bg-rose-950/90 border-rose-500/80 text-rose-200 ring-1 ring-rose-500/40'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-[9.5px] uppercase block font-bold flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>CRITICAL</span>
                      </span>
                      <span className="text-lg font-black font-mono text-rose-400">
                        {hoveredCluster.criticalCount}
                      </span>
                      <span className="text-[8.5px] text-slate-400 block">
                        {hoveredCluster.criticalCount > 0 ? 'Urgent Caution' : 'None'}
                      </span>
                    </div>

                    {/* NON-CRITICAL DEFECTS COUNT */}
                    <div className="p-2 rounded-lg bg-sky-950/80 border border-sky-600/70 text-center text-sky-200">
                      <span className="text-[9.5px] uppercase block font-bold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-sky-400" />
                        <span>NON-CRITICAL</span>
                      </span>
                      <span className="text-lg font-black font-mono text-sky-300">
                        {hoveredCluster.nonCriticalCount}
                      </span>
                      <span className="text-[8.5px] text-slate-400 block">
                        High / Med / Low
                      </span>
                    </div>
                  </div>

                  {/* Visual Proportion Ratio Bar */}
                  <div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                      <div
                        className="bg-rose-600 transition-all"
                        style={{ width: `${hoveredCluster.criticalRatio * 100}%` }}
                        title={`${hoveredCluster.criticalCount} Critical`}
                      />
                      <div
                        className="bg-amber-500 transition-all"
                        style={{
                          width: `${(hoveredCluster.highCount / hoveredCluster.totalCount) * 100}%`,
                        }}
                        title={`${hoveredCluster.highCount} High`}
                      />
                      <div
                        className="bg-sky-500 transition-all"
                        style={{
                          width: `${
                            ((hoveredCluster.mediumCount + hoveredCluster.lowCount) /
                              hoveredCluster.totalCount) *
                            100
                          }%`,
                        }}
                        title={`${hoveredCluster.mediumCount + hoveredCluster.lowCount} Med/Low`}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] text-slate-400 font-mono mt-0.5">
                      <span>{Math.round(hoveredCluster.criticalRatio * 100)}% Critical</span>
                      <span>{Math.round((1 - hoveredCluster.criticalRatio) * 100)}% Non-Critical</span>
                    </div>
                  </div>

                  {/* Speed restriction alert in this cluster if active */}
                  {hoveredCluster.hasSpeedRestriction && (
                    <div className="text-[9.5px] px-2 py-1 rounded bg-amber-950/70 border border-amber-600 text-amber-300 flex items-center gap-1.5">
                      <AlertOctagon className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Speed Restriction: {hoveredCluster.minSpeedRestrictionKmph} km/h Caution Order</span>
                    </div>
                  )}

                  <p className="text-[9px] text-slate-500 italic">Click cluster marker to inspect member flaws &amp; focus.</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom HUD Bar: Coordinates, Scale, and Action Shortcut */}
          <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between text-[10.5px] text-slate-400 font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-slate-300">
                <Crosshair className="w-3 h-3 text-sky-400" />
                <span>
                  Cursor:{' '}
                  <strong className="text-white">
                    {cursorGeo ? `${cursorGeo.lat.toFixed(4)}°N, ${cursorGeo.lng.toFixed(4)}°E` : 'Hover map'}
                  </strong>
                </span>
              </span>
              <span className="text-slate-600">|</span>
              <span>
                Nearest Station:{' '}
                <strong className="text-sky-300">
                  {cursorGeo ? findNearestStation(cursorGeo.lat, cursorGeo.lng)?.name || 'Track Line' : '—'}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500">Click &amp; Drag to Pan • Scroll to Zoom</span>
              <button
                type="button"
                onClick={handleResetView}
                className="text-[10px] text-sky-400 hover:text-sky-300 underline cursor-pointer"
              >
                Reset Map
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN (4 cols on lg):
            INSPECTION DOSSIER FOR SELECTED CLUSTER OR HIGH-RISK ZONES DIRECTORY
           ========================================================================= */}
        <div className="lg:col-span-4 space-y-3 flex flex-col">
          {/* Active Selection Details Card */}
          {selectedCluster ? (
            <div className="p-4 rounded-xl bg-slate-950 border border-sky-600/80 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      selectedCluster.criticalCount > 0
                        ? 'bg-rose-950 border border-rose-600 text-rose-300'
                        : 'bg-sky-950 border border-sky-600 text-sky-300'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      {selectedCluster.label}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedCluster.chainageRange} • {selectedCluster.corridorIds.join(', ')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCluster(null)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                  title="Close Selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Prominent Critical vs Non-Critical Summary Counts */}
              <div className="grid grid-cols-2 gap-2">
                <div
                  className={`p-2.5 rounded-xl border text-center ${
                    selectedCluster.criticalCount > 0
                      ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-1 ring-rose-500/50'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase block text-rose-300 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>CRITICAL</span>
                  </span>
                  <span className="text-xl font-black font-mono text-rose-400">
                    {selectedCluster.criticalCount}
                  </span>
                  <span className="text-[9px] text-slate-400 block">
                    Defects in Cluster
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-sky-950/80 border border-sky-600 text-center text-sky-200">
                  <span className="text-[10px] font-bold uppercase block text-sky-300 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-sky-400" />
                    <span>NON-CRITICAL</span>
                  </span>
                  <span className="text-xl font-black font-mono text-sky-300">
                    {selectedCluster.nonCriticalCount}
                  </span>
                  <span className="text-[9px] text-slate-400 block">
                    High: {selectedCluster.highCount} • Med: {selectedCluster.mediumCount}
                  </span>
                </div>
              </div>

              {/* Ratio Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Critical Severity Ratio</span>
                  <span className="font-bold text-white">
                    {Math.round(selectedCluster.criticalRatio * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden flex border border-slate-800">
                  <div
                    className="bg-rose-600"
                    style={{ width: `${selectedCluster.criticalRatio * 100}%` }}
                  />
                  <div
                    className="bg-sky-500"
                    style={{ width: `${(1 - selectedCluster.criticalRatio) * 100}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  id="btn-cluster-zoom-expand"
                  onClick={() => handleFocusCluster(selectedCluster)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-600 text-sky-200 text-xs font-bold font-mono flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Zoom &amp; Center</span>
                </button>

                {onFilterRegistryByCluster && (
                  <button
                    type="button"
                    id="btn-cluster-filter-registry"
                    onClick={() => {
                      const ids = selectedCluster.defects.map((d) => d.defectId);
                      onFilterRegistryByCluster(ids);
                      railwayAudio.playBeep(750, 0.04);
                    }}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono flex items-center justify-center gap-1 transition-all cursor-pointer"
                    title="Filter main defect table by these defects"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>View in Table ({selectedCluster.totalCount})</span>
                  </button>
                )}
              </div>

              {/* Member Defects List in Cluster */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Defects in this Geographic Cluster ({selectedCluster.defects.length})
                </span>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {selectedCluster.defects.map((d) => {
                    const isCrit = d.severity === 'CRITICAL';
                    return (
                      <div
                        key={d.defectId}
                        className={`p-2 rounded-lg border text-xs transition-all ${
                          isCrit
                            ? 'bg-rose-950/40 border-rose-800/80 text-slate-200'
                            : 'bg-slate-900/70 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-1 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{d.assetId}</span>
                            <span className="text-[10px] text-slate-400">({d.defectId})</span>
                          </div>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              isCrit
                                ? 'bg-rose-950 text-rose-300 border border-rose-600'
                                : d.severity === 'HIGH'
                                ? 'bg-amber-950 text-amber-300 border border-amber-600'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {d.severity}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 line-clamp-1">{d.defectType}</p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                          <span>{d.geoCoordinates?.railwayChainageKm || d.corridorId}</span>
                          <div className="flex items-center gap-2">
                            {d.speedRestrictionKmph && (
                              <span className="text-amber-400 font-bold">{d.speedRestrictionKmph} km/h</span>
                            )}
                            {onOpenDefectPhotoModal && d.photoAttachment && (
                              <button
                                type="button"
                                onClick={() => onOpenDefectPhotoModal(d)}
                                className="text-sky-400 hover:text-sky-300 flex items-center gap-0.5"
                                title="Inspect defect photo"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Photo</span>
                              </button>
                            )}
                            {onOpenDefectLocationModal && (
                              <button
                                type="button"
                                onClick={() => onOpenDefectLocationModal(d)}
                                className="text-rose-400 hover:text-rose-300 flex items-center gap-0.5"
                                title="Inspect geodetic coordinates"
                              >
                                <Crosshair className="w-3 h-3" />
                                <span>Radar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* DEFAULT PANEL: High-Risk Maintenance Zones Directory */
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-rose-500" />
                    <span>High-Risk Maintenance Zones</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 font-mono">
                    {highRiskZones.length} Hotspots
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Zones identified by geospatial density of CRITICAL flaws. Clustered defects generate elevated derailment risk requiring track block possessions.
                </p>

                {/* Hotspot Zones List */}
                <div className="space-y-2 pt-1 max-h-[360px] overflow-y-auto pr-1">
                  {highRiskZones.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => handleFocusZone(zone)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedZone?.id === zone.id
                          ? 'bg-rose-950/80 border-rose-500 ring-2 ring-rose-500 shadow-lg'
                          : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          <span>{zone.zoneCode}</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-rose-950 text-rose-300 border border-rose-700">
                          {zone.criticalDefectsCount} Critical Flaws
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-200 mb-1">{zone.zoneName}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{zone.primaryIssue}</p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-mono pt-1.5 border-t border-slate-800/80">
                        <span className="text-amber-300 font-bold">
                          Caution: {zone.mandatedCautionSpeedKmph} km/h
                        </span>
                        <span className="text-emerald-400">
                          Block: {zone.recommendedBlockHours}h Window
                        </span>
                      </div>
                    </button>
                  ))}

                  {highRiskZones.length === 0 && (
                    <div className="p-6 text-center text-slate-500">
                      <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-xs">No critical defect clusters detected matching current filters.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Footer Tip */}
              <div className="p-2.5 rounded-lg bg-[#0a1224] border border-slate-800/80 text-[10.5px] text-slate-400 flex items-start gap-2">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  Click any cluster bubble on the map to expand member defects, or click a High-Risk Zone above to focus the map.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
