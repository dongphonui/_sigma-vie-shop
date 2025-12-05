import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure, onClose }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [scanStatus, setScanStatus] = useState<string>('Đang khởi động Camera...');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader>(new BrowserMultiFormatReader());
  const isScanRunning = useRef<boolean>(false);

  useEffect(() => {
    const initCamera = async () => {
        try {
            // Request permission first
            await navigator.mediaDevices.getUserMedia({ video: true });
            
            const devices = await codeReader.current.listVideoInputDevices();
            setVideoInputDevices(devices);
            
            if (devices.length > 0) {
                // Try to find the best back camera
                // On mobile, usually the last one or one labeled 'back'/'environment'
                const backCamera = devices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('sau'));
                const initialDeviceId = backCamera ? backCamera.deviceId : devices[devices.length - 1].deviceId;
                setSelectedDeviceId(initialDeviceId);
            } else {
                setErrorMsg('Không tìm thấy camera trên thiết bị này.');
                setLoading(false);
            }
        } catch (err) {
            console.error("Camera Permission Error:", err);
            setErrorMsg('Vui lòng cấp quyền truy cập Camera để quét mã.');
            setLoading(false);
        }
    };

    initCamera();

    return () => {
        isScanRunning.current = false;
        codeReader.current.reset();
    };
  }, []);

  useEffect(() => {
      if (selectedDeviceId && videoRef.current) {
          startDecoding(selectedDeviceId);
      }
  }, [selectedDeviceId]);

  const startDecoding = async (deviceId: string) => {
      codeReader.current.reset();
      setLoading(true);
      setScanStatus('Đang lấy nét...');
      isScanRunning.current = true;
      
      try {
          // ZXing controls the video element directly
          await codeReader.current.decodeFromVideoDevice(
              deviceId,
              videoRef.current!,
              (result, err) => {
                  if (result && isScanRunning.current) {
                      const text = result.getText();
                      setScanStatus('✅ Đã bắt được mã!');
                      isScanRunning.current = false;
                      codeReader.current.reset();
                      onScanSuccess(text);
                  }
                  if (err && !(err instanceof NotFoundException)) {
                      // Ignore frequent scan errors
                  }
              }
          );
          setLoading(false);
          setScanStatus('Đang quét... Giữ yên thẻ CCCD');
      } catch (err) {
          console.error("Decoding Error:", err);
          setErrorMsg('Không thể khởi động camera này. Hãy thử đổi camera khác.');
          setLoading(false);
      }
  };

  const handleSwitchCamera = () => {
      if (videoInputDevices.length <= 1) return;
      
      const currentIndex = videoInputDevices.findIndex(d => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % videoInputDevices.length;
      setSelectedDeviceId(videoInputDevices[nextIndex].deviceId);
  };

  const stopAndClose = () => {
      isScanRunning.current = false;
      codeReader.current.reset();
      onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-[60] flex items-center justify-center p-0 sm:p-4">
      <div className="bg-black sm:bg-white sm:rounded-lg shadow-xl w-full h-full sm:h-auto sm:max-w-md overflow-hidden relative flex flex-col">
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent text-white flex justify-between items-center z-30">
            <div>
                <h3 className="font-bold text-lg drop-shadow-md">Quét CCCD</h3>
                <p className="text-xs text-gray-300">
                    {videoInputDevices.length > 0 
                        ? videoInputDevices.find(d => d.deviceId === selectedDeviceId)?.label.substring(0, 25) + '...' 
                        : ''}
                </p>
            </div>
            <button onClick={stopAndClose} className="bg-white/20 backdrop-blur-md text-white hover:bg-white/30 rounded-full p-2 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>

        {/* Camera Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            {loading && !errorMsg && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20">
                    <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-medium">Đang khởi động Camera...</p>
                </div>
            )}

            {errorMsg ? (
                <div className="p-8 text-center text-white z-20 max-w-xs">
                    <div className="bg-red-500/20 p-4 rounded-full inline-block mb-4">
                         <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <p className="font-bold text-lg mb-2">Lỗi Camera</p>
                    <p className="text-sm text-gray-300 mb-6">{errorMsg}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-[#D4AF37] text-white px-6 py-2 rounded-full font-bold hover:bg-[#b89b31] transition-colors"
                    >
                        Thử lại
                    </button>
                </div>
            ) : (
                <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                />
            )}
            
            {/* Visual Guide Overlay */}
            {!loading && !errorMsg && (
                <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                    {/* Hướng dẫn căn chỉnh */}
                    <div className="w-[80%] aspect-square border-2 border-[#D4AF37]/70 rounded-lg relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#D4AF37] -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#D4AF37] -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#D4AF37] -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#D4AF37] -mb-1 -mr-1"></div>
                        
                        {/* Scanning Laser Effect */}
                        <div className="absolute left-2 right-2 h-0.5 bg-red-500/80 shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-scan"></div>
                    </div>
                </div>
            )}
            
            {/* Switch Camera Button (Floating) */}
            {videoInputDevices.length > 1 && (
                <button 
                    onClick={handleSwitchCamera}
                    className="absolute bottom-24 right-6 z-40 bg-white/20 backdrop-blur-md border border-white/30 p-3 rounded-full shadow-lg text-white hover:bg-white/40 active:scale-95 transition-all"
                    title="Đổi Camera"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-3a2 2 0 0 1-2-2l-.22-.34A2 2 0 0 0 13.12 4H10.88a2 2 0 0 0-1.66.66l-.22.34A2 2 0 0 1 7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M17 13h.01"/></svg>
                </button>
            )}
        </div>

        {/* Footer Status */}
        <div className="p-4 bg-white text-center shrink-0 z-30">
            <p className="font-bold text-[#00695C] animate-pulse mb-1">{scanStatus}</p>
            <p className="text-xs text-gray-500 mb-2">
                Di chuyển thẻ CCCD vào gần/xa từ từ để lấy nét.
            </p>
            {videoInputDevices.length > 1 && (
                 <p className="text-[10px] text-gray-400">
                    Nếu khó quét, hãy bấm nút máy ảnh để thử ống kính khác.
                </p>
            )}
        </div>

        <style>{`
            @keyframes scan {
                0% { top: 10%; opacity: 0; }
                50% { opacity: 1; }
                100% { top: 90%; opacity: 0; }
            }
            .animate-scan {
                animation: scan 3s infinite linear;
            }
        `}</style>
      </div>
    </div>
  );
};

export default QRScanner;