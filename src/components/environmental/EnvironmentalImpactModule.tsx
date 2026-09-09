import React, { useState, useMemo } from 'react';
import {
  CloudRain,
  Sun,
  Thermometer,
  Wind,
  CloudLightning,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Compass,
  Zap,
  Wrench,
  Truck,
  ShieldAlert,
  ShieldCheck,
  Droplets,
  Activity,
  Layers,
  ChevronRight,
  Info,
  Calendar,
  AlertCircle,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Corridor, OptimizedBlock } from '../../types';

interface EnvironmentalImpactModuleProps {
  corridors: Corridor[];
  blocks?: OptimizedBlock[];
  onNavigate: (screen: string, itemData?: any) => void;
}

export type WeatherScenario =
  | 'CURRENT_LIVE'
  | 'MONSOON_DOWNPOUR'
  | 'SUMMER_HEATWAVE'
  | 'DENSE_WINTER_FOG'
  | 'OHE_SQUALL_ALERT';

export interface WeatherStationData {
  id: string;
  name: string;
  stationCode: string;
  corridorId: string;
  corridorName: string;
  ambientTempC: number;
  railTempC: number;
  humidityPct: number;
  rainfallMmHr: number;
  rainfall24hMm: number;
  windSpeedKmh: number;
  windGustKmh: number;
  visibilityMeters: number;
  weatherCondition: string;
  weatherIcon: string;
  airQualityAqi: number;
  lightningDetected: boolean;
  lightningDistanceKm?: number;
  neutralDestressTempTd: number; // Indian Railways LWR/CWR Td = 38°C
  railTempStatus: 'OPTIMAL' | 'WARM_MONITOR' | 'BUCKLING_RISK' | 'FRACTURE_RISK';
  waterloggingRisk: 'LOW' | 'MODERATE' | 'CRITICAL';
  mobilityIndex: number; // 0 - 100%
  blockFeasibilityScore: number; // 0 - 100%
  activeAlerts: string[];
}

export interface WeatherAffectedBlock {
  blockId: string;
  title: string;
  corridorId: string;
  section: string;
  scheduledTime: string;
  department: string;
  taskType: string;
  requiresDryBallast: boolean;
  requiresWelding: boolean;
  requiresOheWork: boolean;
  requiresHeavyMachinery: boolean;
  feasibilityScore: number;
  status: 'FEASIBLE' | 'CONDITIONAL' | 'RESTRICTED' | 'SUSPENDED';
  limitingFactor: string;
  aiMitigation: string;
  suggestedRescheduleTime?: string;
}

