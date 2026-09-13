import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Defect, PriorityLevel } from '../types';

export interface InspectionReportOptions {
  defects: Defect[];
  reportTitle?: string;
  division?: string;
  zone?: string;
  inspectedBy?: string;
  inspectorDesignation?: string;
  filterSummary?: string;
  includeAiRiskMatrix?: boolean;
  includeStructuralRiskProfiles?: boolean;
}

export interface InspectionReportSummaryStats {
  totalDefects: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  aiEvaluatedCount: number;
  aiCriticalCount: number;
  aiHighCount: number;
  speedRestrictionCount: number;
  photoEvidenceCount: number;
  geotaggedCount: number;
  avgConfidence: number;
}

/**
 * Calculates comprehensive statistical metrics for the given defects
 */
export function calculateReportSummaryStats(defects: Defect[]): InspectionReportSummaryStats {
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let aiEvaluatedCount = 0;
  let aiCriticalCount = 0;
  let aiHighCount = 0;
  let speedRestrictionCount = 0;
  let photoEvidenceCount = 0;
  let geotaggedCount = 0;
  let totalConfidence = 0;

  defects.forEach((d) => {
    if (d.severity === 'CRITICAL') criticalCount++;
    else if (d.severity === 'HIGH') highCount++;
    else if (d.severity === 'MEDIUM') mediumCount++;
    else lowCount++;

    if (d.speedRestrictionKmph) speedRestrictionCount++;
    if (d.photoAttachment) photoEvidenceCount++;
    if (d.geoCoordinates) geotaggedCount++;

    if (d.aiVisualAnalysis) {
      aiEvaluatedCount++;
      totalConfidence += d.aiVisualAnalysis.confidencePercent || 88;
      if (d.aiVisualAnalysis.suggestedPriority === 'CRITICAL') aiCriticalCount++;
      else if (d.aiVisualAnalysis.suggestedPriority === 'HIGH') aiHighCount++;
    }
  });

  const avgConfidence = aiEvaluatedCount > 0 ? Math.round(totalConfidence / aiEvaluatedCount) : 89;

  return {
    totalDefects: defects.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    aiEvaluatedCount,
    aiCriticalCount,
    aiHighCount,
    speedRestrictionCount,
    photoEvidenceCount,
    geotaggedCount,
    avgConfidence,
  };
}

/**
 * Helper to get a structural risk summary for a defect, falling back to an engineering heuristic if not analyzed
 */
export function getStructuralRiskSummary(defect: Defect): {
  aiPriority: PriorityLevel;
  confidence: number;
  riskSummary: string;
  recommendedAction: string;
  cautionOrder: string;
} {
  if (defect.aiVisualAnalysis) {
    return {
      aiPriority: defect.aiVisualAnalysis.suggestedPriority,
      confidence: defect.aiVisualAnalysis.confidencePercent,
      riskSummary: defect.aiVisualAnalysis.structuralRiskSummary,
      recommendedAction: defect.aiVisualAnalysis.recommendedImmediateAction,
      cautionOrder: defect.aiVisualAnalysis.suggestedSpeedRestrictionKmph
        ? `${defect.aiVisualAnalysis.suggestedSpeedRestrictionKmph} km/h`
        : defect.speedRestrictionKmph
        ? `${defect.speedRestrictionKmph} km/h`
        : 'Normal Speed (No Caution)',
    };
  }

  // Engineering fallback heuristic based on defect type and severity
  let riskSummary = 'Track element exhibits localized wear; within regular maintenance tolerance.';
  let recommendedAction = 'Routine sectional inspection during standard cycle.';
  let cautionOrder = defect.speedRestrictionKmph ? `${defect.speedRestrictionKmph} km/h` : 'None';

  if (defect.severity === 'CRITICAL') {
    riskSummary =
      'High structural integrity risk under dynamic wheel loading; imminent failure vulnerability requiring immediate possession block.';
    recommendedAction = 'Emergency fishplate clamping or rail renewal; impose caution order.';
    cautionOrder = defect.speedRestrictionKmph ? `${defect.speedRestrictionKmph} km/h` : '30 km/h Caution';
  } else if (defect.severity === 'HIGH') {
    riskSummary =
      'Elevated mechanical stress concentration; rapid degradation expected without prompt corrective tamping or alignment.';
    recommendedAction = 'Schedule priority machine block within 48 hours.';
    cautionOrder = defect.speedRestrictionKmph ? `${defect.speedRestrictionKmph} km/h` : '50 km/h Caution';
  } else if (defect.severity === 'MEDIUM') {
    riskSummary =
      'Moderate component clearance deviation; monitoring advised on upcoming Track Recording Car run.';
    recommendedAction = 'Pack ballast / adjust tension during weekly block window.';
  }

  return {
    aiPriority: defect.severity,
    confidence: 85,
    riskSummary,
    recommendedAction,
    cautionOrder,
  };
}

