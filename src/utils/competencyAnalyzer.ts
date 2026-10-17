import { UserProfile, Lesson, Grade, MistakeRecord } from '../types/mathverse';
import { CURRICULUM_DATA } from '../data/curriculumData';
import { QUESTIONS_DATA } from '../data/questionsData';
import { LearningResult, LearningProgress } from '../lib/supabaseClient';

export interface CompetencyItem {
  topic: string;
  accuracyRate: number; // 0 - 100%
  correct: number;
  total: number;
  description: string;
  badge?: string;
}

export interface ReviewTopicItem {
  topic: string;
  mistakeCount: number;
  accuracyRate: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  recommendedLessons: {
    id: string;
    title: string;
    chapter?: string;
    grade: Grade;
  }[];
}

export interface RoadmapStep {
  stepNumber: number;
  title: string;
  actionType: 'theory' | 'practice' | 'quiz' | 'review';
  targetTopic: string;
  targetTab: 'lessons' | 'practice' | 'quiz' | 'smart_review';
  targetLessonId?: string;
  description: string;
  estimatedMinutes: number;
}

export interface StudentCompetencyAnalysis {
  analyzedAt: number;
  formattedDate: string;
  totalQuestionsEvaluated: number;
  overallAccuracyRate: number;
  // 1. Điểm mạnh
  strengths: CompetencyItem[];
  // 2. Điểm yếu
  weaknesses: CompetencyItem[];
  // 3. Chuyên đề cần ôn
  reviewTopics: ReviewTopicItem[];
  // 4. Đề xuất lộ trình học
  roadmap: RoadmapStep[];
  aiAdvice: string;
  status: 'insufficient_data' | 'ready';
}

const STORAGE_KEY_ANALYSIS = 'mathverse_ai_competency_analysis_v1';

/**
 * Thuật toán AI phân tích năng lực học sinh tổng hợp dữ liệu từ Supabase Cloud và Profile
 */
