import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export const metadata = {
  title: "Arabian Treat Hub",
  description: "Restaurant Management System",
  manifest: "/manifest.json", // 👈 This links the App file
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0", // 👈 Prevents zooming on mobile
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-black">
        {children}
      </body>
    </html>
  );
}