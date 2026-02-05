import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth"; // Import Auth with persistence

const firebaseConfig = {
  apiKey: "AIzaSyAqGUG20EGmz9ki8PjvLN7-eowSRM7XdJ8",
  authDomain: "arabian-treat-hub.firebaseapp.com",
  projectId: "arabian-treat-hub",
  storageBucket: "arabian-treat-hub.firebasestorage.app",
  messagingSenderId: "966013446495",
  appId: "1:966013446495:web:e51741182a228617006eea",
  measurementId: "G-E1MD09X7QS"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Export all services for use in your pages
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Enable persistence for offline access
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Persistence error:", error);
});

// Enable Firestore offline persistence
try {
  enableIndexedDbPersistence(db);
} catch (err) {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence disabled');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser does not support persistence');
  }
}

// Google Maps API Key
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY";