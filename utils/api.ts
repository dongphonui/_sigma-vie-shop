
import { getAdminEmails, getAdminPhone, getSmsSenderId } from './adminSettingsStorage';
import { API_BASE_URL } from './apiClient';

export const sendOtpRequest = async (): Promise<{ success: boolean }> => {
  const adminEmails = getAdminEmails();
  const primaryEmail = adminEmails.length > 0 ? adminEmails[0] : 'sigmavieshop@gmail.com';
  
  const adminPhone = getAdminPhone(); 
  const senderId = getSmsSenderId();

  // 1. TẠO MÃ OTP TRƯỚC
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 5 * 60 * 1000;

  // 2. LƯU NGAY VÀO STORAGE ĐỂ CÓ THỂ HIỆN MÃ KHẨN CẤP NẾU MẠNG LỖI
  sessionStorage.setItem('otpVerification', JSON.stringify({ otp, expiry }));
  
  console.log(`🚀 Đang gửi yêu cầu OTP tới Server: ${adminPhone}`);

  try {
      // 3. GỬI LÊN SERVER
      const response = await fetch(`${API_BASE_URL}/admin/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              email: primaryEmail, 
              phone: adminPhone, 
              otp: otp,
              senderId: senderId 
          })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
          console.warn("Server không thể gửi OTP qua SMS/Email. Sẽ dùng mã khẩn cấp.");
      }

  } catch (error) {
      console.error('Lỗi kết nối OTP (Network Error):', error);
      // Không ném lỗi ra ngoài để tránh treo giao diện, vì OTP đã được lưu local để rescue
  }

  return { success: true };
};
