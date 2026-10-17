-- ====================================================================
-- MATHVERSE – VŨ TRỤ TOÁN HỌC: SUPABASE POSTGRESQL SCHEMA & RLS POLICIES
-- ====================================================================
-- Hướng dẫn cài đặt:
-- 1. Mở trang quản trị Supabase Project của bạn: https://supabase.com/dashboard
-- 2. Vào mục "SQL Editor" ở thanh công cụ bên trái.
-- 3. Bấm "New Query", dán toàn bộ đoạn mã SQL này vào và nhấn "RUN".
-- ====================================================================

-- 1. BẢNG LƯU KẾT QUẢ BÀI HỌC ĐÃ HOÀN THÀNH (learning_results)
CREATE TABLE IF NOT EXISTS public.learning_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL,
    lesson_title TEXT NOT NULL,
    grade_level INTEGER NOT NULL,
    topic TEXT NOT NULL,
    score NUMERIC(5, 2) DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    completion_percent NUMERIC(5, 2) DEFAULT 100,
    answers JSONB DEFAULT '{}'::jsonb,
    completed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Chỉ mục tối ưu hóa tốc độ truy vấn theo học sinh
CREATE INDEX IF NOT EXISTS idx_learning_results_user_id ON public.learning_results(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_results_completed_at ON public.learning_results(completed_at DESC);

-- BẬT ROW LEVEL SECURITY (RLS) CHO learning_results
ALTER TABLE public.learning_results ENABLE ROW LEVEL SECURITY;

-- Policy 1: Học sinh chỉ xem kết quả học tập của chính mình
CREATE POLICY "Users can view their own learning results" 
ON public.learning_results 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy 2: Học sinh chỉ ghi kết quả cho chính tài khoản của mình
CREATE POLICY "Users can insert their own learning results" 
ON public.learning_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Học sinh có thể cập nhật/xóa bản ghi của chính mình (nếu cần)
CREATE POLICY "Users can update their own learning results" 
ON public.learning_results 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learning results" 
ON public.learning_results 
FOR DELETE 
USING (auth.uid() = user_id);


-- 2. BẢNG LƯU TIẾN ĐỘ BÀI HỌC ĐANG LÀM DỞ (learning_progress)
CREATE TABLE IF NOT EXISTS public.learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL,
    lesson_title TEXT NOT NULL,
    grade_level INTEGER NOT NULL,
    topic TEXT NOT NULL,
    current_question INTEGER DEFAULT 0,
    answers JSONB DEFAULT '{}'::jsonb,
    progress_percent NUMERIC(5, 2) DEFAULT 0,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_lesson UNIQUE (user_id, lesson_id)
);

-- Chỉ mục tăng tốc truy vấn tiến độ
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_status ON public.learning_progress(user_id, status);

-- BẬT ROW LEVEL SECURITY (RLS) CHO learning_progress
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

-- Policy 1: Học sinh chỉ xem bài đang làm dở của chính mình
CREATE POLICY "Users can view their own learning progress" 
ON public.learning_progress 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy 2: Học sinh chỉ tạo tiến độ cho chính mình
CREATE POLICY "Users can insert their own learning progress" 
ON public.learning_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Học sinh chỉ cập nhật tiến độ bài học của chính mình
CREATE POLICY "Users can update their own learning progress" 
ON public.learning_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learning progress" 
ON public.learning_progress 
FOR DELETE 
USING (auth.uid() = user_id);

-- Tự động cập nhật trường updated_at khi có thao tác UPDATE
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_learning_progress_timestamp ON public.learning_progress;
CREATE TRIGGER set_learning_progress_timestamp
BEFORE UPDATE ON public.learning_progress
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- HOÀN TẤT: Cả 2 bảng đều được bảo vệ 100% bằng RLS và ràng buộc toàn vẹn.
-- ====================================================================
