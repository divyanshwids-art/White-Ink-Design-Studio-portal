import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BrandLogo } from '../components/common/BrandLogo';

export const LandingPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {

  const gradients = [
    'linear-gradient(135deg, #FAF7F2 0%, #F5EFE6 100%)',
    'linear-gradient(135deg, #FDF9F4 0%, #EDE4D4 100%)',
    'linear-gradient(135deg, #FAF4EC 0%, #FAF7F2 100%)',
    'linear-gradient(135deg, #F5EFE6 0%, #FFFDF9 100%)',
  ];
  const [bgIdx, setBgIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setBgIdx((i) => (i + 1) % gradients.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      animate={{ background: gradients[bgIdx] }}
      transition={{ duration: 4, ease: 'easeInOut' }}
      className="relative min-h-screen text-[#1C1917] flex flex-col overflow-hidden selection:bg-[#EAE0D0]"
    >

      {/* Ink drop — top right */}
      <svg className="pointer-events-none absolute -top-8 -right-8 w-56 h-72 opacity-30" viewBox="0 0 100 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 0 C50 0 90 55 90 85 C90 108 72 125 50 125 C28 125 10 108 10 85 C10 55 50 0 50 0 Z" fill="#BA954F" />
      </svg>

      {/* Ink drop — bottom left */}
      <svg className="pointer-events-none absolute -bottom-8 -left-8 w-56 h-72 opacity-30" viewBox="0 0 100 140" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(180deg)' }}>
        <path d="M50 0 C50 0 90 55 90 85 C90 108 72 125 50 125 C28 125 10 108 10 85 C10 55 50 0 50 0 Z" fill="#BA954F" />
      </svg>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="relative z-10 w-full px-6 sm:px-10 py-5 flex items-center justify-between"
      >
        <BrandLogo className="h-9 w-auto max-w-[9rem] object-contain" />
        <div />
      </motion.header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-16">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center mb-7"
        >
          <img src="/white-ink-logo.png" alt="White Ink" className="h-auto w-48 object-contain" />
        </motion.div>

        {/* Headline */}
        <div className="overflow-hidden mb-1">
          <motion.h1
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{ duration: 0.65, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#1C1917] leading-[1.12]"
          >
            Your Brand,
          </motion.h1>
        </div>
        <div className="overflow-hidden mb-6">
          <motion.h1
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{ duration: 0.65, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.12]"
          >
            <motion.span
              animate={{ color: ['#BA954F', '#8C6A2F', '#C9A84C', '#BA954F'] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              Our Priority.
            </motion.span>
          </motion.h1>
        </div>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.48, ease: 'easeOut' }}
          className="text-sm sm:text-base text-[#78716C] leading-relaxed max-w-md mb-9"
        >
          Ink your brand together
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.6, ease: 'easeOut' }}
        >
          <motion.button
            whileHover={{ scale: 1.06, boxShadow: '0 10px 30px -4px rgba(186,149,79,0.42)' }}
            whileTap={{ scale: 0.96 }}
            onClick={onLogin}
            className="px-8 py-3.5 text-sm font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            Sign In
          </motion.button>
        </motion.div>

      </main>

    </motion.div>
  );
};
