export interface UserFeedbackSurvey {
  id: string;
  userName: string;
  grade: number; // 6, 7, 8, 9
  avatar: string;
  weekNumber: number; // Tuần 1, Tuần 2,...
  timestamp: number;
  dateFormatted: string;

  // 1. AI có dễ sử dụng không? (1-5 sao)
  easeOfUseRating: number;

  // 2. AI có giúp em học Toán tốt hơn không? (1-5 sao)
  learningHelpRating: number;

  // 3. Em thích tính năng nào nhất?
  favoriteFeature: string;

  // 4. Góp ý thêm
  additionalComments: string;
}

export interface FeedbackAnalyticsSummary {
  totalSurveys: number;
  averageEaseOfUse: number;
  averageLearningHelp: number;
  overallScore: number; // Thang 5.0
  satisfactionRate: number; // Tỷ lệ % hài lòng (>= 4 sao)
  mostLikedFeature: {
    name: string;
    count: number;
    percentage: number;
  };
  featureRankings: {
    feature: string;
    count: number;
    percentage: number;
    color: string;
  }[];
  starDistribution: {
    stars: number;
    count: number;
    percentage: number;
  }[];
  gradeStats: {
    grade: number;
    count: number;
    avgScore: number;
  }[];
}

const STORAGE_KEY_FEEDBACK_SURVEYS = 'mathverse_user_feedback_surveys_v2';
const STORAGE_KEY_LAST_SURVEY_PROMPT = 'mathverse_last_weekly_survey_prompt_ts';

export const POPULAR_FEATURES = [
  { id: 'mathbot', label: 'Gia sư MathBot AI giải bài & hướng dẫn', color: '#6366f1' },
  { id: 'smart_review', label: 'Ôn tập lỗi sai & Tạo bài tương tự', color: '#ec4899' },
  { id: 'challenges', label: 'Đấu trường Thử thách tính nhanh & 60s', color: '#f59e0b' },
  { id: 'practice', label: 'Luyện tập trắc nghiệm & điền đáp án', color: '#10b981' },
  { id: 'lessons', label: 'Bài học trực quan theo SGK', color: '#06b6d4' },
  { id: 'analytics', label: 'Báo cáo năng lực học sinh & Huy hiệu', color: '#8b5cf6' },
];

