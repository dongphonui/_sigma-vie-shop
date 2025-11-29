
import { getAdminEmails } from './adminSettingsStorage';

// Đây là một hàm mô phỏng việc gọi API đến backend.
// Trong một ứng dụng thực tế, hàm này sẽ sử dụng `fetch` để gửi yêu cầu đến máy chủ của bạn.
export const sendOtpRequest = async (): Promise<{ success: boolean }> => {
  console.log('Bắt đầu yêu cầu gửi OTP...');
  
  // Giả lập độ trễ mạng (ví dụ: 1 giây)
  await new Promise(resolve => setTimeout(resolve, 1000));

  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) {
    console.error('Không tìm thấy email quản trị nào để gửi OTP.');
    return { success: false };
  }

  // Logic này sẽ nằm trên backend trong thực tế
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 5 * 60 * 1000; // Hiệu lực 5 phút

  // Lưu OTP vào session storage để trang OTP có thể xác thực
  // Trong thực tế, backend sẽ xử lý việc xác thực này.
  sessionStorage.setItem('otpVerification', JSON.stringify({ otp, expiry }));
  
  console.log(`Mô phỏng gửi OTP: ${otp} đến ${adminEmails.join(', ')}`);

  // Trả về thành công để frontend có thể tiếp tục
  return { success: true };
};