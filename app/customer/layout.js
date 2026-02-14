"use client";

export default function CustomerLayout({ children }) {
  return (
    <div className="min-h-screen w-full bg-white flex flex-col font-sans text-black">
      <div className="w-full flex-1 bg-white overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}