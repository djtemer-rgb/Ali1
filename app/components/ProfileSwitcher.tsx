"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

type Profile = { id: string; name: string; mode: 'full' | 'little-hero' };

export default function ProfileSwitcher({ currentProfile }: { currentProfile: Profile }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Определяем второй профиль
  const otherProfile: Profile = currentProfile.id === 'ali' 
    ? { id: 'said', name: 'Саид', mode: 'little-hero' } 
    : { id: 'ali', name: 'Али', mode: 'full' };

  const handleSwitch = () => {
    setIsOpen(false);
    // Плавный переход на страницу другого ребенка
    router.push(`/child/${otherProfile.id}`);
  };

  return (
    <div className="relative z-50">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-1 cursor-pointer bg-white hover:shadow-sm transition-all"
      >
        <span className="text-slate-500 text-lg">Привет,</span>
        <div className="relative overflow-hidden h-8 flex items-center min-w-[60px]">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={currentProfile.id}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.3, type: "spring" }}
              className="font-bold text-xl text-indigo-600 absolute"
            >
              {currentProfile.name}!
            </motion.span>
          </AnimatePresence>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Выпадающий список */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 w-full border border-slate-200 shadow-xl rounded-xl bg-white overflow-hidden"
          >
            <div 
              onClick={handleSwitch}
              className="px-4 py-3 cursor-pointer hover:bg-indigo-50 text-slate-700 font-medium transition-colors"
            >
              {otherProfile.name}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}