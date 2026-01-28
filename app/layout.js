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
  description: "Food Delivery App",
  // 📱 THIS IS THE ONLY LINE THAT MATTERS FOR MOBILE
  // It forces the phone to scale everything down to normal size.
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
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