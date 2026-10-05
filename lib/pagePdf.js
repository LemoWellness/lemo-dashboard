// Client-only. Snapshots the on-screen page so the PDF matches the layout.

function pageLabel() {
  const h1 = document.querySelector('#page-sheet h1');
  const title = h1 ? h1.textContent.trim() : 'LEMO';
  const sel = document.querySelector('#page-sheet select');
  const period = sel && sel.selectedOptions && sel.selectedOptions[0]
    ? sel.selectedOptions[0].textContent.trim()
    : '';
  return [title, period].filter(Boolean).join(' - ');
}

function fileName(label) {
  const slug = String(label || 'lemo')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `lemo-${slug || 'page'}.pdf`;
}

export async function downloadPagePdf() {
  const node = document.getElementById('page-sheet');
  if (!node) throw new Error('Nothing on this page to download yet.');
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const captureWidth = 720;
  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: '#F2EDE6',
    useCORS: true,
    width: captureWidth,
    windowWidth: captureWidth,
    onclone: (doc) => {
      doc.querySelectorAll('.no-pdf').forEach((el) => { el.style.display = 'none'; });
      const sheet = doc.getElementById('page-sheet');
      if (sheet) {
        sheet.style.width = captureWidth + 'px';
        sheet.style.maxWidth = captureWidth + 'px';
        sheet.style.overflow = 'visible';
        sheet.style.boxSizing = 'border-box';
      }
      doc.querySelectorAll('.grid-4').forEach((el) => { el.style.gridTemplateColumns = '1fr 1fr'; });
      doc.querySelectorAll('.grid-2, .form-grid-2').forEach((el) => { el.style.gridTemplateColumns = '1fr'; });
      doc.querySelectorAll('.table-wrap').forEach((el) => {
        el.style.overflow = 'visible';
        el.style.maxWidth = '100%';
      });
      doc.querySelectorAll('table').forEach((el) => {
        el.style.width = '100%';
        el.style.fontSize = '11px';
      });
      doc.querySelectorAll('svg').forEach((el) => { el.style.maxWidth = '100%'; });
    },
  });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const pageInner = pageHeight - margin * 2;
  const img = canvas.toDataURL('image/jpeg', 0.92);
  const overlap = 36;
  let left = imgHeight;
  let offset = margin;
  pdf.addImage(img, 'JPEG', margin, offset, imgWidth, imgHeight);
  left -= pageInner;
  while (left > 8) {
    pdf.addPage();
    offset = margin - (imgHeight - left) - overlap;
    pdf.addImage(img, 'JPEG', margin, offset, imgWidth, imgHeight);
    left -= pageInner - overlap;
  }
  pdf.save(fileName(pageLabel()));
}
