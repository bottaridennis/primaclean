import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Handle configuration from environment variables (GitHub Secrets) 
// or fallback to local config file if available
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
};

// Simple helper to check if env vars are present
const hasEnvVars = !!import.meta.env.VITE_FIREBASE_API_KEY;

let finalConfig = firebaseConfig;

if (!hasEnvVars) {
  try {
    // In local development / AI Studio, fallback to the auto-generated config
    // We use @vite-ignore to prevent the build tool from trying to resolve this file at build time
    // @ts-ignore - File might not exist in production build
    const localConfig = await import(/* @vite-ignore */ '../../firebase-applet-config.json');
    finalConfig = {
      ...localConfig.default,
      firestoreDatabaseId: localConfig.default.firestoreDatabaseId
    };
  } catch (e) {
    console.warn("Firebase configuration missing. Please check your environment variables or local config.");
  }
}

const app = initializeApp(finalConfig);
export const db = getFirestore(app, finalConfig.firestoreDatabaseId);
export const auth = getAuth(app);
