import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Đọc cấu hình từ biến môi trường với fallback đã cung cấp
const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  'https://dqwxqqdyesytzlkybmlt.supabase.co';

const supabaseKey =
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_VGS5tKUakbo0L8kyHRUjUw_Lw3yfLDI';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseKey.length > 20
  );
};

// Khởi tạo Supabase client khi có biến môi trường hợp lệ, không tạo URL hoặc key giả
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Kiểu dữ liệu tương ứng với bảng learning_results trong Supabase PostgreSQL
export interface LearningResult {
  id?: string;
  user_id: string;
  lesson_id: string;
  lesson_title: string;
  grade_level: number;
  topic: string;
  score: number;
  correct_count: number;
  wrong_count: number;
  completion_percent: number;
  answers: Record<string, any>;
  completed_at?: string;
}

// Kiểu dữ liệu tương ứng với bảng learning_progress trong Supabase PostgreSQL
export interface LearningProgress {
  id?: string;
  user_id: string;
  lesson_id: string;
  lesson_title: string;
  grade_level: number;
  topic: string;
  current_question: number;
  answers: Record<string, any>;
  progress_percent: number;
  status: 'in_progress' | 'completed';
  updated_at?: string;
}

/**
 * 1. Lưu kết quả hoàn thành bài học vào bảng `learning_results`
 */
export async function saveLearningResult(
  result: Omit<LearningResult, 'id' | 'completed_at'>
): Promise<{ data: LearningResult | null; error: Error | null }> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      data: null,
      error: new Error(
        'Supabase chưa được cấu hình. Vui lòng thêm VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY vào biến môi trường.'
      ),
    };
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData?.session?.user;

    if (!currentUser) {
      return { data: null, error: new Error('Người dùng chưa đăng nhập Supabase') };
    }

    // Đảm bảo user_id luôn lấy từ phiên xác thực an toàn của Supabase
    const payload: LearningResult = {
      ...result,
      user_id: currentUser.id,
      completed_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('learning_results')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Lỗi khi lưu learning_results:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('[Supabase] Ngoại lệ khi lưu learning_results:', err);
    return { data: null, error: err };
  }
}

/**
 * 2. Lưu hoặc cập nhật tiến độ bài đang làm dở vào bảng `learning_progress` (Upsert)
 */
export async function saveLearningProgress(
  progress: Omit<LearningProgress, 'id' | 'updated_at'>
): Promise<{ data: LearningProgress | null; error: Error | null }> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      data: null,
      error: new Error(
        'Supabase chưa được cấu hình. Vui lòng thêm VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY vào biến môi trường.'
      ),
    };
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData?.session?.user;

    if (!currentUser) {
      return { data: null, error: new Error('Người dùng chưa đăng nhập Supabase') };
    }

    const payload: LearningProgress = {
      ...progress,
      user_id: currentUser.id,
      updated_at: new Date().toISOString(),
    };

    // Upsert dựa trên khóa kết hợp (user_id, lesson_id)
    const { data, error } = await supabase
      .from('learning_progress')
      .upsert(payload, { onConflict: 'user_id,lesson_id' })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Lỗi khi lưu learning_progress:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('[Supabase] Ngoại lệ khi lưu learning_progress:', err);
    return { data: null, error: err };
  }
}

/**
 * 3. Tải danh sách bài đang làm dở của học sinh hiện tại
 */
export async function fetchActiveInProgress(
  userId: string
): Promise<{ data: LearningProgress[]; error: Error | null }> {
  if (!isSupabaseConfigured() || !supabase || !userId) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Lỗi khi tải learning_progress:', error.message);
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data as LearningProgress[]) || [], error: null };
  } catch (err: any) {
    return { data: [], error: err };
  }
}

/**
 * 4. Tải lịch sử bài học đã hoàn thành của học sinh hiện tại
 */
export async function fetchLearningResults(
  userId: string
): Promise<{ data: LearningResult[]; error: Error | null }> {
  if (!isSupabaseConfigured() || !supabase || !userId) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('learning_results')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Lỗi khi tải learning_results:', error.message);
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data as LearningResult[]) || [], error: null };
  } catch (err: any) {
    return { data: [], error: err };
  }
}

/**
 * 5. Tải tiến độ cụ thể của một bài học để tiếp tục làm
 */
export async function fetchLessonProgress(
  userId: string,
  lessonId: string
): Promise<{ data: LearningProgress | null; error: Error | null }> {
  if (!isSupabaseConfigured() || !supabase || !userId || !lessonId) {
    return { data: null, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as LearningProgress | null, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}
