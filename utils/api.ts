
import { getAdminEmails, getAdminPhone } from './adminSettingsStorage';
import { API_BASE_URL } from './apiClient';

export const sendOtpRequest = async (): Promise<{ success: boolean }> => {
  const adminEmails = getAdminEmails();
  const primaryEmail = adminEmails.length > 0 ? adminEmails[0] : 'admin@sigmavie.com';
  
  // Lấy số điện thoại thực tế từ cài đặt hoặc session
  const adminPhone = getAdminPhone(); 

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 5 * 60 * 1000;

  sessionStorage.setItem('otpVerification', JSON.stringify({ otp, expiry }));
  
  console.log(`Đang gửi OTP đến SĐT: ${adminPhone || 'Chưa cấu hình'} và Email: ${primaryEmail}`);

  try {
      const response = await fetch(`${API_BASE_URL}/admin/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: primaryEmail, phone: adminPhone, otp: otp })
      });
      
      const result = await response.json();
      
      // Nếu không kênh nào gửi được
      if (result.success && !result.delivered.email && !result.delivered.sms) {
          triggerScreenOtp(otp, "Do cấu hình API hoặc Server Mail/SMS đang bảo trì");
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
