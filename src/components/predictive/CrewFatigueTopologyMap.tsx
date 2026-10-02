import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Zap,
  Wrench,
  Radio,
  Clock,
  RefreshCw,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  MapPin,
  HelpCircle,
  FileText,
  AlertCircle,
  TrendingDown,
  Navigation,
} from 'lucide-react';
import {
  CrewFatigueProfile,
  DepartmentType,
  FatigueRiskTier,
  FatigueAnalysisResult,
  Corridor,
} from '../../types';
import {
  crewFatigueService,
  HISTORICAL_SAFETY_INCIDENTS,
  CIRCADIAN_24H_CYCLE,
} from '../../services/crewFatigueService';
import { crewFatigueNotificationService } from '../../services/crewFatigueNotificationService';
import { mockStore } from '../../services/api';

interface CrewFatigueTopologyMapProps {
  corridors?: Corridor[];
  onNavigate?: (screen: string, itemData?: any) => void;
  onRefreshData?: () => void;
}

// Corridor topology layout nodes definition for schematic visualization
interface TopologyStationNode {
  id: string;
  name: string;
  code: string;
  chainageKm: number;
  corridorId: string;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  isJunction?: boolean;
}

interface TopologyTrackSegment {
  id: string;
  corridorId: string;
  fromStationId: string;
  toStationId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  startKm: number;
  endKm: number;
  trackName: string;
}

// Schematic coordinates for the 4 primary corridors
const TOPOLOGY_STATIONS: TopologyStationNode[] = [
  // C001: Northern Main Trunk (Central Junction -> Ghaziabad -> Palwal -> Mathura)
  { id: 'STN-NDLS', name: 'New Delhi Central', code: 'NDLS', chainageKm: 0, corridorId: 'C001', x: 20, y: 32, isJunction: true },
  { id: 'STN-GZB', name: 'Ghaziabad Junction', code: 'GZB', chainageKm: 25, corridorId: 'C001', x: 42, y: 22, isJunction: true },
  { id: 'STN-BVH', name: 'Ballabgarh Yard', code: 'BVH', chainageKm: 42, corridorId: 'C001', x: 38, y: 44 },
  { id: 'STN-PWL', name: 'Palwal Station', code: 'PWL', chainageKm: 65, corridorId: 'C001', x: 55, y: 52 },
  { id: 'STN-KSV', name: 'Kosi Kalan Outer', code: 'KSV', chainageKm: 85, corridorId: 'C001', x: 72, y: 62 },
  { id: 'STN-MTJ', name: 'Mathura South Gateway', code: 'MTJ', chainageKm: 110, corridorId: 'C001', x: 88, y: 70, isJunction: true },

  // C002: Western DFC Spur (Central -> Gurgaon -> Rewari -> Ateli -> Phulera)
  { id: 'STN-GGN', name: 'Gurgaon Tech Spur', code: 'GGN', chainageKm: 22, corridorId: 'C002', x: 26, y: 54 },
  { id: 'STN-RE', name: 'Rewari DFC Junction', code: 'RE', chainageKm: 55, corridorId: 'C002', x: 36, y: 72, isJunction: true },
  { id: 'STN-AEL', name: 'Ateli Freight Yard', code: 'AEL', chainageKm: 92, corridorId: 'C002', x: 50, y: 84 },
  { id: 'STN-FL', name: 'Phulera Terminal', code: 'FL', chainageKm: 135, corridorId: 'C002', x: 68, y: 90, isJunction: true },

  // C003: Western Heavy Freight & Coal Line (Delhi Cantt -> Bahadurgarh -> Sampla -> Rohtak)
  { id: 'STN-DEC', name: 'Delhi Cantt West', code: 'DEC', chainageKm: 12, corridorId: 'C003', x: 16, y: 48 },
  { id: 'STN-BGZ', name: 'Bahadurgarh Freight', code: 'BGZ', chainageKm: 32, corridorId: 'C003', x: 14, y: 66 },
  { id: 'STN-SPZ', name: 'Sampla Loop Line', code: 'SPZ', chainageKm: 52, corridorId: 'C003', x: 18, y: 82 },
  { id: 'STN-ROK', name: 'Rohtak DFC Interchange', code: 'ROK', chainageKm: 78, corridorId: 'C003', x: 24, y: 94, isJunction: true },

  // C004: Eastern Chord (Ghaziabad Gateway -> Anand Vihar -> Sahibabad -> Aligarh Outer)
  { id: 'STN-ANVR', name: 'Anand Vihar Terminal', code: 'ANVR', chainageKm: 14, corridorId: 'C004', x: 34, y: 16 },
  { id: 'STN-SBB', name: 'Sahibabad Crossover', code: 'SBB', chainageKm: 30, corridorId: 'C004', x: 54, y: 18 },
  { id: 'STN-ALJN', name: 'Aligarh Express Chord', code: 'ALJN', chainageKm: 88, corridorId: 'C004', x: 80, y: 26, isJunction: true },
];

