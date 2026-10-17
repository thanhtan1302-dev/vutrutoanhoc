import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Grade, UserProfile, MistakeRecord } from '../types/mathverse';
import { BADGES_DATA, getUserLevel } from '../data/badgesData';
import { soundManager } from '../utils/soundEffects';
import { isGradeUnlocked } from '../data/promotionExamsData';
import { analyzeStudentCompetency } from '../utils/competencyAnalyzer';
import { CURRICULUM_DATA } from '../data/curriculumData';
import {
  supabase,
  isSupabaseConfigured,
  saveLearningResult,
  saveLearningProgress,
  fetchLearningResults,
  fetchActiveInProgress,
  LearningResult,
  LearningProgress,
} from '../lib/supabaseClient';

interface MathVerseContextType {
  user: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedLessonId: string | null;
  setSelectedLessonId: (id: string | null) => void;
  selectedPracticeTopic: string | null;
  setSelectedPracticeTopic: (topic: string | null) => void;
  lockedGradeAttempt: Grade | null;
  setLockedGradeAttempt: (grade: Grade | null) => void;
  activePromotionExamGrade: Grade | null;
  setActivePromotionExamGrade: (grade: Grade | null) => void;
  login: (name: string, grade: Grade, avatar: string) => void;
  logout: () => void;
  addXp: (amount: number, reason?: string) => void;
  completeLesson: (
    lessonId: string,
    details?: {
      score?: number;
      correctCount?: number;
      wrongCount?: number;
      answers?: Record<string, any>;
    }
  ) => Promise<void>;
  recordQuestionResult: (
    questionId: string,
    isCorrect: boolean,
    topic: string,
    questionText: string,
    userAnswer: string,
    correctAnswer: string,
    explanation: string,
    xpEarned: number
  ) => void;
  toggleSound: () => void;
  updateGrade: (grade: Grade) => void;
  unlockGrade: (sourceGrade: Grade, nextGrade: Grade, score: number, total: number) => void;
  updateProfile: (name: string, avatar: string) => void;
  resetAllData: () => void;
  recentXpGained: { amount: number; reason?: string } | null;
  newBadgeUnlocked: string | null;
  markMistakeAsUnderstood: (questionId: string) => void;
  removeMistake: (questionId: string) => void;
  clearNewBadge: () => void;

  // Supabase Auth & Cloud Data
  isSupabaseConnected: boolean;
  authLoading: boolean;
  loginWithSupabase: (email: string, password: string) => Promise<{ error: string | null }>;
  registerWithSupabase: (
    email: string,
    password: string,
    name: string,
    grade: Grade,
    avatar: string
  ) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  resetSupabasePassword: (email: string) => Promise<{ error: string | null; message?: string }>;
  refreshCloudProgress: () => Promise<void>;
}

const STORAGE_KEY = 'mathverse_user_profile_v1';

const defaultProfile: UserProfile = {
  name: '',
  grade: 6,
  avatar: '👨‍🚀',
  xp: 0,
  streak: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
  completedLessons: [],
  answeredQuestionsCount: 0,
  correctAnswersCount: 0,
  timeSpentSeconds: 0,
  unlockedBadges: [],
  topicStats: {
    'Số học': { correct: 0, total: 0 },
    'Phân số': { correct: 0, total: 0 },
    'Đại số': { correct: 0, total: 0 },
    'Hình học': { correct: 0, total: 0 },
    'Thống kê': { correct: 0, total: 0 },
  },
  recentMistakes: [],
  soundEnabled: true,
  unlockedGrades: [6],
  completedGradeExams: {},
};

const MathVerseContext = createContext<MathVerseContextType | undefined>(undefined);

