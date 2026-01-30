import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAqGUG20EGmz9ki8PjvLN7-eowSRM7XdJ8",
  authDomain: "arabian-treat-hub.firebaseapp.com",
  projectId: "arabian-treat-hub",
  storageBucket: "arabian-treat-hub.firebasestorage.app",
  messagingSenderId: "966013446495",
  appId: "1:966013446495:web:e51741182a228617006eea",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const roleUpdates = [
  { email: "admin@ath.com", role: "admin" },
  { email: "delivery@ath.com", role: "delivery" },
];

async function updateRoles() {
  console.log("🔄 Updating user roles in Firestore...\n");
  
  for (const update of roleUpdates) {
    try {
      // Sign in to get the UID
      const userCred = await signInWithEmailAndPassword(auth, update.email, update.email === "admin@ath.com" ? "Admin@01" : "Delivery@01");
      const uid = userCred.user.uid;
      
      // Update the user document
      const userRef = db.collection("users").doc(uid);
      await updateDoc(userRef, {
        role: update.role,
        updatedAt: new Date().toISOString(),
      });
      
      console.log(`✅ Updated ${update.email} → role: ${update.role}`);
    } catch (error) {
      console.error(`❌ Error updating ${update.email}:`, error.message);
    }
  }
  
  console.log("\n✅ Role updates complete!");
  process.exit(0);
}

updateRoles();
