
import { getAdminEmails } from './adminSettingsStorage';
import { sendEmail } from './apiClient';

export const sendOtpRequest = async (): Promise<{ success: boolean }> => {
  console.log('Bắt đầu yêu cầu gửi OTP...');
  
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) {
    console.error('Không tìm thấy email quản trị nào.');
    return { success: false };
  }

  // Tạo OTP ngẫu nhiên
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 5 * 60 * 1000; // Hiệu lực 5 phút

  // Lưu OTP vào session storage để trang OTP có thể xác thực
  sessionStorage.setItem('otpVerification', JSON.stringify({ otp, expiry }));
  
  const primaryEmail = adminEmails[0];
  const subject = 'Mã xác thực đăng nhập Sigma Vie';
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; max-width: 500px;">
      <h2 style="color: #00695C;">Mã xác thực của bạn</h2>
      <p>Xin chào quản trị viên,</p>
      <p>Sử dụng mã dưới đây để đăng nhập vào trang quản trị <strong>Sigma Vie</strong>:</p>
      <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <h1 style="color: #D4AF37; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
      </div>
      <p style="font-size: 12px; color: #6b7280;">Mã này sẽ hết hạn sau 5 phút. Nếu bạn không yêu cầu mã này, vui lòng bỏ qua.</p>
    </div>
  `;

  try {
      // Cố gắng gửi email thật
      const result = await sendEmail(primaryEmail, subject, html);
      
      // Nếu server trả về lỗi (success: false) hoặc không có kết quả
      if (!result || !result.success) {
          throw new Error('Server reported email failure');
      }
      
      console.log('Email OTP đã được gửi thành công.');

  } catch (error) {
      console.warn('Gửi email thất bại, chuyển sang chế độ hiển thị trực tiếp (Fallback).', error);
      // Fallback: Hiển thị OTP qua Alert nếu gửi mail lỗi
      setTimeout(() => {
          alert(`⚠️ KHÔNG GỬI ĐƯỢC EMAIL (Lỗi kết nối)\n\nMÃ OTP ĐĂNG NHẬP CỦA BẠN LÀ: ${otp}\n\nVui lòng kiểm tra lại cấu hình SMTP trên Server.`);
      }, 100);
  }

  return { success: true };
};