export const MathVerseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.name || parsed.email)) {
          const today = new Date().toISOString().split('T')[0];
          const lastDate = parsed.lastActiveDate || today;
          let streak = parsed.streak || 1;

          if (lastDate !== today) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            if (lastDate === yesterday) {
              streak += 1;
            } else {
              streak = 1;
            }
          }

          return {
            ...defaultProfile,
            ...parsed,
            unlockedGrades: parsed.unlockedGrades || [6],
            completedGradeExams: parsed.completedGradeExams || {},
            streak,
            lastActiveDate: today,
          };
        }
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedPracticeTopic, setSelectedPracticeTopic] = useState<string | null>(null);
  const [recentXpGained, setRecentXpGained] = useState<{ amount: number; reason?: string } | null>(null);
  const [newBadgeUnlocked, setNewBadgeUnlocked] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // State for locked grade attempt and active promotion exam
  const [lockedGradeAttempt, setLockedGradeAttempt] = useState<Grade | null>(null);
  const [activePromotionExamGrade, setActivePromotionExamGrade] = useState<Grade | null>(null);
  const xpTimerRef = useRef<any>(null);
  const isSavingLessonRef = useRef<Record<string, boolean>>({});

  // 1. Phục hồi và đồng bộ phiên đăng nhập Supabase khi tải lại trang
  useEffect(() => {
    let isMounted = true;

    async function checkInitialSupabaseSession() {
      if (!isSupabaseConfigured() || !supabase) {
        if (isMounted) setAuthLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data?.session?.user && isMounted) {
          await syncSupabaseUserToState(data.session.user);
        }
      } catch (err) {
        console.warn('[MathVerse] Lỗi kiểm tra session Supabase:', err);
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    }

    checkInitialSupabaseSession();

    // Lắng nghe thay đổi trạng thái đăng nhập từ Supabase Auth
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    if (isSupabaseConfigured() && supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          await syncSupabaseUserToState(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            // Ignore
          }
        }
      });
      authListener = data;
    }

    return () => {
      isMounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Hàm chuyển đổi Supabase Auth User sang UserProfile của MathVerse
  const syncSupabaseUserToState = async (sbUser: any) => {
    const meta = sbUser.user_metadata || {};
    const name = meta.name || sbUser.email?.split('@')[0] || 'Học sinh MathVerse';
    const grade: Grade = meta.grade && [6, 7, 8, 9].includes(meta.grade) ? meta.grade : 6;
    const avatar = meta.avatar || '👨‍🚀';

    // Đọc lịch sử hoàn thành từ bảng learning_results trên Supabase
    let cloudCompletedLessons: string[] = [];
    let cloudAnsweredCount = 0;
    let cloudCorrectCount = 0;
    let cloudTotalXp = 0;
    let cloudTopicStats: Record<string, { correct: number; total: number }> = {};

    try {
      const { data: results } = await fetchLearningResults(sbUser.id);
      if (results && results.length > 0) {
        cloudCompletedLessons = Array.from(new Set(results.map((r) => r.lesson_id)));
        results.forEach((r) => {
          const c = Number(r.correct_count) || 0;
          const w = Number(r.wrong_count) || 0;
          cloudCorrectCount += c;
          cloudAnsweredCount += (c + w);
          cloudTotalXp += Math.round((Number(r.score) || 0) * 10) + 50;

          if (r.topic) {
            if (!cloudTopicStats[r.topic]) {
              cloudTopicStats[r.topic] = { correct: 0, total: 0 };
            }
            cloudTopicStats[r.topic].correct += c;
            cloudTopicStats[r.topic].total += (c + w);
          }
        });
      }
    } catch (err) {
      console.warn('[MathVerse] Không thể tải kết quả từ Supabase:', err);
    }

    setUser((prev) => {
      const currentCompleted = prev?.completedLessons || [];
      const combinedCompleted = Array.from(new Set([...currentCompleted, ...cloudCompletedLessons]));
      const completedCount = combinedCompleted.length;

      // Đảm bảo số liệu tối thiểu tương ứng với các bài đã hoàn thành
      const fallbackAnswered = completedCount * 5;
      const fallbackCorrect = completedCount * 4;
      const fallbackXp = completedCount * 50;

      const answeredQuestionsCount = Math.max(
        prev?.answeredQuestionsCount || 0,
        cloudAnsweredCount,
        fallbackAnswered
      );
      const correctAnswersCount = Math.max(
        prev?.correctAnswersCount || 0,
        cloudCorrectCount,
        fallbackCorrect
      );
      const xp = Math.max(
        prev?.xp || 0,
        cloudTotalXp,
        fallbackXp
      );

      const mergedTopicStats = {
        ...(prev?.topicStats || {}),
        ...cloudTopicStats,
      };

      const updated: UserProfile = {
        ...defaultProfile,
        ...(prev || {}),
        id: sbUser.id,
        email: sbUser.email,
        isSupabaseAuth: true,
        name,
        grade: prev?.grade || grade,
        avatar: prev?.avatar || avatar,
        completedLessons: combinedCompleted,
        answeredQuestionsCount,
        correctAnswersCount,
        xp,
        topicStats: mergedTopicStats,
        unlockedGrades: prev?.unlockedGrades || [6],
        completedGradeExams: prev?.completedGradeExams || {},
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }

      return checkBadgeUnlocks(updated);
    });
  };

  // Đồng bộ âm thanh và lưu profile vào localStorage khi state thay đổi
  useEffect(() => {
    if (user) {
      soundManager.setSoundEnabled(user.soundEnabled ?? true);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } catch (err) {
        console.warn('MathVerse: Không thể lưu profile vào localStorage:', err);
      }
    }
  }, [user]);

  // Kiểm tra huy hiệu khi điểm và tiến độ tăng
  const checkBadgeUnlocks = (updatedUser: UserProfile): UserProfile => {
    let newlyUnlocked: string[] = [];
    const currentBadges = new Set(updatedUser.unlockedBadges);

    BADGES_DATA.forEach((badge) => {
      if (!currentBadges.has(badge.id)) {
        if (badge.checkUnlocked(updatedUser)) {
          currentBadges.add(badge.id);
          newlyUnlocked.push(badge.title);
        }
      }
    });

    if (newlyUnlocked.length > 0) {
      setNewBadgeUnlocked(newlyUnlocked[0]);
      soundManager.triggerBigCelebration();
    }

    return {
      ...updatedUser,
      unlockedBadges: Array.from(currentBadges),
    };
  };

  const triggerXpNotification = (amount: number, reason?: string, duration = 2500) => {
    if (xpTimerRef.current) {
      clearTimeout(xpTimerRef.current);
    }
    setRecentXpGained({ amount, reason });
    xpTimerRef.current = setTimeout(() => {
      setRecentXpGained(null);
      xpTimerRef.current = null;
    }, duration);
  };

  useEffect(() => {
    return () => {
      if (xpTimerRef.current) {
        clearTimeout(xpTimerRef.current);
      }
    };
  }, []);

  // 2. SUPABASE AUTH: Đăng ký tài khoản
  const registerWithSupabase = async (
    email: string,
    password: string,
    name: string,
    grade: Grade,
    avatar: string
  ): Promise<{ error: string | null; needsEmailConfirmation?: boolean }> => {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        error:
          'Supabase chưa được cấu hình. Vui lòng thêm VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY vào biến môi trường.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            grade,
            avatar,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      // Kiểm tra nếu Supabase yêu cầu xác nhận email trước khi đăng nhập
      if (data?.user && !data.session) {
        return { error: null, needsEmailConfirmation: true };
      }

      if (data?.user && data.session) {
        await syncSupabaseUserToState(data.user);
        soundManager.playTriumphSound();
      }

      return { error: null, needsEmailConfirmation: false };
    } catch (err: any) {
      return { error: err.message || 'Lỗi kết nối đến Supabase Auth' };
    }
  };

  // 3. SUPABASE AUTH: Đăng nhập tài khoản
  const loginWithSupabase = async (
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        error:
          'Supabase chưa được cấu hình. Vui lòng thêm VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY vào biến môi trường.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let msg = error.message;
        if (error.message.includes('Invalid login credentials')) {
          msg = 'Email hoặc mật khẩu không chính xác.';
        } else if (error.message.includes('Email not confirmed')) {
          msg = 'Email của em chưa được xác nhận. Vui lòng kiểm tra hộp thư đến.';
        }
        return { error: msg };
      }

      if (data?.user) {
        await syncSupabaseUserToState(data.user);
        soundManager.playTriumphSound();
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Lỗi kết nối đến Supabase' };
    }
  };

  // 4. SUPABASE AUTH: Quên mật khẩu
  const resetSupabasePassword = async (
    email: string
  ): Promise<{ error: string | null; message?: string }> => {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        error: 'Supabase chưa được cấu hình biến môi trường.',
      };
    }

    try {
      const redirectTo = window.location.origin + window.location.pathname;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        return { error: error.message };
      }

      return {
        error: null,
        message: 'Đã gửi liên kết khôi phục mật khẩu vào hòm thư. Vui lòng kiểm tra email của em.',
      };
    } catch (err: any) {
      return { error: err.message || 'Không thể gửi email đặt lại mật khẩu' };
    }
  };

  // Chế độ đăng nhập nhanh (Local Guest Mode)
  const login = (name: string, grade: Grade, avatar: string) => {
    const today = new Date().toISOString().split('T')[0];
    const unlockedGrades: Grade[] = [6];
    const completedGradeExams: Record<number, any> = {};

    if (grade >= 7) {
      unlockedGrades.push(7);
      completedGradeExams[6] = { passed: true, score: 9, total: 10, date: today };
    }
    if (grade >= 8) {
      unlockedGrades.push(8);
      completedGradeExams[7] = { passed: true, score: 9, total: 10, date: today };
    }
    if (grade >= 9) {
      unlockedGrades.push(9);
      completedGradeExams[8] = { passed: true, score: 9, total: 10, date: today };
    }

    const newUser: UserProfile = {
      ...defaultProfile,
      name,
      grade,
      avatar,
      unlockedGrades,
      completedGradeExams,
      lastActiveDate: today,
      streak: 1,
      isSupabaseAuth: false,
    };
    setUser(newUser);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } catch {
      // Ignore
    }
    soundManager.playTriumphSound();
  };

  // Đăng xuất: gọi Supabase signOut và dọn sạch session
  const logout = async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Lỗi đăng xuất Supabase:', err);
      }
    }
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    setActiveTab('dashboard');
  };

  const addXp = (amount: number, reason?: string) => {
    if (!user) return;
    triggerXpNotification(amount, reason, 3000);

    setUser((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        xp: prev.xp + amount,
      };
      return checkBadgeUnlocks(updated);
    });
  };

  // 5. HOÀN THÀNH BÀI HỌC: Cập nhật state + ghi vào learning_results và learning_progress trên Supabase
  const completeLesson = async (
    lessonId: string,
    details?: {
      score?: number;
      correctCount?: number;
      wrongCount?: number;
      answers?: Record<string, any>;
    }
  ) => {
    if (!user) return;

    // Ngăn chặn ghi trùng kết quả khi người dùng nhấn nút liên tiếp
    if (isSavingLessonRef.current[lessonId]) {
      return;
    }
    isSavingLessonRef.current[lessonId] = true;

    const isNew = !user.completedLessons.includes(lessonId);

    // Tìm thông tin bài học từ CURRICULUM_DATA
    const lesson = CURRICULUM_DATA.find((l) => l.id === lessonId);
    const lessonTitle = lesson?.title || lessonId;
    const gradeLevel = lesson?.grade || user.grade;
    const topic = lesson?.topic || 'Toán THCS';

    setUser((prev) => {
      if (!prev) return null;
      if (!isNew) return prev;

      const updated = {
        ...prev,
        completedLessons: [...prev.completedLessons, lessonId],
        xp: prev.xp + 50,
      };
      return checkBadgeUnlocks(updated);
    });

    if (isNew) {
      soundManager.triggerConfetti();
      soundManager.playTriumphSound();
      triggerXpNotification(50, 'Hoàn thành bài học', 3000);
    }

    // Nếu học sinh đã đăng nhập Supabase, ghi kết quả vào PostgreSQL Cloud
    if (user.isSupabaseAuth && isSupabaseConfigured()) {
      try {
        const correctCount = details?.correctCount ?? (details?.score ? Math.round(details.score / 10) : 5);
        const wrongCount = details?.wrongCount ?? 0;
        const total = correctCount + wrongCount;
        const score = details?.score ?? 10;
        const completionPercent = total > 0 ? Math.round((correctCount / total) * 100) : 100;

        // Ghi vào learning_results
        await saveLearningResult({
          user_id: user.id || '',
          lesson_id: lessonId,
          lesson_title: lessonTitle,
          grade_level: gradeLevel,
          topic,
          score,
          correct_count: correctCount,
          wrong_count: wrongCount,
          completion_percent: completionPercent,
          answers: details?.answers || {},
        });

        // Đánh dấu bảng learning_progress là 'completed'
        await saveLearningProgress({
          user_id: user.id || '',
          lesson_id: lessonId,
          lesson_title: lessonTitle,
          grade_level: gradeLevel,
          topic,
          current_question: total,
          answers: details?.answers || {},
          progress_percent: 100,
          status: 'completed',
        });
      } catch (err) {
        console.warn('[MathVerse] Ghi Supabase learning_results thất bại:', err);
      } finally {
        setTimeout(() => {
          delete isSavingLessonRef.current[lessonId];
        }, 1500);
      }
    } else {
      setTimeout(() => {
        delete isSavingLessonRef.current[lessonId];
      }, 1000);
    }
  };

  const refreshCloudProgress = async () => {
    if (!user?.id || !isSupabaseConfigured()) return;
    try {
      const { data: results } = await fetchLearningResults(user.id);
      if (results && results.length > 0) {
        const cloudLessons = Array.from(new Set(results.map((r) => r.lesson_id)));
        setUser((prev) => {
          if (!prev) return null;
          const combined = Array.from(new Set([...prev.completedLessons, ...cloudLessons]));
          return { ...prev, completedLessons: combined };
        });
      }
    } catch (e) {
      console.warn('Lỗi làm mới tiến độ đám mây:', e);
    }
  };

  const recordQuestionResult = (
    questionId: string,
    isCorrect: boolean,
    topic: string,
    questionText: string,
    userAnswer: string,
    correctAnswer: string,
    explanation: string,
    xpEarned: number
  ) => {
    if (!user) return;

    setUser((prev) => {
      if (!prev) return null;

      const prevTopic = prev.topicStats?.[topic] || { correct: 0, total: 0 };
      const updatedTopicStats = {
        ...(prev.topicStats || {}),
        [topic]: {
          correct: prevTopic.correct + (isCorrect ? 1 : 0),
          total: prevTopic.total + 1,
        },
      };

      let mistakes = [...(prev.recentMistakes || [])];
      if (!isCorrect) {
        const existing = mistakes.find((m) => m.questionId === questionId);
        const currentCount = existing ? (existing.mistakeCount || 1) + 1 : 1;
        const newMistake: MistakeRecord = {
          questionId,
          questionText,
          topic,
          userAnswer,
          correctAnswer,
          explanation,
          timestamp: Date.now(),
          mistakeCount: currentCount,
          isUnderstood: false,
        };
        mistakes = [newMistake, ...mistakes.filter((m) => m.questionId !== questionId)].slice(0, 50);
      } else {
        const existingIdx = mistakes.findIndex((m) => m.questionId === questionId);
        if (existingIdx >= 0) {
          mistakes[existingIdx] = {
            ...mistakes[existingIdx],
            isUnderstood: true,
            lastReviewedAt: Date.now(),
          };
        }
      }

      const updated: UserProfile = {
        ...prev,
        answeredQuestionsCount: prev.answeredQuestionsCount + 1,
        correctAnswersCount: prev.correctAnswersCount + (isCorrect ? 1 : 0),
        xp: prev.xp + (isCorrect ? xpEarned : 0),
        topicStats: updatedTopicStats,
        recentMistakes: mistakes,
      };

      const finalUser = checkBadgeUnlocks(updated);
      queueMicrotask(() => {
        try {
          analyzeStudentCompetency(finalUser);
        } catch (e) {
          console.warn('Lỗi phân tích năng lực học sinh:', e);
        }
      });
      return finalUser;
    });

    if (isCorrect) {
      soundManager.playCorrectSound();
      triggerXpNotification(xpEarned, 'Trả lời đúng', 2500);
    } else {
      soundManager.playWrongSound();
    }
  };

  const toggleSound = () => {
    setUser((prev) => {
      if (!prev) return null;
      const nextSound = !prev.soundEnabled;
      soundManager.setSoundEnabled(nextSound);
      return { ...prev, soundEnabled: nextSound };
    });
  };

  const updateGrade = (targetGrade: Grade) => {
    if (!user) return;
    if (isGradeUnlocked(user, targetGrade)) {
      setUser((prev) => (prev ? { ...prev, grade: targetGrade } : null));
      soundManager.playClickSound();
    } else {
      soundManager.playWrongSound();
      setLockedGradeAttempt(targetGrade);
    }
  };

  const unlockGrade = (sourceGrade: Grade, nextGrade: Grade, score: number, total: number) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    soundManager.triggerBigCelebration();

    setUser((prev) => {
      if (!prev) return null;
      const currentUnlocked = new Set(prev.unlockedGrades || [6]);
      currentUnlocked.add(nextGrade);

      const updatedExams = {
        ...(prev.completedGradeExams || {}),
        [sourceGrade]: {
          passed: true,
          score,
          total,
          date: today,
        },
      };

      const updated: UserProfile = {
        ...prev,
        grade: nextGrade,
        xp: prev.xp + 150,
        unlockedGrades: Array.from(currentUnlocked) as Grade[],
        completedGradeExams: updatedExams,
      };
      return checkBadgeUnlocks(updated);
    });

    triggerXpNotification(150, `Vượt cấp thành công lên Lớp ${nextGrade}! 🏆`, 3500);
  };

  const updateProfile = (name: string, avatar: string) => {
    setUser((prev) => (prev ? { ...prev, name, avatar } : null));
  };

  const resetAllData = () => {
    const today = new Date().toISOString().split('T')[0];
    const resetUser: UserProfile = {
      ...defaultProfile,
      name: user?.name || 'Học sinh',
      grade: 6,
      avatar: user?.avatar || '👨‍🚀',
      lastActiveDate: today,
      isSupabaseAuth: user?.isSupabaseAuth,
      email: user?.email,
      id: user?.id,
    };
    setUser(resetUser);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resetUser));
    } catch {
      // Ignore
    }
  };

  const markMistakeAsUnderstood = (questionId: string) => {
    setUser((prev) => {
      if (!prev) return null;
      const mistakes = prev.recentMistakes.map((m) =>
        m.questionId === questionId
          ? { ...m, isUnderstood: true, lastReviewedAt: Date.now() }
          : m
      );
      const updated: UserProfile = {
        ...prev,
        recentMistakes: mistakes,
        xp: prev.xp + 15,
      };
      const finalUser = checkBadgeUnlocks(updated);
      queueMicrotask(() => {
        try {
          analyzeStudentCompetency(finalUser);
        } catch {
          // Ignore
        }
      });
      return finalUser;
    });

    soundManager.playCorrectSound();
    triggerXpNotification(15, 'Đã hiểu bài', 2000);
  };

  const removeMistake = (questionId: string) => {
    setUser((prev) => {
      if (!prev) return null;
      const mistakes = prev.recentMistakes.filter((m) => m.questionId !== questionId);
      const updated: UserProfile = {
        ...prev,
        recentMistakes: mistakes,
      };
      const finalUser = checkBadgeUnlocks(updated);
      queueMicrotask(() => {
        try {
          analyzeStudentCompetency(finalUser);
        } catch {
          // Ignore
        }
      });
      return finalUser;
    });
    soundManager.playClickSound();
  };

  const clearNewBadge = () => {
    setNewBadgeUnlocked(null);
  };

  return (
    <MathVerseContext.Provider
      value={{
        user,
        activeTab,
        setActiveTab,
        selectedLessonId,
        setSelectedLessonId,
        selectedPracticeTopic,
        setSelectedPracticeTopic,
        lockedGradeAttempt,
        setLockedGradeAttempt,
        activePromotionExamGrade,
        setActivePromotionExamGrade,
        login,
        logout,
        addXp,
        completeLesson,
        recordQuestionResult,
        toggleSound,
        updateGrade,
        unlockGrade,
        updateProfile,
        resetAllData,
        recentXpGained,
        newBadgeUnlocked,
        markMistakeAsUnderstood,
        removeMistake,
        clearNewBadge,
        isSupabaseConnected: isSupabaseConfigured(),
        authLoading,
        loginWithSupabase,
        registerWithSupabase,
        resetSupabasePassword,
        refreshCloudProgress,
      }}
    >
      {children}
    </MathVerseContext.Provider>
  );
};

export const useMathVerse = () => {
  const context = useContext(MathVerseContext);
  if (!context) {
    throw new Error('useMathVerse must be used within a MathVerseProvider');
  }
  return context;
};
