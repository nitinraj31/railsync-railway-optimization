import { Defect, DepartmentType, PriorityLevel, Corridor } from '../types';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RailwayStationNode {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  corridorId: string;
  chainageKm: number;
  isJunction?: boolean;
}

export interface CorridorTrackSegment {
  corridorId: string;
  corridorCode: string;
  corridorName: string;
  stations: RailwayStationNode[];
  color: string;
}

// Bounding box for Delhi Division Railway Network
export const RAILWAY_NETWORK_BOUNDS = {
  minLat: 28.10, // South of Palwal (PWL)
  maxLat: 29.45, // North of Panipat (PNP)
  minLng: 76.55, // West of Rohtak (ROK)
  maxLng: 77.52, // East of Ghaziabad (GZB)
};

// Key Railway Corridors & Stations across Northern Railway Delhi Division
export const RAILWAY_CORRIDOR_SEGMENTS: CorridorTrackSegment[] = [
  {
    corridorId: 'C001',
    corridorCode: 'NDLS-GZB',
    corridorName: 'Northern Main Trunk (New Delhi — Ghaziabad)',
    color: '#38bdf8', // sky-400
    stations: [
      { code: 'NDLS', name: 'New Delhi Central', latitude: 28.6425, longitude: 77.2215, corridorId: 'C001', chainageKm: 0, isJunction: true },
      { code: 'CSB', name: 'Shivaji Bridge', latitude: 28.6350, longitude: 77.2340, corridorId: 'C001', chainageKm: 2.1 },
      { code: 'TKJ', name: 'Tilak Bridge', latitude: 28.6280, longitude: 77.2470, corridorId: 'C001', chainageKm: 4.8 },
      { code: 'MWC', name: 'Mandawali Chander Vihar', latitude: 28.6310, longitude: 77.2910, corridorId: 'C001', chainageKm: 10.2 },
      { code: 'ANVT', name: 'Anand Vihar Terminal', latitude: 28.6498, longitude: 77.3160, corridorId: 'C001', chainageKm: 13.5, isJunction: true },
      { code: 'SBB', name: 'Sahibabad Junction', latitude: 28.6680, longitude: 77.3590, corridorId: 'C001', chainageKm: 22.4, isJunction: true },
      { code: 'GZB', name: 'Ghaziabad Junction', latitude: 28.6650, longitude: 77.4320, corridorId: 'C001', chainageKm: 42.5, isJunction: true },
    ],
  },
  {
    corridorId: 'C002',
    corridorCode: 'DLI-PNP',
    corridorName: 'Southern High-Speed Spur (Old Delhi — Panipat)',
    color: '#34d399', // emerald-400
    stations: [
      { code: 'DLI', name: 'Old Delhi Junction', latitude: 28.6650, longitude: 77.2150, corridorId: 'C002', chainageKm: 0, isJunction: true },
      { code: 'SZM', name: 'Sabzi Mandi', latitude: 28.6750, longitude: 77.1950, corridorId: 'C002', chainageKm: 3.5 },
      { code: 'ANDI', name: 'Adarsh Nagar Delhi', latitude: 28.7180, longitude: 77.1700, corridorId: 'C002', chainageKm: 9.8 },
      { code: 'NUR', name: 'Narela', latitude: 28.8520, longitude: 77.0980, corridorId: 'C002', chainageKm: 26.2 },
      { code: 'SNP', name: 'Sonipat Junction', latitude: 28.9890, longitude: 77.0210, corridorId: 'C002', chainageKm: 44.1, isJunction: true },
      { code: 'GNU', name: 'Ganaur', latitude: 29.1350, longitude: 76.9950, corridorId: 'C002', chainageKm: 60.5 },
      { code: 'PNP', name: 'Panipat Junction', latitude: 29.3920, longitude: 76.9710, corridorId: 'C002', chainageKm: 89.2, isJunction: true },
    ],
  },
  {
    corridorId: 'C003',
    corridorCode: 'BGZ-ROK',
    corridorName: 'Western Freight Bypass (Bahadurgarh — Rohtak)',
    color: '#fbbf24', // amber-400
    stations: [
      { code: 'SSB', name: 'Shakur Basti', latitude: 28.6850, longitude: 77.1290, corridorId: 'C003', chainageKm: 0, isJunction: true },
      { code: 'NNO', name: 'Nangloi', latitude: 28.6810, longitude: 77.0580, corridorId: 'C003', chainageKm: 7.4 },
      { code: 'BGZ', name: 'Bahadurgarh', latitude: 28.6920, longitude: 76.9210, corridorId: 'C003', chainageKm: 20.8, isJunction: true },
      { code: 'SPZ', name: 'Sampla', latitude: 28.7750, longitude: 76.7720, corridorId: 'C003', chainageKm: 40.2 },
      { code: 'ROK', name: 'Rohtak Junction', latitude: 28.8950, longitude: 76.6060, corridorId: 'C003', chainageKm: 70.5, isJunction: true },
    ],
  },
  {
    corridorId: 'C004',
    corridorCode: 'NZM-PWL',
    corridorName: 'Eastern Industrial Link (Hazrat Nizamuddin — Palwal)',
    color: '#f43f5e', // rose-500
    stations: [
      { code: 'NZM', name: 'Hazrat Nizamuddin', latitude: 28.5880, longitude: 77.2530, corridorId: 'C004', chainageKm: 0, isJunction: true },
      { code: 'OKA', name: 'Okhla', latitude: 28.5520, longitude: 77.2780, corridorId: 'C004', chainageKm: 4.2 },
      { code: 'TKD', name: 'Tuglakabad Marshalling Yard', latitude: 28.5020, longitude: 77.2980, corridorId: 'C004', chainageKm: 11.5, isJunction: true },
      { code: 'FDB', name: 'Faridabad', latitude: 28.4110, longitude: 77.3150, corridorId: 'C004', chainageKm: 22.0 },
      { code: 'BVH', name: 'Ballabgarh', latitude: 28.3380, longitude: 77.3220, corridorId: 'C004', chainageKm: 30.1 },
      { code: 'PWL', name: 'Palwal Junction', latitude: 28.1450, longitude: 77.3290, corridorId: 'C004', chainageKm: 58.4, isJunction: true },
    ],
  },
];

