/**
 * Utility for robust, cross-browser printing of BAST Manifests & Thermal Slips.
 * Handles iframe sandboxes, prevents dark-theme leaks, and guarantees crisp 100% white printing.
 */

interface PrintOptions {
  elementId: string;
  title?: string;
  layout?: 'a4_1page' | 'a4_full' | 'thermal';
  autoPrint?: boolean;
}

/**
 * Builds a standalone, self-contained HTML document with embedded CSS.
 */
export function generatePrintDocumentHtml(
  contentHtml: string,
  title = 'Berita Acara Serah Terima Retur',
  layout: 'a4_1page' | 'a4_full' | 'thermal' = 'a4_1page'
): string {
  const isThermal = layout === 'thermal';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    /* Reset & Base Fonts */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 12px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    code, pre, .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace !important;
    }

    /* Print Page Dimensions */
    @page {
      ${
        isThermal
          ? 'size: 80mm auto !important; margin: 2mm 3mm !important;'
          : layout === 'a4_1page'
          ? 'size: A4 portrait !important; margin: 6mm 8mm 6mm 8mm !important;'
          : 'size: A4 portrait !important; margin: 8mm 10mm 8mm 10mm !important;'
      }
    }

    @media print {
      .no-print {
        display: none !important;
      }
      body {
        padding: 0 !important;
        margin: 0 !important;
      }
      .page-container {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
      }
    }

    @media screen {
      body {
        background: #0f172a !important;
        padding: 20px 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .no-print {
        position: sticky;
        top: 10px;
        z-index: 100;
        width: 100%;
        max-width: 820px;
        background: #1e293b;
        color: #f8fafc;
        padding: 10px 16px;
        border-radius: 12px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
        border: 1px solid #334155;
      }
      .page-container {
        background: #ffffff !important;
        color: #0f172a !important;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
        border-radius: 8px;
        padding: 24px;
        width: 100%;
        max-width: ${isThermal ? '320px' : '820px'};
        ${layout === 'a4_1page' ? 'min-height: 270mm;' : ''}
      }
    }

    /* Essential Layout & Grid Helpers */
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
    .gap-1 { gap: 4px; }
    .gap-1\\.5 { gap: 6px; }
    .gap-2 { gap: 8px; }
    .gap-3 { gap: 12px; }
    .gap-4 { gap: 16px; }
    .gap-8 { gap: 32px; }

    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .justify-between { justify-content: space-between; }
    .items-center { align-items: center; }
    .items-end { align-items: flex-end; }
    .items-start { align-items: flex-start; }

    /* Typography */
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .font-black { font-weight: 900; }
    .font-medium { font-weight: 500; }
    .uppercase { text-transform: uppercase; }
    .leading-none { line-height: 1; }
    .leading-tight { line-height: 1.25; }
    .tracking-tight { letter-spacing: -0.025em; }
    .tracking-wide { letter-spacing: 0.025em; }
    .tracking-wider { letter-spacing: 0.05em; }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .text-xs { font-size: 11px; }
    .text-sm { font-size: 13px; }
    .text-base { font-size: 15px; }
    .text-lg { font-size: 17px; }
    .text-xl { font-size: 19px; }
    .text-\\[8px\\] { font-size: 8px; }
    .text-\\[9px\\] { font-size: 9px; }
    .text-\\[10px\\] { font-size: 10px; }
    .text-\\[11px\\] { font-size: 11px; }

    /* Colors */
    .text-slate-900 { color: #0f172a; }
    .text-slate-800 { color: #1e293b; }
    .text-slate-700 { color: #334155; }
    .text-slate-600 { color: #475569; }
    .text-slate-500 { color: #64748b; }
    .text-slate-400 { color: #94a3b8; }
    .text-emerald-700 { color: #047857; }
    .text-emerald-800 { color: #065f46; }
    .text-amber-700 { color: #b45309; }
    .text-amber-800 { color: #92400e; }
    .text-amber-900 { color: #78350f; }
    .text-red-600 { color: #dc2626; }

    .bg-white { background-color: #ffffff; }
    .bg-slate-50 { background-color: #f8fafc; }
    .bg-slate-100 { background-color: #f1f5f9; }
    .bg-slate-200 { background-color: #e2e8f0; }
    .bg-slate-800 { background-color: #1e293b; }
    .bg-slate-900 { background-color: #0f172a; }
    .bg-emerald-50 { background-color: #ecfdf5; }
    .bg-emerald-100 { background-color: #d1fae5; }
    .bg-amber-50 { background-color: #fffbeb; }
    .bg-amber-100 { background-color: #fef3c7; }

    /* Borders */
    .border { border: 1px solid #cbd5e1; }
    .border-b { border-bottom: 1px solid #cbd5e1; }
    .border-t { border-top: 1px solid #cbd5e1; }
    .border-r { border-right: 1px solid #cbd5e1; }
    .border-l { border-left: 1px solid #cbd5e1; }
    .border-b-2 { border-bottom: 2px solid #0f172a; }
    .border-slate-200 { border-color: #e2e8f0; }
    .border-slate-300 { border-color: #cbd5e1; }
    .border-slate-400 { border-color: #94a3b8; }
    .border-slate-600 { border-color: #475569; }
    .border-slate-700 { border-color: #334155; }
    .border-slate-800 { border-color: #1e293b; }
    .border-slate-900 { border-color: #0f172a; }
    .border-dashed { border-style: dashed; }
    .rounded { border-radius: 4px; }
    .rounded-lg { border-radius: 8px; }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
      vertical-align: middle;
    }
    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-align: left;
    }

    /* Spacing helpers */
    .p-1 { padding: 4px; }
    .p-1\\.5 { padding: 6px; }
    .p-2 { padding: 8px; }
    .p-3 { padding: 12px; }
    .p-4 { padding: 16px; }
    .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
    .py-1 { padding-top: 4px; padding-bottom: 4px; }
    .py-2 { padding-top: 8px; padding-bottom: 8px; }
    .px-1 { padding-left: 4px; padding-right: 4px; }
    .px-1\\.5 { padding-left: 6px; padding-right: 6px; }
    .px-2 { padding-left: 8px; padding-right: 8px; }
    .px-3 { padding-left: 12px; padding-right: 12px; }
    .mb-1 { margin-bottom: 4px; }
    .mb-2 { margin-bottom: 8px; }
    .mb-2\\.5 { margin-bottom: 10px; }
    .mb-3 { margin-bottom: 12px; }
    .mb-4 { margin-bottom: 16px; }
    .mt-1 { margin-top: 4px; }
    .mt-2 { margin-top: 8px; }
    .mt-3 { margin-top: 12px; }
    .mt-4 { margin-top: 16px; }
    .pb-2 { padding-bottom: 8px; }
    .pb-3 { padding-bottom: 12px; }
    .pt-1 { padding-top: 4px; }
    .pt-2 { padding-top: 8px; }
    .pt-4 { padding-top: 16px; }

    .h-8 { height: 32px; }
    .h-10 { height: 40px; }
    .h-12 { height: 48px; }
    .h-14 { height: 56px; }
    .w-40 { width: 160px; }
    .w-48 { width: 192px; }
    .mx-auto { margin-left: auto; margin-right: auto; }
  </style>
</head>
<body>
  <div class="no-print">
    <div>
      <strong style="font-size: 14px; display: block;">🖨️ Pratinjau Dokumen BAST Retur</strong>
      <span style="font-size: 11px; color: #94a3b8;">Format: ${
        isThermal ? 'Struk Thermal 80mm' : layout === 'a4_1page' ? 'A4 Pas 1 Lembar' : 'A4 Rinci Lengkap'
      }</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" style="background: #f59e0b; color: #0f172a; font-weight: 700; border: none; padding: 7px 16px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 12px;">
        <span>Cetak / Simpan PDF</span>
      </button>
      <button onclick="window.close()" style="background: #334155; color: #f8fafc; font-weight: 600; border: none; padding: 7px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;">
        Tutup
      </button>
    </div>
  </div>

  <div class="page-container">
    ${contentHtml}
  </div>

  <script>
    // Auto-trigger print dialog after styles render
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {
          console.warn('Auto print notice:', e);
        }
      }, 350);
    });
  </script>
</body>
</html>`;
}

/**
 * Opens the printable document in a new tab / window.
 * This completely avoids any iframe sandbox constraints.
 */
export function openPrintInNewTab({
  elementId,
  title = 'BAST Retur',
  layout = 'a4_1page',
}: PrintOptions): boolean {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn('Print target element not found:', elementId);
    return false;
  }

  const html = generatePrintDocumentHtml(el.innerHTML, title, layout);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const newWindow = window.open(url, '_blank');
  if (!newWindow) {
    // Popup might be blocked, fallback to standard print
    window.print();
    return false;
  }

  return true;
}

/**
 * Smart Print:
 * 1. Tries clean isolated hidden iframe print.
 * 2. If blocked or sandbox prevents it, falls back to openPrintInNewTab or window.print().
 */
export async function executeSmartPrint({
  elementId,
  title = 'BAST Retur',
  layout = 'a4_1page',
}: PrintOptions): Promise<'iframe' | 'new_tab' | 'window' | 'failed'> {
  const el = document.getElementById(elementId);
  if (!el) {
    try {
      window.print();
      return 'window';
    } catch {
      return 'failed';
    }
  }

  const fullHtml = generatePrintDocumentHtml(el.innerHTML, title, layout);

  // Attempt isolated hidden iframe printing first (cleanest paper output)
  try {
    const existingIframe = document.getElementById('print-isolated-iframe');
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'print-isolated-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(fullHtml);
      doc.close();

      await new Promise((resolve) => setTimeout(resolve, 300));

      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          iframe.remove();
        }, 3000);
        return 'iframe';
      } catch (printErr) {
        console.info('Iframe print restricted, opening new tab:', printErr);
        iframe.remove();
        openPrintInNewTab({ elementId, title, layout });
        return 'new_tab';
      }
    }
  } catch (err) {
    console.info('Isolated print not permitted in sandbox, falling back:', err);
  }

  // Fallback: try new tab
  try {
    const success = openPrintInNewTab({ elementId, title, layout });
    if (success) return 'new_tab';
  } catch (err) {
    console.info('New tab print fallback note:', err);
  }

  // Final fallback: standard window.print
  try {
    window.print();
    return 'window';
  } catch (err) {
    console.warn('Window print failed:', err);
    return 'failed';
  }
}
