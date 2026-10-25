import { jsPDF } from 'jspdf';
import { supabase } from './_lib/supabase.js';
import { setCors, handleOptions } from './_lib/cors.js';

// ─── Config ──────────────────────────────────────────────────────────────────

export const config = {
  maxDuration: 60, // 60s for image fetching + PDF generation
};

const MAX_PHOTOS = 50;
const PAGE_W = 210; // A4 width mm
const PAGE_H = 297; // A4 height mm
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;
const NAVY = [10, 22, 40];       // #0A1628
const BLUE = [37, 99, 235];      // #2563EB
const DARK_GREY = [51, 51, 51];
const MID_GREY = [120, 120, 120];
const LIGHT_GREY = [220, 220, 220];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchImageAsBase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── PDF Drawing Helpers ─────────────────────────────────────────────────────

function drawHeader(doc) {
  // Navy bar at top
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 12, 'F');

  // CPC SERVICES title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...NAVY);
  doc.text('CPC SERVICES', MARGIN, 28);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...BLUE);
  doc.text('Vehicle Cleaning Report', MARGIN, 36);

  // Separator line
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 40, PAGE_W - MARGIN, 40);
}

function drawFooter(doc, pageNum, totalPages, dateGenerated) {
  const y = PAGE_H - 10;

  // Light line above footer
  doc.setDrawColor(...LIGHT_GREY);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y - 5, PAGE_W - MARGIN, y - 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MID_GREY);
  doc.text('CPC Services Pty Ltd — Vehicle Cleaning Documentation', MARGIN, y);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W / 2, y, { align: 'center' });
  doc.text(`Generated: ${dateGenerated}`, PAGE_W - MARGIN, y, { align: 'right' });
}

function addNewPage(doc) {
  doc.addPage('a4', 'portrait');
}

function drawSectionHeader(doc, title, y) {
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(title, MARGIN + 4, y + 5.5);
  return y + 12;
}

// ─── Photo Grid Drawing ─────────────────────────────────────────────────────

function drawPhotoGrid(doc, photos, sectionTitle, startPage) {
  const COLS = 2;
  const ROWS = 3;
  const PHOTOS_PER_PAGE = COLS * ROWS;
  const GAP = 6;
  const IMG_W = (CONTENT_W - GAP) / COLS;
  const IMG_H = 60;
  const LABEL_H = 5;
  const CELL_H = IMG_H + LABEL_H + 4;
  const GRID_START_Y = 56;

  let pageCount = 0;

  for (let i = 0; i < photos.length; i++) {
    const indexOnPage = i % PHOTOS_PER_PAGE;

    if (indexOnPage === 0) {
      if (pageCount > 0) {
        addNewPage(doc);
      }
      pageCount++;

      // Section header on each page of this section
      drawSectionHeader(doc, sectionTitle, 46);
    }

    const row = Math.floor(indexOnPage / COLS);
    const col = indexOnPage % COLS;

    const x = MARGIN + col * (IMG_W + GAP);
    const y = GRID_START_Y + row * (CELL_H + 2);

    const photo = photos[i];

    // Step label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...DARK_GREY);
    const label = photo.step_label || `Photo ${i + 1}`;
    doc.text(label, x, y + 3);

    // Damage flag indicator
    if (photo.damage_flag) {
      doc.setFillColor(220, 38, 38); // red-600
      doc.roundedRect(x + doc.getTextWidth(label) + 2, y - 1, 18, 5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(255, 255, 255);
      doc.text('DAMAGE', x + doc.getTextWidth(label) + 4, y + 2.5);
    }

    // Photo border
    doc.setDrawColor(...LIGHT_GREY);
    doc.setLineWidth(0.3);
    doc.rect(x, y + LABEL_H, IMG_W, IMG_H);

    // Photo image
    if (photo._base64) {
      try {
        doc.addImage(photo._base64, 'JPEG', x + 0.5, y + LABEL_H + 0.5, IMG_W - 1, IMG_H - 1);
      } catch {
        // Draw placeholder if image fails
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...MID_GREY);
        doc.text('Image unavailable', x + IMG_W / 2, y + LABEL_H + IMG_H / 2, { align: 'center' });
      }
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...MID_GREY);
      doc.text('Image unavailable', x + IMG_W / 2, y + LABEL_H + IMG_H / 2, { align: 'center' });
    }
  }

  return pageCount;
}

// ─── Main Report Generator ───────────────────────────────────────────────────

