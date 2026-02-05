"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithPhoneNumber, signOut, RecaptchaVerifier } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function CustomerLogin() {
  const router = useRouter();

  // TEMP: Direct login for testing
  const handleDirectLogin = () => {
    // Simulate a test user login (set token and phone in localStorage)
    const testPhone = "+911234567890";
    const fakeToken = "test-token-123";
    const key = `ath_customer_token_${testPhone}`;
    localStorage.setItem(key, JSON.stringify({ token: fakeToken, phone: testPhone, ts: Date.now() }));
    localStorage.setItem("ath_user_phone", testPhone); // Required for menu page
    let allCustomers = JSON.parse(localStorage.getItem("ath_customer_list") || "[]");
    if (!allCustomers.includes(testPhone)) {
      allCustomers.push(testPhone);
      localStorage.setItem("ath_customer_list", JSON.stringify(allCustomers));
    }
    router.push("/customer/menu");
  };
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [step, setStep] = useState("phone"); 
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);

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

  // Custom multi-user login: get ID token, store, sign out
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (phone.length !== 10) {
      alert("Enter a valid 10-digit number");
      return;
    }
    setLoading(true);
    try {
      // Only initialize RecaptchaVerifier once
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', { size: 'invisible' }, auth);
        await window.recaptchaVerifier.render();
      }
      const fullPhone = "+91" + phone;
      const confirmationResult = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier);
      setConfirmation(confirmationResult);
      setStep("otp");
    } catch (err) {
      alert("Failed to send OTP: " + err.message);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!confirmation) {
      alert("No OTP session. Please retry.");
      return;
    }
    setLoading(true);
    try {
      const result = await confirmation.confirm(otp);
      const user = result.user;
      const idToken = await user.getIdToken();
      // Store token and user info in localStorage under unique key for multi-customer
      const key = `ath_customer_token_+91${phone}`;
      localStorage.setItem(key, JSON.stringify({ token: idToken, phone: "+91" + phone, ts: Date.now() }));
      // Optionally, keep a list of all logged-in customers
      let allCustomers = JSON.parse(localStorage.getItem("ath_customer_list") || "[]");
      if (!allCustomers.includes("+91" + phone)) {
        allCustomers.push("+91" + phone);
        localStorage.setItem("ath_customer_list", JSON.stringify(allCustomers));
      }
      // Immediately sign out to clear Firebase global session
      await signOut(auth);
      // Example: fetch Firestore doc using REST API and token
      // await fetchCustomerProfile(idToken);
      router.push("/customer/menu");
    } catch (err) {
      alert("Invalid OTP: " + err.message);
    }
    setLoading(false);
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
      <div id="recaptcha-container"></div>
      <div className="w-full max-w-md bg-white border-4 border-black rounded-[2.5rem] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="text-center mb-8">
          <img src="/logo.jpg" className="w-20 h-20 rounded-2xl border-2 border-black mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-[#064e3b]">
            {step === "phone" ? "Welcome" : "Verify Phone"}
          </h1>
        </div>
        {/* TEMP: Direct Login Button for Testing */}
        <button onClick={handleDirectLogin} className="w-full mb-4 bg-yellow-400 text-black py-3 rounded-xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all">Direct Login (Test)</button>
        {loading && <div className="text-center text-yellow-600 font-bold mb-4">Loading...</div>}
        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="relative">
              <span className="absolute left-4 top-4 font-bold text-slate-400 text-sm">+91</span>
              <input type="tel" placeholder="PHONE NUMBER" maxLength="10" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-4 pl-14 bg-slate-100 rounded-2xl border-none font-bold text-sm outline-none focus:ring-4 ring-yellow-400" required />
            </div>
            <button type="submit" className="w-full bg-[#064e3b] text-white py-4 rounded-2xl font-black uppercase italic text-sm shadow-lg active:scale-95 transition-all" disabled={loading}>Send OTP →</button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <input type="text" placeholder="ENTER OTP" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full p-4 bg-slate-100 rounded-2xl border-none font-bold text-sm text-center tracking-[0.5em] outline-none focus:ring-4 ring-yellow-400" required />
            <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase italic text-sm shadow-lg active:scale-95 transition-all" disabled={loading}>Verify & Enter →</button>
          </form>
        )}
      </div>
    </div>
  );
}