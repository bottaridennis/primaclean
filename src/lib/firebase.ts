import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 1. Try to get config from environment variables
const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
};

// 2. Fallback to local config if environment variables are missing
let finalConfig = envConfig;

if (!envConfig.apiKey) {
  try {
    // Dynamic import to avoid build errors if the file is missing in prod
    // @ts-ignore
    const local = await import('../../firebase-applet-config.json');
    finalConfig = local.default;
  } catch (error) {
    // Fallback error logged to console
    console.warn("Firebase environment variables not set, and firebase-applet-config.json not found.");
  }
}

// 3. Initialize Firebase
if (!finalConfig || !finalConfig.apiKey) {
  throw new Error("Firebase API Key is missing. Please check your .env or firebase-applet-config.json");
}

const app = getApps().length === 0 ? initializeApp(finalConfig) : getApp();

// Export services
export const db = getFirestore(app, finalConfig.firestoreDatabaseId);
export const auth = getAuth(app);

