import {
  SustainabilityBlockLedgerItem,
  SustainabilityMetrics,
  LocomotiveTractionType,
} from '../types';

// ==========================================
// EMPIRICAL RAIL EMISSIONS CONSTANTS (RDSO / CEA INDIA)
// ==========================================
export const SUSTAINABILITY_CONSTANTS = {
  DIESEL_IDLE_LITERS_PER_HOUR: 30.0, // Liters of HSD consumed per idle locomotive hour (WDG-4 / WDP-4D)
  DIESEL_CO2_PER_LITER: 2.68, // kg CO2e emitted per liter of diesel fuel combusted
  DIESEL_PRICE_PER_LITER_INR: 92.5, // Commercial railway bulk HSD rate in INR
  ELECTRIC_IDLE_KWH_PER_HOUR: 55.0, // kWh consumed by auxiliary hotel loads (blowers, compressors, HVAC)
  ELECTRIC_CO2_PER_KWH: 0.82, // kg CO2e per kWh from Indian National Grid mix (CEA GHG baseline)
  ELECTRIC_PRICE_PER_KWH_INR: 7.20, // Commercial high-tension industrial railway traction tariff in INR
  TREES_SEQUESTERED_PER_TONNE_CO2: 45, // Average mature trees required to absorb 1 metric ton of CO2 annually
  FOREST_ACRES_PER_TONNE_CO2: 0.42, // Equivalent forest acres carbon absorption
};

