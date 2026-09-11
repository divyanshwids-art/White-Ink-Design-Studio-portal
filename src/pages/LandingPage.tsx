import React from 'react';
import { motion } from 'motion/react';
import { BrandLogo } from '../components/common/BrandLogo';
import { Sparkles, Layers, ShieldCheck } from 'lucide-react';

export const LandingPage: React.FC<{ onLogin: () => void }> = ({
  onLogin,
}) => {
  const features = [
    {
      icon: Layers,
      title: 'Architectural Project Pipelines',
      desc: 'Stage-gated workflows from schematic concept to turnkey execution and site handover.',
    },
    {
      icon: ShieldCheck,
      title: 'Client & Deliverable Clearances',
      desc: 'Structured approvals, real-time client feedback, revision loops, and milestone sign-offs.',
    },
    {
      icon: Sparkles,
      title: 'Studio Resource & Time Management',
      desc: 'Precision attendance, team task boards, SOPs, and cross-project performance insights.',
    },
  ];

  return (
    <div className="relative min-h-screen bg-page flex flex-col justify-between overflow-hidden selection:bg-gold-200 selection:text-black">
      {/* Dynamic Animated Gold Gradient Backdrop */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{
          repeat: Infinity,
          duration: 18,
          ease: 'easeInOut',
        }}
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(212, 175, 55, 0.18) 0%, transparent 45%), radial-gradient(circle at 85% 75%, rgba(201, 162, 39, 0.15) 0%, transparent 40%), linear-gradient(135deg, #FBF8EE 0%, #F5EECD 50%, #F8F4E5 100%)',
          backgroundSize: '200% 200%',
        }}
      />

      {/* Floating subtle ambient rings */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full border border-gold-300/40 pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full border border-gold-300/30 pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-10 w-auto" />
          <div className="hidden sm:flex flex-col">
            <span className="text-xs uppercase tracking-[0.25em] text-gold-700 font-semibold">Design Studio</span>
            <span className="text-sm font-bold tracking-tight text-heading">Management Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onLogin}
            className="primary-cta px-4 py-2 text-sm font-medium rounded-lg shadow-xs hover:bg-gold-600 transition-all cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 lg:py-20 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gold-300 bg-white/80 backdrop-blur-xs text-xs font-semibold text-gold-800 mb-6 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-gold-500 animate-pulse" />
            White Ink Design Studio & Architecture Workspace
          </div>

          <h1 className="title max-w-4xl text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-heading leading-[1.15]">
            Precision Management for Extraordinary Architecture & Spaces
          </h1>

          <p className="muted max-w-2xl mt-6 text-base sm:text-lg text-gold-800/90 leading-relaxed">
            Unify client deliverables, project phases, multi-disciplinary teams, and creative milestones under one cohesive, gold-standard studio platform.
          </p>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="mt-16 sm:mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left"
        >
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="bg-card/90 backdrop-blur-sm p-6 rounded-2xl border border-gold-200 shadow-sm card-hover-lift flex flex-col"
              >
                <div className="w-12 h-12 rounded-xl bg-gold-100 border border-gold-300 flex items-center justify-center text-gold-700 mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-heading mb-2">{feat.title}</h3>
                <p className="text-sm text-gold-800/80 leading-normal">{feat.desc}</p>
              </div>
            );
          })}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-8 border-t border-gold-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-gold-700 gap-4">
        <p>© {new Date().getFullYear()} White Ink Design Studio. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <span>Confidential Internal & Client Portal</span>
          <span className="w-1 h-1 rounded-full bg-gold-400" />
          <span>V1.0</span>
        </div>
      </footer>
    </div>
  );
};
