import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let firebaseConfig: any = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;

const initializeFirebaseConfig = async () => {
  if (!firebaseConfig.apiKey) {
    try {
      // Hide the import string from Vite's static static analysis to prevent build errors
      // if the file does not exist.
      const moduleName = '../../firebase-applet-config.json';
      const localConfigModule = await import(/* @vite-ignore */ moduleName);
      const config = localConfigModule.default || localConfigModule;
      
      firebaseConfig = { ...config };
      databaseId = config.firestoreDatabaseId || databaseId;
    } catch (e) {
      console.warn("Could not load firebase-applet-config.json fallback.", e);
    }
  }

  if (!firebaseConfig.apiKey) {
    console.error(
      "🔥 Firebase configuration is missing! Please configure VITE_FIREBASE_API_KEY and other related environment variables in your deployment / secrets."
    );
  }
};

await initializeFirebaseConfig();

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Export services
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
export const auth = getAuth(app);


