"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ReviewCart() {
  const [cart, setCart] = useState([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  
  // 🔒 SAFETY LOCK: Prevents overwriting storage on refresh
  const isLoaded = useRef(false);

  useEffect(() => {
    setMounted(true);
    const userPhone = localStorage.getItem("ath_user_phone");
    if (!userPhone) { router.push("/customer/login"); return; }
    
    // 1. Load Cart Safely
    const savedCart = localStorage.getItem("ath_cart");
    if (savedCart) {
      const parsed = JSON.parse(savedCart);
      if (parsed.length === 0) router.push("/customer/menu");
      setCart(parsed);
    } else {
      router.push("/customer/menu");
    }
    
    isLoaded.current = true; // Unlock saving
  }, [router]);

  // 2. Save Cart (Only if loaded)
  useEffect(() => {
    if (isLoaded.current && mounted) {
      localStorage.setItem("ath_cart", JSON.stringify(cart));
    }
  }, [cart, mounted]);

  const updateQty = (id, delta) => {
    const newCart = cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(item => item.qty > 0);
    
    setCart(newCart);
    if (newCart.length === 0) router.push("/customer/menu");
  };

  const itemTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white font-sans pb-32 text-black">
      <header className="p-4 border-b flex items-center gap-4 sticky top-0 bg-white z-50">
        <Link href="/customer/menu" className="p-2 bg-slate-100 rounded-full font-black">←</Link>
        <h1 className="text-sm font-black uppercase italic tracking-tighter">Review Order</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {cart.map(item => (
          <div key={item.id} className="flex justify-between items-center py-2">
            <div className="flex gap-4 items-center">
              <img src={item.imageUrl || "/logo.jpg"} className="w-16 h-16 rounded-2xl object-cover border" onError={(e)=>e.target.src="/logo.jpg"} />
              <div>
                <h3 className="text-xs font-black uppercase">{item.name}</h3>
                <p className="text-xs font-bold text-emerald-600">₹{item.price}</p>
              </div>
            </div>
            <div className="flex items-center border-2 border-black rounded-xl overflow-hidden bg-white shadow-sm">
              <button onClick={() => updateQty(item.id, -1)} className="px-3 py-1.5 font-black hover:bg-slate-50">−</button>
              <span className="px-3 text-[11px] font-black">{item.qty}</span>
              <button onClick={() => updateQty(item.id, 1)} className="px-3 py-1.5 font-black hover:bg-slate-50">+</button>
            </div>
          </div>
        ))}

        <div className="pt-6 border-t-2 border-slate-100">
          <div className="flex justify-between text-lg font-[1000] italic uppercase">
            <span>Subtotal</span>
            <span>₹{itemTotal}</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase">Delivery charges calculated next step</p>
        </div>

        <div className="fixed bottom-0 left-0 w-full bg-white p-6 border-t-4 border-black z-50">
          <button 
            onClick={() => router.push("/customer/address?mode=order")} 
            className="w-full py-4 bg-black text-white rounded-[2rem] font-black uppercase italic text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all"
          >
            Proceed to Delivery →
          </button>
        </div>
      </main>
    </div>
  );
}