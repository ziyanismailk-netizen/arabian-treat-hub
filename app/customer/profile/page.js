"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Link from "next/link";

export default function CustomerProfile() {
  const [userPhone, setUserPhone] = useState("");
  const [userName, setUserName] = useState("");
  const [isEditing, setIsEditing] = useState(true); 
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const phone = localStorage.getItem("ath_user_phone");
    if (!phone) {
      router.push("/customer/login");
    } else {
      setUserPhone(phone);
      fetchUserProfile(phone);
    }
  }, []); // <--- EMPTY ARRAY

  const fetchUserProfile = async (phone) => {
    try {
      const docRef = doc(db, "users", phone);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().name) {
        setUserName(docSnap.data().name);
        setIsEditing(false); 
      }
    } catch (error) { console.error(error); }
  };

  const handleSaveName = async () => {
    if (!userName.trim()) return;
    setLoading(true);
    try {
      await setDoc(doc(db, "users", userPhone), { name: userName, phone: userPhone }, { merge: true });
      setIsEditing(false); 
    } catch (error) { alert("Failed to save."); } finally { setLoading(false); }
  };

  const handleRemoveName = async () => {
    if(!confirm("Remove your name?")) return;
    setLoading(true);
    try {
      await setDoc(doc(db, "users", userPhone), { name: "" }, { merge: true });
      setUserName("");
      setIsEditing(true); 
    } catch (error) { alert("Failed to remove."); } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/customer/login");
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-black pb-20">
      <header className="bg-white p-4 border-b-2 border-slate-100 flex items-center gap-4 sticky top-0 z-50">
        <Link href="/customer/menu" className="p-2 bg-slate-100 rounded-full font-black">←</Link>
        <h1 className="text-lg font-[1000] uppercase italic tracking-tighter">Profile</h1>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6 mt-6">
        <div className="bg-white rounded-[2.5rem] border-4 border-black p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="w-24 h-24 bg-yellow-400 rounded-full mx-auto border-4 border-black flex items-center justify-center text-4xl mb-6 shadow-sm">
            👤
          </div>
          
          <h2 className="text-xl font-[1000] uppercase italic tracking-tighter text-[#064e3b] mb-1">
            {!isEditing && userName ? userName : "Hello Foodie"}
          </h2>
          <p className="text-sm font-black text-slate-400 tracking-widest mb-6">+91 {userPhone}</p>

          <div className="text-left space-y-3">
             <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Display Name</label>
             {isEditing ? (
               <div className="flex gap-2">
                 <input type="text" placeholder="Enter name" value={userName} onChange={(e) => setUserName(e.target.value)} className="flex-1 p-3 bg-slate-50 border-2 border-black rounded-xl font-bold text-sm outline-none" />
                 <button onClick={handleSaveName} disabled={loading} className="bg-black text-white px-4 rounded-xl font-black uppercase text-xs">
                   {loading ? "..." : "Save"}
                 </button>
               </div>
             ) : (
               <div className="flex items-center justify-center bg-slate-50 border-2 border-slate-200 p-3 rounded-xl gap-3">
                   <button onClick={() => setIsEditing(true)} className="px-6 py-2 bg-white border-2 border-black rounded-lg text-[10px] font-black uppercase hover:bg-yellow-50">✎ Edit</button>
                   <button onClick={handleRemoveName} className="px-6 py-2 bg-red-50 border-2 border-red-100 text-red-600 rounded-lg text-[10px] font-black uppercase hover:bg-red-100">✕ Remove</button>
               </div>
             )}
          </div>
        </div>

        <div className="pt-4">
          <button onClick={handleLogout} className="w-full py-4 bg-red-600 text-white rounded-[2rem] border-4 border-black font-black uppercase italic text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:scale-95">
            Logout
          </button>
        </div>
      </main>
    </div>
  );
}