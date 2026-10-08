import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CorridorHealthTelemetry } from '../components/corridor/NetworkHealthSummarySection';

export interface NetworkHealthExportOptions {
  svgElement: SVGSVGElement | null;
  viewMode: 'QUADRANT' | 'COMPARATIVE' | 'PREDICTIVE_7D' | 'DIURNAL';
  volumeUnit: 'HOURS' | 'BLOCKS';
  corridors: CorridorHealthTelemetry[];
  networkKpis: {
    totalActiveBlocks: number;
    totalBlockHours: number;
    avgUtilization: number;
    criticalStrainCorridorsCount: number;
    constrainedCorridorsCount: number;
    balancedOptimalCount: number;
    networkBacklog7DayMA: number;
    networkStatus: string;
  };
  simulatedBlocksCount: number;
  showBacklogTrend: boolean;
  division?: string;
  zone?: string;
  plannerName?: string;
  drmName?: string;
}

/**
 * Converts the rendered D3 SVG into a high-resolution PNG data URL
 */
export async function renderSvgToPngDataUrl(
  svgElement: SVGSVGElement,
  exportWidth = 1400,
  exportHeight = 800
): Promise<string> {
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

  const originalWidth = parseFloat(svgElement.getAttribute('width') || '1000');
  const originalHeight = parseFloat(svgElement.getAttribute('height') || '450');

  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clonedSvg.setAttribute('width', String(exportWidth));
  clonedSvg.setAttribute('height', String(exportHeight));
  clonedSvg.setAttribute('viewBox', `0 0 ${originalWidth} ${originalHeight}`);

  // Inject dark background rect if not present
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', '#070e1e');
  clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

  // Apply default font family style to all text tags
  const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleElement.textContent = `
    text { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important; }
    .fill-purple-300 { fill: #d8b4fe !important; }
    .fill-purple-400 { fill: #c084fc !important; }
    .fill-rose-400 { fill: #fb7185 !important; }
    .fill-sky-400 { fill: #38bdf8 !important; }
  `;
  clonedSvg.appendChild(styleElement);

  const svgXml = new XMLSerializer().serializeToString(clonedSvg);
  const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(blobUrl);
        reject(new Error('Failed to create canvas context'));
        return;
      }

      ctx.fillStyle = '#070e1e';
      ctx.fillRect(0, 0, exportWidth, exportHeight);
      ctx.drawImage(img, 0, 0, exportWidth, exportHeight);
      URL.revokeObjectURL(blobUrl);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(blobUrl);
      reject(err);
    };
    img.src = blobUrl;
  });
}

/**
 * Renders a full branded banner graphic with header, KPIs, SVG chart, and footer
 */
export async function renderFullGraphicReportCanvas(
  options: NetworkHealthExportOptions
): Promise<HTMLCanvasElement> {
  const {
    svgElement,
    viewMode,
    volumeUnit,
    corridors,
    networkKpis,
    simulatedBlocksCount,
    showBacklogTrend,
  } = options;

  const canvasWidth = 1600;
  const canvasHeight = 1100;
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize 2D canvas context');

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  gradient.addColorStop(0, '#060d1b');
  gradient.addColorStop(0.5, '#081126');
  gradient.addColorStop(1, '#050a17');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Outer border & Grid Accent
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, canvasWidth - 32, canvasHeight - 32);

  // Top Indian Railways Accent Header
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(20, 20, canvasWidth - 40, 6);

  // Header Title
  ctx.font = 'bold 26px monospace';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('INDIAN RAILWAYS — RAILSYNC COMMAND CENTER', 45, 65);

  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('NETWORK HEALTH & PREDICTIVE STRAIN STATUS REPORT', 45, 95);

  // Date and Metadata
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  ctx.font = '13px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'right';
  ctx.fillText(`REPORT REF: IRTMM-NH-${now.getTime().toString().slice(-6)}`, canvasWidth - 45, 60);
  ctx.fillText(`GENERATED: ${dateStr} ${timeStr} IST`, canvasWidth - 45, 82);
  ctx.fillText(
    `ACTIVE VIEW: ${viewMode} | UNIT: ${volumeUnit} | 7D MA TREND: ${showBacklogTrend ? 'ACTIVE' : 'OFF'}`,
    canvasWidth - 45,
    104
  );
  ctx.textAlign = 'left';

  // Divider Line
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(40, 120);
  ctx.lineTo(canvasWidth - 40, 120);
  ctx.stroke();

  // KPI Metric Cards Row
  const kpiCards = [
    {
      label: 'NETWORK STATUS',
      value: networkKpis.networkStatus,
      color:
        simulatedBlocksCount > 0
          ? '#c084fc'
          : networkKpis.criticalStrainCorridorsCount > 0
          ? '#f43f5e'
          : '#10b981',
      sub: `${corridors.length} Monitored Corridors`,
    },
    {
      label: 'AVERAGE UTILIZATION',
      value: `${networkKpis.avgUtilization}%`,
      color: networkKpis.avgUtilization > 85 ? '#f43f5e' : '#38bdf8',
      sub: 'Track Capacity Headway',
    },
    {
      label: 'ACTIVE BLOCKS & VOLUME',
      value: `${networkKpis.totalActiveBlocks} Blocks`,
      color: '#38bdf8',
      sub: `${networkKpis.totalBlockHours}h Scheduled Duration`,
    },
    {
      label: '7-DAY BACKLOG MA',
      value: `${networkKpis.networkBacklog7DayMA}h / day`,
      color: '#c084fc',
      sub: 'Moving Average Backlog',
    },
    {
      label: 'PREDICTIVE SHIFT BLOCKS',
      value: `${simulatedBlocksCount} Blocks`,
      color: simulatedBlocksCount > 0 ? '#c084fc' : '#94a3b8',
      sub: simulatedBlocksCount > 0 ? 'Predictive Gap Tool Active' : 'Baseline Unmodified',
    },
  ];

  const cardWidth = (canvasWidth - 80 - (kpiCards.length - 1) * 16) / kpiCards.length;
  kpiCards.forEach((card, idx) => {
    const cardX = 40 + idx * (cardWidth + 16);
    const cardY = 135;
    const cardHeight = 85;

    ctx.fillStyle = '#09152b';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(card.label, cardX + 14, cardY + 24);

    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = card.color;
    ctx.fillText(card.value, cardX + 14, cardY + 52);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(card.sub, cardX + 14, cardY + 72);
  });

  // Chart Frame Container
  const chartBoxX = 40;
  const chartBoxY = 240;
  const chartBoxWidth = canvasWidth - 80;
  const chartBoxHeight = 740;

  ctx.fillStyle = '#081122';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(chartBoxX, chartBoxY, chartBoxWidth, chartBoxHeight, 10);
  ctx.fill();
  ctx.stroke();

  // Chart Title Banner
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(
    `PREDICTIVE STRAIN MAP & D3 7-DAY BACKLOG TREND-LINE (${viewMode} MODE)`,
    chartBoxX + 20,
    chartBoxY + 30
  );

  ctx.font = '11px monospace';
  ctx.fillStyle = '#c084fc';
  ctx.textAlign = 'right';
  ctx.fillText(
    `Dotted Trend-Line: 7-Day Backlog MA • RDSO Strain Limit: 85`,
    chartBoxX + chartBoxWidth - 20,
    chartBoxY + 30
  );
  ctx.textAlign = 'left';

  // Render SVG inside chart box
  if (svgElement) {
    try {
      const pngDataUrl = await renderSvgToPngDataUrl(
        svgElement,
        chartBoxWidth - 30,
        chartBoxHeight - 65
      );
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = pngDataUrl;
      });
      ctx.drawImage(img, chartBoxX + 15, chartBoxY + 45, chartBoxWidth - 30, chartBoxHeight - 65);
    } catch {
      ctx.font = '14px monospace';
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('SVG Chart Rendering in Progress...', chartBoxX + 30, chartBoxY + 100);
    }
  }

  // Footer Banner
  ctx.fillStyle = '#060d1b';
  ctx.fillRect(40, canvasHeight - 75, canvasWidth - 80, 45);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, canvasHeight - 75, canvasWidth - 80, 45);

  ctx.font = '11px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText(
    'CONFIDENTIAL • SANCTIONED FOR INDIAN RAILWAYS OFFICIAL DIVISIONAL PLANNING • RAILSYNC IRTMM ENGINE',
    55,
    canvasHeight - 48
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('DIGITALLY SANCTIONED BY DRM & CHIEF CORRIDOR PLANNER', canvasWidth - 55, canvasHeight - 48);
  ctx.textAlign = 'left';

  return canvas;
}

/**
 * Downloads high-resolution PNG image of the Network Health Visualization
 */
