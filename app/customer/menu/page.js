"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import Link from "next/link";

export default function CustomerMenu() {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // 🔒 SAFETY LOCK: Prevents overwriting storage on refresh
  const isLoaded = useRef(false);
  
  const router = useRouter();

  // 1. INITIAL LOAD (Run Once)
  useEffect(() => {
    const userPhone = localStorage.getItem("ath_user_phone");
    if (!userPhone) { router.push("/customer/login"); return; }

    // Fetch Menu
    const q = query(collection(db, "menu"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Load Cart SAFELY
    const savedCart = localStorage.getItem("ath_cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
    
    isLoaded.current = true; // Mark as loaded
    setMounted(true);

    return () => unsub();
  }, []); // <--- EMPTY ARRAY

  // 2. SAVE CART (Only runs AFTER initial load is done)
  useEffect(() => {
    if (isLoaded.current && mounted) {
      localStorage.setItem("ath_cart", JSON.stringify(cart));
    }
  }, [cart, mounted]);

  const handleNav = (path) => {
    setIsSidebarOpen(false);
    if (path !== "/customer/menu") router.push(path);
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/customer/login");
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      return existing ? prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) : [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      return existing?.qty > 1 ? prev.map(i => i.id === itemId ? { ...i, qty: i.qty - 1 } : i) : prev.filter(i => i.id !== itemId);
    });
  };

  if (!mounted) return null;

  const dynamicCategories = ["ALL", ...Array.from(new Set(items.map(i => i.category?.trim().toUpperCase())))];
  const filtered = items.filter(item => {
    const matchesCat = activeCategory === "ALL" || item.category?.toUpperCase() === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32">
      {/* SIDEBAR OVERLAY */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-[100]" onClick={() => setIsSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-white z-[101] transition-transform duration-300 transform rounded-r-[2.5rem] border-r-4 border-black overflow-y-auto no-scrollbar ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-8">
           <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" className="h-10 w-10 rounded-xl border-2 border-black" alt="ATH" />
              <span className="text-xs font-black uppercase italic tracking-tighter">ATH Hub</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="text-2xl font-black text-black">✕</button>
          </div>
          <nav className="space-y-1 text-black font-black uppercase">
            <h4 className="text-[10px] text-slate-400 tracking-widest mb-4">User Menu</h4>
            <button onClick={() => handleNav("/customer/profile")} className="w-full text-left flex items-center gap-3 py-3 text-sm border-b border-slate-50 hover:text-emerald-600">👤 Profile</button>
            <button onClick={() => handleNav("/customer/address")} className="w-full text-left flex items-center gap-3 py-3 text-sm border-b border-slate-50 hover:text-emerald-600">📍 My Address</button>
            <button onClick={() => handleNav("/customer/cart")} className="w-full text-left flex items-center gap-3 py-3 text-sm border-b border-slate-50 hover:text-emerald-600">🛒 My Cart</button>
            <button onClick={() => handleNav("/customer/orders")} className="w-full text-left flex items-center gap-3 py-3 text-sm border-b border-slate-50 hover:text-emerald-600">📦 My Orders</button>
            <button onClick={() => handleNav("/customer/settings")} className="w-full text-left flex items-center gap-3 py-3 text-sm border-b border-slate-50 hover:text-emerald-600">❓ Help & Guide</button>
            <div className="pt-6">
              <button onClick={handleLogout} className="w-full border-2 border-red-600 text-red-600 py-3 rounded-2xl font-black uppercase text-xs">Logout</button>
            </div>
          </nav>
        </div>
      </div>

      {/* STICKY HEADER */}
      <div className="sticky top-0 z-50 bg-white border-b-2 border-slate-100">
        <header className="p-3 flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-slate-100 rounded-2xl active:bg-slate-200">
             <div className="w-5 h-0.5 bg-black mb-1"></div>
             <div className="w-3 h-0.5 bg-black"></div>
          </button>
          <div className="relative flex-1">
            <input type="text" placeholder="Search dishes..." className="w-full p-2.5 pl-10 bg-slate-100 rounded-2xl border-none text-[11px] font-bold outline-none focus:ring-2 ring-yellow-400" onChange={(e) => setSearch(e.target.value)} />
            <span className="absolute left-3 top-3 text-xs">🔍</span>
          </div>
          <img src="/logo.jpg" className="h-10 w-10 rounded-2xl border" alt="Logo" />
        </header>
        <div className="flex overflow-x-auto gap-3 p-3 no-scrollbar bg-white shadow-sm">
          {dynamicCategories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${activeCategory === cat ? "bg-black text-white" : "bg-slate-100 text-slate-500"}`}>{cat}</button>
          ))}
        </div>
      </div>

      <main className="px-4 mt-4 space-y-3">
        {filtered.map(item => {
           const cartItem = cart.find(i => i.id === item.id);
           const isVeg = item.diet?.toUpperCase() === 'VEG';
           return (
             <div key={item.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-2xl gap-3">
               <div className="flex-1 space-y-1">
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border border-slate-300 flex items-center justify-center rounded-sm bg-white">
                       <div className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                    </div>
                 </div>
                 <h3 className="text-[13px] font-bold leading-tight text-slate-800 line-clamp-2">{item.name}</h3>
                 <p className="text-sm font-black text-slate-900">₹{item.price}</p>
                 <div className="mt-2">
                   {!cartItem ? (
                     <button onClick={() => addToCart(item)} className="w-full bg-yellow-400 text-black border-2 border-black px-4 py-1.5 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all">ADD +</button>
                   ) : (
                     <div className="flex items-center justify-between bg-emerald-600 text-white rounded-xl border-2 border-black overflow-hidden shadow-sm">
                       <button onClick={() => removeFromCart(item.id)} className="px-3 py-1.5 font-black hover:bg-emerald-700">−</button>
                       <span className="text-[11px] font-[1000]">{cartItem.qty}</span>
                       <button onClick={() => addToCart(item)} className="px-3 py-1.5 font-black hover:bg-emerald-700">+</button>
                     </div>
                   )}
                 </div>
               </div>
               <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden">
                 <img src={item.imageUrl || "/logo.jpg"} className="w-full h-full object-cover" onError={e => e.target.src="/logo.jpg"} />
               </div>
             </div>
           );
        })}
      </main>

      {/* FLOATING CART BUTTON */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-lg bg-[#064e3b] text-white p-4 rounded-[2.5rem] shadow-2xl flex justify-between items-center z-50 border border-white/10 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4 pl-2">
            <span className="text-xl">🛒</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{cart.reduce((a, b) => a + b.qty, 0)} Items</span>
              <span className="text-lg font-black italic">₹{cart.reduce((a, b) => a + (b.price * b.qty), 0)}</span>
            </div>
          </div>
          <button onClick={() => router.push("/customer/cart")} className="bg-yellow-400 text-black px-8 py-3 rounded-3xl font-black uppercase italic text-xs active:scale-95 transition-all">
            View Cart →
          </button>
        </div>
      )}
    </div>
  );
}