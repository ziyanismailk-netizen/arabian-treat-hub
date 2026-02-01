"use client";
import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function DeliveryLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await signOut(auth);
        setError("❌ No staff profile found.");
        setLoading(false);
        return;
      }
      const role = userDoc.data()?.role;
      if (role === "delivery") {
        router.push("/delivery/scanner");
      } else {
        await signOut(auth);
        setError("❌ Access denied. Only delivery staff can login here.");
      }
    } catch (error) {
      setError("❌ " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-200">
        <div className="text-center mb-10">
          <div className="inline-block bg-emerald-700 text-white px-8 py-3 rounded-2xl font-black text-2xl mb-4 italic">ATH</div>
          <h2 className="text-3xl font-black text-slate-900 uppercase">Delivery Entry</h2>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 rounded-xl font-bold text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="text-[12px] font-black uppercase text-slate-800 ml-4 block mb-2">Staff Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-5 bg-slate-50 rounded-3xl border-2 border-slate-100 outline-none focus:border-emerald-500 text-slate-900 font-bold" />
          </div>
          <div>
            <label className="text-[12px] font-black uppercase text-slate-800 ml-4 block mb-2">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-5 bg-slate-50 rounded-3xl border-2 border-slate-100 outline-none focus:border-emerald-500 text-slate-900 font-bold" />
          </div>
          <button disabled={loading} className="w-full bg-emerald-700 text-white p-6 rounded-3xl font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50">
            {loading ? "Verifying..." : "Enter Delivery Center"}
          </button>
        </form>
      </div>
    </div>
  );
}
