"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Instantly send users to the delivery scanner
    router.push("/delivery/scanner");
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-xl font-bold animate-pulse">Loading App...</h1>
    </div>
  );
}