"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true); // <--- NEW: Tracks if we are still fetching
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const userPhone = localStorage.getItem("ath_user_phone");
    if (!userPhone) { router.push("/customer/login"); return; }

    const q = query(
      collection(db, "orders"),
      where("customerPhone", "==", userPhone),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false); // <--- STOP loading once data arrives
    }, (error) => {
      console.error("Error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []); 

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-black pb-10">
      <header className="bg-white p-4 border-b-2 border-slate-100 flex items-center gap-4 sticky top-0 z-50">
        <Link href="/customer/menu" className="p-2 bg-slate-100 rounded-full font-black">←</Link>
        <h1 className="text-lg font-[1000] uppercase italic tracking-tighter">My Orders</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6 mt-4">
        
        {/* 1. LOADING STATE (Shows this while refreshing) */}
        {loading ? (
          <div className="text-center py-20">
             <p className="text-sm font-black uppercase text-slate-400 animate-pulse">Loading Orders...</p>
          </div>
        ) : orders.length === 0 ? (
          
          /* 2. EMPTY STATE (Only shows if truly empty) */
          <div className="text-center py-20 bg-white rounded-[2.5rem] border-4 border-black">
            <p className="text-sm font-black uppercase text-slate-400 italic">No orders found yet</p>
            <Link href="/customer/menu">
              <button className="mt-4 text-emerald-600 font-black uppercase text-xs hover:underline">Start Ordering →</button>
            </Link>
          </div>
        ) : (
          
          /* 3. ORDER LIST (Shows immediately if data exists) */
          orders.map(order => (
            <div key={order.id} className="bg-white rounded-[2rem] border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-[10px] font-black uppercase text-slate-400">Order ID</h2>
                  <p className="text-xs font-black">#{order.id.slice(-6).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border-2 border-black ${
                    order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 
                    order.status === 'Preparing' ? 'bg-orange-100 text-orange-700' : 
                    'bg-yellow-400 text-black'
                  }`}>
                    {order.status}
                  </span>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">
                    {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Just now'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 border-y-2 border-slate-50 py-4 my-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs font-bold uppercase">
                    <span>{item.qty}x {item.name}</span>
                    <span>₹{item.price * item.qty}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-2 pt-2">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Payment</span>
                  <span className="text-[10px] font-black uppercase text-orange-600">COD</span>
                </div>
                <div className="text-right">
                   <span className="text-[9px] font-black text-slate-400 uppercase">Total Bill</span>
                   <p className="text-xl font-[1000] italic leading-none">₹{order.totalBill}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}