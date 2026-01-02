
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
      const productContext = products.map(p => `${p.name} (Giá: ${p.price}). Mô tả: ${p.description}`).join('\n');

      const apiKey = process.env.API_KEY;
      
      if (!apiKey || apiKey === "undefined" || apiKey === "") {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "Hệ thống Chatbot chưa được cấu hình mã API Key trên Vercel. Vui lòng liên hệ quản trị viên!",
            timestamp: Date.now(),
        }]);
        setIsLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: apiKey });
      const history: Content[] = messages.slice(-15).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        history: history,
        config: {
          systemInstruction: `Bạn là trợ lý ảo thời trang của Sigma Vie. 
          Phong cách: Sang trọng, lịch thiệp, ngắn gọn. 
          Dưới đây là danh sách sản phẩm hiện có:
          ${productContext}
          
          Nhiệm vụ:
          1. Tư vấn sản phẩm, size, màu sắc dựa trên dữ liệu trên.
          2. Hướng dẫn đặt hàng: Khách hàng cần quét mã QR trên sản phẩm hoặc bấm "Mua ngay" trong chi tiết sản phẩm.
          3. Không trả lời các vấn đề ngoài thời trang và cửa hàng.`,
        },
      });

      // Sử dụng cấu trúc message chuẩn của Chat Session
      const result = await chat.sendMessage({ 
          message: userMessage.text 
      });
      
      const responseText = result.text;

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText || "Tôi có thể giúp gì khác cho bạn không?",
        timestamp: Date.now(),
      }]);

    } catch (error: any) {
      console.error("Chat AI Error Detailed:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Xin lỗi, tôi đang gặp sự cố kết nối AI (Có thể do mã API Key hoặc giới hạn vùng). Hãy thử lại sau!",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Xóa lịch sử trò chuyện?")) {
        setMessages([]);
        localStorage.removeItem('sigma_vie_chat_history');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {isOpen && (
        <div className="bg-white w-80 sm:w-96 h-[500px] rounded-lg shadow-2xl flex flex-col mb-4 overflow-hidden border border-gray-200 animate-fade-in-up">
          <div className="bg-[#00695C] text-white p-4 flex justify-between items-center shadow-md">
            <div>
                <h3 className="font-serif font-bold text-lg">Sigma Vie AI</h3>
                <p className="text-[10px] text-teal-100 uppercase tracking-widest font-bold">Fashion Assistant</p>
            </div>
            <div className="flex items-center space-x-3">
                <button onClick={handleClearHistory} className="text-teal-100 hover:text-white text-[10px] font-bold uppercase" title="Xóa lịch sử">
                    Làm mới
                </button>
                <button onClick={() => setIsOpen(false)} className="text-white hover:bg-white/10 p-1 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-10 text-xs italic">
                <p>Chào bạn! Sigma Vie AI có thể giúp bạn chọn trang phục phù hợp nhất hôm nay.</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${msg.role === 'user' ? 'bg-[#D4AF37] text-white rounded-tr-none' : 'bg-white text-gray-800 border border-slate-200 rounded-tl-none'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
             {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-400 border border-slate-200 rounded-2xl rounded-tl-none p-3 text-xs shadow-sm flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Nhập tin nhắn..." className="flex-1 border border-gray-200 bg-gray-50 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:bg-white transition-all" disabled={isLoading} />
              <button type="submit" disabled={isLoading || !inputValue.trim()} className="bg-[#00695C] text-white p-2.5 rounded-full hover:bg-[#004d40] transition-colors disabled:opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          </form>
        </div>
      )}

      <button onClick={() => setIsOpen(!isOpen)} className="bg-[#00695C] hover:bg-[#004d40] text-white p-4 rounded-full shadow-2xl transition-all transform hover:scale-110 active:scale-95 flex items-center justify-center border-4 border-white">
        {isOpen ? (
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        )}
      </button>

      <style>{`
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px) scale(0.95); }
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
