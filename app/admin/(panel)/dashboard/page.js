
"use client";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, limit, doc } from "firebase/firestore";

export default function DashboardPage() {
  const [stats, setStats] = useState({ revenue: 0, orders: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [businessDate, setBusinessDate] = useState("Loading...");

  useEffect(() => {
    // 1. Get Locked Date from Settings
    const unsub = onSnapshot(doc(db, "settings", "store"), (docSnap) => {
      if (docSnap.exists()) {
        setBusinessDate(docSnap.data().businessDate || new Date().toLocaleDateString('en-CA'));
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Listen to the last 100 orders to ensure we catch all active ones
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 🟢 STRICT WHITELISTING (No guessing)

      // 1. REVENUE CALCULATION
      // Only count money for orders that are confirmed and in progress or done.
      // STRICTLY EXCLUDES: Pending, Cancelled, History, Archived
      const revenueOrders = allOrders.filter(o => 
        ['Accepted', 'Preparing', 'Ready', 'Out_for_Delivery', 'Delivered'].includes(o.status)
      );

      // 2. ACTIVE KITCHEN COUNT
      // Only count orders that need ACTUAL ATTENTION right now.
      // STRICTLY EXCLUDES: Delivered (Job done), Cancelled, History, Archived
      const activeKitchenOrders = allOrders.filter(o => 
        ['Pending', 'Accepted', 'Preparing', 'Ready', 'Out_for_Delivery'].includes(o.status)
      );

      const totalRevenue = revenueOrders.reduce((sum, order) => sum + (Number(order.totalBill) || 0), 0);
      
      setStats({ 
        revenue: totalRevenue, 
        orders: activeKitchenOrders.length // This will now show 0 if everything is History/Archived
      });

      // 3. Activity Log (Shows everything for audit purposes)
      setRecentOrders(allOrders.slice(0, 5));
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full font-sans text-black min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 py-8 px-2 md:px-8">
      {/* HEADER */}
      <div className="relative mb-12 flex flex-col items-center justify-center">
        <div className="absolute -z-10 top-0 left-1/2 -translate-x-1/2 w-[90vw] h-40 bg-emerald-100 rounded-3xl blur-2xl opacity-60"></div>
        <h1 className="text-5xl font-extrabold italic uppercase tracking-tighter text-emerald-950 drop-shadow-lg">Admin Dashboard</h1>
        <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mt-2">
          Shift Date: <span className="text-black bg-yellow-200 px-2 py-1 rounded font-extrabold">{businessDate}</span> <span className="ml-2 text-emerald-400">(Timezone Locked)</span>
        </p>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* REVENUE */}
        <div className="bg-gradient-to-br from-emerald-400 to-emerald-700 text-white p-10 rounded-3xl shadow-2xl flex flex-col items-start relative overflow-hidden">
          <div className="absolute right-4 top-4 opacity-20 text-8xl select-none">₹</div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-90 mb-2">Live Revenue</h3>
          <div className="text-6xl font-extrabold tracking-tighter drop-shadow">₹{stats.revenue.toLocaleString()}</div>
        </div>
        {/* ACTIVE ORDERS */}
        <div className="bg-gradient-to-br from-black via-emerald-900 to-emerald-700 text-white p-10 rounded-3xl shadow-2xl flex flex-col items-start relative overflow-hidden">
          <div className="absolute right-4 top-4 opacity-10 text-8xl select-none">🍳</div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-90 mb-2">Active Kitchen Orders</h3>
          <div className="text-6xl font-extrabold tracking-tighter drop-shadow">{stats.orders}</div>
          <p className="text-[11px] text-emerald-200 font-bold mt-2 uppercase">Pending • Preparing • Out for Delivery</p>
        </div>
      </div>

      {/* SALES TREND MINI CHART */}
      <SalesTrendChart allOrders={recentOrders} />
    </div>
  );
}

// --- Sales Trend Mini Chart Component ---
function SalesTrendChart({ allOrders }) {
  // Group orders by hour (today) for a simple trend
  const now = new Date();
  const today = now.toLocaleDateString("en-CA");
  const hours = Array.from({ length: 13 }, (_, i) => i); // 0 (12am) to 12 (12pm)
  const hourlyCounts = hours.map((h) => 0);

  (allOrders || []).forEach((order) => {
    if (!order.createdAt || !order.createdAt.seconds) return;
    const d = new Date(order.createdAt.seconds * 1000);
    if (d.toLocaleDateString("en-CA") === today) {
      const hour = d.getHours();
      const idx = hours.indexOf(hour);
      if (idx !== -1) hourlyCounts[idx]++;
    }
  });

  // SVG chart dimensions
  const w = 320, h = 100, pad = 30;
  const maxY = Math.max(2, ...hourlyCounts);
  const points = hourlyCounts.map((c, i) => {
    const x = pad + ((w - 2 * pad) * i) / (hours.length - 1);
    const y = h - pad - ((h - 2 * pad) * c) / maxY;
    return [x, y];
  });
  const polyline = points.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <div className="bg-white/90 border-2 border-emerald-100 rounded-3xl p-8 shadow-lg mt-8">
      <h3 className="text-lg font-extrabold uppercase tracking-widest mb-8 border-b pb-4 text-emerald-900 flex items-center gap-2">
        <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8"/></svg>
        Sales Trend (Today)
      </h3>
      <div className="flex flex-col items-center">
        <svg width={w} height={h} className="block">
          {/* Axes */}
          <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#d1fae5" strokeWidth="2" />
          <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#d1fae5" strokeWidth="2" />
          {/* Polyline */}
          <polyline fill="none" stroke="#059669" strokeWidth="4" points={polyline} />
          {/* Dots */}
          {points.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="5" fill="#10b981" />
          ))}
        </svg>
        <div className="flex justify-between w-full mt-2 text-xs text-emerald-700 font-bold">
          {hours.map((h, i) => (
            <span key={h} className="w-8 text-center">{h === 0 ? '12a' : h < 12 ? h : '12p'}</span>
          ))}
        </div>
        <div className="text-xs text-emerald-400 font-semibold mt-2">Orders per hour (12am–12pm)</div>
      </div>
    </div>
  );
}