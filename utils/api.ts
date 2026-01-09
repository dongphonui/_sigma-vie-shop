import { getAdminEmails, getAdminPhone, getSmsSenderId } from './adminSettingsStorage';
import { API_BASE_URL } from './apiClient';

export const sendOtpRequest = async (): Promise<{ success: boolean }> => {
  const adminEmails = getAdminEmails();
  const primaryEmail = adminEmails.length > 0 ? adminEmails[0] : 'sigmavieshop@gmail.com';
  
  const adminPhone = getAdminPhone(); 
  const senderId = getSmsSenderId();

  // 1. TẠO MÃ OTP TRƯỚC (QUAN TRỌNG ĐỂ CÓ MÃ CỨU HỘ NGAY LẬP TỨC)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 5 * 60 * 1000;

  // LƯU VÀO STORAGE TRƯỚC KHI GỌI MẠNG
  sessionStorage.setItem('otpVerification', JSON.stringify({ otp, expiry }));
  
  console.log(`[OTP Engine] Draft OTP generated: ${otp}. Notify server in background...`);

  // GỬI YÊU CẦU LÊN SERVER NHƯNG KHÔNG DÙNG 'AWAIT' ĐỂ TRÁNH TREO GIAO DIỆN
  fetch(`${API_BASE_URL}/admin/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          email: primaryEmail, 
          phone: adminPhone, 
          otp: otp,
          senderId: senderId 
      })
  }).catch(e => console.warn("[OTP Engine] Background send failed, user can still use emergency code."));

  // Trả về true ngay để UI chuyển sang trang nhập mã
  return { success: true };
};