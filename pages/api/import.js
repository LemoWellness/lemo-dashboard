// Admin-only. Accepts a CSV file exported from one of the old Google Sheets
// tabs and writes it into the matching Firestore collection. This is how
// Project Details / Expenses / Income / Communication Log (and later, Daily
// Raw Data / Usage Data) get preserved without a one-time manual migration —
// upload the export whenever you're ready.
//
// Expected CSV headers per `type` (case-insensitive, extra columns ignored):
//   projects            -> name, businessModel, numberOfChairs, goLiveDate, monthlyFee,
//                           revenueSharePercent, streetAddress, city, state, zipCode,
//                           tenureMonths, avgMonthlyRevenue, bdConsultantName,
//                           bdConsultantPhone, bdConsultantEmail, contact2Name,
//                           contact2Phone, contact2Email, editNotes
//   expenses            -> location, date, category, item, description, source,
//                           quantity, costPerUnit, notes
//   income              -> location, date, amount, notes
//   communicationLog    -> location, date, note, channel, loggedBy
//   dailyRawData        -> Venue ID, Venue Name, Count Date, Outlet ID, Outlet Name,
//                           Entry Time, Country, Province, City, Device Model, Currency,
//                           Order Number, Device Number, Cash, POS, QR Code, Refund Number,
//                           Refund, Total Amount, Complete Num, Net Income,
//                           Average Running Water, Order Price, Average Number of Visitors
//                           (headers must match the China backend export exactly, including
//                           spaces and capitalization — this one is stored as-is, unlike the
//                           other four which get renamed/reshaped on import)
import Papa from 'papaparse';
import formidable from 'formidable';
import fs from 'fs';
import { adminDb } from '../../lib/firebaseAdmin';
import { requireSession, requireAdmin } from '../../lib/auth';

export const config = { api: { bodyParser: false } };

const COLLECTION_BY_TYPE = {
  projects: 'projects',
  expenses: 'expenses',
  income: 'income',
  communicationLog: 'communicationLog',
  dailyRawData: 'dailyRawData',
};

function num(v) {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function rowToDoc(type, row) {
  switch (type) {
    case 'projects':
      return {
        name: row.name?.trim(),
        businessModel: row.businessModel || '',
        numberOfChairs: num(row.numberOfChairs),
        goLiveDate: row.goLiveDate || '',
        monthlyFee: num(row.monthlyFee),
        revenueSharePercent: num(row.revenueSharePercent),
        streetAddress: row.streetAddress || '',
        city: row.city || '',
        state: row.state || '',
        zipCode: row.zipCode || '',
        tenureMonths: num(row.tenureMonths),
        avgMonthlyRevenue: num(row.avgMonthlyRevenue),
        bdConsultantName: row.bdConsultantName || '',
        bdConsultantPhone: row.bdConsultantPhone || '',
        bdConsultantEmail: row.bdConsultantEmail || '',
        contact2Name: row.contact2Name || '',
        contact2Phone: row.contact2Phone || '',
        contact2Email: row.contact2Email || '',
        editNotes: row.editNotes || '',
      };
    case 'expenses':
      return {
        location: row.location?.trim(),
        date: row.date || '',
        category: row.category || '',
        item: row.item || '',
        description: row.description || '',
        source: row.source || '',
        quantity: num(row.quantity),
        costPerUnit: num(row.costPerUnit),
        amount: num(row.quantity) != null && num(row.costPerUnit) != null ? num(row.quantity) * num(row.costPerUnit) : null,
        notes: row.notes || '',
        addedBy: 'import',
      };
    case 'income':
      return {
        location: row.location?.trim(),
        date: row.date || '',
        amount: num(row.amount),
        notes: row.notes || '',
        addedBy: 'import',
      };
    case 'communicationLog':
      return {
        location: row.location?.trim(),
        date: row.date || '',
        note: row.note || '',
        channel: row.channel || '',
        loggedBy: row.loggedBy || '',
        enteredBy: 'import',
      };
    case 'dailyRawData':
      // Preserved as-is from the China POS backend export — column names match
      // the export exactly (e.g. "Venue Name", "Count Date", "POS", "QR Code").
      // No reshaping here on purpose: this is raw data storage, not a display
      // model. Future dashboard work can read/aggregate it as needed.
      return {
        venueId: row['Venue ID'] || '',
        venueName: (row['Venue Name'] || '').trim(),
        countDate: row['Count Date'] || '',
        outletId: row['Outlet ID'] || '',
        outletName: row['Outlet Name'] || '',
        entryTime: row['Entry Time'] || '',
        country: row['Country'] || '',
        province: row['Province'] || '',
        city: row['City'] || '',
        deviceModel: row['Device Model'] || '',
        currency: row['Currency'] || '',
        orderNumber: num(row['Order Number']),
        deviceNumber: num(row['Device Number']),
        cash: num(row['Cash']),
        pos: num(row['POS']),
        qrCode: num(row['QR Code']),
        refundNumber: num(row['Refund Number']),
        refund: num(row['Refund']),
        totalAmount: num(row['Total Amount']),
        completeNum: num(row['Complete Num']),
        netIncome: num(row['Net Income']),
        avgRunningWater: num(row['Average Running Water']),
        orderPrice: num(row['Order Price']),
        avgVisitors: num(row['Average Number of Visitors']),
      };
    default:
      return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  try {
    const session = await requireSession(req);
    requireAdmin(session);

    const form = formidable({ maxFileSize: 20 * 1024 * 1024 });
    const [fields, files] = await form.parse(req);
    const type = Array.isArray(fields.type) ? fields.type[0] : fields.type;
    const collection = COLLECTION_BY_TYPE[type];
    if (!collection) {
      return res.status(400).json({ error: `Unknown import type "${type}". Expected one of: ${Object.keys(COLLECTION_BY_TYPE).join(', ')}.` });
    }

    const fileObj = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!fileObj) return res.status(400).json({ error: 'No file uploaded.' });

    const csvText = fs.readFileSync(fileObj.filepath, 'utf8');
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    if (parsed.errors.length) {
      return res.status(400).json({ error: `CSV parse error: ${parsed.errors[0].message}` });
    }

    let written = 0;
    let skipped = 0;
    const batchSize = 400; // Firestore batch limit is 500 writes
    for (let i = 0; i < parsed.data.length; i += batchSize) {
      const batch = adminDb.batch();
      const chunk = parsed.data.slice(i, i + batchSize);
      chunk.forEach((row) => {
        const doc = rowToDoc(type, row);
        const hasKey = doc && (doc.name || doc.location || doc.venueName);
        if (!hasKey) {
          skipped++;
          return;
        }
        const ref = type === 'projects'
          ? adminDb.collection(collection).doc(doc.name)
          : adminDb.collection(collection).doc();
        batch.set(ref, { ...doc, importedAt: new Date().toISOString() }, { merge: type === 'projects' });
        written++;
      });
      await batch.commit();
    }

    return res.status(200).json({ success: true, written, skipped, totalRows: parsed.data.length });
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: err.message || 'Import failed.' });
  }
}
