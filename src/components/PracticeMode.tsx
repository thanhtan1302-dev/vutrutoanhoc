import React, { useState, useEffect, useRef } from 'react';
import { Question } from '../types/mathverse';
import { useMathVerse } from '../context/MathVerseContext';
import { QUESTIONS_DATA } from '../data/questionsData';
import { CURRICULUM_DATA } from '../data/curriculumData';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Award,
  Lightbulb,
  Check,
  ChevronRight,
  Filter,
  Cloud,
  CloudOff,
  CloudCheck,
  RefreshCw,
  Trophy,
  History,
  BookOpen,
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';
import { formatMathNotation } from '../utils/formatMath';
import {
  isSupabaseConfigured,
  saveLearningProgress,
  fetchLessonProgress,
  saveLearningResult,
} from '../lib/supabaseClient';

export const PracticeMode: React.FC = () => {
  const {
    user,
    selectedLessonId,
    setSelectedLessonId,
    recordQuestionResult,
    completeLesson,
    isSupabaseConnected,
  } = useMathVerse();

  const currentGrade = user?.grade || 6;

  // Filter pool of questions
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // User input states for different question types
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [fillInAnswer, setFillInAnswer] = useState<string>('');
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<boolean | null>(null);
  const [selectedErrorStep, setSelectedErrorStep] = useState<number | null>(null);

  // Matching pair states
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({});

  // Result state
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);

  // Supabase Cloud Progress & Results Tracking
  const [cloudSaveStatus, setCloudSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [resumePrompt, setResumePrompt] = useState<{
    currentQuestion: number;
    total: number;
    percent: number;
    answers?: Record<string, any>;
  } | null>(null);
  const [sessionAnswers, setSessionAnswers] = useState<
    Record<string, { answer: string; isCorrect: boolean }>
  >({});
  const [sessionCorrectCount, setSessionCorrectCount] = useState<number>(0);
  const [sessionWrongCount, setSessionWrongCount] = useState<number>(0);
  const [isLessonFinished, setIsLessonFinished] = useState<boolean>(false);
  const [isCompletingCloud, setIsCompletingCloud] = useState<boolean>(false);

  // Current Lesson Info
  const currentLesson = React.useMemo(() => {
    if (!selectedLessonId) return null;
    return CURRICULUM_DATA.find((l) => l.id === selectedLessonId) || null;
  }, [selectedLessonId]);

  // Filter questions according to selected lesson or grade/topic
  const availableQuestions: Question[] = React.useMemo(() => {
    let pool = QUESTIONS_DATA;

    if (selectedLessonId) {
      const lesson = CURRICULUM_DATA.find((l) => l.id === selectedLessonId);
      if (lesson && lesson.practiceQuestionIds?.length > 0) {
        const lessonPool = pool.filter((q) => lesson.practiceQuestionIds.includes(q.id));
        if (lessonPool.length > 0) return lessonPool;
      }
    }

    pool = pool.filter((q) => q.grade === currentGrade);
    if (topicFilter !== 'all') {
      pool = pool.filter((q) => q.topic === topicFilter);
    }

    return pool.length > 0 ? pool : QUESTIONS_DATA.slice(0, 5);
  }, [selectedLessonId, currentGrade, topicFilter]);

  const currentQ: Question | undefined = availableQuestions[currentIndex] || availableQuestions[0];

  // 1. Kiểm tra tiến độ đang làm dở từ Supabase khi mở bài học
  useEffect(() => {
    let isCancelled = false;

    async function checkCloudResume() {
      if (!user?.id || !selectedLessonId || !isSupabaseConfigured()) {
        return;
      }

      try {
        const { data: progress, error } = await fetchLessonProgress(user.id, selectedLessonId);
        if (error || !progress) return;

        if (
          !isCancelled &&
          progress.status === 'in_progress' &&
          progress.current_question > 0 &&
          progress.current_question < availableQuestions.length
        ) {
          setResumePrompt({
            currentQuestion: progress.current_question,
            total: availableQuestions.length,
            percent: progress.progress_percent,
            answers: progress.answers,
          });
        }
      } catch (e) {
        console.warn('Lỗi kiểm tra tiến độ dở:', e);
      }
    }

    checkCloudResume();

    return () => {
      isCancelled = true;
    };
  }, [selectedLessonId, user?.id, availableQuestions.length]);

  // Reset answer states when question changes
  useEffect(() => {
    setSelectedOption(null);
    setFillInAnswer('');
    setTrueFalseAnswer(null);
    setSelectedErrorStep(null);
    setSelectedLeft(null);
    setMatchedPairs({});
    setIsSubmitted(false);
    setIsCorrect(false);
    setShowHint(false);
  }, [currentIndex, selectedLessonId, topicFilter]);

  // Đảm bảo currentIndex luôn hợp lệ khi bộ câu hỏi thay đổi do lọc chuyên đề/bài học
  useEffect(() => {
    if (availableQuestions.length > 0 && currentIndex >= availableQuestions.length) {
      setCurrentIndex(0);
    }
  }, [availableQuestions.length, currentIndex]);

  // Hàm tự động lưu tiến độ vào bảng `learning_progress` trên Supabase (Upsert)
  const saveProgressToCloud = async (
    qIndex: number,
    updatedAnswers: Record<string, any>,
    status: 'in_progress' | 'completed' = 'in_progress'
  ) => {
    if (!user?.id || !isSupabaseConfigured()) return;

    setCloudSaveStatus('saving');
    const lessonTitle = currentLesson?.title || (selectedLessonId ? `Bài học ${selectedLessonId}` : `Luyện tập Lớp ${currentGrade}`);
    const topic = currentLesson?.topic || (currentQ?.topic || 'Toán THCS');
    const percent = Math.min(Math.round(((qIndex + 1) / availableQuestions.length) * 100), 100);

    const { error } = await saveLearningProgress({
      user_id: user.id,
      lesson_id: selectedLessonId || `practice-grade-${currentGrade}-${topicFilter}`,
      lesson_title: lessonTitle,
      grade_level: currentGrade,
      topic,
      current_question: qIndex,
      answers: updatedAnswers,
      progress_percent: percent,
      status,
    });

    if (error) {
      setCloudSaveStatus('error');
    } else {
      setCloudSaveStatus('saved');
      setTimeout(() => setCloudSaveStatus('idle'), 2500);
    }
  };

  if (!currentQ) {
    return (
      <div className="p-8 text-center text-slate-400">
        Không có câu hỏi nào cho mục này.
      </div>
    );
  }

  // Handle Matching logic
  const handleLeftClick = (id: string) => {
    if (isSubmitted) return;
    soundManager.playClickSound();
    setSelectedLeft(id);
  };

  const handleRightClick = (rightText: string) => {
    if (isSubmitted || !selectedLeft) return;
    soundManager.playClickSound();
    setMatchedPairs((prev) => ({
      ...prev,
      [selectedLeft]: rightText,
    }));
    setSelectedLeft(null);
  };

  // Submit and evaluate answer
  const handleSubmit = () => {
    if (isSubmitted) return;

    let correct = false;
    let studentAns = '';

    if (currentQ.type === 'multiple_choice') {
      if (!selectedOption) return;
      studentAns = selectedOption;
      correct = selectedOption.trim() === String(currentQ.correctAnswer).trim();
    } else if (currentQ.type === 'fill_in') {
      if (!fillInAnswer.trim()) return;
      studentAns = fillInAnswer.trim();
      const cleanInput = fillInAnswer.trim().replace(/\s+/g, '').replace(',', '.');
      const cleanTarget = String(currentQ.correctAnswer).trim().replace(/\s+/g, '').replace(',', '.');
      const numInput = parseFloat(cleanInput);
      const numTarget = parseFloat(cleanTarget);
      const numbersMatch = !isNaN(numInput) && !isNaN(numTarget) && numInput === numTarget;
      correct = cleanInput === cleanTarget || numbersMatch;
    } else if (currentQ.type === 'true_false') {
      if (trueFalseAnswer === null) return;
      studentAns = trueFalseAnswer ? 'Đúng' : 'Sai';
      correct = trueFalseAnswer === currentQ.correctAnswer;
    } else if (currentQ.type === 'find_error') {
      if (selectedErrorStep === null) return;
      studentAns = `Bước ${selectedErrorStep}`;
      correct = selectedErrorStep === currentQ.correctAnswer;
    } else if (currentQ.type === 'match_formula') {
      if (!currentQ.matchingPairs) return;
      studentAns = 'Ghép đôi';
      const allMatched = currentQ.matchingPairs.every(
        (pair) => matchedPairs[pair.id] === pair.right
      );
      correct = allMatched;
    }

    setIsCorrect(correct);
    setIsSubmitted(true);

    if (correct) {
      setSessionCorrectCount((prev) => prev + 1);
    } else {
      setSessionWrongCount((prev) => prev + 1);
    }

    const updatedAnswers = {
      ...sessionAnswers,
      [currentQ.id]: { answer: studentAns, isCorrect: correct },
    };
    setSessionAnswers(updatedAnswers);

    recordQuestionResult(
      currentQ.id,
      correct,
      currentQ.topic,
      currentQ.question,
      studentAns,
      String(currentQ.correctAnswer),
      currentQ.explanation,
      currentQ.xpReward
    );

    // Tự động lưu tiến độ vào Supabase Cloud sau khi trả lời
    saveProgressToCloud(currentIndex, updatedAnswers, 'in_progress');
  };

  const handleNext = () => {
    soundManager.playClickSound();
    if (currentIndex < availableQuestions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      // Cập nhật câu hỏi hiện tại lên Supabase Cloud
      saveProgressToCloud(nextIdx, sessionAnswers, 'in_progress');
    } else {
      // Đã làm hết tất cả các câu trong bài
      handleFinishLessonSession();
    }
  };

  // Hoàn thành toàn bộ bài luyện tập ➜ Ghi learning_results và đánh dấu learning_progress là completed
  const handleFinishLessonSession = async () => {
    setIsLessonFinished(true);
    setIsCompletingCloud(true);
    soundManager.triggerBigCelebration();

    const lessonId = selectedLessonId || `practice-grade-${currentGrade}-${topicFilter}`;
    const lessonTitle = currentLesson?.title || `Luyện tập Toán Lớp ${currentGrade}`;
    const topic = currentLesson?.topic || (currentQ?.topic || 'Toán THCS');
    const total = availableQuestions.length;
    const score = Math.round((sessionCorrectCount / (total || 1)) * 100) / 10; // Điểm thang 10

    if (selectedLessonId) {
      await completeLesson(selectedLessonId, {
        score,
        correctCount: sessionCorrectCount,
        wrongCount: sessionWrongCount,
        answers: sessionAnswers,
      });
    } else if (user?.id && isSupabaseConfigured()) {
      // Ghi kết quả bài tự chọn vào Supabase
      await saveLearningResult({
        user_id: user.id,
        lesson_id: lessonId,
        lesson_title: lessonTitle,
        grade_level: currentGrade,
        topic,
        score,
        correct_count: sessionCorrectCount,
        wrong_count: sessionWrongCount,
        completion_percent: Math.round((sessionCorrectCount / (total || 1)) * 100),
        answers: sessionAnswers,
      });

      await saveLearningProgress({
        user_id: user.id,
        lesson_id: lessonId,
        lesson_title: lessonTitle,
        grade_level: currentGrade,
        topic,
        current_question: total,
        answers: sessionAnswers,
        progress_percent: 100,
        status: 'completed',
      });
    }

    setIsCompletingCloud(false);
  };

  // Clear specific lesson filter if user wants all questions
  const clearLessonFilter = () => {
    setSelectedLessonId(null);
    setIsLessonFinished(false);
    setCurrentIndex(0);
    setSessionAnswers({});
    setSessionCorrectCount(0);
    setSessionWrongCount(0);
  };

  const distinctTopics = ['all', 'Số học', 'Phân số', 'Đại số', 'Hình học'];

  // GIAO DIỆN HOÀN THÀNH BÀI TẬP (SUMMARY CARD)
  if (isLessonFinished) {
    const total = availableQuestions.length;
    const score = Math.round((sessionCorrectCount / (total || 1)) * 100) / 10;
    const percent = Math.round((sessionCorrectCount / (total || 1)) * 100);

    return (
      <div className="max-w-xl mx-auto space-y-6 pb-12 animate-in zoom-in-95">
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-6">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-lg shadow-indigo-500/25">
            <Trophy className="w-10 h-10 text-white" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Hoàn thành bài luyện tập! 🎉
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {currentLesson?.title || `Chuyên đề: ${topicFilter === 'all' ? 'Toán tổng hợp' : topicFilter}`}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div>
              <div className="text-xs text-slate-400">Điểm số</div>
              <div className="text-2xl font-black text-cyan-400 font-mono mt-0.5">
                {score}/10
              </div>
            </div>
            <div className="border-x border-slate-800">
              <div className="text-xs text-slate-400">Đúng</div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                {sessionCorrectCount}/{total}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Chính xác</div>
              <div className="text-2xl font-black text-purple-400 font-mono mt-0.5">
                {percent}%
              </div>
            </div>
          </div>

          {/* Trạng thái lưu Supabase */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-center gap-2 text-xs">
            {isCompletingCloud ? (
              <span className="text-cyan-400 flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang ghi kết quả vào Supabase PostgreSQL...
              </span>
            ) : user?.isSupabaseAuth ? (
              <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Kết quả đã được lưu vĩnh viễn vào Supabase Cloud.
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1.5">
                <CloudOff className="w-3.5 h-3.5" /> Đã lưu trên máy này (Đăng nhập Supabase để đồng bộ mọi thiết bị).
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                setIsLessonFinished(false);
                setCurrentIndex(0);
                setSessionAnswers({});
                setSessionCorrectCount(0);
                setSessionWrongCount(0);
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Làm lại bài này
            </button>
            <button
              onClick={clearLessonFilter}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-transform"
            >
              <span>Xem bài luyện khác</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* BANNER THÔNG BÁO TIẾP TỤC BÀI ĐANG LÀM DỞ TỪ SUPABASE */}
      {resumePrompt && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-purple-950/80 to-slate-900 border border-indigo-500/40 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/30 text-cyan-300">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Phát hiện bài đang làm dở từ thiết bị khác</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                  {resumePrompt.percent}%
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Em đã dừng lại ở <strong>Câu {resumePrompt.currentQuestion + 1}</strong> trên {resumePrompt.total} câu.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setResumePrompt(null)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Bắt đầu từ câu 1
            </button>
            <button
              onClick={() => {
                soundManager.playClickSound();
                setCurrentIndex(resumePrompt.currentQuestion);
                if (resumePrompt.answers) {
                  setSessionAnswers(resumePrompt.answers);
                }
                setResumePrompt(null);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer flex items-center gap-1"
            >
              <span>Học tiếp</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              Lớp {currentQ.grade} • {currentQ.topic}
            </span>
            {selectedLessonId && (
              <span className="text-xs text-indigo-300 flex items-center gap-1">
                (Theo bài học)
                <button
                  onClick={clearLessonFilter}
                  className="text-slate-400 hover:text-white underline text-[11px] ml-1 cursor-pointer"
                >
                  Xem tất cả
                </button>
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
            <span>
              Câu {currentIndex + 1} trên {availableQuestions.length} câu • Thưởng: +{currentQ.xpReward} XP
            </span>
            {/* Supabase Auto-save Status Badge */}
            {user?.isSupabaseAuth && (
              <span className="inline-flex items-center gap-1 text-[11px]">
                {cloudSaveStatus === 'saving' && (
                  <span className="text-cyan-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Đang lưu Cloud...
                  </span>
                )}
                {cloudSaveStatus === 'saved' && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CloudCheck className="w-3.5 h-3.5" /> Đã lưu tiến độ
                  </span>
                )}
                {cloudSaveStatus === 'error' && (
                  <span className="text-rose-400 flex items-center gap-1">
                    <CloudOff className="w-3.5 h-3.5" /> Lưu thất bại
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Topic filter if not tied to single lesson */}
        {!selectedLessonId && (
          <div className="flex items-center gap-1 overflow-x-auto">
            {distinctTopics.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTopicFilter(t);
                  setCurrentIndex(0);
                  soundManager.playClickSound();
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  topicFilter === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {t === 'all' ? 'Tất cả' : t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Question Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-xl space-y-6">
        {/* Question Header & Hint */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {currentQ.type === 'multiple_choice' && 'Trắc nghiệm chọn đáp án'}
              {currentQ.type === 'fill_in' && 'Điền số / đáp án'}
              {currentQ.type === 'true_false' && 'Khẳng định Đúng hay Sai'}
              {currentQ.type === 'find_error' && 'Tìm lỗi sai trong lời giải'}
              {currentQ.type === 'match_formula' && 'Ghép đôi công thức & kết quả'}
            </span>

            {currentQ.hint && (
              <button
                onClick={() => setShowHint(!showHint)}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{showHint ? 'Ẩn gợi ý' : 'Gợi ý'}</span>
              </button>
            )}
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
            {currentQ.question}
          </h2>

          {currentQ.mathExpression && (
            <div className="p-3 rounded-xl bg-slate-950 font-mono text-cyan-300 text-sm sm:text-base border border-slate-800 text-center font-bold tracking-wide">
              {formatMathNotation(currentQ.mathExpression)}
            </div>
          )}

          {showHint && currentQ.hint && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2 animate-in fade-in">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{currentQ.hint}</span>
            </div>
          )}
        </div>

        {/* QUESTION INPUT SECTION */}
        <div className="space-y-4 pt-2">
          {/* 1. Multiple Choice */}
          {currentQ.type === 'multiple_choice' && currentQ.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQ.options.map((opt) => {
                const isSelected = selectedOption === opt;
                let optionStyle = 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-200';

                if (isSubmitted) {
                  if (opt === currentQ.correctAnswer) {
                    optionStyle = 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30';
                  } else if (isSelected && !isCorrect) {
                    optionStyle = 'bg-rose-950/40 border-rose-500 text-rose-300 ring-2 ring-rose-500/30';
                  }
                } else if (isSelected) {
                  optionStyle = 'bg-indigo-950/60 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/30';
                }

                return (
                  <button
                    key={opt}
                    disabled={isSubmitted}
                    onClick={() => {
                      setSelectedOption(opt);
                      soundManager.playClickSound();
                    }}
                    className={`p-4 rounded-2xl border text-left font-medium text-sm transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                  >
                    <span>{opt}</span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. Fill In */}
          {currentQ.type === 'fill_in' && (
            <div>
              <input
                type="text"
                disabled={isSubmitted}
                value={fillInAnswer}
                onChange={(e) => setFillInAnswer(e.target.value)}
                placeholder="Nhập kết quả hoặc số của em (ví dụ: 12 hoặc 3/4)..."
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-base focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>
          )}

          {/* 3. True / False */}
          {currentQ.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-4">
              <button
                disabled={isSubmitted}
                onClick={() => {
                  setTrueFalseAnswer(true);
                  soundManager.playClickSound();
                }}
                className={`p-4 rounded-2xl border font-bold text-center transition-all cursor-pointer ${
                  trueFalseAnswer === true
                    ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/30'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                ĐÚNG
              </button>
              <button
                disabled={isSubmitted}
                onClick={() => {
                  setTrueFalseAnswer(false);
                  soundManager.playClickSound();
                }}
                className={`p-4 rounded-2xl border font-bold text-center transition-all cursor-pointer ${
                  trueFalseAnswer === false
                    ? 'bg-rose-600/30 border-rose-400 text-rose-200 ring-2 ring-rose-400/30'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                SAI
              </button>
            </div>
          )}

          {/* 4. Find Error Step */}
          {currentQ.type === 'find_error' && currentQ.errorSteps && (
            <div className="space-y-2">
              {currentQ.errorSteps.map((step) => {
                const isSelected = selectedErrorStep === step.stepNumber;
                return (
                  <button
                    key={step.stepNumber}
                    disabled={isSubmitted}
                    onClick={() => {
                      setSelectedErrorStep(step.stepNumber);
                      soundManager.playClickSound();
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left text-sm transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold text-indigo-400 shrink-0">
                      Bước {step.stepNumber}:
                    </span>
                    <span>{step.text}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 5. Matching Pairs */}
          {currentQ.type === 'match_formula' && currentQ.matchingPairs && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Nhấp vào ô vế trái, sau đó nhấp vào ô kết quả tương ứng ở vế phải để ghép đôi:
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  {currentQ.matchingPairs.map((pair) => {
                    const isSelected = selectedLeft === pair.id;
                    const assignedRight = matchedPairs[pair.id];
                    return (
                      <button
                        key={pair.id}
                        disabled={isSubmitted}
                        onClick={() => handleLeftClick(pair.id)}
                        className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200'
                            : assignedRight
                            ? 'bg-purple-950/40 border-purple-500/40 text-purple-200'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="truncate">{pair.left}</div>
                        {assignedRight && (
                          <div className="text-[11px] text-cyan-400 mt-1 truncate">
                            ➔ {assignedRight}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  {currentQ.matchingPairs.map((pair) => {
                    const isAssigned = Object.values(matchedPairs).includes(pair.right);
                    return (
                      <button
                        key={pair.id}
                        disabled={isSubmitted || !selectedLeft}
                        onClick={() => handleRightClick(pair.right)}
                        className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                          isAssigned
                            ? 'bg-purple-950/40 border-purple-500/40 text-purple-300'
                            : selectedLeft
                            ? 'bg-slate-950 border-purple-500/40 hover:bg-purple-900/40 hover:border-purple-400 text-white'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span>{pair.right}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FEEDBACK & EXPLANATION PANEL */}
        {isSubmitted && (
          <div
            className={`p-5 rounded-2xl border transition-all animate-in fade-in space-y-3 ${
              isCorrect
                ? 'bg-emerald-950/30 border-emerald-500/40'
                : 'bg-rose-950/30 border-rose-500/40'
            }`}
          >
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <span className="font-extrabold text-base text-emerald-300">
                    Chính xác! (+{currentQ.xpReward} XP) 🎉
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-rose-400" />
                  <span className="font-extrabold text-base text-rose-300">
                    Chưa chính xác! Cùng xem cách giải dưới đây nhé:
                  </span>
                </>
              )}
            </div>

            <div className="text-xs sm:text-sm text-slate-200 leading-relaxed pt-1">
              <strong className="text-white block mb-1">💡 Hướng dẫn chi tiết:</strong>
              <div className="whitespace-pre-line text-slate-300">{currentQ.explanation}</div>
            </div>
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {isSubmitted
              ? isCorrect
                ? 'Tuyệt vời! Hãy tiếp tục phát huy.'
                : 'Đã lưu vào mục Ôn tập thông minh để rèn lại sau.'
              : 'Hãy suy nghĩ cẩn thận trước khi gửi câu trả lời.'}
          </div>

          <div className="flex items-center gap-3">
            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-500/25 transition-transform active:scale-95 cursor-pointer"
              >
                Kiểm tra đáp án
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-md shadow-emerald-500/25 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <span>
                  {currentIndex === availableQuestions.length - 1 ? 'Hoàn thành bài' : 'Câu tiếp theo'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
