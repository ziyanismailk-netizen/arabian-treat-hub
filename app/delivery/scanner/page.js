"use client";
import { useState, useEffect } from "react";
import { QrReader } from "react-qr-reader";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function DeliveryScanner() {
  // AUTH STATES
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState("");

  // SCANNER STATES
  const [data, setData] = useState("No Result");
  const [manualId, setManualId] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // CHECK LOGIN STATUS & VERIFY ROLE
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        const role = userDoc.data()?.role;
        if (role === "delivery") {
          setUser(currentUser);
          setAuthLoading(false);
        } else {
          await signOut(auth);
          setUser(null);
          setAuthLoading(false);
          setLoginError("❌ Access denied. This app is for delivery staff only.");
        }
      } else {
        setUser(null);
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // FETCH ORDER
  const fetchOrder = async (orderId) => {
    if (!orderId) return;
    if (orderId === data) return;
    setLoading(true);
    setStatusMsg("Searching...");
    setData(orderId);
    try {
      const docRef = doc(db, "orders", orderId.trim());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() });
        setStatusMsg("Order Found! ✅");
        setCameraActive(false);
      } else {
        setOrder(null);
        setStatusMsg("❌ Order Not Found");
        setTimeout(() => setData("No Result"), 2000);
      }
    } catch (error) {
      setStatusMsg("Error fetching order.");
    }
    setLoading(false);
  };

  // MARK DELIVERED
  const markDelivered = async () => {
    if (!order) return;
    if (!confirm("Complete this delivery?")) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: "Delivered",
        deliveredAt: new Date(),
        deliveredBy: user.email
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
    setCameraActive(false);
  };

  const openMaps = () => {
    if (!order?.deliveryDetails) return;
    const fullAddress = `${order.deliveryDetails.address}, ${order.deliveryDetails.area}`;
    const url = `https://maps.google.com/maps/search/${encodeURIComponent(fullAddress)}`;
    window.open(url, '_blank');
  };

  if (authLoading) return <div className="w-screen h-screen flex items-center justify-center bg-slate-100 text-lg font-bold">Loading...</div>;

  if (!user) {
    return (
      <div className="w-screen h-screen bg-slate-900 flex flex-col justify-center items-center p-6 text-white">
        <h1 className="text-4xl font-[1000] italic uppercase mb-2">🚚 Driver</h1>
        <p className="text-slate-400 mb-10 text-sm">Please login from the Delivery Login page.</p>
        <a href="/delivery/login" className="bg-green-500 text-black font-[1000] uppercase py-4 px-8 rounded-xl shadow-lg active:scale-95 transition-transform mt-4">Go to Delivery Login</a>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-slate-50 font-sans text-black flex flex-col overflow-hidden">
      {/* HEADER BAR */}
      <div className="w-full bg-green-500 text-black py-3 px-4 shadow-lg flex justify-between items-center shrink-0">
        <h1 className="text-2xl font-[1000] italic uppercase">🚚 Delivery</h1>
        <button onClick={() => signOut(auth)} className="text-sm font-bold bg-slate-800 text-white px-4 py-2 rounded-lg active:scale-95">
          Logout
        </button>
      </div>
      {/* CONTENT CONTAINER */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center p-4 pb-safe">
        {/* ERROR ALERT */}
        {errorMsg && (
          <div className="w-full bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 rounded-xl font-bold text-sm mb-4 uppercase text-center">
            ⚠️ {errorMsg}
          </div>
        )}
        {/* STATUS MESSAGE */}
        {statusMsg && (
          <div className="w-full bg-yellow-100 border-2 border-yellow-500 text-yellow-800 px-4 py-3 rounded-xl font-bold text-sm mb-4 uppercase text-center">
            ℹ️ {statusMsg}
          </div>
        )}
        {/* CAMERA SECTION - FULLSCREEN */}
        {!order && (
          <div className="w-full flex-1 bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-green-500 flex flex-col items-center justify-center mb-4 relative">
            {cameraActive ? (
              <div className="w-full h-full relative">
                <QrReader
                  key="active-scanner"
                  onResult={(result, error) => {
                    if (!!result && result?.text) {
                      fetchOrder(result?.text);
                    }
                  }}
                  className="w-full h-full object-cover"
                  constraints={{ facingMode: 'environment' }}
                  scanDelay={500}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-56 h-56 border-3 border-green-400/70 rounded-2xl border-dashed animate-pulse"></div>
                </div>
                <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
                  <span className="bg-black/70 text-green-400 px-4 py-2 rounded-full text-sm font-bold uppercase backdrop-blur-md">🔍 SCANNING...</span>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 flex flex-col items-center justify-center h-full">
                <div className="text-6xl mb-4">📸</div>
                <button 
                  onClick={() => { setErrorMsg(""); setCameraActive(true); }}
                  className="bg-green-500 hover:bg-green-600 text-black font-[1000] py-4 px-8 rounded-2xl shadow-lg transition-transform transform active:scale-95 text-lg uppercase"
                >
                  Start Camera
                </button>
              </div>
            )}
          </div>
        )}
        {/* MANUAL INPUT */}
        {!order && (
          <div className="w-full flex gap-3 mb-4">
            <input 
              type="text" 
              placeholder="Bill ID" 
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              className="flex-1 p-4 bg-white border-2 border-slate-300 shadow-md rounded-2xl font-bold uppercase text-base outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <button onClick={() => fetchOrder(manualId)} className="bg-black text-white px-6 rounded-2xl font-[1000] uppercase text-base shadow-lg active:scale-95 transition-transform">GO</button>
          </div>
        )}
        {/* ORDER DETAILS - WHEN LOADED */}
        {order && (
          <>
            <button onClick={resetScanner} className="w-full bg-slate-700 text-white px-4 py-3 rounded-2xl text-base font-bold uppercase mb-4 shadow-lg active:scale-95">
              ↺ Scan New Order
            </button>
            <div className="w-full flex flex-col gap-4">
              {/* ORDER SUMMARY CARD */}
              <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-slate-200">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-4xl font-[1000] uppercase">#{order.billNo || order.id.slice(0,5)}</span>
                  <div className="text-right">
                    <div className="text-3xl font-[1000] text-green-600">₹{order.totalBill}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase">{order.status}</div>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full ${order.status === 'Delivered' ? 'bg-green-500 w-full' : 'bg-yellow-500 w-3/4'} transition-all duration-1000`}></div>
                </div>
              </div>
              {/* CUSTOMER INFO CARD */}
              <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-slate-200">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">Customer</h3>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl shrink-0">👤</div>
                  <div>
                    <div className="font-bold text-xl">{order.customerName || "Guest"}</div>
                    <a href={`tel:${order.customerPhone}`} className="text-blue-600 font-bold text-base underline">
                      📞 {order.customerPhone}
                    </a>
                  </div>
                </div>
                {/* ADDRESS */}
                <div className="flex gap-4 mb-6">
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl shrink-0">📍</div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-800 leading-relaxed text-base">
                      {order.deliveryDetails?.address}<br/>
                      <span className="text-slate-500 text-sm">{order.deliveryDetails?.area}</span>
                    </div>
                  </div>
                </div>
                {/* ACTION BUTTONS */}
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={openMaps} className="w-full py-4 bg-blue-100 text-blue-700 rounded-2xl font-[1000] uppercase text-lg hover:bg-blue-200 active:scale-95">
                    🗺️ Open Maps
                  </button>
                  {order.status !== 'Delivered' && (
                    <button onClick={markDelivered} disabled={loading} className="w-full py-4 bg-green-500 text-white rounded-2xl font-[1000] uppercase text-lg shadow-xl shadow-green-300 hover:bg-green-600 active:scale-95 disabled:opacity-50">
                      {loading ? "⏳ Updating..." : "✅ Confirm Delivery"}
                    </button>
                  )}
                  {order.status === 'Delivered' && (
                    <div className="w-full py-4 bg-green-100 text-green-700 rounded-2xl font-[1000] uppercase text-lg text-center">
                      ✅ DELIVERED
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
