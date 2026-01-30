import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAqGUG20EGmz9ki8PjvLN7-eowSRM7XdJ8",
  authDomain: "arabian-treat-hub.firebaseapp.com",
  projectId: "arabian-treat-hub",
  storageBucket: "arabian-treat-hub.firebasestorage.app",
  messagingSenderId: "966013446495",
  appId: "1:966013446495:web:e51741182a228617006eea",
  measurementId: "G-E1MD09X7QS"
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
      
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: user.email,
        role: user.role,
        createdAt: new Date().toISOString(),
      });
      
      console.log(`✅ Created ${user.role}: ${user.email}`);
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        console.log(`⚠️  ${user.email} already exists, updating role...`);
        // Try to find and update existing user
        try {
          const existingUserSnapshot = await db.collection("users")
            .where("email", "==", user.email)
            .get();
          
          if (!existingUserSnapshot.empty) {
            const docId = existingUserSnapshot.docs[0].id;
            await setDoc(doc(db, "users", docId), {
              email: user.email,
              role: user.role,
            }, { merge: true });
            console.log(`✅ Updated ${user.role} for ${user.email}`);
          }
        } catch (updateError) {
          console.error(`❌ Could not update ${user.email}:`, updateError.message);
        }
      } else {
        console.error(`❌ Error creating ${user.email}:`, error.message);
      }
    }
  }
  
  console.log("\n✅ Setup complete!");
  process.exit(0);
}

setupUsers();
