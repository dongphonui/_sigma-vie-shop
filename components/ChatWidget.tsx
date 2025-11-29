
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Content } from "@google/genai";
import { getProducts } from '../utils/productStorage';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Initialize from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('sigma_vie_chat_history');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
  }, []);

  // Save to localStorage whenever messages change
  useEffect(() => {
    localStorage.setItem('sigma_vie_chat_history', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const products = getProducts();
      const productContext = products.map(p => `${p.name} (ID: ${p.id}) - Giá: ${p.price}. Mô tả: ${p.description}`).join('\n');

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Convert internal message format to Gemini history format
      // Limit history to last 20 messages to avoid context limit issues
      const history: Content[] = messages.slice(-20).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: history,
        config: {
          systemInstruction: `Bạn là trợ lý ảo chăm sóc khách hàng của Sigma Vie, một thương hiệu thời trang cao cấp và thanh lịch. 
          Phong cách trả lời: Lịch sự, tinh tế, ngắn gọn và hữu ích. Sử dụng tiếng Việt.
          
          Dưới đây là danh sách sản phẩm hiện có của cửa hàng:
          ${productContext}
          
          Nhiệm vụ của bạn:
          1. Trả lời các câu hỏi về sản phẩm, giá cả và chất liệu.
          2. Hướng dẫn khách hàng cách đặt hàng (quét mã QR trên sản phẩm).
          3. Nếu khách hỏi về vấn đề không liên quan đến thời trang hoặc cửa hàng, hãy khéo léo từ chối và quay lại chủ đề chính.
          `,
        },
      });

      const result = await chat.sendMessage({ message: userMessage.text });
      const responseText = result.text;

      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, modelMessage]);

    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện không?")) {
        setMessages([]);
        localStorage.removeItem('sigma_vie_chat_history');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white w-80 sm:w-96 h-[500px] rounded-lg shadow-2xl flex flex-col mb-4 overflow-hidden border border-gray-200 animate-fade-in-up">
          {/* Header */}
          <div className="bg-[#00695C] text-white p-4 flex justify-between items-center shadow-md">
            <div>
                <h3 className="font-serif font-bold text-lg">Sigma Vie Support</h3>
                <p className="text-xs text-teal-100">Luôn sẵn sàng hỗ trợ bạn</p>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={handleClearHistory} className="text-teal-100 hover:text-white text-xs" title="Xóa lịch sử">
                    Làm mới
                </button>
                <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F9FAFB]">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-10 text-sm">
                <p>Xin chào! Tôi có thể giúp gì cho bạn hôm nay?</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 text-sm shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-[#D4AF37] text-white rounded-tr-none'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
             {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-500 border border-gray-200 rounded-lg rounded-tl-none p-3 text-sm shadow-sm italic">
                  Đang soạn tin...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="bg-[#00695C] text-white p-2 rounded-full hover:bg-[#004d40] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#00695C] hover:bg-[#004d40] text-white p-4 rounded-full shadow-lg transition-transform transform hover:scale-110 flex items-center justify-center"
        aria-label="Chat với chúng tôi"
      >
        {isOpen ? (
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        )}
      </button>

      <style>{`
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ChatWidget;
