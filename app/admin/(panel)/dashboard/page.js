"use client";
import { useState, useEffect } from "react";
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
    <div className="w-full font-sans text-black">
      <div className="mb-8">
        <h1 className="text-4xl font-[1000] italic uppercase tracking-tighter">Daily Overview</h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
          Shift Date: <span className="text-black bg-yellow-200 px-1 rounded">{businessDate}</span> (Timezone Locked)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* REVENUE */}
        <div className="bg-[#16a34a] text-white p-8 rounded-2xl shadow-xl">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-80 mb-2">Live Revenue</h3>
          <div className="text-6xl font-[1000] tracking-tighter">₹{stats.revenue.toLocaleString()}</div>
        </div>
        
        {/* ACTIVE ORDERS */}
        <div className="bg-black text-white p-8 rounded-2xl shadow-xl">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-80 mb-2">Active Kitchen Orders</h3>
          <div className="text-6xl font-[1000] tracking-tighter">{stats.orders}</div>
          <p className="text-[10px] text-gray-500 font-bold mt-2 uppercase">Pending • Preparing • Out for Delivery</p>
        </div>
      </div>

      {/* ACTIVITY LOG */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-widest mb-6 border-b pb-4">Latest Activity</h3>
        <div className="space-y-4">
          {recentOrders.map((order) => (
            <div key={order.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
              <div>
                <div className="font-[1000] text-lg uppercase">#{order.billNo || order.id.slice(0,5)}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                   {/* Handle legacy or missing timestamps gracefully */}
                   {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString() : "Time N/A"}
                </div>
              </div>
              <div className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                order.status === 'Pending' ? 'bg-red-100 text-red-600 animate-pulse' :
                order.status === 'History' || order.status === 'Archived' ? 'bg-slate-200 text-slate-500' :
                'bg-green-100 text-green-600'
              }`}>
                {order.status}
              </div>
              <div className="text-right font-[1000] text-xl">₹{order.totalBill}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}