// Default maintenance blocks with realistic railway operational parameters
export const DEFAULT_SUSTAINABILITY_LEDGER: SustainabilityBlockLedgerItem[] = [
  {
    blockId: 'BLK-001',
    blockName: '25kV Catenary Wire Periodic Overhaul',
    department: 'TRACTION',
    corridorId: 'C001',
    corridorName: 'Delhi - Agra Main Trunk',
    section: 'Palwal - Kosi Kalan (KM 60–85)',
    heldTrainNumber: '12002',
    heldTrainName: 'Bhopal Shatabdi Express',
    tractionType: 'ELECTRIC',
    locoModel: 'WAP-7 (6000 HP)',
    baselineIdlingMinutes: 75,
    optimizedIdlingMinutes: 18,
    dwellMinutesSaved: 57,
    dieselSavedLiters: 0,
    electricSavedKwh: 52.25,
    co2SavedKg: 42.85,
    financialSavingsInr: 376.2,
    antiIdlingProtocol: 'GREEN_WAVE_PACING',
    certificationStatus: 'CERTIFIED',
  },
  {
    blockId: 'BLK-004',
    blockName: 'Deep Ballast Screening & Track Lifting',
    department: 'ENGINEERING',
    corridorId: 'C002',
    corridorName: 'Western DFC (Rewari - Madar)',
    section: 'Ateli - Phulera (KM 110–135)',
    heldTrainNumber: 'BOXN-8201',
    heldTrainName: 'Heavy-Haul Coal Rake',
    tractionType: 'DIESEL',
    locoModel: 'Twin WDG-4 (9000 HP Combined)',
    baselineIdlingMinutes: 135,
    optimizedIdlingMinutes: 28,
    dwellMinutesSaved: 107,
    dieselSavedLiters: 107.0, // Twin locos consume ~60L/hr total
    electricSavedKwh: 0,
    co2SavedKg: 286.76,
    financialSavingsInr: 9897.5,
    antiIdlingProtocol: 'AESS_ENGAGED',
    certificationStatus: 'EXEMPLARY',
  },
  {
    blockId: 'BLK-007',
    blockName: 'Continuous Action 09-3X Tamping & Packing',
    department: 'ENGINEERING',
    corridorId: 'C001',
    corridorName: 'Delhi - Agra Main Trunk',
    section: 'Faridabad - Ballabgarh (KM 28–42)',
    heldTrainNumber: '22436',
    heldTrainName: 'Vande Bharat Express (Varanasi)',
    tractionType: 'ELECTRIC',
    locoModel: 'Trainset-18 Distributed Power',
    baselineIdlingMinutes: 60,
    optimizedIdlingMinutes: 12,
    dwellMinutesSaved: 48,
    dieselSavedLiters: 0,
    electricSavedKwh: 44.0,
    co2SavedKg: 36.08,
    financialSavingsInr: 316.8,
    antiIdlingProtocol: 'GREEN_WAVE_PACING',
    certificationStatus: 'CERTIFIED',
  },
  {
    blockId: 'BLK-010',
    blockName: 'Turnout 1:12 Diamond Crossing Replacement',
    department: 'ENGINEERING',
    corridorId: 'C003',
    corridorName: 'Howrah - Dhanbad Coal Link',
    section: 'Asansol West Siding (KM 215)',
    heldTrainNumber: 'BTPN-4412',
    heldTrainName: 'Petroleum Hydrocarbon Tanker Rake',
    tractionType: 'DIESEL',
    locoModel: 'WDG-4D Dual-Cab (4500 HP)',
    baselineIdlingMinutes: 110,
    optimizedIdlingMinutes: 22,
    dwellMinutesSaved: 88,
    dieselSavedLiters: 44.0,
    electricSavedKwh: 0,
    co2SavedKg: 117.92,
    financialSavingsInr: 4070.0,
    antiIdlingProtocol: 'AESS_ENGAGED',
    certificationStatus: 'CERTIFIED',
  },
  {
    blockId: 'BLK-014',
    blockName: 'S&T Electronic Interlocking & Point Machine',
    department: 'S&T',
    corridorId: 'C004',
    corridorName: 'Mathura - Jhansi Mixed Corridor',
    section: 'Dholpur Junction Loop (KM 52)',
    heldTrainNumber: '12626',
    heldTrainName: 'Kerala Express',
    tractionType: 'ELECTRIC',
    locoModel: 'WAP-7 (6000 HP)',
    baselineIdlingMinutes: 80,
    optimizedIdlingMinutes: 20,
    dwellMinutesSaved: 60,
    dieselSavedLiters: 0,
    electricSavedKwh: 55.0,
    co2SavedKg: 45.1,
    financialSavingsInr: 396.0,
    antiIdlingProtocol: 'DYNAMIC_SIDING_HOLD',
    certificationStatus: 'CERTIFIED',
  },
  {
    blockId: 'BLK-018',
    blockName: 'USFD Rail Flaw Micro-Crack Ultrasonic Testing',
    department: 'ENGINEERING',
    corridorId: 'C002',
    corridorName: 'Western DFC (Rewari - Madar)',
    section: 'Rewari South Feeder (KM 18–35)',
    heldTrainNumber: 'CONCOR-71',
    heldTrainName: 'Double-Stack Container Express',
    tractionType: 'DIESEL',
    locoModel: 'WDG-4 Freight (4000 HP)',
    baselineIdlingMinutes: 95,
    optimizedIdlingMinutes: 15,
    dwellMinutesSaved: 80,
    dieselSavedLiters: 40.0,
    electricSavedKwh: 0,
    co2SavedKg: 107.2,
    financialSavingsInr: 3700.0,
    antiIdlingProtocol: 'SHADOW_BLOCK_SLIPSTREAM',
    certificationStatus: 'EXEMPLARY',
  },
  {
    blockId: 'BLK-022',
    blockName: 'OHE Catenary Dropper & Insulator Wash',
    department: 'TRACTION',
    corridorId: 'C001',
    corridorName: 'Delhi - Agra Main Trunk',
    section: 'Kosi Kalan - Chhata (KM 105–122)',
    heldTrainNumber: '12050',
    heldTrainName: 'Gatimaan Express (160 km/h)',
    tractionType: 'ELECTRIC',
    locoModel: 'WAP-5 High-Speed (5450 HP)',
    baselineIdlingMinutes: 70,
    optimizedIdlingMinutes: 14,
    dwellMinutesSaved: 56,
    dieselSavedLiters: 0,
    electricSavedKwh: 51.33,
    co2SavedKg: 42.09,
    financialSavingsInr: 369.6,
    antiIdlingProtocol: 'GREEN_WAVE_PACING',
    certificationStatus: 'CERTIFIED',
  },
  {
    blockId: 'BLK-026',
    blockName: 'Digital Axle Counter Multi-Section Recalibration',
    department: 'S&T',
    corridorId: 'C003',
    corridorName: 'Howrah - Dhanbad Coal Link',
    section: 'Raniganj - Durgapur (KM 180–198)',
    heldTrainNumber: 'NMG-3920',
    heldTrainName: 'Automobile Carrier Freight',
    tractionType: 'ELECTRIC',
    locoModel: 'WAG-9 Freight (6120 HP)',
    baselineIdlingMinutes: 85,
    optimizedIdlingMinutes: 25,
    dwellMinutesSaved: 60,
    dieselSavedLiters: 0,
    electricSavedKwh: 55.0,
    co2SavedKg: 45.1,
    financialSavingsInr: 396.0,
    antiIdlingProtocol: 'AESS_ENGAGED',
    certificationStatus: 'PROJECTED',
  },
  {
    blockId: 'BLK-031',
    blockName: 'Mobile Flash Butt In-Track Rail Welding',
    department: 'ENGINEERING',
    corridorId: 'C002',
    corridorName: 'Western DFC (Rewari - Madar)',
    section: 'Madar Junction North (KM 280–294)',
    heldTrainNumber: 'BOST-9104',
    heldTrainName: 'Steel Coils & Slab Freight',
    tractionType: 'DIESEL',
    locoModel: 'Twin WDG-4 (9000 HP)',
    baselineIdlingMinutes: 140,
    optimizedIdlingMinutes: 30,
    dwellMinutesSaved: 110,
    dieselSavedLiters: 110.0,
    electricSavedKwh: 0,
    co2SavedKg: 294.8,
    financialSavingsInr: 10175.0,
    antiIdlingProtocol: 'AESS_ENGAGED',
    certificationStatus: 'EXEMPLARY',
  },
  {
    blockId: 'BLK-038',
    blockName: 'Yamuna River Major Bridge Girder Maintenance',
    department: 'ENGINEERING',
    corridorId: 'C001',
    corridorName: 'Delhi - Agra Main Trunk',
    section: 'Agra Fort Approach (KM 188)',
    heldTrainNumber: '12952',
    heldTrainName: 'Mumbai Rajdhani Express',
    tractionType: 'ELECTRIC',
    locoModel: 'WAP-7 Push-Pull (6000 HP)',
    baselineIdlingMinutes: 90,
    optimizedIdlingMinutes: 18,
    dwellMinutesSaved: 72,
    dieselSavedLiters: 0,
    electricSavedKwh: 66.0,
    co2SavedKg: 54.12,
    financialSavingsInr: 475.2,
    antiIdlingProtocol: 'GREEN_WAVE_PACING',
    certificationStatus: 'CERTIFIED',
  },
  {
    blockId: 'BLK-041',
    blockName: 'Substation 132kV/25kV Isolator Maintenance',
    department: 'TRACTION',
    corridorId: 'C004',
    corridorName: 'Mathura - Jhansi Mixed Corridor',
    section: 'Gwalior Traction Substation (KM 120)',
    heldTrainNumber: 'BCCN-3318',
    heldTrainName: 'Bulk Cement Tanker Rake',
    tractionType: 'ELECTRIC',
    locoModel: 'WAG-9 (6120 HP)',
    baselineIdlingMinutes: 105,
    optimizedIdlingMinutes: 25,
    dwellMinutesSaved: 80,
    dieselSavedLiters: 0,
    electricSavedKwh: 73.33,
    co2SavedKg: 60.13,
    financialSavingsInr: 528.0,
    antiIdlingProtocol: 'DYNAMIC_SIDING_HOLD',
    certificationStatus: 'CERTIFIED',
  },
  {
    blockId: 'BLK-SHADOW-01',
    blockName: 'Moving Slipstream Ultrasonic & Geometry Scan',
    department: 'ENGINEERING',
    corridorId: 'C001',
    corridorName: 'Delhi - Agra Main Trunk',
    section: 'Tughlakabad - Palwal (KM 12–55)',
    heldTrainNumber: '12004',
    heldTrainName: 'Lucknow Shatabdi Express',
    tractionType: 'ELECTRIC',
    locoModel: 'WAP-7 (6000 HP)',
    baselineIdlingMinutes: 120, // Traditional static lockout would stop train 2 hrs
    optimizedIdlingMinutes: 0, // Dynamic shadow block has 0 min detention
    dwellMinutesSaved: 120,
    dieselSavedLiters: 0,
    electricSavedKwh: 110.0,
    co2SavedKg: 90.2,
    financialSavingsInr: 792.0,
    antiIdlingProtocol: 'SHADOW_BLOCK_SLIPSTREAM',
    certificationStatus: 'EXEMPLARY',
  },
];

