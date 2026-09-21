import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Map,
  Layers,
  Radio,
  AlertTriangle,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Train,
  Wrench,
  Zap,
  ShieldAlert,
  Filter,
  Sparkles,
  Info,
  Crosshair,
  ChevronRight,
  ChevronDown,
  X,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Maximize2,
  GitFork,
  Check,
  Activity,
  Calendar,
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Target,
  LocateFixed,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Corridor, OptimizedBlock, Defect, DepartmentType, Asset } from '../../types';
import {
  TRACKSIDE_ASSETS,
  ASSET_TYPE_DEFINITIONS,
  SpecificAssetType,
  TracksideAsset,
} from '../../data/tracksideAssetsData';
import {
  RAILWAY_CORRIDOR_SEGMENTS,
  RAILWAY_NETWORK_BOUNDS,
  projectGeoToCanvas,
  findNearestStation,
  RailwayStationNode,
} from '../../services/defectGeospatialService';
import { railwayAudio } from '../../services/railwayAudio';

export interface FocusedTarget {
  type: 'BLOCK' | 'ASSET' | 'DEFECT';
  id: string;
}

export interface CommandCenterMapPreviewProps {
  corridors: Corridor[];
  blocks: OptimizedBlock[];
  defects: Defect[];
  assets?: Asset[];
  onNavigate: (screen: string, itemData?: any) => void;
  focusedTarget?: FocusedTarget | null;
  onSelectTarget?: (target: { type: string; id: string; data: any }) => void;
  initialSidebarOpen?: boolean;
}

