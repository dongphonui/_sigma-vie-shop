
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
  const [scanStatus, setScanStatus] = useState<string>('Đang tìm mã QR...');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "reader-container";

  useEffect(() => {
    // 1. Initialize Scanner
    const scanner = new Html5Qrcode(containerId, false);
    scannerRef.current = scanner;

    const config = {
      fps: 15, // Tăng FPS lên để quét mượt hơn
      qrbox: undefined, // Quét toàn màn hình (quan trọng cho mã dài như CCCD)
      videoConstraints: {
        // Yêu cầu độ phân giải cao nhất có thể (4K -> Full HD -> HD)
        width: { min: 1280, ideal: 1920, max: 3840 },
        height: { min: 720, ideal: 1080, max: 2160 },
        facingMode: "environment", // Camera sau
        // Thử ép lấy nét liên tục (chỉ chạy trên một số trình duyệt hỗ trợ)
        advanced: [{ focusMode: "continuous" }] as any
      },
      formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
      experimentalFeatures: {
          useBarCodeDetectorIfSupported: true // Kích hoạt tính năng quét bằng phần cứng (Siêu nhanh trên Android)
      }
    };

    // 2. Start Camera
    scanner.start(
      { facingMode: "environment" }, 
      config,
      (decodedText) => {
        // Success
        setScanStatus("✅ Đã bắt được mã! Đang xử lý...");
        console.log("QR Scanned Raw:", decodedText);
        
        // Play a beep sound (optional feedback)
        // const audio = new Audio('/beep.mp3'); audio.play().catch(e=>{});

        handleStop().then(() => {
            onScanSuccess(decodedText);
        });
      },
      (errorMessage) => {
        // Scanning... (Frequent logs)
        // if (onScanFailure) onScanFailure(errorMessage);
      }
    ).then(() => {
        setLoading(false);
    }).catch(err => {
        console.error("Error starting scanner:", err);
        setLoading(false);
        if (typeof err === 'string') {
            setErrorMsg(err);
        } else if (err?.name === 'NotAllowedError') {
            setErrorMsg("Bạn đã từ chối quyền Camera. Vui lòng vào Cài đặt -> Trang web -> Cho phép Camera.");
        } else if (err?.name === 'NotFoundError') {
            setErrorMsg("Không tìm thấy Camera sau.");
        } else if (err?.name === 'NotReadableError') {
            setErrorMsg("Camera đang bị ứng dụng khác chiếm dụng.");
        } else {
            setErrorMsg("Lỗi khởi động Camera. Hãy đảm bảo bạn đang dùng HTTPS hoặc Localhost.");
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
    <div className="fixed inset-0 bg-black bg-opacity-95 z-[60] flex items-center justify-center p-0 sm:p-4">
      <div className="bg-black sm:bg-white sm:rounded-lg shadow-xl w-full h-full sm:h-auto sm:max-w-md overflow-hidden relative flex flex-col">
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent text-white flex justify-between items-center z-30">
            <h3 className="font-bold text-lg drop-shadow-md">Quét CCCD</h3>
            <button onClick={() => { handleStop(); onClose(); }} className="bg-white/20 backdrop-blur-md text-white hover:bg-white/30 rounded-full p-2 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>

        {/* Camera Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            {loading && !errorMsg && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20">
                    <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-medium">Đang bật Camera độ phân giải cao...</p>
                </div>
            )}

            {errorMsg ? (
                <div className="p-8 text-center text-white z-20 max-w-xs">
                    <div className="bg-red-500/20 p-4 rounded-full inline-block mb-4">
                         <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <p className="font-bold text-lg mb-2">Không mở được Camera</p>
                    <p className="text-sm text-gray-300 mb-6">{errorMsg}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-[#D4AF37] text-white px-6 py-2 rounded-full font-bold hover:bg-[#b89b31] transition-colors"
                    >
                        Thử lại
                    </button>
                </div>
            ) : (
                <div id={containerId} className="w-full h-full object-cover"></div>
            )}
            
            {/* Visual Guide Overlay */}
            {!loading && !errorMsg && (
                <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                    <div className="w-72 h-72 border-2 border-[#D4AF37]/70 rounded-lg relative">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#D4AF37] -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#D4AF37] -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#D4AF37] -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#D4AF37] -mb-1 -mr-1"></div>
                        
                        {/* Scanning Laser Effect */}
                        <div className="absolute left-0 right-0 h-0.5 bg-red-500/80 shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-scan"></div>
                    </div>
                </div>
            )}
        </div>

        {/* Footer Status */}
        <div className="p-4 bg-white text-center shrink-0 z-30">
            <p className="font-bold text-[#00695C] animate-pulse mb-1">{scanStatus}</p>
            <p className="text-xs text-gray-500">
                Di chuyển thẻ CCCD vào gần/xa từ từ để lấy nét.
            </p>
        </div>

        <style>{`
            @keyframes scan {
                0% { top: 10%; opacity: 0; }
                50% { opacity: 1; }
                100% { top: 90%; opacity: 0; }
            }
            .animate-scan {
                animation: scan 2s infinite ease-in-out;
            }
        `}</style>
      </div>
    </div>
  );
};

export default QRScanner;
