import {
  ShadowBlockMachineConfig,
  ShadowBlockMachineType,
  ShadowBlockRunStatus,
  ShadowBlockTelemetry,
  SidingDockPoint,
  SlipstreamScenario,
} from '../types';

// Certified Machines for Dynamic Moving Blocks
export const SHADOW_BLOCK_MACHINES: ShadowBlockMachineConfig[] = [
  {
    id: 'MC-SPURT-409',
    name: 'SPURT-409 High-Speed Ultrasonic Car',
    type: 'USFD_SPURT',
    department: 'ENGINEERING',
    operationalSpeedKmph: 42,
    maxTransitSpeedKmph: 75,
    brakingDecelerationMps2: 0.95,
    inspectionSensorName: 'Multi-Angle 9-Probe Ultrasonic Wheel & Laser Rail Profiler',
    crewChief: 'Shri R. K. Vishwakarma (Sr. PWI/USFD)',
    certificationAuthority: 'RDSO Specification TM/SM/388 Rev-2',
    description:
      'Continuous 160-sample/sec acoustic testing of both gauge and field faces for internal transverse fissures without stopping traffic.',
  },
  {
    id: 'MC-OHE-LASER-07',
    name: 'OHE-SCAN-7 Catenary Dynamic Profiler',
    type: 'OHE_LASER_PROFILER',
    department: 'TRACTION',
    operationalSpeedKmph: 52,
    maxTransitSpeedKmph: 85,
    brakingDecelerationMps2: 1.1,
    inspectionSensorName: 'Stereo LIDAR 25kV Contact Wire Wear & Stagger Profiler',
    crewChief: 'Er. S. Mukhopadhyay (DEE/TRD)',
    certificationAuthority: 'CORE / RDSO TI/SPC/OHE/DYNAMIC/0120',
    description:
      'High-speed optical laser measurement of 25kV copper contact wire thickness, dropper tension, and pantograph contact force at 50+ km/h.',
  },
  {
    id: 'MC-GEOM-ROVER-X',
    name: 'ROVER-X Track Alignment & Twist Scanner',
    type: 'LIDAR_GEOMETRY_ROVER',
    department: 'ENGINEERING',
    operationalSpeedKmph: 35,
    maxTransitSpeedKmph: 60,
    brakingDecelerationMps2: 1.25,
    inspectionSensorName: 'Inertial Navigation & High-Density Laser Track Gauge Scanner',
    crewChief: 'Shri D. P. Yadav (AEN/Track)',
    certificationAuthority: 'IRICEN Track Geometry Standards 2024',
    description:
      'Millimeter-precision inertial gyro scanner measuring rail gauge, cross-level, twist, and alignment in the moving slipstream.',
  },
  {
    id: 'MC-RAPID-WELD-02',
    name: 'MOBIL-WELD-02 Rapid Flash-Butt Machine',
    type: 'RAPID_FLASH_WELD',
    department: 'ENGINEERING',
    operationalSpeedKmph: 28,
    maxTransitSpeedKmph: 55,
    brakingDecelerationMps2: 0.85,
    inspectionSensorName: 'Computer-Controlled Automated Flash Butt Welding Head',
    crewChief: 'Shri Amarjeet Singh (SSE/P-Way)',
    certificationAuthority: 'RDSO Manual for Flash Butt Welding',
    description:
      'Mobile self-contained track unit designed for rapid in-situ weld defect excision and restoration during extended freight gaps.',
  },
];

