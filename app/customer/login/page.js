"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomerLogin() {
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [step, setStep] = useState("phone"); 
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // FORCE SPLASH TO APPEAR
    const hasSeenSplash = sessionStorage.getItem("ath_login_splash");
    if (!hasSeenSplash) {
      setShowSplash(true);
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem("ath_login_splash", "true");
      }, 2500); 
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (phone.length === 10) setStep("otp");
    else alert("Enter a valid 10-digit number");
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    // Verification logic
    if (otp === "123456") { 
      localStorage.setItem("ath_user_phone", phone);
      router.push("/customer/menu"); 
    } else {
      alert("Invalid OTP. Try 123456");
    }
  };

  if (!mounted) return null;

  if (showSplash) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#064e3b] to-black p-6 overflow-hidden fixed inset-0 z-[200]">
        <style>{`
          @keyframes slideGlow {
            0% { transform: translateX(-150%); }
            100% { transform: translateX(250%); }
          }
          .animate-loading { animation: slideGlow 2.5s infinite ease-in-out; }
        `}</style>
        <div className="relative flex justify-center items-center">
          <div className="absolute w-48 h-48 bg-yellow-400/10 rounded-[3rem] blur-3xl animate-pulse"></div>
          <img src="/logo.jpg" className="relative w-40 h-40 rounded-[2.5rem] border-4 border-black shadow-2xl z-10" alt="Logo" />
        </div>
        <div className="mt-10 text-center flex flex-col items-center text-white">
          <h1 className="text-2xl font-black uppercase italic tracking-[0.2em]">
            Arabian <span className="text-yellow-400">Treat</span> Hub
          </h1>
          <div className="mt-8 w-64 h-3 bg-white/10 rounded-full overflow-hidden border-2 border-white/5 relative">
            <div className="h-full w-2/5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full animate-loading shadow-[0_0_25px_#facc15]"></div>
          </div>
          <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.4em] mt-6 opacity-60">Fetching Flavours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-black font-sans">
      <div className="w-full max-w-md bg-white border-4 border-black rounded-[2.5rem] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="text-center mb-8">
          <img src="/logo.jpg" className="w-20 h-20 rounded-2xl border-2 border-black mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-[#064e3b]">
            {step === "phone" ? "Welcome" : "Verify Phone"}
          </h1>
        </div>

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="relative">
              <span className="absolute left-4 top-4 font-bold text-slate-400 text-sm">+91</span>
              <input type="tel" placeholder="PHONE NUMBER" maxLength="10" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-4 pl-14 bg-slate-100 rounded-2xl border-none font-bold text-sm outline-none focus:ring-4 ring-yellow-400" required />
            </div>
            <button type="submit" className="w-full bg-[#064e3b] text-white py-4 rounded-2xl font-black uppercase italic text-sm shadow-lg active:scale-95 transition-all">Send OTP →</button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <input type="text" placeholder="ENTER OTP" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full p-4 bg-slate-100 rounded-2xl border-none font-bold text-sm text-center tracking-[0.5em] outline-none focus:ring-4 ring-yellow-400" required />
            <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase italic text-sm shadow-lg active:scale-95 transition-all">Verify & Enter →</button>
          </form>
        )}
      </div>
    </div>
  );
}