// Calculate filtered and dynamically scaled metrics
export function calculateSustainabilityMetrics(
  ledger: SustainabilityBlockLedgerItem[],
  dwellOptimizationFactor: number = 1.0, // 0.5 to 1.5 multiplier
  aessAdoptionRate: number = 0.85, // 0 to 1 percentage
  corridorFilter: string = 'ALL',
  tractionFilter: string = 'ALL'
): SustainabilityMetrics {
  const filtered = ledger.filter((item) => {
    if (corridorFilter !== 'ALL' && item.corridorId !== corridorFilter) return false;
    if (tractionFilter !== 'ALL' && item.tractionType !== tractionFilter) return false;
    return true;
  });

  if (filtered.length === 0) {
    return {
      totalCo2AbatedTonnes: 0,
      dieselSavedLiters: 0,
      electricSavedKwh: 0,
      financialFuelSavingsInr: 0,
      idlingHoursEliminated: 0,
      avgDwellMinutesSavedPerTrain: 0,
      treesOffsetEquivalent: 0,
      carbonIntensityReductionPercent: 0,
    };
  }

  let totalDieselLiters = 0;
  let totalElectricKwh = 0;
  let totalMinutesSaved = 0;
  let baselineTotalIdling = 0;

  filtered.forEach((item) => {
    baselineTotalIdling += item.baselineIdlingMinutes;
    // Scale dwell savings by user slider
    const effectiveMinutesSaved = Math.round(item.dwellMinutesSaved * dwellOptimizationFactor);
    totalMinutesSaved += effectiveMinutesSaved;

    // AESS multiplier scales diesel and electric savings
    const effectiveAessFactor = item.antiIdlingProtocol === 'AESS_ENGAGED' ? aessAdoptionRate : 1.0;

    if (item.tractionType === 'DIESEL') {
      const dieselRate = (effectiveMinutesSaved / 60) * SUSTAINABILITY_CONSTANTS.DIESEL_IDLE_LITERS_PER_HOUR * (item.locoModel.includes('Twin') ? 2 : 1);
      totalDieselLiters += dieselRate * effectiveAessFactor;
    } else {
      const electricRate = (effectiveMinutesSaved / 60) * SUSTAINABILITY_CONSTANTS.ELECTRIC_IDLE_KWH_PER_HOUR;
      totalElectricKwh += electricRate * effectiveAessFactor;
    }
  });

  const dieselCo2Kg = totalDieselLiters * SUSTAINABILITY_CONSTANTS.DIESEL_CO2_PER_LITER;
  const electricCo2Kg = totalElectricKwh * SUSTAINABILITY_CONSTANTS.ELECTRIC_CO2_PER_KWH;
  const totalCo2Kg = dieselCo2Kg + electricCo2Kg;
  const totalCo2Tonnes = parseFloat((totalCo2Kg / 1000).toFixed(2));

  const financialFuel = Math.round(
    totalDieselLiters * SUSTAINABILITY_CONSTANTS.DIESEL_PRICE_PER_LITER_INR +
      totalElectricKwh * SUSTAINABILITY_CONSTANTS.ELECTRIC_PRICE_PER_KWH_INR
  );

  const idlingHours = parseFloat((totalMinutesSaved / 60).toFixed(1));
  const avgDwellSaved = Math.round(totalMinutesSaved / filtered.length);
  const trees = Math.round(totalCo2Tonnes * SUSTAINABILITY_CONSTANTS.TREES_SEQUESTERED_PER_TONNE_CO2);
  const carbonIntensityPercent = parseFloat(
    Math.min(78.5, Math.max(30, (totalMinutesSaved / (baselineTotalIdling || 1)) * 100)).toFixed(1)
  );

  return {
    totalCo2AbatedTonnes: totalCo2Tonnes,
    dieselSavedLiters: Math.round(totalDieselLiters),
    electricSavedKwh: Math.round(totalElectricKwh),
    financialFuelSavingsInr: financialFuel,
    idlingHoursEliminated: idlingHours,
    avgDwellMinutesSavedPerTrain: avgDwellSaved,
    treesOffsetEquivalent: trees,
    carbonIntensityReductionPercent: carbonIntensityPercent,
  };
}