// Corridors Siding Network
export const CORRIDOR_SIDINGS: Record<string, SidingDockPoint[]> = {
  C001: [
    {
      sidingId: 'SD-01',
      name: 'Faridabad South Goods Loop',
      kmMarker: 14.5,
      turnoutSpeedLimitKmph: 30,
      loopLengthMeters: 750,
      isClear: true,
    },
    {
      sidingId: 'SD-02',
      name: 'Palwal Outer Yard Siding #3',
      kmMarker: 28.2,
      turnoutSpeedLimitKmph: 30,
      loopLengthMeters: 850,
      isClear: true,
    },
    {
      sidingId: 'SD-03',
      name: 'Kosi Kalan Common Loop Line',
      kmMarker: 41.8,
      turnoutSpeedLimitKmph: 30,
      loopLengthMeters: 780,
      isClear: true,
    },
    {
      sidingId: 'SD-04',
      name: 'Chhata Emergency Egress Pocket',
      kmMarker: 54.0,
      turnoutSpeedLimitKmph: 45,
      loopLengthMeters: 650,
      isClear: true,
    },
  ],
  C002: [
    {
      sidingId: 'SD-DFC-01',
      name: 'Dadri DFC Yard Departure Siding',
      kmMarker: 12.0,
      turnoutSpeedLimitKmph: 40,
      loopLengthMeters: 1500,
      isClear: true,
    },
    {
      sidingId: 'SD-DFC-02',
      name: 'Prithla Crossing Siding #1',
      kmMarker: 26.5,
      turnoutSpeedLimitKmph: 40,
      loopLengthMeters: 1500,
      isClear: true,
    },
    {
      sidingId: 'SD-DFC-03',
      name: 'Rewari DFC Junction Loop',
      kmMarker: 45.0,
      turnoutSpeedLimitKmph: 40,
      loopLengthMeters: 1500,
      isClear: true,
    },
  ],
  C003: [
    {
      sidingId: 'SD-HWH-01',
      name: 'Burdwan West Loop Siding',
      kmMarker: 16.2,
      turnoutSpeedLimitKmph: 30,
      loopLengthMeters: 720,
      isClear: true,
    },
    {
      sidingId: 'SD-HWH-02',
      name: 'Asansol Down Goods Relief',
      kmMarker: 32.4,
      turnoutSpeedLimitKmph: 30,
      loopLengthMeters: 800,
      isClear: true,
    },
    {
      sidingId: 'SD-HWH-03',
      name: 'Dhanbad Outer Yard Pocket',
      kmMarker: 48.6,
      turnoutSpeedLimitKmph: 30,
      loopLengthMeters: 750,
      isClear: true,
    },
  ],
  C004: [
    {
      sidingId: 'SD-GQ-01',
      name: 'Mathura South Bypass Loop',
      kmMarker: 18.0,
      turnoutSpeedLimitKmph: 30,
      loopLengthMeters: 800,
      isClear: true,
    },
    {
      sidingId: 'SD-GQ-02',
      name: 'Agra Fort Freight Interchange',
      kmMarker: 36.5,
      turnoutSpeedLimitKmph: 30,
      loopLengthMeters: 850,
      isClear: true,
    },
    {
      sidingId: 'SD-GQ-03',
      name: 'Raja Ki Mandi Up Loop',
      kmMarker: 52.1,
      turnoutSpeedLimitKmph: 30,
      loopLengthMeters: 700,
      isClear: true,
    },
  ],
};