export const CommandCenterMapPreview: React.FC<CommandCenterMapPreviewProps> = ({
  corridors,
  blocks,
  defects,
  assets = [],
  onNavigate,
  focusedTarget = null,
  onSelectTarget,
  initialSidebarOpen = true,
}) => {
  // SVG Canvas configuration
  const CANVAS_WIDTH = 960;
  const CANVAS_HEIGHT = 480;

  // Map view transformation states
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Filter & Layer states
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('ALL');
  const [showBlocks, setShowBlocks] = useState<boolean>(true);
  const [showDefects, setShowDefects] = useState<boolean>(true);
  const [showStations, setShowStations] = useState<boolean>(true);
  const [onlyConflicts, setOnlyConflicts] = useState<boolean>(false);
  const [onlyCriticalDefects, setOnlyCriticalDefects] = useState<boolean>(false);
  const [selectedDepartment, setSelectedDepartment] = useState<'ALL' | DepartmentType>('ALL');

  // Asset Layer Selection State
  const [activeAssetTypes, setActiveAssetTypes] = useState<Record<SpecificAssetType, boolean>>({
    OHE_GANTRY: true,
    SIGNALING_BOX: true,
    BALLAST_PILE: true,
    TURNOUT_SWITCH: false,
  });
  const [showAssetLayersDropdown, setShowAssetLayersDropdown] = useState<boolean>(false);

  // Interactive selection state
  const [selectedBlock, setSelectedBlock] = useState<OptimizedBlock | null>(null);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [selectedStation, setSelectedStation] = useState<RailwayStationNode | null>(null);
  const [selectedTracksideAsset, setSelectedTracksideAsset] = useState<TracksideAsset | null>(null);

  const [hoveredEntity, setHoveredEntity] = useState<{
    type: 'BLOCK' | 'DEFECT' | 'STATION' | 'ASSET';
    id: string;
    title: string;
    subtitle: string;
    x: number;
    y: number;
    badgeColor?: string;
    health?: number;
    category?: string;
    details?: string;
  } | null>(null);

  // Sidebar List & Entity Targeting States
  const [showSidebar, setShowSidebar] = useState<boolean>(initialSidebarOpen);
  const [sidebarTab, setSidebarTab] = useState<'ALL' | 'BLOCKS' | 'ASSETS'>('ALL');
  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const [sidebarDeptFilter, setSidebarDeptFilter] = useState<string>('ALL');

  // Visual Lock-on Reticle & Sonar Ping State
  const [targetPing, setTargetPing] = useState<{
    lat: number;
    lng: number;
    color: string;
    label: string;
    lateralOffset?: { x: number; y: number };
  } | null>(null);

  // Animation frame reference for smooth camera flight
  const animationRef = useRef<number | null>(null);

  const svgContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAssetLayersDropdown(false);
      }
    };
    if (showAssetLayersDropdown) {
      document.addEventListener('mousedown', handleDocumentClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [showAssetLayersDropdown]);

  // Helper to parse section kilometers from block section string (e.g., "KM 12/0 to 22/0")
  const parseSectionKm = (section: string): { startKm: number; endKm: number; midKm: number } => {
    const match = section.match(
      /KM\s*([0-9]+(?:\.[0-9]+)?)(?:\/([0-9]+))?\s*(?:to|-)\s*([0-9]+(?:\.[0-9]+)?)(?:\/([0-9]+))?/i
    );
    if (match) {
      const s1 = parseFloat(match[1]) + (match[2] ? parseFloat(match[2]) / 10 : 0);
      const s2 = parseFloat(match[3]) + (match[4] ? parseFloat(match[4]) / 10 : 0);
      const startKm = Math.min(s1, s2);
      const endKm = Math.max(s1, s2);
      return { startKm, endKm, midKm: (startKm + endKm) / 2 };
    }
    const singleMatch = section.match(/KM\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (singleMatch) {
      const km = parseFloat(singleMatch[1]);
      return { startKm: Math.max(0, km - 2), endKm: km + 2, midKm: km };
    }
    return { startKm: 10, endKm: 18, midKm: 14 };
  };

  // Interpolate lat/lng along a corridor for any given chainage km
  const getCoordinatesForCorridorKm = (
    corridorId: string,
    km: number
  ): { lat: number; lng: number } => {
    const segment =
      RAILWAY_CORRIDOR_SEGMENTS.find((s) => s.corridorId === corridorId) ||
      RAILWAY_CORRIDOR_SEGMENTS[0];
    const stations = segment.stations;
    if (!stations || stations.length === 0) {
      return { lat: 28.6448, lng: 77.225 };
    }

    if (km <= stations[0].chainageKm) {
      return { lat: stations[0].latitude, lng: stations[0].longitude };
    }
    if (km >= stations[stations.length - 1].chainageKm) {
      const last = stations[stations.length - 1];
      return { lat: last.latitude, lng: last.longitude };
    }

    for (let i = 0; i < stations.length - 1; i++) {
      const s1 = stations[i];
      const s2 = stations[i + 1];
      if (km >= s1.chainageKm && km <= s2.chainageKm) {
        const span = s2.chainageKm - s1.chainageKm || 1;
        const ratio = (km - s1.chainageKm) / span;
        return {
          lat: s1.latitude + ratio * (s2.latitude - s1.latitude),
          lng: s1.longitude + ratio * (s2.longitude - s1.longitude),
        };
      }
    }

    return { lat: stations[0].latitude, lng: stations[0].longitude };
  };

  // Clean up any active animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Smooth camera flight and zoom to geographic coordinates
  const flyTo = useCallback(
    (
      targetLat: number,
      targetLng: number,
      targetZoom: number = 2.4,
      lateralOffsetX: number = 0,
      lateralOffsetY: number = 0
    ) => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      const { minLat, maxLat, minLng, maxLng } = RAILWAY_NETWORK_BOUNDS;
      const paddingX = 40;
      const paddingY = 40;
      const usableWidth = CANVAS_WIDTH - paddingX * 2;
      const usableHeight = CANVAS_HEIGHT - paddingY * 2;

      // Project target lat/long to normalized canvas space
      const normX = (targetLng - minLng) / (maxLng - minLng);
      const normY = (maxLat - targetLat) / (maxLat - minLat);

      const baseX = paddingX + normX * usableWidth;
      const baseY = paddingY + normY * usableHeight;

      const centerX = CANVAS_WIDTH / 2;
      const centerY = CANVAS_HEIGHT / 2;

      const lateralScale = Math.min(targetZoom, 1.4);
      const targetPanX = -(baseX - centerX) * targetZoom - lateralOffsetX * lateralScale;
      const targetPanY = -(baseY - centerY) * targetZoom - lateralOffsetY * lateralScale;

      const startZoom = zoom;
      const startPanX = pan.x;
      const startPanY = pan.y;

      const duration = 400; // ms
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Cubic ease-out curve
        const ease = 1 - Math.pow(1 - progress, 3);

        const currentZoom = startZoom + (targetZoom - startZoom) * ease;
        const currentPanX = startPanX + (targetPanX - startPanX) * ease;
        const currentPanY = startPanY + (targetPanY - startPanY) * ease;

        setZoom(currentZoom);
        setPan({ x: currentPanX, y: currentPanY });

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(step);
        } else {
          animationRef.current = null;
        }
      };

      animationRef.current = requestAnimationFrame(step);
    },
    [zoom, pan, CANVAS_WIDTH, CANVAS_HEIGHT]
  );

  // Automatically zoom and center onto a specific block possession zone
  const handleSelectAndZoomBlock = useCallback(
    (block: OptimizedBlock) => {
      const { midKm } = parseSectionKm(block.section);
      const midCoord = getCoordinatesForCorridorKm(block.corridorId, midKm);

      // Ensure block layer is active
      if (!showBlocks) {
        setShowBlocks(true);
      }
      // Reset corridor filter if block is in another corridor
      if (selectedCorridorId !== 'ALL' && selectedCorridorId !== block.corridorId) {
        setSelectedCorridorId('ALL');
      }

      setSelectedBlock(block);
      setSelectedDefect(null);
      setSelectedStation(null);
      setSelectedTracksideAsset(null);

      flyTo(midCoord.lat, midCoord.lng, 2.3);

      const isConflict = block.hasConflict || block.validationStatus !== 'VALID';
      setTargetPing({
        lat: midCoord.lat,
        lng: midCoord.lng,
        color: isConflict ? '#f43f5e' : '#10b981',
        label: `${block.blockId} (${block.section})`,
      });

      onSelectTarget?.({ type: 'BLOCK', id: block.blockId, data: block });
      railwayAudio.playBeep(isConflict ? 920 : 820, 0.05);
    },
    [selectedCorridorId, showBlocks, flyTo, onSelectTarget]
  );

  // Automatically zoom and center onto a specific trackside asset
  const handleSelectAndZoomAsset = useCallback(
    (asset: TracksideAsset) => {
      const baseCoord = getCoordinatesForCorridorKm(asset.corridorId, asset.chainageKm);

      // Ensure this asset category is enabled
      if (!activeAssetTypes[asset.category]) {
        setActiveAssetTypes((prev) => ({ ...prev, [asset.category]: true }));
      }
      // Reset corridor filter if asset is in another corridor
      if (selectedCorridorId !== 'ALL' && selectedCorridorId !== asset.corridorId) {
        setSelectedCorridorId('ALL');
      }

      setSelectedTracksideAsset(asset);
      setSelectedBlock(null);
      setSelectedDefect(null);
      setSelectedStation(null);

      flyTo(
        baseCoord.lat,
        baseCoord.lng,
        2.5,
        asset.lateralOffsetPx?.x || 0,
        asset.lateralOffsetPx?.y || 0
      );

      const assetColor =
        asset.category === 'OHE_GANTRY'
          ? '#facc15'
          : asset.category === 'SIGNALING_BOX'
          ? '#34d399'
          : asset.category === 'BALLAST_PILE'
          ? '#fb923c'
          : '#818cf8';

      setTargetPing({
        lat: baseCoord.lat,
        lng: baseCoord.lng,
        color: assetColor,
        label: `${asset.id} (KM ${asset.chainageKm.toFixed(1)})`,
        lateralOffset: asset.lateralOffsetPx,
      });

      onSelectTarget?.({ type: 'ASSET', id: asset.id, data: asset });
      railwayAudio.playBeep(880, 0.05);
    },
    [activeAssetTypes, selectedCorridorId, flyTo, onSelectTarget]
  );

  // React to programmatic external focusedTarget prop changes
  useEffect(() => {
    if (!focusedTarget) return;

    if (focusedTarget.type === 'BLOCK') {
      const foundBlock = blocks.find((b) => b.blockId === focusedTarget.id);
      if (foundBlock) {
        handleSelectAndZoomBlock(foundBlock);
      }
    } else if (focusedTarget.type === 'ASSET') {
      const foundAsset = TRACKSIDE_ASSETS.find(
        (a) => a.id === focusedTarget.id || a.assetId === focusedTarget.id
      );
      if (foundAsset) {
        handleSelectAndZoomAsset(foundAsset);
      }
    }
  }, [focusedTarget, blocks, handleSelectAndZoomBlock, handleSelectAndZoomAsset]);

  // Zoom and Pan Handlers
  const handleZoomIn = () => {
    railwayAudio.playBeep(750, 0.03);
    setZoom((prev) => Math.min(prev + 0.35, 3.2));
  };

  const handleZoomOut = () => {
    railwayAudio.playBeep(650, 0.03);
    setZoom((prev) => Math.max(prev - 0.35, 0.85));
  };

  const handleResetView = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    railwayAudio.playBeep(700, 0.04);
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setSelectedCorridorId('ALL');
    setSelectedBlock(null);
    setSelectedDefect(null);
    setSelectedStation(null);
    setSelectedTracksideAsset(null);
    setHoveredEntity(null);
    setTargetPing(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Toggle individual asset type layer
  const handleToggleAssetType = (type: SpecificAssetType) => {
    railwayAudio.playBeep(activeAssetTypes[type] ? 600 : 800, 0.03);
    setActiveAssetTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // Set all asset types ON/OFF
  const handleSetAllAssetTypes = (enabled: boolean) => {
    railwayAudio.playBeep(enabled ? 850 : 550, 0.04);
    setActiveAssetTypes({
      OHE_GANTRY: enabled,
      SIGNALING_BOX: enabled,
      BALLAST_PILE: enabled,
      TURNOUT_SWITCH: enabled,
    });
  };

  // Filtered blocks list for the sidebar directory
  const sidebarBlocks = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    return blocks.filter((b) => {
      if (sidebarDeptFilter !== 'ALL' && b.department !== sidebarDeptFilter) {
        return false;
      }
      if (!q) return true;
      return (
        b.blockId.toLowerCase().includes(q) ||
        b.corridorId.toLowerCase().includes(q) ||
        b.section.toLowerCase().includes(q) ||
        b.department.toLowerCase().includes(q) ||
        (b.workDescription && b.workDescription.toLowerCase().includes(q))
      );
    });
  }, [blocks, sidebarSearch, sidebarDeptFilter]);

  // Filtered assets list for the sidebar directory
  const sidebarAssets = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    return TRACKSIDE_ASSETS.filter((a) => {
      if (sidebarDeptFilter !== 'ALL' && a.department !== sidebarDeptFilter) {
        return false;
      }
      if (!q) return true;
      return (
        a.id.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.corridorId.toLowerCase().includes(q) ||
        a.section.toLowerCase().includes(q) ||
        a.condition.toLowerCase().includes(q) ||
        (a.assetId && a.assetId.toLowerCase().includes(q))
      );
    });
  }, [sidebarSearch, sidebarDeptFilter]);

  // Filtered Corridors
  const visibleCorridors = useMemo(() => {
    if (selectedCorridorId === 'ALL') {
      return RAILWAY_CORRIDOR_SEGMENTS;
    }
    return RAILWAY_CORRIDOR_SEGMENTS.filter((s) => s.corridorId === selectedCorridorId);
  }, [selectedCorridorId]);

  // Filtered Block Zones with projected coordinates
  const mappedBlocks = useMemo(() => {
    if (!showBlocks) return [];

    let filtered = blocks;
    if (selectedCorridorId !== 'ALL') {
      filtered = filtered.filter((b) => b.corridorId === selectedCorridorId);
    }
    if (selectedDepartment !== 'ALL') {
      filtered = filtered.filter((b) => b.department === selectedDepartment);
    }
    if (onlyConflicts) {
      filtered = filtered.filter((b) => b.hasConflict || b.validationStatus !== 'VALID');
    }

    return filtered.map((block) => {
      const { startKm, endKm, midKm } = parseSectionKm(block.section);
      const startCoord = getCoordinatesForCorridorKm(block.corridorId, startKm);
      const endCoord = getCoordinatesForCorridorKm(block.corridorId, endKm);
      const midCoord = getCoordinatesForCorridorKm(block.corridorId, midKm);

      const startPt = projectGeoToCanvas(startCoord.lat, startCoord.lng, CANVAS_WIDTH, CANVAS_HEIGHT, zoom, pan);
      const endPt = projectGeoToCanvas(endCoord.lat, endCoord.lng, CANVAS_WIDTH, CANVAS_HEIGHT, zoom, pan);
      const midPt = projectGeoToCanvas(midCoord.lat, midCoord.lng, CANVAS_WIDTH, CANVAS_HEIGHT, zoom, pan);

      return {
        block,
        startKm,
        endKm,
        midKm,
        startPt,
        endPt,
        midPt,
      };
    });
  }, [blocks, showBlocks, selectedCorridorId, selectedDepartment, onlyConflicts, zoom, pan]);

  // Filtered Defects with projected coordinates
  const mappedDefects = useMemo(() => {
    if (!showDefects) return [];

    let filtered = defects;
    if (selectedCorridorId !== 'ALL') {
      filtered = filtered.filter((d) => d.corridorId === selectedCorridorId);
    }
    if (selectedDepartment !== 'ALL') {
      filtered = filtered.filter((d) => d.department === selectedDepartment);
    }
    if (onlyCriticalDefects) {
      filtered = filtered.filter((d) => d.severity === 'CRITICAL');
    }

    return filtered.map((defect) => {
      let lat = defect.geoCoordinates?.latitude;
      let lng = defect.geoCoordinates?.longitude;

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        const fallback = getCoordinatesForCorridorKm(defect.corridorId, 20);
        lat = fallback.lat;
        lng = fallback.lng;
      }

      const screenPt = projectGeoToCanvas(lat, lng, CANVAS_WIDTH, CANVAS_HEIGHT, zoom, pan);

      return {
        defect,
        lat,
        lng,
        screenPt,
      };
    });
  }, [defects, showDefects, selectedCorridorId, selectedDepartment, onlyCriticalDefects, zoom, pan]);

  // Filtered Specific Trackside Assets with projected coordinates and maintenance planning correlation
  const mappedAssets = useMemo(() => {
    return TRACKSIDE_ASSETS.filter((asset) => {
      // Check active layer toggle
      if (!activeAssetTypes[asset.category]) return false;
      // Filter by corridor
      if (selectedCorridorId !== 'ALL' && asset.corridorId !== selectedCorridorId) return false;
      // Filter by department
      if (selectedDepartment !== 'ALL' && asset.department !== selectedDepartment) return false;
      return true;
    }).map((asset) => {
      const baseCoord = getCoordinatesForCorridorKm(asset.corridorId, asset.chainageKm);
      const baseScreenPt = projectGeoToCanvas(
        baseCoord.lat,
        baseCoord.lng,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        zoom,
        pan
      );

      // Apply lateral offset to distinguish multiple assets at adjacent chainage
      const lateralScale = Math.min(zoom, 1.4);
      const screenPt = {
        x: baseScreenPt.x + (asset.lateralOffsetPx?.x || 0) * lateralScale,
        y: baseScreenPt.y + (asset.lateralOffsetPx?.y || 0) * lateralScale,
      };

      // Correlate with active blocks in this track section
      const overlappingBlock = blocks.find((b) => {
        if (b.corridorId !== asset.corridorId) return false;
        if (asset.associatedBlockId && b.blockId === asset.associatedBlockId) return true;
        const { startKm, endKm } = parseSectionKm(b.section);
        return asset.chainageKm >= startKm - 0.5 && asset.chainageKm <= endKm + 0.5;
      });

      // Correlate with active defects on this asset or chainage
      const correlatedDefect = defects.find((d) => {
        if (asset.associatedDefectId && d.defectId === asset.associatedDefectId) return true;
        if (d.assetId && (d.assetId === asset.assetId || d.assetId === asset.id)) return true;
        if (d.corridorId === asset.corridorId && d.geoCoordinates?.railwayChainageKm) {
          const dKm = parseFloat(d.geoCoordinates.railwayChainageKm.replace(/[^0-9.]/g, ''));
          return Math.abs(dKm - asset.chainageKm) < 1.2;
        }
        return false;
      });

      return {
        asset,
        baseCoord,
        screenPt,
        overlappingBlock,
        correlatedDefect,
      };
    });
  }, [
    activeAssetTypes,
    selectedCorridorId,
    selectedDepartment,
    blocks,
    defects,
    zoom,
    pan,
  ]);

  // Counts of each asset type currently rendered
  const assetCounts = useMemo(() => {
    const counts: Record<SpecificAssetType, number> = {
      OHE_GANTRY: 0,
      SIGNALING_BOX: 0,
      BALLAST_PILE: 0,
      TURNOUT_SWITCH: 0,
    };
    mappedAssets.forEach((m) => {
      counts[m.asset.category] = (counts[m.asset.category] || 0) + 1;
    });
    return counts;
  }, [mappedAssets]);

  const activeAssetTypeCount = Object.values(activeAssetTypes).filter(Boolean).length;
  const totalActiveBlocksCount = blocks.length;
  const conflictedBlocksCount = blocks.filter((b) => b.hasConflict).length;
  const totalDefectsCount = defects.length;
  const criticalDefectsCount = defects.filter((d) => d.severity === 'CRITICAL').length;

  return (
    <div
      id="network-map-preview-module"
      className="bg-[#0b1329] border border-sky-900/60 rounded-xl shadow-2xl overflow-hidden transition-all"
    >
      {/* =========================================================================
          MODULE HEADER & REAL-TIME HUD
          ========================================================================= */}
      <div className="p-4 bg-gradient-to-r from-[#0d1733] via-[#0e1b3d] to-[#0a1127] border-b border-sky-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-sky-950 border border-sky-600/60 text-sky-400">
              <Map className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-100 font-mono tracking-wide">
              INTERACTIVE NETWORK MAP PREVIEW
            </h3>
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 text-[10px] font-mono font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              GIS LIVE TELEMETRY
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-700/50 text-[10px] font-mono">
              NORTHERN RAILWAY (DELHI DIVISION)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visualizing active maintenance possession zones, defect hotspots, and trackside asset layers (OHE gantries, signaling boxes, ballast piles) across trunk corridors.
          </p>
        </div>

        {/* Live Counters & Jump Buttons */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/70 flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase">Blocks:</span>
            <span className="font-bold text-sky-300">{totalActiveBlocksCount}</span>
            {conflictedBlocksCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-rose-950 border border-rose-600 text-rose-300 text-[10px] font-bold">
                {conflictedBlocksCount} Conflict
              </span>
            )}
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/70 flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase">Defects:</span>
            <span className="font-bold text-amber-300">{totalDefectsCount}</span>
            {criticalDefectsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-rose-950 border border-rose-600 text-rose-300 text-[10px] font-bold animate-pulse">
                {criticalDefectsCount} Critical
              </span>
            )}
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-600/40 flex items-center gap-2">
            <span className="text-[10px] text-amber-400 uppercase">Assets on Map:</span>
            <span className="font-bold text-amber-300">{mappedAssets.length}</span>
          </div>

          <button
            type="button"
            id="btn-nav-full-geospatial-screen"
            onClick={() => {
              railwayAudio.playBeep(800, 0.05);
              onNavigate('defect_reporting');
            }}
            className="px-3 py-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-600/70 text-sky-200 text-xs font-bold font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Open comprehensive Full GIS Defect Geospatial Screen"
          >
            <span>Full Map Hub</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          FILTER & CONTROLS TOOLBAR (WITH ASSET LAYER SELECTOR)
          ========================================================================= */}
      <div className="p-3 bg-[#080e22] border-b border-sky-950/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Corridor Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10.5px] text-slate-400 font-bold uppercase mr-1">Corridor:</span>
          <button
            type="button"
            onClick={() => {
              setSelectedCorridorId('ALL');
              railwayAudio.playBeep(700, 0.03);
            }}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              selectedCorridorId === 'ALL'
                ? 'bg-sky-600 text-white font-bold shadow-sm'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            ALL (4 Lines)
          </button>
          {RAILWAY_CORRIDOR_SEGMENTS.map((seg) => (
            <button
              key={seg.corridorId}
              type="button"
              onClick={() => {
                setSelectedCorridorId(seg.corridorId);
                railwayAudio.playBeep(700, 0.03);
              }}
              className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                selectedCorridorId === seg.corridorId
                  ? 'bg-slate-800 text-white font-bold border border-sky-500 shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }}></span>
              <span>{seg.corridorCode}</span>
            </button>
          ))}
        </div>

        {/* Layer Toggles & Department Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Base Layer Toggles */}
          <button
            type="button"
            onClick={() => setShowBlocks(!showBlocks)}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-bold flex items-center gap-1 transition-all ${
              showBlocks
                ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                : 'bg-slate-900 text-slate-500 border-slate-800 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Blocks ({mappedBlocks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDefects(!showDefects)}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-bold flex items-center gap-1 transition-all ${
              showDefects
                ? 'bg-rose-950 text-rose-300 border-rose-600'
                : 'bg-slate-900 text-slate-500 border-slate-800 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            <span>Defects ({mappedDefects.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowStations(!showStations)}
            className={`px-2 py-1 rounded-md border text-[11px] font-medium transition-all ${
              showStations
                ? 'bg-sky-950 text-sky-300 border-sky-700'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            Stations
          </button>

          {/* =========================================================================
              TOGGLEABLE ASSET LAYER SELECTOR (DROPDOWN + DIRECT PILLS)
              ========================================================================= */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              id="btn-asset-layer-selector"
              onClick={() => {
                railwayAudio.playBeep(720, 0.03);
                setShowAssetLayersDropdown(!showAssetLayersDropdown);
              }}
              className={`px-2.5 py-1 rounded-md border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                activeAssetTypeCount > 0
                  ? 'bg-gradient-to-r from-amber-950/80 to-amber-900/60 text-amber-200 border-amber-500/80 shadow-md ring-1 ring-amber-500/30'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Asset Layers</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                {mappedAssets.length}
              </span>
              <ChevronDown
                className={`w-3 h-3 text-amber-400 transition-transform ${
                  showAssetLayersDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Floating Asset Layer Dropdown Popover */}
            <AnimatePresence>
              {showAssetLayersDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-80 z-50 bg-[#0c1630] border border-amber-600/60 rounded-xl p-3 shadow-2xl backdrop-blur-xl text-xs font-mono"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-slate-100 uppercase text-[11px]">
                        Asset Layer Selector
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetAllAssetTypes(true)}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold text-sky-400 hover:text-sky-300 hover:bg-slate-800/80 transition-colors"
                      >
                        All On
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => handleSetAllAssetTypes(false)}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <p className="text-[10.5px] text-slate-400 mb-2.5 leading-relaxed">
                    Toggle track infrastructure overlays to contextualize maintenance blocks, isolation requirements, and staging materials.
                  </p>

                  <div className="space-y-1.5">
                    {/* OHE Gantries */}
                    <div
                      onClick={() => handleToggleAssetType('OHE_GANTRY')}
                      className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        activeAssetTypes.OHE_GANTRY
                          ? 'bg-amber-950/50 border-amber-500/70 text-slate-100'
                          : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-amber-950 border border-amber-600/80 flex items-center justify-center text-amber-400">
                          <Zap className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <div className="font-bold text-[11px] flex items-center gap-1.5">
                            <span>OHE Gantries &amp; Masts</span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-950/90 text-amber-300 text-[9px] border border-amber-700/50">
                              TRACTION
                            </span>
                          </div>
                          <div className="text-[9.5px] text-slate-400">
                            25kV portals, cantilever masts &amp; neutral sections
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-amber-400">
                          {assetCounts.OHE_GANTRY || 0}
                        </span>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            activeAssetTypes.OHE_GANTRY
                              ? 'bg-amber-500 border-amber-400 text-slate-950'
                              : 'border-slate-700 bg-slate-950'
                          }`}
                        >
                          {activeAssetTypes.OHE_GANTRY && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>

                    {/* Signaling Boxes */}
                    <div
                      onClick={() => handleToggleAssetType('SIGNALING_BOX')}
                      className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        activeAssetTypes.SIGNALING_BOX
                          ? 'bg-emerald-950/50 border-emerald-500/70 text-slate-100'
                          : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-emerald-950 border border-emerald-600/80 flex items-center justify-center text-emerald-400">
                          <Radio className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <div className="font-bold text-[11px] flex items-center gap-1.5">
                            <span>Signaling &amp; Relay Boxes</span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-950/90 text-emerald-300 text-[9px] border border-emerald-700/50">
                              S&amp;T
                            </span>
                          </div>
                          <div className="text-[9.5px] text-slate-400">
                            Location boxes (LB), point machines &amp; DAC units
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-emerald-400">
                          {assetCounts.SIGNALING_BOX || 0}
                        </span>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            activeAssetTypes.SIGNALING_BOX
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'border-slate-700 bg-slate-950'
                          }`}
                        >
                          {activeAssetTypes.SIGNALING_BOX && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>

                    {/* Ballast Piles */}
                    <div
                      onClick={() => handleToggleAssetType('BALLAST_PILE')}
                      className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        activeAssetTypes.BALLAST_PILE
                          ? 'bg-orange-950/50 border-orange-500/70 text-slate-100'
                          : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-orange-950 border border-orange-600/80 flex items-center justify-center text-orange-400">
                          <Layers className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <div className="font-bold text-[11px] flex items-center gap-1.5">
                            <span>Ballast Piles &amp; Reserves</span>
                            <span className="px-1.5 py-0.2 rounded bg-orange-950/90 text-orange-300 text-[9px] border border-orange-700/50">
                              CIVIL
                            </span>
                          </div>
                          <div className="text-[9.5px] text-slate-400">
                            65mm stone aggregate depots &amp; deep bed reserves
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-orange-400">
                          {assetCounts.BALLAST_PILE || 0}
                        </span>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            activeAssetTypes.BALLAST_PILE
                              ? 'bg-orange-500 border-orange-400 text-slate-950'
                              : 'border-slate-700 bg-slate-950'
                          }`}
                        >
                          {activeAssetTypes.BALLAST_PILE && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>

                    {/* Turnouts & Switches */}
                    <div
                      onClick={() => handleToggleAssetType('TURNOUT_SWITCH')}
                      className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        activeAssetTypes.TURNOUT_SWITCH
                          ? 'bg-indigo-950/50 border-indigo-500/70 text-slate-100'
                          : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-indigo-950 border border-indigo-600/80 flex items-center justify-center text-indigo-400">
                          <GitFork className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <div className="font-bold text-[11px] flex items-center gap-1.5">
                            <span>Turnouts &amp; Switches</span>
                            <span className="px-1.5 py-0.2 rounded bg-indigo-950/90 text-indigo-300 text-[9px] border border-indigo-700/50">
                              CIVIL
                            </span>
                          </div>
                          <div className="text-[9.5px] text-slate-400">
                            1-in-12 curved switches &amp; scissors crossovers
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-indigo-400">
                          {assetCounts.TURNOUT_SWITCH || 0}
                        </span>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            activeAssetTypes.TURNOUT_SWITCH
                              ? 'bg-indigo-500 border-indigo-400 text-slate-950'
                              : 'border-slate-700 bg-slate-950'
                          }`}
                        >
                          {activeAssetTypes.TURNOUT_SWITCH && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick-toggle pill buttons for direct 1-click access */}
          <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-slate-800">
            <button
              type="button"
              onClick={() => handleToggleAssetType('OHE_GANTRY')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border transition-all ${
                activeAssetTypes.OHE_GANTRY
                  ? 'bg-amber-950 text-amber-300 border-amber-600'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-amber-400'
              }`}
              title="Toggle OHE Gantries layer"
            >
              <Zap className="w-2.5 h-2.5 text-amber-400" />
              <span>OHE ({assetCounts.OHE_GANTRY || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleAssetType('SIGNALING_BOX')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border transition-all ${
                activeAssetTypes.SIGNALING_BOX
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-emerald-400'
              }`}
              title="Toggle Signaling Boxes layer"
            >
              <Radio className="w-2.5 h-2.5 text-emerald-400" />
              <span>Signals ({assetCounts.SIGNALING_BOX || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleAssetType('BALLAST_PILE')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border transition-all ${
                activeAssetTypes.BALLAST_PILE
                  ? 'bg-orange-950 text-orange-300 border-orange-600'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-orange-400'
              }`}
              title="Toggle Ballast Piles layer"
            >
              <Layers className="w-2.5 h-2.5 text-orange-400" />
              <span>Ballast ({assetCounts.BALLAST_PILE || 0})</span>
            </button>
          </div>

          {/* Conflict filter */}
          <button
            type="button"
            onClick={() => setOnlyConflicts(!onlyConflicts)}
            className={`px-2 py-1 rounded-md border text-[11px] font-medium transition-all flex items-center gap-1 ${
              onlyConflicts
                ? 'bg-rose-950 text-rose-300 border-rose-600 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-rose-300'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Conflicts Only</span>
          </button>

          {/* Department Selector */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value as any)}
            className="px-2 py-1 rounded-md bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-mono focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Departments</option>
            <option value="ENGINEERING">Civil Engineering</option>
            <option value="S&T">Signaling &amp; Telecom</option>
            <option value="TRACTION">Electrical Traction</option>
          </select>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-700 ml-1">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle Sidebar Directory List Button */}
          <button
            type="button"
            id="btn-toggle-map-sidebar"
            onClick={() => {
              setShowSidebar(!showSidebar);
              railwayAudio.playBeep(showSidebar ? 650 : 800, 0.03);
            }}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-bold flex items-center gap-1.5 transition-all ml-1 ${
              showSidebar
                ? 'bg-sky-950 text-sky-300 border-sky-600 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title={showSidebar ? 'Hide Network Directory List' : 'Show Network Directory List'}
          >
            {showSidebar ? (
              <PanelLeftClose className="w-3.5 h-3.5 text-sky-400" />
            ) : (
              <PanelLeftOpen className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="hidden sm:inline">Directory</span>
            <span className="px-1 py-0.2 rounded bg-sky-900/60 text-[9.5px] text-sky-200 font-mono">
              {sidebarBlocks.length + sidebarAssets.length}
            </span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MAIN MAP WORKSPACE: SIDEBAR DIRECTORY & INTERACTIVE SVG MAP CANVAS
          ========================================================================= */}
      <div className="flex flex-col lg:flex-row w-full bg-[#050b1a] relative border-t border-sky-950/80">
        {/* SIDEBAR DIRECTORY (BLOCKS & ASSETS WITH AUTO-ZOOM TARGETING) */}
        {showSidebar && (
          <div
            id="mapview-sidebar-directory"
            className="w-full lg:w-80 xl:w-[350px] bg-[#070e24] border-b lg:border-b-0 lg:border-r border-sky-950/80 flex flex-col shrink-0 h-[520px] z-20 font-mono select-none"
          >
            {/* Sidebar Header */}
            <div className="p-3 border-b border-slate-800 bg-[#0a1433]/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-slate-100 tracking-wider uppercase">
                  Network Directory
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">
                  {sidebarBlocks.length + sidebarAssets.length} items
                </span>
                <button
                  type="button"
                  onClick={() => setShowSidebar(false)}
                  className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded lg:hidden"
                  title="Close sidebar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="p-2 border-b border-slate-800/80 bg-[#08102b]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Search blocks, assets, KM..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-700/80 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans"
                />
                {sidebarSearch && (
                  <button
                    type="button"
                    onClick={() => setSidebarSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Tabs: ALL | BLOCKS | ASSETS */}
              <div className="flex items-center gap-1 mt-2">
                <button
                  type="button"
                  id="tab-sidebar-all"
                  onClick={() => setSidebarTab('ALL')}
                  className={`flex-1 py-1 rounded text-[10px] font-bold transition-colors ${
                    sidebarTab === 'ALL'
                      ? 'bg-sky-950 text-sky-300 border border-sky-600'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({sidebarBlocks.length + sidebarAssets.length})
                </button>
                <button
                  type="button"
                  id="tab-sidebar-blocks"
                  onClick={() => setSidebarTab('BLOCKS')}
                  className={`flex-1 py-1 rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1 ${
                    sidebarTab === 'BLOCKS'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Blocks ({sidebarBlocks.length})
                </button>
                <button
                  type="button"
                  id="tab-sidebar-assets"
                  onClick={() => setSidebarTab('ASSETS')}
                  className={`flex-1 py-1 rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1 ${
                    sidebarTab === 'ASSETS'
                      ? 'bg-amber-950 text-amber-300 border border-amber-600'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Assets ({sidebarAssets.length})
                </button>
              </div>
            </div>

            {/* List Scroll Container */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-1.5 space-y-1 text-xs">
              {/* If no items match */}
              {((sidebarTab === 'ALL' && sidebarBlocks.length === 0 && sidebarAssets.length === 0) ||
                (sidebarTab === 'BLOCKS' && sidebarBlocks.length === 0) ||
                (sidebarTab === 'ASSETS' && sidebarAssets.length === 0)) && (
                <div className="p-6 text-center text-slate-500">
                  <AlertCircle className="w-6 h-6 mx-auto text-slate-600 mb-1.5" />
                  <p className="text-xs">No matching items found</p>
                  {sidebarSearch && (
                    <button
                      type="button"
                      onClick={() => setSidebarSearch('')}
                      className="mt-2 text-[10px] text-sky-400 hover:underline"
                    >
                      Clear search filter
                    </button>
                  )}
                </div>
              )}

              {/* Render BLOCKS in sidebar list */}
              {(sidebarTab === 'ALL' || sidebarTab === 'BLOCKS') &&
                sidebarBlocks.map((block) => {
                  const isSelected = selectedBlock?.blockId === block.blockId;
                  const isConflict = block.hasConflict || block.validationStatus !== 'VALID';

                  return (
                    <div
                      key={`sidebar-blk-${block.blockId}`}
                      id={`sidebar-block-item-${block.blockId}`}
                      onClick={() => handleSelectAndZoomBlock(block)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-sky-950/80 border-sky-400 shadow-md ring-1 ring-sky-400/50'
                          : 'bg-[#0b1430]/60 border-slate-800 hover:bg-[#0f1d45] hover:border-slate-700'
                      }`}
                      title="Click to automatically zoom & center map onto this block"
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isConflict ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'
                            }`}
                          />
                          <span className="font-bold text-white text-[11px] group-hover:text-sky-300 transition-colors">
                            {block.blockId}
                          </span>
                        </div>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                            isConflict
                              ? 'bg-rose-950 text-rose-300 border border-rose-700'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          }`}
                        >
                          {isConflict ? 'Conflict' : 'Validated'}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-300 line-clamp-1 mb-1">
                        <span className="text-sky-300 font-semibold">{block.corridorId}</span> • {block.section}
                      </div>

                      <div className="flex items-center justify-between text-[9.5px] text-slate-400 pt-1 border-t border-slate-800/80">
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-300/90 font-medium">{block.department}</span>
                          <span>•</span>
                          <span>
                            {block.startTime}–{block.endTime}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAndZoomBlock(block);
                          }}
                          className="flex items-center gap-1 text-[9px] text-sky-400 hover:text-sky-300 font-bold px-1.5 py-0.5 rounded bg-sky-950/60 border border-sky-800 hover:border-sky-500 transition-colors"
                          title="Auto-zoom and center onto this block"
                        >
                          <LocateFixed className="w-2.5 h-2.5" />
                          <span>Center</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

              {/* Render ASSETS in sidebar list */}
              {(sidebarTab === 'ALL' || sidebarTab === 'ASSETS') &&
                sidebarAssets.map((asset) => {
                  const isSelected = selectedTracksideAsset?.id === asset.id;
                  const categoryMeta = ASSET_TYPE_DEFINITIONS[asset.category];

                  return (
                    <div
                      key={`sidebar-asset-${asset.id}`}
                      id={`sidebar-asset-item-${asset.id}`}
                      onClick={() => handleSelectAndZoomAsset(asset)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-amber-950/70 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                          : 'bg-[#0b1430]/60 border-slate-800 hover:bg-[#0f1d45] hover:border-slate-700'
                      }`}
                      title="Click to automatically zoom & center map onto this asset"
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="p-1 rounded text-[10px] shrink-0"
                            style={{
                              backgroundColor:
                                asset.category === 'OHE_GANTRY'
                                  ? '#451a03'
                                  : asset.category === 'SIGNALING_BOX'
                                  ? '#064e3b'
                                  : asset.category === 'BALLAST_PILE'
                                  ? '#431407'
                                  : '#1e1b4b',
                              color: categoryMeta?.color || '#facc15',
                            }}
                          >
                            {asset.category === 'OHE_GANTRY' ? (
                              <Zap className="w-3 h-3" />
                            ) : asset.category === 'SIGNALING_BOX' ? (
                              <Radio className="w-3 h-3" />
                            ) : asset.category === 'BALLAST_PILE' ? (
                              <Layers className="w-3 h-3" />
                            ) : (
                              <GitFork className="w-3 h-3" />
                            )}
                          </span>
                          <span className="font-bold text-white text-[11px] group-hover:text-amber-300 transition-colors">
                            {asset.id}
                          </span>
                        </div>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            asset.condition === 'EXCELLENT' || asset.condition === 'GOOD'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : asset.condition === 'ATTENTION_REQUIRED'
                              ? 'bg-amber-950 text-amber-300 border border-amber-600'
                              : 'bg-rose-950 text-rose-300 border border-rose-700'
                          }`}
                        >
                          {asset.condition.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-300 line-clamp-1 mb-1">
                        <span className="text-amber-300 font-semibold">
                          {categoryMeta?.label || asset.category}
                        </span>
                        {' • '}
                        <span>KM {asset.chainageKm.toFixed(1)}</span> ({asset.corridorId})
                      </div>

                      <div className="flex items-center justify-between text-[9.5px] text-slate-400 pt-1 border-t border-slate-800/80">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                asset.healthIndex >= 80
                                  ? 'bg-emerald-400'
                                  : asset.healthIndex >= 60
                                  ? 'bg-amber-400'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${asset.healthIndex}%` }}
                            />
                          </div>
                          <span>{asset.healthIndex}%</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAndZoomAsset(asset);
                          }}
                          className="flex items-center gap-1 text-[9px] text-amber-400 hover:text-amber-300 font-bold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800 hover:border-amber-500 transition-colors"
                          title="Auto-zoom and center onto this asset"
                        >
                          <LocateFixed className="w-2.5 h-2.5" />
                          <span>Center</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* =========================================================================
            INTERACTIVE SVG MAP CANVAS CONTAINER
            ========================================================================= */}
        <div
          ref={svgContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="flex-1 relative h-[520px] bg-[#050b1a] overflow-hidden select-none cursor-grab active:cursor-grabbing min-w-0"
        >
        <svg
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Grid background pattern */}
            <pattern id="rail-grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#13203f" strokeWidth="0.8" opacity="0.6" />
              <circle cx="0" cy="0" r="1" fill="#1e3a8a" opacity="0.7" />
            </pattern>

            {/* Glowing filters */}
            <filter id="glow-sky" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-orange" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-yellow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-indigo" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Map Grid Background */}
          <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="url(#rail-grid-pattern)" />

          {/* Coordinate Marks along border */}
          <g className="text-[9px] font-mono fill-slate-600 select-none">
            <text x="14" y="24">29.45° N (PNP)</text>
            <text x="14" y={CANVAS_HEIGHT - 12}>28.10° N (PWL)</text>
            <text x="60" y={CANVAS_HEIGHT - 12}>76.55° E (ROK)</text>
            <text x={CANVAS_WIDTH - 90} y={CANVAS_HEIGHT - 12}>77.52° E (GZB)</text>
            <text x={CANVAS_WIDTH - 140} y="24">DELHI DIVISION CTC</text>
          </g>

          {/* =========================================================================
              LAYER 1: CORRIDOR TRACK ALIGNMENTS & SLEEPER TIES
              ========================================================================= */}
          {visibleCorridors.map((seg) => {
            if (!seg.stations || seg.stations.length < 2) return null;

            // Generate path coordinates
            const points = seg.stations.map((st) =>
              projectGeoToCanvas(st.latitude, st.longitude, CANVAS_WIDTH, CANVAS_HEIGHT, zoom, pan)
            );

            let d = `M ${points[0].x} ${points[0].y}`;
            for (let i = 1; i < points.length; i++) {
              d += ` L ${points[i].x} ${points[i].y}`;
            }

            return (
              <g key={`corridor-path-group-${seg.corridorId}`}>
                {/* Track bed underlay */}
                <path
                  d={d}
                  fill="none"
                  stroke="#020617"
                  strokeWidth={9 * zoom}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.8}
                />
                {/* Track ties (dashed ballast track) */}
                <path
                  d={d}
                  fill="none"
                  stroke="#334155"
                  strokeWidth={5 * zoom}
                  strokeDasharray={`${3 * zoom},${3 * zoom}`}
                  strokeLinecap="butt"
                />
                {/* Active Corridor Glow */}
                <path
                  d={d}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={2 * zoom}
                  strokeLinecap="round"
                  opacity={0.7}
                />
                {/* Corridor Code Tag */}
                <text
                  x={points[0].x + 12}
                  y={points[0].y + 12}
                  fill={seg.color}
                  fontSize={10 * zoom}
                  fontFamily="monospace"
                  fontWeight="bold"
                  opacity={0.9}
                >
                  {seg.corridorCode}
                </text>
              </g>
            );
          })}

          {/* =========================================================================
              LAYER 2: ACTIVE BLOCK POSSESSION ZONES (COLORED TRACK RIBBONS)
              ========================================================================= */}
          {showBlocks &&
            mappedBlocks.map(({ block, startPt, endPt, midPt }) => {
              const isConflict = block.hasConflict || block.validationStatus !== 'VALID';
              const isSelected = selectedBlock?.blockId === block.blockId;

              const strokeColor = isConflict ? '#ef4444' : '#10b981';
              const glowFilter = isConflict ? 'url(#glow-rose)' : 'url(#glow-emerald)';

              return (
                <g
                  key={`block-zone-${block.blockId}`}
                  className="cursor-pointer transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBlock(block);
                    setSelectedDefect(null);
                    setSelectedStation(null);
                    setSelectedTracksideAsset(null);
                    railwayAudio.playBeep(isConflict ? 900 : 750, 0.05);
                  }}
                  onMouseEnter={() => {
                    setHoveredEntity({
                      type: 'BLOCK',
                      id: block.blockId,
                      title: `${block.blockId}: ${block.department} BLOCK`,
                      subtitle: `${block.section} | ${block.startTime}–${block.endTime} (${block.durationMinutes}m)`,
                      x: midPt.x,
                      y: midPt.y,
                      badgeColor: strokeColor,
                    });
                  }}
                  onMouseLeave={() => setHoveredEntity(null)}
                >
                  {/* Outer Pulsing Aura for Conflicts */}
                  {isConflict && (
                    <line
                      x1={startPt.x}
                      y1={startPt.y}
                      x2={endPt.x}
                      y2={endPt.y}
                      stroke="#f43f5e"
                      strokeWidth={(isSelected ? 16 : 12) * zoom}
                      strokeLinecap="round"
                      opacity={0.4}
                      className="animate-pulse"
                    />
                  )}

                  {/* Block Zone Heavy Ribbon */}
                  <line
                    x1={startPt.x}
                    y1={startPt.y}
                    x2={endPt.x}
                    y2={endPt.y}
                    stroke={strokeColor}
                    strokeWidth={(isSelected ? 10 : 7) * zoom}
                    strokeLinecap="round"
                    filter={glowFilter}
                    opacity={0.85}
                  />

                  {/* Section Start & End Caps */}
                  <circle
                    cx={startPt.x}
                    cy={startPt.y}
                    r={(isSelected ? 5.5 : 4) * zoom}
                    fill={strokeColor}
                    stroke="#ffffff"
                    strokeWidth={1}
                  />
                  <circle
                    cx={endPt.x}
                    cy={endPt.y}
                    r={(isSelected ? 5.5 : 4) * zoom}
                    fill={strokeColor}
                    stroke="#ffffff"
                    strokeWidth={1}
                  />

                  {/* Mid-point Badge Icon */}
                  <g transform={`translate(${midPt.x}, ${midPt.y})`}>
                    <circle
                      cx={0}
                      cy={0}
                      r={(isSelected ? 11 : 9) * zoom}
                      fill="#090f22"
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    <text
                      x={0}
                      y={3.5 * zoom}
                      textAnchor="middle"
                      fill={strokeColor}
                      fontSize={8.5 * zoom}
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {isConflict ? '!' : 'BLK'}
                    </text>
                  </g>
                </g>
              );
            })}

          {/* =========================================================================
              LAYER 3: TRACKSIDE ASSET NODES (OHE GANTRIES, SIGNALING BOXES, BALLAST PILES)
              ========================================================================= */}
          {mappedAssets.map(({ asset, screenPt, overlappingBlock, correlatedDefect }) => {
            const isSelected = selectedTracksideAsset?.id === asset.id;
            const isAttention = asset.condition === 'ATTENTION_REQUIRED' || asset.condition === 'CRITICAL';
            const hasOverlappingBlock = Boolean(overlappingBlock);
            const hasDefect = Boolean(correlatedDefect);

            // Asset Type specific visual styling
            let primaryColor = '#facc15';
            let filterRef = 'url(#glow-yellow)';

            if (asset.category === 'SIGNALING_BOX') {
              primaryColor = '#34d399';
              filterRef = 'url(#glow-emerald)';
            } else if (asset.category === 'BALLAST_PILE') {
              primaryColor = '#fb923c';
              filterRef = 'url(#glow-orange)';
            } else if (asset.category === 'TURNOUT_SWITCH') {
              primaryColor = '#818cf8';
              filterRef = 'url(#glow-indigo)';
            }

            return (
              <g
                key={`trackside-asset-${asset.id}`}
                className="cursor-pointer transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTracksideAsset(asset);
                  setSelectedBlock(null);
                  setSelectedDefect(null);
                  setSelectedStation(null);
                  railwayAudio.playBeep(isAttention ? 920 : 820, 0.04);
                }}
                onMouseEnter={() => {
                  setHoveredEntity({
                    type: 'ASSET',
                    id: asset.id,
                    title: `${asset.name}`,
                    subtitle: `${ASSET_TYPE_DEFINITIONS[asset.category].label} | ${asset.section} (Health: ${asset.healthIndex}%)`,
                    x: screenPt.x,
                    y: screenPt.y,
                    badgeColor: primaryColor,
                    category: asset.category,
                    health: asset.healthIndex,
                    details: asset.planningRelevance,
                  });
                }}
                onMouseLeave={() => setHoveredEntity(null)}
              >
                {/* Pulsing Sonar Ring for Assets needing attention */}
                {isAttention && (
                  <circle
                    cx={screenPt.x}
                    cy={screenPt.y}
                    r={14 * zoom}
                    fill="none"
                    stroke={primaryColor}
                    strokeWidth="1.2"
                    opacity="0.75"
                    className="animate-ping"
                  />
                )}

                {/* Selection Halo */}
                {isSelected && (
                  <circle
                    cx={screenPt.x}
                    cy={screenPt.y}
                    r={15 * zoom}
                    fill="none"
                    stroke={primaryColor}
                    strokeWidth={2}
                    strokeDasharray="3,2"
                  />
                )}

                {/* Overlapping Maintenance Block Indicator Ring */}
                {hasOverlappingBlock && (
                  <circle
                    cx={screenPt.x}
                    cy={screenPt.y}
                    r={(isSelected ? 13 : 11) * zoom}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1.5"
                    opacity="0.8"
                  />
                )}

                {/* =========================================================================
                    RENDER SPECIFIC ASSET ICON MARKERS
                    ========================================================================= */}

                {/* 1. OHE GANTRY MARKER (Overhead Catenary Portal Frame + Lightning Spark) */}
                {asset.category === 'OHE_GANTRY' && (
                  <g transform={`translate(${screenPt.x}, ${screenPt.y}) scale(${zoom})`}>
                    {/* Dark backing base */}
                    <rect
                      x="-8"
                      y="-8"
                      width="16"
                      height="16"
                      rx="3"
                      fill="#0b1329"
                      stroke={isSelected ? '#ffffff' : primaryColor}
                      strokeWidth={isSelected ? 2 : 1.2}
                      filter={filterRef}
                    />
                    {/* Catenary Portal Frame: 2 vertical posts & top cross-girder */}
                    <line x1="-5" y1="5" x2="-5" y2="-4" stroke={primaryColor} strokeWidth="1.2" />
                    <line x1="5" y1="5" x2="5" y2="-4" stroke={primaryColor} strokeWidth="1.2" />
                    <line x1="-6" y1="-4" x2="6" y2="-4" stroke={primaryColor} strokeWidth="1.4" />
                    {/* Center spark / catenary insulator */}
                    <polygon
                      points="0,-3 -2.5,0.5 0,0.5 -1.5,4 2.5,-0.5 0,-0.5"
                      fill="#fef08a"
                    />
                  </g>
                )}

                {/* 2. SIGNALING BOX MARKER (Trackside Location Box Cubicle + Aspect LED) */}
                {asset.category === 'SIGNALING_BOX' && (
                  <g transform={`translate(${screenPt.x}, ${screenPt.y}) scale(${zoom})`}>
                    {/* Location box enclosure */}
                    <rect
                      x="-7.5"
                      y="-7.5"
                      width="15"
                      height="15"
                      rx="2.5"
                      fill="#064e3b"
                      stroke={isSelected ? '#ffffff' : primaryColor}
                      strokeWidth={isSelected ? 2 : 1.2}
                      filter={filterRef}
                    />
                    {/* Location Box Door Line */}
                    <line x1="0" y1="-5.5" x2="0" y2="5.5" stroke="#10b981" strokeWidth="0.8" />
                    {/* Signal Aspect Light Pip */}
                    <circle cx="-3" cy="-2.5" r="1.5" fill="#34d399" />
                    <circle cx="3" cy="-2.5" r="1.5" fill={isAttention ? '#f43f5e' : '#34d399'} />
                    {/* Internal circuit trace */}
                    <line x1="-3" y1="2.5" x2="3" y2="2.5" stroke="#a7f3d0" strokeWidth="1" strokeDasharray="1,1" />
                  </g>
                )}

                {/* 3. BALLAST PILE MARKER (Trapezoidal Stone Aggregate Mound + Stippled Rocks) */}
                {asset.category === 'BALLAST_PILE' && (
                  <g transform={`translate(${screenPt.x}, ${screenPt.y}) scale(${zoom})`}>
                    {/* Ballast Stockpile Aggregate Mound */}
                    <path
                      d="M -9 6 L -4 -5 L 4 -5 L 9 6 Z"
                      fill="#431407"
                      stroke={isSelected ? '#ffffff' : primaryColor}
                      strokeWidth={isSelected ? 2 : 1.3}
                      strokeLinejoin="round"
                      filter={filterRef}
                    />
                    {/* Horizontal Layer Compaction Line */}
                    <line x1="-5" y1="1" x2="5" y2="1" stroke="#fdba74" strokeWidth="0.9" opacity="0.8" />
                    {/* Aggregate Rock Dots */}
                    <circle cx="-1.5" cy="-2" r="0.9" fill="#ffedd5" />
                    <circle cx="2" cy="-1.5" r="0.8" fill="#ffedd5" />
                    <circle cx="-4" cy="3.5" r="0.9" fill="#fed7aa" />
                    <circle cx="0" cy="3.5" r="1.0" fill="#fed7aa" />
                    <circle cx="4" cy="3.5" r="0.9" fill="#fed7aa" />
                  </g>
                )}

                {/* 4. TURNOUT SWITCH MARKER (Branching Rail Divergence) */}
                {asset.category === 'TURNOUT_SWITCH' && (
                  <g transform={`translate(${screenPt.x}, ${screenPt.y}) scale(${zoom})`}>
                    <circle
                      cx="0"
                      cy="0"
                      r="8"
                      fill="#1e1b4b"
                      stroke={isSelected ? '#ffffff' : primaryColor}
                      strokeWidth={isSelected ? 2 : 1.2}
                      filter={filterRef}
                    />
                    {/* Straight Rail */}
                    <line x1="-5" y1="4" x2="5" y2="4" stroke="#c7d2fe" strokeWidth="1.2" />
                    {/* Diverging Switch Blade */}
                    <path d="M -4 4 Q 0 2 4 -3" fill="none" stroke="#818cf8" strokeWidth="1.4" />
                    <circle cx="4" cy="-3" r="1.5" fill="#a5b4fc" />
                  </g>
                )}

                {/* Small Chainage Label if high zoom */}
                {zoom >= 1.6 && (
                  <text
                    x={screenPt.x}
                    y={screenPt.y + 13 * zoom}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize={7 * zoom}
                    fontFamily="monospace"
                    fontWeight="bold"
                    stroke="#020617"
                    strokeWidth="1.5"
                    paintOrder="stroke"
                  >
                    KM {asset.chainageKm.toFixed(1)}
                  </text>
                )}
              </g>
            );
          })}

          {/* =========================================================================
              LAYER 4: STATIONS & JUNCTION NODES
              ========================================================================= */}
          {showStations &&
            visibleCorridors.map((seg) =>
              seg.stations.map((st) => {
                const pt = projectGeoToCanvas(
                  st.latitude,
                  st.longitude,
                  CANVAS_WIDTH,
                  CANVAS_HEIGHT,
                  zoom,
                  pan
                );
                const isSelected = selectedStation?.code === st.code;

                return (
                  <g
                    key={`station-node-${seg.corridorId}-${st.code}`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStation(st);
                      setSelectedBlock(null);
                      setSelectedDefect(null);
                      setSelectedTracksideAsset(null);
                      railwayAudio.playBeep(650, 0.03);
                    }}
                    onMouseEnter={() => {
                      setHoveredEntity({
                        type: 'STATION',
                        id: st.code,
                        title: `${st.code} — ${st.name}`,
                        subtitle: `${seg.corridorCode} | KM ${st.chainageKm.toFixed(1)} (${
                          st.isJunction ? 'Junction Hub' : 'Station Node'
                        })`,
                        x: pt.x,
                        y: pt.y,
                        badgeColor: seg.color,
                      });
                    }}
                    onMouseLeave={() => setHoveredEntity(null)}
                  >
                    {st.isJunction ? (
                      // Junction Hub Marker
                      <g>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={(isSelected ? 9 : 7) * zoom}
                          fill="#0f172a"
                          stroke={seg.color}
                          strokeWidth={2}
                        />
                        <circle cx={pt.x} cy={pt.y} r={3 * zoom} fill={seg.color} />
                        <text
                          x={pt.x}
                          y={pt.y - 10 * zoom}
                          textAnchor="middle"
                          fill="#f8fafc"
                          fontSize={9.5 * zoom}
                          fontFamily="monospace"
                          fontWeight="bold"
                          stroke="#020617"
                          strokeWidth="2.5"
                          paintOrder="stroke"
                        >
                          {st.code}
                        </text>
                      </g>
                    ) : (
                      // Intermediate Station Marker
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={(isSelected ? 5 : 3.5) * zoom}
                        fill="#0b1329"
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                      />
                    )}
                  </g>
                );
              })
            )}

          {/* =========================================================================
              LAYER 5: CURRENT DEFECT LOCATIONS (PULSING HAZARD NODES)
              ========================================================================= */}
          {showDefects &&
            mappedDefects.map(({ defect, screenPt }) => {
              const isCritical = defect.severity === 'CRITICAL';
              const isHigh = defect.severity === 'HIGH';
              const isSelected = selectedDefect?.defectId === defect.defectId;

              const defectColor = isCritical
                ? '#f43f5e' // rose-500
                : isHigh
                ? '#f59e0b' // amber-500
                : '#38bdf8'; // sky-400

              return (
                <g
                  key={`defect-marker-${defect.defectId}`}
                  className="cursor-pointer transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDefect(defect);
                    setSelectedBlock(null);
                    setSelectedStation(null);
                    setSelectedTracksideAsset(null);
                    railwayAudio.playBeep(isCritical ? 950 : 800, 0.05);
                  }}
                  onMouseEnter={() => {
                    setHoveredEntity({
                      type: 'DEFECT',
                      id: defect.defectId,
                      title: `${defect.defectId}: ${defect.severity} DEFECT`,
                      subtitle: `${defect.defectType} | Asset ${defect.assetId} (${defect.corridorId})`,
                      x: screenPt.x,
                      y: screenPt.y,
                      badgeColor: defectColor,
                    });
                  }}
                  onMouseLeave={() => setHoveredEntity(null)}
                >
                  {/* Pulsing Sonar Ring for Critical Defects */}
                  {isCritical && (
                    <circle
                      cx={screenPt.x}
                      cy={screenPt.y}
                      r={15 * zoom}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="1.5"
                      opacity="0.8"
                      className="animate-ping"
                    />
                  )}

                  {/* Defect Outer Halo */}
                  <circle
                    cx={screenPt.x}
                    cy={screenPt.y}
                    r={(isSelected ? 9 : isCritical ? 7.5 : 5.5) * zoom}
                    fill={isCritical ? '#881337' : isHigh ? '#78350f' : '#0c4a6e'}
                    stroke={defectColor}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter={isCritical ? 'url(#glow-rose)' : 'url(#glow-amber)'}
                  />

                  {/* Inner Warning Core */}
                  <circle cx={screenPt.x} cy={screenPt.y} r={2.5 * zoom} fill="#ffffff" />
                </g>
              );
            })}

          {/* =========================================================================
              LAYER 6: AUTO-ZOOM TARGET FOCUS PING & LOCK-ON RADAR RETICLE
              ========================================================================= */}
          {targetPing && (() => {
            const baseScreenPt = projectGeoToCanvas(
              targetPing.lat,
              targetPing.lng,
              CANVAS_WIDTH,
              CANVAS_HEIGHT,
              zoom,
              pan
            );
            const lateralScale = Math.min(zoom, 1.4);
            const px = baseScreenPt.x + (targetPing.lateralOffset?.x || 0) * lateralScale;
            const py = baseScreenPt.y + (targetPing.lateralOffset?.y || 0) * lateralScale;

            return (
              <g transform={`translate(${px}, ${py})`} className="pointer-events-none">
                {/* Sonar pulse ring */}
                <circle
                  cx={0}
                  cy={0}
                  r={32 * Math.min(zoom, 1.5)}
                  fill="none"
                  stroke={targetPing.color}
                  strokeWidth={2}
                  opacity={0.8}
                  className="animate-ping"
                />
                <circle
                  cx={0}
                  cy={0}
                  r={20 * Math.min(zoom, 1.5)}
                  fill="none"
                  stroke={targetPing.color}
                  strokeWidth={1.8}
                  opacity={0.7}
                />
                <circle
                  cx={0}
                  cy={0}
                  r={7 * Math.min(zoom, 1.5)}
                  fill={targetPing.color}
                  opacity={0.4}
                />

                {/* Reticle targeting crosshairs */}
                <line
                  x1={-24 * Math.min(zoom, 1.5)}
                  y1={0}
                  x2={24 * Math.min(zoom, 1.5)}
                  y2={0}
                  stroke={targetPing.color}
                  strokeWidth={1.5}
                  strokeDasharray="4,2"
                />
                <line
                  x1={0}
                  y1={-24 * Math.min(zoom, 1.5)}
                  x2={0}
                  y2={24 * Math.min(zoom, 1.5)}
                  stroke={targetPing.color}
                  strokeWidth={1.5}
                  strokeDasharray="4,2"
                />

                {/* Target Locked Badge */}
                <rect
                  x={-60}
                  y={-38}
                  width={120}
                  height={18}
                  rx={4}
                  fill="#030712"
                  stroke={targetPing.color}
                  strokeWidth={1}
                  opacity={0.92}
                />
                <text
                  x={0}
                  y={-26}
                  textAnchor="middle"
                  fill={targetPing.color}
                  fontSize={8.5}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  TARGET LOCKED
                </text>
              </g>
            );
          })()}
        </svg>

        {/* =========================================================================
            HOVER TOOLTIP OVERLAY
            ========================================================================= */}
        {hoveredEntity && (
          <div
            className="absolute pointer-events-none z-30 px-3 py-2 rounded-lg bg-slate-950/95 border border-slate-700 shadow-2xl text-xs font-mono text-slate-200 max-w-sm"
            style={{
              left: Math.max(12, Math.min(hoveredEntity.x - 90, CANVAS_WIDTH - 280)),
              top: Math.max(12, hoveredEntity.y - 65),
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: hoveredEntity.badgeColor || '#38bdf8' }}
              />
              <span className="font-bold text-slate-100">{hoveredEntity.title}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{hoveredEntity.subtitle}</div>
            {hoveredEntity.details && (
              <div className="text-[9.5px] text-amber-300 mt-1 italic line-clamp-2 border-t border-slate-800 pt-1">
                Context: {hoveredEntity.details}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            DOCKED INSPECTOR CARD (FOR SELECTED BLOCK, DEFECT, STATION, OR ASSET)
            ========================================================================= */}
        <AnimatePresence>
          {(selectedBlock || selectedDefect || selectedStation || selectedTracksideAsset) && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              className="absolute bottom-3 left-3 right-3 md:left-auto md:right-3 md:w-[410px] z-40 bg-[#0c1630]/95 backdrop-blur-md border border-sky-600/70 rounded-xl p-4 shadow-2xl font-mono text-xs text-slate-200 max-h-[460px] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  {/* Selected Trackside Asset Header */}
                  {selectedTracksideAsset && (
                    <>
                      <span
                        className="p-1 rounded border"
                        style={{
                          backgroundColor:
                            selectedTracksideAsset.category === 'OHE_GANTRY'
                              ? '#451a03'
                              : selectedTracksideAsset.category === 'SIGNALING_BOX'
                              ? '#064e3b'
                              : '#431407',
                          borderColor:
                            selectedTracksideAsset.category === 'OHE_GANTRY'
                              ? '#f59e0b'
                              : selectedTracksideAsset.category === 'SIGNALING_BOX'
                              ? '#10b981'
                              : '#f97316',
                          color: '#ffffff',
                        }}
                      >
                        {selectedTracksideAsset.category === 'OHE_GANTRY' ? (
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                        ) : selectedTracksideAsset.category === 'SIGNALING_BOX' ? (
                          <Radio className="w-3.5 h-3.5 text-emerald-400" />
                        ) : selectedTracksideAsset.category === 'BALLAST_PILE' ? (
                          <Layers className="w-3.5 h-3.5 text-orange-400" />
                        ) : (
                          <GitFork className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                      </span>
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                          <span>{selectedTracksideAsset.id}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              selectedTracksideAsset.condition === 'EXCELLENT' ||
                              selectedTracksideAsset.condition === 'GOOD'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                : selectedTracksideAsset.condition === 'ATTENTION_REQUIRED'
                                ? 'bg-amber-950 text-amber-300 border border-amber-600 animate-pulse'
                                : 'bg-rose-950 text-rose-300 border border-rose-600'
                            }`}
                          >
                            {selectedTracksideAsset.condition.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Selected Block Header */}
                  {selectedBlock && (
                    <>
                      <span className="p-1 rounded bg-emerald-950 border border-emerald-600 text-emerald-400">
                        <Wrench className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-bold text-sm text-white">{selectedBlock.blockId}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          selectedBlock.hasConflict
                            ? 'bg-rose-950 text-rose-300 border border-rose-600'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        }`}
                      >
                        {selectedBlock.hasConflict ? 'CONFLICT FLAGGED' : 'VALIDATED'}
                      </span>
                    </>
                  )}

                  {/* Selected Defect Header */}
                  {selectedDefect && (
                    <>
                      <span
                        className={`p-1 rounded border ${
                          selectedDefect.severity === 'CRITICAL'
                            ? 'bg-rose-950 border-rose-600 text-rose-400'
                            : 'bg-amber-950 border-amber-600 text-amber-400'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-bold text-sm text-white">{selectedDefect.defectId}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          selectedDefect.severity === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300 border border-rose-600 animate-pulse'
                            : 'bg-amber-950 text-amber-300 border border-amber-600'
                        }`}
                      >
                        {selectedDefect.severity}
                      </span>
                    </>
                  )}

                  {/* Selected Station Header */}
                  {selectedStation && (
                    <>
                      <span className="p-1 rounded bg-sky-950 border border-sky-600 text-sky-400">
                        <Train className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-bold text-sm text-white">{selectedStation.code}</span>
                      <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-700 text-[9px] font-bold">
                        {selectedStation.isJunction ? 'JUNCTION HUB' : 'STATION NODE'}
                      </span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedBlock(null);
                    setSelectedDefect(null);
                    setSelectedStation(null);
                    setSelectedTracksideAsset(null);
                  }}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* =========================================================================
                  ASSET MAINTENANCE CONTEXT CARD (SPECIFIC TO ASSET LAYERS)
                  ========================================================================= */}
              {selectedTracksideAsset && (
                <div className="space-y-2.5">
                  <div>
                    <span className="text-slate-400 text-[10px] block">
                      {ASSET_TYPE_DEFINITIONS[selectedTracksideAsset.category].label.toUpperCase()} NAME:
                    </span>
                    <h4 className="font-bold text-white text-xs mt-0.5">
                      {selectedTracksideAsset.name}
                    </h4>
                  </div>

                  {/* Health Index Meter Bar */}
                  <div className="p-2 bg-slate-900/90 rounded border border-slate-800">
                    <div className="flex items-center justify-between text-[10px] mb-1 font-bold">
                      <span className="text-slate-400">Asset Health Score</span>
                      <span
                        className={
                          selectedTracksideAsset.healthIndex >= 85
                            ? 'text-emerald-400'
                            : selectedTracksideAsset.healthIndex >= 70
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }
                      >
                        {selectedTracksideAsset.healthIndex}% / 100
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          selectedTracksideAsset.healthIndex >= 85
                            ? 'bg-emerald-500'
                            : selectedTracksideAsset.healthIndex >= 70
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${selectedTracksideAsset.healthIndex}%` }}
                      />
                    </div>
                  </div>

                  {/* Geospatial & Department details */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Corridor &amp; Chainage:</span>
                      <span className="font-bold text-sky-300">
                        {selectedTracksideAsset.corridorId} (KM {selectedTracksideAsset.chainageKm.toFixed(1)})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Department:</span>
                      <span className="font-semibold text-amber-300">{selectedTracksideAsset.department}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Next Due Inspection:</span>
                      <span className="font-bold text-slate-200">
                        {selectedTracksideAsset.nextScheduledMaintenance}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Required Window:</span>
                      <span className="font-bold text-slate-200">
                        {selectedTracksideAsset.maintenanceWindowRequiredMinutes} mins
                      </span>
                    </div>
                  </div>

                  {/* Technical Specifications list */}
                  <div className="p-2 bg-slate-900/60 rounded border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">
                      Technical Parameters:
                    </span>
                    <div className="grid grid-cols-1 gap-1 text-[10.5px]">
                      {selectedTracksideAsset.specifications.map((spec, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-slate-400">{spec.label}:</span>
                          <span className="text-slate-200 font-semibold">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Maintenance Planning Context Rationale */}
                  <div className="p-2.5 bg-sky-950/40 rounded-lg border border-sky-600/40 text-[10.5px] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-sky-300 font-bold text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                      <span>Maintenance Planning Context:</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {selectedTracksideAsset.maintenanceContextNotes}
                    </p>
                    <div className="text-[10px] text-amber-300 font-semibold pt-1 border-t border-sky-900/60">
                      Relevance: {selectedTracksideAsset.planningRelevance}
                    </div>
                  </div>

                  {/* Correlated Active Block Notification if present */}
                  {selectedTracksideAsset.associatedBlockId && (
                    <div className="p-2 bg-emerald-950/40 rounded border border-emerald-600/50 flex items-center justify-between text-[10.5px]">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">
                          Overlaps Active Block: <span className="font-bold">{selectedTracksideAsset.associatedBlockId}</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate('timeline', { blockId: selectedTracksideAsset.associatedBlockId })}
                        className="px-2 py-0.5 rounded bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-[10px] font-bold"
                      >
                        Inspect Block
                      </button>
                    </div>
                  )}

                  {/* Correlated Active Defect Notification if present */}
                  {selectedTracksideAsset.associatedDefectId && (
                    <div className="p-2 bg-rose-950/40 rounded border border-rose-600/50 flex items-center justify-between text-[10.5px]">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-rose-300">
                          Active Defect: <span className="font-bold">{selectedTracksideAsset.associatedDefectId}</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate('defect_reporting', { defectId: selectedTracksideAsset.associatedDefectId })}
                        className="px-2 py-0.5 rounded bg-rose-900 hover:bg-rose-800 text-rose-200 text-[10px] font-bold"
                      >
                        View Defect
                      </button>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate('requests', {
                          assetId: selectedTracksideAsset.assetId || selectedTracksideAsset.id,
                          corridorId: selectedTracksideAsset.corridorId,
                        })
                      }
                      className="flex-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Plan Block For Asset</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate('maintenance_assets', {
                          assetId: selectedTracksideAsset.assetId || selectedTracksideAsset.id,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                      title="Inspect in Fleet Management"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Fleet Details</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Block Details */}
              {selectedBlock && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Corridor &amp; Section:</span>
                      <span className="font-bold text-sky-300">
                        {selectedBlock.corridorId} ({selectedBlock.section})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Window &amp; Duration:</span>
                      <span className="font-bold text-slate-200">
                        {selectedBlock.startTime}–{selectedBlock.endTime} ({selectedBlock.durationMinutes}m)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Department:</span>
                      <span className="font-semibold text-amber-300">{selectedBlock.department}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Assigned Asset:</span>
                      <span className="font-semibold text-slate-200">{selectedBlock.assetId}</span>
                    </div>
                  </div>

                  {selectedBlock.explainability?.whyThisSlot &&
                    selectedBlock.explainability.whyThisSlot.length > 0 && (
                      <div className="p-2 bg-slate-900/80 rounded border border-slate-800 text-[10.5px] text-slate-300">
                        <span className="text-sky-400 font-bold block mb-1">AI Slot Selection Rationale:</span>
                        <p className="line-clamp-2 italic">{selectedBlock.explainability.whyThisSlot[0]}</p>
                      </div>
                    )}

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigate('timeline', { blockId: selectedBlock.blockId })}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Inspect in Timeline</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    {selectedBlock.hasConflict && (
                      <button
                        type="button"
                        onClick={() => onNavigate('conflicts', { conflictId: selectedBlock.conflictId })}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Defect Details */}
              {selectedDefect && (
                <div className="space-y-2">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Defect Classification:</span>
                    <span className="font-bold text-slate-100 text-xs">{selectedDefect.defectType}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Corridor &amp; Asset:</span>
                      <span className="font-bold text-sky-300">
                        {selectedDefect.corridorId} ({selectedDefect.assetId})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Chainage:</span>
                      <span className="font-bold text-slate-200">
                        {selectedDefect.geoCoordinates?.railwayChainageKm || 'Corridor Track Sector'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Speed Caution Order:</span>
                      <span
                        className={`font-bold ${
                          selectedDefect.speedRestrictionKmph ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {selectedDefect.speedRestrictionKmph
                          ? `${selectedDefect.speedRestrictionKmph} km/h Imposed`
                          : 'Normal Speed'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Status:</span>
                      <span className="font-bold text-emerald-400">{selectedDefect.status}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigate('defect_reporting', { defectId: selectedDefect.defectId })}
                      className="w-full px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Open in Defect Registry</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Station Details */}
              {selectedStation && (
                <div className="space-y-2">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Station Name:</span>
                    <span className="font-bold text-slate-100 text-sm">{selectedStation.name}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Corridor Line:</span>
                      <span className="font-bold text-sky-300">{selectedStation.corridorId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Track Chainage:</span>
                      <span className="font-bold text-slate-200">KM {selectedStation.chainageKm.toFixed(1)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Latitude:</span>
                      <span className="text-slate-300">{selectedStation.latitude.toFixed(4)}°N</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Longitude:</span>
                      <span className="text-slate-300">{selectedStation.longitude.toFixed(4)}°E</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigate('corridors', { corridorId: selectedStation.corridorId })}
                      className="w-full px-3 py-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-600 text-sky-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>View Corridor Operations</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>

      {/* =========================================================================
          MAP LEGEND & QUICK ACTIONS FOOTER
          ========================================================================= */}
      <div className="p-3 bg-[#080f24] border-t border-sky-900/40 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
        {/* Legend with Asset Types */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-slate-500 font-bold uppercase text-[10px]">LEGEND:</span>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-300">Valid Block</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-rose-300 font-bold">Conflict Block</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-300"></span>
            <span className="text-rose-300">Defect</span>
          </div>

          {/* Specific Asset Legend Items */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-950 border border-amber-500 flex items-center justify-center text-[8px] text-amber-300">
              ⚡
            </span>
            <span className="text-amber-300">OHE Gantry</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-500 flex items-center justify-center text-[8px] text-emerald-300">
              ⌧
            </span>
            <span className="text-emerald-300">Signaling Box</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-orange-950 border border-orange-500 flex items-center justify-center text-[8px] text-orange-300">
              ▲
            </span>
            <span className="text-orange-300">Ballast Pile</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-sky-400"></span>
            <span className="text-sky-300">Junction Hub</span>
          </div>
        </div>

        {/* Quick Nav shortcuts */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('corridors')}
            className="text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
          >
            <span>Corridor Operations</span>
            <ChevronRight className="w-3 h-3" />
          </button>
          <span className="text-slate-700">|</span>
          <button
            type="button"
            onClick={() => onNavigate('timeline')}
            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
          >
            <span>Block Timeline</span>
            <ChevronRight className="w-3 h-3" />
          </button>
          <span className="text-slate-700">|</span>
          <button
            type="button"
            onClick={() => onNavigate('maintenance_assets')}
            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
          >
            <span>Asset Fleet</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export { CommandCenterMapPreview as MapView };
export default CommandCenterMapPreview;