// Great-circle Haversine distance in kilometers
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Convert Lat/Lng to SVG Canvas Coordinate Space
export function projectGeoToCanvas(
  latitude: number,
  longitude: number,
  canvasWidth: number,
  canvasHeight: number,
  zoom: number = 1,
  pan: { x: number; y: number } = { x: 0, y: 0 }
): { x: number; y: number } {
  const { minLat, maxLat, minLng, maxLng } = RAILWAY_NETWORK_BOUNDS;
  const paddingX = 40;
  const paddingY = 40;
  const usableWidth = canvasWidth - paddingX * 2;
  const usableHeight = canvasHeight - paddingY * 2;

  // Normalized (0 to 1)
  const normX = (longitude - minLng) / (maxLng - minLng);
  // Invert Y because SVG coordinates increase downwards, but latitude increases upwards
  const normY = (maxLat - latitude) / (maxLat - minLat);

  // Base canvas coordinate
  const baseX = paddingX + normX * usableWidth;
  const baseY = paddingY + normY * usableHeight;

  // Apply zoom centered at canvas midpoint
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const zoomedX = centerX + (baseX - centerX) * zoom + pan.x;
  const zoomedY = centerY + (baseY - centerY) * zoom + pan.y;

  return { x: zoomedX, y: zoomedY };
}

export function projectCanvasToGeo(
  canvasX: number,
  canvasY: number,
  canvasWidth: number,
  canvasHeight: number,
  zoom: number = 1,
  pan: { x: number; y: number } = { x: 0, y: 0 }
): { latitude: number; longitude: number } {
  const { minLat, maxLat, minLng, maxLng } = RAILWAY_NETWORK_BOUNDS;
  const paddingX = 40;
  const paddingY = 40;
  const usableWidth = canvasWidth - paddingX * 2;
  const usableHeight = canvasHeight - paddingY * 2;

  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  const unzoomedX = (canvasX - pan.x - centerX) / zoom + centerX;
  const unzoomedY = (canvasY - pan.y - centerY) / zoom + centerY;

  const normX = (unzoomedX - paddingX) / usableWidth;
  const normY = (unzoomedY - paddingY) / usableHeight;

  const longitude = minLng + normX * (maxLng - minLng);
  const latitude = maxLat - normY * (maxLat - minLat);

  return { latitude, longitude };
}

