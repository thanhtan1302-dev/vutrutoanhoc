import React, { useState } from 'react';
import { useMathVerse } from '../context/MathVerseContext';
import {
  X,
  Star,
  Sparkles,
  Bot,
  Heart,
  RotateCcw,
  BookOpen,
  Target,
  PenTool,
  BarChart3,
  CheckCircle2,
  Send,
  Clock,
  Award,
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import {
  saveUserFeedbackSurvey,
  markSurveyPromptPostponed,
  POPULAR_FEATURES,
} from '../utils/userFeedbackSurveyManager';

interface WeeklySurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const WeeklySurveyModal: React.FC<WeeklySurveyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, addXp } = useMathVerse();

  // 1. AI có dễ sử dụng không? (1-5 sao)
  const [easeOfUse, setEaseOfUse] = useState<number>(5);
  const [hoverEase, setHoverEase] = useState<number | null>(null);

  // 2. AI có giúp em học Toán tốt hơn không? (1-5 sao)
  const [learningHelp, setLearningHelp] = useState<number>(5);
  const [hoverHelp, setHoverHelp] = useState<number | null>(null);

  // 3. Em thích tính năng nào nhất?
  const [favoriteFeature, setFavoriteFeature] = useState<string>(
    'Gia sư MathBot AI giải bài & hướng dẫn'
  );

  // 4. Góp ý thêm
  const [comments, setComments] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  // Tính tuần học dựa trên streak hoặc ngày
  const calculatedWeek = user ? Math.max(1, Math.ceil((user.streak || 1) / 7)) : 1;

  const easeLabels: Record<number, string> = {
    1: 'Rất khó dùng 😞',
    2: 'Hơi khó khăn 😐',
    3: 'Bình thường 🙂',
    4: 'Dễ sử dụng & Rõ ràng 😊',
    5: 'Rất dễ dùng & Tuyệt vời! 🚀',
  };

  const helpLabels: Record<number, string> = {
    1: 'Chưa thấy giúp ích 🙁',
    2: 'Giúp ích một chút 😐',
    3: 'Tạm ổn, có ích 🙂',
    4: 'Rất bổ ích & Hiểu bài hơn! 🌟',
    5: 'Tiến bộ vượt bậc & Tự tin môn Toán! 💯',
  };

  const featureIcons: Record<string, React.ReactNode> = {
    mathbot: <Bot className="w-5 h-5 text-indigo-400" />,
    smart_review: <RotateCcw className="w-5 h-5 text-pink-400" />,
    challenges: <Target className="w-5 h-5 text-amber-400" />,
    practice: <PenTool className="w-5 h-5 text-emerald-400" />,
    lessons: <BookOpen className="w-5 h-5 text-cyan-400" />,
    analytics: <BarChart3 className="w-5 h-5 text-purple-400" />,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    soundManager.playClickSound();

    setTimeout(() => {
      // Lưu vào localStorage
      saveUserFeedbackSurvey({
        userName: user.name || 'Học sinh MathVerse',
        grade: user.grade || 6,
        avatar: user.avatar || '👨‍🚀',
        weekNumber: calculatedWeek,
        easeOfUseRating: easeOfUse,
        learningHelpRating: learningHelp,
        favoriteFeature,
        additionalComments: comments.trim(),
      });

      // Thưởng XP cho học sinh vì đã góp ý tích cực
      addXp(25, 'Khảo sát định kỳ tuần học');
      soundManager.playCorrectSound();

      // Pháo hoa ăn mừng
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#6366f1', '#ec4899', '#f59e0b'],
        });
      } catch (err) {
        console.error('Lỗi confetti:', err);
      }

      setIsSubmitting(false);
      setIsSubmitted(true);

      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1600);
    }, 400);
  };

  const handlePostpone = () => {
    soundManager.playClickSound();
    markSurveyPromptPostponed();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl shadow-indigo-950/70 p-5 sm:p-7 text-slate-100 scrollbar-thin scrollbar-thumb-indigo-600/30">
        {/* Glow ambient */}
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handlePostpone}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer"
          aria-label="Đóng khảo sát"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          /* Màn hình cảm ơn sau khi gửi */
          <div className="py-10 text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">
              Cảm Ơn Em Đã Góp Ý! 🎉
            </h3>
            <p className="text-sm text-slate-300 max-w-sm mx-auto">
              Ý kiến của em giúp đội ngũ nâng cấp MathBot AI ngày càng thông minh và dễ học hơn.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-sm">
              <Award className="w-4 h-4 text-amber-400" />
              <span>+25 XP Thưởng Đóng Góp Ý Kiến</span>
            </div>
          </div>
        ) : (
          /* Form khảo sát */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Khảo Sát Định Kỳ Tuần #{calculatedWeek}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  +25 XP Thưởng
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>Cảm Nhận Học Tập Cùng AI</span>
                <Heart className="w-5 h-5 text-pink-400 fill-pink-400 inline" />
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Chào <strong className="text-cyan-300">{user?.name || 'em'}</strong>! Hãy dành 30 giây đánh giá để MathBot hỗ trợ em học Toán tốt hơn nhé.
              </p>
            </div>

            {/* CÂU 1: AI có dễ sử dụng không? ⭐⭐⭐⭐⭐ */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
              <label className="block text-xs font-bold text-indigo-200 tracking-wider uppercase">
                1. AI có dễ sử dụng không?
              </label>
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = (hoverEase !== null ? hoverEase : easeOfUse) >= star;
                  return (
                    <button
                      type="button"
                      key={star}
                      onClick={() => {
                        setEaseOfUse(star);
                        soundManager.playClickSound();
                      }}
                      onMouseEnter={() => setHoverEase(star)}
                      onMouseLeave={() => setHoverEase(null)}
                      className="p-1 text-slate-600 hover:scale-115 transition-all duration-150 cursor-pointer focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                          isFilled
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                            : 'text-slate-600 hover:text-amber-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-semibold text-amber-300 transition-all">
                {easeLabels[hoverEase !== null ? hoverEase : easeOfUse]}
              </p>
            </div>

            {/* CÂU 2: AI có giúp em học Toán tốt hơn không? ⭐⭐⭐⭐⭐ */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
              <label className="block text-xs font-bold text-cyan-200 tracking-wider uppercase">
                2. AI có giúp em học Toán tốt hơn không?
              </label>
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = (hoverHelp !== null ? hoverHelp : learningHelp) >= star;
                  return (
                    <button
                      type="button"
                      key={star}
                      onClick={() => {
                        setLearningHelp(star);
                        soundManager.playClickSound();
                      }}
                      onMouseEnter={() => setHoverHelp(star)}
                      onMouseLeave={() => setHoverHelp(null)}
                      className="p-1 text-slate-600 hover:scale-115 transition-all duration-150 cursor-pointer focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                          isFilled
                            ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]'
                            : 'text-slate-600 hover:text-yellow-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-semibold text-yellow-300 transition-all">
                {helpLabels[hoverHelp !== null ? hoverHelp : learningHelp]}
              </p>
            </div>

            {/* CÂU 3: Em thích tính năng nào nhất? */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2.5">
              <label className="block text-xs font-bold text-pink-200 tracking-wider uppercase">
                3. Em thích tính năng nào nhất?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {POPULAR_FEATURES.map((feat) => {
                  const isSelected = favoriteFeature === feat.label;
                  return (
                    <button
                      type="button"
                      key={feat.id}
                      onClick={() => {
                        setFavoriteFeature(feat.label);
                        soundManager.playClickSound();
                      }}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border-indigo-400 text-white shadow-md shadow-indigo-950'
                          : 'bg-slate-900/60 border-slate-700/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="shrink-0">{featureIcons[feat.id] || <Sparkles className="w-4 h-4" />}</div>
                      <span className="flex-1 leading-snug">{feat.label}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CÂU 4: Góp ý thêm */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-emerald-200 tracking-wider uppercase">
                  4. Góp ý thêm cho MathBot (Không bắt buộc)
                </label>
                <span className="text-[10px] text-slate-400">{comments.length}/300 ký tự</span>
              </div>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value.slice(0, 300))}
                rows={3}
                placeholder="Ví dụ: Em muốn MathBot thêm nhiều bài toán vui về hình học, hoặc giọng đọc lời giải..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
              />
            </div>

            {/* Buttons Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handlePostpone}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer order-2 sm:order-1"
              >
                <Clock className="w-4 h-4" />
                <span>Để sau (Nhắc em sau)</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 order-1 sm:order-2"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang gửi...' : 'Gửi Khảo Sát (+25 XP)'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
