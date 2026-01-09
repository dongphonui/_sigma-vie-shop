import { getAdminEmails, getAdminPhone, getSmsSenderId } from './adminSettingsStorage';
import { API_BASE_URL } from './apiClient';

export const sendOtpRequest = async (): Promise<{ success: boolean }> => {
  const adminEmails = getAdminEmails();
  const primaryEmail = adminEmails.length > 0 ? adminEmails[0] : 'sigmavieshop@gmail.com';
  
  let adminPhone = getAdminPhone().replace(/\s/g, ''); 
  const senderId = getSmsSenderId();

  // Chuẩn hóa số điện thoại sang định dạng 84 (SpeedSMS yêu cầu)
  if (adminPhone.startsWith('0')) {
      adminPhone = '84' + adminPhone.substring(1);
  } else if (!adminPhone.startsWith('84') && adminPhone.length > 0) {
      adminPhone = '84' + adminPhone;
  }

  // 1. TẠO MÃ OTP TRƯỚC (CỨU HỘ)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 5 * 60 * 1000;

  sessionStorage.setItem('otpVerification', JSON.stringify({ otp, expiry }));
  
  console.log(`[OTP Engine] OTP: ${otp}. Delivery target: ${adminPhone} / ${primaryEmail}`);

  // GỬI YÊU CẦU LÊN SERVER (KHÔNG CHỜ PHẢN HỒI ĐỂ TRÁNH LAG)
  fetch(`${API_BASE_URL}/admin/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          email: primaryEmail, 
          phone: adminPhone, 
          otp: otp,
          senderId: senderId 
      })
  }).catch(e => console.warn("[OTP Engine] Background delivery request failed."));

  return { success: true };
};