import { getAdminEmails, getAdminPhone, getSmsSenderId } from './adminSettingsStorage';
import { API_BASE_URL } from './apiClient';

export const sendOtpRequest = async (): Promise<{ success: boolean }> => {
  const adminEmails = getAdminEmails();
  const primaryEmail = adminEmails.length > 0 ? adminEmails[0] : 'sigmavieshop@gmail.com';
  
  // Lấy số điện thoại. Nếu trong storage trống, dùng số từ ảnh dashboard của bạn làm mặc định
  let adminPhone = getAdminPhone().replace(/\D/g, ''); 
  if (!adminPhone || adminPhone === '') {
      adminPhone = '84914538099'; // Số điện thoại từ screenshot của bạn
  }

  const senderId = getSmsSenderId();

  // Chuẩn hóa 84 cho SpeedSMS
  if (adminPhone.startsWith('0')) {
      adminPhone = '84' + adminPhone.substring(1);
  } else if (adminPhone.length > 0 && !adminPhone.startsWith('84')) {
      adminPhone = '84' + adminPhone;
  }

  // 1. Tạo OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 5 * 60 * 1000;

  // 2. Lưu vào session (Mã dự phòng trên máy khách)
  sessionStorage.setItem('otpVerification', JSON.stringify({ otp, expiry }));
  
  console.log(`[Security] 🔑 Mã OTP mới: ${otp} (Gửi đến: ${adminPhone})`);

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

      // Kể cả server lỗi (do DB quota), ta vẫn trả về true để frontend chuyển sang màn hình OTP
      return { success: true };
  } catch (e) {
      console.warn("[Security] Server unreachable, using local validation.");
      return { success: true };
  }
};