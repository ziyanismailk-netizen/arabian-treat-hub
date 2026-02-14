"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  // No forced redirect; show home page or allow navigation

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#064e3b] text-white">
      <h1 className="text-xl font-bold animate-pulse">Loading...</h1>
    </div>
  );
}