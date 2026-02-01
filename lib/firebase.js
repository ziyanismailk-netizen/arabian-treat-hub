import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth"; 
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAqGUG20EGmz9ki8PjvLN7-eowSRM7XdJ8",
  authDomain: "arabian-treat-hub.firebaseapp.com",
  projectId: "arabian-treat-hub",
  storageBucket: "arabian-treat-hub.firebasestorage.app",
  messagingSenderId: "966013446495",
  appId: "1:966013446495:web:e51741182a228617006eea",
  measurementId: "G-E1MD09X7QS"
};

// Initialize Firebase (Checks if an app already exists to prevent errors)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Create the tools
const db = getFirestore(app);
const auth = getAuth(app); 

// Export them so other pages can use them
export { db, auth, app };
import { terminate, clearIndexedDbPersistence } from "firebase/firestore";

// After your 'db' initialization:
await clearIndexedDbPersistence(db);