async function generateReport(vehicleId) {
  // 1. Fetch vehicle
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', vehicleId)
    .single();

  if (vehicleError) {
    if (vehicleError.code === 'PGRST116') {
      throw { status: 404, message: 'Vehicle not found' };
    }
    throw { status: 500, message: 'Failed to fetch vehicle', details: vehicleError.message };
  }

  // 2. Fetch photos
  const { data: rawPhotos, error: photosError } = await supabase
    .from('photos')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: true })
    .limit(MAX_PHOTOS);

  if (photosError) {
    throw { status: 500, message: 'Failed to fetch photos', details: photosError.message };
  }

  // Generate public URLs for photos
  const photos = (rawPhotos || []).map(photo => {
    if (photo.storage_path) {
      const { data: urlData } = supabase.storage
        .from('captures')
        .getPublicUrl(photo.storage_path);
      return { ...photo, public_url: urlData?.publicUrl || null };
    }
    return { ...photo, public_url: null };
  });

  // 3. Fetch signatures
  let signatures = [];
  try {
    const { data, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: true });
    if (!error) {
      signatures = (data || []).map(sig => {
        if (sig.storage_path) {
          const { data: urlData } = supabase.storage
            .from('signatures')
            .getPublicUrl(sig.storage_path);
          return { ...sig, public_url: urlData?.publicUrl || null };
        }
        return { ...sig, public_url: null };
      });
    }
  } catch {
    // Signatures table may not exist
  }

  // 4. Categorize photos
  const beforePhotos = photos.filter(p => p.type === 'before');
  const afterPhotos = photos.filter(p => p.type === 'after');
  const damagePhotos = photos.filter(p => p.damage_flag);

  // 5. Fetch images as base64 (parallel, with limit)
  const allPhotosToFetch = [...new Set([...beforePhotos, ...afterPhotos, ...damagePhotos])];
  const imagePromises = allPhotosToFetch.map(async (photo) => {
    if (photo.public_url) {
      photo._base64 = await fetchImageAsBase64(photo.public_url);
    }
  });
  const sigPromises = signatures.map(async (sig) => {
    if (sig.public_url) {
      sig._base64 = await fetchImageAsBase64(sig.public_url);
    }
  });
  await Promise.all([...imagePromises, ...sigPromises]);

  // 6. Generate PDF
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const dateGenerated = formatDateShort(new Date().toISOString());

  // ── Page 1: Cover / Summary ──

  drawHeader(doc);

  // Vehicle info box
  let y = 50;

  // Rego (large, bold)
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(MARGIN, y, CONTENT_W, 80, 2, 2, 'F');
  doc.setDrawColor(...LIGHT_GREY);
  doc.roundedRect(MARGIN, y, CONTENT_W, 80, 2, 2, 'S');

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MID_GREY);
  doc.text('REGISTRATION', MARGIN + 6, y);

  y += 8;
  doc.setFont('courier', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...NAVY);
  doc.text(vehicle.rego || '—', MARGIN + 6, y);

  // Status badge
  const status = vehicle.status || 'in_progress';
  const isCompleted = status === 'completed';
  const statusText = isCompleted ? 'COMPLETED' : 'IN PROGRESS';
  const badgeColor = isCompleted ? [22, 163, 74] : [234, 179, 8]; // green-600 / yellow-500
  const badgeW = doc.getTextWidth(statusText) * 0.35 + 12;
  doc.setFillColor(...badgeColor);
  doc.roundedRect(PAGE_W - MARGIN - badgeW - 6, y - 8, badgeW, 7, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(statusText, PAGE_W - MARGIN - badgeW / 2 - 6, y - 3.5, { align: 'center' });

  // Detail rows
  y += 10;
  const details = [
    ['Vehicle Type', vehicle.vehicle_type || '—'],
    ['Bay / Location', vehicle.bay || '—'],
    ['Date', formatDate(vehicle.created_at)],
    ['Worker', vehicle.worker_name || '—'],
  ];

  if (isCompleted && vehicle.completed_at) {
    details.push(['Completed', formatDate(vehicle.completed_at)]);
  }

  doc.setFontSize(9);
  for (const [label, value] of details) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MID_GREY);
    doc.text(label + ':', MARGIN + 6, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_GREY);
    doc.text(value, MARGIN + 50, y);

    y += 6;
  }

  // Photo statistics section
  y = 140;
  drawSectionHeader(doc, 'PHOTO STATISTICS', y);
  y += 14;

  const stats = [
    ['Before Photos', String(beforePhotos.length)],
    ['After Photos', String(afterPhotos.length)],
    ['Damage Flagged', String(damagePhotos.length)],
    ['Total Photos', String(photos.length)],
  ];

  const statBoxW = (CONTENT_W - 9) / 4;
  for (let i = 0; i < stats.length; i++) {
    const sx = MARGIN + i * (statBoxW + 3);

    doc.setFillColor(245, 247, 250);
    doc.roundedRect(sx, y, statBoxW, 22, 2, 2, 'F');
    doc.setDrawColor(...LIGHT_GREY);
    doc.roundedRect(sx, y, statBoxW, 22, 2, 2, 'S');

    // Number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...NAVY);
    doc.text(stats[i][1], sx + statBoxW / 2, y + 10, { align: 'center' });

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MID_GREY);
    doc.text(stats[i][0], sx + statBoxW / 2, y + 17, { align: 'center' });
  }

  // Notes section
  if (vehicle.notes) {
    y += 32;
    drawSectionHeader(doc, 'NOTES', y);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK_GREY);

    const lines = doc.splitTextToSize(vehicle.notes, CONTENT_W - 12);
    doc.text(lines, MARGIN + 6, y);
  }

  // ── Photo Pages ──

  // Calculate total pages for footer
  // We need to estimate total pages first for the footer
  const beforePages = beforePhotos.length > 0 ? Math.ceil(beforePhotos.length / 6) : 0;
  const afterPages = afterPhotos.length > 0 ? Math.ceil(afterPhotos.length / 6) : 0;
  const damagePages = damagePhotos.length > 0 ? Math.ceil(damagePhotos.length / 6) : 0;
  const signaturePages = signatures.length > 0 ? 1 : 0;
  const totalPages = 1 + beforePages + afterPages + damagePages + signaturePages;

  // Before photos
  if (beforePhotos.length > 0) {
    addNewPage(doc);
    drawPhotoGrid(doc, beforePhotos, 'BEFORE CLEANING', doc.getNumberOfPages());
  }

  // After photos
  if (afterPhotos.length > 0) {
    addNewPage(doc);
    drawPhotoGrid(doc, afterPhotos, 'AFTER CLEANING', doc.getNumberOfPages());
  }

  // Damage photos
  if (damagePhotos.length > 0) {
    addNewPage(doc);
    drawPhotoGrid(doc, damagePhotos, 'DAMAGE FLAGGED', doc.getNumberOfPages());
  }

  // ── Signatures Page ──
  if (signatures.length > 0) {
    addNewPage(doc);
    let sy = 46;
    sy = drawSectionHeader(doc, 'SIGNATURES', sy);
    sy += 4;

    const SIG_W = (CONTENT_W - 6) / 2;
    const SIG_H = 60;

    for (let i = 0; i < signatures.length; i++) {
      const sig = signatures[i];
      const col = i % 2;
      const row = Math.floor(i / 2);

      // Start new page if needed (3 rows per page = 6 signatures)
      if (i > 0 && i % 6 === 0) {
        addNewPage(doc);
        sy = 46;
        sy = drawSectionHeader(doc, 'SIGNATURES (continued)', sy);
        sy += 4;
      }

      const currentRow = row % 3;
      const sx = MARGIN + col * (SIG_W + 6);
      const sigY = sy + currentRow * (SIG_H + 8);

      // Signature box
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(sx, sigY, SIG_W, SIG_H, 2, 2, 'F');
      doc.setDrawColor(...LIGHT_GREY);
      doc.roundedRect(sx, sigY, SIG_W, SIG_H, 2, 2, 'S');

      // Signer name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      doc.text(sig.signer_name || '—', sx + 4, sigY + 7);

      // Role badge
      const role = (sig.signer_role || '').toUpperCase();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...BLUE);
      doc.text(role, sx + 4, sigY + 13);

      // Date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...MID_GREY);
      doc.text(formatDate(sig.created_at), sx + 4, sigY + 19);

      // Signature image
      if (sig._base64) {
        try {
          doc.addImage(sig._base64, 'PNG', sx + 4, sigY + 22, SIG_W - 8, SIG_H - 26);
        } catch {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(...MID_GREY);
          doc.text('Signature unavailable', sx + SIG_W / 2, sigY + SIG_H / 2 + 8, { align: 'center' });
        }
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...MID_GREY);
        doc.text('Signature unavailable', sx + SIG_W / 2, sigY + SIG_H / 2 + 8, { align: 'center' });
      }
    }
  }

  // ── Draw footers on all pages ──
  const finalPageCount = doc.getNumberOfPages();
  for (let p = 1; p <= finalPageCount; p++) {
    doc.setPage(p);
    drawFooter(doc, p, finalPageCount, dateGenerated);
  }

  // ── Draw header on page 1 only (already drawn, but ensure branding on all pages) ──
  // Add mini header to subsequent pages
  for (let p = 2; p <= finalPageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PAGE_W, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text('CPC SERVICES', MARGIN, 12);
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MID_GREY);
    doc.text(vehicle.rego || '', PAGE_W - MARGIN, 12, { align: 'right' });

    // Thin separator
    doc.setDrawColor(...LIGHT_GREY);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 14, PAGE_W - MARGIN, 14);
  }

  return {
    buffer: Buffer.from(doc.output('arraybuffer')),
    rego: vehicle.rego || 'UNKNOWN',
  };
}

// ─── Main Handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    const { vehicle_id } = req.query;

    if (!vehicle_id) {
      return res.status(400).json({ error: 'Missing required query parameter: vehicle_id' });
    }

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(vehicle_id)) {
      return res.status(400).json({ error: 'Invalid vehicle_id format. Must be a valid UUID.' });
    }

    const { buffer, rego } = await generateReport(vehicle_id);

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `CPC_Report_${rego}_${dateStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Report generation error:', error);
    const status = error.status || 500;
    const message = error.message || 'Internal server error';
    res.status(status).json({ error: message, details: error.details || undefined });
  }
}
