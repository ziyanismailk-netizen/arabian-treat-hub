import admin from "firebase-admin";
import fs from "fs";

// Load Firebase service account key
const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

const users = [
  { email: "admin@ath.com", password: "Admin@01", role: "admin" },
  { email: "delivery@ath.com", password: "Delivery@01", role: "delivery" },
];

async function setupUsers() {
  for (const user of users) {
    try {
      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email: user.email,
        password: user.password,
      });

      // Set user role in Firestore
      await db.collection("users").doc(userRecord.uid).set({
        email: user.email,
        role: user.role,
        createdAt: new Date(),
      });

      console.log(`✅ Created ${user.role}: ${user.email}`);
    } catch (error) {
      if (error.code === "auth/email-already-exists") {
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