export const EnvironmentalImpactModule: React.FC<EnvironmentalImpactModuleProps> = ({
  corridors,
  blocks = [],
  onNavigate,
}) => {
  const [selectedCorridor, setSelectedCorridor] = useState<string>('ALL');
  const [activeScenario, setActiveScenario] = useState<WeatherScenario>('CURRENT_LIVE');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showComplianceModal, setShowComplianceModal] = useState<boolean>(false);
  const [selectedBlockForMitigation, setSelectedBlockForMitigation] = useState<WeatherAffectedBlock | null>(null);
  const [appliedMitigations, setAppliedMitigations] = useState<Record<string, boolean>>({});

  // Base Regional Weather Stations across Corridors
  const baseStations: WeatherStationData[] = useMemo(
    () => [
      {
        id: 'WS-01',
        name: 'New Delhi – Tilak Bridge AWS',
        stationCode: 'NDLS-TKJ',
        corridorId: 'C001',
        corridorName: 'Northern Main Trunk (NDLS - GZB)',
        ambientTempC: 31.4,
        railTempC: 38.2, // exactly near Td (38°C)
        humidityPct: 62,
        rainfallMmHr: 3.5,
        rainfall24hMm: 12.0,
        windSpeedKmh: 18,
        windGustKmh: 26,
        visibilityMeters: 4200,
        weatherCondition: 'Light Passing Drizzle',
        weatherIcon: 'rain',
        airQualityAqi: 142,
        lightningDetected: false,
        neutralDestressTempTd: 38,
        railTempStatus: 'OPTIMAL',
        waterloggingRisk: 'LOW',
        mobilityIndex: 94,
        blockFeasibilityScore: 91,
        activeAlerts: ['Light track moisture: Maintain 10m extra braking gap for track machine transit.'],
      },
      {
        id: 'WS-02',
        name: 'Ghaziabad Junction AWS & OHE Rig',
        stationCode: 'GZB-JN',
        corridorId: 'C001',
        corridorName: 'Northern Main Trunk (NDLS - GZB)',
        ambientTempC: 32.1,
        railTempC: 39.5,
        humidityPct: 68,
        rainfallMmHr: 6.2,
        rainfall24hMm: 18.5,
        windSpeedKmh: 22,
        windGustKmh: 34,
        visibilityMeters: 3500,
        weatherCondition: 'Moderate Rain Showers',
        weatherIcon: 'rain',
        airQualityAqi: 156,
        lightningDetected: false,
        neutralDestressTempTd: 38,
        railTempStatus: 'OPTIMAL',
        waterloggingRisk: 'LOW',
        mobilityIndex: 88,
        blockFeasibilityScore: 84,
        activeAlerts: ['Thermit welding prohibited during active precipitation (IRPWM Para 5.4).'],
      },
      {
        id: 'WS-03',
        name: 'Tughlakabad Yard & High-Speed Link AWS',
        stationCode: 'TKD-YARD',
        corridorId: 'C002',
        corridorName: 'High-Speed Freight Spine (TKD - PWL)',
        ambientTempC: 33.0,
        railTempC: 41.2,
        humidityPct: 54,
        rainfallMmHr: 0.0,
        rainfall24hMm: 2.0,
        windSpeedKmh: 14,
        windGustKmh: 20,
        visibilityMeters: 5500,
        weatherCondition: 'Partly Cloudy',
        weatherIcon: 'sun',
        airQualityAqi: 168,
        lightningDetected: false,
        neutralDestressTempTd: 38,
        railTempStatus: 'OPTIMAL',
        waterloggingRisk: 'LOW',
        mobilityIndex: 98,
        blockFeasibilityScore: 96,
        activeAlerts: [],
      },
      {
        id: 'WS-04',
        name: 'Palwal Junction South Gateway AWS',
        stationCode: 'PWL-JN',
        corridorId: 'C002',
        corridorName: 'High-Speed Freight Spine (TKD - PWL)',
        ambientTempC: 33.8,
        railTempC: 42.6,
        humidityPct: 50,
        rainfallMmHr: 0.0,
        rainfall24hMm: 0.5,
        windSpeedKmh: 16,
        windGustKmh: 24,
        visibilityMeters: 6000,
        weatherCondition: 'Clear Sky / Sunny',
        weatherIcon: 'sun',
        airQualityAqi: 135,
        lightningDetected: false,
        neutralDestressTempTd: 38,
        railTempStatus: 'OPTIMAL',
        waterloggingRisk: 'LOW',
        mobilityIndex: 100,
        blockFeasibilityScore: 98,
        activeAlerts: [],
      },
      {
        id: 'WS-05',
        name: 'Shakurbasti Freight & Passenger Siding AWS',
        stationCode: 'SSB-ROK',
        corridorId: 'C003',
        corridorName: 'Inter-City Mixed Link (SSB - ROK)',
        ambientTempC: 30.5,
        railTempC: 36.8,
        humidityPct: 74,
        rainfallMmHr: 8.5,
        rainfall24hMm: 24.0,
        windSpeedKmh: 24,
        windGustKmh: 38,
        visibilityMeters: 2800,
        weatherCondition: 'Moderate Continuous Rain',
        weatherIcon: 'rain',
        airQualityAqi: 112,
        lightningDetected: false,
        neutralDestressTempTd: 38,
        railTempStatus: 'OPTIMAL',
        waterloggingRisk: 'MODERATE',
        mobilityIndex: 78,
        blockFeasibilityScore: 76,
        activeAlerts: [
          'Yard drainage at Bahadurgarh section operating at 80% capacity; ballast cleaning requires moisture clearance.',
        ],
      },
      {
        id: 'WS-06',
        name: 'Delhi Cantt – Rewari Junction AWS',
        stationCode: 'DEC-RE',
        corridorId: 'C004',
        corridorName: 'Suburban Feeder Line (DLI - RE)',
        ambientTempC: 32.4,
        railTempC: 40.0,
        humidityPct: 58,
        rainfallMmHr: 1.0,
        rainfall24hMm: 5.0,
        windSpeedKmh: 15,
        windGustKmh: 22,
        visibilityMeters: 5000,
        weatherCondition: 'Overcast with Mist',
        weatherIcon: 'cloud',
        airQualityAqi: 180,
        lightningDetected: false,
        neutralDestressTempTd: 38,
        railTempStatus: 'OPTIMAL',
        waterloggingRisk: 'LOW',
        mobilityIndex: 92,
        blockFeasibilityScore: 90,
        activeAlerts: [],
      },
    ],
    []
  );

  // Live Scenario Transformation
  const liveStations = useMemo(() => {
    return baseStations.map((station) => {
      const copy: WeatherStationData = { ...station, activeAlerts: [...station.activeAlerts] };

      if (activeScenario === 'MONSOON_DOWNPOUR') {
        copy.ambientTempC = 25.2;
        copy.railTempC = 26.0;
        copy.humidityPct = 98;
        copy.rainfallMmHr = station.corridorId === 'C003' ? 48.0 : 38.5;
        copy.rainfall24hMm = 95.0;
        copy.windSpeedKmh = 35;
        copy.windGustKmh = 52;
        copy.visibilityMeters = 850;
        copy.weatherCondition = 'Heavy Monsoon Downpour & Waterlogging';
        copy.weatherIcon = 'cloud-rain';
        copy.waterloggingRisk = 'CRITICAL';
        copy.mobilityIndex = 42;
        copy.blockFeasibilityScore = 32;
        copy.activeAlerts = [
          'CRITICAL: Water level > 50mm above rail crown in Shakurbasti & Bahadurgarh cuttings.',
          'Thermit and flash-butt rail welding strictly prohibited (IRPWM Annexure 5/1).',
          'Ballast cleaning machine (BCM) operations suspended to prevent slurry ballast pumping.',
          'Road-cum-Rail Vehicle (RRV) access tracks impassable at level crossing gates 14 & 18.',
        ];
      } else if (activeScenario === 'SUMMER_HEATWAVE') {
        copy.ambientTempC = 44.5;
        copy.railTempC = 58.6; // High above Td+20°C (Td = 38°C) -> 58°C triggers SUN-KINK risk!
        copy.humidityPct = 22;
        copy.rainfallMmHr = 0.0;
        copy.rainfall24hMm = 0.0;
        copy.windSpeedKmh = 12;
        copy.windGustKmh = 18;
        copy.visibilityMeters = 7000;
        copy.weatherCondition = 'Severe Heatwave / High Solar Radiation';
        copy.weatherIcon = 'sun';
        copy.railTempStatus = 'BUCKLING_RISK';
        copy.waterloggingRisk = 'LOW';
        copy.mobilityIndex = 82;
        copy.blockFeasibilityScore = 48;
        copy.activeAlerts = [
          'CRITICAL RAIL EXPANSION: Rail temperature $T_R = 58.6°C > (T_d + 15°C)$ (RDSO LWR Manual Para 8.1.3).',
          'Heavy tamping, track lifting, and slewing strictly suspended; danger of instantaneous track buckling.',
          'Continuous de-stressing operations suspended until evening rail temp cools below 48°C.',
          'Hot weather patrolling mobilized at 30-minute intervals on all continuous welded rail sections.',
          'Track gang outdoor manual work restricted: Mandatory hydration breaks every 45 min.',
        ];
      } else if (activeScenario === 'DENSE_WINTER_FOG') {
        copy.ambientTempC = 7.4;
        copy.railTempC = 3.8; // Low rail temperature, near cold fracture band
        copy.humidityPct = 99;
        copy.rainfallMmHr = 0.0;
        copy.rainfall24hMm = 0.0;
        copy.windSpeedKmh = 4;
        copy.windGustKmh = 6;
        copy.visibilityMeters = 80; // Dense fog < 100m
        copy.weatherCondition = 'Dense Winter Fog (Cat-III)';
        copy.weatherIcon = 'cloud-fog';
        copy.railTempStatus = 'FRACTURE_RISK';
        copy.waterloggingRisk = 'LOW';
        copy.mobilityIndex = 35;
        copy.blockFeasibilityScore = 40;
        copy.activeAlerts = [
          'SEVERE LOW VISIBILITY (80m): Fog safety protocol active across all trunk lines.',
          'Heavy machine transit restricted to max 25 km/h; detonator placement teams deployed at signals.',
          'OHE tower wagon aerial cradle operations halted due to zero line-of-sight with ground flagmen.',
          'Rail cold tensile stress elevated ($T_R < T_d - 30°C$); acoustic rail fracture monitoring alert armed.',
        ];
      } else if (activeScenario === 'OHE_SQUALL_ALERT') {
        copy.ambientTempC = 27.8;
        copy.railTempC = 31.0;
        copy.humidityPct = 85;
        copy.rainfallMmHr = 18.0;
        copy.rainfall24hMm = 28.0;
        copy.windSpeedKmh = 68; // >60 km/h is critical for catenary sway
        copy.windGustKmh = 84;
        copy.visibilityMeters = 1600;
        copy.weatherCondition = 'Severe Thunderstorm & High Wind Squall';
        copy.weatherIcon = 'cloud-lightning';
        copy.lightningDetected = true;
        copy.lightningDistanceKm = 4.2;
        copy.waterloggingRisk = 'MODERATE';
        copy.mobilityIndex = 28;
        copy.blockFeasibilityScore = 24;
        copy.activeAlerts = [
          'CRITICAL OHE SQUALL: Sustained winds 68 km/h, gusts 84 km/h exceeding 25kV catenary sway limits.',
          'LIGHTNING DETECTED: Ground strikes 4.2 km away. Immediate TRD earthing & grounding isolation mandated.',
          'All rooftop and tower wagon personnel ordered to evacuate to ground shelter immediately.',
          'Signaling point machines set to fail-safe lock to prevent wind-borne foreign debris obstruction.',
        ];
      }

      return copy;
    });
  }, [baseStations, activeScenario]);

  // Filtered stations based on corridor
  const filteredStations = useMemo(() => {
    if (selectedCorridor === 'ALL') return liveStations;
    return liveStations.filter((s) => s.corridorId === selectedCorridor);
  }, [liveStations, selectedCorridor]);

  // Regional Averages
  const regionalSummary = useMemo(() => {
    const total = liveStations.length;
    const avgAmbient = Math.round((liveStations.reduce((sum, s) => sum + s.ambientTempC, 0) / total) * 10) / 10;
    const avgRail = Math.round((liveStations.reduce((sum, s) => sum + s.railTempC, 0) / total) * 10) / 10;
    const avgRain = Math.round((liveStations.reduce((sum, s) => sum + s.rainfallMmHr, 0) / total) * 10) / 10;
    const maxWind = Math.max(...liveStations.map((s) => s.windGustKmh));
    const minVisibility = Math.min(...liveStations.map((s) => s.visibilityMeters));
    const avgFeasibility = Math.round(liveStations.reduce((sum, s) => sum + s.blockFeasibilityScore, 0) / total);
    const avgMobility = Math.round(liveStations.reduce((sum, s) => sum + s.mobilityIndex, 0) / total);
    const totalAlerts = liveStations.reduce((sum, s) => sum + s.activeAlerts.length, 0);

    return {
      avgAmbient,
      avgRail,
      avgRain,
      maxWind,
      minVisibility,
      avgFeasibility,
      avgMobility,
      totalAlerts,
    };
  }, [liveStations]);

  // 24-Hour Forecast Profile Data for Recharts
  const forecastChartData = useMemo(() => {
    const isHeatwave = activeScenario === 'SUMMER_HEATWAVE';
    const isMonsoon = activeScenario === 'MONSOON_DOWNPOUR';
    const isFog = activeScenario === 'DENSE_WINTER_FOG';
    const isSquall = activeScenario === 'OHE_SQUALL_ALERT';

    return [
      {
        hour: '00:00',
        ambientTemp: isHeatwave ? 34 : isFog ? 8 : isMonsoon ? 24 : 26,
        railTemp: isHeatwave ? 38 : isFog ? 4 : isMonsoon ? 24 : 28,
        rainfallMm: isMonsoon ? 12 : isSquall ? 2 : 0,
        windKmh: isSquall ? 24 : 10,
        feasibilityPct: isMonsoon ? 68 : isSquall ? 75 : 94,
        upperSafetyLimit: 52, // Td + 14°C buckling threshold
        lowerSafetyLimit: 8, // Td - 30°C fracture threshold
      },
      {
        hour: '03:00',
        ambientTemp: isHeatwave ? 32 : isFog ? 6 : isMonsoon ? 23 : 24,
        railTemp: isHeatwave ? 35 : isFog ? 3 : isMonsoon ? 23 : 25,
        rainfallMm: isMonsoon ? 22 : isSquall ? 8 : 0,
        windKmh: isSquall ? 32 : 8,
        feasibilityPct: isMonsoon ? 55 : isSquall ? 62 : 98,
        upperSafetyLimit: 52,
        lowerSafetyLimit: 8,
      },
      {
        hour: '06:00',
        ambientTemp: isHeatwave ? 33 : isFog ? 7 : isMonsoon ? 24 : 25,
        railTemp: isHeatwave ? 37 : isFog ? 4 : isMonsoon ? 24 : 26,
        rainfallMm: isMonsoon ? 35 : isSquall ? 14 : 1,
        windKmh: isSquall ? 45 : 12,
        feasibilityPct: isMonsoon ? 42 : isSquall ? 48 : 95,
        upperSafetyLimit: 52,
        lowerSafetyLimit: 8,
      },
      {
        hour: '09:00',
        ambientTemp: isHeatwave ? 39 : isFog ? 10 : isMonsoon ? 25 : 29,
        railTemp: isHeatwave ? 48 : isFog ? 9 : isMonsoon ? 26 : 34,
        rainfallMm: isMonsoon ? 44 : isSquall ? 22 : 2,
        windKmh: isSquall ? 58 : 16,
        feasibilityPct: isHeatwave ? 68 : isMonsoon ? 34 : isSquall ? 30 : 92,
        upperSafetyLimit: 52,
        lowerSafetyLimit: 8,
      },
      {
        hour: '12:00',
        ambientTemp: isHeatwave ? 43 : isFog ? 14 : isMonsoon ? 26 : 32,
        railTemp: isHeatwave ? 56 : isFog ? 16 : isMonsoon ? 27 : 39,
        rainfallMm: isMonsoon ? 48 : isSquall ? 38 : 3,
        windKmh: isSquall ? 74 : 18,
        feasibilityPct: isHeatwave ? 42 : isMonsoon ? 28 : isSquall ? 18 : 88,
        upperSafetyLimit: 52,
        lowerSafetyLimit: 8,
      },
      {
        hour: '15:00',
        ambientTemp: isHeatwave ? 45 : isFog ? 15 : isMonsoon ? 25 : 33,
        railTemp: isHeatwave ? 59 : isFog ? 15 : isMonsoon ? 26 : 41,
        rainfallMm: isMonsoon ? 42 : isSquall ? 42 : 2,
        windKmh: isSquall ? 82 : 20,
        feasibilityPct: isHeatwave ? 35 : isMonsoon ? 30 : isSquall ? 15 : 86,
        upperSafetyLimit: 52,
        lowerSafetyLimit: 8,
      },
      {
        hour: '18:00',
        ambientTemp: isHeatwave ? 41 : isFog ? 12 : isMonsoon ? 25 : 30,
        railTemp: isHeatwave ? 51 : isFog ? 11 : isMonsoon ? 25 : 36,
        rainfallMm: isMonsoon ? 28 : isSquall ? 20 : 0,
        windKmh: isSquall ? 50 : 15,
        feasibilityPct: isHeatwave ? 58 : isMonsoon ? 44 : isSquall ? 42 : 92,
        upperSafetyLimit: 52,
        lowerSafetyLimit: 8,
      },
      {
        hour: '21:00',
        ambientTemp: isHeatwave ? 36 : isFog ? 9 : isMonsoon ? 24 : 27,
        railTemp: isHeatwave ? 42 : isFog ? 7 : isMonsoon ? 24 : 30,
        rainfallMm: isMonsoon ? 16 : isSquall ? 8 : 0,
        windKmh: isSquall ? 30 : 12,
        feasibilityPct: isHeatwave ? 84 : isMonsoon ? 62 : isSquall ? 65 : 96,
        upperSafetyLimit: 52,
        lowerSafetyLimit: 8,
      },
    ];
  }, [activeScenario]);

  // Today's Scheduled Maintenance Blocks Weather Impact Assessment
  const evaluatedBlocks: WeatherAffectedBlock[] = useMemo(() => {
    return [
      {
        blockId: 'BLK-001',
        title: 'Track Packing & High-Speed Tamping (09-3X)',
        corridorId: 'C001',
        section: 'NDLS - GZB Mainline Km 14/2-18/6',
        scheduledTime: '01:30 – 03:45',
        department: 'ENGINEERING',
        taskType: 'Continuous Action Machine Tamping',
        requiresDryBallast: true,
        requiresWelding: false,
        requiresOheWork: false,
        requiresHeavyMachinery: true,
        feasibilityScore: activeScenario === 'MONSOON_DOWNPOUR' ? 35 : activeScenario === 'SUMMER_HEATWAVE' ? 92 : 96,
        status:
          activeScenario === 'MONSOON_DOWNPOUR'
            ? 'RESTRICTED'
            : activeScenario === 'SUMMER_HEATWAVE'
            ? 'FEASIBLE'
            : 'FEASIBLE',
        limitingFactor:
          activeScenario === 'MONSOON_DOWNPOUR'
            ? 'Waterlogging & wet ballast slurry reduces tamping sleeper grip'
            : activeScenario === 'SUMMER_HEATWAVE'
            ? 'Safe in night window: Rail temp 38°C within acceptable band'
            : 'Favorable track and moisture parameters',
        aiMitigation:
          activeScenario === 'MONSOON_DOWNPOUR'
            ? 'Deploy moisture probe before machine insertion; restrict tamping depth to top 50mm'
            : 'Proceed with scheduled 09-3X unit; night golden window recommended',
        suggestedRescheduleTime: activeScenario === 'MONSOON_DOWNPOUR' ? 'Next Day 02:00 (Post-Drainage)' : undefined,
      },
      {
        blockId: 'BLK-003',
        title: 'Thermit Rail Joint AT Welding & Destressing',
        corridorId: 'C003',
        section: 'Bahadurgarh - Rohtak Jn Km 44/0-46/2',
        scheduledTime: '13:00 – 15:30',
        department: 'ENGINEERING',
        taskType: 'Alumino-Thermit Rail Welding',
        requiresDryBallast: false,
        requiresWelding: true,
        requiresOheWork: false,
        requiresHeavyMachinery: false,
        feasibilityScore:
          activeScenario === 'MONSOON_DOWNPOUR'
            ? 10
            : activeScenario === 'SUMMER_HEATWAVE'
            ? 25
            : activeScenario === 'DENSE_WINTER_FOG'
            ? 45
            : 88,
        status:
          activeScenario === 'MONSOON_DOWNPOUR' || activeScenario === 'SUMMER_HEATWAVE'
            ? 'SUSPENDED'
            : activeScenario === 'DENSE_WINTER_FOG'
            ? 'CONDITIONAL'
            : 'FEASIBLE',
        limitingFactor:
          activeScenario === 'MONSOON_DOWNPOUR'
            ? 'Rainwater steam explosion hazard; molten weld metal contamination (IRPWM Para 5.4)'
            : activeScenario === 'SUMMER_HEATWAVE'
            ? 'Rail temperature 58.6°C exceeds $T_d+10°C$ de-stressing limit; severe rail buckling hazard'
            : activeScenario === 'DENSE_WINTER_FOG'
            ? 'Low temperature requires pre-heating molds 10 min longer to avoid cold fracture'
            : 'Dry weather; rail temp within $T_d$ neutral range',
        aiMitigation:
          activeScenario === 'MONSOON_DOWNPOUR'
            ? 'Reschedule welding to covered workshop or defer to dry weather window at 22:30'
            : activeScenario === 'SUMMER_HEATWAVE'
            ? 'Shift AT weld to night window (01:00) when rail temp cools below 40°C'
            : 'Ensure extended pre-heating using LPG torch and immediate thermal insulation wraps',
        suggestedRescheduleTime: 'Night Slot 01:15 – 03:30 (Safe Rail Temp 26°C)',
      },
      {
        blockId: 'BLK-005',
        title: '25kV Catenary Dropper & Insulator Replacement',
        corridorId: 'C001',
        section: 'Sahibabad - Ghaziabad OHE Siding',
        scheduledTime: '11:30 – 13:00',
        department: 'TRACTION',
        taskType: 'OHE Tower Wagon Aerial Bucket Repair',
        requiresDryBallast: false,
        requiresWelding: false,
        requiresOheWork: true,
        requiresHeavyMachinery: true,
        feasibilityScore:
          activeScenario === 'OHE_SQUALL_ALERT'
            ? 15
            : activeScenario === 'MONSOON_DOWNPOUR'
            ? 50
            : activeScenario === 'DENSE_WINTER_FOG'
            ? 48
            : 94,
        status:
          activeScenario === 'OHE_SQUALL_ALERT'
            ? 'SUSPENDED'
            : activeScenario === 'MONSOON_DOWNPOUR' || activeScenario === 'DENSE_WINTER_FOG'
            ? 'CONDITIONAL'
            : 'FEASIBLE',
        limitingFactor:
          activeScenario === 'OHE_SQUALL_ALERT'
            ? 'Wind gusts 84 km/h & active lightning 4.2 km away; lethal electro-convective hazard'
            : activeScenario === 'MONSOON_DOWNPOUR'
            ? 'Slippery tower wagon ladder steps; wet insulator dielectric test variance'
            : activeScenario === 'DENSE_WINTER_FOG'
            ? 'Zero line-of-sight between bucket operator and ground lookouts'
            : 'Light winds < 20 km/h, clear sky',
        aiMitigation:
          activeScenario === 'OHE_SQUALL_ALERT'
            ? 'Mandatory immediate grounding of tower wagon; personnel into station shelter'
            : 'Deploy tethered safety harnesses, non-slip rubber mats, and VHF duplex radios',
        suggestedRescheduleTime: activeScenario === 'OHE_SQUALL_ALERT' ? 'Post-Storm Window 16:30 – 18:00' : undefined,
      },
      {
        blockId: 'BLK-007',
        title: 'Axle Counter & Point Machine Testing',
        corridorId: 'C002',
        section: 'Faridabad - Palwal Junction Turnouts',
        scheduledTime: '14:00 – 16:00',
        department: 'S&T',
        taskType: 'Point Motor Obstruction & Voltage Check',
        requiresDryBallast: false,
        requiresWelding: false,
        requiresOheWork: false,
        requiresHeavyMachinery: false,
        feasibilityScore: activeScenario === 'MONSOON_DOWNPOUR' ? 62 : 95,
        status: activeScenario === 'MONSOON_DOWNPOUR' ? 'CONDITIONAL' : 'FEASIBLE',
        limitingFactor:
          activeScenario === 'MONSOON_DOWNPOUR'
            ? 'Water pooling near point motor pit requires pump out before lid opening'
            : 'Optimal dry conditions in Palwal yard',
        aiMitigation:
          activeScenario === 'MONSOON_DOWNPOUR'
            ? 'Deploy submersible portable pump and waterproof canopy tent over point machine'
            : 'Execute standard S&T test protocol',
        suggestedRescheduleTime: undefined,
      },
      {
        blockId: 'BLK-012',
        title: 'Deep Ballast Screening by BCM Machine',
        corridorId: 'C003',
        section: 'Shakurbasti Siding Km 18/4',
        scheduledTime: '10:00 – 14:00',
        department: 'ENGINEERING',
        taskType: 'Heavy Track Machine Ballast Cleaning',
        requiresDryBallast: true,
        requiresWelding: false,
        requiresOheWork: false,
        requiresHeavyMachinery: true,
        feasibilityScore: activeScenario === 'MONSOON_DOWNPOUR' ? 20 : activeScenario === 'SUMMER_HEATWAVE' ? 55 : 90,
        status:
          activeScenario === 'MONSOON_DOWNPOUR'
            ? 'SUSPENDED'
            : activeScenario === 'SUMMER_HEATWAVE'
            ? 'CONDITIONAL'
            : 'FEASIBLE',
        limitingFactor:
          activeScenario === 'MONSOON_DOWNPOUR'
            ? 'Wet saturated ballast clogs cutter chains and vibrating screen mesh within 15 min'
            : activeScenario === 'SUMMER_HEATWAVE'
            ? 'High rail temperature increases risk of track slew distortion when ballast is removed'
            : 'Ballast moisture content < 4% (suitable for mechanical screening)',
        aiMitigation:
          activeScenario === 'MONSOON_DOWNPOUR'
            ? 'Suspend BCM. Reroute machine to covered depot siding C-TMD for preventive overhaul'
            : 'Install temporary speed restriction (30 km/h) immediately upon ballast unseating',
        suggestedRescheduleTime:
          activeScenario === 'MONSOON_DOWNPOUR' ? 'Deferred by 36 Hours (Awaiting Ballast Drainage)' : undefined,
      },
    ];
  }, [activeScenario]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleApplyMitigation = (blockId: string) => {
    setAppliedMitigations((prev) => ({ ...prev, [blockId]: true }));
  };

  return (
    <div
      id="environmental-impact-module"
      className="bg-[#0e172e] rounded-xl border border-sky-950/80 shadow-md p-5 space-y-5 transition-all"
    >
      {/* HEADER WITH REAL-TIME REGIONAL WEATHER STATUS & SIMULATION CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80 font-mono">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg border bg-teal-950/80 border-teal-800/60 text-teal-400 shrink-0 mt-0.5">
            <CloudRain className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm md:text-base font-bold text-slate-100 uppercase tracking-wide">
                Environmental Impact & Regional Weather Intelligence
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-700/60 font-semibold flex items-center gap-1">
                <Compass className="w-3 h-3 text-teal-400" />
                6 REGIONAL AWS STATIONS
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                IMD / RDSO SYNC LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Continuous monitoring of ambient & rail temperatures, precipitation, wind velocity, and visibility to dynamically assess maintenance block feasibility and resource mobility across corridors.
            </p>
          </div>
        </div>

        {/* Global Controls: Simulation Scenarios & Refresh */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center text-xs">
          {/* Weather Simulation Scenario Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 px-1 font-bold">SCENARIO:</span>
            <select
              value={activeScenario}
              onChange={(e) => setActiveScenario(e.target.value as WeatherScenario)}
              className="bg-slate-950 text-teal-300 text-xs rounded px-2 py-1 border border-slate-700 focus:outline-none focus:border-teal-500 font-mono cursor-pointer"
            >
              <option value="CURRENT_LIVE">Normal Live Telemetry (Passing Drizzle)</option>
              <option value="MONSOON_DOWNPOUR">Monsoon Cloudburst (Heavy Rainfall / Flooding)</option>
              <option value="SUMMER_HEATWAVE">Peak Summer Heatwave (Rail Temp &gt; 58°C / Sun-Kink)</option>
              <option value="DENSE_WINTER_FOG">Dense Winter Fog (Visibility &lt; 100m Cat-III)</option>
              <option value="OHE_SQUALL_ALERT">OHE Squall &amp; Lightning (Gusts 84 km/h)</option>
            </select>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
            title="Refresh AWS Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-[11px]">Sync AWS</span>
          </button>

          <button
            onClick={() => setShowComplianceModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5 text-[11px]"
            title="View RDSO Weather Safety Standards"
          >
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">RDSO Rules</span>
          </button>
        </div>
      </div>

      {/* 4 REGIONAL MACRO METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        {/* Card 1: Regional Feasibility Index */}
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Overall Block Feasibility</span>
            <Activity className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl md:text-3xl font-black ${
                regionalSummary.avgFeasibility >= 80
                  ? 'text-emerald-400'
                  : regionalSummary.avgFeasibility >= 50
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {regionalSummary.avgFeasibility}%
            </span>
            <span className="text-xs text-slate-400 font-sans">
              {regionalSummary.avgFeasibility >= 80
                ? 'High Feasibility'
                : regionalSummary.avgFeasibility >= 50
                ? 'Conditional Execution'
                : 'Severe Weather Halt'}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${
                regionalSummary.avgFeasibility >= 80 ? 'bg-emerald-400' : 'bg-rose-400 animate-ping'
              }`}
            />
            <span>Based on 6 corridors telemetry</span>
          </div>
        </div>

        {/* Card 2: Rail Temperature & Td Destress Margin */}
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Rail Temperature vs $T_d$</span>
            <Thermometer
              className={`w-4 h-4 ${
                regionalSummary.avgRail >= 52
                  ? 'text-rose-400'
                  : regionalSummary.avgRail <= 6
                  ? 'text-cyan-400'
                  : 'text-amber-400'
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl md:text-3xl font-black ${
                regionalSummary.avgRail >= 52
                  ? 'text-rose-400 animate-pulse'
                  : regionalSummary.avgRail <= 6
                  ? 'text-cyan-400'
                  : 'text-amber-300'
              }`}
            >
              {regionalSummary.avgRail}°C
            </span>
            <span className="text-xs text-slate-400 font-sans">
              (Ambient {regionalSummary.avgAmbient}°C)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {regionalSummary.avgRail >= 52 ? (
              <span className="text-rose-400 font-bold">
                ALERT: Above $T_d+14°C$ (Buckling Hazard)
              </span>
            ) : regionalSummary.avgRail <= 6 ? (
              <span className="text-cyan-400 font-bold">
                ALERT: Cold Fracture Hazard ($T_d - 32°C$)
              </span>
            ) : (
              <span className="text-emerald-400">
                Safe Neutral Band ($T_d = 38°C \pm 10°C$)
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Regional Precipitation & Waterlogging */}
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Precipitation & Drainage</span>
            <Droplets
              className={`w-4 h-4 ${regionalSummary.avgRain > 25 ? 'text-rose-400' : 'text-sky-400'}`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl md:text-3xl font-black ${
                regionalSummary.avgRain > 25 ? 'text-rose-400' : 'text-sky-300'
              }`}
            >
              {regionalSummary.avgRain} mm/h
            </span>
            <span className="text-xs text-slate-400 font-sans">Rate</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {regionalSummary.avgRain > 25 ? (
              <span className="text-rose-400 font-bold">Welding &amp; Tamping Suspended</span>
            ) : regionalSummary.avgRain > 5 ? (
              <span className="text-amber-400">Moisture Control Required</span>
            ) : (
              <span className="text-emerald-400">Clear / Trace Moisture</span>
            )}
          </div>
        </div>

        {/* Card 4: Resource Mobility Index */}
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Resource Mobility Index</span>
            <Truck
              className={`w-4 h-4 ${
                regionalSummary.avgMobility >= 80
                  ? 'text-emerald-400'
                  : regionalSummary.avgMobility >= 50
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl md:text-3xl font-black ${
                regionalSummary.avgMobility >= 80
                  ? 'text-emerald-400'
                  : regionalSummary.avgMobility >= 50
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {regionalSummary.avgMobility}%
            </span>
            <span className="text-xs text-slate-400 font-sans">
              RRV &amp; Fleet Access
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Max Wind: {regionalSummary.maxWind} km/h</span>
            <span>Vis: {regionalSummary.minVisibility}m</span>
          </div>
        </div>
      </div>

      {/* ACTIVE WEATHER ALERT BANNER (IF CRITICAL OR RESTRICTED) */}
      {regionalSummary.totalAlerts > 0 && (
        <div className="p-3.5 rounded-lg bg-teal-950/40 border border-teal-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="p-1.5 rounded bg-teal-900/60 border border-teal-700/60 text-teal-300 shrink-0">
              <AlertTriangle className="w-4 h-4 text-teal-300 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-teal-200">
                REGIONAL WEATHER DISRUPTION PROTOCOL ACTIVE:
              </span>{' '}
              <span className="text-slate-300">
                {activeScenario === 'MONSOON_DOWNPOUR' &&
                  'Heavy precipitation causing ballast saturation on C003 & C001. Thermit welding & BCM suspended.'}
                {activeScenario === 'SUMMER_HEATWAVE' &&
                  'Extreme rail temperature (58.6°C) exceeding safe destressing threshold. Track lifting & tamping suspended to prevent sun-kinks.'}
                {activeScenario === 'DENSE_WINTER_FOG' &&
                  'Dense fog (Cat-III visibility < 100m). Machine transit limited to 25 km/h with detonator protection.'}
                {activeScenario === 'OHE_SQUALL_ALERT' &&
                  'High wind squalls (84 km/h) & lightning strikes within 4.2 km. Mandatory 25kV OHE grounding & bucket evacuation.'}
                {activeScenario === 'CURRENT_LIVE' &&
                  'Light passing showers detected in Northern corridors. Track machines operating with increased deceleration buffer.'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => {
                const el = document.getElementById('weather-affected-blocks-table');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] transition-colors"
            >
              Inspect Affected Blocks ({evaluatedBlocks.filter((b) => b.status !== 'FEASIBLE').length})
            </button>
          </div>
        </div>
      )}

      {/* CORRIDOR WEATHER STATIONS TELEMETRY GRID */}
      <div className="space-y-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Corridor Weather Telemetry Stations ({filteredStations.length} Active Stations)
            </h4>
          </div>

          {/* Corridor Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-500 px-1 font-bold">CORRIDOR:</span>
            {(['ALL', 'C001', 'C002', 'C003', 'C004'] as const).map((corr) => (
              <button
                key={corr}
                onClick={() => setSelectedCorridor(corr)}
                className={`px-2 py-0.5 rounded transition-colors text-[11px] ${
                  selectedCorridor === corr
                    ? 'bg-teal-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {corr}
              </button>
            ))}
          </div>
        </div>

        {/* Stations Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {filteredStations.map((station) => {
            const isSelected = selectedStationId === station.id;
            return (
              <div
                key={station.id}
                onClick={() => setSelectedStationId(isSelected ? null : station.id)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-teal-500 shadow-md ring-1 ring-teal-500/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                }`}
              >
                {/* Station Top Row */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-100">{station.stationCode}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-teal-300 border border-slate-700 font-semibold">
                        {station.corridorId}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[200px]" title={station.name}>
                      {station.name}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                        station.blockFeasibilityScore >= 80
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : station.blockFeasibilityScore >= 50
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                      }`}
                    >
                      {station.blockFeasibilityScore}% FEASIBLE
                    </span>
                  </div>
                </div>

                {/* Weather Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 py-2.5 text-center">
                  <div className="p-1.5 rounded bg-slate-950/70 border border-slate-800/60">
                    <div className="text-[10px] text-slate-500">Rail Temp</div>
                    <div
                      className={`text-sm font-bold ${
                        station.railTempC >= 52
                          ? 'text-rose-400'
                          : station.railTempC <= 6
                          ? 'text-cyan-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {station.railTempC}°C
                    </div>
                    <div className="text-[9px] text-slate-500">Air {station.ambientTempC}°</div>
                  </div>

                  <div className="p-1.5 rounded bg-slate-950/70 border border-slate-800/60">
                    <div className="text-[10px] text-slate-500">Rainfall</div>
                    <div
                      className={`text-sm font-bold ${
                        station.rainfallMmHr > 20 ? 'text-rose-400' : 'text-sky-300'
                      }`}
                    >
                      {station.rainfallMmHr} <span className="text-[9px]">mm/h</span>
                    </div>
                    <div className="text-[9px] text-slate-500">24h: {station.rainfall24hMm}mm</div>
                  </div>

                  <div className="p-1.5 rounded bg-slate-950/70 border border-slate-800/60">
                    <div className="text-[10px] text-slate-500">Wind / Vis</div>
                    <div className="text-sm font-bold text-slate-200">
                      {station.windSpeedKmh} <span className="text-[9px]">km/h</span>
                    </div>
                    <div className="text-[9px] text-slate-500">Vis: {station.visibilityMeters}m</div>
                  </div>
                </div>

                {/* Mobility & Condition Strip */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate max-w-[170px]" title={station.weatherCondition}>
                    {station.weatherCondition}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-[10px]">Mobility:</span>
                    <span
                      className={`font-bold ${
                        station.mobilityIndex >= 80 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {station.mobilityIndex}%
                    </span>
                  </div>
                </div>

                {/* Active Alerts for this station if expanded */}
                {isSelected && station.activeAlerts.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1 animate-fadeIn">
                    <span className="text-[10px] text-rose-400 font-bold uppercase flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Station Advisory Notes:
                    </span>
                    {station.activeAlerts.map((alt, i) => (
                      <p key={i} className="text-[11px] text-slate-300 bg-slate-950/80 p-1.5 rounded border border-slate-800">
                        {alt}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 24-HOUR FORECAST CHART: AMBIENT TEMP, RAIL TEMP, PRECIPITATION & SAFETY LIMITS */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-sky-900/40 space-y-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                24-Hour Regional Weather & Rail Surface Temperature Forecast
              </h4>
              <p className="text-[11px] text-slate-400 font-sans">
                Correlating ambient temperature, rail surface expansion ($T_R$), and rainfall with Indian Railways de-stressing safety limits ($T_d \pm 14°C$).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-rose-500 inline-block" />
              <span>Buckling Ceiling (52°C)</span>
            </span>
            <span>|</span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
              <span>Fracture Floor (8°C)</span>
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecastChartData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
              <YAxis
                yAxisId="left"
                stroke="#f59e0b"
                fontSize={11}
                domain={[0, 65]}
                unit="°C"
                label={{ value: 'Temp (°C)', angle: -90, position: 'insideLeft', fill: '#f59e0b', fontSize: 10 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#38bdf8"
                fontSize={11}
                domain={[0, 60]}
                unit="mm"
                label={{ value: 'Rain (mm/h)', angle: 90, position: 'insideRight', fill: '#38bdf8', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px', fontFamily: 'monospace' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />

              {/* Safety Threshold Reference Lines */}
              <ReferenceLine
                yAxisId="left"
                y={52}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                label={{ value: 'Buckling Risk Ceiling (52°C)', fill: '#f43f5e', fontSize: 9, position: 'insideTopLeft' }}
              />
              <ReferenceLine
                yAxisId="left"
                y={8}
                stroke="#38bdf8"
                strokeDasharray="4 4"
                label={{ value: 'Cold Fracture Floor (8°C)', fill: '#38bdf8', fontSize: 9, position: 'insideBottomLeft' }}
              />

              {/* Precipitation Bar */}
              <Bar
                yAxisId="right"
                dataKey="rainfallMm"
                name="Rainfall Intensity (mm/h)"
                fill="#0284c7"
                radius={[4, 4, 0, 0]}
                opacity={0.7}
                maxBarSize={32}
              />

              {/* Rail Temperature Line */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="railTemp"
                name="Rail Surface Temp (TR °C)"
                stroke="#f97316"
                strokeWidth={3}
                dot={{ r: 4, fill: '#f97316' }}
              />

              {/* Ambient Air Temperature Line */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="ambientTemp"
                name="Ambient Air Temp (°C)"
                stroke="#eab308"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={{ r: 3, fill: '#eab308' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SCHEDULED MAINTENANCE BLOCKS: WEATHER FEASIBILITY MATRIX */}
      <div id="weather-affected-blocks-table" className="bg-slate-900/60 p-4 rounded-xl border border-sky-900/40 space-y-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-teal-400" />
              Maintenance Block Weather Feasibility Matrix ({evaluatedBlocks.length} Track Blocks)
            </h4>
            <p className="text-[11px] text-slate-400 font-sans">
              Real-time evaluation of outdoor maintenance tasks against environmental constraints (moisture, catenary wind limits, and rail thermal expansion).
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              {evaluatedBlocks.filter((b) => b.status === 'FEASIBLE').length} Feasible
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
              {evaluatedBlocks.filter((b) => b.status === 'CONDITIONAL' || b.status === 'RESTRICTED').length} Warning
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
              {evaluatedBlocks.filter((b) => b.status === 'SUSPENDED').length} Suspended
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="border border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="p-2.5">Block ID &amp; Task</th>
                  <th className="p-2.5">Corridor / Section</th>
                  <th className="p-2.5">Scheduled Slot</th>
                  <th className="p-2.5">Feasibility</th>
                  <th className="p-2.5">Environmental Limiting Factor</th>
                  <th className="p-2.5">AI Recommended Action</th>
                  <th className="p-2.5 text-right">Adjustment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {evaluatedBlocks.map((blk) => {
                  const isApplied = appliedMitigations[blk.blockId];
                  return (
                    <tr
                      key={blk.blockId}
                      className="hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-2.5">
                        <div className="font-bold text-slate-200">{blk.blockId}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]" title={blk.title}>
                          {blk.title}
                        </div>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {blk.department}
                        </span>
                      </td>

                      <td className="p-2.5">
                        <div className="text-teal-300 font-semibold">{blk.corridorId}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]" title={blk.section}>
                          {blk.section}
                        </div>
                      </td>

                      <td className="p-2.5 text-slate-300 whitespace-nowrap">
                        {blk.scheduledTime}
                      </td>

                      <td className="p-2.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold border inline-flex items-center gap-1 ${
                            blk.status === 'FEASIBLE'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : blk.status === 'CONDITIONAL'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : blk.status === 'RESTRICTED'
                              ? 'bg-orange-950 text-orange-300 border-orange-800'
                              : 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                          }`}
                        >
                          {blk.status === 'FEASIBLE' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                          {blk.status !== 'FEASIBLE' && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                          {blk.feasibilityScore}% {blk.status}
                        </span>
                      </td>

                      <td className="p-2.5 text-slate-300 max-w-[220px]">
                        <p className="text-[11px] line-clamp-2" title={blk.limitingFactor}>
                          {blk.limitingFactor}
                        </p>
                      </td>

                      <td className="p-2.5 text-teal-200 max-w-[240px]">
                        <p className="text-[11px] line-clamp-2" title={blk.aiMitigation}>
                          {blk.aiMitigation}
                        </p>
                        {blk.suggestedRescheduleTime && (
                          <span className="text-[10px] text-amber-300 font-bold block mt-0.5">
                            Suggested Slot: {blk.suggestedRescheduleTime}
                          </span>
                        )}
                      </td>

                      <td className="p-2.5 text-right whitespace-nowrap">
                        {blk.status === 'FEASIBLE' ? (
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        ) : isApplied ? (
                          <span className="px-2 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Adjusted
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApplyMitigation(blk.blockId)}
                            className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold shadow-sm transition-all"
                            title="Apply AI Environmental Mitigation"
                          >
                            Apply Mitigation
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section Footer Callout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>
              Automated weather grounding prevents catastrophic rail buckling incidents ($T_R &gt; 52°C$) and eliminates defective thermit weld rejections due to moisture quenching.
            </span>
          </div>
          <button
            onClick={() => onNavigate('planning')}
            className="text-teal-300 hover:text-teal-200 underline font-bold self-start sm:self-auto"
          >
            Review in AI Planning Engine →
          </button>
        </div>
      </div>

      {/* RDSO COMPLIANCE GUIDELINES MODAL */}
      {showComplianceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e162c] border border-teal-700/80 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-mono">
            <div className="flex items-center justify-between px-5 py-4 border-b border-teal-950 bg-[#0a1020]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  RDSO Indian Railways Weather Compliance Standards
                </h3>
              </div>
              <button
                onClick={() => setShowComplianceModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-300 max-h-[75vh] overflow-y-auto">
              <div className="p-3 rounded bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="font-bold text-teal-300 block">
                  1. Rail Temperature &amp; Sun-Kink Prevention (LWR Manual Para 8.1)
                </span>
                <p className="text-slate-400 text-[11px]">
                  Continuous Welded Rail (CWR) requires maintenance only within $T_d - 30°C$ to $T_d + 10°C$ (where nominal de-stressing temperature $T_d = 38°C$). When rail surface temperature exceeds 52°C, heavy lifting and tamping are strictly prohibited to prevent lateral buckling.
                </p>
              </div>

              <div className="p-3 rounded bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="font-bold text-teal-300 block">
                  2. Precipitation &amp; Alumino-Thermit (AT) Welding (IRPWM Annexure 5/1)
                </span>
                <p className="text-slate-400 text-[11px]">
                  Thermit welding is categorically prohibited during active rainfall or when rail ends are wet. Moisture causes violent steam expansion and porous voids in molten steel, creating catastrophic micro-fractures under 25-ton axle load freight.
                </p>
              </div>

              <div className="p-3 rounded bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="font-bold text-teal-300 block">
                  3. Ballast Cleaning &amp; Deep Screening Moisture Ceiling (Para 3.2.4)
                </span>
                <p className="text-slate-400 text-[11px]">
                  Ballast Cleaners (BCM) require dry ballast (moisture &lt; 5%). In heavy downpours, wet slurry blinds vibrating screen meshes, causing severe track geometry settlement.
                </p>
              </div>

              <div className="p-3 rounded bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="font-bold text-teal-300 block">
                  4. 25kV OHE Catenary Wind Sway &amp; Lightning Protocol (ACTM Vol II)
                </span>
                <p className="text-slate-400 text-[11px]">
                  When sustained wind speeds exceed 60 km/h or gusts exceed 75 km/h, aerial tower wagon cradle maintenance must be suspended. Lightning within 15 km mandates immediate earthing and personnel evacuation to ground.
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#0a1020] border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowComplianceModal(false)}
                className="px-4 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs"
              >
                Understood &amp; Compliant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
