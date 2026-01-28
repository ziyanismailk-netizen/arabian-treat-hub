"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, onSnapshot, setDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";

export default function SettingsPage() {
  const [store, setStore] = useState({ isOpen: true, isDayOpen: true, deliveryCharge: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "store"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStore({ ...data, isDayOpen: data.isDayOpen !== false });
      } else { setDoc(doc(db, "settings", "store"), { isOpen: true, isDayOpen: true, deliveryCharge: 0 }); }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleStore = async () => { await setDoc(doc(db, "settings", "store"), { ...store, isOpen: !store.isOpen }, { merge: true }); };
  const updateCharge = (e) => { setStore({ ...store, deliveryCharge: Number(e.target.value) }); };
  const saveSettings = async () => { await setDoc(doc(db, "settings", "store"), store, { merge: true }); alert("Saved!"); };

  const endDay = async () => {
    if (!confirm("⚠️ END SHIFT?\n\nThis will move ALL current orders to History and log you out.")) return;
    setProcessing(true);
    try {
      const activeStatuses = ["Pending", "Accepted", "Preparing", "Ready", "Out_for_Delivery", "Delivered"];
      const q = query(collection(db, "orders"), where("status", "in", activeStatuses));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => batch.update(doc(db, "orders", docSnap.id), { status: "History" }));
      await batch.commit();

      await setDoc(doc(db, "settings", "store"), { ...store, isOpen: false, isDayOpen: false }, { merge: true });
      await signOut(auth);
      window.location.href = "/admin/login"; 
    } catch (error) { alert("Error: " + error.message); setProcessing(false); }
  };

  if (loading) return <div className="p-10 font-bold opacity-50">LOADING...</div>;

  return (
    <div className="w-full max-w-xl mx-auto font-sans text-black p-6">
      <div className="mb-8 border-b pb-4 border-slate-200"><h1 className="text-3xl font-[1000] italic uppercase">Settings</h1></div>
      <div className="bg-white border-2 border-black rounded-xl overflow-hidden shadow-sm mb-8"><div className="flex items-center justify-between p-4 border-b border-slate-100"><div><h3 className="text-sm font-black uppercase">Shop Status (Pause)</h3><p className="text-[10px] font-bold text-slate-400">{store.isOpen ? "🟢 Online" : "🔴 Paused"}</p></div><button onClick={toggleStore} className={`relative w-14 h-7 rounded-full transition-colors flex items-center px-1 ${store.isOpen ? "bg-[#16a34a]" : "bg-slate-200"}`}><div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${store.isOpen ? "translate-x-7" : "translate-x-0"}`}></div></button></div><div className="flex items-center justify-between p-4 bg-slate-50"><div><h3 className="text-sm font-black uppercase">Delivery Fee (₹)</h3></div><div className="flex items-center gap-2"><input type="number" value={store.deliveryCharge} onChange={updateCharge} className="w-20 p-2 text-right font-[1000] text-sm border border-slate-300 rounded outline-none bg-white"/><button onClick={saveSettings} className="bg-black text-white px-3 py-2 rounded text-[10px] font-black uppercase hover:scale-105 transition-transform">Save</button></div></div></div>
      <div className="bg-white border-2 border-red-100 rounded-xl p-6 shadow-sm"><h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2 text-red-600"><span>🌙</span> End Shift & Reset</h2><p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">Done for the day?<br/>• Moves orders to History.<br/>• Locks Admin & Logs out.</p><button onClick={endDay} disabled={processing} className={`w-full py-4 rounded-xl font-black uppercase text-sm tracking-widest shadow-lg transition-transform ${processing ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 text-white hover:scale-105 hover:bg-red-700"}`}>{processing ? "Ending..." : "🔴 End Day & Logout"}</button></div>
    </div>
  );
}