const TOPOLOGY_TRACKS: TopologyTrackSegment[] = [
  // C001 Tracks
  { id: 'TRK-C001-1', corridorId: 'C001', fromStationId: 'STN-NDLS', toStationId: 'STN-GZB', x1: 20, y1: 32, x2: 42, y2: 22, startKm: 0, endKm: 25, trackName: 'Delhi-Ghaziabad Quad Line' },
  { id: 'TRK-C001-2', corridorId: 'C001', fromStationId: 'STN-NDLS', toStationId: 'STN-BVH', x1: 20, y1: 32, x2: 38, y2: 44, startKm: 0, endKm: 42, trackName: 'Delhi-Ballabgarh Main' },
  { id: 'TRK-C001-3', corridorId: 'C001', fromStationId: 'STN-BVH', toStationId: 'STN-PWL', x1: 38, y1: 44, x2: 55, y2: 52, startKm: 42, endKm: 65, trackName: 'Ballabgarh-Palwal Block Section' },
  { id: 'TRK-C001-4', corridorId: 'C001', fromStationId: 'STN-PWL', toStationId: 'STN-KSV', x1: 55, y1: 52, x2: 72, y2: 62, startKm: 65, endKm: 85, trackName: 'Palwal-Kosi Kalan Fast Line' },
  { id: 'TRK-C001-5', corridorId: 'C001', fromStationId: 'STN-KSV', toStationId: 'STN-MTJ', x1: 72, y1: 62, x2: 88, y2: 70, startKm: 85, endKm: 110, trackName: 'Kosi Kalan-Mathura Gateway' },

  // C002 Tracks
  { id: 'TRK-C002-1', corridorId: 'C002', fromStationId: 'STN-NDLS', toStationId: 'STN-GGN', x1: 20, y1: 32, x2: 26, y2: 54, startKm: 0, endKm: 22, trackName: 'Delhi-Gurgaon Dual Line' },
  { id: 'TRK-C002-2', corridorId: 'C002', fromStationId: 'STN-GGN', toStationId: 'STN-RE', x1: 26, y1: 54, x2: 36, y2: 72, startKm: 22, endKm: 55, trackName: 'Gurgaon-Rewari Heavy DFC' },
  { id: 'TRK-C002-3', corridorId: 'C002', fromStationId: 'STN-RE', toStationId: 'STN-AEL', x1: 36, y1: 72, x2: 50, y2: 84, startKm: 55, endKm: 92, trackName: 'Rewari-Ateli Freight Section' },
  { id: 'TRK-C002-4', corridorId: 'C002', fromStationId: 'STN-AEL', toStationId: 'STN-FL', x1: 50, y1: 84, x2: 68, y2: 90, startKm: 92, endKm: 135, trackName: 'Ateli-Phulera DFC Spur' },

  // C003 Tracks
  { id: 'TRK-C003-1', corridorId: 'C003', fromStationId: 'STN-NDLS', toStationId: 'STN-DEC', x1: 20, y1: 32, x2: 16, y2: 48, startKm: 0, endKm: 12, trackName: 'Delhi-Cantt Branch' },
  { id: 'TRK-C003-2', corridorId: 'C003', fromStationId: 'STN-DEC', toStationId: 'STN-BGZ', x1: 16, y1: 48, x2: 14, y2: 66, startKm: 12, endKm: 32, trackName: 'Cantt-Bahadurgarh Heavy Coal' },
  { id: 'TRK-C003-3', corridorId: 'C003', fromStationId: 'STN-BGZ', toStationId: 'STN-SPZ', x1: 14, y1: 66, x2: 18, y2: 82, startKm: 32, endKm: 52, trackName: 'Bahadurgarh-Sampla Loop' },
  { id: 'TRK-C003-4', corridorId: 'C003', fromStationId: 'STN-SPZ', toStationId: 'STN-ROK', x1: 18, y1: 82, x2: 24, y2: 94, startKm: 52, endKm: 78, trackName: 'Sampla-Rohtak Line' },

  // C004 Tracks
  { id: 'TRK-C004-1', corridorId: 'C004', fromStationId: 'STN-NDLS', toStationId: 'STN-ANVR', x1: 20, y1: 32, x2: 34, y2: 16, startKm: 0, endKm: 14, trackName: 'Delhi-Anand Vihar Chord' },
  { id: 'TRK-C004-2', corridorId: 'C004', fromStationId: 'STN-ANVR', toStationId: 'STN-SBB', x1: 34, y1: 16, x2: 54, y2: 18, startKm: 14, endKm: 30, trackName: 'Anand Vihar-Sahibabad Interlock' },
  { id: 'TRK-C004-3', corridorId: 'C004', fromStationId: 'STN-SBB', toStationId: 'STN-ALJN', x1: 54, y1: 18, x2: 80, y2: 26, startKm: 30, endKm: 88, trackName: 'Sahibabad-Aligarh High Speed' },
];