export async function exportNetworkHealthAsPng(
  options: NetworkHealthExportOptions
): Promise<void> {
  const canvas = await renderFullGraphicReportCanvas(options);
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
  link.download = `railways-network-health-predictive-strain_${options.viewMode.toLowerCase()}_${timestamp}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates and downloads official Indian Railways PDF report of Network Health Visualization
 */
export async function exportNetworkHealthAsPdf(
  options: NetworkHealthExportOptions
): Promise<void> {
  const {
    svgElement,
    viewMode,
    volumeUnit,
    corridors,
    networkKpis,
    simulatedBlocksCount,
    showBacklogTrend,
    division = 'DELHI DIVISION (NR)',
    zone = 'NORTHERN RAILWAY',
    plannerName = 'Chief Corridor Planning Coordinator',
    drmName = 'Divisional Railway Manager (NR)',
  } = options;

  // Create landscape A4 PDF
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const now = new Date();
  const reportRef = `IR/IRTMM/NHP-${now.getFullYear()}-${now.getTime().toString().slice(-5)}`;

  // Header Bar (Deep Slate / Railway Blue)
  doc.setFillColor(11, 23, 44);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Top Red Accent Line
  doc.setFillColor(2, 132, 199);
  doc.rect(0, 0, pageWidth, 2, 'F');

  // Header Text
  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(248, 250, 252);
  doc.text('GOVERNMENT OF INDIA • MINISTRY OF RAILWAYS (RAILWAY BOARD)', 14, 9);

  doc.setFontSize(11);
  doc.setTextColor(56, 189, 248);
  doc.text('RAILSYNC IRTMM - NETWORK HEALTH & PREDICTIVE STRAIN REPORT', 14, 16);

  doc.setFontSize(8);
  doc.setFont('courier', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`DIVISION: ${division} | ZONE: ${zone}`, 14, 22);

  // Right-aligned header metadata
  doc.text(`REPORT REF: ${reportRef}`, pageWidth - 14, 9, { align: 'right' });
  doc.text(`DATE: ${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString('en-GB')} IST`, pageWidth - 14, 16, {
    align: 'right',
  });
  doc.text(
    `MODE: ${viewMode} | 7D BACKLOG MA: ${showBacklogTrend ? 'ENABLED' : 'DISABLED'}`,
    pageWidth - 14,
    22,
    { align: 'right' }
  );

  // Section 1: Executive KPI Summary Row
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 32, pageWidth - 28, 15, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, 32, pageWidth - 28, 15, 'S');

  doc.setFontSize(8);
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 23, 42);

  const colStep = (pageWidth - 28) / 5;
  // KPI 1
  doc.text('STATUS:', 18, 38);
  doc.setTextColor(
    simulatedBlocksCount > 0
      ? 147
      : networkKpis.criticalStrainCorridorsCount > 0
      ? 225
      : 16,
    simulatedBlocksCount > 0
      ? 51
      : networkKpis.criticalStrainCorridorsCount > 0
      ? 29
      : 185,
    simulatedBlocksCount > 0 ? 234 : 72
  );
  doc.text(networkKpis.networkStatus, 18, 43);

  // KPI 2
  doc.setTextColor(15, 23, 42);
  doc.text('AVG UTILIZATION:', 18 + colStep, 38);
  doc.text(`${networkKpis.avgUtilization}% Headway Load`, 18 + colStep, 43);

  // KPI 3
  doc.text('ACTIVE BLOCKS:', 18 + colStep * 2, 38);
  doc.text(`${networkKpis.totalActiveBlocks} blocks (${networkKpis.totalBlockHours}h)`, 18 + colStep * 2, 43);

  // KPI 4
  doc.text('7D BACKLOG MA:', 18 + colStep * 3, 38);
  doc.setTextColor(147, 51, 234);
  doc.text(`${networkKpis.networkBacklog7DayMA}h / day`, 18 + colStep * 3, 43);

  // KPI 5
  doc.setTextColor(15, 23, 42);
  doc.text('PREDICTIVE SIMULATION:', 18 + colStep * 4, 38);
  doc.setTextColor(simulatedBlocksCount > 0 ? 147 : 100, simulatedBlocksCount > 0 ? 51 : 116, simulatedBlocksCount > 0 ? 234 : 139);
  doc.text(
    simulatedBlocksCount > 0 ? `${simulatedBlocksCount} Staged Blocks Simulated` : 'Baseline Baseline',
    18 + colStep * 4,
    43
  );

  // Section 2: Visual Snapshot of the D3 Chart
  let nextY = 51;
  if (svgElement) {
    try {
      const chartPng = await renderSvgToPngDataUrl(svgElement, 1200, 520);
      const chartImgWidth = pageWidth - 28;
      const chartImgHeight = 84;
      doc.addImage(chartPng, 'PNG', 14, nextY, chartImgWidth, chartImgHeight);
      nextY += chartImgHeight + 3;

      doc.setFontSize(7.5);
      doc.setFont('courier', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text(
        'Fig 1.0: Real-time Corridor Health Map with 7-Day Moving Average Maintenance Backlog Trend-Line and Predictive Headway Strain Analysis.',
        14,
        nextY
      );
      nextY += 5;
    } catch {
      // Continue without breaking if image conversion encounters sandbox restriction
    }
  }

  // Section 3: Corridor Telemetry Table
  const tableData = corridors.map((c) => [
    c.id,
    c.name,
    `${c.utilization}%`,
    `${c.scheduledBlocks} blocks`,
    `${c.totalBlockHours}h`,
    `${c.backlog7DayMA}h/d`,
    `${c.predictedFutureStrain} index (${c.strainCategory.replace('_', ' ')})`,
    `${c.deployedGangsCount} crews`,
    c.criticalBlocksCount > 0 ? `${c.criticalBlocksCount} CRITICAL` : 'NORMAL',
  ]);

  autoTable(doc, {
    startY: nextY + 1,
    head: [
      [
        'ID',
        'CORRIDOR NAME',
        'UTILIZATION',
        'ACTIVE BLOCKS',
        'DURATION',
        '7D MA BACKLOG',
        'PREDICTIVE STRAIN',
        'CREWS',
        'PRIORITY',
      ],
    ],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'courier',
      fontSize: 7,
      cellPadding: 1.5,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [248, 250, 252],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
    pageBreak: 'auto',
  });

  // Get final Y from autoTable
  const finalTableY = (doc as any).lastAutoTable?.finalY || nextY + 40;

  // If table went into page 2, add footer on page 2, otherwise check if room on page 1
  if (finalTableY + 25 > pageHeight) {
    doc.addPage();
  }

  const signOffY = Math.min(pageHeight - 24, Math.max(finalTableY + 6, pageHeight - 24));

  // Endorsement Sign-Off Block
  doc.setDrawColor(203, 213, 225);
  doc.line(14, signOffY, pageWidth - 14, signOffY);

  doc.setFontSize(7);
  doc.setFont('courier', 'normal');
  doc.setTextColor(71, 85, 105);

  const sigColStep = (pageWidth - 28) / 3;
  // Signature 1
  doc.text('SUBMITTED BY:', 14, signOffY + 5);
  doc.setFont('courier', 'bold');
  doc.text(plannerName, 14, signOffY + 9);
  doc.setFont('courier', 'normal');
  doc.text('Chief Corridor Planning Coordinator / IRTMM', 14, signOffY + 13);

  // Signature 2
  doc.text('OPERATIONAL CONCURRENCE:', 14 + sigColStep, signOffY + 5);
  doc.setFont('courier', 'bold');
  doc.text('Sr. Divisional Operations Manager (Sr. DOM)', 14 + sigColStep, signOffY + 9);
  doc.setFont('courier', 'normal');
  doc.text('Northern Railway Operational Control', 14 + sigColStep, signOffY + 13);

  // Signature 3
  doc.text('SANCTIONED & APPROVED:', 14 + sigColStep * 2, signOffY + 5);
  doc.setFont('courier', 'bold');
  doc.text(drmName, 14 + sigColStep * 2, signOffY + 9);
  doc.setFont('courier', 'normal');
  doc.text('Divisional Railway Manager / IRTMM Sanctioning Authority', 14 + sigColStep * 2, signOffY + 13);

  // Footer Watermark
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `CONFIDENTIAL • Sanctioned for official use • Generated via RailSync IRTMM System on ${now.toISOString()}`,
    14,
    pageHeight - 5
  );
  doc.text('Page ' + doc.getNumberOfPages(), pageWidth - 14, pageHeight - 5, { align: 'right' });

  // Save the PDF
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
  doc.save(`railways-network-health-report_${options.viewMode.toLowerCase()}_${timestamp}.pdf`);
}
