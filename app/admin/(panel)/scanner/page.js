"use client";
import { useState, useEffect } from "react";
import { QrReader } from "react-qr-reader"; 
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function ScannerPage() {
  const [data, setData] = useState("No Result");
  const [manualId, setManualId] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [showCamera, setShowCamera] = useState(true);

  // 🔍 FETCH ORDER
  const fetchOrder = async (orderId) => {
    if (!orderId) return;
    setLoading(true);
    setStatusMsg("Searching...");
    
    try {
      const docRef = doc(db, "orders", orderId.trim());
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() });
        setData(orderId);
        setStatusMsg("");
        setShowCamera(false); // Hide camera to save battery while viewing order
      } else {
        setOrder(null);
        setStatusMsg("❌ Invalid QR or Order ID");
        setShowCamera(true);
      }
    } catch (error) {
      console.error(error);
      setStatusMsg("Error fetching order.");
    }
    setLoading(false);
  };

  // 🚚 MARK DELIVERED
  const markDelivered = async () => {
    if (!order) return;
    if (!confirm("Complete this delivery?")) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: "Delivered",
        deliveredAt: new Date()
      });
      alert("✅ Delivery Successful!");
      resetScanner();
    } catch (error) {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  const resetScanner = () => {
    setOrder(null);
    setData("No Result");
    setStatusMsg("");
    setManualId("");
    setShowCamera(true);
  };

  // 🗺️ GOOGLE MAPS NAVIGATION LINK
  const openMaps = () => {
    if (!order?.deliveryDetails) return;
    const fullAddress = `${order.deliveryDetails.address}, ${order.deliveryDetails.area}`;
    // This format forces Google Maps App to open in "Directions" mode
    const url = `http://googleusercontent.com/maps.google.com/search?q=${encodeURIComponent(fullAddress)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-black flex flex-col items-center">
      
      {/* 📱 APP HEADER */}
      <div className="w-full max-w-md bg-white p-4 rounded-2xl shadow-sm mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-[1000] italic uppercase">Delivery App</h1>
          <p className="text-[10px] font-bold text-slate-400">LOGGED IN AS DRIVER</p>
        </div>
        {order && (
          <button onClick={resetScanner} className="bg-black text-white px-4 py-2 rounded-full text-xs font-bold uppercase">
            Scan New
          </button>
        )}
      </div>

      {/* 📸 CAMERA AREA */}
      {!order && showCamera && (
        <div className="w-full max-w-md bg-black rounded-3xl overflow-hidden shadow-2xl relative mb-4 border-4 border-black aspect-square">
          <QrReader
            onResult={(result, error) => {
              if (!!result && result?.text !== data) {
                fetchOrder(result?.text);
              }
            }}
            className="w-full h-full object-cover"
            constraints={{ facingMode: 'environment' }} 
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white/50 rounded-xl border-dashed animate-pulse relative">
               <div className="absolute top-0 left-0 border-t-4 border-l-4 border-green-500 w-8 h-8 rounded-tl-xl -mt-1 -ml-1"></div>
               <div className="absolute top-0 right-0 border-t-4 border-r-4 border-green-500 w-8 h-8 rounded-tr-xl -mt-1 -mr-1"></div>
               <div className="absolute bottom-0 left-0 border-b-4 border-l-4 border-green-500 w-8 h-8 rounded-bl-xl -mb-1 -ml-1"></div>
               <div className="absolute bottom-0 right-0 border-b-4 border-r-4 border-green-500 w-8 h-8 rounded-br-xl -mb-1 -mr-1"></div>
            </div>
          </div>
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="bg-black/60 text-white px-3 py-1 rounded-full text-xs font-bold uppercase backdrop-blur-md">Scanning...</span>
          </div>
        </div>
      )}

      {/* ⌨️ MANUAL INPUT (Sticky backup) */}
      {!order && (
        <div className="w-full max-w-md flex gap-2 mb-4">
          <input 
            type="text" 
            placeholder="Enter Bill ID Manually" 
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            className="flex-1 p-4 bg-white border-none shadow-sm rounded-xl font-bold uppercase text-sm outline-none focus:ring-2 focus:ring-black"
          />
          <button onClick={() => fetchOrder(manualId)} className="bg-black text-white px-6 rounded-xl font-black uppercase text-sm shadow-lg active:scale-95 transition-transform">GO</button>
        </div>
      )}

      {statusMsg && <div className="p-4 bg-red-100 text-red-600 rounded-xl font-bold text-sm mb-4 animate-pulse uppercase">{statusMsg}</div>}

      {/* 📦 ORDER DETAILS (MOBILE CARD) */}
      {order && (
        <div className="w-full max-w-md flex-1 flex flex-col gap-4 animate-in slide-in-from-bottom-10 duration-500">
          
          {/* STATUS CARD */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-center mb-2">
                <span className="text-3xl font-[1000] uppercase">#{order.billNo || order.id.slice(0,5)}</span>
                <div className="text-right">
                   <div className="text-2xl font-[1000] text-green-600">₹{order.totalBill}</div>
                   <div className="text-[10px] font-bold text-slate-400 uppercase">{order.status}</div>
                </div>
             </div>
             <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${order.status === 'Delivered' ? 'bg-green-500 w-full' : 'bg-yellow-400 w-3/4'} transition-all duration-1000`}></div>
             </div>
          </div>

          {/* CUSTOMER INFO */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex-1">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Delivery Details</h3>
             
             <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-xl">👤</div>
                <div>
                   <div className="font-bold text-lg">{order.customerName || "Guest Customer"}</div>
                   <a href={`tel:${order.customerPhone}`} className="text-blue-600 font-bold text-sm underline flex items-center gap-1">
                     📞 {order.customerPhone} (Tap to Call)
                   </a>
                </div>
             </div>

             <div className="flex gap-4 mb-6">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-xl shrink-0">📍</div>
                <div>
                   <div className="font-bold text-gray-800 leading-snug">
                     {order.deliveryDetails?.address}<br/>
                     <span className="text-slate-500">{order.deliveryDetails?.area}</span>
                   </div>
                </div>
             </div>

             {/* ACTIONS GRID */}
             <div className="grid grid-cols-1 gap-3 mt-4">
                <button 
                  onClick={openMaps} 
                  className="w-full py-4 bg-blue-50 text-blue-600 rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2 hover:bg-blue-100 active:scale-95 transition-all"
                >
                  <span>🗺️</span> Navigate (Google Maps)
                </button>

                {order.status === 'Delivered' ? (
                  <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-center">
                    ✅ Already Delivered
                  </div>
                ) : (
                  <button 
                    onClick={markDelivered} 
                    disabled={loading}
                    className="w-full py-4 bg-[#16a34a] text-white rounded-2xl font-[1000] uppercase text-lg shadow-xl shadow-green-200 active:scale-95 transition-all"
                  >
                    {loading ? "Completing..." : "✅ Mark Delivered"}
                  </button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}