// Preset Scenarios
export const SLIPSTREAM_SCENARIOS: SlipstreamScenario[] = [
  {
    id: 'SCN-01',
    name: 'High-Density Vande Bharat Headway Slipstream',
    badge: 'FLAGSHIP EXPRESS',
    corridorId: 'C001',
    corridorName: 'Delhi – Agra Golden Trunk Line',
    leadTrain: {
      id: '12002',
      name: 'New Delhi – Bhopal Shatabdi Express',
      speed: 110,
      initialKm: 46.0,
    },
    trailTrain: {
      id: '22436',
      name: 'Vande Bharat Express (16 Coaches)',
      speed: 125,
      initialKm: 6.0,
    },
    machine: SHADOW_BLOCK_MACHINES[0], // SPURT-409
    initialMachineKm: 22.0,
    initialMachineSpeed: 42,
    description:
      'Injects high-speed USFD ultrasonic testing into the 40 km moving headway between Bhopal Shatabdi and trailing Vande Bharat. Maintenance runs live without losing a single train path.',
    operationalObjective:
      'Complete 18.5 km of rail internal ultrasonic scanning before executing a smooth automated diversion into Kosi Kalan Siding at KM 41.8.',
  },
  {
    id: 'SCN-02',
    name: 'Heavy-Haul Freight Slipstream Catenary Laser Profiling',
    badge: 'DEDICATED FREIGHT',
    corridorId: 'C002',
    corridorName: 'Western DFC (Dadri – Rewari)',
    leadTrain: {
      id: 'DFC-8802',
      name: 'Double-Stack Container Express (100 TEU)',
      speed: 75,
      initialKm: 48.0,
    },
    trailTrain: {
      id: 'DFC-9914',
      name: 'Heavy Haul Coal Rake (58 BOXNHL)',
      speed: 80,
      initialKm: 10.0,
    },
    machine: SHADOW_BLOCK_MACHINES[1], // OHE-SCAN-7
    initialMachineKm: 27.0,
    initialMachineSpeed: 52,
    description:
      'Performs 25kV OHE contact wire thickness & dropper tension LIDAR scan at 52 km/h in the inter-freight slot. Zero freight detention penalty incurred.',
    operationalObjective:
      'Map 100% of contact wire wear across 22 km of high-voltage feeder without de-energizing the catenary or stopping freight flows.',
  },
  {
    id: 'SCN-03',
    name: 'Tightening Headway Emergency Siding Egress Drill',
    badge: 'SAFETY STRESS TEST',
    corridorId: 'C001',
    corridorName: 'Delhi – Agra Section',
    leadTrain: {
      id: '12002',
      name: 'Bhopal Shatabdi Express',
      speed: 110,
      initialKm: 45.0,
    },
    trailTrain: {
      id: '12952',
      name: 'Mumbai Rajdhani Express (Approaching Fast)',
      speed: 130,
      initialKm: 14.5,
    },
    machine: SHADOW_BLOCK_MACHINES[2], // ROVER-X
    initialMachineKm: 24.5,
    initialMachineSpeed: 35,
    description:
      'Demonstrates the automatic Kavach ATP caution boundary trigger. As Rajdhani rapidly closes the gap, the system commands and locks a safe siding diversion at Palwal Outer Yard (KM 28.2).',
    operationalObjective:
      'Verify fail-safe Point-of-No-Return (PNR) calculation and automatic turnout interlocking before the trailing express hits the Caution (Double Yellow) aspect.',
  },
];

// Audio Feedback System using Web Audio API
class ShadowBlockAudio {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  // Play a soft acoustic sonar radar ping for ultrasonic sweeps
  public playSonarPing() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Play caution warning chime when gap narrows
  public playCautionAlert() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
      osc.frequency.setValueAtTime(440.0, this.ctx.currentTime + 0.1); // A4

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.28);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Play successful docking chime
  public playDockSuccess() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.05, this.ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.08);
        osc.stop(this.ctx.currentTime + idx * 0.08 + 0.25);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  }
}

export const shadowBlockAudio = new ShadowBlockAudio();

/**
 * Calculates real-time telemetry metrics for the Slipstream Shadow-Block
 */
