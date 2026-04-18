import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  QrCode,
  CheckCircle,
  Shield,
  Clock,
  Camera,
} from 'lucide-react';

const features = [
  {
    icon: Camera,
    text: 'Photo-verified cleaning documentation',
  },
  {
    icon: CheckCircle,
    text: 'Real-time zone checklists and compliance tracking',
  },
  {
    icon: Shield,
    text: 'Audit-ready reports with timestamped evidence',
  },
  {
    icon: Clock,
    text: 'Shift management and team coordination',
  },
];

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    navigate('/dashboard');
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding (desktop only) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#0A1628] p-12 lg:flex">
        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          <span className="text-2xl font-bold tracking-wide text-white">
            CPC SERVICES
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold leading-tight text-white">
            Airport Cleaning
            <br />
            Documentation Platform
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-400">
            Streamline your cleaning operations with real-time photo
            documentation, compliance tracking, and automated reporting.
          </p>

          <ul className="mt-10 space-y-5">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2563EB]/15">
                  <Icon size={16} className="text-[#3B82F6]" />
                </div>
                <span className="pt-0.5 text-sm leading-relaxed text-gray-300">
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} CPC Services. All rights
            reserved.
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex w-full flex-col items-center justify-center bg-white px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <span className="text-xl font-bold tracking-wide text-[#0A1628]">
              CPC SERVICES
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Sign in to your CPC Services account
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@cpcservices.com"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-11 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#2563EB] accent-[#2563EB]"
                />
                Remember me
              </label>
              <button
                type="button"
                className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full rounded-lg bg-[#2563EB] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] active:bg-[#1E40AF]"
            >
              Sign In
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium text-gray-400">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* QR code login */}
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            <QrCode size={18} />
            Sign in with QR Code
          </button>

          {/* Contact admin */}
          <p className="mt-8 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <span className="font-medium text-[#2563EB]">
              Contact your administrator
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