export interface DefectGeographicCluster {
  id: string;
  label: string;
  centroid: GeoPoint;
  screenX: number;
  screenY: number;
  totalCount: number;
  criticalCount: number;
  nonCriticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  defects: Defect[];
  memberDefectIds: string[];
  corridorIds: string[];
  chainageRange: string;
  dominantDepartment: DepartmentType;
  dominantSeverity: PriorityLevel;
  riskLevel: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW';
  urgencyScore: number; // 0 to 100
  hasCritical: boolean;
  criticalRatio: number; // 0.0 to 1.0
  nearbyStation?: string;
  hasSpeedRestriction: boolean;
  minSpeedRestrictionKmph?: number;
  clusterRadiusKm: number;
}

// Find nearest railway station for geographic labeling
export function findNearestStation(lat: number, lng: number): RailwayStationNode | null {
  let minDistance = Infinity;
  let nearest: RailwayStationNode | null = null;

  for (const seg of RAILWAY_CORRIDOR_SEGMENTS) {
    for (const st of seg.stations) {
      const dist = calculateHaversineDistanceKm(lat, lng, st.latitude, st.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = st;
      }
    }
  }

  return nearest;
}

// Perform spatial distance clustering of defects
export function clusterDefectsGeographically(
  defects: Defect[],
  canvasWidth: number,
  canvasHeight: number,
  zoom: number = 1,
  pan: { x: number; y: number } = { x: 0, y: 0 },
  enableClustering: boolean = true
): {
  clusters: DefectGeographicCluster[];
  singleDefects: DefectGeographicCluster[];
  allClusters: DefectGeographicCluster[];
  clusterRadiusKm: number;
} {
  // Filter defects with valid coordinates
  const validDefects = defects.filter(
    (d) => d.geoCoordinates && typeof d.geoCoordinates.latitude === 'number' && typeof d.geoCoordinates.longitude === 'number'
  );

  if (validDefects.length === 0) {
    return { clusters: [], singleDefects: [], allClusters: [], clusterRadiusKm: 6.5 };
  }

  // Adjust clustering radius based on zoom level:
  // Zoom 1x (wide network overview): ~6.5 km
  // Zoom 2x: ~3.5 km
  // Zoom 3x+: ~1.5 km or smaller
  const baseRadiusKm = enableClustering ? Math.max(1.2, 6.5 / zoom) : 0.05;

  const visited = new Set<string>();
  const rawClusters: Defect[][] = [];

  for (let i = 0; i < validDefects.length; i++) {
    const d1 = validDefects[i];
    if (visited.has(d1.defectId)) continue;

    visited.add(d1.defectId);
    const clusterGroup: Defect[] = [d1];

    if (enableClustering) {
      for (let j = i + 1; j < validDefects.length; j++) {
        const d2 = validDefects[j];
        if (visited.has(d2.defectId)) continue;

        const dist = calculateHaversineDistanceKm(
          d1.geoCoordinates!.latitude,
          d1.geoCoordinates!.longitude,
          d2.geoCoordinates!.latitude,
          d2.geoCoordinates!.longitude
        );

        if (dist <= baseRadiusKm) {
          visited.add(d2.defectId);
          clusterGroup.push(d2);
        }
      }
    }

    rawClusters.push(clusterGroup);
  }

  // Build high-richness cluster structures
  const processedClusters: DefectGeographicCluster[] = rawClusters.map((group, idx) => {
    const totalCount = group.length;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    let sumLat = 0;
    let sumLng = 0;
    const corridorSet = new Set<string>();
    const chainageNumbers: number[] = [];
    let minSpeed: number | undefined = undefined;

    const deptCounts: Record<DepartmentType, number> = {
      ENGINEERING: 0,
      'S&T': 0,
      TRACTION: 0,
      OPERATIONS: 0,
      SAFETY: 0,
    };

    for (const d of group) {
      sumLat += d.geoCoordinates!.latitude;
      sumLng += d.geoCoordinates!.longitude;
      corridorSet.add(d.corridorId);

      const sev = d.severity;
      if (sev === 'CRITICAL') criticalCount++;
      else if (sev === 'HIGH') highCount++;
      else if (sev === 'MEDIUM') mediumCount++;
      else lowCount++;

      deptCounts[d.department] = (deptCounts[d.department] || 0) + 1;

      if (d.speedRestrictionKmph) {
        if (minSpeed === undefined || d.speedRestrictionKmph < minSpeed) {
          minSpeed = d.speedRestrictionKmph;
        }
      }

      if (d.geoCoordinates?.railwayChainageKm) {
        const match = d.geoCoordinates.railwayChainageKm.match(/KM\s*([0-9]+(?:\.[0-9]+)?)/i);
        if (match && match[1]) {
          chainageNumbers.push(parseFloat(match[1]));
        }
      }
    }

    const centroidLat = sumLat / totalCount;
    const centroidLng = sumLng / totalCount;

    const screenPos = projectGeoToCanvas(
      centroidLat,
      centroidLng,
      canvasWidth,
      canvasHeight,
      zoom,
      pan
    );

    const nonCriticalCount = totalCount - criticalCount;
    const criticalRatio = totalCount > 0 ? criticalCount / totalCount : 0;

    // Chainage range display
    let chainageRange = 'Corridor Section';
    if (chainageNumbers.length > 0) {
      const minKm = Math.min(...chainageNumbers);
      const maxKm = Math.max(...chainageNumbers);
      chainageRange =
        minKm === maxKm ? `KM ${minKm.toFixed(1)}` : `KM ${minKm.toFixed(1)} – ${maxKm.toFixed(1)}`;
    }

    // Dominant department
    let dominantDepartment: DepartmentType = 'ENGINEERING';
    let maxDeptVal = -1;
    (Object.keys(deptCounts) as DepartmentType[]).forEach((dept) => {
      if (deptCounts[dept] > maxDeptVal) {
        maxDeptVal = deptCounts[dept];
        dominantDepartment = dept;
      }
    });

    // Dominant severity & risk level
    let dominantSeverity: PriorityLevel = 'LOW';
    if (criticalCount > 0) dominantSeverity = 'CRITICAL';
    else if (highCount > 0) dominantSeverity = 'HIGH';
    else if (mediumCount > 0) dominantSeverity = 'MEDIUM';

    let riskLevel: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW' = 'LOW';
    if (criticalCount >= 3) riskLevel = 'EXTREME';
    else if (criticalCount >= 1) riskLevel = 'HIGH';
    else if (highCount >= 2) riskLevel = 'MODERATE';

    // Urgency score (0 to 100)
    const urgencyScore = Math.min(
      100,
      criticalCount * 32 + highCount * 14 + mediumCount * 6 + lowCount * 2
    );

    const nearestStation = findNearestStation(centroidLat, centroidLng);
    const stationName = nearestStation ? nearestStation.name : 'Corridor Sector';

    const label =
      totalCount > 1
        ? `Cluster #${idx + 1} (${stationName})`
        : group[0].assetId;

    const memberDefectIds = group.map((d) => d.defectId).sort();
    const clusterId =
      totalCount === 1
        ? `single-${group[0].defectId}`
        : `cluster-${memberDefectIds[0]}-${totalCount}-${memberDefectIds.slice(0, 3).join('-')}`;

    return {
      id: clusterId,
      label,
      centroid: { latitude: centroidLat, longitude: centroidLng },
      screenX: screenPos.x,
      screenY: screenPos.y,
      totalCount,
      criticalCount,
      nonCriticalCount,
      highCount,
      mediumCount,
      lowCount,
      defects: group,
      memberDefectIds,
      corridorIds: Array.from(corridorSet),
      chainageRange,
      dominantDepartment,
      dominantSeverity,
      riskLevel,
      urgencyScore,
      hasCritical: criticalCount > 0,
      criticalRatio,
      nearbyStation: nearestStation?.name,
      hasSpeedRestriction: minSpeed !== undefined,
      minSpeedRestrictionKmph: minSpeed,
      clusterRadiusKm: baseRadiusKm,
    };
  });

  const clusters = processedClusters.filter((c) => c.totalCount > 1);
  const singleDefects = processedClusters.filter((c) => c.totalCount === 1);

  return {
    clusters,
    singleDefects,
    allClusters: processedClusters,
    clusterRadiusKm: baseRadiusKm,
  };
}

