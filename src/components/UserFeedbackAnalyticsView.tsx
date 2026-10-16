import React, { useState, useEffect } from 'react';
import { useMathVerse } from '../context/MathVerseContext';
import {
  MessageSquareHeart,
  Star,
  Users,
  Award,
  Sparkles,
  Download,
  RotateCw,
  PlusCircle,
  TrendingUp,
  Heart,
  CheckCircle2,
  FileJson,
  Copy,
  Check,
  Filter,
  BarChart2,
  PieChart,
  Bot,
  RotateCcw,
  BookOpen,
  Target,
  PenTool,
  BarChart3,
  ThumbsUp,
} from 'lucide-react';
import {
  getAllFeedbackSurveys,
  calculateFeedbackAnalytics,
  exportSurveysToJsonFile,
  resetFeedbackSurveys,
  UserFeedbackSurvey,
  FeedbackAnalyticsSummary,
} from '../utils/userFeedbackSurveyManager';
import { WeeklySurveyModal } from './WeeklySurveyModal';
import { soundManager } from '../utils/soundEffects';

export const UserFeedbackAnalyticsView: React.FC = () => {
  const { user } = useMathVerse();
  const [surveys, setSurveys] = useState<UserFeedbackSurvey[]>(() => getAllFeedbackSurveys());
  const [analytics, setAnalytics] = useState<FeedbackAnalyticsSummary>(() =>
    calculateFeedbackAnalytics(getAllFeedbackSurveys())
  );

  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [filterGrade, setFilterGrade] = useState<'all' | 6 | 7 | 8 | 9>('all');
  const [filterRating, setFilterRating] = useState<'all' | '5' | '4' | 'other'>('all');
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const reloadData = () => {
    const list = getAllFeedbackSurveys();
    setSurveys(list);
    setAnalytics(calculateFeedbackAnalytics(list));
  };

  useEffect(() => {
    const handleUpdate = () => {
      reloadData();
    };

    window.addEventListener('mathverse-feedback-survey-updated', handleUpdate);
    return () => {
      window.removeEventListener('mathverse-feedback-survey-updated', handleUpdate);
    };
  }, []);

  const handleExportJson = () => {
    soundManager.playClickSound();
    exportSurveysToJsonFile(surveys);
  };

  const handleCopyJson = () => {
    soundManager.playClickSound();
    navigator.clipboard.writeText(JSON.stringify(surveys, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const filteredSurveys = surveys.filter((s) => {
    if (filterGrade !== 'all' && s.grade !== filterGrade) return false;
    if (filterRating === '5') {
      const avg = (s.easeOfUseRating + s.learningHelpRating) / 2;
      return avg >= 4.8;
    }
    if (filterRating === '4') {
      const avg = (s.easeOfUseRating + s.learningHelpRating) / 2;
      return avg >= 3.8 && avg < 4.8;
    }
    if (filterRating === 'other') {
      const avg = (s.easeOfUseRating + s.learningHelpRating) / 2;
      return avg < 3.8;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER SECTION */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-purple-950/50 border border-indigo-500/30 p-6 sm:p-8 shadow-xl shadow-indigo-950/40">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
                Tiếng Nói Học Sinh
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Khảo Sát Hàng Tuần
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                Lưu trữ LocalStorage
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-pink-200">
              User Feedback Analytics
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Báo cáo phân tích mức độ hài lòng, trải nghiệm sử dụng MathBot AI và hiệu quả cải thiện năng lực Toán học của học sinh THCS sau mỗi tuần học.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                soundManager.playClickSound();
                setIsSurveyModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Gửi Khảo Sát Tuần (+25 XP)</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClickSound();
                setShowJsonModal(true);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileJson className="w-4 h-4" />
              <span>Xem JSON</span>
            </button>

            <button
              onClick={handleExportJson}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Tải file JSON về máy"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Xuất JSON</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClickSound();
                reloadData();
              }}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3 KPI CARDS TRỌNG TÂM: ĐIỂM HÀI LÒNG, SỐ LƯỢNG, TÍNH NĂNG ĐƯỢC THÍCH NHẤT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* KPI 1: ĐIỂM HÀI LÒNG TRUNG BÌNH */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 p-6 shadow-lg shadow-amber-950/20">
          <div className="absolute top-0 right-0 p-4 opacity-15 text-amber-400">
            <Star className="w-20 h-20 fill-amber-400" />
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              Điểm Hài Lòng Trung Bình
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {analytics.satisfactionRate}% Hài lòng
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
              {analytics.overallScore.toFixed(2)}
            </span>
            <span className="text-lg font-bold text-slate-400">/ 5.0</span>
          </div>

          {/* 5 sao visual */}
          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(analytics.overallScore)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Chi tiết 2 câu hỏi */}
          <div className="space-y-1.5 pt-3 border-t border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">1. AI dễ sử dụng:</span>
              <strong className="text-amber-300">{analytics.averageEaseOfUse.toFixed(1)} / 5.0 ⭐</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">2. Giúp học Toán tốt hơn:</span>
              <strong className="text-yellow-300">{analytics.averageLearningHelp.toFixed(1)} / 5.0 ⭐</strong>
            </div>
          </div>
        </div>

        {/* KPI 2: SỐ LƯỢNG KHẢO SÁT */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-900 border border-cyan-500/30 p-6 shadow-lg shadow-cyan-950/20">
          <div className="absolute top-0 right-0 p-4 opacity-15 text-cyan-400">
            <Users className="w-20 h-20" />
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-400" />
              Số Lượng Khảo Sát
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Định kỳ hàng tuần
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-emerald-300">
              {analytics.totalSurveys}
            </span>
            <span className="text-sm font-semibold text-slate-400">phiếu thu thập</span>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Khảo sát tự động bật sau mỗi tuần học hoặc khi học sinh đạt chuỗi học tập (Streak) 7 ngày.
          </p>

          {/* Phân bố theo lớp */}
          <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-slate-800 text-center">
            {analytics.gradeStats.map((gs) => (
              <div key={gs.grade} className="p-1.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
                <div className="text-[10px] text-slate-400">Lớp {gs.grade}</div>
                <div className="text-xs font-bold text-cyan-300">{gs.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* KPI 3: TÍNH NĂNG ĐƯỢC THÍCH NHẤT */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/10 via-slate-900 to-slate-900 border border-indigo-500/30 p-6 shadow-lg shadow-indigo-950/20">
          <div className="absolute top-0 right-0 p-4 opacity-15 text-indigo-400">
            <Award className="w-20 h-20" />
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-400" />
              Tính Năng Được Thích Nhất
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Top 1 Bình chọn
            </span>
          </div>

          <div className="mb-2">
            <div className="text-base sm:text-lg font-black text-white line-clamp-2">
              {analytics.mostLikedFeature.name}
            </div>
            <div className="text-xs text-indigo-300 font-semibold mt-1">
              Chiếm {analytics.mostLikedFeature.percentage}% tổng lượt bình chọn ({analytics.mostLikedFeature.count} phiếu)
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Được học sinh THCS đánh giá cao về khả năng giải thích từng bước và sinh bài tập thích ứng.
          </p>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Á quân:</span>
            <span className="text-pink-300 font-semibold truncate max-w-[200px]">
              {analytics.featureRankings[1]?.feature || 'Ôn tập lỗi sai'} ({analytics.featureRankings[1]?.percentage || 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* BIỂU ĐỒ TRỰC QUAN (VISUAL CHARTS SECTION) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BIỂU ĐỒ 1: BẢNG XẾP HẠNG TÍNH NĂNG YÊU THÍCH (BAR CHART) */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Xếp Hạng Tính Năng Yêu Thích</h2>
            </div>
            <span className="text-xs text-slate-400">Câu hỏi 3</span>
          </div>

          <p className="text-xs text-slate-400">
            Tỷ lệ bình chọn tính năng giúp ích nhiều nhất cho việc học Toán theo phản hồi của học sinh.
          </p>

          <div className="space-y-3.5 pt-2">
            {analytics.featureRankings.map((feat, index) => (
              <div key={feat.feature} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        index === 0
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : index === 1
                          ? 'bg-slate-300 text-slate-950 font-black'
                          : index === 2
                          ? 'bg-amber-700 text-white font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="text-slate-200 font-medium truncate">{feat.feature}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-400 text-[11px]">{feat.count} phiếu</span>
                    <strong className="text-white font-bold">{feat.percentage}%</strong>
                  </div>
                </div>

                {/* Thanh Bar Visual */}
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max(feat.percentage, 4)}%`,
                      backgroundColor: feat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BIỂU ĐỒ 2: PHÂN BỐ SAO ĐÁNH GIÁ (STAR RATING DISTRIBUTION) & KHỐI LỚP */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Phân Bố Sao Đánh Giá (1 - 5 ⭐)</h2>
            </div>
            <span className="text-xs text-slate-400">Câu hỏi 1 & 2</span>
          </div>

          <p className="text-xs text-slate-400">
            Tỷ lệ phân bố mức độ hài lòng tổng hợp trên thang điểm 5 sao.
          </p>

          <div className="space-y-3 pt-2">
            {analytics.starDistribution.map((item) => (
              <div key={item.stars} className="flex items-center gap-3 text-xs">
                <div className="w-16 flex items-center gap-1 shrink-0 font-bold text-amber-300">
                  <span>{item.stars}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </div>

                <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-700"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>

                <div className="w-14 text-right text-slate-300 font-semibold shrink-0">
                  {item.percentage}%
                </div>
                <div className="w-16 text-right text-[11px] text-slate-500 shrink-0">
                  ({item.count} phiếu)
                </div>
              </div>
            ))}
          </div>

          {/* Biểu đồ phụ: So sánh điểm trung bình giữa 4 khối lớp */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Điểm hài lòng trung bình theo khối lớp:</span>
              <span className="text-[11px] text-slate-400">Toán THCS</span>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {analytics.gradeStats.map((gs) => (
                <div
                  key={gs.grade}
                  className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center space-y-1"
                >
                  <div className="text-[11px] text-slate-400 font-medium">Khối {gs.grade}</div>
                  <div className="text-sm font-extrabold text-amber-300 flex items-center justify-center gap-1">
                    <span>{gs.avgScore > 0 ? gs.avgScore.toFixed(1) : '5.0'}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="text-[10px] text-slate-500">{gs.count} học sinh</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DANH SÁCH KHẢO SÁT CHI TIẾT & NHẬN XÉT CỦA HỌC SINH */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquareHeart className="w-5 h-5 text-pink-400" />
              Nhật Ký Khảo Sát & Góp Ý Của Học Sinh ({filteredSurveys.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Các ý kiến đóng góp được lưu giữ nguyên vẹn tại localStorage để nâng cao chất lượng trợ lý AI.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Lọc theo khối lớp */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
              <span className="text-[10px] text-slate-400 px-2 font-semibold">Khối:</span>
              {(['all', 6, 7, 8, 9] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setFilterGrade(g);
                    soundManager.playClickSound();
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer transition-colors ${
                    filterGrade === g
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {g === 'all' ? 'Tất cả' : `Lớp ${g}`}
                </button>
              ))}
            </div>

            {/* Lọc theo sao */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
              <span className="text-[10px] text-slate-400 px-2 font-semibold">Đánh giá:</span>
              <button
                onClick={() => setFilterRating('all')}
                className={`px-2 py-1 rounded-lg font-semibold text-xs cursor-pointer ${
                  filterRating === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilterRating('5')}
                className={`px-2 py-1 rounded-lg font-semibold text-xs flex items-center gap-1 cursor-pointer ${
                  filterRating === '5' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                5⭐
              </button>
              <button
                onClick={() => setFilterRating('4')}
                className={`px-2 py-1 rounded-lg font-semibold text-xs flex items-center gap-1 cursor-pointer ${
                  filterRating === '4' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                4⭐
              </button>
            </div>
          </div>
        </div>

        {/* FEED CARDS */}
        {filteredSurveys.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-2">
            <p className="text-sm text-slate-400">Không tìm thấy phiếu khảo sát nào phù hợp bộ lọc.</p>
            <button
              onClick={() => {
                setFilterGrade('all');
                setFilterRating('all');
              }}
              className="text-xs text-indigo-400 underline font-semibold cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSurveys.map((survey) => (
              <div
                key={survey.id}
                className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:border-indigo-500/40 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{survey.avatar || '👨‍🚀'}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-white">{survey.userName}</strong>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Lớp {survey.grade}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Tuần #{survey.weekNumber} • {survey.dateFormatted}
                      </div>
                    </div>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= Math.round((survey.easeOfUseRating + survey.learningHelpRating) / 2)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Chi tiết 2 câu đánh giá */}
                <div className="grid grid-cols-2 gap-2 text-[11px] p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div>
                    <span className="text-slate-400 block">Dễ sử dụng:</span>
                    <span className="font-bold text-amber-300">{survey.easeOfUseRating}/5 ⭐</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Giúp học tốt hơn:</span>
                    <span className="font-bold text-yellow-300">{survey.learningHelpRating}/5 ⭐</span>
                  </div>
                </div>

                {/* Tính năng thích nhất */}
                <div className="text-xs">
                  <span className="text-slate-400 text-[11px]">Thích nhất: </span>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold text-[11px] mt-0.5">
                    {survey.favoriteFeature}
                  </span>
                </div>

                {/* Góp ý thêm */}
                {survey.additionalComments && (
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/50 text-xs text-slate-300 italic">
                    "{survey.additionalComments}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POPUP KHẢO SÁT */}
      <WeeklySurveyModal
        isOpen={isSurveyModalOpen}
        onClose={() => setIsSurveyModalOpen(false)}
        onSuccess={() => reloadData()}
      />

      {/* MODAL XEM TRỰC TIẾP JSON EXPORT */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-base">
                <FileJson className="w-5 h-5" />
                <span>JSON Export: User Feedback Analytics ({surveys.length} records)</span>
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕ Đóng
              </button>
            </div>

            <pre className="flex-1 overflow-auto bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-400 border border-slate-800 leading-relaxed scrollbar-thin">
              {JSON.stringify(surveys, null, 2)}
            </pre>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={handleCopyJson}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedJson ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Đã sao chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Sao chép JSON</span>
                  </>
                )}
              </button>

              <button
                onClick={handleExportJson}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-600/30"
              >
                <Download className="w-4 h-4" />
                <span>Tải file .json</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
