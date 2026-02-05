"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore";
import { getNextBillNo } from "@/lib/billNo";
import Link from "next/link";
import { Geolocation } from "@capacitor/geolocation";

// 🔑 PASTE YOUR GOOGLE MAPS API KEY HERE
const GOOGLE_API_KEY = "AIzaSy..."; 

// 1. Rename your main logic to "AddressContent" (Internal Component)
function AddressContent() {
  const [formData, setFormData] = useState({ area: "", address: "", pincode: "", district: "Udupi", landmark: "", contactPhone: "", latitude: null, longitude: null });
  const [savedAddress, setSavedAddress] = useState(null); 
  const [useSaved, setUseSaved] = useState(true); 
  const [cart, setCart] = useState([]);
  const [showKOT, setShowKOT] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const searchParams = useSearchParams(); // <--- This caused the error
  const isOrderMode = searchParams.get("mode") === "order";
  const isLoaded = useRef(false);

  useEffect(() => {
    const init = async () => {
      const userPhone = localStorage.getItem("ath_user_phone");
      const savedCart = localStorage.getItem("ath_cart");
      
      if (!userPhone) return router.push("/customer/login");
      if (savedCart) setCart(JSON.parse(savedCart));

      try {
        const docRef = doc(db, "users", userPhone);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().lastAddress) {
          setSavedAddress(docSnap.data().lastAddress);
          setFormData(docSnap.data().lastAddress);
          setUseSaved(true);
        } else {
          const tempForm = localStorage.getItem("ath_temp_address");
          if (tempForm) {
            setFormData(JSON.parse(tempForm));
            setUseSaved(false);
          } else {
            setUseSaved(false);
            setFormData(prev => ({ ...prev, contactPhone: userPhone }));
          }
        }
      } catch (e) { console.error(e); } finally { 
        setLoading(false); 
        isLoaded.current = true;
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    if (isLoaded.current && !useSaved) {
      localStorage.setItem("ath_temp_address", JSON.stringify(formData));
    }
  }, [formData, useSaved]);

  const detectLocation = async () => {
    setDetecting(true);
    try {
      // Use Capacitor Geolocation for native app
      const coordinates = await Geolocation.getCurrentPosition();
      const { latitude, longitude } = coordinates.coords;
      
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === "OK" && data.results[0]) {
          const result = data.results[0];
          const getComponent = (type) => result.address_components.find(c => c.types.includes(type))?.long_name || "";
          
          const area = getComponent("sublocality") || getComponent("neighborhood") || getComponent("locality");
          const city = getComponent("administrative_area_level_2") || "Udupi";
          const pincode = getComponent("postal_code");
          
          setFormData(prev => ({
            ...prev,
            area: area,
            address: result.formatted_address,
            pincode: pincode,
            district: city,
            landmark: "",
            latitude: latitude,
            longitude: longitude
          }));
          alert("📍 Location pinpointed successfully!");
        } else {
          throw new Error(data.error_message || "Google Maps Error");
        }
      } catch (error) {
        console.error(error);
        alert("Could not fetch address details.");
      }
    } catch (error) {
      console.error("Geolocation error:", error);
      alert("Unable to get GPS location. Make sure location permission is enabled.");
    } finally {
      setDetecting(false);
    }
  };

  const handleMainAction = async () => {
    setIsSaving(true);
    const userPhone = localStorage.getItem("ath_user_phone");
    try {
      await setDoc(doc(db, "users", userPhone), { lastAddress: formData, phone: userPhone }, { merge: true });
      localStorage.removeItem("ath_temp_address"); 
      if (isOrderMode && cart.length > 0) { setIsSaving(false); setShowKOT(true); } 
      else { alert("Address Saved!"); setIsSaving(false); }
    } catch (e) { alert("Failed to save."); setIsSaving(false); }
  };

  const handleFinalConfirm = async () => {
    setIsPlacing(true);
    const userPhone = localStorage.getItem("ath_user_phone");
    try {
      // Get the next bill number atomically
      const billNo = await getNextBillNo();
      const docRef = await addDoc(collection(db, "orders"), {
        customerPhone: userPhone,
        deliveryPhone: formData.contactPhone,
        items: cart,
        deliveryDetails: formData,
        totalBill: cart.reduce((a, i) => a + (i.price * i.qty), 0),
        status: "Pending",
        paymentMethod: "COD",
        createdAt: serverTimestamp(),
        billNo
      });
      localStorage.removeItem("ath_cart");
      router.push("/customer/orders");
    } catch (e) {
      alert("Error placing order: " + (e && e.message ? e.message : e));
      console.error("Order placement error", e);
    } finally { setIsPlacing(false); }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-black font-sans pb-40">
      <header className="p-4 bg-white border-b flex items-center gap-4 sticky top-0 z-50">
        <Link href={isOrderMode ? "/customer/cart" : "/customer/menu"} className="p-2 bg-slate-100 rounded-full font-black">←</Link>
        <h1 className="text-sm font-black uppercase italic tracking-tighter">
          {isOrderMode ? "Delivery Details" : "Manage Address"}
        </h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 mt-6 space-y-6">
        {savedAddress && (
          <div className={`p-6 rounded-[2rem] border-4 cursor-pointer transition-all ${useSaved ? 'bg-white border-emerald-600 shadow-[8px_8px_0px_0px_#059669]' : 'bg-slate-100 border-slate-300 opacity-60'}`} onClick={() => { setUseSaved(true); setFormData(savedAddress); }}>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-emerald-700">📍 Saved Address</h2>
              {useSaved && <span className="text-xl">✅</span>}
            </div>
            <p className="text-sm font-black uppercase">{savedAddress.area}</p>
            <p className="text-xs font-bold text-slate-500 line-clamp-1">{savedAddress.address}</p>
          </div>
        )}

        <div className={`p-6 rounded-[2rem] border-4 cursor-pointer transition-all ${!useSaved ? 'bg-white border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' : 'bg-slate-100 border-slate-300 opacity-60'}`} onClick={() => { setUseSaved(false); setFormData({ area: "", address: "", pincode: "", district: "Udupi", landmark: "", contactPhone: localStorage.getItem("ath_user_phone") }); }}>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-black">➕ Add New Address</h2>
            {!useSaved && <span className="text-xl">✅</span>}
          </div>
        </div>

        {!useSaved && (
          <div className="bg-white rounded-[2.5rem] border-4 border-black p-8 shadow-sm space-y-5">
            <button 
              onClick={detectLocation}
              disabled={detecting}
              className="w-full py-4 bg-[#4285F4] text-white border-2 border-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
            >
              {detecting ? "Locating..." : "📍 Auto-Detect (Google Maps)"}
            </button>
            {formData.latitude && formData.longitude && (
              <div className="p-3 bg-green-50 border-2 border-green-500 rounded-xl text-[11px] font-bold text-green-700 flex items-center gap-2">
                <span>✅ GPS Locked</span>
                <span className="text-[9px] text-green-600">({formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)})</span>
              </div>
            )}
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pt-2">Recipient Info</h2>
            <div className="relative">
              <span className="absolute left-4 top-4 font-bold text-slate-400 text-sm">+91</span>
              <input type="tel" placeholder="Contact Number" className="w-full p-4 pl-14 bg-slate-50 border-2 border-black rounded-2xl font-bold text-sm outline-none" value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pt-4">Location Info</h2>
            <input type="text" placeholder="Area / Colony Name" className="w-full p-4 bg-slate-50 border-2 border-black rounded-2xl font-bold text-sm outline-none" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} />
            <textarea placeholder="House Address" className="w-full p-4 bg-slate-50 border-2 border-black rounded-2xl font-bold text-sm outline-none" rows="2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Pincode" className="w-full p-4 bg-slate-50 border-2 border-black rounded-2xl font-bold text-sm outline-none" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} />
              <input type="text" placeholder="District" className="w-full p-4 bg-slate-50 border-2 border-black rounded-2xl font-bold text-sm outline-none" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} />
            </div>
            <input type="text" placeholder="Landmark (Optional)" className="w-full p-4 bg-slate-50 border-2 border-black rounded-2xl font-bold text-sm outline-none" value={formData.landmark} onChange={e => setFormData({...formData, landmark: e.target.value})} />
          </div>
        )}

        <div className="fixed bottom-0 left-0 w-full bg-white p-6 border-t-4 border-black z-50">
          <button 
            disabled={!formData.area || !formData.address || isSaving}
            onClick={handleMainAction}
            className={`w-full py-4 rounded-[2rem] font-black uppercase italic text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all ${formData.area ? 'bg-black text-white active:scale-95' : 'bg-slate-200 text-slate-400'}`}
          >
            {isSaving ? "Saving..." : (isOrderMode ? "Save & Proceed →" : "Save Address")}
          </button>
        </div>
        
        {showKOT && isOrderMode && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] border-4 border-black overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-black p-4 text-center">
                <h2 className="text-white font-black uppercase italic tracking-widest text-sm">Order Summary (KOT)</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Items</h3>
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm font-black">
                      <span className="uppercase">{item.qty}x {item.name}</span>
                      <span className="italic">₹{item.price * item.qty}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-300">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deliver To</h3>
                  <p className="text-[11px] font-bold uppercase leading-tight">{formData.address}, {formData.area}</p>
                  <p className="text-[11px] font-black text-emerald-600">CALL: +91 {formData.contactPhone}</p>
                </div>
                <div className="flex justify-between items-center pt-2">
                   <span className="text-xs font-black uppercase">Total Bill (COD)</span>
                   <span className="text-2xl font-[1000] italic">₹{cart.reduce((a, i) => a + (i.price * i.qty), 0)}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button onClick={() => setShowKOT(false)} className="py-4 border-2 border-black rounded-2xl font-black uppercase text-xs hover:bg-slate-50">Edit</button>
                  <button onClick={handleFinalConfirm} disabled={isPlacing} className="py-4 bg-emerald-600 text-white border-2 border-black rounded-2xl font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none translate-y-[-2px] active:translate-y-0 transition-all">
                    {isPlacing ? "Sending..." : "Confirm & Place"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// 2. EXPORT THE PAGE WRAPPED IN SUSPENSE (This fixes the error)
export default function AddressPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold">Loading Address Form...</div>}>
      <AddressContent />
    </Suspense>
  );
}