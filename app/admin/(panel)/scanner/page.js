"use client";
import { useState, useEffect } from "react";
import { QrReader } from "react-qr-reader"; 
import { db, auth } from "@/lib/firebase"; // 👈 Added auth
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth"; // 👈 Auth functions

export default function ScannerPage() {
  // 🔐 AUTH STATES
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // 📷 SCANNER STATES
  const [data, setData] = useState("No Result");
  const [manualId, setManualId] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 1️⃣ CHECK LOGIN STATUS
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2️⃣ HANDLE LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auto-reloads state via useEffect
    } catch (err) {
      setLoginError("Invalid Email or Password");
    }
  };

  // 🔍 FETCH ORDER
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
        deliveredAt: new Date(),
        deliveredBy: user.email // 👈 Record who delivered it
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
    const url = `http://googleusercontent.com/maps.google.com/search?q=${encodeURIComponent(fullAddress)}`;
    window.open(url, '_blank');
  };

  // ⏳ LOADING SCREEN
  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-100">Loading App...</div>;

  // 🔐 LOGIN SCREEN (If not logged in)
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6 text-white">
        <h1 className="text-3xl font-[1000] italic uppercase mb-2">Driver Login</h1>
        <p className="text-slate-400 mb-8 text-sm">Enter your credentials to access the scanner.</p>
        
        <form onSubmit={handleLogin} className="w-full max-w-sm flex flex-col gap-4">
          <input 
            type="email" 
            placeholder="Driver Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-4 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 font-bold outline-none focus:border-green-500"
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-4 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 font-bold outline-none focus:border-green-500"
          />
          
          {loginError && <div className="text-red-400 font-bold text-center text-sm">{loginError}</div>}
          
          <button type="submit" className="bg-green-500 text-black font-[1000] uppercase py-4 rounded-xl mt-2 shadow-lg active:scale-95 transition-transform">
            Login
          </button>
        </form>
      </div>
    );
  }

  // 📱 MAIN SCANNER UI (Logged In)
  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-black flex flex-col items-center">
      
      {/* HEADER */}
      <div className="w-full max-w-md bg-white p-4 rounded-2xl shadow-sm mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-[1000] italic uppercase">Delivery App</h1>
          <p className="text-[10px] font-bold text-slate-400">LOGGED IN: {user.email.split('@')[0]}</p>
        </div>
        <button onClick={() => signOut(auth)} className="text-[10px] font-bold text-red-500 border border-red-200 px-3 py-1 rounded-full uppercase">Logout</button>
      </div>

      {order && (
          <button onClick={resetScanner} className="bg-black text-white px-4 py-2 rounded-full text-xs font-bold uppercase mb-4 shadow-lg">
            Scan New Order
          </button>
      )}

      {/* 🔴 ERROR LOGGER */}
      {errorMsg && (
        <div className="w-full max-w-md bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error: </strong>{errorMsg}
        </div>
      )}

      {/* 📸 CAMERA SECTION */}
      {!order && (
        <div className="w-full max-w-md bg-black rounded-3xl overflow-hidden shadow-2xl relative mb-4 border-4 border-black aspect-square flex flex-col items-center justify-center">
          
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
                <div className="w-48 h-48 border-2 border-white/50 rounded-xl border-dashed animate-pulse"></div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                <span className="bg-black/60 text-white px-3 py-1 rounded-full text-xs font-bold uppercase backdrop-blur-md">Scanning...</span>
              </div>
            </div>
          ) : (
            <div className="text-center p-6">
                <div className="text-white text-4xl mb-2">📸</div>
                <button 
                  onClick={() => { setErrorMsg(""); setCameraActive(true); }}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform active:scale-95"
                >
                  TAP TO START CAMERA
                </button>
            </div>
          )}
        </div>
      )}

      {/* ⌨️ MANUAL INPUT */}
      {!order && (
        <div className="w-full max-w-md flex gap-2 mb-4">
          <input 
            type="text" 
            placeholder="Manual Bill ID" 
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            className="flex-1 p-4 bg-white border-none shadow-sm rounded-xl font-bold uppercase text-sm outline-none focus:ring-2 focus:ring-black"
          />
          <button onClick={() => fetchOrder(manualId)} className="bg-black text-white px-6 rounded-xl font-black uppercase text-sm shadow-lg active:scale-95 transition-transform">GO</button>
        </div>
      )}

      {statusMsg && <div className="p-4 bg-yellow-100 text-yellow-800 rounded-xl font-bold text-sm mb-4 uppercase text-center">{statusMsg}</div>}

      {/* 📦 ORDER DETAILS */}
      {order && (
        <div className="w-full max-w-md flex-1 flex flex-col gap-4 animate-in slide-in-from-bottom-10 duration-500">
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

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex-1">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Customer Details</h3>
             <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-xl">👤</div>
                <div>
                   <div className="font-bold text-lg">{order.customerName || "Guest"}</div>
                   <a href={`tel:${order.customerPhone}`} className="text-blue-600 font-bold text-sm underline flex items-center gap-1">📞 {order.customerPhone}</a>
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

             <div className="grid grid-cols-1 gap-3 mt-4">
                <button onClick={openMaps} className="w-full py-4 bg-blue-50 text-blue-600 rounded-2xl font-black uppercase text-sm hover:bg-blue-100">
                  🗺️ Open Maps
                </button>
                {order.status !== 'Delivered' && (
                  <button onClick={markDelivered} disabled={loading} className="w-full py-4 bg-[#16a34a] text-white rounded-2xl font-[1000] uppercase text-lg shadow-xl shadow-green-200">
                    {loading ? "Updating..." : "✅ Confirm Delivery"}
                  </button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}