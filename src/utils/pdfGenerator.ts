import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HandoverSession } from '../types';
import { getExpedition, CONDITION_LABELS } from './expeditions';

export function generateBastPdfBlob(session: HandoverSession): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const expInfo = session.expedition !== 'all' ? getExpedition(session.expedition) : null;
  const expName = expInfo ? expInfo.name : 'Semua Ekspedisi / Campuran';

  // Header Title
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(14, 12, pageWidth - 28, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('BERITA ACARA SERAH TERIMA RETUR PAKET', 20, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('BUKTI RESMI SERAH TERIMA FISIK PAKET RETUR GUDANG LOGISTIK', 20, 28);

  // BAST Number Box
  doc.setFillColor(245, 158, 11); // amber-500
  doc.roundedRect(pageWidth - 75, 16, 55, 14, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('NOMOR DOKUMEN BAST:', pageWidth - 72, 21);
  doc.setFontSize(9);
  doc.text(session.bastNumber, pageWidth - 72, 26);

  // Meta info grid
  let currentY = 40;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(14, currentY, (pageWidth - 32) / 2, 34, 2, 2, 'FD');
  doc.roundedRect(14 + (pageWidth - 32) / 2 + 4, currentY, (pageWidth - 32) / 2, 34, 2, 2, 'FD');

  // Left Column - Courier Details
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMASI EKSPEDISI & PENGANTAR', 18, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Ekspedisi      : ${expName}`, 18, currentY + 13);
  doc.text(`Nama Driver  : ${session.courierName || '-'}`, 18, currentY + 19);
  doc.text(`No. Kendaraan: ${session.vehiclePlate || '-'}`, 18, currentY + 25);
  doc.text(`Kontak/HP    : ${session.courierPhone || '-'}`, 18, currentY + 31);

  // Right Column - Warehouse Details
  const rightX = 14 + (pageWidth - 32) / 2 + 8;
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMASI PENERIMA & WAKTU', rightX, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const dateFormatted = new Date(session.createdAt).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFormatted = new Date(session.createdAt).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Tanggal / Jam : ${dateFormatted} ${timeFormatted}`, rightX, currentY + 13);
  doc.text(`Petugas/Checker: ${session.warehouseStaff || '-'}`, rightX, currentY + 19);
  doc.text(`Lokasi Gudang  : ${session.warehouseLocation || 'Gudang Pusat'}`, rightX, currentY + 25);
  doc.text(`Status BAST    : ${session.status === 'completed' ? 'SELESAI (Sah)' : 'AKTIF / TERPROSES'}`, rightX, currentY + 31);

  currentY += 40;

  // Summary Metrics Banner
  const totalItems = session.items.length;
  const goodItems = session.items.filter((i) => i.condition === 'baik').length;
  const damagedItems = session.items.filter((i) => i.condition !== 'baik').length;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, currentY, pageWidth - 28, 12, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`RINGKASAN:  Total Retur: ${totalItems} Paket`, 18, currentY + 7.5);

  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`• Kondisi Baik: ${goodItems}`, 85, currentY + 7.5);

  doc.setTextColor(217, 119, 6); // amber-600
  doc.text(`• Kemasan Rusak/Bocor: ${damagedItems}`, 135, currentY + 7.5);

  currentY += 16;

  // Notes if any
  if (session.notes) {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.roundedRect(14, currentY, pageWidth - 28, 8, 1, 1, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 53, 15);
    doc.text(`Catatan: ${session.notes}`, 18, currentY + 5.5);
    currentY += 11;
  }

  // Items Table
  const tableData = session.items.map((item, index) => {
    const itemExp = getExpedition(item.detectedExpedition || item.expedition);
    const cond = CONDITION_LABELS[item.condition] || { label: item.condition };
    const scanTime = new Date(item.scannedAt).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return [
      String(index + 1),
      item.trackingNumber,
      itemExp ? itemExp.shortName : item.expedition.toUpperCase(),
      scanTime,
      cond.label,
      item.note || '-',
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['No', 'Nomor Resi / AWB', 'Ekspedisi', 'Waktu Scan', 'Kondisi Paket', 'Keterangan']],
    body: tableData.length > 0 ? tableData : [['-', 'Belum ada paket yang dipindai', '-', '-', '-', '-']],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold', cellWidth: 50 },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'center', cellWidth: 24 },
      4: { halign: 'center', cellWidth: 32 },
      5: { cellWidth: 'auto' },
    },
    didDrawCell: (data) => {
      // Highlight damaged rows
      if (data.section === 'body' && data.column.index === 4) {
        const text = String(data.cell.raw);
        if (text && !text.toLowerCase().includes('baik')) {
          doc.setTextColor(180, 83, 9);
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // End of table Y position
  // @ts-expect-error - jspdf-autotable adds lastAutoTable to jsPDF instance
  const finalY = (doc.lastAutoTable?.finalY || currentY + 50) + 8;

  // Check if signatures fit on current page or need a new page
  let signY = finalY;
  if (signY + 45 > doc.internal.pageSize.getHeight() - 15) {
    doc.addPage();
    signY = 20;
  }

  // Legal Statement
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, signY, pageWidth - 28, 11, 1, 1, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Pernyataan: Kedua belah pihak telah memeriksa fisik jumlah dan kondisi kemasan paket retur sesuai data di atas.',
    18,
    signY + 4.5
  );
  doc.text(
    'Penyerahan ini sah dan mengikat sebagai bukti resmi serah terima / rekonsiliasi operasional logistik.',
    18,
    signY + 8.5
  );

  signY += 15;

  // Dual Signatures
  const colWidth = (pageWidth - 36) / 2;

  // Courier signature
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Pihak 1 (Driver / Kurir Pengantar):', 18, signY);

  doc.setDrawColor(100, 116, 139);
  doc.line(18, signY + 22, 18 + colWidth - 20, signY + 22);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(session.courierName || '( ........................................ )', 18, signY + 26);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(expName, 18, signY + 30);

  // Warehouse signature
  const signRightX = 18 + colWidth + 4;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Pihak 2 (Petugas / Checker Gudang):', signRightX, signY);

  doc.setDrawColor(100, 116, 139);
  doc.line(signRightX, signY + 22, signRightX + colWidth - 20, signY + 22);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(session.warehouseStaff || '( ........................................ )', signRightX, signY + 26);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(session.warehouseLocation || 'Gudang Logistik', signRightX, signY + 30);

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Dokumen sah digital dicetak melalui Sistem BAST Retur Logistik • Nomor: ${session.bastNumber}`,
      14,
      pageHeight - 8
    );
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - 36, pageHeight - 8);
  }

  return doc.output('blob');
}