// Bộ dữ liệu ban đầu phong phú, đại diện cho học sinh THCS các khối 6, 7, 8, 9
const INITIAL_SEED_SURVEYS: UserFeedbackSurvey[] = [
  {
    id: 'survey_seed_1',
    userName: 'Minh Khang',
    grade: 6,
    avatar: '👨‍🚀',
    weekNumber: 1,
    timestamp: Date.now() - 6 * 24 * 3600 * 1000,
    dateFormatted: '09/10/2026',
    easeOfUseRating: 5,
    learningHelpRating: 5,
    favoriteFeature: 'Gia sư MathBot AI giải bài & hướng dẫn',
    additionalComments: 'MathBot nói chuyện thân thiện, giải thích phân số rất dễ hiểu và chỉ ra từng bước quy đồng!',
  },
  {
    id: 'survey_seed_2',
    userName: 'Tuệ Nhi',
    grade: 6,
    avatar: '👩‍🚀',
    weekNumber: 1,
    timestamp: Date.now() - 5 * 24 * 3600 * 1000,
    dateFormatted: '10/10/2026',
    easeOfUseRating: 5,
    learningHelpRating: 5,
    favoriteFeature: 'Ôn tập lỗi sai & Tạo bài tương tự',
    additionalComments: 'Tính năng tạo bài tương tự từ câu sai quá xịn! Em sai câu cộng phân số khác mẫu, làm lại 3 câu tương tự là hiểu ngay.',
  },
  {
    id: 'survey_seed_3',
    userName: 'Hoàng Long',
    grade: 7,
    avatar: '🦸‍♂️',
    weekNumber: 2,
    timestamp: Date.now() - 4 * 24 * 3600 * 1000,
    dateFormatted: '11/10/2026',
    easeOfUseRating: 4,
    learningHelpRating: 5,
    favoriteFeature: 'Gia sư MathBot AI giải bài & hướng dẫn',
    additionalComments: 'Định lý Pythagore và số vô tỉ được giải thích rất trực quan. Em đã đạt điểm 9 bài kiểm tra 15 phút!',
  },
  {
    id: 'survey_seed_4',
    userName: 'Bảo Trâm',
    grade: 6,
    avatar: '🧙‍♀️',
    weekNumber: 2,
    timestamp: Date.now() - 4 * 24 * 3600 * 1000,
    dateFormatted: '11/10/2026',
    easeOfUseRating: 5,
    learningHelpRating: 4,
    favoriteFeature: 'Đấu trường Thử thách tính nhanh & 60s',
    additionalComments: 'Em thích nhất chế độ 60 giây, vừa vui vừa rèn phản xạ tính nhẩm số nguyên âm.',
  },
  {
    id: 'survey_seed_5',
    userName: 'Đăng Khoa',
    grade: 8,
    avatar: '🤖',
    weekNumber: 1,
    timestamp: Date.now() - 3 * 24 * 3600 * 1000,
    dateFormatted: '12/10/2026',
    easeOfUseRating: 5,
    learningHelpRating: 5,
    favoriteFeature: 'Gia sư MathBot AI giải bài & hướng dẫn',
    additionalComments: 'Hằng đẳng thức đáng nhớ trước đây em hay nhầm dấu, MathBot chỉ mẹo nhớ bằng thơ cực hay!',
  },
  {
    id: 'survey_seed_6',
    userName: 'Phương Anh',
    grade: 7,
    avatar: '🌟',
    weekNumber: 2,
    timestamp: Date.now() - 3 * 24 * 3600 * 1000,
    dateFormatted: '12/10/2026',
    easeOfUseRating: 4,
    learningHelpRating: 5,
    favoriteFeature: 'Ôn tập lỗi sai & Tạo bài tương tự',
    additionalComments: 'Dashboard phân tích năng lực chỉ đúng điểm yếu hình học tam giác bằng nhau của em.',
  },
  {
    id: 'survey_seed_7',
    userName: 'Huy Hoàng',
    grade: 9,
    avatar: '🚀',
    weekNumber: 3,
    timestamp: Date.now() - 2 * 24 * 3600 * 1000,
    dateFormatted: '13/10/2026',
    easeOfUseRating: 5,
    learningHelpRating: 5,
    favoriteFeature: 'Gia sư MathBot AI giải bài & hướng dẫn',
    additionalComments: 'Giải phương trình bậc hai có delta rất rõ ràng, cảnh báo AI chuẩn mực giúp em luôn kiểm tra lại.',
  },
  {
    id: 'survey_seed_8',
    userName: 'Thanh Hà',
    grade: 6,
    avatar: '🌺',
    weekNumber: 2,
    timestamp: Date.now() - 2 * 24 * 3600 * 1000,
    dateFormatted: '13/10/2026',
    easeOfUseRating: 5,
    learningHelpRating: 4,
    favoriteFeature: 'Bài học trực quan theo SGK',
    additionalComments: 'Em thích giao diện tối màu vũ trụ, không bị mỏi mắt khi học buổi tối.',
  },
  {
    id: 'survey_seed_9',
    userName: 'Quốc Bảo',
    grade: 8,
    avatar: '⚡',
    weekNumber: 1,
    timestamp: Date.now() - 1 * 24 * 3600 * 1000,
    dateFormatted: '14/10/2026',
    easeOfUseRating: 5,
    learningHelpRating: 5,
    favoriteFeature: 'Ôn tập lỗi sai & Tạo bài tương tự',
    additionalComments: 'Nhạc nền lofi lúc làm bài rất thư giãn, giúp em tập trung tư duy toán học hơn.',
  },
  {
    id: 'survey_seed_10',
    userName: 'Ngọc Mai',
    grade: 6,
    avatar: '👑',
    weekNumber: 1,
    timestamp: Date.now() - 1 * 24 * 3600 * 1000,
    dateFormatted: '14/10/2026',
    easeOfUseRating: 4,
    learningHelpRating: 5,
    favoriteFeature: 'Báo cáo năng lực học sinh & Huy hiệu',
    additionalComments: 'Mỗi khi làm bài xong có lộ trình 3 bước khuyên ôn bài rất sát với năng lực của em.',
  },
  {
    id: 'survey_seed_11',
    userName: 'Gia Huy',
    grade: 7,
    avatar: '🦁',
    weekNumber: 3,
    timestamp: Date.now() - 12 * 3600 * 1000,
    dateFormatted: '15/10/2026',
    easeOfUseRating: 5,
    learningHelpRating: 5,
    favoriteFeature: 'Gia sư MathBot AI giải bài & hướng dẫn',
    additionalComments: 'MathBot trả lời rất nhanh và có lời chúc động viên học tập nhiệt tình!',
  },
  {
    id: 'survey_seed_12',
    userName: 'Khánh Linh',
    grade: 6,
    avatar: '🎨',
    weekNumber: 2,
    timestamp: Date.now() - 6 * 3600 * 1000,
    dateFormatted: '15/10/2026',
    easeOfUseRating: 5,
    learningHelpRating: 5,
    favoriteFeature: 'Đấu trường Thử thách tính nhanh & 60s',
    additionalComments: 'Em và các bạn cùng lớp đua chuỗi ngày streak và điểm XP rất hào hứng.',
  },
];

