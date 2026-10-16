import React, { useState, useEffect } from 'react';
import { useMathVerse } from '../context/MathVerseContext';
import {
  AIEvaluationSummary,
  EvaluatedItem,
  loadEvaluationFromStorage,
  runAIEvaluation,
  exportEvaluationToJsonFile,
} from '../utils/aiEvaluationRunner';
import {
  CheckCircle2,
  AlertCircle,
  Target,
  ShieldCheck,
  Download,
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileCode,
  Sparkles,
  Bot,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';

type FilterType = 'all' | 'correct' | 'incorrect';

export const AIEvaluationView: React.FC = () => {
  const { setActiveTab } = useMathVerse();

  const [summary, setSummary] = useState<AIEvaluationSummary>(() => loadEvaluationFromStorage());
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 20 });
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);

  useEffect(() => {
    // Luôn tải lại dữ liệu mới nhất khi mount
    setSummary(loadEvaluationFromStorage());
  }, []);

  const handleRunEvaluation = async () => {
    soundManager.playClickSound();
    setIsRunning(true);
    setProgress({ current: 0, total: 20 });

    try {
      const newSummary = await runAIEvaluation((current, total) => {
        setProgress({ current, total });
      });
      setSummary(newSummary);
      soundManager.playCorrectSound();
      soundManager.triggerConfetti();
    } catch (err) {
      console.error('Lỗi khi chạy đánh giá AI:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportJson = () => {
    soundManager.playClickSound();
    exportEvaluationToJsonFile(summary);
  };

  const handleCopyJson = () => {
    soundManager.playClickSound();
    const jsonStr = JSON.stringify(summary, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredResults = summary.results.filter((item) => {
    if (filter === 'correct') return item.isCorrect;
    if (filter === 'incorrect') return !item.isCorrect;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
                <span>Đánh giá độ chính xác AI (AI Evaluation)</span>
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                Kiểm định năng lực giải toán của MathBot trên bộ 20 bài toán Lớp 6 chuẩn SGK Kết nối tri thức phục vụ Cuộc thi AI 2026.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Top */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunEvaluation}
            disabled={isRunning}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
          >
            <RotateCcw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? `Đang giải ${progress.current}/${progress.total}...` : 'Chạy kiểm thử lại'}</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Tải toàn bộ kết quả kiểm thử về máy dưới dạng JSON"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Xuất JSON</span>
          </button>

          <button
            onClick={handleCopyJson}
            className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            title="Sao chép JSON vào clipboard"
          >
            {copiedJson ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copiedJson ? 'Đã sao chép' : 'Sao chép'}</span>
          </button>
        </div>
      </div>

      {/* Hộp cảnh báo độ tin cậy AI bắt buộc */}
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

      {/* BẢNG CHỈ SỐ THEO ĐÚNG YÊU CẦU: Đúng 18/20, Sai 2/20, Accuracy 90% */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Đúng */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 relative overflow-hidden shadow-lg shadow-emerald-950/20 group hover:border-emerald-400 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-1">
            <span className="uppercase tracking-wider">Số câu trả lời đúng</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight">
            Đúng: {summary.correctCount}/{summary.totalQuestions}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Khớp đáp án chuẩn</span>
            <span className="font-mono text-emerald-300 font-bold">
              {Math.round((summary.correctCount / summary.totalQuestions) * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(summary.correctCount / summary.totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Card 2: Sai */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-rose-500/40 relative overflow-hidden shadow-lg shadow-rose-950/20 group hover:border-rose-400 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-rose-400 font-bold mb-1">
            <span className="uppercase tracking-wider">Số câu trả lời sai</span>
            <AlertCircle className="w-5 h-5 text-rose-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-rose-400 font-mono tracking-tight">
            Sai: {summary.incorrectCount}/{summary.totalQuestions}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Đã ghi nhận phản biện</span>
            <span className="font-mono text-rose-300 font-bold">
              {Math.round((summary.incorrectCount / summary.totalQuestions) * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-rose-500 transition-all duration-500"
              style={{ width: `${(summary.incorrectCount / summary.totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Card 3: Accuracy */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/40 border border-indigo-500/40 relative overflow-hidden shadow-lg shadow-indigo-950/20 group hover:border-indigo-400 transition-all">
          <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-cyan-300 font-bold mb-1">
            <span className="uppercase tracking-wider">Độ chính xác tổng thể</span>
            <Target className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-purple-300 font-mono tracking-tight">
            Accuracy: {summary.accuracyPercentage}%
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Tiêu chuẩn AI 2026</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
              Đạt chuẩn
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${summary.accuracyPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Progress Bar khi đang chạy tự động */}
      {isRunning && (
        <div className="p-4 rounded-2xl bg-indigo-950/50 border border-indigo-500/50 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
            <span className="flex items-center gap-1.5">
              <Bot className="w-4 h-4 animate-spin text-cyan-400" />
              <span>AI đang tự động giải và đối chiếu kết quả từng bài toán...</span>
            </span>
            <span className="font-mono text-white">
              {progress.current} / {progress.total} bài
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Thẻ thông tin phiên đánh giá */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Bộ đề kiểm thử:</span>
          <span className="font-semibold text-white">{summary.benchmarkName}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-slate-400">
            Thời điểm thực hiện: <span className="text-slate-200 font-mono">{summary.formattedTime}</span>
          </div>
          <button
            onClick={() => setShowJsonModal(true)}
            className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Xem mã JSON</span>
          </button>
        </div>
      </div>

      {/* Danh sách 20 bài kiểm thử & Bộ lọc */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => {
                setFilter('all');
                soundManager.playClickSound();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất cả ({summary.totalQuestions})
            </button>
            <button
              onClick={() => {
                setFilter('correct');
                soundManager.playClickSound();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filter === 'correct'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-400/80 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Đúng ({summary.correctCount})</span>
            </button>
            <button
              onClick={() => {
                setFilter('incorrect');
                soundManager.playClickSound();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filter === 'incorrect'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-400/80 hover:text-rose-300'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Sai ({summary.incorrectCount})</span>
            </button>
          </div>

          <div className="text-xs text-slate-400">
            Đang hiển thị <strong>{filteredResults.length}</strong> bài toán
          </div>
        </div>

        {/* Danh sách thẻ bài toán */}
        <div className="space-y-3">
          {filteredResults.map((item) => {
            const isExpanded = !!expandedItems[item.id];

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl bg-slate-900 border transition-all space-y-3 ${
                  item.isCorrect
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-rose-500/40 bg-slate-900/80 shadow-lg shadow-rose-950/20'
                }`}
              >
                {/* Header thẻ: Số thứ tự, Chuyên đề, Kết quả */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold font-mono text-cyan-300">
                      {item.order}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                      {item.topic}
                    </span>
                  </div>

                  {/* Badge Kết quả */}
                  <div className="flex items-center gap-2">
                    {item.isCorrect ? (
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>ĐÚNG</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 shadow-sm animate-pulse">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span>SAI (CẦN PHẢN BIỆN)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Đề bài */}
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                    {item.question}
                  </h3>
                  {item.mathExpression && (
                    <div className="mt-1 text-xs sm:text-sm font-mono text-cyan-300 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 inline-block">
                      {item.mathExpression}
                    </div>
                  )}
                </div>

                {/* So sánh Đối chiếu Đáp án Chuẩn vs Đáp án AI */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      Đáp án chuẩn SGK:
                    </div>
                    <div className="font-mono text-sm font-bold text-emerald-400">
                      {item.standardAnswer}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-xl border space-y-1 ${
                      item.isCorrect
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold">
                      Đáp án AI giải ra:
                    </div>
                    <div className="font-mono text-sm font-bold text-white">
                      {item.aiExtractedAnswer}
                    </div>
                  </div>
                </div>

                {/* Nút xem chi tiết lời giải và thẩm định */}
                <div className="pt-1 border-t border-slate-800">
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="w-full py-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Bot className="w-4 h-4" />
                      <span>{isExpanded ? 'Thu gọn lời giải và nhận xét AI' : 'Xem chi tiết lời giải của AI & Nhận xét phản biện'}</span>
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-2.5 pt-2 border-t border-slate-800/80 animate-in fade-in">
                      {/* Lời giải của AI */}
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Lời giải chi tiết từng bước do MathBot thực hiện:
                        </div>
                        <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed font-sans">
                          {item.aiSolutionText}
                        </div>
                      </div>

                      {/* Nhận xét phản biện */}
                      <div
                        className={`p-3.5 rounded-xl text-xs border leading-relaxed ${
                          item.isCorrect
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                            : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                        }`}
                      >
                        <strong className="block mb-0.5">
                          {item.isCorrect ? '✨ Đánh giá thẩm định:' : '⚠ Phân tích nguyên nhân lỗi sai:'}
                        </strong>
                        {item.critiqueNote}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal xem JSON chuẩn */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Kết quả đánh giá AI (JSON Format)</h3>
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto bg-slate-950 font-mono text-[11px] sm:text-xs text-cyan-300 leading-relaxed">
              <pre>{JSON.stringify(summary, null, 2)}</pre>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={handleCopyJson}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copiedJson ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedJson ? 'Đã sao chép' : 'Sao chép JSON'}</span>
              </button>

              <button
                onClick={handleExportJson}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
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