export const CrewFatigueTopologyMap: React.FC<CrewFatigueTopologyMapProps> = ({
  corridors = mockStore.getCorridors(),
  onNavigate,
  onRefreshData,
}) => {
  // Live Crew Fatigue state from crewFatigueService
  const [analysis, setAnalysis] = useState<FatigueAnalysisResult>(() =>
    crewFatigueService.computeAnalysis()
  );
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<'ALL' | DepartmentType>('ALL');
  const [riskTierFilter, setRiskTierFilter] = useState<'ALL' | FatigueRiskTier>('ALL');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>('STAFF-101'); // Default to high-risk Palwal crew
  const [isAiInferencing, setIsAiInferencing] = useState<boolean>(false);
  const [aiInferenceMessage, setAiInferenceMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state when service updates
  const refreshState = () => {
    const updated = crewFatigueService.computeAnalysis();
    setAnalysis(updated);
    if (onRefreshData) onRefreshData();
  };

  // Filter profiles based on corridor, department, and risk tier
  const filteredProfiles = useMemo(() => {
    return analysis.profiles.filter((p) => {
      if (selectedCorridorId !== 'ALL' && p.corridorId !== selectedCorridorId) return false;
      if (departmentFilter !== 'ALL' && p.department !== departmentFilter) return false;
      if (riskTierFilter !== 'ALL' && p.riskTier !== riskTierFilter) return false;
      return true;
    });
  }, [analysis.profiles, selectedCorridorId, departmentFilter, riskTierFilter]);

  // Selected profile details
  const activeProfile = useMemo(() => {
    if (!selectedStaffId) return filteredProfiles[0] || analysis.profiles[0] || null;
    return (
      analysis.profiles.find((p) => p.staffId === selectedStaffId) ||
      filteredProfiles[0] ||
      analysis.profiles[0] ||
      null
    );
  }, [analysis.profiles, filteredProfiles, selectedStaffId]);

  // Corridor aggregate risk calculations
  const corridorRiskStats = useMemo(() => {
    const stats: Record<
      string,
      {
        totalStaff: number;
        avgFatigue: number;
        criticalHotspots: number;
        highHotspots: number;
        maxFatigue: number;
        riskTier: FatigueRiskTier;
      }
    > = {};

    ['C001', 'C002', 'C003', 'C004'].forEach((cid) => {
      const corrProfs = analysis.profiles.filter((p) => p.corridorId === cid);
      if (corrProfs.length === 0) {
        stats[cid] = { totalStaff: 0, avgFatigue: 25, criticalHotspots: 0, highHotspots: 0, maxFatigue: 25, riskTier: 'LOW' };
        return;
      }
      const avg = Number((corrProfs.reduce((acc, p) => acc + p.circadianFatigueIndex, 0) / corrProfs.length).toFixed(1));
      const crit = corrProfs.filter((p) => p.riskTier === 'CRITICAL').length;
      const high = corrProfs.filter((p) => p.riskTier === 'HIGH').length;
      const maxF = Math.max(...corrProfs.map((p) => p.circadianFatigueIndex));
      const tier: FatigueRiskTier = maxF >= 80 ? 'CRITICAL' : maxF >= 65 ? 'HIGH' : maxF >= 35 ? 'MODERATE' : 'LOW';

      stats[cid] = {
        totalStaff: corrProfs.length,
        avgFatigue: avg,
        criticalHotspots: crit,
        highHotspots: high,
        maxFatigue: maxF,
        riskTier: tier,
      };
    });

    return stats;
  }, [analysis.profiles]);

  // Map crew profiles to topology coordinates based on assignedSection
  const gangHotspotsOnTopology = useMemo(() => {
    return analysis.profiles.map((profile) => {
      let x = 50;
      let y = 50;
      let anchorStationName = 'Mid-Corridor';

      if (profile.staffId === 'STAFF-101') {
        // Palwal - Kosi Kalan (KM 60-85)
        x = 63;
        y = 57;
        anchorStationName = 'Palwal-Kosi Kalan (KM 74.2)';
      } else if (profile.staffId === 'STAFF-102') {
        // Ballabgarh - Palwal (KM 35-58)
        x = 46;
        y = 48;
        anchorStationName = 'Ballabgarh-Palwal (KM 48.0)';
      } else if (profile.staffId === 'STAFF-103') {
        // Delhi - Mathura (KM 80-100)
        x = 79;
        y = 66;
        anchorStationName = 'Kosi Kalan-Mathura (KM 92.5)';
      } else if (profile.staffId === 'STAFF-104') {
        // Rewari - Madar DFC (KM 45-70)
        x = 43;
        y = 78;
        anchorStationName = 'Rewari DFC Yard (KM 55.0)';
      } else if (profile.staffId === 'STAFF-105') {
        // Ghaziabad Outer (KM 10-35)
        x = 31;
        y = 27;
        anchorStationName = 'Ghaziabad Outer (KM 28.6)';
      } else if (profile.staffId === 'STAFF-106') {
        // Ateli - Phulera DFC (KM 85-115)
        x = 59;
        y = 87;
        anchorStationName = 'Ateli-Phulera DFC (KM 118.0)';
      } else if (profile.staffId === 'STAFF-107') {
        // Sampla - Rohtak (KM 30-65)
        x = 21;
        y = 88;
        anchorStationName = 'Sampla Freight Yard (KM 44.0)';
      } else if (profile.staffId === 'STAFF-108') {
        // Gurgaon - Rewari (KM 15-40)
        x = 31;
        y = 63;
        anchorStationName = 'Gurgaon-Garhi Harsaru (KM 32.0)';
      } else if (profile.staffId === 'STAFF-109') {
        // Delhi Cantt - Bahadurgarh (KM 5-30)
        x = 15;
        y = 57;
        anchorStationName = 'Delhi Cantt Outer (KM 18.0)';
      } else if (profile.staffId === 'STAFF-110') {
        // Anand Vihar - Sahibabad (KM 12-38)
        x = 44;
        y = 17;
        anchorStationName = 'Anand Vihar OHE Yard (KM 22.0)';
      } else if (profile.staffId === 'STAFF-111') {
        // Ghaziabad Outer - Aligarh (KM 25-50)
        x = 67;
        y = 22;
        anchorStationName = 'Sahibabad East (KM 42.0)';
      } else {
        // STAFF-112
        x = 74;
        y = 24;
        anchorStationName = 'Aligarh Chord (KM 68.0)';
      }

      const isCritical = profile.riskTier === 'CRITICAL';
      const isHigh = profile.riskTier === 'HIGH';
      const isModerate = profile.riskTier === 'MODERATE';

      const color = isCritical
        ? '#f43f5e' // Rose 500
        : isHigh
        ? '#f59e0b' // Amber 500
        : isModerate
        ? '#eab308' // Yellow 500
        : '#10b981'; // Emerald 500

      const fillColor = isCritical
        ? 'rgba(244,63,94,0.35)'
        : isHigh
        ? 'rgba(245,158,11,0.25)'
        : isModerate
        ? 'rgba(234,179,8,0.2)'
        : 'rgba(16,185,129,0.2)';

      return {
        profile,
        x,
        y,
        anchorStationName,
        color,
        fillColor,
        isCritical,
        isHigh,
        isModerate,
      };
    });
  }, [analysis.profiles]);

  // Color helper for track segments
  const getTrackColor = (segment: TopologyTrackSegment) => {
    if (selectedCorridorId !== 'ALL' && segment.corridorId !== selectedCorridorId) {
      return '#334155'; // Muted slate when not selected
    }
    const cStats = corridorRiskStats[segment.corridorId];
    if (!cStats) return '#38bdf8';

    // Highlight specific critical sections on C001, C002, C003
    if (segment.id === 'TRK-C001-4' && !analysis.optimizedRotationsApplied) {
      return '#f43f5e'; // Palwal-Kosi Kalan Critical Hotspot
    }
    if (segment.id === 'TRK-C002-4' && !analysis.optimizedRotationsApplied) {
      return '#f43f5e'; // Ateli-Phulera Critical Hotspot
    }
    if (segment.id === 'TRK-C001-3' && !analysis.optimizedRotationsApplied) {
      return '#f59e0b'; // Ballabgarh-Palwal High Risk
    }
    if (segment.id === 'TRK-C003-3' && !analysis.optimizedRotationsApplied) {
      return '#f59e0b'; // Sampla Loop High Risk
    }

    if (cStats.riskTier === 'CRITICAL' && !analysis.optimizedRotationsApplied) return '#f43f5e';
    if (cStats.riskTier === 'HIGH' && !analysis.optimizedRotationsApplied) return '#f59e0b';
    if (cStats.riskTier === 'MODERATE') return '#eab308';
    return '#10b981'; // Emerald optimal
  };

  // Trigger Crew Fatigue AI Inference via /api/ai/crew-fatigue
  const handleRunAiInference = async () => {
    setIsAiInferencing(true);
    setAiInferenceMessage('Querying crew-fatigue-api (gemini-3.8-flash) & evaluating circadian sleep models...');
    try {
      const res = await crewFatigueService.runAiPredictor();
      setAnalysis(res.result);
      setAiInferenceMessage(
        res.aiGeneratedNotes ||
          'Inference Complete: Predictive fatigue models verified against Indian Railways HOER Rule 14.'
      );
      setToastMessage('✓ AI Crew Fatigue Analysis refreshed successfully via crew-fatigue-api!');
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      console.error('Failed to run crew fatigue AI predictor:', err);
      setAiInferenceMessage('Deterministic biophysical risk model computed.');
    } finally {
      setIsAiInferencing(false);
    }
  };

  // 1-Click Apply AI Rest Rotations
  const handleApplyRestRotations = () => {
    const res = crewFatigueService.applyOptimizedRotations();
    setAnalysis(res.result);
    setToastMessage('✓ AI Rest Rotations Deployed! High-risk crews relieved with Central Depot Standby gangs.');
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Reset to initial baseline roster
  const handleResetBaseline = () => {
    const res = crewFatigueService.resetToBaseline();
    setAnalysis(res);
    setToastMessage('Roster reset to un-optimized baseline schedule.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1-Click Relief Swap for single crew
  const handleSingleCrewRelief = (staffId: string) => {
    const res = crewFatigueService.applyRotationForStaff(staffId);
    setAnalysis(res);
    setToastMessage(`✓ Rest rotation executed for ${activeProfile?.staffName || 'Crew Member'}! Relief deployed.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Circadian Hour 03:00 AM Callout
  const peakRiskHour = CIRCADIAN_24H_CYCLE[3]; // 03:00 AM

  return (
    <div
      id="crew-fatigue-topology-component"
      className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 backdrop-blur shadow-xl relative overflow-hidden"
    >
      {/* Background Ambience Gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-600/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* COMPONENT HEADER */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-700/80 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
              <Activity className="w-5 h-5 text-rose-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-100 font-mono tracking-wide">
                  PREDICTED CREW FATIGUE &amp; CIRCADIAN RISK TOPOLOGY
                </h3>
                <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700 text-[10px] font-mono font-bold">
                  crew-fatigue-api
                </span>
                {analysis.optimizedRotationsApplied ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-600 text-[11px] font-mono font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    REST ROTATIONS DEPLOYED
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-950/90 text-rose-200 border border-rose-600 text-[11px] font-mono font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(244,63,94,0.35)] animate-pulse">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    ACUTE FATIGUE RISK HOTSPOTS DETECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Spatial corridor mapping of gang alertness depletion, statutory HOER 12h rest ceilings &amp; circadian near-miss patterns.
              </p>
            </div>
          </div>
        </div>

        {/* TOP CONTROLS & API ACTIONS */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Run AI Fatigue Inference via crew-fatigue-api */}
          <button
            id="run-ai-fatigue-inference-btn"
            onClick={handleRunAiInference}
            disabled={isAiInferencing}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 hover:from-purple-900 hover:to-indigo-900 text-purple-200 hover:text-white border border-purple-500/80 flex items-center gap-2 transition-all font-bold shadow-[0_0_10px_rgba(168,85,247,0.3)] cursor-pointer disabled:opacity-50"
            title="Invoke server-side crew-fatigue-api using gemini-3.8-flash biophysical modeling"
          >
            <Sparkles className={`w-3.5 h-3.5 text-purple-300 ${isAiInferencing ? 'animate-spin' : ''}`} />
            <span>{isAiInferencing ? 'Analyzing Fatigue...' : 'Run AI Fatigue API'}</span>
          </button>

          {/* 1-Click Deploy Rest Rotations */}
          {!analysis.optimizedRotationsApplied ? (
            <button
              id="apply-rest-rotations-btn"
              onClick={handleApplyRestRotations}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-950 to-teal-950 hover:from-emerald-900 hover:to-teal-900 text-emerald-200 hover:text-white border border-emerald-500/80 flex items-center gap-1.5 transition-all font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer"
              title="Apply AI Rest Rotations to relieve all critical crews with Central Depot Standby reserves"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Deploy Rest Rotations</span>
            </button>
          ) : (
            <button
              id="reset-fatigue-baseline-btn"
              onClick={handleResetBaseline}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset crew schedules to baseline un-optimized state"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Roster Baseline</span>
            </button>
          )}

          {/* Test Real-time Threshold Spike Alert (>85%) */}
          <button
            id="test-crew-fatigue-alert-spike-btn"
            onClick={() => {
              crewFatigueNotificationService.triggerTestSpike('STAFF-101', 89);
              setToastMessage('⚠ Real-time Alert Triggered: PWI Gang 3 crossed 85% circadian depletion (89%)!');
              setTimeout(() => setToastMessage(null), 4000);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-600 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Simulate a crew crossing the 85% circadian threshold to verify real-time toast notification"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Test Alert (&gt;85%)</span>
          </button>

          {/* Navigate to Full Roster */}
          <button
            onClick={() => {
              if (onNavigate) {
                onNavigate('resource_allocation', { tab: 'CREW_FATIGUE' });
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            title="Open comprehensive crew roster, shift rotas and sleep debt analytics"
          >
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>View Full Roster</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* TOAST ALERT NOTIFICATION */}
      {toastMessage && (
        <div className="mt-3 p-2.5 rounded-lg bg-gradient-to-r from-sky-950 to-slate-900 border border-sky-500/80 text-xs font-mono text-sky-200 flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* METRIC RIBBONS (UNBOXED CLEAN METADATA) */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-rose-400" />
            <span>Mean Circadian Fatigue</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black font-mono ${
                analysis.averageFatigueScore >= 60 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {analysis.averageFatigueScore}%
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {analysis.optimizedRotationsApplied ? '31.4% Post-Swap' : 'Safety Ceiling: 35%'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Critical Gang Hotspots</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black font-mono ${
                analysis.criticalFatigueCount > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {analysis.criticalFatigueCount}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              of {analysis.totalStaffEvaluated} crews evaluated
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
            <span>Statutory HOER Breaches</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black font-mono ${
                analysis.hoerViolationCount > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {analysis.hoerViolationCount}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {analysis.optimizedRotationsApplied ? '0 Overruns' : 'Rule 14 (Night Rest)'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
            <span>Predicted Incident Risk</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black font-mono ${
                analysis.optimizedRotationsApplied ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {analysis.optimizedRotationsApplied
                ? `${analysis.estimatedIncidentRiskOptimized}%`
                : `${analysis.estimatedIncidentRiskBaseline}%`}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">
              -{analysis.overallRiskReductionPct}% reduction
            </span>
          </div>
        </div>
      </div>

      {/* INTERACTIVE FILTER CONTROLS (FUNCTIONAL BUTTONS) */}
      <div className="mt-4 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs font-mono">
        {/* Corridor Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-slate-400 font-bold mr-1">Corridor:</span>
          {[
            { id: 'ALL', label: 'All Corridors' },
            { id: 'C001', label: 'C001 (NDLS-GZB / Trunk)' },
            { id: 'C002', label: 'C002 (NDLS-FDB / DFC)' },
            { id: 'C003', label: 'C003 (Western Freight)' },
            { id: 'C004', label: 'C004 (Eastern Chord)' },
          ].map((corr) => {
            const isSelected = selectedCorridorId === corr.id;
            const stats = corr.id !== 'ALL' ? corridorRiskStats[corr.id] : null;
            const isCrit = stats?.riskTier === 'CRITICAL' && !analysis.optimizedRotationsApplied;

            return (
              <button
                key={corr.id}
                onClick={() => setSelectedCorridorId(corr.id)}
                className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer font-bold ${
                  isSelected
                    ? 'bg-sky-900/90 text-white border border-sky-500 shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{corr.label}</span>
                {isCrit && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
              </button>
            );
          })}
        </div>

        {/* Department Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-slate-400 font-bold mr-1">Department:</span>
          {(['ALL', 'ENGINEERING', 'S&T', 'TRACTION'] as const).map((dept) => {
            const isSelected = departmentFilter === dept;
            return (
              <button
                key={dept}
                onClick={() => setDepartmentFilter(dept)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer font-bold ${
                  isSelected
                    ? 'bg-purple-900/90 text-purple-200 border border-purple-500'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {dept === 'ALL' ? 'All Depts' : dept}
              </button>
            );
          })}
        </div>

        {/* Risk Filter */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-slate-400 font-bold mr-1">Risk Band:</span>
          {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map((tier) => {
            const isSelected = riskTierFilter === tier;
            return (
              <button
                key={tier}
                onClick={() => setRiskTierFilter(tier)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer font-bold ${
                  isSelected
                    ? tier === 'CRITICAL'
                      ? 'bg-rose-950 text-rose-200 border border-rose-500'
                      : tier === 'HIGH'
                      ? 'bg-amber-950 text-amber-200 border border-amber-500'
                      : 'bg-slate-800 text-slate-200 border border-slate-600'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {tier}
              </button>
            );
          })}
        </div>
      </div>

      {/* TOPOLOGY MAP & DIAGNOSTIC INSPECTOR GRID */}
      <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* INTERACTIVE COLOR-CODED CORRIDOR TOPOLOGY MAP (SVG SCHEMATIC) */}
        <div className="xl:col-span-2 bg-slate-950 rounded-xl p-4 border border-slate-800/90 relative overflow-hidden flex flex-col justify-between">
          {/* Map Title & Legend Overlay */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80 text-xs font-mono">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-slate-200">Corridor Topology &amp; Fatigue Hotspot Schematic</span>
              <span className="text-slate-500">· Click any station node or gang beacon to inspect</span>
            </div>

            {/* Color-Coding Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-rose-300 font-bold">&gt;80% Critical</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-amber-300">65–80% High</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span className="text-yellow-300">35–65% Moderate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-emerald-300">&lt;35% Optimal</span>
              </div>
            </div>
          </div>

          {/* SVG TOPOLOGY CANVAS */}
          <div className="relative w-full h-[380px] my-2 select-none">
            {/* Grid pattern background */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />

            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* 1. Track Lines (Rails) */}
              {TOPOLOGY_TRACKS.map((track) => {
                const strokeColor = getTrackColor(track);
                const isSelected = selectedCorridorId === 'ALL' || selectedCorridorId === track.corridorId;
                const strokeWidth = isSelected ? 1.6 : 0.8;
                const isCriticalSection =
                  (track.id === 'TRK-C001-4' || track.id === 'TRK-C002-4') && !analysis.optimizedRotationsApplied;

                return (
                  <g key={track.id}>
                    {/* Glowing under-glow for critical corridor sections */}
                    {isCriticalSection && (
                      <line
                        x1={track.x1}
                        y1={track.y1}
                        x2={track.x2}
                        y2={track.y2}
                        stroke="#f43f5e"
                        strokeWidth={4.5}
                        strokeOpacity={0.3}
                        strokeLinecap="round"
                        className="animate-pulse"
                      />
                    )}
                    {/* Main Track Line */}
                    <line
                      x1={track.x1}
                      y1={track.y1}
                      x2={track.x2}
                      y2={track.y2}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeDasharray={isSelected ? undefined : '2,2'}
                      className="transition-colors duration-300"
                    />
                  </g>
                );
              })}

              {/* 2. Topology Station Nodes */}
              {TOPOLOGY_STATIONS.map((station) => {
                const isCorrSelected = selectedCorridorId === 'ALL' || selectedCorridorId === station.corridorId;
                return (
                  <g
                    key={station.id}
                    className="cursor-pointer group"
                    onClick={() => {
                      // Filter corridor or find closest gang
                      setSelectedCorridorId(station.corridorId);
                      const gang = analysis.profiles.find((p) => p.corridorId === station.corridorId);
                      if (gang) setSelectedStaffId(gang.staffId);
                    }}
                  >
                    {/* Station Halo */}
                    <circle
                      cx={station.x}
                      cy={station.y}
                      r={station.isJunction ? 3.0 : 1.8}
                      fill={station.isJunction ? '#0284c7' : '#0f172a'}
                      stroke={isCorrSelected ? '#38bdf8' : '#475569'}
                      strokeWidth={station.isJunction ? 1.2 : 0.8}
                      className="group-hover:scale-125 transition-transform"
                    />
                    {station.isJunction && (
                      <circle cx={station.x} cy={station.y} r={1.0} fill="#ffffff" />
                    )}
                    {/* Station Text Label */}
                    <text
                      x={station.x}
                      y={station.y - 3}
                      textAnchor="middle"
                      fill={isCorrSelected ? '#e2e8f0' : '#64748b'}
                      fontSize="2.4"
                      fontFamily="monospace"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {station.code}
                    </text>
                    <text
                      x={station.x}
                      y={station.y + 4.5}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="1.7"
                      fontFamily="monospace"
                      className="pointer-events-none"
                    >
                      KM {station.chainageKm}
                    </text>
                  </g>
                );
              })}

              {/* 3. Gang Hotspots Beacons & Rings */}
              {gangHotspotsOnTopology.map((hotspot) => {
                const isSelected = activeProfile?.staffId === hotspot.profile.staffId;
                const isFiltered = filteredProfiles.some((p) => p.staffId === hotspot.profile.staffId);

                if (!isFiltered) return null;

                return (
                  <g
                    key={hotspot.profile.staffId}
                    className="cursor-pointer group"
                    onClick={() => setSelectedStaffId(hotspot.profile.staffId)}
                  >
                    {/* Pulsing Hotspot Waves if Critical */}
                    {hotspot.isCritical && (
                      <circle
                        cx={hotspot.x}
                        cy={hotspot.y}
                        r={6.5}
                        fill={hotspot.fillColor}
                        stroke={hotspot.color}
                        strokeWidth={0.5}
                        strokeOpacity={0.6}
                        className="animate-ping"
                      />
                    )}

                    {/* Outer Selection Ring */}
                    <circle
                      cx={hotspot.x}
                      cy={hotspot.y}
                      r={isSelected ? 4.2 : 3.0}
                      fill={isSelected ? hotspot.color : '#0f172a'}
                      stroke={hotspot.color}
                      strokeWidth={isSelected ? 1.4 : 1.0}
                      className="transition-all duration-200"
                    />

                    {/* Center Core Dot */}
                    <circle
                      cx={hotspot.x}
                      cy={hotspot.y}
                      r={1.2}
                      fill={isSelected ? '#ffffff' : hotspot.color}
                    />

                    {/* Gang Callout Tag */}
                    <g transform={`translate(${hotspot.x + 3.5}, ${hotspot.y - 1})`}>
                      <rect
                        x={0}
                        y={-2.5}
                        width={18}
                        height={5}
                        rx={1}
                        fill="#020617"
                        stroke={isSelected ? hotspot.color : '#334155'}
                        strokeWidth={0.6}
                      />
                      <text
                        x={2}
                        y={0.8}
                        fill={hotspot.color}
                        fontSize="2.2"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {hotspot.profile.gangId}: {hotspot.profile.circadianFatigueIndex}%
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>

            {/* Historical Incident Anchors on Topology */}
            <div className="absolute bottom-2 left-2 flex flex-wrap items-center gap-2 text-[10px] font-mono">
              <span className="text-slate-400 font-bold">CRS Incident Correlations:</span>
              <span className="text-rose-300 font-semibold bg-rose-950/70 px-2 py-0.5 rounded border border-rose-800">
                INC-2025-084: Palwal KM 74.2 (02:45 AM Micro-sleep)
              </span>
              <span className="text-amber-300 font-semibold bg-amber-950/70 px-2 py-0.5 rounded border border-amber-800">
                INC-2026-049: Rewari S&amp;T (01:40 AM Polarity Error)
              </span>
            </div>
          </div>

          {/* Map Footer Route Details */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="text-slate-400">
              Active Corridor Breakdown:{' '}
              <span className="text-sky-300 font-bold">
                {selectedCorridorId === 'ALL'
                  ? 'Network-Wide (4 Mainline & DFC Corridors)'
                  : corridors.find((c) => c.id === selectedCorridorId)?.name || selectedCorridorId}
              </span>
            </div>
            <div className="text-slate-400">
              Circadian Deep Trough:{' '}
              <span className="text-rose-400 font-bold">01:00 – 04:30 AM (Peak Fatigue 81%)</span>
            </div>
          </div>
        </div>

        {/* DIAGNOSTIC INSPECTOR DRAWER / CARD */}
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/90 flex flex-col justify-between space-y-4">
          {activeProfile ? (
            <div className="space-y-4">
              {/* Header: Crew Member & Designation */}
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 text-[10px] font-mono font-bold border border-sky-700">
                      {activeProfile.gangId} · {activeProfile.staffId}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        activeProfile.riskTier === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                          : activeProfile.riskTier === 'HIGH'
                          ? 'bg-amber-950 text-amber-300 border-amber-600'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                      }`}
                    >
                      {activeProfile.riskTier} RISK
                    </span>
                  </div>
                  <h4 className="text-base font-black text-slate-100 font-mono mt-1.5">
                    {activeProfile.staffName}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">
                    {activeProfile.role}
                  </p>
                </div>

                <div className="text-right font-mono">
                  <div className="text-2xl font-black text-rose-400">
                    {activeProfile.circadianFatigueIndex}%
                  </div>
                  <div className="text-[10px] text-slate-400">Circadian Fatigue</div>
                </div>
              </div>

              {/* Assignment & Chainage Info */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Corridor:</span>
                  <span className="font-bold text-sky-300">{activeProfile.corridorId} Mainline</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Assigned Chainage:</span>
                  <span className="font-semibold text-slate-200">{activeProfile.assignedSection}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Department / Trade:</span>
                  <span className="font-semibold text-purple-300">
                    {activeProfile.department} · {activeProfile.trade}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Current Shift:</span>
                  <span className="font-bold text-amber-300">{activeProfile.currentShift}</span>
                </div>
              </div>

              {/* Roster & HOER Regulatory Compliance Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Consecutive Nights</div>
                  <div className="text-base font-bold text-slate-100 mt-1 flex items-center gap-1.5">
                    <span>{activeProfile.consecutiveNightShifts} Shifts</span>
                    {activeProfile.consecutiveNightShifts >= 3 && (
                      <span className="text-rose-400 text-[10px] font-black animate-pulse">HOER OVERRUN</span>
                    )}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Cumulative Sleep Debt</div>
                  <div className="text-base font-bold text-rose-300 mt-1">
                    {activeProfile.sleepDebtHours} Hours
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Weekly Duty Hours</div>
                  <div className="text-base font-bold text-slate-100 mt-1">
                    {activeProfile.weeklyDutyHours}h / 48h limit
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Last Rest Duration</div>
                  <div className="text-base font-bold text-slate-100 mt-1">
                    {activeProfile.lastRestDurationHours}h (Min: 12h)
                  </div>
                </div>
              </div>

              {/* Primary Fatigue Driver */}
              <div className="p-2.5 rounded bg-rose-950/40 border border-rose-900/80 text-xs font-mono text-rose-200">
                <div className="font-bold flex items-center gap-1 text-rose-300 text-[11px] mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Primary Fatigue Trigger:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  {activeProfile.primaryFatigueDriver}
                </p>
                {activeProfile.correlatedIncidentId && (
                  <div className="mt-1.5 pt-1.5 border-t border-rose-900/60 text-[10.5px] text-rose-300 font-semibold">
                    ⚠ Mirrors Historical Incident {activeProfile.correlatedIncidentId}: {activeProfile.correlatedIncidentPattern}
                  </div>
                )}
              </div>

              {/* AI Rest Rotation Swap Recommendation */}
              <div className="p-3 rounded-lg bg-gradient-to-r from-slate-900 to-indigo-950/70 border border-indigo-700/70 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between text-indigo-300 font-bold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>AI Recommended Action:</span>
                  </span>
                  <span className="text-emerald-400 font-bold">
                    -{activeProfile.suggestedRestRotation.fatigueReductionPoints} pts fatigue
                  </span>
                </div>
                <p className="text-slate-200 text-xs font-semibold">
                  {activeProfile.suggestedRestRotation.suggestedAction}
                </p>
                <div className="text-[10.5px] text-slate-400">
                  Relief Squad: <strong className="text-sky-300">{activeProfile.suggestedRestRotation.reliefStaffOrGang}</strong>
                </div>

                {/* 1-Click Action to Execute Individual Relief */}
                {activeProfile.riskTier !== 'LOW' && (
                  <button
                    onClick={() => handleSingleCrewRelief(activeProfile.staffId)}
                    className="w-full mt-2 py-1.5 px-3 rounded bg-indigo-900/90 hover:bg-indigo-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-indigo-500 cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Execute Relief Swap for {activeProfile.staffName.split(' ')[0]}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 font-mono text-xs">
              Select a crew hotspot or station node on the topology map to inspect detailed fatigue telemetry.
            </div>
          )}
        </div>
      </div>

      {/* AI EXECUTIVE SUMMARY & KEY FINDINGS (FROM CREW-FATIGUE-API) */}
      <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-purple-900/50 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2.5 border-b border-purple-900/40 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-purple-200 uppercase tracking-wide">
              AI Fatigue Executive Findings &amp; Safety Mandate
            </span>
            <span className="text-[10px] text-slate-400">· Powered by crew-fatigue-api</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Analysis Timestamp: <span className="text-slate-200">{analysis.analyzedAt}</span>
          </div>
        </div>

        <div className="mt-3 text-xs font-mono text-slate-300 leading-relaxed">
          <p className="font-semibold text-purple-100">
            {analysis.aiExecutiveSummary}
          </p>
        </div>

        {/* Key Findings Grid */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
          {analysis.keyFindings.slice(0, 4).map((finding, idx) => (
            <div
              key={idx}
              className="p-2 rounded bg-slate-900/70 border border-slate-800/80 flex items-start gap-2 text-slate-300"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5" />
              <span className="text-[11px]">{finding}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
