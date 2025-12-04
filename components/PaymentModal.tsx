
import React, { useEffect, useState } from 'react';
import { getBankSettings } from '../utils/bankSettingsStorage';
import { VIET_QR_BANKS } from '../utils/constants';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  amount: number;
  onConfirmPayment: () => void;
}

const XIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const CheckCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, orderId, amount, onConfirmPayment }) => {
  const [bankSettings, setBankSettings] = useState(getBankSettings());
  
  useEffect(() => {
      setBankSettings(getBankSettings());
  }, [isOpen]);

  if (!isOpen) return null;

  // Construct VietQR URL
  // Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<CONTENT>&accountName=<NAME>
  const bankInfo = VIET_QR_BANKS.find(b => b.id === bankSettings.bankId) || { name: 'Unknown Bank' };
  const qrUrl = `https://img.vietqr.io/image/${bankSettings.bankId}-${bankSettings.accountNumber}-${bankSettings.template}.png?amount=${amount}&addInfo=${encodeURIComponent(orderId)}&accountName=${encodeURIComponent(bankSettings.accountName)}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="bg-[#00695C] p-4 flex justify-between items-center text-white">
            <h3 className="font-bold text-lg flex items-center gap-2">
                Quét mã để thanh toán
            </h3>
            <button onClick={onClose} className="hover:bg-[#004d40] rounded-full p-1 transition-colors">
                <XIcon className="w-6 h-6"/>
            </button>
        </div>

        <div className="p-6 text-center">
            {!bankSettings.bankId ? (
                <div className="py-8 text-gray-500">
                    <p>Chưa cấu hình tài khoản ngân hàng.</p>
                    <p className="text-sm">Vui lòng liên hệ Admin để thanh toán.</p>
                </div>
            ) : (
                <>
                    <div className="bg-white p-2 border-2 border-[#00695C] rounded-lg inline-block mb-4">
                        <img 
                            src={qrUrl} 
                            alt="VietQR Payment Code" 
                            className="w-64 h-64 object-contain" 
                        />
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg text-sm text-left space-y-2 mb-6">
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500">Ngân hàng:</span>
                            <span className="font-bold">{bankInfo.name} ({bankSettings.bankId})</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500">Chủ tài khoản:</span>
                            <span className="font-bold uppercase">{bankSettings.accountName}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500">Số tài khoản:</span>
                            <span className="font-bold">{bankSettings.accountNumber}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-gray-500">Số tiền:</span>
                            <span className="font-bold text-[#00695C] text-lg">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Nội dung:</span>
                            <span className="font-bold text-[#D4AF37]">{orderId}</span>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 mb-6 italic">
                        * Sử dụng App Ngân hàng hoặc Ví điện tử (Momo, ZaloPay...) để quét mã.
                    </p>

                    <button 
                        onClick={onConfirmPayment}
                        className="w-full bg-[#00695C] text-white py-3 rounded-lg font-bold shadow-lg hover:bg-[#004d40] transition-transform transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                        <CheckCircleIcon className="w-5 h-5" />
                        Tôi đã chuyển tiền
                    </button>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
