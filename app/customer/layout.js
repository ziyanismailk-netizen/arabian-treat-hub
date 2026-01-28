"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function CustomerLayout({ children }) {
  const [isShopOpen, setIsShopOpen] = useState(true); // Default to open while loading
  const [loading, setLoading] = useState(true);

  // 📡 LISTEN TO SHOP STATUS
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "store"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // If 'isOpen' is missing, assume true
        setIsShopOpen(data.isOpen !== false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    // 1. OUTER WRAPPER (Mobile: Gray Borders / Laptop: Full White)
    <div className="min-h-screen w-full bg-gray-200 md:bg-white flex flex-col py-8 md:py-0 font-sans text-black">
      
      {/* 2. APP CONTAINER */}
      <div className="w-full flex-1 bg-white shadow-none md:shadow-none overflow-hidden relative">
        
        {/* 3. LOADING SCREEN (Optional) */}
        {loading && (
          <div className="absolute inset-0 z-50 bg-white flex items-center justify-center">
            <div className="animate-pulse font-black uppercase tracking-widest text-xs text-slate-400">
              Connecting...
            </div>
          </div>
        )}

        {/* 4. SHOP CLOSED SCREEN (Blocks everything if closed) */}
        {!loading && !isShopOpen ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-10 text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">😴</span>
            </div>
            
            <div>
              <h1 className="text-3xl font-[1000] uppercase italic tracking-tighter mb-2">
                We Are Currently Closed
              </h1>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                The kitchen is closed for now. <br/>
                Please check back later or call us for details.
              </p>
            </div>

            <div className="py-3 px-6 bg-slate-100 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-400">
               Status: Offline
            </div>
          </div>
        ) : (
          // 5. NORMAL APP CONTENT (If Open)
          <div className="w-full h-full">
            {children}
          </div>
        )}

      </div>
    </div>
  );
}