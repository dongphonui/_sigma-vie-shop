
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure, onClose }) => {
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "reader-container";

  useEffect(() => {
    // 1. Initialize Scanner
    // Use verbose=false to reduce console logs
    const scanner = new Html5Qrcode(containerId, false);
    scannerRef.current = scanner;

    const config = {
      fps: 10,
      // qrbox removed to allow full screen scanning which is better for detailed QRs like CCCD
      videoConstraints: {
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
        facingMode: "environment"
      },
      formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
    };

    // 2. Start Camera
    scanner.start(
      { facingMode: "environment" }, // Prefer back camera
      config,
      (decodedText) => {
        // Success
        console.log("QR Scanned raw:", decodedText);
        handleStop().then(() => {
            onScanSuccess(decodedText);
        });
      },
      (errorMessage) => {
        // Scan Error (Frequent, ignore mostly)
        if (onScanFailure) {
            // console.warn(errorMessage);
        }
      }
    ).then(() => {
        setLoading(false);
    }).catch(err => {
        console.error("Error starting scanner:", err);
        setLoading(false);
        if (typeof err === 'string') {
            setErrorMsg(err);
        } else if (err?.name === 'NotAllowedError') {
            setErrorMsg("Bạn đã từ chối quyền truy cập Camera. Vui lòng cho phép trong cài đặt trình duyệt.");
        } else if (err?.name === 'NotFoundError') {
            setErrorMsg("Không tìm thấy Camera trên thiết bị này.");
        } else if (err?.name === 'NotReadableError') {
            setErrorMsg("Camera đang được sử dụng bởi ứng dụng khác.");
        } else {
            setErrorMsg("Không thể khởi động Camera. Vui lòng đảm bảo bạn đang truy cập qua HTTPS (ổ khóa an toàn) hoặc Localhost.");
        }
    });

    // Cleanup on unmount
    return () => {
        handleStop();
    };
  }, []);

  const handleStop = async () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
          try {
              await scannerRef.current.stop();
              scannerRef.current.clear();
          } catch (e) {
              console.error("Error stopping scanner", e);
          }
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden relative flex flex-col h-[80vh]">
        
        {/* Header */}
        <div className="p-4 bg-[#00695C] text-white flex justify-between items-center z-10 shrink-0">
            <h3 className="font-bold text-lg">Quét mã QR CCCD</h3>
            <button onClick={() => { handleStop(); onClose(); }} className="text-white hover:bg-[#004d40] rounded-full p-1 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>

        {/* Camera Area */}
        <div className="relative bg-black flex-1 flex items-center justify-center overflow-hidden">
            {loading && !errorMsg && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p>Đang khởi động Camera...</p>
                </div>
            )}

            {errorMsg ? (
                <div className="p-6 text-center text-red-400 z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <p className="font-bold mb-2">Lỗi Camera</p>
                    <p className="text-sm text-gray-300 mb-4">{errorMsg}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-white text-black px-4 py-2 rounded text-sm font-bold hover:bg-gray-200"
                    >
                        Tải lại trang
                    </button>
                </div>
            ) : (
                <div id={containerId} className="w-full h-full object-cover"></div>
            )}
        </div>

        {/* Instructions */}
        <div className="p-4 bg-gray-50 text-center shrink-0">
            <p className="text-sm text-gray-600">
                Đưa mã QR vào khung hình. Giữ yên tay để lấy nét.<br/>
                Hệ thống sẽ tự động điền thông tin.
            </p>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
