import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
export const isFirebaseConfigured = missingEnvVars.length === 0;

// --- Start of Debugging Code ---
if (typeof window !== 'undefined') { // Run only on the client-side
  console.log("--- Firebase Environment Variable Check ---");
  requiredEnvVars.forEach(envVar => {
    // We check if the value is truthy. An empty string is not a valid key.
    console.log(`[Firebase Check] ${envVar}: ${process.env[envVar] ? '✅ Loaded' : '❌ MISSING'}`);
  });
  if (!isFirebaseConfigured) {
    console.log(`[Firebase Check] Configuration is incomplete. Missing: ${missingEnvVars.join(', ')}`);
    console.log("[Firebase Check] Please ensure your .env.local file is correct and RESTART the development server.");
  } else {
    console.log("[Firebase Check] All Firebase variables are loaded successfully!");
  }
  console.log("-----------------------------------------");
}
// --- End of Debugging Code ---


let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Initialize Firebase
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };
