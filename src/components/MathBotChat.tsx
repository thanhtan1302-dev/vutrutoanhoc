import React, { useState, useRef, useEffect } from 'react';
import { useMathVerse } from '../context/MathVerseContext';
import { Bot, Send, Trash2, ArrowUpRight, Lightbulb, CheckCircle2, AlertCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { soundManager } from '../utils/soundEffects';
import { formatMathNotation } from '../utils/formatMath';
import {
  recordAIResponse,
  reportAIIncorrect,
  reportAIHelpful,
} from '../utils/aiFeedbackManager';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  promptQuestion?: string;
}

const PRESET_QUESTIONS = [
  'Giải phương trình này giúp em: 2x + 5 = 15',
  'Vì sao hai số âm nhân với nhau lại ra số dương? [(-3) . (-4) = 12]',
  'Cách tính diện tích hình thang và mẹo ghi nhớ bằng thơ?',
  'Định lý Pythagore là gì và áp dụng trong tam giác vuông thế nào?',
  'Quy tắc quy đồng mẫu số nhiều phân số gồm những bước nào?',
  'Hệ thức Vi-ét dùng để làm gì trong phương trình bậc hai?',
];

export const MathBotChat: React.FC = () => {
  const { user, setActiveTab } = useMathVerse();
  const currentGrade = user?.grade || 6;

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: `Chào ${user?.name || 'em'}! 🚀 Thầy là **MathBot** – Gia sư Trợ lý AI Toán học đồng hành cùng em trong chương trình Toán THCS (Lớp ${currentGrade}).\n\nEm đang gặp khó khăn ở bài toán hay công thức nào? Hãy gửi đề bài hoặc nhấn vào các gợi ý bên dưới để chúng mình cùng khám phá từng bước nhé!`,
      timestamp: Date.now(),
      promptQuestion: 'Chào MathBot',
    },
  ]);

  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'helpful' | 'incorrect'>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const toastTimeoutRef = useRef<any>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setToastMessage(null);
      }
    }, 3500);
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    soundManager.playClickSound();
    setInput('');

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      let botReply = '';
      const payload = {
        message: textToSend,
        grade: currentGrade,
        topic: 'Toán THCS',
        history: messages.slice(-5).map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          content: m.content,
        })),
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch('https://vutrutoanhoc-mathverse-api.vercel.app/api/mathbot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`Vercel API status: ${response.status}`);
        const data = await response.json();
        botReply = data.reply || '';
      } catch (remoteErr) {
        // Fallback tự động về /api/mathbot nội bộ
        try {
          const controllerLocal = new AbortController();
          const timeoutLocalId = setTimeout(() => controllerLocal.abort(), 10000);
          const localRes = await fetch('/api/mathbot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controllerLocal.signal,
          });
          clearTimeout(timeoutLocalId);
          if (localRes.ok) {
            const localData = await localRes.json();
            botReply = localData.reply || '';
          } else {
            throw remoteErr;
          }
        } catch {
          throw remoteErr;
        }
      }

      if (!botReply) {
        botReply = 'MathBot đã nhận được câu hỏi nhưng chưa có phản hồi. Em thử lại nhé!';
      }

      // Ghi nhận tổng số câu trả lời AI phục vụ thống kê
      recordAIResponse(textToSend, botReply);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: formatMathNotation(botReply),
        timestamp: Date.now(),
        promptQuestion: textToSend,
      };

      if (isMountedRef.current) {
        setMessages((prev) => [...prev, botMsg]);
        soundManager.playCorrectSound();
      }
    } catch (err) {
      console.error(err);
      const fallbackReply = `✨ **MathBot sẵn sàng hỗ trợ em!**\n\nĐối với câu hỏi "${textToSend}":\nEm hãy ghi rõ số liệu hoặc từng bước em đã giải được để thầy hướng dẫn chỉ ra chỗ cần khắc phục nhé!`;
      
      // Ghi nhận phản hồi fallback
      recordAIResponse(textToSend, fallbackReply);

      const fallbackMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'assistant',
        content: fallbackReply,
        timestamp: Date.now(),
        promptQuestion: textToSend,
      };
      if (isMountedRef.current) {
        setMessages((prev) => [...prev, fallbackMsg]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleFeedback = (msg: ChatMessage, type: 'helpful' | 'incorrect') => {
    if (feedbackMap[msg.id]) return; // Đã đánh giá rồi

    // Tìm lại câu hỏi tương ứng của người dùng an toàn
    const msgIdx = messages.findIndex((m) => m.id === msg.id);
    const precedingUserMsg = msgIdx > 0
      ? messages.slice(0, msgIdx).reverse().find((m) => m.role === 'user')?.content
      : null;
    const questionText = msg.promptQuestion || precedingUserMsg || 'Câu hỏi môn Toán THCS';

    if (type === 'helpful') {
      soundManager.playClickSound();
      reportAIHelpful(questionText, msg.content);
      setFeedbackMap((prev) => ({ ...prev, [msg.id]: 'helpful' }));
      showToast('Cảm ơn em đã đánh giá phản hồi hữu ích! 👍');
    } else {
      soundManager.playWrongSound();
      reportAIIncorrect(questionText, msg.content);
      setFeedbackMap((prev) => ({ ...prev, [msg.id]: 'incorrect' }));
      showToast('Đã lưu phản hồi "AI sai rồi" vào nhật ký phản biện của hệ thống! 👎');
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `w-${Date.now()}`,
        role: 'assistant',
        content: `Cuộc trò chuyện đã được làm mới. Em có câu hỏi Toán nào muốn hỏi MathBot không?`,
        timestamp: Date.now(),
        promptQuestion: 'Làm mới cuộc trò chuyện',
      },
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-slate-900/90 border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-800/95 border border-cyan-500/50 text-cyan-200 text-xs sm:text-sm font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Chat Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/40 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-md shadow-indigo-600/20">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                MathBot AI
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
                Online
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Gia sư giải thích từng bước • Phù hợp Toán Lớp {currentGrade}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundManager.playClickSound();
              setActiveTab('ai_eval');
            }}
            className="px-2.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Kiểm thử độ chính xác MathBot trên 20 bài toán Lớp 6"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden sm:inline">Kiểm thử AI (20 câu)</span>
          </button>
          <button
            onClick={handleClearChat}
            title="Xóa lịch sử trò chuyện"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preset Pills */}
      <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
        <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Câu hỏi nhanh:
        </span>
        {PRESET_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            disabled={isLoading}
            onClick={() => handleSend(q)}
            className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-cyan-400 hover:bg-indigo-950/40 text-slate-300 hover:text-cyan-300 text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1"
          >
            <span>{q.length > 32 ? q.slice(0, 32) + '...' : q}</span>
            <ArrowUpRight className="w-3 h-3 text-slate-500" />
          </button>
        ))}
      </div>

      {/* Hộp cảnh báo an toàn & độ tin cậy AI */}
      <div className="mx-3 sm:mx-4 my-2 px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-200/90 text-xs shrink-0 flex items-start gap-2.5 shadow-sm">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-snug">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <span>⚠ Lưu ý:</span>
          </div>
          <p className="text-[11px] sm:text-xs text-amber-100/90 leading-relaxed">
            AI chỉ là công cụ hỗ trợ học tập. AI có thể đưa ra lời giải chưa chính xác hoặc bỏ sót bước. Hãy tự kiểm tra kết quả hoặc hỏi giáo viên khi cần.
          </p>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          const feedbackStatus = feedbackMap[m.id];

          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 border ${
                  isUser
                    ? 'bg-cyan-600/30 border-cyan-400/40 text-cyan-200'
                    : 'bg-indigo-600/30 border-indigo-400/40 text-indigo-200'
                }`}
              >
                {isUser ? user?.avatar || '👨‍🚀' : '🤖'}
              </div>

              {/* Message Bubble Container */}
              <div className="max-w-[85%] sm:max-w-[75%] space-y-2">
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/10'
                      : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                  }`}
                >
                  {m.content}
                </div>

                {/* Yêu cầu 1: Sau mỗi câu trả lời của AI, thêm 2 nút: 👍 Hữu ích, 👎 AI sai rồi */}
                {!isUser && (
                  <div className="flex flex-wrap items-center gap-2 px-1 pt-0.5">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Độ chính xác:
                    </span>
                    <button
                      type="button"
                      disabled={feedbackStatus !== undefined}
                      onClick={() => handleFeedback(m, 'helpful')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        feedbackStatus === 'helpful'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                          : feedbackStatus === 'incorrect'
                          ? 'opacity-40 bg-slate-900 border border-slate-800 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 border border-slate-700/80 hover:border-emerald-500/40 active:scale-95'
                      }`}
                    >
                      <span>👍</span>
                      <span>{feedbackStatus === 'helpful' ? 'Đã ghi nhận hữu ích' : 'Hữu ích'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={feedbackStatus !== undefined}
                      onClick={() => handleFeedback(m, 'incorrect')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        feedbackStatus === 'incorrect'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm'
                          : feedbackStatus === 'helpful'
                          ? 'opacity-40 bg-slate-900 border border-slate-800 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/40 active:scale-95'
                      }`}
                    >
                      <span>👎</span>
                      <span>{feedbackStatus === 'incorrect' ? 'Đã báo AI sai' : 'AI sai rồi'}</span>
                    </button>

                    {feedbackStatus === 'incorrect' && (
                      <span className="text-[11px] text-rose-400/90 flex items-center gap-1 italic">
                        <AlertCircle className="w-3 h-3" />
                        Đã lưu vào bộ dữ liệu phản biện
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-sm shrink-0">
              🤖
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 rounded-tl-none text-slate-400 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>MathBot đang suy nghĩ và chuẩn bị từng bước giải...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi bài tập, công thức hoặc cách giải bài toán..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 text-white font-bold transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
