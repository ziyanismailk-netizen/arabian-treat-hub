"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, getDocs } from "firebase/firestore";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const deleteNotification = async (id) => {
    if (!confirm("Delete this notification?")) return;
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const bulkWipeNotifications = async () => {
    if (!confirm(`Delete ALL ${notifications.length} notifications? This cannot be undone!`)) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "notifications"));
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "notifications", d.id)));
      await Promise.all(deletePromises);
      alert("✅ All notifications deleted!");
    } catch (error) {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-8 font-sans text-black">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b-2 border-emerald-100 px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-lg mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold italic uppercase tracking-tighter text-emerald-950 drop-shadow-lg">Notifications</h1>
        <div className="flex items-center gap-4">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">{notifications.length} Total</p>
          {notifications.length > 0 && (
            <button
              onClick={bulkWipeNotifications}
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
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-emerald-400 font-bold text-xl">No notifications sent yet.</div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-4">
          {notifications.map(notif => (
            <div key={notif.id} className="bg-white border-2 border-emerald-200 rounded-2xl p-6 shadow-lg flex justify-between items-start">
              <div className="flex-1">
                <div className="flex gap-3 mb-2">
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded">📱 {notif.customerPhone}</span>
                  <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded">{notif.status}</span>
                  {notif.type && <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded">{notif.type}</span>}
                </div>
                <p className="text-sm text-emerald-900 font-medium mb-2">{notif.message}</p>
                <p className="text-xs text-emerald-600">{notif.timestamp || notif.createdAt?.toDate?.().toLocaleString()}</p>
                {notif.orderId && <p className="text-xs text-blue-600 mt-1">Order: {notif.orderId}</p>}
              </div>
              <button 
                onClick={() => deleteNotification(notif.id)} 
                className="text-red-600 font-black hover:text-red-800 transition-colors"
              >
                ❌
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
