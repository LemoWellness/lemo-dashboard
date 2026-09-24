// Admin-only CSV import into Firestore.
// Usage/Daily/Expenses/Income/Log/Projects use stable IDs so a re-upload
// overwrites the same row instead of creating a second copy.
import crypto from 'crypto';
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
  usageRawData: 'usageRawData',
};

function num(v) {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(String(v).replace(/,/g, '').trim());
  return isNaN(n) ? null : n;
}

function normKey(k) {
  return String(k || '').replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function pick(row, ...names) {
  const map = {};
  Object.keys(row || {}).forEach((k) => { map[normKey(k)] = row[k]; });
  for (const name of names) {
    const v = map[normKey(name)];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}

function normPeriod(p) {
  return String(p || '').trim().replace(/\s+to\s+/ig, '~');
}

function stableId(prefix, parts) {
  const key = parts.map((p) => String(p || '').trim().toLowerCase()).join('|');
  return prefix + crypto.createHash('sha1').update(key).digest('hex');
}

function docIdFor(type, doc) {
  if (type === 'projects') return doc.name;
  if (type === 'usageRawData') {
    return stableId('u_', [doc.period, doc.outletId, doc.venueName, doc.outletName]);
  }
  if (type === 'dailyRawData') {
    return stableId('d_', [doc.countDate, doc.venueId, doc.outletId, doc.venueName, doc.outletName]);
  }
  if (type === 'expenses') {
    return stableId('e_', [doc.location, doc.date, doc.category, doc.item, doc.amount, doc.description]);
  }
  if (type === 'income') {
    return stableId('i_', [doc.location, doc.date, doc.amount, doc.notes]);
  }
  if (type === 'communicationLog') {
    return stableId('c_', [doc.location, doc.date, doc.note, doc.channel]);
  }
  return null;
}

function rowToDoc(type, row) {
  switch (type) {
    case 'projects':
      return {
        name: String(pick(row, 'name') || '').trim(),
        businessModel: pick(row, 'businessModel') || '',
        numberOfChairs: num(pick(row, 'numberOfChairs')),
        goLiveDate: pick(row, 'goLiveDate') || '',
        monthlyFee: num(pick(row, 'monthlyFee')),
        revenueSharePercent: num(pick(row, 'revenueSharePercent')),
        streetAddress: pick(row, 'streetAddress') || '',
        city: pick(row, 'city') || '',
        state: pick(row, 'state') || '',
        zipCode: pick(row, 'zipCode') || '',
        tenureMonths: num(pick(row, 'tenureMonths')),
        avgMonthlyRevenue: num(pick(row, 'avgMonthlyRevenue')),
        customerContactName: pick(row, 'customerContactName') || '',
        customerContactPhone: pick(row, 'customerContactPhone') || '',
        customerContactEmail: pick(row, 'customerContactEmail') || '',
        bdConsultantName: pick(row, 'bdConsultantName') || '',
        bdConsultantPhone: pick(row, 'bdConsultantPhone') || '',
        bdConsultantEmail: pick(row, 'bdConsultantEmail') || '',
        contact2Name: pick(row, 'contact2Name') || '',
        contact2Phone: pick(row, 'contact2Phone') || '',
        contact2Email: pick(row, 'contact2Email') || '',
        editNotes: pick(row, 'editNotes') || '',
      };
    case 'expenses':
      return {
        location: String(pick(row, 'location') || '').trim(),
        date: pick(row, 'date') || '',
        category: pick(row, 'category') || '',
        item: pick(row, 'item') || '',
        description: pick(row, 'description') || '',
        source: pick(row, 'source') || '',
        quantity: num(pick(row, 'quantity')),
        costPerUnit: num(pick(row, 'costPerUnit')),
        amount: num(pick(row, 'quantity')) != null && num(pick(row, 'costPerUnit')) != null ? num(pick(row, 'quantity')) * num(pick(row, 'costPerUnit')) : num(pick(row, 'amount')),
        notes: pick(row, 'notes') || '',
        addedBy: 'import',
      };
    case 'income':
      return {
        location: String(pick(row, 'location') || '').trim(),
        date: pick(row, 'date') || '',
        amount: num(pick(row, 'amount')),
        grossRevenue: num(pick(row, 'grossRevenue')),
        notes: pick(row, 'notes') || '',
        addedBy: 'import',
      };
    case 'communicationLog':
      return {
        location: String(pick(row, 'location') || '').trim(),
        date: pick(row, 'date') || '',
        note: pick(row, 'note') || '',
        channel: pick(row, 'channel') || '',
        loggedBy: pick(row, 'loggedBy') || '',
        enteredBy: 'import',
      };
    case 'dailyRawData':
      return {
        venueId: pick(row, 'Venue ID'),
        venueName: String(pick(row, 'Venue Name', 'Venue name') || '').trim(),
        countDate: pick(row, 'Count Date', 'Count date'),
        outletId: pick(row, 'Outlet ID'),
        outletName: pick(row, 'Outlet Name', 'Outlet name'),
        entryTime: pick(row, 'Entry Time', 'Entry time'),
        country: pick(row, 'Country'),
        province: pick(row, 'Province'),
        city: pick(row, 'City'),
        deviceModel: pick(row, 'Device Model', 'Device model'),
        currency: pick(row, 'Currency'),
        orderNumber: num(pick(row, 'Order Number', 'Order number')),
        deviceNumber: num(pick(row, 'Device Number', 'Device number')),
        cash: num(pick(row, 'Cash')),
        pos: num(pick(row, 'POS', 'Pos')),
        qrCode: num(pick(row, 'QR Code', 'QR code')),
        refundNumber: num(pick(row, 'Refund Number', 'Refund number')),
        refund: num(pick(row, 'Refund')),
        totalAmount: num(pick(row, 'Total Amount')),
        completeNum: num(pick(row, 'Complete Num', 'complete num')),
        netIncome: num(pick(row, 'Net Income')),
        avgRunningWater: num(pick(row, 'Average Running Water', 'Average running water')),
        orderPrice: num(pick(row, 'Order Price', 'Order price')),
        avgVisitors: num(pick(row, 'Average Number of Visitors', 'Average number of visitors')),
      };
    case 'usageRawData':
      return {
        period: normPeriod(pick(row, 'Date')),
        outletId: pick(row, 'Outlet ID'),
        outletName: pick(row, 'Outlet Name'),
        province: pick(row, 'Province'),
        provinceName: pick(row, 'Province Name'),
        city: pick(row, 'City'),
        cityName: pick(row, 'City Name'),
        venueName: String(pick(row, 'Venue name', 'Venue Name') || '').trim(),
        channel: pick(row, 'Channel'),
        seatNum: num(pick(row, 'Seat Num')),
        idleNumber: num(pick(row, 'Idle number')),
        occupyNumber: num(pick(row, 'Occupy number')),
        scanNumber: num(pick(row, 'Scan number')),
        payNumber: num(pick(row, 'Pay number')),
        orderNumber: num(pick(row, 'Order number')),
        seatConversionRate: num(pick(row, 'Seat conversion rate')),
        h5ConversionRate: num(pick(row, 'H5 conversion rate')),
        firstGearRate: num(pick(row, 'First gear rate')),
        secondGearRate: num(pick(row, 'Second gear rate')),
        thirdGearRate: num(pick(row, 'Third gear rate')),
        placeCount: num(pick(row, 'Place count')),
        areaCount: num(pick(row, 'Area count')),
        currency: pick(row, 'Currency'),
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

    const csvText = fs.readFileSync(fileObj.filepath, 'utf8').replace(/^\uFEFF/, '');
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    if (parsed.errors.length) {
      return res.status(400).json({ error: `CSV parse error: ${parsed.errors[0].message}` });
    }

    let written = 0;
    let skipped = 0;
    const batchSize = 400;
    for (let i = 0; i < parsed.data.length; i += batchSize) {
      const batch = adminDb.batch();
      const chunk = parsed.data.slice(i, i + batchSize);
      chunk.forEach((row) => {
        const doc = rowToDoc(type, row);
        const hasKey = doc && (doc.name || doc.location || doc.venueName || doc.outletId || doc.venueId);
        if (!hasKey) {
          skipped++;
          return;
        }
        const id = docIdFor(type, doc);
        const ref = id
          ? adminDb.collection(collection).doc(id)
          : adminDb.collection(collection).doc();
        batch.set(ref, { ...doc, importedAt: new Date().toISOString() }, { merge: Boolean(id) });
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