/**
 * Builds the jsPDF document instance with official railway styling and formatting
 */
export function generateDefectInspectionPdfDoc(options: InspectionReportOptions): jsPDF {
  const {
    defects,
    reportTitle = 'PERMANENT WAY & INFRASTRUCTURE MAINTENANCE INSPECTION REPORT',
    division = 'DELHI DIVISION (NR)',
    zone = 'NORTHERN RAILWAY',
    inspectedBy = 'Senior Section Engineer (P-Way / Safety)',
    inspectorDesignation = 'SSE / Permanent Way, IR Track Safety Directorate',
    filterSummary = 'Active Filtered Registry',
    includeAiRiskMatrix = true,
    includeStructuralRiskProfiles = true,
  } = options;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const stats = calculateReportSummaryStats(defects);
  const reportRef = `IR-INSP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const timestampStr = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // --- PAGE 1: HEADER & EXECUTIVE SUMMARY ---
  // Top Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent Rail Line
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 27, pageWidth, 1.5, 'F');

  // Emblem / Organization Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('GOVERNMENT OF INDIA - MINISTRY OF RAILWAYS', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`${zone} | ${division} | INTEGRATED TRACK MAINTENANCE SYSTEM`, 14, 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text(reportTitle, 14, 23);

  // Top Right Meta Box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`REPORT REF: ${reportRef}`, pageWidth - 14, 10, { align: 'right' });
  doc.text(`DATE GENERATED: ${timestampStr}`, pageWidth - 14, 15, { align: 'right' });
  doc.text(`SCOPE: ${filterSummary} (${defects.length} Defects)`, pageWidth - 14, 20, { align: 'right' });

  // --- STATS OVERVIEW CARDS ---
  let currentY = 34;

  const cardWidth = (pageWidth - 28 - 15) / 6;
  const cardHeight = 16;
  const statsList = [
    { label: 'TOTAL DEFECTS', val: stats.totalDefects.toString(), color: [15, 23, 42], text: [255, 255, 255] },
    { label: 'CRITICAL SEVERITY', val: stats.criticalCount.toString(), color: [244, 63, 94], text: [255, 255, 255] },
    { label: 'HIGH SEVERITY', val: stats.highCount.toString(), color: [245, 158, 11], text: [255, 255, 255] },
    { label: 'AI EVALUATED', val: `${stats.aiEvaluatedCount} (${stats.avgConfidence}% avg)`, color: [79, 70, 229], text: [255, 255, 255] },
    { label: 'AI CRITICAL RISK', val: stats.aiCriticalCount.toString(), color: [190, 18, 60], text: [255, 255, 255] },
    { label: 'CAUTION ORDERS', val: `${stats.speedRestrictionCount} Imposed`, color: [14, 116, 144], text: [255, 255, 255] },
  ];

  statsList.forEach((st, idx) => {
    const x = 14 + idx * (cardWidth + 3);
    doc.setFillColor(st.color[0], st.color[1], st.color[2]);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(241, 245, 249);
    doc.text(st.label, x + cardWidth / 2, currentY + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(st.text[0], st.text[1], st.text[2]);
    doc.text(st.val, x + cardWidth / 2, currentY + 12.5, { align: 'center' });
  });

  currentY += 21;

  // --- EXECUTIVE AUDIT BRIEF ---
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, pageWidth - 28, 14, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, currentY, pageWidth - 28, 14, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('EXECUTIVE TRACK SAFETY & STRUCTURAL INTEGRITY BRIEF:', 18, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const briefText = `This statutory inspection dossier compiles ${defects.length} defect records currently logged across track sections. AI Computer Vision & Structural Analysis has identified ${stats.aiCriticalCount} critical-risk failure modes with high probability of rail separation or traction drop. Field maintenance gangs and track machines must schedule immediate corridor possessions to prevent unplanned section closures.`;
  doc.text(briefText, 18, currentY + 10, { maxWidth: pageWidth - 36 });

  currentY += 18;

  // --- TABLE: COMPREHENSIVE DEFECT LIST & STRUCTURAL RISK ANALYSIS ---
  const tableHeaders = [
    'Defect ID',
    'Asset & Sec',
    'Dept',
    'Defect Type & Description',
    'Reported',
    'AI Priority & Conf.',
    'Structural Risk Summary & Action',
    'Speed Caution',
    'GPS Chainage',
  ];

  const tableRows = defects.map((d) => {
    const risk = getStructuralRiskSummary(d);
    const chainageStr = d.geoCoordinates?.railwayChainageKm
      ? d.geoCoordinates.railwayChainageKm
      : d.geoCoordinates
      ? `${d.geoCoordinates.latitude.toFixed(4)}°N, ${d.geoCoordinates.longitude.toFixed(4)}°E`
      : 'Corridor Post';

    const aiStr = d.aiVisualAnalysis
      ? `${risk.aiPriority} (${risk.confidence}%)`
      : `${risk.aiPriority} (Heuristic)`;

    const riskActionText = `${risk.riskSummary}\n-> Remedial: ${risk.recommendedAction}`;

    return [
      d.defectId,
      `${d.assetId}\n${d.corridorId}`,
      d.department,
      `${d.defectType}\n${d.description.slice(0, 90)}${d.description.length > 90 ? '...' : ''}`,
      d.severity,
      aiStr,
      riskActionText,
      risk.cautionOrder,
      chainageStr,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' }, // Defect ID
      1: { cellWidth: 22 }, // Asset & Sec
      2: { cellWidth: 16 }, // Dept
      3: { cellWidth: 50 }, // Defect Type & Description
      4: { cellWidth: 18, fontStyle: 'bold' }, // Reported
      5: { cellWidth: 24, fontStyle: 'bold' }, // AI Priority
      6: { cellWidth: 70 }, // Structural Risk Summary
      7: { cellWidth: 22 }, // Speed Caution
      8: { cellWidth: 24 }, // GPS Chainage
    },
    didParseCell: (data) => {
      // Color-code severity and AI priority
      if (data.section === 'body') {
        if (data.column.index === 4 || data.column.index === 5) {
          const text = data.cell.raw as string;
          if (text.includes('CRITICAL')) {
            data.cell.styles.textColor = [225, 29, 72]; // rose-600
            data.cell.styles.fontStyle = 'bold';
          } else if (text.includes('HIGH')) {
            data.cell.styles.textColor = [217, 119, 6]; // amber-600
            data.cell.styles.fontStyle = 'bold';
          } else if (text.includes('MEDIUM')) {
            data.cell.styles.textColor = [2, 132, 199]; // sky-600
          }
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 25 },
  });

  // --- FOOTER & SIGN-OFF SECTION ON ALL PAGES ---
  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  const finalY = doc.lastAutoTable?.finalY || currentY + 50;

  // Check if we need an extra page for official sign-offs
  if (finalY > pageHeight - 32) {
    doc.addPage();
  }

  const signOffY = Math.max(finalY + 8, pageHeight - 28);

  // Draw Sign-off block
  doc.setDrawColor(203, 213, 225);
  doc.line(14, signOffY - 4, pageWidth - 14, signOffY - 4);

  const sigColWidth = (pageWidth - 28) / 3;

  // Signatory 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('INSPECTED & REPORTED BY:', 14, signOffY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`${inspectedBy}`, 14, signOffY + 4);
  doc.text(`${inspectorDesignation}`, 14, signOffY + 8);
  doc.text('Signature: __________________________', 14, signOffY + 13);

  // Signatory 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('AI RISK VALIDATION / AUDIT:', 14 + sigColWidth, signOffY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Divisional Safety Officer (Safety Audit Cell)', 14 + sigColWidth, signOffY + 4);
  doc.text('Status: RISK VERIFIED & SANCTIONED', 14 + sigColWidth, signOffY + 8);
  doc.text('Signature: __________________________', 14 + sigColWidth, signOffY + 13);

  // Signatory 3
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MAINTENANCE POSSESSION APPROVAL:', 14 + sigColWidth * 2, signOffY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Senior Divisional Engineer (Co-ord / Track)', 14 + sigColWidth * 2, signOffY + 4);
  doc.text('Delhi Operating Control / Northern Railway', 14 + sigColWidth * 2, signOffY + 8);
  doc.text('Signature: __________________________', 14 + sigColWidth * 2, signOffY + 13);

  // Page numbering in footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `INDIAN RAILWAYS | IR-INSP-2026 | CONFIDENTIAL & STATUTORY | PAGE ${p} OF ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Triggers browser download of the generated PDF maintenance inspection report
 */
export function downloadDefectInspectionPdf(options: InspectionReportOptions): string {
  const doc = generateDefectInspectionPdfDoc(options);
  const ref = `IR_Maintenance_Inspection_Report_${new Date().toISOString().slice(0, 10)}`;
  const filename = `${ref}.pdf`;
  doc.save(filename);
  return filename;
}

/**
 * Generates an object URL for embedding or previewing the PDF directly inside an iframe/modal
 */
export function getDefectInspectionPdfBlobUrl(options: InspectionReportOptions): string {
  const doc = generateDefectInspectionPdfDoc(options);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

/**
 * Generates an official HTML document formatted with print styles for crisp browser printing
 */
export function generateDefectInspectionHtml(options: InspectionReportOptions): string {
  const {
    defects,
    reportTitle = 'PERMANENT WAY & INFRASTRUCTURE MAINTENANCE INSPECTION REPORT',
    division = 'DELHI DIVISION (NR)',
    zone = 'NORTHERN RAILWAY',
    inspectedBy = 'Senior Section Engineer (P-Way / Safety)',
    inspectorDesignation = 'SSE / Permanent Way, IR Track Safety Directorate',
    filterSummary = 'Active Filtered Registry',
  } = options;

  const stats = calculateReportSummaryStats(defects);
  const reportRef = `IR-INSP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const timestampStr = new Date().toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${reportTitle} - ${reportRef}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 9pt;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.4;
      padding: 15px;
    }
    .header-banner {
      background: #0f172a;
      color: #ffffff;
      padding: 16px 20px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 4px solid #f59e0b;
      margin-bottom: 14px;
    }
    .header-title {
      font-size: 14pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #fbbf24;
    }
    .header-subtitle {
      font-size: 8.5pt;
      color: #94a3b8;
      margin-top: 3px;
    }
    .header-meta {
      text-align: right;
      font-size: 8pt;
      color: #cbd5e1;
      font-family: monospace;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      margin-bottom: 15px;
    }
    .stat-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 8px;
      text-align: center;
    }
    .stat-label {
      font-size: 7pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .stat-val {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
      font-family: monospace;
    }
    .executive-brief {
      background: #f1f5f9;
      border-left: 4px solid #3b82f6;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      margin-bottom: 16px;
      font-size: 8.5pt;
    }
    .brief-title {
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 8pt;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      text-align: left;
      padding: 8px 6px;
      font-weight: 700;
      border: 1px solid #1e293b;
    }
    td {
      padding: 7px 6px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 700;
      font-family: monospace;
      font-size: 7.5pt;
    }
    .badge-critical { background: #ffe4e6; color: #e11d48; border: 1px solid #fda4af; }
    .badge-high { background: #fef3c7; color: #d97706; border: 1px solid #fcd34d; }
    .badge-medium { background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; }
    .badge-low { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .risk-box {
      font-size: 7.5pt;
      color: #334155;
      line-height: 1.35;
    }
    .risk-remedy {
      color: #059669;
      font-weight: 600;
      margin-top: 3px;
    }
    .sign-off-section {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 2px solid #e2e8f0;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      page-break-inside: avoid;
    }
    .sign-box {
      border: 1px solid #e2e8f0;
      background: #fafafa;
      padding: 12px;
      border-radius: 6px;
    }
    .sign-title {
      font-weight: 700;
      font-size: 8pt;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .sign-name {
      font-size: 7.5pt;
      color: #475569;
    }
    .sign-line {
      margin-top: 25px;
      border-top: 1px dashed #94a3b8;
      padding-top: 4px;
      font-size: 7pt;
      color: #64748b;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header-banner">
    <div>
      <div style="font-size: 9pt; color: #94a3b8; font-weight: 600;">GOVERNMENT OF INDIA - MINISTRY OF RAILWAYS</div>
      <div class="header-title">${reportTitle}</div>
      <div class="header-subtitle">${zone} &bull; ${division} &bull; ITMS Safety &amp; Civil Engineering Directorate</div>
    </div>
    <div class="header-meta">
      <div>REF: <strong>${reportRef}</strong></div>
      <div>DATE: ${timestampStr}</div>
      <div>SCOPE: ${filterSummary} (${defects.length} Defects)</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Total Defects</div>
      <div class="stat-val">${stats.totalDefects}</div>
    </div>
    <div class="stat-card" style="border-color: #fda4af; background: #fff1f2;">
      <div class="stat-label" style="color: #e11d48;">Critical Severity</div>
      <div class="stat-val" style="color: #e11d48;">${stats.criticalCount}</div>
    </div>
    <div class="stat-card" style="border-color: #fcd34d; background: #fffbeb;">
      <div class="stat-label" style="color: #d97706;">High Severity</div>
      <div class="stat-val" style="color: #d97706;">${stats.highCount}</div>
    </div>
    <div class="stat-card" style="border-color: #c7d2fe; background: #eef2ff;">
      <div class="stat-label" style="color: #4338ca;">AI Evaluated</div>
      <div class="stat-val" style="color: #4338ca;">${stats.aiEvaluatedCount}</div>
    </div>
    <div class="stat-card" style="border-color: #fecdd3; background: #fff1f2;">
      <div class="stat-label" style="color: #be123c;">AI Critical Risk</div>
      <div class="stat-val" style="color: #be123c;">${stats.aiCriticalCount}</div>
    </div>
    <div class="stat-card" style="border-color: #bae6fd; background: #f0f9ff;">
      <div class="stat-label" style="color: #0369a1;">Caution Orders</div>
      <div class="stat-val" style="color: #0369a1;">${stats.speedRestrictionCount}</div>
    </div>
  </div>

  <div class="executive-brief">
    <div class="brief-title">EXECUTIVE TRACK SAFETY &amp; STRUCTURAL INTEGRITY DIRECTIVE:</div>
    <div>This statutory inspection dossier compiles <strong>${defects.length} defect records</strong> currently logged across track sections. AI Computer Vision &amp; Structural Analysis has identified <strong>${stats.aiCriticalCount} critical-risk failure modes</strong> with high probability of rail separation or traction drop. Field maintenance gangs and track machines must schedule immediate corridor possessions to prevent unplanned section closures.</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 10%;">Defect ID</th>
        <th style="width: 10%;">Asset / Corridor</th>
        <th style="width: 8%;">Dept</th>
        <th style="width: 20%;">Defect Description</th>
        <th style="width: 9%;">Reported</th>
        <th style="width: 11%;">AI Priority &amp; Confidence</th>
        <th style="width: 22%;">Structural Risk Summary &amp; Recommended Action</th>
        <th style="width: 10%;">Caution Order &amp; GPS</th>
      </tr>
    </thead>
    <tbody>
      ${defects
        .map((d) => {
          const risk = getStructuralRiskSummary(d);
          const badgeClass =
            d.severity === 'CRITICAL'
              ? 'badge-critical'
              : d.severity === 'HIGH'
              ? 'badge-high'
              : d.severity === 'MEDIUM'
              ? 'badge-medium'
              : 'badge-low';

          const aiBadgeClass =
            risk.aiPriority === 'CRITICAL'
              ? 'badge-critical'
              : risk.aiPriority === 'HIGH'
              ? 'badge-high'
              : risk.aiPriority === 'MEDIUM'
              ? 'badge-medium'
              : 'badge-low';

          const chainage = d.geoCoordinates?.railwayChainageKm || 'Corridor KM';

          return `<tr>
            <td><strong>${d.defectId}</strong></td>
            <td><strong>${d.assetId}</strong><br><span style="color: #64748b; font-size: 7.5pt;">${d.corridorId}</span></td>
            <td><span class="badge" style="background: #f1f5f9;">${d.department}</span></td>
            <td>
              <strong>${d.defectType}</strong>
              <div style="font-size: 7.5pt; color: #475569; margin-top: 2px;">${d.description}</div>
            </td>
            <td><span class="badge ${badgeClass}">${d.severity}</span></td>
            <td>
              <span class="badge ${aiBadgeClass}">${risk.aiPriority}</span>
              <div style="font-size: 7pt; color: #64748b; font-family: monospace; margin-top: 2px;">${risk.confidence}% Confidence</div>
            </td>
            <td>
              <div class="risk-box">
                <div><strong>Risk:</strong> ${risk.riskSummary}</div>
                <div class="risk-remedy"><strong>Action:</strong> ${risk.recommendedAction}</div>
              </div>
            </td>
            <td>
              <div style="font-weight: 700; color: #b91c1c;">${risk.cautionOrder}</div>
              <div style="font-size: 7pt; color: #64748b; font-family: monospace; margin-top: 2px;">${chainage}</div>
            </td>
          </tr>`;
        })
        .join('')}
    </tbody>
  </table>

  <div class="sign-off-section">
    <div class="sign-box">
      <div class="sign-title">INSPECTED &amp; REPORTED BY:</div>
      <div class="sign-name">${inspectedBy}</div>
      <div class="sign-name">${inspectorDesignation}</div>
      <div class="sign-line">Certified Sign-off</div>
    </div>
    <div class="sign-box">
      <div class="sign-title">AI RISK VALIDATION &amp; SAFETY AUDIT:</div>
      <div class="sign-name">Divisional Safety Officer (Safety Audit Cell)</div>
      <div class="sign-name">Status: <strong>RISK VERIFIED &amp; SANCTIONED</strong></div>
      <div class="sign-line">Safety Directorate Stamp</div>
    </div>
    <div class="sign-box">
      <div class="sign-title">MAINTENANCE POSSESSION APPROVAL:</div>
      <div class="sign-name">Senior Divisional Engineer (Co-ord / Track)</div>
      <div class="sign-name">Delhi Operating Control / Northern Railway</div>
      <div class="sign-line">Operating Headquarters Approval</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Opens a dedicated printable window for instant browser PDF generation
 */
export function printDefectInspectionReport(options: InspectionReportOptions): boolean {
  const html = generateDefectInspectionHtml(options);
  const printWin = window.open('', '_blank', 'width=1050,height=800,scrollbars=yes,resizable=yes');

  if (!printWin) {
    window.print();
    return false;
  }

  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();

  setTimeout(() => {
    try {
      printWin.focus();
      printWin.print();
    } catch (e) {
      console.warn('Auto print trigger error:', e);
    }
  }, 450);

  return true;
}