export function calculateTelemetry(
  scenario: SlipstreamScenario,
  leadKm: number,
  leadSpeed: number,
  machineKm: number,
  machineSpeed: number,
  machineStatus: ShadowBlockRunStatus,
  trailKm: number,
  trailSpeed: number,
  trackKmScanned: number,
  defectsDetected: number
): ShadowBlockTelemetry {
  const sidings = CORRIDOR_SIDINGS[scenario.corridorId] || CORRIDOR_SIDINGS['C001'];

  // Headway gaps
  const slipstreamGapKm = Math.max(0, machineKm - trailKm);
  const leadGapKm = Math.max(0, leadKm - machineKm);

  // Speed differential in km/h
  const closingSpeedKmph = Math.max(0.1, trailSpeed - machineSpeed);
  const headwayHours = slipstreamGapKm / closingSpeedKmph;
  const headwayMinutes = Math.max(0, headwayHours * 60);

  // Kavach Automatic Train Protection (ATP) Braking Profile:
  // Emergency Braking Distance (EBD) + Service Braking Distance (SBD) + 4-aspect signal block buffer
  // Typical high-speed train at 120 km/h requires ~1.2 km service stop + 1 km block buffer = ~2.2 km
  const trailSpeedMps = (trailSpeed * 1000) / 3600;
  const kavachServiceBrakingKm = (trailSpeedMps * trailSpeedMps) / (2 * 0.65 * 1000) + 0.5; // in KM
  const safetyCautionThresholdKm = kavachServiceBrakingKm + 2.0; // Margin before Double-Yellow aspect

  const kavachBrakingMarginKm = Math.max(0, slipstreamGapKm - safetyCautionThresholdKm);
  const isCautionZoneActive = slipstreamGapKm < safetyCautionThresholdKm;

  // Next siding along the track ahead of machine
  const nextSiding =
    sidings.find((s) => s.kmMarker >= machineKm) ||
    sidings[sidings.length - 1] || {
      sidingId: 'SD-DEF',
      name: 'Next Block Station Loop',
      kmMarker: 60.0,
      turnoutSpeedLimitKmph: 30,
      loopLengthMeters: 750,
      isClear: true,
    };

  const distanceToNextSidingKm = Math.max(0, nextSiding.kmMarker - machineKm);
  const timeToSidingSeconds =
    machineSpeed > 0 ? (distanceToNextSidingKm / machineSpeed) * 3600 : 0;

  // Dock window status
  let dockWindowClearanceStatus: 'SAFE' | 'URGENT_DOCK' | 'MISSED_WINDOW' = 'SAFE';
  if (slipstreamGapKm < 3.5 || distanceToNextSidingKm < 0.4) {
    dockWindowClearanceStatus = 'URGENT_DOCK';
  } else if (slipstreamGapKm < 1.8 && distanceToNextSidingKm > 1.0) {
    dockWindowClearanceStatus = 'MISSED_WINDOW';
  }

  // Commercial savings calculation
  // Avoided Express detention: 120 minutes of static block saved
  // Revenue saved: Express train detention penalty ~₹25,000/hr + freight demurrage ~₹40,000/hr
  const commercialDelayMinutesAvoided = 180;
  const revenueLossAvoidedInr = Math.round(
    commercialDelayMinutesAvoided * 850 + trackKmScanned * 12000
  );

  return {
    leadTrainId: scenario.leadTrain.id,
    leadTrainName: scenario.leadTrain.name,
    leadKm,
    leadSpeedKmph: leadSpeed,

    machineId: scenario.machine.id,
    machineName: scenario.machine.name,
    machineType: scenario.machine.type,
    machineKm,
    machineSpeedKmph: machineSpeed,
    machineStatus,

    trailTrainId: scenario.trailTrain.id,
    trailTrainName: scenario.trailTrain.name,
    trailKm,
    trailSpeedKmph: trailSpeed,

    slipstreamGapKm,
    leadGapKm,
    headwayMinutes,
    kavachBrakingMarginKm,
    isCautionZoneActive,

    nextSiding,
    distanceToNextSidingKm,
    timeToSidingSeconds,
    dockWindowClearanceStatus,

    trackKmScanned,
    defectsDetectedLive: defectsDetected,
    commercialDelayMinutesAvoided,
    revenueLossAvoidedInr,
  };
}

/**
 * Generates an official Moving Block Authorization Permit for dispatch
 */
export function generateMovingBlockPermit(
  telemetry: ShadowBlockTelemetry,
  scenario: SlipstreamScenario
): {
  permitNumber: string;
  authorizationToken: string;
  timestamp: string;
  issuedBy: string;
  authorizedSection: string;
  safetyEnvelopeKm: number;
  mandatoryEgressStation: string;
  kavachProtocol: string;
} {
  const tokenRand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const permitNum = `T/A-912-MB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    permitNumber: permitNum,
    authorizationToken: `KAVACH-MB-${scenario.corridorId}-${tokenRand}-RDSO-VALID`,
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    issuedBy: 'Central Control Room (Dynamic Traffic Director)',
    authorizedSection: `${scenario.corridorName} (KM ${telemetry.machineKm.toFixed(1)} to KM ${telemetry.nextSiding.kmMarker.toFixed(1)})`,
    safetyEnvelopeKm: parseFloat((telemetry.slipstreamGapKm).toFixed(2)),
    mandatoryEgressStation: telemetry.nextSiding.name,
    kavachProtocol: 'SIL-4 Moving Headway Guard / ETCS Level-2 Virtual Shadow Interlocking',
  };
}
