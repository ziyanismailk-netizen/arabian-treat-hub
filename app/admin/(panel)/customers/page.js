"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, getDocs, where, deleteDoc, doc } from "firebase/firestore";

export default function AdminCustomerPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomersWithAddress = async () => {
      const q = query(collection(db, "users"), orderBy("name", "asc"));
      const snap = await getDocs(q);
      const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // For each user, fetch their latest order for address
      const promises = users.map(async user => {
        const oq = query(collection(db, "orders"), where("customerPhone", "==", user.phone), orderBy("createdAt", "desc"));
        const osnap = await getDocs(oq);
        const orders = osnap.docs.map(d => d.data());
        const latestOrder = orders[0];
        const totalSpent = orders.reduce((sum, o) => sum + (o.totalBill || 0), 0);
        const lastOrderDate = latestOrder?.createdAt ? new Date(latestOrder.createdAt.toDate()).toLocaleDateString() : "Never";
        return {
          ...user,
          totalOrders: orders.length,
          totalSpent: totalSpent.toFixed(2),
          lastOrderDate: lastOrderDate,
          orderAddress: latestOrder?.deliveryDetails?.address || ""
        };
      });
      const usersWithAddress = await Promise.all(promises);
      setCustomers(usersWithAddress);
      setLoading(false);
    };
    fetchCustomersWithAddress();
  }, []);

  const bulkWipeAllCustomers = async () => {
    if (!confirm(`🗑️ DELETE ALL ${customers.length} CUSTOMERS? This cannot be undone!`)) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "users", d.id)));
      await Promise.all(deletePromises);
      alert("✅ All customers deleted!");
    } catch (error) {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-8 font-sans text-black">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b-2 border-emerald-100 px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-lg mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold italic uppercase tracking-tighter text-emerald-950 drop-shadow-lg">Customers</h1>
        <div className="flex items-center gap-4">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mt-1">{customers.length} Customers</p>
          {customers.length > 0 && (
            <button
              onClick={bulkWipeAllCustomers}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-black text-sm rounded-lg shadow-lg transition-all"
            >
              🗑️ WIPE ALL
            </button>
          )}
        </div>
      </div>
      {loading ? (
        <div className="text-center py-20 text-emerald-400 font-bold text-xl">Loading...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-20 text-emerald-400 font-bold text-xl">No customers found.</div>
      ) : (
        <div className="max-w-2xl mx-auto mt-8">
          {customers.map(cust => (
            <div key={cust.id} style={{marginBottom: '18px', borderBottom: '1px dashed #ccc', paddingBottom: '8px'}}>
              <div style={{fontWeight: 'bold', fontSize: '16px', color: '#222'}}>{cust.name}</div>
              <div style={{fontSize: '13px', color: '#444'}}>Phone: {cust.phone}</div>
              <div style={{fontSize: '12px', color: '#666', marginTop: '6px'}}>Orders: <span style={{fontWeight: 'bold'}}>{cust.totalOrders}</span> | Spent: <span style={{fontWeight: 'bold'}}>₹{cust.totalSpent}</span> | Last Order: <span style={{fontWeight: 'bold'}}>{cust.lastOrderDate}</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