// 24-Hour Emissions Trajectory across daily block shifts
export function get24HourEmissionsTrajectory(dwellFactor: number = 1.0) {
  return [
    { time: '00:00 - 02:00', baseline: 8.4, optimized: Math.max(1.8, +(8.4 * (1 - 0.65 * dwellFactor)).toFixed(2)), avoided: 0 },
    { time: '02:00 - 04:00', baseline: 12.8, optimized: Math.max(2.4, +(12.8 * (1 - 0.72 * dwellFactor)).toFixed(2)), avoided: 0 },
    { time: '04:00 - 06:00', baseline: 6.2, optimized: Math.max(1.2, +(6.2 * (1 - 0.68 * dwellFactor)).toFixed(2)), avoided: 0 },
    { time: '06:00 - 08:00', baseline: 4.1, optimized: Math.max(0.9, +(4.1 * (1 - 0.64 * dwellFactor)).toFixed(2)), avoided: 0 },
    { time: '08:00 - 10:00', baseline: 3.5, optimized: Math.max(0.8, +(3.5 * (1 - 0.60 * dwellFactor)).toFixed(2)), avoided: 0 },
    { time: '10:00 - 12:00', baseline: 9.6, optimized: Math.max(2.1, +(9.6 * (1 - 0.70 * dwellFactor)).toFixed(2)), avoided: 0 },
    { time: '12:00 - 14:00', baseline: 11.2, optimized: Math.max(2.6, +(11.2 * (1 - 0.69 * dwellFactor)).toFixed(2)), avoided: 0 },
    { time: '14:00 - 16:00', baseline: 7.8, optimized: Math.max(1.9, +(7.8 * (1 - 0.66 * dwellFactor)).toFixed(2)), avoided: 0 },
    { time: '16:00 - 18:00', baseline: 5.4, optimized: Math.max(1.4, +(5.4 * (1 - 0.62 * dwellFactor)).toFixed(2)), avoided: 0 },
    { time: '18:00 - 20:00', baseline: 4.2, optimized: Math.max(1.1, +(4.2 * (1 - 0.63 * dwellFactor)).toFixed(2)), avoided: 0 },
    { time: '20:00 - 22:00', baseline: 6.9, optimized: Math.max(1.7, +(6.9 * (1 - 0.67 * dwellFactor)).toFixed(2)), avoided: 0 },
    { time: '22:00 - 24:00', baseline: 10.5, optimized: Math.max(2.3, +(10.5 * (1 - 0.71 * dwellFactor)).toFixed(2)), avoided: 0 },
  ].map((item) => ({
    ...item,
    avoided: +(item.baseline - item.optimized).toFixed(2),
  }));
}

