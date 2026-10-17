import React, { useState } from 'react';
import { Grade } from '../types/mathverse';
import { useMathVerse } from '../context/MathVerseContext';
import {
  Sparkles,
  Compass,
  Rocket,
  BookOpen,
  ChevronRight,
  Lock,
  Mail,
  User,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';

const AVATARS = [
  { icon: '👨‍🚀', label: 'Phi hành gia' },
  { icon: '👩‍🚀', label: 'Nhà thám hiểm' },
  { icon: '🦉', label: 'Cú thông thái' },
  { icon: '🤖', label: 'Robot MathBot' },
  { icon: '🦊', label: 'Cáo nhanh nhẹn' },
  { icon: '⭐', label: 'Ngôi sao nhỏ' },
];

const GRADES: { grade: Grade; title: string; subtitle: string; icon: string; bgGrad: string }[] = [
  {
    grade: 6,
    title: 'Lớp 6',
    subtitle: 'Số tự nhiên, Số nguyên, Phân số & Hình trực quan',
    icon: '🌱',
    bgGrad: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
  },
  {
    grade: 7,
    title: 'Lớp 7',
    subtitle: 'Số hữu tỉ, Tỉ lệ thức, Tam giác & Định lý Pythagore',
    icon: '📐',
    bgGrad: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30',
  },
  {
    grade: 8,
    title: 'Lớp 8',
    subtitle: 'Hằng đẳng thức, Phương trình & Định lý Thalès',
    icon: '⚡',
    bgGrad: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/30',
  },
  {
    grade: 9,
    title: 'Lớp 9',
    subtitle: 'Căn bậc hai, Hệ phương trình, Vi-ét & Đường tròn',
    icon: '👑',
    bgGrad: 'from-purple-500/20 to-pink-500/10 border-purple-500/30',
  },
];

type AuthMode = 'login' | 'register' | 'forgot_password' | 'guest';

export const LoginScreen: React.FC = () => {
  const {
    login,
    loginWithSupabase,
    registerWithSupabase,
    resetSupabasePassword,
    isSupabaseConnected,
    authLoading,
  } = useMathVerse();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<Grade>(6);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].icon);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Xử lý Đăng nhập Supabase
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      soundManager.playWrongSound();
      return;
    }

    setLoading(true);
    soundManager.playClickSound();

    const result = await loginWithSupabase(email.trim(), password);
    setLoading(false);

    if (result.error) {
      setErrorMessage(result.error);
      soundManager.playWrongSound();
    }
  };

  // 2. Xử lý Đăng ký Supabase
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên của em.');
      soundManager.playWrongSound();
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ.');
      soundManager.playWrongSound();
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Mật khẩu cần có ít nhất 6 ký tự để bảo mật.');
      soundManager.playWrongSound();
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      soundManager.playWrongSound();
      return;
    }

    setLoading(true);
    soundManager.playClickSound();

    const result = await registerWithSupabase(
      email.trim(),
      password,
      name.trim(),
      selectedGrade,
      selectedAvatar
    );
    setLoading(false);

    if (result.error) {
      setErrorMessage(result.error);
      soundManager.playWrongSound();
    } else if (result.needsEmailConfirmation) {
      setSuccessMessage(
        'Đăng ký tài khoản thành công! Supabase đã gửi email xác thực đến hòm thư của em. Vui lòng mở email và bấm xác thực để hoàn tất.'
      );
      soundManager.playCorrectSound();
    }
  };

  // 3. Xử lý Quên mật khẩu Supabase
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Vui lòng nhập email tài khoản của em để nhận liên kết khôi phục.');
      soundManager.playWrongSound();
      return;
    }

    setLoading(true);
    soundManager.playClickSound();

    const result = await resetSupabasePassword(email.trim());
    setLoading(false);

    if (result.error) {
      setErrorMessage(result.error);
      soundManager.playWrongSound();
    } else {
      setSuccessMessage(
        result.message || 'Đã gửi liên kết khôi phục vào email của em. Vui lòng kiểm tra hộp thư đến.'
      );
      soundManager.playCorrectSound();
    }
  };

  // 4. Xử lý Chế độ khách (Trải nghiệm nhanh)
  const handleGuestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập tên của em để bắt đầu nhé!');
      soundManager.playWrongSound();
      return;
    }
    soundManager.playClickSound();
    login(name.trim(), selectedGrade, selectedAvatar);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Đang kiểm tra phiên đăng nhập Supabase...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 flex items-center justify-center p-4">
      {/* Background Cosmic Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[128px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-purple-600/15 rounded-full blur-[96px]" />

        <span className="absolute top-16 left-12 text-cyan-500/20 text-4xl select-none font-mono font-bold animate-bounce">
          π
        </span>
        <span className="absolute top-28 right-24 text-indigo-400/20 text-5xl select-none font-mono font-bold">
          ∑
        </span>
        <span className="absolute bottom-24 left-20 text-purple-400/20 text-5xl select-none font-mono font-bold">
          √
        </span>
        <span className="absolute bottom-32 right-16 text-pink-400/20 text-4xl select-none font-mono font-bold">
          ∞
        </span>
        <span className="absolute top-2/3 left-1/3 text-emerald-400/15 text-3xl select-none font-mono font-bold">
          Δ
        </span>
      </div>

      <div className="relative z-10 w-full max-w-xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 shadow-2xl shadow-indigo-950/50 rounded-3xl p-6 sm:p-8">
        {/* Header Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-tr from-indigo-600 to-cyan-400 rounded-2xl shadow-lg shadow-indigo-500/30 mb-3 transform hover:scale-105 transition-transform duration-300">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-purple-400 tracking-tight">
            MathVerse
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1 flex items-center justify-center gap-1.5 font-medium">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Vũ trụ Toán học THCS • Bộ sách Kết nối tri thức
          </p>

          {/* Trạng thái Supabase Cloud */}
          <div className="mt-3 flex items-center justify-center">
            {isSupabaseConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Database className="w-3 h-3" /> Supabase PostgreSQL Cloud: Đã kết nối
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Database className="w-3 h-3" /> Chờ cấu hình Supabase Cloud (Khách / Offline)
              </span>
            )}
          </div>
        </div>

        {/* Auth Mode Tabs */}
        <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-950/80 border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-gradient-to-r from-cyan-500/30 to-indigo-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-gradient-to-r from-cyan-500/30 to-indigo-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Đăng ký
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('guest');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mode === 'guest'
                ? 'bg-gradient-to-r from-cyan-500/30 to-indigo-600/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Vào nhanh
          </button>
        </div>

        {/* Thông báo lỗi & thành công */}
        {errorMessage && (
          <div className="p-3.5 mb-5 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 mb-5 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium">{successMessage}</div>
          </div>
        )}

        {/* FORM 1: ĐĂNG NHẬP SUPABASE */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email học sinh
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nhap.email@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_password');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu của em..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-6 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang đăng nhập Supabase...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập tài khoản</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* FORM 2: ĐĂNG KÝ TÀI KHOẢN MỚI */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Họ và tên học sinh
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nhap.email@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Chọn lớp học */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Khối lớp học tập
              </label>
              <div className="grid grid-cols-4 gap-2">
                {([6, 7, 8, 9] as Grade[]).map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => {
                      setSelectedGrade(g);
                      soundManager.playClickSound();
                    }}
                    className={`py-2 px-1 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      selectedGrade === g
                        ? 'bg-indigo-600 text-white border-cyan-400 ring-2 ring-cyan-400/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Lớp {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Chọn avatar */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Nhân vật đại diện
              </label>
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((av) => (
                  <button
                    type="button"
                    key={av.label}
                    onClick={() => {
                      setSelectedAvatar(av.icon);
                      soundManager.playClickSound();
                    }}
                    className={`p-2 rounded-xl border text-xl transition-all cursor-pointer ${
                      selectedAvatar === av.icon
                        ? 'bg-indigo-600/40 border-cyan-400 scale-105'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    {av.icon}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang đăng ký tài khoản...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Hoàn tất đăng ký</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* FORM 3: QUÊN MẬT KHẨU */}
        {mode === 'forgot_password' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Nhập email em đã dùng để đăng ký tài khoản. Hệ thống Supabase sẽ gửi đường link đặt lại mật khẩu an toàn đến hòm thư của em.
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email tài khoản
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nhap.email@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Đang gửi link...' : 'Gửi link đặt lại mật khẩu'}
              </button>
            </div>
          </form>
        )}

        {/* FORM 4: VÀO NHANH (GUEST MODE) */}
        {mode === 'guest' && (
          <form onSubmit={handleGuestLogin} className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Trải nghiệm học tập ngay không cần mật khẩu. Dữ liệu điểm và bài tập sẽ được lưu trên trình duyệt này.
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Tên hoặc biệt danh của em
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên của em..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                maxLength={30}
                required
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {([6, 7, 8, 9] as Grade[]).map((g) => (
                <button
                  type="button"
                  key={g}
                  onClick={() => {
                    setSelectedGrade(g);
                    soundManager.playClickSound();
                  }}
                  className={`py-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                    selectedGrade === g
                      ? 'bg-indigo-600 text-white border-cyan-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Lớp {g}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3.5 px-6 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <span>Bắt đầu học ngay</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Footer highlights */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-[12px] text-slate-400">
          <div className="flex flex-col items-center gap-1">
            <span className="text-cyan-400 font-semibold flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Chuẩn THCS
            </span>
            <span>Lớp 6, 7, 8, 9</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-indigo-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> MathBot AI
            </span>
            <span>Gia sư giải thích</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-purple-400 font-semibold flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" /> Ôn tập thông minh
            </span>
            <span>Tự chữa điểm yếu</span>
          </div>
        </div>
      </div>
    </div>
  );
};
