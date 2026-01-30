import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Firebase config - update with your actual config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const users = [
  { email: "admin@ath.com", password: "Admin@01", role: "admin" },
  { email: "delivery@ath.com", password: "Delivery@01", role: "delivery" },
];

async function setupUsers() {
  for (const user of users) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        user.email,
        user.password
      );
      
      // Set user role in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: user.email,
        role: user.role,
        createdAt: new Date(),
      });
      
      console.log(`✅ Created ${user.role}: ${user.email}`);
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        console.log(`⚠️  ${user.email} already exists, skipping...`);
      } else {
        console.error(`❌ Error creating ${user.email}:`, error.message);
      }
    }
  }
  
  console.log("\n✅ Setup complete!");
  process.exit(0);
}

setupUsers();
