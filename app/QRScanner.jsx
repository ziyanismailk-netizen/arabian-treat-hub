import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner = ({ onScanSuccess, onScanFailure }) => {
  const scannerRef = useRef(null);
  const [scanResult, setScanResult] = useState(null);
  
  // Store callbacks in refs to prevent scanner re-initialization on every render
  const onScanSuccessRef = useRef(onScanSuccess);
  const onScanFailureRef = useRef(onScanFailure);

  onScanSuccessRef.current = onScanSuccess;
  onScanFailureRef.current = onScanFailure;

  useEffect(() => {
    // Initialize the scanner
    // "reader" matches the id of the div below
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText, decodedResult) => {
        // Handle success
        setScanResult(decodedText);
        if (onScanSuccessRef.current) {
          onScanSuccessRef.current(decodedText, decodedResult);
        }
        // Optional: Clear scanner after success
        // scanner.clear();
      },
      (errorMessage) => {
        // Handle scan failure (usually just ignore as it happens every frame no QR is found)
        if (onScanFailureRef.current) {
          onScanFailureRef.current(errorMessage);
        }
      }
    );

    // Cleanup function
    return () => {
      scanner.clear().catch(error => {
        console.error("Failed to clear html5-qrcode scanner. ", error);
      });
    };
  }, []); // Empty dependency array ensures scanner only initializes once

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div id="reader" className="rounded-lg overflow-hidden shadow-lg"></div>
      {scanResult && (
        <p className="mt-4 text-center text-green-600 font-bold">Result: {scanResult}</p>
      )}
    </div>
  );
};

export default QRScanner;