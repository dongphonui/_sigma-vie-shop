import { getAdminEmails, getAdminPhone, getSmsSenderId } from './adminSettingsStorage';
import { API_BASE_URL } from './apiClient';

export const sendOtpRequest = async (): Promise<{ success: boolean }> => {
  const adminEmails = getAdminEmails();
  const primaryEmail = adminEmails.length > 0 ? adminEmails[0] : 'sigmavieshop@gmail.com';
  
  let adminPhone = getAdminPhone().replace(/\s/g, ''); 
  const senderId = getSmsSenderId();

  // Chuẩn hóa số điện thoại sang 84
  if (adminPhone.startsWith('0')) {
      adminPhone = '84' + adminPhone.substring(1);
  } else if (!adminPhone.startsWith('84') && adminPhone.length > 0) {
      adminPhone = '84' + adminPhone;
  }

  // 1. Tạo OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 5 * 60 * 1000;

  // 2. Lưu vào session ngay lập tức (để UI có thể lấy mã khẩn cấp nếu cần)
  sessionStorage.setItem('otpVerification', JSON.stringify({ otp, expiry }));
  
  console.log(`[OTP] Delivering ${otp} to ${adminPhone}`);

  try {
      // 3. Gọi server gửi OTP
      const res = await fetch(`${API_BASE_URL}/admin/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              email: primaryEmail, 
              phone: adminPhone, 
              otp: otp,
              senderId: senderId 
          })
      });

      // Vẫn cho phép vào trang OTP kể cả khi server trả lỗi (để dùng mã cứu hộ)
      return { success: true };
  } catch (e) {
      console.warn("[OTP] API call failed, but proceeding to OTP page for rescue mode.");
      return { success: true };
  }
};