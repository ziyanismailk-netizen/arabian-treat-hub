import { db } from "@/lib/firebase";
import { doc, runTransaction } from "firebase/firestore";

// Atomically get the next bill number
export async function getNextBillNo() {
  const counterRef = doc(db, "counters", "orders");
  let newBillNo;
  await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const current = counterDoc.exists() ? counterDoc.data().latest || 0 : 0;
    newBillNo = current + 1;
    transaction.set(counterRef, { latest: newBillNo }, { merge: true });
  });
  return newBillNo;
}
