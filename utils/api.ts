
import { getAdminEmails } from './adminSettingsStorage';
import { API_BASE_URL } from './apiClient';

export const sendOtpRequest = async (): Promise<{ success: boolean }> => {
  const adminEmails = getAdminEmails();
  const primaryEmail = adminEmails.length > 0 ? adminEmails[0] : 'admin@sigmavie.com';
  
  // Giả định số điện thoại admin (Bạn có thể cấu hình trong AdminSettingsStorage nếu muốn)
  const adminPhone = '0912345678'; 

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 5 * 60 * 1000;

  sessionStorage.setItem('otpVerification', JSON.stringify({ otp, expiry }));
  
  try {
      const response = await fetch(`${API_BASE_URL}/admin/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: primaryEmail, phone: adminPhone, otp: otp })
      });
      
      const result = await response.json();
      
      // Nếu không kênh nào gửi được ( kết quả giả từ server khi gặp lỗi mail/sms)
      if (result.success && !result.delivered.email && !result.delivered.sms) {
          triggerScreenOtp(otp, "Do server mail/sms bị gián đoạn");
      } else {
          console.log("OTP đã được xử lý qua:", result.delivered);
      }

  } catch (error) {
      console.error('Lỗi kết nối API OTP:', error);
      triggerScreenOtp(otp, "Lỗi kết nối máy chủ");
  }

  return { success: true };
};

const triggerScreenOtp = (otp: string, reason: string) => {
    setTimeout(() => {
        alert(`🔔 THÔNG BÁO HỆ THỐNG\n\nLý do: ${reason}\n\nMÃ OTP ĐĂNG NHẬP CỦA BẠN LÀ: ${otp}\n\n(Hãy lưu lại mã này để nhập vào trang xác thực)`);
    }, 500);
};
