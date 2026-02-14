"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomerLogin() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      alert("Enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);
    
    try {
      const { sendOTP } = await import("@/lib/otp");
      await sendOTP(phone);
      setStep("otp");
      setCountdown(30);
    } catch (err) {
      console.error("OTP Error:", err);
      alert("Failed to send OTP: " + (err.message || String(err)));
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      alert("Enter valid 6-digit OTP");
      return;
    }
    setLoading(true);
    const fullPhone = "+91" + phone;
    
    try {
      const { verifyOTP } = await import("@/lib/otp");
      const firestoreModule = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      
      await verifyOTP(phone, otp);
      
      // Save user to Firestore
      await firestoreModule.setDoc(
        firestoreModule.doc(db, "users", fullPhone),
        {
          phone: fullPhone,
          lastLogin: firestoreModule.serverTimestamp(),
          createdAt: firestoreModule.serverTimestamp()
        },
        { merge: true }
      );

      localStorage.setItem("ath_user_phone", fullPhone);
      router.push("/customer/menu");
    } catch (err) {
      console.error("Verify Error:", err);
      alert("Verification failed: " + (err.message || String(err)));
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const { resendOTP } = await import("@/lib/otp");
      await resendOTP(phone);
      setCountdown(30);
    } catch (err) {
      alert("Failed to resend: " + (err.message || String(err)));
    }
    setLoading(false);
  };

  if (!mounted) return null;

  // SPLASH SCREEN
  if (showSplash) {
    return (
      <div className="min-h-screen bg-[#064e3b] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] bg-emerald-600/20 rounded-full" />
        <div className="absolute bottom-[-150px] left-[-100px] w-[400px] h-[400px] bg-yellow-400/10 rounded-full" />
        
        <div className="absolute top-20 left-8 text-4xl animate-bounce" style={{animationDelay: '0s'}}>🍗</div>
        <div className="absolute top-32 right-10 text-3xl animate-bounce" style={{animationDelay: '0.2s'}}>🍛</div>
        <div className="absolute bottom-40 left-12 text-3xl animate-bounce" style={{animationDelay: '0.4s'}}>🥘</div>
        <div className="absolute bottom-32 right-8 text-4xl animate-bounce" style={{animationDelay: '0.6s'}}>🧆</div>
        
        <div className="relative z-10 text-center">
          <div className="w-32 h-32 bg-white rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-2xl border-4 border-yellow-400 animate-pulse">
            <img src="/logo.jpg" alt="ATH" className="w-24 h-24 rounded-xl object-cover" onError={(e) => e.target.outerHTML = '<span class="text-6xl">🍽️</span>'} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Arabian<span className="text-yellow-400">Treat</span>Hub
          </h1>
          <p className="text-emerald-300 text-sm font-bold mt-3 tracking-widest uppercase">Authentic Flavors</p>
          
          <div className="flex justify-center gap-2 mt-8">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{animationDelay: '0s'}} />
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}} />
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}} />
          </div>
        </div>
      </div>
    );
  }

  // LOGIN FORM
  return (
    <div className="min-h-screen bg-[#064e3b] flex flex-col relative overflow-hidden">
      <div className="absolute top-[-50px] right-[-50px] w-[200px] h-[200px] bg-emerald-600/30 rounded-full blur-xl" />
      <div className="absolute top-40 left-[-80px] w-[150px] h-[150px] bg-yellow-400/20 rounded-full blur-lg" />
      
      {/* Header */}
      <div className="relative z-10 pt-12 pb-8 px-6 text-center">
        <div className="w-20 h-20 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl border-2 border-yellow-400">
          <img src="/logo.jpg" alt="ATH" className="w-16 h-16 rounded-xl object-cover" onError={(e) => e.target.outerHTML = '<span class="text-3xl">🍽️</span>'} />
        </div>
        <h1 className="text-2xl font-black text-white">
          {step === "phone" ? "Welcome!" : "Verify OTP"}
        </h1>
        <p className="text-emerald-300/80 text-sm font-medium mt-1">
          {step === "phone" ? "Sign in to order delicious food" : `Code sent to +91 ${phone}`}
        </p>
      </div>

      {/* Form card */}
      <div className="flex-1 bg-white rounded-t-[2.5rem] px-6 pt-8 pb-6 relative z-10">
        <div className="absolute top-4 right-6 text-2xl opacity-20">🍛</div>
        <div className="absolute top-4 left-6 text-2xl opacity-20">🧆</div>
        
        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-400 mb-2 block flex items-center gap-2">
                <span>📱</span> MOBILE NUMBER
              </label>
              <div className="flex items-center bg-slate-50 border-2 border-slate-200 rounded-2xl overflow-hidden focus-within:border-emerald-500 focus-within:bg-white transition-all">
                <span className="px-4 py-4 text-sm font-black text-emerald-700 border-r border-slate-200 bg-emerald-50">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="Enter your number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 px-4 py-4 text-lg font-bold outline-none bg-transparent"
                  autoFocus
                />
                {phone.length === 10 && <span className="pr-4 text-emerald-500">✓</span>}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              className="w-full py-4 bg-[#064e3b] text-white rounded-2xl font-black uppercase text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Sending OTP...
                </>
              ) : (
                <>Get OTP <span className="text-yellow-400">→</span></>
              )}
            </button>

            {/* Features */}
            <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-100">
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-50 rounded-xl mx-auto mb-2 flex items-center justify-center text-xl">🚚</div>
                <p className="text-[10px] font-bold text-slate-400">Fast Delivery</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl mx-auto mb-2 flex items-center justify-center text-xl">🍽️</div>
                <p className="text-[10px] font-bold text-slate-400">Fresh Food</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-50 rounded-xl mx-auto mb-2 flex items-center justify-center text-xl">💰</div>
                <p className="text-[10px] font-bold text-slate-400">Best Prices</p>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <button type="button" onClick={() => { setStep("phone"); setOtp(""); }} className="flex items-center gap-2 text-emerald-600 text-xs font-bold mb-2">
              <span>←</span> Change Number
            </button>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-2 block flex items-center gap-2">
                <span>🔐</span> VERIFICATION CODE
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="• • • • • •"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-5 text-center text-3xl font-black tracking-[0.5em] bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white transition-all"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-4 bg-[#064e3b] text-white rounded-2xl font-black uppercase text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Verifying...
                </>
              ) : (
                <>Verify & Continue <span className="text-yellow-400">→</span></>
              )}
            </button>

            <div className="text-center pt-4">
              {countdown > 0 ? (
                <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full">
                  <span className="text-xs text-slate-500 font-bold">Resend in</span>
                  <span className="text-sm font-black text-emerald-600">{countdown}s</span>
                </div>
              ) : (
                <button type="button" onClick={handleResendOtp} disabled={loading} className="text-emerald-600 text-sm font-black flex items-center gap-2 mx-auto disabled:opacity-50">
                  <span>🔄</span> Resend OTP
                </button>
              )}
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            By continuing, you agree to our Terms & Privacy Policy
          </p>
          <p className="text-[10px] text-slate-300 font-bold mt-2">Made with ❤️ in Udupi</p>
        </div>
      </div>
    </div>
  );
}