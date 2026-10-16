import React, { useState } from 'react';
import { useMathVerse } from '../context/MathVerseContext';
import { CURRICULUM_DATA } from '../data/curriculumData';
import { QUESTIONS_DATA } from '../data/questionsData';
import { MistakeRecord } from '../types/mathverse';
import {
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  Flame,
  Clock,
  Layers,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
  Award,
  Zap,
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';
import {
  generateSimilarQuestionSet,
  GeneratedQuestion,
} from '../utils/aiQuestionGenerator';

type ReviewViewTab = 'recent' | 'most_mistakes' | 'weak_topics';
type ReviewStatusFilter = 'all' | 'pending' | 'understood';

export const SmartReviewMode: React.FC = () => {
  const {
    user,
    setActiveTab,
    setSelectedLessonId,
    recordQuestionResult,
    markMistakeAsUnderstood,
    removeMistake,
  } = useMathVerse();

  const mistakes = user?.recentMistakes || [];

  // Active view tab
  const [activeTabMode, setActiveTabMode] = useState<ReviewViewTab>('recent');
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>('all');

  // Retry state
  const [retryQuestionId, setRetryQuestionId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [retryInput, setRetryInput] = useState<string>('');
  const [retryFeedback, setRetryFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);

  // Expanded explanations
  const [expandedExplanationMap, setExpandedExplanationMap] = useState<Record<string, boolean>>({});

  // AI Similar questions state
  const [activeSimilarPanelQuestionId, setActiveSimilarPanelQuestionId] = useState<string | null>(null);
  const [similarQuestionsMap, setSimilarQuestionsMap] = useState<Record<string, GeneratedQuestion[]>>({});
  const [activeSimilarIndexMap, setActiveSimilarIndexMap] = useState<Record<string, number>>({});
  const [similarSelectedOptionMap, setSimilarSelectedOptionMap] = useState<Record<string, string>>({});
  const [similarFeedbackMap, setSimilarFeedbackMap] = useState<
    Record<string, { isCorrect: boolean; message: string } | null>
  >({});
  const [showSimilarHintMap, setShowSimilarHintMap] = useState<Record<string, boolean>>({});

  // 1. Calculate weak topics statistics
  const topicStatsMap: Record<
    string,
    { mistakeCount: number; questions: MistakeRecord[]; totalAttempted: number; correctCount: number }
  > = {};

  mistakes.forEach((m) => {
    const t = m.topic || 'Toán học';
    if (!topicStatsMap[t]) {
      const userTopicStat = user?.topicStats?.[t] || { correct: 0, total: 0 };
      topicStatsMap[t] = {
        mistakeCount: 0,
        questions: [],
        totalAttempted: userTopicStat.total,
        correctCount: userTopicStat.correct,
      };
    }
    topicStatsMap[t].mistakeCount += (m.mistakeCount || 1);
    topicStatsMap[t].questions.push(m);
  });

  const weakTopicsList = Object.entries(topicStatsMap)
    .sort((a, b) => b[1].mistakeCount - a[1].mistakeCount)
    .map(([topic, data]) => {
      const accuracy =
        data.totalAttempted > 0 ? Math.round((data.correctCount / data.totalAttempted) * 100) : 0;
      return {
        topic,
        mistakeCount: data.mistakeCount,
        questions: data.questions,
        accuracy,
      };
    });

  // Filter mistakes according to statusFilter
  const filteredMistakes = mistakes.filter((m) => {
    if (statusFilter === 'pending') return !m.isUnderstood;
    if (statusFilter === 'understood') return !!m.isUnderstood;
    return true;
  });

  // Sort according to activeTabMode
  let displayedMistakes = [...filteredMistakes];
  if (activeTabMode === 'recent') {
    // 1. Những câu sai gần đây (mới nhất lên đầu)
    displayedMistakes.sort((a, b) => b.timestamp - a.timestamp);
  } else if (activeTabMode === 'most_mistakes') {
    // 2. Những câu sai nhiều nhất (mistakeCount cao nhất lên đầu)
    displayedMistakes.sort((a, b) => (b.mistakeCount || 1) - (a.mistakeCount || 1));
  }

  const pendingCount = mistakes.filter((m) => !m.isUnderstood).length;
  const understoodCount = mistakes.filter((m) => m.isUnderstood).length;
  const highMistakeCount = mistakes.filter((m) => (m.mistakeCount || 1) >= 2).length;

  const toggleExplanation = (qId: string) => {
    setExpandedExplanationMap((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const handleStartRetry = (m: MistakeRecord) => {
    soundManager.playClickSound();
    setRetryQuestionId(m.questionId);
    setRetryInput('');
    setSelectedOption('');
    setRetryFeedback(null);
  };

  const handleRetrySubmit = (m: MistakeRecord) => {
    const qObj = QUESTIONS_DATA.find((q) => q.id === m.questionId);
    let chosenAnswer = selectedOption || retryInput.trim();

    if (!chosenAnswer) return;

    let isCorrect = false;

    if (qObj) {
      if (typeof qObj.correctAnswer === 'boolean') {
        const boolVal = chosenAnswer === 'true' || chosenAnswer.toLowerCase() === 'đúng';
        isCorrect = boolVal === qObj.correctAnswer;
      } else {
        const cleanChosen = String(chosenAnswer).trim().toLowerCase().replace(',', '.');
        const cleanCorrect = String(qObj.correctAnswer).trim().toLowerCase().replace(',', '.');
        const numChosen = parseFloat(cleanChosen);
        const numCorrect = parseFloat(cleanCorrect);
        const numbersMatch = !isNaN(numChosen) && !isNaN(numCorrect) && numChosen === numCorrect;
        isCorrect = cleanChosen === cleanCorrect || numbersMatch;
      }
    } else {
      const cleanChosen = String(chosenAnswer).trim().toLowerCase().replace(',', '.');
      const cleanCorrect = String(m.correctAnswer).trim().toLowerCase().replace(',', '.');
      const numChosen = parseFloat(cleanChosen);
      const numCorrect = parseFloat(cleanCorrect);
      const numbersMatch = !isNaN(numChosen) && !isNaN(numCorrect) && numChosen === numCorrect;
      isCorrect = cleanChosen === cleanCorrect || numbersMatch;
    }

    if (isCorrect) {
      soundManager.playCorrectSound();
      soundManager.triggerConfetti();
      setRetryFeedback({
        isCorrect: true,
        message: '🎉 Chính xác tuyệt đối! Em đã khắc phục hoàn toàn lỗi sai này và được cộng +25 XP!',
      });
      // Ghi nhận kết quả đúng và tự động đánh dấu đã hiểu
      recordQuestionResult(
        m.questionId,
        true,
        m.topic,
        m.questionText,
        chosenAnswer,
        m.correctAnswer,
        m.explanation,
        25
      );
      markMistakeAsUnderstood(m.questionId);
    } else {
      soundManager.playWrongSound();
      setRetryFeedback({
        isCorrect: false,
        message: '⚠ Vẫn chưa chính xác. Hãy xem kỹ lại công thức và các bước gợi ý bên dưới nhé!',
      });
      // Ghi nhận làm sai lại để tăng mistakeCount
      recordQuestionResult(
        m.questionId,
        false,
        m.topic,
        m.questionText,
        chosenAnswer,
        m.correctAnswer,
        m.explanation,
        0
      );
    }
  };

  // =========================================================================
  // XỬ LÝ AI TẠO BÀI TƯƠNG TỰ (SIMILAR QUESTION GENERATOR)
  // =========================================================================
  const handleToggleSimilar = (m: MistakeRecord) => {
    soundManager.playClickSound();
    if (activeSimilarPanelQuestionId === m.questionId) {
      setActiveSimilarPanelQuestionId(null);
      return;
    }

    setActiveSimilarPanelQuestionId(m.questionId);

    // Nếu chưa sinh bộ câu hỏi cho lỗi sai này, tiến hành sinh bộ 3 câu
    if (!similarQuestionsMap[m.questionId] || similarQuestionsMap[m.questionId].length === 0) {
      const generatedList = generateSimilarQuestionSet(
        m.questionText,
        m.topic,
        3,
        String(m.correctAnswer)
      );
      setSimilarQuestionsMap((prev) => ({ ...prev, [m.questionId]: generatedList }));
      setActiveSimilarIndexMap((prev) => ({ ...prev, [m.questionId]: 0 }));
    }

    // Đóng khung làm lại nếu đang mở
    if (retryQuestionId === m.questionId) {
      setRetryQuestionId(null);
    }
  };

  const handleRegenerateSimilar = (m: MistakeRecord) => {
    soundManager.playClickSound();
    const generatedList = generateSimilarQuestionSet(
      m.questionText,
      m.topic,
      3,
      String(m.correctAnswer)
    );
    setSimilarQuestionsMap((prev) => ({ ...prev, [m.questionId]: generatedList }));
    setActiveSimilarIndexMap((prev) => ({ ...prev, [m.questionId]: 0 }));
    setSimilarSelectedOptionMap((prev) => ({ ...prev, [m.questionId]: '' }));
    setSimilarFeedbackMap((prev) => ({ ...prev, [m.questionId]: null }));
    setShowSimilarHintMap((prev) => ({ ...prev, [m.questionId]: false }));
  };

  const handleSelectSimilarQuestion = (mQuestionId: string, index: number) => {
    soundManager.playClickSound();
    setActiveSimilarIndexMap((prev) => ({ ...prev, [mQuestionId]: index }));
    setSimilarSelectedOptionMap((prev) => ({ ...prev, [mQuestionId]: '' }));
    setSimilarFeedbackMap((prev) => ({ ...prev, [mQuestionId]: null }));
    setShowSimilarHintMap((prev) => ({ ...prev, [mQuestionId]: false }));
  };

  const handleCheckSimilarAnswer = (m: MistakeRecord) => {
    const list = similarQuestionsMap[m.questionId] || [];
    const currentIdx = activeSimilarIndexMap[m.questionId] || 0;
    const currentQ = list[currentIdx];
    if (!currentQ) return;

    const chosen = similarSelectedOptionMap[m.questionId];
    if (!chosen) return;

    const cleanChosen = String(chosen).trim().toLowerCase().replace(',', '.');
    const cleanCorrect = String(currentQ.correctAnswer).trim().toLowerCase().replace(',', '.');
    const numChosen = parseFloat(cleanChosen);
    const numCorrect = parseFloat(cleanCorrect);
    const numbersMatch = !isNaN(numChosen) && !isNaN(numCorrect) && numChosen === numCorrect;
    const isCorrect = cleanChosen === cleanCorrect || numbersMatch;

    if (isCorrect) {
      soundManager.playCorrectSound();
      soundManager.triggerConfetti();
      setSimilarFeedbackMap((prev) => ({
        ...prev,
        [m.questionId]: {
          isCorrect: true,
          message: '🎉 Xuất sắc! Em đã hoàn thành đúng bài tập tương tự do AI sinh và nhận +20 XP!',
        },
      }));
      // Ghi nhận XP và cập nhật năng lực
      recordQuestionResult(
        `similar-${currentQ.id}`,
        true,
        currentQ.topic,
        currentQ.question,
        chosen,
        currentQ.correctAnswer,
        currentQ.explanation,
        20
      );
    } else {
      soundManager.playWrongSound();
      setSimilarFeedbackMap((prev) => ({
        ...prev,
        [m.questionId]: {
          isCorrect: false,
          message: '⚠ Chưa chính xác! Hãy đọc kỹ phương pháp giải từng bước bên dưới để hiểu rõ nhé.',
        },
      }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
          <RotateCcw className="w-7 h-7 text-violet-400" />
          <span>Ôn tập lỗi sai (Smart Review)</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Luyện tập lại các câu hỏi đã làm sai, theo dõi số lần sai và đánh dấu đã hiểu để xóa lỗ hổng kiến thức.
        </p>
      </div>

      {/* Hộp cảnh báo an toàn & độ tin cậy AI */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-200/90 text-xs sm:text-sm flex items-start gap-3 shadow-md">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <div className="font-bold text-amber-300 text-xs sm:text-sm flex items-center gap-1.5">
            <span>⚠ Lưu ý:</span>
          </div>
          <p className="text-[11px] sm:text-xs text-amber-100/90 leading-relaxed">
            AI chỉ là công cụ hỗ trợ học tập. AI có thể đưa ra lời giải chưa chính xác hoặc bỏ sót bước. Hãy tự kiểm tra kết quả hoặc hỏi giáo viên khi cần.
          </p>
        </div>
      </div>

      {/* 4 Thống kê tổng quan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tổng câu đã sai</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {mistakes.length}
          </div>
          <div className="text-[11px] text-slate-400">Câu hỏi trong sổ tay</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Sai nhiều lần (≥2)</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
            {highMistakeCount}
          </div>
          <div className="text-[11px] text-slate-400">Cần ưu tiên ôn gấp</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Đã đánh dấu hiểu</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
            {understoodCount}
          </div>
          <div className="text-[11px] text-slate-400">Đã nắm vững kiến thức</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-violet-500/30 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Chuyên đề yếu nhất</span>
            <Layers className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-violet-300 truncate font-mono">
            {weakTopicsList[0]?.topic || 'Chưa có'}
          </div>
          <div className="text-[11px] text-slate-400">
            {weakTopicsList[0] ? `${weakTopicsList[0].mistakeCount} lượt sai` : 'Phong độ tốt'}
          </div>
        </div>
      </div>

      {/* 3 Tab chính theo yêu cầu đề bài */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        {/* Navigation Tabs: Gần đây | Sai nhiều nhất | Chuyên đề yếu nhất */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 self-start sm:self-auto overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setActiveTabMode('recent');
              soundManager.playClickSound();
            }}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTabMode === 'recent'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>1. Câu sai gần đây</span>
          </button>

          <button
            onClick={() => {
              setActiveTabMode('most_mistakes');
              soundManager.playClickSound();
            }}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTabMode === 'most_mistakes'
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-300" />
            <span>2. Sai nhiều nhất ({highMistakeCount})</span>
          </button>

          <button
            onClick={() => {
              setActiveTabMode('weak_topics');
              soundManager.playClickSound();
            }}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTabMode === 'weak_topics'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3. Chuyên đề yếu nhất</span>
          </button>
        </div>

        {/* Filter status buttons (áp dụng cho tab recent và most_mistakes) */}
        {activeTabMode !== 'weak_topics' && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] hidden sm:inline">Lọc:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Tất cả ({mistakes.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-300'
              }`}
            >
              Chưa hiểu ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('understood')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                statusFilter === 'understood'
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-300'
              }`}
            >
              Đã hiểu ({understoodCount})
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* NỘI DUNG THEO TỪNG TAB */}
      {/* ========================================================================= */}

      {/* TAB 3: NHỮNG CHUYÊN ĐỀ YẾU NHẤT */}
      {activeTabMode === 'weak_topics' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-400" />
              <span>Bảng xếp hạng các chuyên đề học sinh cần củng cố</span>
            </h3>
            <p className="text-xs text-slate-400">
              Tổng hợp số lượng lỗi sai tích lũy và tỷ lệ chính xác của từng phân môn môn Toán.
            </p>
          </div>

          {weakTopicsList.length === 0 ? (
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <p className="text-sm text-slate-300 font-semibold">
                ✨ Chưa ghi nhận chuyên đề nào bị yếu!
              </p>
              <p className="text-xs text-slate-400">
                Khi học sinh làm bài tập và mắc lỗi sai, hệ thống sẽ tự động phân loại chuyên đề tại đây.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weakTopicsList.map((wt) => {
                const lessons = CURRICULUM_DATA.filter((l) =>
                  l.topic.toLowerCase().includes(wt.topic.toLowerCase())
                ).slice(0, 2);

                return (
                  <div
                    key={wt.topic}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-violet-500/40 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">{wt.topic}</span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                          {wt.mistakeCount} lượt sai
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-cyan-400">
                        {wt.accuracy}% đúng
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full ${
                          wt.accuracy >= 70
                            ? 'bg-emerald-500'
                            : wt.accuracy >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${wt.accuracy || 5}%` }}
                      />
                    </div>

                    <p className="text-xs text-slate-300">
                      Có <strong>{wt.questions.length} câu hỏi</strong> đang nằm trong danh sách cần ôn lại thuộc chuyên đề này.
                    </p>

                    {/* Recommended Lessons */}
                    {lessons.length > 0 && (
                      <div className="pt-2 space-y-1.5 border-t border-slate-800">
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          Bài học đề xuất từ SGK Kết nối tri thức:
                        </div>
                        {lessons.map((l) => (
                          <button
                            key={l.id}
                            onClick={() => {
                              setSelectedLessonId(l.id);
                              setActiveTab('lessons');
                              soundManager.playClickSound();
                            }}
                            className="w-full text-left p-2 rounded-xl bg-slate-950 hover:bg-violet-950/40 border border-slate-800 hover:border-violet-400 transition-colors flex items-center justify-between group cursor-pointer"
                          >
                            <span className="text-xs text-white group-hover:text-violet-300 truncate pr-2">
                              {l.title}
                            </span>
                            <span className="text-[10px] text-violet-400 shrink-0 flex items-center gap-0.5">
                              Ôn ngay <ArrowRight className="w-3 h-3" />
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 1 & 2: DANH SÁCH CÂU HỎI LỖI SAI (GẦN ĐÂY HOẶC SAI NHIỀU NHẤT) */}
      {activeTabMode !== 'weak_topics' && (
        <div className="space-y-4">
          {displayedMistakes.length === 0 ? (
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <div className="text-5xl">🎉</div>
              <h3 className="text-lg font-bold text-white">
                {statusFilter === 'pending'
                  ? 'Tuyệt vời! Em không còn câu hỏi nào chưa hiểu.'
                  : 'Chưa có câu hỏi nào trong danh sách này!'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Hãy qua mục Luyện tập hoặc Trắc nghiệm để tiếp tục làm bài. Nếu gặp câu hỏi chưa làm được, hệ thống sẽ tự động lưu lại vào sổ tay này nhé!
              </p>
              <button
                onClick={() => {
                  setActiveTab('practice');
                  soundManager.playClickSound();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs cursor-pointer"
              >
                Vào Luyện tập ngay
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedMistakes.map((m, idx) => {
                const isRetrying = retryQuestionId === m.questionId;
                const isExpanded = !!expandedExplanationMap[m.questionId];
                const mistakeCount = m.mistakeCount || 1;
                const qObj = QUESTIONS_DATA.find((q) => q.id === m.questionId);

                const dateFormatted = new Date(m.timestamp).toLocaleString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={m.questionId || idx}
                    className={`p-5 sm:p-6 rounded-2xl bg-slate-900 border transition-all space-y-4 ${
                      m.isUnderstood
                        ? 'border-emerald-500/30 bg-slate-900/60'
                        : mistakeCount >= 2
                        ? 'border-rose-500/40 shadow-lg shadow-rose-950/20'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Header Card: Chuyên đề, Số lần sai, Trạng thái */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {m.topic}
                        </span>

                        {/* Yêu cầu: Hiển thị số lần sai */}
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border ${
                            mistakeCount >= 3
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : mistakeCount === 2
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>Đã sai {mistakeCount} lần</span>
                        </span>

                        {m.isUnderstood && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã hiểu</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono text-[11px]">{dateFormatted}</span>
                        <button
                          onClick={() => removeMistake(m.questionId)}
                          title="Xóa câu này khỏi sổ tay lỗi sai"
                          className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Nội dung câu hỏi */}
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-white leading-snug">
                        {m.questionText}
                      </h4>
                    </div>

                    {/* So sánh đáp án */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 space-y-0.5">
                        <div className="text-[10px] uppercase font-bold text-rose-400">
                          Đáp án trước đây của em:
                        </div>
                        <div className="font-semibold text-white font-mono">
                          {String(m.userAnswer)}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 space-y-0.5">
                        <div className="text-[10px] uppercase font-bold text-emerald-400">
                          Đáp án chính xác:
                        </div>
                        <div className="font-semibold text-white font-mono">
                          {String(m.correctAnswer)}
                        </div>
                      </div>
                    </div>

                    {/* Hướng dẫn giải chi tiết (Có thể mở rộng / thu gọn) */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => toggleExplanation(m.questionId)}
                          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                          <span>Hướng dẫn giải chi tiết</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed pt-1 border-t border-slate-800/80 animate-in fade-in duration-150">
                          {m.explanation}
                        </div>
                      )}
                    </div>

                    {/* ========================================================================= */}
                    {/* BỘ NÚT HÀNH ĐỘNG: LÀM LẠI CÂU SAI & TẠO BÀI TƯƠNG TỰ & ĐÁNH DẤU ĐÃ HIỂU */}
                    {/* ========================================================================= */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Nút 1: Làm lại câu sai */}
                        {!isRetrying ? (
                          <button
                            onClick={() => handleStartRetry(m)}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Làm lại câu này</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setRetryQuestionId(null)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                          >
                            Đóng phần làm lại
                          </button>
                        )}

                        {/* Nút 2: Tạo bài tương tự (AI Sinh câu hỏi dựa trên câu làm sai) */}
                        <button
                          onClick={() => handleToggleSimilar(m)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 ${
                            activeSimilarPanelQuestionId === m.questionId
                              ? 'bg-purple-600 text-white border border-purple-400 shadow-purple-600/30'
                              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-600/20'
                          }`}
                          title="AI tự động phân tích dạng toán và tạo bộ câu hỏi tương tự với số liệu mới"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>
                            {activeSimilarPanelQuestionId === m.questionId
                              ? 'Đóng bài tương tự'
                              : 'Tạo bài tương tự'}
                          </span>
                        </button>

                        {/* Nút 3: Đánh dấu đã hiểu */}
                        <button
                          onClick={() => markMistakeAsUnderstood(m.questionId)}
                          disabled={m.isUnderstood}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            m.isUnderstood
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-emerald-500/40 active:scale-95'
                          }`}
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 ${m.isUnderstood ? 'text-emerald-400' : 'text-slate-400'}`} />
                          <span>{m.isUnderstood ? 'Đã hiểu bài' : 'Đánh dấu đã hiểu (+15 XP)'}</span>
                        </button>
                      </div>
                    </div>

                    {/* KHUNG LÀM LẠI TƯƠNG TÁC (INTERACTIVE RETRY) */}
                    {isRetrying && (
                      <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 space-y-3 animate-in fade-in">
                        <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-cyan-400" />
                          <span>Chọn hoặc nhập đáp án đúng để hoàn thành câu hỏi:</span>
                        </div>

                        {/* Nếu câu hỏi có danh sách options (Trắc nghiệm ABCD) */}
                        {qObj?.options && qObj.options.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {qObj.options.map((opt, oIdx) => (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => setSelectedOption(opt)}
                                className={`p-2.5 rounded-xl border text-xs text-left font-medium transition-all cursor-pointer ${
                                  selectedOption === opt
                                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-md'
                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : qObj?.type === 'true_false' ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedOption('true')}
                              className={`flex-1 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                selectedOption === 'true'
                                  ? 'bg-emerald-600 text-white border-emerald-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              Đúng
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedOption('false')}
                              className={`flex-1 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                selectedOption === 'false'
                                  ? 'bg-rose-600 text-white border-rose-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              Sai
                            </button>
                          </div>
                        ) : (
                          /* Trường hợp câu tự luận điền số hoặc văn bản */
                          <input
                            type="text"
                            value={retryInput}
                            onChange={(e) => setRetryInput(e.target.value)}
                            placeholder="Nhập đáp án chính xác sau khi đọc hướng dẫn..."
                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                          />
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => handleRetrySubmit(m)}
                            disabled={!selectedOption && !retryInput.trim()}
                            className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-transform active:scale-95"
                          >
                            Kiểm tra kết quả
                          </button>
                        </div>

                        {retryFeedback && (
                          <div
                            className={`p-3 rounded-xl text-xs font-semibold ${
                              retryFeedback.isCorrect
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/50'
                                : 'bg-rose-950/60 text-rose-300 border border-rose-500/50'
                            }`}
                          >
                            {retryFeedback.message}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ========================================================================= */}
                    {/* KHUNG AI TẠO BÀI TƯƠNG TỰ (AI SIMILAR QUESTION WORKSPACE) */}
                    {/* ========================================================================= */}
                    {activeSimilarPanelQuestionId === m.questionId &&
                      similarQuestionsMap[m.questionId] &&
                      similarQuestionsMap[m.questionId].length > 0 && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/40 space-y-4 animate-in fade-in shadow-xl shadow-purple-950/30">
                          {/* Header của bài tập tương tự */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-purple-500/20">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                                <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
                              </div>
                              <div>
                                <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                                  <span>AI đã nhận diện dạng bài:</span>
                                  <span className="text-purple-300 font-extrabold">
                                    {similarQuestionsMap[m.questionId][activeSimilarIndexMap[m.questionId] || 0]?.templateName ||
                                      'Toán học tương tự'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-purple-200/70">
                                  Dữ liệu ngẫu nhiên mới 100% – Rèn luyện phản xạ không lo lặp lại lỗi sai cũ
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleRegenerateSimilar(m)}
                                className="px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                                title="Sinh bộ bài toán mới với số liệu ngẫu nhiên khác"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Đổi bộ bài khác</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveSimilarPanelQuestionId(null)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer"
                              >
                                Đóng
                              </button>
                            </div>
                          </div>

                          {/* Bộ chọn danh sách câu tương tự (Ví dụ: 3 câu tương tự như 7/8 + 1/4, 3/7 + 2/7, 4/5 + 1/10) */}
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-bold text-purple-300 flex items-center justify-between">
                              <span>
                                Bộ {similarQuestionsMap[m.questionId].length} câu tương tự do AI sinh:
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {similarQuestionsMap[m.questionId].map((sq, sIdx) => {
                                const isSelected = (activeSimilarIndexMap[m.questionId] || 0) === sIdx;
                                return (
                                  <button
                                    key={sq.id || sIdx}
                                    type="button"
                                    onClick={() => handleSelectSimilarQuestion(m.questionId, sIdx)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-purple-600 text-white border border-purple-300 shadow-md shadow-purple-600/30'
                                        : 'bg-slate-900/90 text-purple-200/80 border border-purple-500/30 hover:border-purple-400 hover:text-white'
                                    }`}
                                  >
                                    <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px] font-bold">
                                      {sIdx + 1}
                                    </span>
                                    <span className="font-mono text-[11px]">
                                      {sq.mathExpression ? sq.mathExpression.replace(' = ?', '') : `Câu ${sIdx + 1}`}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Chi tiết câu hỏi tương tự đang được chọn */}
                          {similarQuestionsMap[m.questionId][activeSimilarIndexMap[m.questionId] || 0] && (() => {
                            const activeQ = similarQuestionsMap[m.questionId][activeSimilarIndexMap[m.questionId] || 0];
                            const curChosen = similarSelectedOptionMap[m.questionId];
                            const curFeedback = similarFeedbackMap[m.questionId];
                            const isShowingHint = !!showSimilarHintMap[m.questionId];
                            const curIdx = activeSimilarIndexMap[m.questionId] || 0;
                            const totalSimilar = similarQuestionsMap[m.questionId].length;

                            return (
                              <div className="p-4 rounded-xl bg-slate-950/70 border border-purple-500/30 space-y-3">
                                <div className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                                  {activeQ.question}
                                </div>

                                {activeQ.mathExpression && (
                                  <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-500/30 text-center font-mono text-sm sm:text-base font-bold text-purple-200">
                                    {activeQ.mathExpression}
                                  </div>
                                )}

                                {/* Lựa chọn phương án */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                  {activeQ.options.map((opt, optIdx) => {
                                    const isOptSelected = curChosen === opt;
                                    return (
                                      <button
                                        key={optIdx}
                                        type="button"
                                        onClick={() => {
                                          setSimilarSelectedOptionMap((prev) => ({
                                            ...prev,
                                            [m.questionId]: opt,
                                          }));
                                          setSimilarFeedbackMap((prev) => ({
                                            ...prev,
                                            [m.questionId]: null,
                                          }));
                                        }}
                                        className={`p-2.5 rounded-xl border text-xs text-left font-medium transition-all cursor-pointer flex items-center justify-between ${
                                          isOptSelected
                                            ? 'bg-purple-600 text-white border-purple-300 shadow-md'
                                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-purple-500/50 hover:text-white'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-[10px] font-bold">
                                            {String.fromCharCode(65 + optIdx)}
                                          </span>
                                          <span className="font-mono text-xs">{opt}</span>
                                        </div>
                                        {isOptSelected && <Check className="w-3.5 h-3.5" />}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Các nút hành động: Gợi ý & Kiểm tra */}
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowSimilarHintMap((prev) => ({
                                        ...prev,
                                        [m.questionId]: !prev[m.questionId],
                                      }))
                                    }
                                    className="text-xs font-semibold text-purple-300 hover:text-purple-200 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                                    <span>{isShowingHint ? 'Ẩn gợi ý' : 'Xem gợi ý giải'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleCheckSimilarAnswer(m)}
                                    disabled={!curChosen}
                                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-transform active:scale-95 flex items-center gap-1.5"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Kiểm tra kết quả</span>
                                  </button>
                                </div>

                                {/* Hiển thị Gợi ý */}
                                {isShowingHint && activeQ.hint && (
                                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed animate-in fade-in">
                                    <strong>💡 Gợi ý của AI:</strong> {activeQ.hint}
                                  </div>
                                )}

                                {/* Phản hồi sau khi bấm kiểm tra */}
                                {curFeedback && (
                                  <div
                                    className={`p-3.5 rounded-xl text-xs space-y-2 animate-in fade-in ${
                                      curFeedback.isCorrect
                                        ? 'bg-emerald-950/60 text-emerald-200 border border-emerald-500/50'
                                        : 'bg-rose-950/60 text-rose-200 border border-rose-500/50'
                                    }`}
                                  >
                                    <div className="font-bold flex items-center gap-1.5 text-sm">
                                      {curFeedback.isCorrect ? (
                                        <>
                                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                          <span>{curFeedback.message}</span>
                                        </>
                                      ) : (
                                        <>
                                          <AlertCircle className="w-4 h-4 text-rose-400" />
                                          <span>{curFeedback.message}</span>
                                        </>
                                      )}
                                    </div>

                                    {/* Lời giải chi tiết từng bước của câu tương tự */}
                                    <div className="p-3 rounded-lg bg-black/40 border border-white/10 text-slate-200 whitespace-pre-line leading-relaxed font-sans text-xs">
                                      {activeQ.explanation}
                                    </div>

                                    {/* Nút chuyển sang câu tương tự tiếp theo */}
                                    {curIdx < totalSimilar - 1 && (
                                      <div className="pt-1 flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleSelectSimilarQuestion(m.questionId, curIdx + 1)
                                          }
                                          className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                                        >
                                          <span>Làm tiếp câu {curIdx + 2}/{totalSimilar}</span>
                                          <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
