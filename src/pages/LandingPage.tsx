import React from 'react';
import { motion } from 'motion/react';
import { BrandLogo } from '../components/common/BrandLogo';
import { Sparkles, Layers, ShieldCheck, ArrowRight, CheckCircle2, MessageSquare, FileCheck, BarChart3 } from 'lucide-react';

export const LandingPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const features = [
    {
      icon: Layers,
      title: 'Studio Project Workspaces',
      desc: 'Seamless collaborative pipelines from creative concept to review, approvals, and final handover.',
    },
    {
      icon: FileCheck,
      title: 'Direct Client Approvals',
      desc: 'Structured approvals, real-time feedback loops, revision requests, and deliverable sign-offs.',
    },
    {
      icon: MessageSquare,
      title: 'Real-Time Communication',
      desc: 'Direct in-app messaging, active team chat, project discussions, and instant notification updates.',
    },
    {
      icon: BarChart3,
      title: 'Studio Performance & Insights',
      desc: 'Precision attendance, timesheets, daily priorities, SOP documentation, and progress analytics.',
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#FAF7F2] text-[#1C1917] flex flex-col justify-between overflow-hidden selection:bg-[#EAE0D0] selection:text-[#1C1917]">
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
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-[#FAF4EC] to-transparent blur-3xl pointer-events-none" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-10 w-auto max-w-[9.5rem] object-contain" />
          <div className="hidden sm:flex flex-col border-l border-[#EDE7DD] pl-3">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#8C7E72] font-semibold">
              Design Studio
            </span>
            <span className="text-xs font-bold text-[#1C1917]">Business Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onLogin}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl shadow-xs transition-all cursor-pointer btn-hover-lift"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 lg:py-16 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#EDE3D4] bg-white/80 backdrop-blur-xs text-xs font-semibold text-[#BA954F] mb-6 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#BA954F] animate-pulse" />
            From Ideas to Impact Together
          </div>

          <h1 className="font-serif max-w-3xl text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#1C1917] leading-[1.15]">
            The White Ink App
          </h1>

          <p className="font-brand-script text-2xl sm:text-3xl text-[#BA954F] mt-2">
            Closer Ideas. Stronger Brands.
          </p>

          <p className="max-w-2xl mt-4 text-sm sm:text-base text-[#78716C] leading-relaxed font-normal">
            A simpler, elegant way for clients and our creative team to collaborate, manage projects, give approvals, and grow together.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onLogin}
              className="px-6 py-3 text-sm font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer btn-hover-lift"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4 stroke-[2]" />
            </button>
          </div>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
          className="mt-14 sm:mt-18 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 w-full text-left"
        >
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="bg-white/95 backdrop-blur-xs p-5 rounded-2xl border border-[#EDE7DD] shadow-xs card-hover-lift flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#FAF4EC] border border-[#EDE3D4] flex items-center justify-center text-[#BA954F] mb-3.5 shadow-2xs">
                    <Icon className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <h3 className="text-sm font-serif font-bold text-[#1C1917] mb-1.5">{feat.title}</h3>
                  <p className="text-xs text-[#78716C] leading-relaxed font-normal">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-8 border-t border-[#EDE7DD] flex flex-col sm:flex-row items-center justify-between text-xs text-[#78716C] gap-4">
        <p>© {new Date().getFullYear()} White Ink Design Studio. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <span className="font-brand-script text-lg text-[#BA954F]">
            Your Brand, Our Priority
          </span>
          <span className="w-1 h-1 rounded-full bg-[#DFD5C6]" />
          <span>Internal & Client Portal</span>
        </div>
      </footer>
    </div>
  );
};
