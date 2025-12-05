
import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Config
    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true
    };
    
    // Create Scanner instance
    scannerRef.current = new Html5QrcodeScanner(
      "reader", 
      config, 
      /* verbose= */ false
    );

    // Success Callback
    const successCallback = (decodedText: string) => {
        // Stop scanning after success
        if (scannerRef.current) {
            scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
        }
        onScanSuccess(decodedText);
    };

    // Error Callback
    const errorCallback = (errorMessage: any) => {
        if (onScanFailure) {
            onScanFailure(errorMessage);
        }
    };

    // Start
    scannerRef.current.render(successCallback, errorCallback);

    // Cleanup
    return () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(() => {});
        }
    };
  }, [onScanSuccess, onScanFailure]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden relative">
        <div className="p-4 bg-[#00695C] text-white flex justify-between items-center">
            <h3 className="font-bold">Quét mã QR trên CCCD</h3>
            <button onClick={onClose} className="text-white hover:bg-[#004d40] rounded-full p-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        <div className="p-4">
            <div id="reader" className="w-full"></div>
            <p className="text-sm text-center text-gray-500 mt-4">
                Đưa mã QR trên thẻ CCCD vào khung hình để tự động điền thông tin.
            </p>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
