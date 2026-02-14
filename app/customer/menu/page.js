"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function CustomerMenu() {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const isLoaded = useRef(false);
  const router = useRouter();

  // Initialize on mount
  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Set a 3-second timeout to show loading state
      const loadTimeout = setTimeout(() => {
        setLoading(false);
      }, 3000);

      // Load menu items from Firebase
      const firebaseModule = await import("@/lib/firebase");
      const firestoreModule = await import("firebase/firestore");
      const { collection, onSnapshot, query, orderBy } = firestoreModule;
      
      const q = query(collection(firebaseModule.db, "menu"), orderBy("name", "asc"));
      const unsub = onSnapshot(q, (snapshot) => {
        clearTimeout(loadTimeout);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setItems(data);
        setLoading(false);
      }, (error) => {
        console.error("Firebase error:", error);
        clearTimeout(loadTimeout);
        setLoading(false);
      });

      // Load cart from localStorage
      const savedCart = localStorage.getItem("ath_cart");
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) {
          console.error("Error parsing cart:", e);
        }
      }
      
      isLoaded.current = true;
      return () => {
        clearTimeout(loadTimeout);
        unsub();
      };
    } catch (err) {
      console.error("Error loading data:", err);
      setLoading(false);
    }
  };

  // Save cart to localStorage
  useEffect(() => {
    if (isLoaded.current && mounted) {
      localStorage.setItem("ath_cart", JSON.stringify(cart));
    }
  }, [cart, mounted]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      return existing 
        ? prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) 
        : [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      return existing?.qty > 1 
        ? prev.map(i => i.id === itemId ? { ...i, qty: i.qty - 1 } : i) 
        : prev.filter(i => i.id !== itemId);
    });
  };

  const handleNav = (path) => {
    setIsSidebarOpen(false);
    if (path !== "/customer/menu") router.push(path);
  };

  // Sidebar Component
  const Sidebar = () => (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => setIsSidebarOpen(false)} />
      <div className="absolute left-0 top-0 h-full w-72 bg-gradient-to-br from-emerald-100 via-white to-emerald-50 shadow-2xl rounded-r-3xl border-r-4 border-emerald-700" style={{maxWidth:'80vw'}}>
        <div className="flex flex-col h-full p-8">
          <div className="mb-8 flex items-center gap-3">
            <img src="/logo.jpg" className="h-10 w-10 rounded-xl border-2 border-emerald-700" alt="ATH" />
            <span className="text-lg font-black uppercase italic tracking-tight text-emerald-900">ATH Hub</span>
          </div>
          <nav className="flex-1 space-y-2">
            <button onClick={() => handleNav("/customer/profile")} className="w-full text-left px-4 py-3 hover:bg-emerald-200 rounded-xl text-sm font-bold">👤 Profile</button>
            <button onClick={() => handleNav("/customer/orders")} className="w-full text-left px-4 py-3 hover:bg-emerald-200 rounded-xl text-sm font-bold">📦 Orders</button>
            <button onClick={() => handleNav("/customer/address")} className="w-full text-left px-4 py-3 hover:bg-emerald-200 rounded-xl text-sm font-bold">📍 Address</button>
          </nav>
          <button onClick={() => { localStorage.clear(); router.push("/customer/login"); }} className="w-full bg-red-500 text-white py-2 rounded-lg font-bold text-sm">Logout</button>
        </div>
        <button onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 text-emerald-700 text-2xl">×</button>
      </div>
    </div>
  );

  const dynamicCategories = ["ALL", ...Array.from(new Set(items.map(i => i.category?.trim().toUpperCase()).filter(Boolean)))];
  const filtered = items.filter(item => {
    const matchesCat = activeCategory === "ALL" || item.category?.toUpperCase() === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 font-sans pb-32 relative">
      {isSidebarOpen && <Sidebar />}
      
      {/* STICKY HEADER */}
      <div className="sticky top-0 z-50 bg-white border-b-2 border-emerald-100">
        <header className="p-3 flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-emerald-100 rounded-2xl active:bg-emerald-200">
            <span className="text-2xl">☰</span>
          </button>
          <div className="relative flex-1">
            <input type="text" placeholder="Search dishes..." className="w-full p-2.5 pl-10 bg-emerald-100 rounded-2xl border-none text-[11px] font-bold outline-none focus:ring-2 ring-yellow-400" onChange={(e) => setSearch(e.target.value)} />
            <span className="absolute left-3 top-3 text-xs">🔍</span>
          </div>
          <img src="/logo.jpg" className="h-10 w-10 rounded-2xl border" alt="Logo" />
        </header>
        <div className="flex overflow-x-auto gap-3 p-3 no-scrollbar bg-white shadow-sm">
          {dynamicCategories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${activeCategory === cat ? "bg-black text-white" : "bg-emerald-100 text-emerald-500"}`}>{cat}</button>
          ))}
        </div>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse font-black text-emerald-600">Loading menu...</div>
        </div>
      )}

      {/* MENU ITEMS */}
      <main className="px-4 mt-4 space-y-3">
        {filtered.length === 0 && !loading && (
          <div className="text-center py-8 text-slate-500 font-bold">No items found</div>
        )}
        
        {filtered.map(item => {
          const cartItem = cart.find(i => i.id === item.id);
          const isVeg = item.diet?.toUpperCase() === 'VEG';
          return (
            <div key={item.id} className="flex justify-between items-center p-3 bg-white border border-emerald-200 rounded-2xl gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-emerald-300 flex items-center justify-center rounded-sm bg-white">
                    <div className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                  </div>
                </div>
                <h3 className="text-[13px] font-bold leading-tight text-emerald-800 line-clamp-2">{item.name}</h3>
                <p className="text-sm font-black text-emerald-900">₹{item.price}</p>
                <div className="mt-2">
                  {!cartItem ? (
                    <button onClick={() => addToCart(item)} className="w-full bg-yellow-400 text-black border-2 border-emerald-700 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all">ADD +</button>
                  ) : (
                    <div className="flex items-center justify-between bg-emerald-600 text-white rounded-xl border-2 border-emerald-700 overflow-hidden shadow-sm">
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-lg bg-[#064e3b] text-white p-4 rounded-[2.5rem] shadow-2xl flex justify-between items-center z-50 border border-white/10">
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