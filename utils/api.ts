
import { getAdminEmails } from './adminSettingsStorage';
import { sendEmail } from './apiClient';

export const sendOtpRequest = async (): Promise<{ success: boolean }> => {
  console.log('Bắt đầu yêu cầu gửi OTP...');
  
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) {
    console.error('Không tìm thấy email quản trị nào để gửi OTP.');
    return { success: false };
  }

  // Tạo OTP ngẫu nhiên
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 5 * 60 * 1000; // Hiệu lực 5 phút

  // Lưu OTP vào session storage để trang OTP có thể xác thực
  sessionStorage.setItem('otpVerification', JSON.stringify({ otp, expiry }));
  
  // Gửi email thật qua Backend
  const primaryEmail = adminEmails[0]; // Gửi cho email đầu tiên trong danh sách (sigmavieshop@gmail.com)
  
  const subject = "Mã xác thực OTP - Sigma Vie Admin";
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #00695C; text-align: center;">Sigma Vie Admin Security</h2>
      <p>Xin chào quản trị viên,</p>
      <p>Bạn vừa yêu cầu đăng nhập vào hệ thống quản trị Sigma Vie.</p>
      <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
        <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #D4AF37;">${otp}</span>
      </div>
      <p>Mã này sẽ hết hạn trong vòng 5 phút.</p>
      <p style="font-size: 12px; color: #888; text-align: center;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua.</p>
    </div>
  `;

  // Gọi API gửi mail
  const result = await sendEmail(primaryEmail, subject, html);
  
  // Kiểm tra kết quả
  if (result && result.success) {
    console.log(`OTP đã được gửi đến email ${primaryEmail}`);
    return { success: true };
  } else {
    // Nếu thất bại (do sai pass, lỗi mạng...), bật chế độ cứu hộ
    console.error('Gửi email thất bại. Đang kích hoạt chế độ Fallback.');
    
    // Sử dụng setTimeout để đảm bảo Alert hiện ra sau khi UI render xong (tránh bị block)
    setTimeout(() => {
        alert(`⚠️ CHẾ ĐỘ CỨU HỘ (EMAIL FAILED)\n\nHệ thống không thể gửi email đến ${primaryEmail}.\nCó thể do Mật khẩu ứng dụng trên Render bị sai.\n\n👉 MÃ OTP KHẨN CẤP CỦA BẠN: ${otp}\n\nHãy dùng mã này để đăng nhập và kiểm tra lại cấu hình.`);
    }, 100);

    return { success: true };
  }
};