export interface HighRiskMaintenanceZone {
  id: string;
  zoneCode: string;
  zoneName: string;
  corridorId: string;
  corridorName: string;
  centroid: GeoPoint;
  screenX: number;
  screenY: number;
  radiusKm: number;
  screenRadius: number;
  criticalDefectsCount: number;
  totalDefectsCount: number;
  riskRating: 'EXTREME_DERAILMENT_RISK' | 'HIGH_OPERATIONAL_HAZARD' | 'ELEVATED_WATCH';
  primaryIssue: string;
  mandatedCautionSpeedKmph: number;
  recommendedBlockHours: number;
  defects: Defect[];
}

// Compute high-risk maintenance zones where CRITICAL defects concentrate
export function computeCriticalHeatmapZones(
  defects: Defect[],
  canvasWidth: number,
  canvasHeight: number,
  zoom: number = 1,
  pan: { x: number; y: number } = { x: 0, y: 0 }
): HighRiskMaintenanceZone[] {
  // Only defects marked CRITICAL
  const criticalDefects = defects.filter(
    (d) =>
      (d.severity === 'CRITICAL' || d.aiVisualAnalysis?.suggestedPriority === 'CRITICAL') &&
      d.geoCoordinates &&
      typeof d.geoCoordinates.latitude === 'number'
  );

  if (criticalDefects.length === 0) return [];

  // Group critical defects within 5.5 km of each other into danger zones
  const visited = new Set<string>();
  const rawZones: Defect[][] = [];

  for (let i = 0; i < criticalDefects.length; i++) {
    const d1 = criticalDefects[i];
    if (visited.has(d1.defectId)) continue;

    visited.add(d1.defectId);
    const group = [d1];

    for (let j = i + 1; j < criticalDefects.length; j++) {
      const d2 = criticalDefects[j];
      if (visited.has(d2.defectId)) continue;

      const dist = calculateHaversineDistanceKm(
        d1.geoCoordinates!.latitude,
        d1.geoCoordinates!.longitude,
        d2.geoCoordinates!.latitude,
        d2.geoCoordinates!.longitude
      );

      if (dist <= 5.5) {
        visited.add(d2.defectId);
        group.push(d2);
      }
    }

    rawZones.push(group);
  }

  // Sort by density of critical defects (descending)
  rawZones.sort((a, b) => b.length - a.length);

  const zoneNames = [
    'Zone Alpha: Northern Main Trunk Chokepoint',
    'Zone Beta: Eastern High-Load Industrial Curve',
    'Zone Gamma: Western Heavy Haul Approach',
    'Zone Delta: Southern High-Speed Junction',
    'Zone Epsilon: Terminal Yard Divergence',
  ];

  return rawZones.map((critGroup, idx) => {
    let sumLat = 0;
    let sumLng = 0;
    const corridorId = critGroup[0].corridorId;
    const corrSegment = RAILWAY_CORRIDOR_SEGMENTS.find((c) => c.corridorId === corridorId);

    for (const d of critGroup) {
      sumLat += d.geoCoordinates!.latitude;
      sumLng += d.geoCoordinates!.longitude;
    }

    const cLat = sumLat / critGroup.length;
    const cLng = sumLng / critGroup.length;

    const screenPos = projectGeoToCanvas(cLat, cLng, canvasWidth, canvasHeight, zoom, pan);

    const nearestStation = findNearestStation(cLat, cLng);
    const stName = nearestStation ? nearestStation.name : corridorId;

    const count = critGroup.length;
    const riskRating: 'EXTREME_DERAILMENT_RISK' | 'HIGH_OPERATIONAL_HAZARD' | 'ELEVATED_WATCH' =
      count >= 3
        ? 'EXTREME_DERAILMENT_RISK'
        : count >= 2
        ? 'HIGH_OPERATIONAL_HAZARD'
        : 'ELEVATED_WATCH';

    const mandatedCautionSpeedKmph = count >= 3 ? 30 : count >= 2 ? 45 : 60;
    const recommendedBlockHours = count >= 3 ? 4.5 : count >= 2 ? 3.0 : 2.0;

    // Radius in screen pixels (minimum 45px, expands with zoom and count)
    const screenRadius = Math.max(48, Math.min(130, (35 + count * 16) * Math.sqrt(zoom)));

    return {
      id: `crit-zone-${idx + 1}-${corridorId}`,
      zoneCode: `ZONE-${String.fromCharCode(65 + (idx % 26))}`,
      zoneName: zoneNames[idx] || `Critical Sector ${idx + 1} (${stName})`,
      corridorId,
      corridorName: corrSegment?.corridorName || corridorId,
      centroid: { latitude: cLat, longitude: cLng },
      screenX: screenPos.x,
      screenY: screenPos.y,
      radiusKm: 3.5 + count * 0.8,
      screenRadius,
      criticalDefectsCount: count,
      totalDefectsCount: count,
      riskRating,
      primaryIssue: critGroup[0].defectType,
      mandatedCautionSpeedKmph,
      recommendedBlockHours,
      defects: critGroup,
    };
  });
}