/**
 * Lấy toàn bộ danh sách khảo sát từ localStorage (nếu chưa có thì khởi tạo bộ dữ liệu mẫu)
 */
export function getAllFeedbackSurveys(): UserFeedbackSurvey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FEEDBACK_SURVEYS);
    if (!raw) {
      try {
        localStorage.setItem(STORAGE_KEY_FEEDBACK_SURVEYS, JSON.stringify(INITIAL_SEED_SURVEYS));
      } catch {
        // Safe fallback
      }
      return INITIAL_SEED_SURVEYS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_SEED_SURVEYS;
  } catch (e) {
    console.error('Lỗi khi đọc danh sách khảo sát từ localStorage:', e);
    return INITIAL_SEED_SURVEYS;
  }
}

/**
 * Lưu khảo sát mới của người dùng
 */
export function saveUserFeedbackSurvey(
  survey: Omit<UserFeedbackSurvey, 'id' | 'timestamp' | 'dateFormatted'>
): UserFeedbackSurvey {
  const currentSurveys = getAllFeedbackSurveys();
  const now = new Date();
  const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const newSurvey: UserFeedbackSurvey = {
    ...survey,
    id: `survey_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    dateFormatted,
  };

  const updated = [newSurvey, ...currentSurveys];
  try {
    localStorage.setItem(STORAGE_KEY_FEEDBACK_SURVEYS, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEY_LAST_SURVEY_PROMPT, Date.now().toString());
  } catch (e) {
    console.error('Lỗi khi lưu khảo sát vào localStorage:', e);
  }

  // Phát event đồng bộ cho các component đang mở an toàn ngoài render cycle
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent('mathverse-feedback-survey-updated', { detail: newSurvey }));
    });
  }

  return newSurvey;
}

/**
 * Phân tích và tính toán toàn bộ số liệu thống kê khảo sát
 */
export function calculateFeedbackAnalytics(surveys: UserFeedbackSurvey[]): FeedbackAnalyticsSummary {
  const total = surveys.length;
  if (total === 0) {
    return {
      totalSurveys: 0,
      averageEaseOfUse: 0,
      averageLearningHelp: 0,
      overallScore: 0,
      satisfactionRate: 0,
      mostLikedFeature: { name: 'Chưa có dữ liệu', count: 0, percentage: 0 },
      featureRankings: [],
      starDistribution: [5, 4, 3, 2, 1].map((s) => ({ stars: s, count: 0, percentage: 0 })),
      gradeStats: [],
    };
  }

  // 1. Điểm hài lòng trung bình
  const sumEase = surveys.reduce((acc, s) => acc + s.easeOfUseRating, 0);
  const sumHelp = surveys.reduce((acc, s) => acc + s.learningHelpRating, 0);
  const averageEaseOfUse = Math.round((sumEase / total) * 10) / 10;
  const averageLearningHelp = Math.round((sumHelp / total) * 10) / 10;
  const overallScore = Math.round(((sumEase + sumHelp) / (total * 2)) * 100) / 100;

  // Hài lòng là trung bình cả 2 tiêu chí >= 4 sao
  const satisfiedCount = surveys.filter((s) => (s.easeOfUseRating + s.learningHelpRating) / 2 >= 4).length;
  const satisfactionRate = Math.round((satisfiedCount / total) * 100);

  // 2. Tính năng được thích nhất & Bảng xếp hạng tính năng
  const featureCounts: Record<string, number> = {};
  surveys.forEach((s) => {
    const feat = s.favoriteFeature || 'Khác';
    featureCounts[feat] = (featureCounts[feat] || 0) + 1;
  });

  const featureRankings = Object.entries(featureCounts)
    .map(([feature, count]) => {
      const match = POPULAR_FEATURES.find((p) => p.label === feature);
      return {
        feature,
        count,
        percentage: Math.round((count / total) * 100),
        color: match?.color || '#06b6d4',
      };
    })
    .sort((a, b) => b.count - a.count);

  const topFeature = featureRankings[0] || {
    feature: 'Gia sư MathBot AI giải bài & hướng dẫn',
    count: 0,
    percentage: 0,
  };

  // 3. Phân bố sao đánh giá (tính theo trung bình làm tròn của mỗi phiếu)
  const starCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  surveys.forEach((s) => {
    const avg = Math.round((s.easeOfUseRating + s.learningHelpRating) / 2);
    const clamped = Math.min(Math.max(avg, 1), 5);
    starCounts[clamped] = (starCounts[clamped] || 0) + 1;
  });

  const starDistribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: starCounts[stars] || 0,
    percentage: Math.round(((starCounts[stars] || 0) / total) * 100),
  }));

  // 4. Thống kê theo khối lớp
  const gradeBuckets: Record<number, { count: number; sumScores: number }> = {};
  surveys.forEach((s) => {
    const g = s.grade || 6;
    if (!gradeBuckets[g]) {
      gradeBuckets[g] = { count: 0, sumScores: 0 };
    }
    gradeBuckets[g].count += 1;
    gradeBuckets[g].sumScores += (s.easeOfUseRating + s.learningHelpRating) / 2;
  });

  const gradeStats = [6, 7, 8, 9].map((g) => {
    const bucket = gradeBuckets[g] || { count: 0, sumScores: 0 };
    const avgScore = bucket.count > 0 ? Math.round((bucket.sumScores / bucket.count) * 10) / 10 : 0;
    return {
      grade: g,
      count: bucket.count,
      avgScore,
    };
  });

  return {
    totalSurveys: total,
    averageEaseOfUse,
    averageLearningHelp,
    overallScore,
    satisfactionRate,
    mostLikedFeature: {
      name: topFeature.feature,
      count: topFeature.count,
      percentage: topFeature.percentage,
    },
    featureRankings,
    starDistribution,
    gradeStats,
  };
}

/**
 * Kiểm tra xem có nên tự động gợi ý popup khảo sát sau mỗi tuần học hay không:
 * - Sau mỗi 7 ngày kể từ lần mở gần nhất, HOẶC
 * - Khi học sinh có streak đạt mốc tuần (ví dụ: ngày 7, 14, 21...) và chưa khảo sát tuần đó
 */
export function shouldShowWeeklySurveyPrompt(streak: number = 1): boolean {
  try {
    const lastPromptStr = localStorage.getItem(STORAGE_KEY_LAST_SURVEY_PROMPT);
    if (!lastPromptStr) {
      // Người dùng mới chưa từng khảo sát -> hiển thị sau khi đã học thử một chút
      return false;
    }
    const lastPromptTs = parseInt(lastPromptStr, 10);
    const oneWeekMs = 7 * 24 * 3600 * 1000;
    if (Date.now() - lastPromptTs >= oneWeekMs) {
      return true;
    }
    // Hoặc streak đạt mốc bội của 7
    if (streak > 0 && streak % 7 === 0) {
      const oneDayMs = 24 * 3600 * 1000;
      if (Date.now() - lastPromptTs >= oneDayMs) {
        return true;
      }
    }
  } catch (e) {
    console.error('Lỗi kiểm tra lịch khảo sát tuần:', e);
  }
  return false;
}

/**
 * Đánh dấu đã nhắc khảo sát (để không bật lại liên tục nếu người dùng chọn để sau)
 */
export function markSurveyPromptPostponed(): void {
  try {
    localStorage.setItem(STORAGE_KEY_LAST_SURVEY_PROMPT, Date.now().toString());
  } catch (e) {
    console.error('Lỗi hoãn khảo sát:', e);
  }
}

/**
 * Xuất dữ liệu khảo sát thành file JSON
 */
export function exportSurveysToJsonFile(surveys: UserFeedbackSurvey[]): void {
  const jsonStr = JSON.stringify(surveys, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MathVerse_User_Feedback_Analytics_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reset về dữ liệu ban đầu
 */
export function resetFeedbackSurveys(): UserFeedbackSurvey[] {
  try {
    localStorage.setItem(STORAGE_KEY_FEEDBACK_SURVEYS, JSON.stringify(INITIAL_SEED_SURVEYS));
  } catch (e) {
    console.error('Lỗi reset khảo sát:', e);
  }
  return INITIAL_SEED_SURVEYS;
}
