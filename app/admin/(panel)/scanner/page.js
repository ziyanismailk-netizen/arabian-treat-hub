"use client";
import { useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import react-qr-reader to avoid SSR issues
const QrReader = dynamic(() => import("react-qr-reader"), { ssr: false });

export default function ScannerPage() {
	const [scanResult, setScanResult] = useState("");

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-ath-emerald text-white p-8">
			<h1 className="text-2xl font-bold mb-6">Order QR Scanner</h1>
			<div className="w-full max-w-md bg-white rounded-lg shadow-lg p-4 text-black">
				<QrReader
					onResult={(result, error) => {
						if (!!result) setScanResult(result?.text || "");
					}}
					constraints={{ facingMode: "environment" }}
					style={{ width: "100%" }}
				/>
				<div className="mt-4">
					<label className="block text-ath-emerald font-bold mb-2">Scan Result:</label>
					<div className="p-2 bg-ath-neon/10 rounded text-ath-emerald font-mono break-all min-h-[2rem]">
						{scanResult || "No QR code detected yet."}
					</div>
				</div>
			</div>
		</div>
	);
}
