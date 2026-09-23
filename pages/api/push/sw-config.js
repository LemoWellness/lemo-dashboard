// Public Firebase web config only (NEXT_PUBLIC_*). No secrets.
// Served as JS so firebase-messaging-sw.js can importScripts() it synchronously.
export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method not allowed');
  }
  const config = {
    apiKey: String(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ''),
    authDomain: String(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ''),
    projectId: String(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''),
    storageBucket: String(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ''),
    messagingSenderId: String(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ''),
    appId: String(process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '').trim(),
  };
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send('self.__LEMO_FIREBASE_CONFIG = ' + JSON.stringify(config) + ';
');
}
