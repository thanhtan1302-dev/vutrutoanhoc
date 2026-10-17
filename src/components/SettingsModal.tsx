import React, { useState, useEffect } from 'react';
import { useMathVerse } from '../context/MathVerseContext';
import { Grade } from '../types/mathverse';
import {
  Settings,
  Volume2,
  VolumeX,
  User,
  RotateCcw,
  LogOut,
  Save,
  Check,
  AlertTriangle,
  Music,
  Headphones,
  Sparkles,
  Lock,
  Bot,
  ShieldCheck,
  ThumbsDown,
  ExternalLink,
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';
import { musicPlayer, MUSIC_TRACKS } from '../utils/musicPlayer';
import { isGradeUnlocked } from '../data/promotionExamsData';
import { getAIFeedbackStats, clearAIFeedbackData, AIFeedbackStats } from '../utils/aiFeedbackManager';

const AVATARS = ['👨‍🚀', '👩‍🚀', '🦉', '🤖', '🦊', '⭐'];

export const SettingsModal: React.FC = () => {
  const {
    user,
    toggleSound,
    updateGrade,
    updateProfile,
    resetAllData,
    logout,
    setLockedGradeAttempt,
    setActiveTab,
  } = useMathVerse();

  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '👨‍🚀');
  const [selectedGrade, setSelectedGrade] = useState<Grade>(user?.grade || 6);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClearAI, setConfirmClearAI] = useState(false);
  const [aiStats, setAiStats] = useState<AIFeedbackStats>(() => getAIFeedbackStats());

  // Music state
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState('cosmic-nebula');
  const [musicVolume, setMusicVolume] = useState(0.45);

  useEffect(() => {
    const unsub = musicPlayer.subscribe((state) => {
      setIsMusicPlaying(state.isPlaying);
      setCurrentTrackId(state.trackId);
      setMusicVolume(state.volume);
    });
    const s = musicPlayer.getState();
    setIsMusicPlaying(s.isPlaying);
    setCurrentTrackId(s.trackId);
    setMusicVolume(s.volume);

    const handleAiStatsUpdate = () => {
      setAiStats(getAIFeedbackStats());
    };
    window.addEventListener('mathverse-ai-feedback-updated', handleAiStatsUpdate);

    return () => {
      unsub();
      window.removeEventListener('mathverse-ai-feedback-updated', handleAiStatsUpdate);
    };
  }, []);

  if (!user) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      updateProfile(name.trim(), avatar);
      updateGrade(selectedGrade);
      soundManager.playClickSound();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const handleReset = () => {
    soundManager.playWrongSound();
    resetAllData();
    setConfirmReset(false);
  };

  const handleClearAI = () => {
    soundManager.playClickSound();
    clearAIFeedbackData();
    setConfirmClearAI(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
          <Settings className="w-7 h-7 text-indigo-400" />
          <span>Cài đặt hệ thống</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Tùy chỉnh thông tin cá nhân, khối lớp, nhạc nền tập trung và hiệu ứng âm thanh.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        {/* Background Music Section */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-950 to-purple-950/60 border border-indigo-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Headphones className="w-4 h-4 text-cyan-400" />
                <span>Nhạc nền Không gian Tập trung</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                  MỚI
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Giai điệu Lo-Fi & Ambient thư giãn giúp giảm căng thẳng và tăng khả năng tập trung
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                soundManager.playClickSound();
                musicPlayer.togglePlay();
              }}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                isMusicPlaying ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-indigo-400" />
                Âm lượng nhạc nền:
              </span>
              <span className="font-mono text-cyan-400 font-bold">
                {Math.round(musicVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={musicVolume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setMusicVolume(val);
                musicPlayer.setVolume(val);
              }}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Track selection */}
          <div className="space-y-2 pt-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Danh sách bản nhạc nền:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MUSIC_TRACKS.map((t) => {
                const isSelected = t.id === currentTrackId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      soundManager.playClickSound();
                      musicPlayer.setTrack(t.id);
                      if (!isMusicPlaying) musicPlayer.play();
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <div className="truncate">
                      <div className="text-xs font-bold truncate">{t.title}</div>
                      <div className="text-[10px] text-slate-400 truncate">{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Sound FX Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                {user.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
                <span>Hiệu ứng âm thanh khi trả lời câu hỏi</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Âm thanh vui nhộn khi trả lời đúng, sai và hoàn thành bài thi
              </p>
            </div>

            <button
              type="button"
              onClick={toggleSound}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                user.soundEnabled ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
            </button>
          </div>

          {/* Student Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Họ và tên học sinh
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              maxLength={30}
            />
          </div>

          {/* Avatar selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Nhân vật đại diện
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((av) => (
                <button
                  type="button"
                  key={av}
                  onClick={() => setAvatar(av)}
                  className={`p-3 rounded-xl border text-2xl transition-all cursor-pointer ${
                    avatar === av
                      ? 'bg-indigo-600/30 border-cyan-400 ring-2 ring-cyan-400/30'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Grade Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Lớp đang học (Bộ sách Kết nối tri thức)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([6, 7, 8, 9] as Grade[]).map((g) => {
                const unlocked = isGradeUnlocked(user, g);
                return (
                  <button
                    type="button"
                    key={g}
                    onClick={() => {
                      if (unlocked) {
                        setSelectedGrade(g);
                        soundManager.playClickSound();
                      } else {
                        soundManager.playWrongSound();
                        setLockedGradeAttempt(g);
                      }
                    }}
                    className={`p-3 rounded-xl border font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedGrade === g
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                        : unlocked
                        ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-500 hover:text-slate-400'
                    }`}
                  >
                    <span>Lớp {g}</span>
                    {!unlocked && <Lock className="w-3 h-3 text-amber-400" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              * Để mở khóa lớp cao hơn, em cần vượt qua bài tập tổng hợp Kết nối tri thức của các lớp trước đó.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Lưu thay đổi
            </button>
            {savedSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold animate-in fade-in">
                <Check className="w-4 h-4" /> Đã cập nhật thành công!
              </span>
            )}
          </div>
        </form>

        {/* Thống kê Phản biện & Độ tin cậy AI 2026 */}
        <div className="pt-6 border-t border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Thống kê Phản biện MathBot AI (AI 2026)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                soundManager.playClickSound();
                setActiveTab('analytics');
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Xem báo cáo chi tiết</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 grid grid-cols-3 gap-3 text-center">
            <div className="p-2 space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Tổng câu trả lời AI</div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white">
                {aiStats.totalResponses}
              </div>
            </div>
            <div className="p-2 space-y-1 border-x border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">Số lần báo sai</div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400">
                {aiStats.reportedIncorrectCount}
              </div>
            </div>
            <div className="p-2 space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Tỷ lệ báo sai</div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-300">
                {aiStats.errorRate}%
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-300" />
              <span className="text-purple-200">
                Bộ kiểm thử tự động <strong>20 bài toán Lớp 6</strong> (AI Evaluation Benchmark)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundManager.playClickSound();
                setActiveTab('ai_eval');
              }}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1"
            >
              <span>Mở AI Evaluation</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Dữ liệu phản hồi được lưu trữ an toàn trong localStorage trên trình duyệt.</span>
            {!confirmClearAI ? (
              <button
                type="button"
                onClick={() => setConfirmClearAI(true)}
                className="text-rose-400 hover:text-rose-300 text-xs font-semibold cursor-pointer underline"
              >
                Xóa dữ liệu kiểm thử AI
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-rose-300">Xác nhận xóa?</span>
                <button
                  type="button"
                  onClick={handleClearAI}
                  className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-bold cursor-pointer"
                >
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAI(false)}
                  className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[11px] cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone: Reset & Logout */}
        <div className="pt-6 border-t border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Tài khoản & Quản trị dữ liệu
          </h3>

          {/* Supabase Account Info */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-400">Trạng thái đồng bộ Supabase Cloud:</div>
              <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                {user.isSupabaseAuth ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Đã đăng nhập: {user.email || user.name}</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Chế độ Khách (Dữ liệu lưu tạm trên máy này)</span>
                  </>
                )}
              </div>
              {user.id && (
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  User ID: {user.id}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-950 border border-rose-500/30 text-rose-300 hover:bg-rose-950/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Đặt lại dữ liệu điểm & tiến độ
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center gap-3">
                <span className="text-xs text-rose-200">
                  Xác nhận đặt lại về 0 XP?
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Đồng ý
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={logout}
              className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Đăng xuất tài khoản
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
