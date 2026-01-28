"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({ children }) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState({ isDayOpen: true, businessDate: "" });
  const [startingDay, setStartingDay] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [{ name: "Dashboard", path: "/admin/dashboard", icon: "💎" }, { name: "Live Orders", path: "/admin/orders", icon: "📋" }, { name: "Sales Report", path: "/admin/sales", icon: "📈" }, { name: "Menu Manager", path: "/admin/menu", icon: "🍴" }, { name: "Customers", path: "/admin/customers", icon: "👥" }, { name: "QR Scanner", path: "/admin/scanner", icon: "📸" }, { name: "Settings", path: "/admin/settings", icon: "⚙️" }];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "admin") { setRole("admin"); setLoading(false); }
        else { router.push("/admin/login"); }
      } else { router.push("/admin/login"); }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "store"), (docSnap) => {
      if (docSnap.exists()) {
        setStoreSettings(docSnap.data());
      }
    });
    return () => unsub();
  }, []);

  // 🟢 START NEW DAY (The Date Setter)
  const startNewDay = async () => {
    setStartingDay(true);
    try {
      // 1. Get Real Local Date (YYYY-MM-DD)
      const now = new Date();
      // Format to Sweden/Canada style (YYYY-MM-DD) which is standard for sorting
      const newBusinessDate = now.toLocaleDateString('en-CA'); 

      // 2. Archive OLD Data (Safety cleanup)
      const activeStatuses = ["Pending", "Accepted", "Preparing", "Ready", "Out_for_Delivery", "Delivered"];
      const q = query(collection(db, "orders"), where("status", "in", activeStatuses));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      // Move anything older than 4 AM today to History
      const cutoff = new Date();
      cutoff.setHours(4, 0, 0, 0);

      snapshot.docs.forEach((docSnap) => {
        if (docSnap.data().createdAt) {
          const orderDate = new Date(docSnap.data().createdAt.seconds * 1000);
          if (orderDate < cutoff) batch.update(doc(db, "orders", docSnap.id), { status: "History" });
        }
      });
      await batch.commit();

      // 3. UPDATE DB: Set isDayOpen = true AND Set the new businessDate
      await setDoc(doc(db, "settings", "store"), { 
        isOpen: true, 
        isDayOpen: true,
        businessDate: newBusinessDate // <--- THIS LOCKS THE DATE UNTIL NEXT RESET
      }, { merge: true });

    } catch (e) { alert(e.message); }
    setStartingDay(false);
  };

  if (loading) return <div className="min-h-screen bg-[#064e3b] flex items-center justify-center"><p className="text-white font-[1000] animate-pulse">ATH BOOTING...</p></div>;

  // 🔒 LOCK SCREEN LOGIC
  if (!storeSettings.isDayOpen) {
    // Check if the "Closed Date" is essentially "Today" or "Yesterday"
    const todayStr = new Date().toLocaleDateString('en-CA');
    const isNewDay = storeSettings.businessDate !== todayStr;
    
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-100 p-6 text-center font-sans text-black">
        <div className="bg-white border-2 border-black rounded-2xl p-10 shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-300">
          <div className="text-6xl mb-6">☀️</div>
          <h1 className="text-3xl font-[1000] uppercase italic mb-4">
            {isNewDay ? "Start Fresh?" : "Shift Ended"}
          </h1>
          <p className="text-slate-500 font-bold mb-8 leading-relaxed">
            {isNewDay 
              ? "A new calendar day has arrived." 
              : "You closed the shift for this date."}
            <br/>
            <span className="text-xs text-slate-400">Last Open: {storeSettings.businessDate || "N/A"}</span>
          </p>
          <button onClick={startNewDay} disabled={startingDay} className="w-full py-4 bg-[#064e3b] text-white rounded-xl font-black uppercase text-lg shadow-lg hover:scale-105 transition-transform animate-pulse">{startingDay ? "Starting..." : `Start New Day (${new Date().toLocaleDateString('en-CA')}) 🚀`}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#FFFFFF]"> 
      <aside className="w-72 bg-[#064e3b] text-white fixed h-full flex flex-col z-50 shadow-2xl">
        <div className="p-8 border-b border-white/10"><h1 className="text-2xl font-[1000] italic text-white tracking-tighter">ATH ADMIN</h1><div className="mt-2 py-1 px-3 bg-[#042f24] rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 w-fit"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>Shop is Live</div></div>
        <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">{menuItems.map((item) => (<Link key={item.path} href={item.path} className={`flex items-center space-x-4 px-5 py-3 rounded-2xl transition-all duration-300 font-[1000] text-[11px] uppercase tracking-[0.2em] group ${pathname === item.path ? "bg-white text-[#000000] shadow-xl scale-105" : "text-white hover:bg-white/10"}`}><span className={`text-xl ${pathname === item.path ? "opacity-100" : "opacity-60"}`}>{item.icon}</span><span>{item.name}</span></Link>))}</nav>
        <div className="p-6 border-t border-white/10 bg-[#042f24]"><button onClick={() => signOut(auth)} className="w-full bg-[#dc2626] text-white py-4 rounded-2xl font-[1000] uppercase text-[11px] shadow-xl active:scale-95 transition-all border border-white/20">Logout System</button></div>
      </aside>
      <main className="flex-1 ml-72 min-h-screen p-10 bg-[#FFFFFF]"><div className="max-w-6xl mx-auto">{children}</div></main>
    </div>
  );
}