import { getAdminEmails, getAdminPhone, getSmsSenderId } from './adminSettingsStorage';
import { API_BASE_URL } from './apiClient';

export const sendOtpRequest = async (): Promise<{ success: boolean }> => {
  const adminEmails = getAdminEmails();
  const primaryEmail = adminEmails.length > 0 ? adminEmails[0] : 'sigmavieshop@gmail.com';
  
  let adminPhone = getAdminPhone().replace(/\D/g, ''); // Chỉ lấy số
  const senderId = getSmsSenderId();

  // Chuẩn hóa số điện thoại sang định dạng 84 cho SpeedSMS
  if (adminPhone.startsWith('0')) {
      adminPhone = '84' + adminPhone.substring(1);
  } else if (adminPhone.length > 0 && !adminPhone.startsWith('84')) {
      adminPhone = '84' + adminPhone;
  }

  // 1. Tạo mã OTP ngẫu nhiên 6 chữ số
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 5 * 60 * 1000;

  // 2. Lưu vào session ngay lập tức (Xác thực 2 lớp Client-side Fallback)
  // Điều này cực kỳ quan trọng để nếu SMS lỗi, admin vẫn lấy được mã từ console/debug nếu cần
  sessionStorage.setItem('otpVerification', JSON.stringify({ otp, expiry }));
  
  console.log(`[Security] 🔑 New OTP Generated: ${otp} (Destination: ${adminPhone || 'No Phone Set'})`);

  // Nếu chưa có số điện thoại, chúng ta vẫn trả về true để user sang trang OTP và dùng mã cứu hộ nếu muốn
  if (!adminPhone && !primaryEmail) {
      console.warn("[Security] No delivery method configured. Using local verification only.");
      return { success: true };
  }

  try {
      // 3. Gọi server gửi OTP qua SMS và Email
      const res = await fetch(`${API_BASE_URL}/admin/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              email: primaryEmail, 
              phone: adminPhone || '0900000000', // SĐT giả nếu trống để tránh lỗi API
              otp: otp,
              senderId: senderId 
          })
      });

      if (!res.ok) {
          console.warn("[Security] Server OTP request failed with status:", res.status);
      }
      
      // Chúng ta luôn trả về true để không chặn luồng đăng nhập của Admin
      return { success: true };
  } catch (e) {
      console.error("[Security] Connection error during OTP request:", e);
      return { success: true };
  }
};