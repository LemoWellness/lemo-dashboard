import { useState } from 'react';
import { downloadPagePdf } from '../lib/pagePdf';

export default function PdfButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function onClick() {
    setBusy(true);
    setErr('');
    try {
      await downloadPagePdf();
    } catch (e) {
      setErr(e.message || 'Could not build the PDF.');
    }
    setBusy(false);
  }

  return (
    <div className="no-pdf" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <button
        type="button"
        className="btn"
        onClick={onClick}
        disabled={busy}
        style={{ background: 'transparent', color: 'var(--ember)', border: '1px solid var(--ember)' }}
      >
        {busy ? 'Building PDF...' : 'Download PDF'}
      </button>
      {err ? <span className="form-error">{err}</span> : null}
    </div>
  );
}
