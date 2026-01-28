"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function HelpPage() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("ath_user_phone");
    localStorage.removeItem("ath_cart");
    sessionStorage.removeItem("ath_login_splash");
    router.push("/customer/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-black pb-20">
      {/* HEADER */}
      <header className="bg-white p-4 border-b-2 border-slate-100 flex items-center gap-4 sticky top-0 z-50">
        <Link href="/customer/menu" className="p-2 bg-slate-100 rounded-full font-black">←</Link>
        <h1 className="text-lg font-[1000] uppercase italic tracking-tighter">Help & Guide</h1>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-8 mt-6">
        
        {/* SECTION 1: USER MANUAL (HOW TO ORDER) */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📖</span>
            <h2 className="text-xl font-[1000] uppercase italic tracking-tighter">How to Order</h2>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-[2rem] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex gap-4 items-start">
              <span className="bg-yellow-400 w-8 h-8 flex items-center justify-center rounded-full font-black border-2 border-black flex-shrink-0">1</span>
              <div>
                <h3 className="font-black uppercase text-sm mb-1">Select Items</h3>
                <p className="text-xs font-bold text-slate-500 leading-relaxed">Browse the menu and add your favorite dishes to the cart.</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-[2rem] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex gap-4 items-start">
              <span className="bg-emerald-400 w-8 h-8 flex items-center justify-center rounded-full font-black border-2 border-black flex-shrink-0">2</span>
              <div>
                <h3 className="font-black uppercase text-sm mb-1">Add Address</h3>
                <p className="text-xs font-bold text-slate-500 leading-relaxed">Enter your delivery details. We save them for next time!</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-[2rem] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex gap-4 items-start">
              <span className="bg-blue-400 w-8 h-8 flex items-center justify-center rounded-full font-black border-2 border-black flex-shrink-0">3</span>
              <div>
                <h3 className="font-black uppercase text-sm mb-1">Pay on Delivery</h3>
                <p className="text-xs font-bold text-slate-500 leading-relaxed">Place the order and pay via Cash or UPI when the food arrives.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: FAQ / SUPPORT */}
        <section>
          <div className="flex items-center gap-2 mb-4 pt-4 border-t-2 border-slate-200">
            <span className="text-2xl">❓</span>
            <h2 className="text-xl font-[1000] uppercase italic tracking-tighter">FAQ & Support</h2>
          </div>

          <div className="bg-white rounded-[2rem] border-4 border-black overflow-hidden divide-y-2 divide-slate-100">
            <details className="group p-4 bg-white cursor-pointer">
              <summary className="font-black uppercase text-xs flex justify-between items-center list-none">
                Where do you deliver?
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <p className="text-xs font-bold text-slate-500 mt-3 leading-relaxed">
                We currently deliver to all areas within Manipal and Udupi city limits.
              </p>
            </details>

            <details className="group p-4 bg-white cursor-pointer">
              <summary className="font-black uppercase text-xs flex justify-between items-center list-none">
                How long does delivery take?
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <p className="text-xs font-bold text-slate-500 mt-3 leading-relaxed">
                Standard delivery time is 30-45 minutes depending on traffic and kitchen load.
              </p>
            </details>

            <details className="group p-4 bg-white cursor-pointer">
              <summary className="font-black uppercase text-xs flex justify-between items-center list-none">
                Can I cancel my order?
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <p className="text-xs font-bold text-slate-500 mt-3 leading-relaxed">
                You can cancel only if the status is "Pending". Once "Preparing", orders cannot be cancelled.
              </p>
            </details>
          </div>
        </section>

        {/* CONTACT BUTTONS */}
        <div className="grid grid-cols-2 gap-4 pt-2">
           <a href="tel:+919481445093" className="flex flex-col items-center justify-center p-4 bg-[#064e3b] text-white rounded-[1.5rem] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all">
             <span className="text-2xl mb-1">📞</span>
             <span className="text-[10px] font-black uppercase tracking-widest">Call Support</span>
           </a>
           <a href="https://wa.me/918867377110" target="_blank" className="flex flex-col items-center justify-center p-4 bg-green-500 text-white rounded-[1.5rem] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all">
             <span className="text-2xl mb-1">💬</span>
             <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp Us</span>
           </a>
        </div>

        {/* LOGOUT */}
        <div className="pt-4 pb-8">
           <button onClick={handleLogout} className="w-full py-4 border-2 border-red-200 text-red-500 bg-red-50 rounded-2xl font-black uppercase text-xs hover:bg-red-100">
             Log Out from App
           </button>
        </div>

      </main>
    </div>
  );
}