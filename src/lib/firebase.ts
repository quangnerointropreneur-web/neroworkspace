import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyA3Fs3P-gR-ofK1nB03j8nM6f8RSopeBkw",
  authDomain: "neroworkspace-3ecf6.firebaseapp.com",
  projectId: "neroworkspace-3ecf6",
  storageBucket: "neroworkspace-3ecf6.firebasestorage.app",
  messagingSenderId: "108666922161",
  appId: "1:108666922161:web:840f06a6dcf5b3521f2e90",
  measurementId: "G-M9GV5K5RNE"
};

// Initialize Firebase securely for Next.js
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Messaging singleton (SSR safe)
const messaging = async () => {
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
};

export { app, db, messaging };

