import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#FAF7F2] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden selection:bg-[#EAE0D0] selection:text-[#1C1917]">
      {/* Decorative Subtle Liquid Silk Curves Backdrop */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute -top-32 -left-32 w-[600px] h-[600px] text-[#EDE4D4]/30"
          viewBox="0 0 100 100"
          fill="currentColor"
        >
          <path d="M0,50 Q25,0 50,50 T100,50 L100,100 L0,100 Z" />
        </svg>
        <svg
          className="absolute -bottom-40 -right-40 w-[700px] h-[700px] text-[#EFE7D8]/40"
          viewBox="0 0 100 100"
          fill="currentColor"
        >
          <path d="M0,50 Q25,100 50,50 T100,50 L100,100 L0,100 Z" />
        </svg>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-gradient-to-tr from-[#BA954F]/5 to-transparent blur-3xl pointer-events-none" />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <BrandLogo className="mx-auto h-auto w-48 max-w-full object-contain drop-shadow-2xs" />
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#8C7E72] font-semibold">
          Inking your brand
        </p>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md w-full">
        <div className="bg-white/95 backdrop-blur-md border border-[#EDE7DD] py-8 px-6 sm:px-10 shadow-xl rounded-2xl">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-serif font-bold text-[#1C1917]">Welcome to White Ink</h2>
            <p className="text-xs text-[#78716C] mt-1">Sign in to access your projects and studio workspace</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 text-xs text-[#B91C1C] bg-[#FDF2F0] border border-[#F5D5D0] rounded-xl font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#BA954F]">
                  <Mail className="h-4 w-4 stroke-[1.75]" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-[#DFD5C6] text-[#1C1917] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] placeholder-[#A8A29E] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#BA954F]">
                  <Lock className="h-4 w-4 stroke-[1.75]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-[#DFD5C6] text-[#1C1917] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] placeholder-[#A8A29E] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#1C1917] p-1 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#DFD5C6] text-[#BA954F] focus:ring-[#BA954F] accent-[#BA954F]"
                />
                <span className="text-xs text-[#57534E]">Remember me</span>
              </label>
              <span className="text-xs text-[#BA954F] hover:text-[#A17B2F] hover:underline cursor-pointer font-medium">
                Forgot password?
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] transition-all duration-150 shadow-xs disabled:opacity-50 mt-4 cursor-pointer btn-hover-lift"
            >
              {isLoading ? 'Signing in...' : 'Sign in to Dashboard'}
              <ArrowRight className="h-4 w-4 stroke-[2]" />
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-[#8C7E72] font-brand-script text-xl">
            Ideas today. Impact tomorrow.
          </p>
        </div>
      </div>
    </div>
  );
};