export function analyzeStudentCompetency(
  user: UserProfile | null,
  cloudResults?: LearningResult[],
  cloudInProgress?: LearningProgress[]
): StudentCompetencyAnalysis {
  const now = Date.now();
  const formattedDate = new Date(now).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // 1. Tổng hợp dữ liệu từ Supabase nếu có danh sách cloudResults
  let topicStats: Record<string, { correct: number; total: number }> = {};
  let totalEvaluated = 0;
  let totalCorrect = 0;
  let mistakes: MistakeRecord[] = [];

  const hasCloudRecords = Boolean(cloudResults && cloudResults.length > 0);

  if (hasCloudRecords && cloudResults) {
    cloudResults.forEach((r) => {
      const topic = r.topic || 'Toán học';
      const c = Number(r.correct_count) || 0;
      const w = Number(r.wrong_count) || 0;
      const tot = c + w;

      if (!topicStats[topic]) {
        topicStats[topic] = { correct: 0, total: 0 };
      }
      topicStats[topic].correct += c;
      topicStats[topic].total += tot;

      totalEvaluated += tot;
      totalCorrect += c;

      // Trích xuất các lỗi sai từ answers của Supabase record
      if (r.answers && typeof r.answers === 'object') {
        Object.entries(r.answers).forEach(([qId, ans]: [string, any]) => {
          if (ans && ans.isCorrect === false) {
            const qData = QUESTIONS_DATA.find((q) => q.id === qId);
            mistakes.push({
              questionId: qId,
              questionText: qData?.question || `Câu hỏi: ${qId}`,
              topic,
              userAnswer: typeof ans === 'string' ? ans : (ans.answer || 'Đáp án chưa chính xác'),
              correctAnswer: String(qData?.correctAnswer || ''),
              explanation: qData?.explanation || '',
              timestamp: r.completed_at ? new Date(r.completed_at).getTime() : now,
              mistakeCount: 1,
              isUnderstood: false,
            });
          }
        });
      }
    });
  } else if (user) {
    topicStats = user.topicStats || {};
    totalEvaluated = user.answeredQuestionsCount || 0;
    totalCorrect = user.correctAnswersCount || 0;
    mistakes = user.recentMistakes || [];
  }

  // Trường hợp chưa có dữ liệu làm bài nào
  if (totalEvaluated === 0) {
    const emptyAnalysis: StudentCompetencyAnalysis = {
      analyzedAt: now,
      formattedDate,
      totalQuestionsEvaluated: 0,
      overallAccuracyRate: 0,
      strengths: [],
      weaknesses: [],
      reviewTopics: [],
      roadmap: [
        {
          stepNumber: 1,
          title: 'Khởi động bài tập đầu tiên',
          actionType: 'practice',
          targetTopic: 'Số học',
          targetTab: 'practice',
          description: 'Làm từ 3 - 5 câu hỏi để hệ thống AI thu thập và phân tích dữ liệu thực tế từ Supabase Cloud.',
          estimatedMinutes: 5,
        },
      ],
      aiAdvice: 'Chào em! Hiện chưa có kết quả làm bài nào được lưu trên Supabase Cloud. Hãy hoàn thành ít nhất 1 bài học hoặc bài luyện tập để AI kích hoạt phân tích năng lực chi tiết nhé.',
      status: 'insufficient_data',
    };
    saveStoredAnalysis(emptyAnalysis);
    return emptyAnalysis;
  }

  const currentGrade = user?.grade || (cloudResults && cloudResults[0]?.grade_level) || 6;
  const gradeLessons = CURRICULUM_DATA.filter((l) => l.grade === currentGrade);

  // Đếm lỗi sai theo chuyên đề
  const mistakeCountsByTopic: Record<string, number> = {};
  mistakes.forEach((m) => {
    const t = m.topic || 'Toán học';
    mistakeCountsByTopic[t] = (mistakeCountsByTopic[t] || 0) + 1;
  });

  // Đánh giá từng chuyên đề
  const strengths: CompetencyItem[] = [];
  const weaknesses: CompetencyItem[] = [];
  const reviewTopics: ReviewTopicItem[] = [];

  const evaluatedTopics = Object.entries(topicStats);

  evaluatedTopics.forEach(([topic, stats]) => {
    if (stats.total === 0) return;

    const rate = Math.round((stats.correct / stats.total) * 100);
    const mistakeCount = mistakeCountsByTopic[topic] || 0;

    // 1. Phân loại Điểm mạnh:
    // Tiêu chí: Tỷ lệ đúng >= 70% và số câu sai ít (<= 1)
    if (rate >= 70 && mistakeCount <= 1) {
      let desc = 'Nắm vững kiến thức nền tảng, tính toán chuẩn xác.';
      if (rate >= 90) desc = 'Thành thạo vượt trội, giải quyết nhanh các bài toán biến thể.';
      else if (rate >= 80) desc = 'Kỹ năng vững vàng, xử lý tự tin các phép toán.';

      strengths.push({
        topic,
        accuracyRate: rate,
        correct: stats.correct,
        total: stats.total,
        description: desc,
        badge: rate >= 90 ? '🌟 Xuất sắc' : '✅ Vững vàng',
      });
    }

    // 2. Phân loại Điểm yếu:
    // Tiêu chí: Tỷ lệ đúng < 65% HOẶC có từ 2 lỗi sai trở lên
    if (rate < 65 || mistakeCount >= 2) {
      let desc = 'Thường gặp nhầm lẫn ở bước chuyển đổi hoặc quy tắc dấu/công thức.';
      if (rate < 40) desc = 'Chưa nắm vững định nghĩa cơ bản, cần ôn tập lại lý thuyết SGK.';
      else if (mistakeCount >= 3) desc = 'Mắc nhiều lỗi lặp lại trong quá trình biến đổi từng bước.';

      weaknesses.push({
        topic,
        accuracyRate: rate,
        correct: stats.correct,
        total: stats.total,
        description: desc,
        badge: rate < 40 ? '⚠ Báo động' : '⚡ Cần củng cố',
      });

      // 3. Xác định Chuyên đề cần ôn tập:
      const matchingLessons = (gradeLessons.length > 0 ? gradeLessons : CURRICULUM_DATA)
        .filter((l) => l.topic.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(l.topic.toLowerCase()))
        .slice(0, 2)
        .map((l) => ({
          id: l.id,
          title: l.title,
          chapter: l.chapter,
          grade: l.grade,
        }));

      reviewTopics.push({
        topic,
        mistakeCount,
        accuracyRate: rate,
        priority: rate < 50 || mistakeCount >= 3 ? 'high' : 'medium',
        reason:
          mistakeCount > 0
            ? `Có ${mistakeCount} câu làm sai gần đây, tỷ lệ chính xác hiện tại là ${rate}%.`
            : `Tỷ lệ chính xác ${rate}% dưới ngưỡng tiêu chuẩn 65%.`,
        recommendedLessons: matchingLessons,
      });
    }
  });

  // Nếu học sinh làm ít câu hoặc chưa phân loại rõ:
  if (strengths.length === 0 && weaknesses.length === 0) {
    const highestTopic = evaluatedTopics
      .filter(([_, s]) => s.total > 0)
      .sort((a, b) => b[1].correct / b[1].total - a[1].correct / a[1].total)[0];

    if (highestTopic) {
      const rate = Math.round((highestTopic[1].correct / highestTopic[1].total) * 100);
      strengths.push({
        topic: highestTopic[0],
        accuracyRate: rate,
        correct: highestTopic[1].correct,
        total: highestTopic[1].total,
        description: 'Đang có khởi đầu tốt ở chuyên đề này.',
        badge: 'Khởi động tốt',
      });
    }
  }

  // Sắp xếp chuyên đề cần ôn tập theo mức độ ưu tiên
  reviewTopics.sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (b.priority === 'high' && a.priority !== 'high') return 1;
    return a.accuracyRate - b.accuracyRate;
  });

  // 4. Xây dựng Đề xuất lộ trình học (Personalized Adaptive Roadmap):
  const roadmap: RoadmapStep[] = [];
  const primaryWeakTopic = reviewTopics[0]?.topic || (weaknesses[0]?.topic ?? 'Số học');
  const targetLesson = reviewTopics[0]?.recommendedLessons[0];

  // Bước 1: Ôn tập lý thuyết chuyên đề yếu nhất
  roadmap.push({
    stepNumber: 1,
    title: `Ôn tập lý thuyết trọng tâm: ${primaryWeakTopic}`,
    actionType: 'theory',
    targetTopic: primaryWeakTopic,
    targetTab: 'lessons',
    targetLessonId: targetLesson?.id,
    description: targetLesson
      ? `Đọc kỹ kiến thức bài "${targetLesson.title}" trong SGK Kết nối tri thức.`
      : `Đọc lại các định nghĩa, quy tắc và công thức chính của ${primaryWeakTopic}.`,
    estimatedMinutes: 10,
  });

  // Bước 2: Khắc phục bài tập sai trong Smart Review
  if (mistakes.length > 0) {
    roadmap.push({
      stepNumber: 2,
      title: `Làm lại ${Math.min(mistakes.length, 5)} câu đã sai (Smart Review)`,
      actionType: 'review',
      targetTopic: primaryWeakTopic,
      targetTab: 'smart_review',
      description: 'Làm lại các câu hỏi đã từng mắc lỗi sai để kiểm chứng xem em đã nắm vững cách giải chưa.',
      estimatedMinutes: 8,
    });
  }

  // Bước 3: Làm 10 bài luyện tập chuyên đề
  roadmap.push({
    stepNumber: roadmap.length + 1,
    title: `Làm 10 câu luyện tập tăng tốc chuyên đề ${primaryWeakTopic}`,
    actionType: 'practice',
    targetTopic: primaryWeakTopic,
    targetTab: 'practice',
    description: `Thực hành các dạng bài tập nhận biết và thông hiểu của ${primaryWeakTopic} để nâng tỷ lệ đúng lên >80%.`,
    estimatedMinutes: 15,
  });

  // Bước 4: Kiểm tra đánh giá hoặc thử thách nâng cao
  roadmap.push({
    stepNumber: roadmap.length + 1,
    title: `Kiểm tra trắc nghiệm chuyên đề hoặc Thử thách tốc độ`,
    actionType: 'quiz',
    targetTopic: primaryWeakTopic,
    targetTab: 'quiz',
    description: 'Thực hiện 1 đề trắc nghiệm tính giờ để củng cố phản xạ và ghi nhận điểm năng lực mới.',
    estimatedMinutes: 10,
  });

  // Tạo lời khuyên AI cá nhân hóa
  let aiAdvice = '';
  if (weaknesses.length === 0 && strengths.length > 0) {
    aiAdvice = `Chúc mừng em! Em đang thể hiện năng lực Toán rất xuất sắc ở các chuyên đề: ${strengths.map((s) => s.topic).join(', ')}. Hãy tiếp tục thử thách bản thân với các bài toán nâng cao và thử thi thăng hạng lớp tiếp theo! 🚀`;
  } else if (weaknesses.length > 0) {
    aiAdvice = `AI nhận thấy em đang làm rất tốt ở phần ${strengths.map((s) => s.topic).join(', ') || 'các câu hỏi ban đầu'}, nhưng cần chú ý rèn luyện thêm ${weaknesses.map((w) => w.topic).join(', ')}. Hãy làm theo lộ trình 4 bước bên dưới để bứt phá điểm số nhé! 💪`;
  } else {
    aiAdvice = `Hãy tiếp tục giải bài tập đều đặn mỗi ngày. AI sẽ tự động phân tích sâu sau mỗi câu trả lời của em! ✨`;
  }

  const analysisResult: StudentCompetencyAnalysis = {
    analyzedAt: now,
    formattedDate,
    totalQuestionsEvaluated: totalEvaluated,
    overallAccuracyRate:
      totalEvaluated > 0
        ? Math.round((totalCorrect / totalEvaluated) * 100)
        : 0,
    strengths,
    weaknesses,
    reviewTopics,
    roadmap,
    aiAdvice,
    status: 'ready',
  };

  saveStoredAnalysis(analysisResult);
  return analysisResult;
}

/**
 * Lưu kết quả phân tích vào localStorage
 */
export function saveStoredAnalysis(analysis: StudentCompetencyAnalysis): void {
  try {
    localStorage.setItem(STORAGE_KEY_ANALYSIS, JSON.stringify(analysis));
    if (typeof window !== 'undefined') {
      queueMicrotask(() => {
        window.dispatchEvent(new CustomEvent('mathverse-competency-updated'));
      });
    }
  } catch (e) {
    console.error('Lỗi lưu kết quả phân tích năng lực AI vào localStorage:', e);
  }
}

/**
 * Đọc kết quả phân tích từ localStorage
 */
export function getStoredCompetencyAnalysis(): StudentCompetencyAnalysis | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ANALYSIS);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Lỗi đọc phân tích năng lực AI:', e);
    return null;
  }
}