// Corridor Abatement Comparison
export function getCorridorAbatementData(dwellFactor: number = 1.0) {
  return [
    {
      corridor: 'C001 (Delhi-Agra)',
      dieselCo2Kg: 0,
      electricCo2Kg: Math.round(265 * dwellFactor),
      totalCo2Kg: Math.round(265 * dwellFactor),
      dwellSavedMins: Math.round(353 * dwellFactor),
    },
    {
      corridor: 'C002 (Western DFC)',
      dieselCo2Kg: Math.round(798 * dwellFactor),
      electricCo2Kg: 0,
      totalCo2Kg: Math.round(798 * dwellFactor),
      dwellSavedMins: Math.round(377 * dwellFactor),
    },
    {
      corridor: 'C003 (Howrah-Dhanbad)',
      dieselCo2Kg: Math.round(118 * dwellFactor),
      electricCo2Kg: Math.round(45 * dwellFactor),
      totalCo2Kg: Math.round(163 * dwellFactor),
      dwellSavedMins: Math.round(148 * dwellFactor),
    },
    {
      corridor: 'C004 (Mathura-Jhansi)',
      dieselCo2Kg: 0,
      electricCo2Kg: Math.round(105 * dwellFactor),
      totalCo2Kg: Math.round(105 * dwellFactor),
      dwellSavedMins: Math.round(140 * dwellFactor),
    },
  ];
}
