"use client";
import { useState, useEffect, useRef } from "react";
import QrScanner from "qr-scanner";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, addDoc, collection } from "firebase/firestore";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function DeliveryScanner() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const mapContainerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize scanner when camera is active
  useEffect(() => {
    if (!videoRef.current || !cameraActive) return;

    const initScanner = async () => {
      try {
        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            if (result && result.data) {
              fetchOrder(result.data);
              scanner.stop();
              setCameraActive(false);
            }
          },
          {
            onDecodeError: () => {},
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );

        await scanner.start();
        scannerRef.current = scanner;
      } catch (error) {
        console.log("Scanner error:", error);
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      }
    };
  }, [cameraActive]);

  // Initialize Google Map when order is loaded and has location
  useEffect(() => {
    if (!order || !mapContainerRef.current || !GOOGLE_MAPS_API_KEY) return;

    const loadMap = async () => {
      try {
        const lat = order.deliveryDetails?.latitude;
        const lng = order.deliveryDetails?.longitude;

        if (!lat || !lng) {
          console.log("No GPS coordinates available");
          return;
        }

        // Try native Capacitor map, fallback to static map
        try {
          const { GoogleMap } = await import("@capacitor-community/google-maps");
          const map = await GoogleMap.create({
            id: "delivery-map",
            element: mapContainerRef.current,
            apiKey: GOOGLE_MAPS_API_KEY,
            config: {
              center: { lat, lng },
              zoom: 17,
              mapTypeControl: false,
              fullscreenControl: false,
              streetViewControl: false,
            }
          });

          await map.addMarker({
            coordinate: { lat, lng },
            title: "Delivery Location",
            snippet: order.deliveryDetails?.area || "Drop-off Point"
          });

          setMapLoaded(true);
        } catch (e) {
          console.log("Native map unavailable, using static map");
          if (mapContainerRef.current) {
            mapContainerRef.current.style.backgroundImage = `url('https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=17&size=400x260&key=${GOOGLE_MAPS_API_KEY}&markers=color:red%7C${lat},${lng}')`;
            mapContainerRef.current.style.backgroundSize = "cover";
          }
          setMapLoaded(true);
        }
      } catch (error) {
        console.error("Map loading error:", error);
      }
    };

    loadMap();
  }, [order]);

  // FETCH ORDER
  const fetchOrder = async (orderId) => {
    if (!orderId || orderId.trim().length === 0) return;
    
    setLoading(true);
    
    try {
      const docRef = doc(db, "orders", orderId.trim());
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const orderData = { id: docSnap.id, ...docSnap.data() };
        
        // Check if already delivered
        if (orderData.status === "Delivered") {
          setStatusMsg("⚠️ Already Delivered!");
          setTimeout(() => {
            setStatusMsg("");
            setCameraActive(true);
          }, 2000);
          return;
        }
        
        setOrder(orderData);

        // Send "On the Way" notification
        await addDoc(collection(db, "notifications"), {
          customerPhone: orderData.customerPhone,
          orderId: orderData.id,
          message: `Your order #${orderData.billNo || orderData.id.slice(0, 6)} is on the way! Your delivery partner will arrive soon.`,
          status: "Sent",
          type: "On The Way",
          createdAt: new Date(),
          timestamp: new Date().toLocaleString()
        });
      } else {
        setStatusMsg("❌ Order Not Found");
        setTimeout(() => {
          setStatusMsg("");
          setCameraActive(true);
        }, 2000);
      }
    } catch (error) {
      setStatusMsg("⚠️ Error");
      setTimeout(() => setStatusMsg(""), 3000);
      console.log("Fetch error:", error);
    }
    setLoading(false);
  };

  // MARK DELIVERED
  const markDelivered = async () => {
    if (!order) return;
    if (!confirm("Mark this order as delivered?")) return;
    setLoading(true);
    try {
      // Update order status
      await updateDoc(doc(db, "orders", order.id), {
        status: "Delivered",
        deliveredAt: new Date()
      });

      // Send automatic notification to customer
      await addDoc(collection(db, "notifications"), {
        customerPhone: order.customerPhone,
        orderId: order.id,
        message: `Your order #${order.billNo || order.id.slice(0, 6)} has been delivered! Thank you, order again 😊`,
        status: "Sent",
        type: "Delivery",
        createdAt: new Date(),
        timestamp: new Date().toLocaleString()
      });

      alert("✅ Delivery Successful!");
      
      // Go back to start screen
      setOrder(null);
      setCameraActive(false);
      setStatusMsg("");
    } catch (error) {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  const openMaps = () => {
    if (!order?.deliveryDetails) return;
    
    const lat = order.deliveryDetails.latitude;
    const lng = order.deliveryDetails.longitude;
    
    // Use GPS coordinates if available, otherwise use address
    let mapsUrl;
    if (lat && lng) {
      mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
    } else {
      const fullAddress = `${order.deliveryDetails.address}, ${order.deliveryDetails.area}`;
      mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`;
    }
    
    window.open(mapsUrl, "_blank");
  };

  const callCustomer = () => {
    if (!order?.customerPhone) return;
    window.location.href = `tel:${order.customerPhone}`;
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-white flex flex-col">
      {/* APP HEADER */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-blue-500 px-6 py-3 shadow-2xl">
        <h1 className="text-lg font-black uppercase tracking-wider">📦 ATH DELIVERY</h1>
      </div>

      {/* MAIN CONTENT */}
      {!order ? (
        cameraActive ? (
          // CAMERA SCREEN
          <div className="flex-1 w-full relative bg-black flex flex-col items-center justify-center">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              autoPlay
              muted
            ></video>

            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="w-64 h-64 border-4 border-yellow-400 rounded-3xl opacity-90 shadow-2xl"></div>
            </div>

            <div className="absolute top-6 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-6 text-center rounded-b-3xl">
              <p className="text-white text-2xl font-black">📸 SCAN QR</p>
              <p className="text-yellow-200 text-sm mt-2 font-semibold">Center code in frame</p>
            </div>

            <button
              onClick={() => {
                setCameraActive(false);
                if (scannerRef.current) {
                  scannerRef.current.stop();
                  scannerRef.current.destroy();
                }
              }}
              className="absolute top-6 right-6 z-20 py-3 px-5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-2xl border-2 border-red-400"
            >
              ✕ CLOSE
            </button>
          </div>
        ) : (
          // START SCREEN
          <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <div className="w-full max-w-sm text-center space-y-10">
              {/* Icon Section */}
              <div className="space-y-4">
                <div className="relative inline-block w-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-600 rounded-full blur-3xl opacity-30 animate-pulse scale-125"></div>
                  <div className="relative text-7xl animate-bounce drop-shadow-2xl">📦</div>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-1 rounded-full shadow-2xl border-2 border-blue-300 inline-block mx-auto">
                  <p className="text-white text-xs font-black uppercase tracking-wider">Pro Scanner</p>
                </div>
              </div>
              
              {/* Title Section */}
              <div className="space-y-2">
                <h1 className="text-4xl font-black text-white uppercase tracking-tight leading-tight">
                  DELIVERY<br/>SCANNER
                </h1>
                <p className="text-gray-300 text-base font-bold">
                  Fast • Reliable • Easy
                </p>
              </div>

              {/* Start Button */}
              <button
                onClick={() => setCameraActive(true)}
                className="w-full py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-600 hover:from-blue-600 hover:via-blue-700 hover:to-blue-700 text-white font-black text-base uppercase rounded-3xl shadow-2xl transition-all active:scale-95 border-4 border-blue-300"
              >
                📸 START SCANNING
              </button>
            </div>
          </div>
        )
      ) : (
        // ORDER DETAILS
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          {/* Order Number - Hero Card */}
          <div className="relative bg-gradient-to-r from-blue-600 via-blue-600 to-blue-500 rounded-3xl p-6 text-center shadow-2xl border-4 border-blue-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            <div className="relative">
              <p className="text-xs text-blue-100 uppercase font-bold tracking-widest mb-2">Order #</p>
              <p className="text-6xl font-black text-white drop-shadow-2xl">#{order.billNo || order.id.slice(0, 8)}</p>
            </div>
          </div>

          {/* Customer & Call Button Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-600 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs text-gray-400 uppercase font-bold mb-2">Customer Phone</p>
                <p className="text-2xl font-black text-blue-400">{order.customerPhone}</p>
              </div>
              <button
                onClick={callCustomer}
                className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-full flex items-center justify-center text-2xl shadow-2xl active:scale-95 transition-all border-2 border-blue-300"
              >
                📞
              </button>
            </div>
          </div>

          {/* Address Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-600 rounded-3xl p-6 shadow-2xl">
            <div className="flex gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-2xl shadow-lg flex-shrink-0">
                📍
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 uppercase font-bold mb-2">Delivery Address</p>
                <p className="text-base font-bold text-white leading-relaxed mb-2">{order.deliveryDetails?.address}</p>
                <p className="text-lg font-black text-teal-400">{order.deliveryDetails?.area}</p>
              </div>
            </div>

            {/* Location Display */}
            {order.deliveryDetails?.latitude && order.deliveryDetails?.longitude ? (
              <div className="mb-3 rounded-2xl overflow-hidden border-2 border-blue-500 bg-gradient-to-br from-slate-800 to-slate-900 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-xl">📍</div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold">GPS LOCATION</p>
                    <p className="text-sm text-white font-bold">{order.deliveryDetails.latitude.toFixed(6)}, {order.deliveryDetails.longitude.toFixed(6)}</p>
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl text-center">
                  <p className="text-blue-400 text-xs font-bold">✓ Precise Location Locked</p>
                  <p className="text-gray-500 text-[10px] mt-1">Tap "OPEN MAPS" for navigation</p>
                </div>
              </div>
            ) : (
              <div className="mb-3 p-4 bg-yellow-900/30 border-2 border-yellow-600 rounded-2xl text-yellow-300 text-xs font-semibold text-center">
                ⚠️ Customer hasn't shared GPS location
              </div>
            )}

            <button
              onClick={openMaps}
              className="w-full mt-3 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black text-sm rounded-2xl active:scale-95 shadow-xl border-2 border-blue-400 transition-all uppercase"
            >
              🗺️ OPEN MAPS
            </button>
          </div>

          {/* Items Card */}
          {order.items && order.items.length > 0 && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-600 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-xl shadow-lg">
                  📦
                </div>
                <p className="text-sm text-gray-300 uppercase font-bold tracking-widest">Order Items</p>
              </div>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-2xl border border-slate-600 shadow-lg">
                    <span className="font-bold text-white text-base flex-1">{item.name}</span>
                    <span className="bg-gradient-to-r from-blue-600 to-blue-600 px-4 py-1 rounded-full text-sm font-black text-white shadow-xl border-2 border-blue-400 flex-shrink-0">
                      {item.qty}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total Amount Card */}
          <div className="relative bg-gradient-to-r from-blue-600 via-blue-600 to-blue-500 rounded-3xl p-6 text-center shadow-2xl border-4 border-blue-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            <div className="relative">
              <p className="text-xs text-blue-100 uppercase font-bold tracking-widest mb-2">Total Bill</p>
              <p className="text-6xl font-black text-white drop-shadow-2xl">₹{order.totalBill}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-3 pb-6">
            <button
              onClick={() => {
                setOrder(null);
                setCameraActive(true);
              }}
              className="py-3 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-black text-sm uppercase rounded-2xl active:scale-95 shadow-xl border-2 border-slate-500 transition-all"
            >
              ← SCAN NEXT
            </button>
            <button
              onClick={markDelivered}
              disabled={loading}
              className={`py-3 font-black text-sm uppercase rounded-2xl active:scale-95 shadow-xl border-2 transition-all ${
                loading 
                  ? "bg-gray-600 border-gray-500 cursor-not-allowed" 
                  : "bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white border-blue-400"
              }`}
            >
              {loading ? "⏳" : "✅ DELIVERED"}
            </button>
          </div>
        </div>
      )}

      {/* STATUS MESSAGE */}
      {statusMsg && (
        <div className="bg-slate-800 border-t-4 border-blue-500 p-4 text-center text-lg font-bold shadow-2xl">
          {statusMsg}
        </div>
      )}
    </div>
  );
}
