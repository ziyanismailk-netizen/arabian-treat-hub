"use client";
import { useState, useEffect } from "react";

export default function CustomerLayout({ children }) {
  const [isShopOpen, setIsShopOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadShopStatus = async () => {
      try {
        const firebaseModule = await import("@/lib/firebase");
        const firestoreModule = await import("firebase/firestore");
        const { doc, onSnapshot } = firestoreModule;

        // Timeout in 2s
        const timeout = setTimeout(() => {
          setLoading(false);
        }, 2000);

        const unsub = onSnapshot(doc(firebaseModule.db, "settings", "store"), (docSnap) => {
          clearTimeout(timeout);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setIsShopOpen(data.isOpen !== false);
          }
          setLoading(false);
        }, (error) => {
          console.error("Firebase error:", error);
          clearTimeout(timeout);
          setLoading(false);
        });

        return () => {
          clearTimeout(timeout);
          unsub();
        };
      } catch (err) {
        console.error("Error loading shop status:", err);
        setLoading(false);
      }
    };

    loadShopStatus();
  }, []);

  return (
    <div className="min-h-screen w-full bg-white flex flex-col font-sans text-black">
      <div className="w-full flex-1 bg-white overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 z-50 bg-white flex items-center justify-center">
            <div className="animate-pulse font-black uppercase tracking-widest text-xs text-slate-400">
              Loading...
            </div>
          </div>
        )}
        {!loading && children}
      </div>
    </div>
  );
}