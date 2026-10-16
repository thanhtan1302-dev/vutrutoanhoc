export interface AIFeedbackRecord {
  id: string;
  question: string;
  aiResponse: string;
  timestamp: number;
  formattedTime: string;
  type: 'incorrect' | 'helpful';
  note?: string;
}

export interface AIFeedbackStats {
  totalResponses: number;
  reportedIncorrectCount: number;
  helpfulCount: number;
  errorRate: number; // Tỷ lệ báo sai (0 - 100%)
  helpfulRate: number; // Tỷ lệ hữu ích (0 - 100%)
  reliabilityRate: number; // Tỷ lệ tin cậy (100 - errorRate)
}

const STORAGE_KEY_FEEDBACK = 'mathverse_ai_feedback_history';
const STORAGE_KEY_STATS = 'mathverse_ai_stats_meta';

// Helper: Lấy danh sách phản hồi từ localStorage
export function getAIFeedbackHistory(): AIFeedbackRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FEEDBACK);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Lỗi đọc lịch sử phản hồi AI từ localStorage:', e);
    return [];
  }
}

// Helper: Lưu danh sách phản hồi vào localStorage
function saveAIFeedbackHistory(records: AIFeedbackRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(records));
  } catch (e) {
    console.error('Lỗi lưu lịch sử phản hồi AI:', e);
  }
}

// Helper: Lấy meta stats (tổng số câu trả lời, số lần hữu ích)
function getMetaStats(): { totalResponses: number; helpfulCount: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        totalResponses: Number(parsed.totalResponses) || 0,
        helpfulCount: Number(parsed.helpfulCount) || 0,
      };
    }
  } catch (e) {
    console.error('Lỗi đọc meta stats AI:', e);
  }
  return { totalResponses: 0, helpfulCount: 0 };
}

function saveMetaStats(meta: { totalResponses: number; helpfulCount: number }): void {
  try {
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(meta));
  } catch (e) {
    console.error('Lỗi lưu meta stats AI:', e);
  }
}

// Phát sự kiện cập nhật để các component tự động đồng bộ giao diện
function notifyUpdate(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mathverse-ai-feedback-updated'));
  }
}

/**
 * Ghi nhận mỗi khi AI trả lời một câu hỏi
 */
export function recordAIResponse(questionText?: string, aiAnswerText?: string): void {
  const meta = getMetaStats();
  meta.totalResponses += 1;
  saveMetaStats(meta);
  notifyUpdate();
}

/**
 * Ghi nhận người dùng báo "AI sai rồi"
 * Lưu vào localStorage đầy đủ: Nội dung câu hỏi, Câu trả lời AI, Thời gian
 */
export function reportAIIncorrect(
  questionText: string,
  aiAnswerText: string,
  note?: string
): AIFeedbackRecord {
  const history = getAIFeedbackHistory();
  const now = Date.now();
  const dateFormatted = new Date(now).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const newRecord: AIFeedbackRecord = {
    id: `fb-${now}-${Math.random().toString(36).substring(2, 7)}`,
    question: questionText || 'Câu hỏi chưa xác định',
    aiResponse: aiAnswerText || 'Nội dung phản hồi từ AI',
    timestamp: now,
    formattedTime: dateFormatted,
    type: 'incorrect',
    note: note || '',
  };

  history.unshift(newRecord);
  saveAIFeedbackHistory(history);

  // Đảm bảo tổng số câu trả lời ít nhất bằng số lượng phản hồi
  const meta = getMetaStats();
  if (meta.totalResponses < history.length) {
    meta.totalResponses = history.length;
    saveMetaStats(meta);
  }

  notifyUpdate();
  return newRecord;
}

/**
 * Ghi nhận người dùng bấm "👍 Hữu ích"
 */
export function reportAIHelpful(questionText: string, aiAnswerText: string): void {
  const meta = getMetaStats();
  meta.helpfulCount += 1;
  if (meta.totalResponses < meta.helpfulCount) {
    meta.totalResponses = meta.helpfulCount;
  }
  saveMetaStats(meta);
  notifyUpdate();
}

/**
 * Hàm thống kê chính theo yêu cầu:
 * - Tổng số câu trả lời AI
 * - Số lần AI bị báo sai
 * - Tỷ lệ báo sai (%)
 */
export function getAIFeedbackStats(): AIFeedbackStats {
  const history = getAIFeedbackHistory();
  const meta = getMetaStats();

  const reportedIncorrectCount = history.filter((r) => r.type === 'incorrect').length;
  // Tổng số câu trả lời: lấy max giữa meta và số lượng phản hồi đã ghi nhận
  const totalResponses = Math.max(meta.totalResponses, reportedIncorrectCount + meta.helpfulCount, 0);

  const errorRate =
    totalResponses > 0
      ? Math.round((reportedIncorrectCount / totalResponses) * 1000) / 10
      : 0;

  const helpfulRate =
    totalResponses > 0
      ? Math.round((meta.helpfulCount / totalResponses) * 1000) / 10
      : 0;

  const reliabilityRate =
    totalResponses > 0
      ? Math.max(0, Math.round((100 - errorRate) * 10) / 10)
      : 100;

  return {
    totalResponses,
    reportedIncorrectCount,
    helpfulCount: meta.helpfulCount,
    errorRate,
    helpfulRate,
    reliabilityRate,
  };
}

/**
 * Đặt lại dữ liệu phản hồi AI (dành cho kiểm thử hoặc quản trị hệ thống)
 */
export function clearAIFeedbackData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_FEEDBACK);
    localStorage.removeItem(STORAGE_KEY_STATS);
    notifyUpdate();
  } catch (e) {
    console.error('Lỗi xóa dữ liệu phản hồi AI:', e);
  }
}
