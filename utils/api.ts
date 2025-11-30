
import { getAdminEmails } from './adminSettingsStorage';
// import { sendEmail } from './apiClient'; // Tạm tắt gửi email

export const sendOtpRequest = async (): Promise<{ success: boolean }> => {
  console.log('Bắt đầu yêu cầu gửi OTP (Chế độ Offline)...');
  
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
  
  // --- TẠM TẮT GỬI EMAIL ---
  // Thay vì gửi mail, hiển thị OTP ngay lập tức để admin đăng nhập
  console.log(`Mã OTP được tạo: ${otp}`);
  
  // Sử dụng setTimeout để đảm bảo UI không bị block
  setTimeout(() => {
      alert(`⚠️ CHẾ ĐỘ OFFLINE (EMAIL TẠM TẮT)\n\nMÃ OTP ĐĂNG NHẬP CỦA BẠN: ${otp}\n\nVui lòng sử dụng mã này để truy cập.`);
  }, 100);

  return { success: true };
};
