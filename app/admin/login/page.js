"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase"; 
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if already logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkRole(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const checkRole = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists() && userDoc.data()?.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        await signOut(auth);
      }
    } catch (error) {
      console.error("Role check error:", error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Rate limiting check (prevent brute force)
      const lastAttempt = localStorage.getItem("lastLoginAttempt");
      if (lastAttempt && Date.now() - parseInt(lastAttempt) < 3000) {
        setError("⏳ Please wait before trying again");
        setLoading(false);
        return;
      }
      localStorage.setItem("lastLoginAttempt", Date.now().toString());

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if email is verified (optional, but recommended for production)
      // if (!user.emailVerified) {
      //   await signOut(auth);
      //   setError("❌ Please verify your email first.");
      //   setLoading(false);
      //   return;
      // }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await signOut(auth);
        setError("❌ No staff profile found.");
        setLoading(false);
        return;
      }

      const role = userDoc.data()?.role;

      if (role === "admin") {
        // Clear rate limit on successful login
        localStorage.removeItem("lastLoginAttempt");
        router.push("/admin/dashboard");
      } else {
        await signOut(auth);
        setError("❌ Access denied. Only admins can login here.");
      }
    } catch (error) {
      let errorMsg = error.message;
      if (error.code === "auth/user-not-found") {
        errorMsg = "❌ User not found.";
      } else if (error.code === "auth/wrong-password") {
        errorMsg = "❌ Incorrect password.";
      } else if (error.code === "auth/too-many-requests") {
        errorMsg = "❌ Too many failed attempts. Try again later.";
      } else if (error.code === "auth/invalid-email") {
        errorMsg = "❌ Invalid email format.";
      } else if (error.code === "auth/user-disabled") {
        errorMsg = "❌ This account has been disabled.";
      }
      setError(errorMsg);
    }
    setLoading(false);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError("");
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setError("");
      alert("✅ Password reset email sent! Check your inbox.");
      setResetMode(false);
      setResetEmail("");
    } catch (error) {
      let errorMsg = error.message;
      if (error.code === "auth/user-not-found") {
        errorMsg = "❌ Email not found.";
      } else if (error.code === "auth/invalid-email") {
        errorMsg = "❌ Invalid email format.";
      }
      setError(errorMsg);
    }
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-lg p-10 rounded-3xl shadow-2xl border border-emerald-100 relative">
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="bg-emerald-950 text-white px-10 py-4 rounded-3xl font-black text-3xl shadow-lg tracking-widest italic border-4 border-emerald-200">ATH</div>
        </div>
        <div className="text-center mt-16 mb-10">
          <h2 className="text-4xl font-extrabold text-emerald-950 uppercase tracking-tight drop-shadow-sm">
            {resetMode ? "Reset Password" : "Admin Login"}
          </h2>
          <p className="text-emerald-900 mt-2 text-base font-medium">
            {resetMode ? "Enter your email to reset" : "Access the Command Center"}
          </p>
        </div>

        <form onSubmit={resetMode ? handlePasswordReset : handleLogin} className="space-y-7">
          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 animate-shake">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.918-.816 1.995-1.85l.007-.15V6c0-1.054-.816-1.918-1.85-1.995L19 4H5c-1.054 0-1.918.816-1.995 1.85L3 6v12c0 1.054.816 1.918 1.85 1.995L5 20zm7-16v2m0 4h.01"/></svg>
              {error}
            </div>
          )}

          {resetMode ? (
            <div>
              <label className="text-xs font-bold uppercase text-emerald-900 ml-2 block mb-2 tracking-wider">Email Address</label>
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100 outline-none focus:border-emerald-500 text-emerald-950 font-semibold transition-all placeholder:text-emerald-300"
                placeholder="admin@email.com"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-bold uppercase text-emerald-900 ml-2 block mb-2 tracking-wider">Admin Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100 outline-none focus:border-emerald-500 text-emerald-950 font-semibold transition-all placeholder:text-emerald-300"
                  placeholder="admin@email.com"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-emerald-900 ml-2 block mb-2 tracking-wider">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100 outline-none focus:border-emerald-500 text-emerald-950 font-semibold transition-all placeholder:text-emerald-300"
                  placeholder="••••••••"
                />
              </div>
            </>
          )}

          <button
            disabled={loading || resetLoading}
            className="w-full bg-emerald-900 text-white p-5 rounded-2xl font-extrabold uppercase tracking-widest shadow-lg hover:bg-emerald-800 transition-all disabled:opacity-60 text-lg"
          >
            {loading || resetLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
                {resetMode ? "Sending..." : "Verifying..."}
              </span>
            ) : resetMode ? (
              "Send Reset Email"
            ) : (
              "Enter Command Center"
            )}
          </button>

          {!resetMode && (
            <button
              type="button"
              onClick={() => setResetMode(true)}
              className="w-full text-emerald-700 hover:text-emerald-900 text-sm font-semibold underline"
            >
              Forgot password?
            </button>
          )}

          {resetMode && (
            <button
              type="button"
              onClick={() => {
                setResetMode(false);
                setResetEmail("");
                setError("");
              }}
              className="w-full text-emerald-700 hover:text-emerald-900 text-sm font-semibold underline"
            >
              Back to login
            </button>
          )}
        </form>
      </div>
    </div>
  );
}