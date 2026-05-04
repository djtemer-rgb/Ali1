"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ChildProfile = { id: string; name: string; letter: string; mode: string };

interface HeaderProps {
  currentChild: ChildProfile;
  onSwitchChild: () => void;
  stars: number;
}

export default function Header({ currentChild, onSwitchChild, stars }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSwitch = () => {
    onSwitchChild();
    setIsDropdownOpen(false);
  };

  return (
    <header className="bg-white px-4 md:px-6 py-3 md:py-5 flex items-center justify-between border-b border-slate-100">
      <div className="flex items-center gap-3 md:gap-4">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-lg md:text-xl font-bold">
          {currentChild.letter}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-800">Привет,</h1>
            <div className="relative">
              <div 
                className="cursor-pointer group flex items-center h-[28px] md:h-[32px] min-w-[60px] md:min-w-[75px] px-1.5 -ml-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className="relative w-full h-full flex items-center">
                  <AnimatePresence mode="popLayout">
                    <motion.h1
                      key={currentChild.id}
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="text-xl md:text-2xl font-extrabold text-slate-800 absolute whitespace-nowrap group-hover:text-blue-600 transition-colors"
                    >
                      {currentChild.name}!
                    </motion.h1>
                  </AnimatePresence>
                </div>
              </div>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-1 left-0 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50 min-w-[100px]"
                  >
                    <div 
                      onClick={handleSwitch}
                      className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-slate-800 font-extrabold text-lg md:text-xl transition-colors"
                    >
                      {currentChild.id === "ali" ? "Саид" : "Али"}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <p className="text-slate-500 text-xs md:text-sm font-medium mt-0.5">Твои успехи за сегодня</p>
        </div>
      </div>

      <div className="bg-[#FEF3C7] border-2 border-[#FDE68A] text-[#D97706] px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-extrabold text-base md:text-lg flex items-center gap-1.5 md:gap-2 shadow-sm">
        <Star className="fill-amber-400 text-amber-400 w-4 h-4 md:w-5 md:h-5" /> {stars}
      </div>
    </header>
  );
}