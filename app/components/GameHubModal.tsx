"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Play } from "lucide-react";
import DragonSnowGame from "./games/DragonSnowGame";
import CarHighwayGame from "./games/CarHighwayGame";
import DreadnoughtBreakthroughGame from "./games/DreadnoughtBreakthroughGame";

interface GameHubModalProps {
  open: boolean;
  onClose: () => void;
  onGameComplete?: (gameId: string, score: number, stars: number) => void;
}

export default function GameHubModal({
  open,
  onClose,
  onGameComplete,
}: GameHubModalProps) {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  if (!open) return null;

  return (
    <>
      {/* ACTIVE 3D DRAGON GAME */}
      {activeGameId === "dragon-snow" && (
        <DragonSnowGame
          targetScore={600}
          onClose={() => setActiveGameId(null)}
          onVictory={(score, stars) => {
            if (onGameComplete) onGameComplete("dragon-snow", score, stars);
          }}
        />
      )}

      {/* ACTIVE 3D CAR HIGHWAY GAME */}
      {activeGameId === "car-highway" && (
        <CarHighwayGame
          targetScore={600}
          onClose={() => setActiveGameId(null)}
          onVictory={(score, stars) => {
            if (onGameComplete) onGameComplete("car-highway", score, stars);
          }}
        />
      )}

      {/* ACTIVE 3D SPACE COMBAT GAME */}
      {activeGameId === "dreadnought-breakthrough" && (
        <DreadnoughtBreakthroughGame
          onClose={() => setActiveGameId(null)}
          onVictory={(score, stars) => {
            if (onGameComplete) onGameComplete("dreadnought-breakthrough", score, stars);
          }}
        />
      )}

      {/* GAME HUB SELECTION MODAL */}
      {!activeGameId && (
        <AnimatePresence>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-[32px] overflow-hidden shadow-2xl flex flex-col my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                aria-label="Закрыть"
                className="absolute top-4 right-4 z-30 w-11 h-11 rounded-full bg-black/60 text-white/90 hover:text-white hover:bg-black/90 backdrop-blur-md flex items-center justify-center transition-all shadow-lg active:scale-95 cursor-pointer border border-white/10"
              >
                <X size={22} strokeWidth={2.5} />
              </button>

              {/* Header Banner */}
              <div className="relative p-6 sm:p-7 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-b border-white/10 flex flex-col items-center text-center">
                {/* Glowing Badge */}
                <div className="px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 flex items-center gap-2 shadow-lg mb-2.5">
                  <Sparkles size={14} className="animate-spin text-amber-400" />
                  <span className="text-[11px] font-black uppercase tracking-widest">
                    Легендарный Артефакт • Игровой Портал
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-amber-500 tracking-tight">
                  Arcade Nexus: 3D Миры
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mt-1 font-medium">
                  Выбери захватывающий 3D мир, уворачивайся от преград и побеждай!
                </p>

                {/* Animated Control Hint */}
                <div className="mt-3 px-4 py-1.5 rounded-full bg-sky-950/80 border border-sky-400/30 text-sky-200 text-xs font-bold flex items-center gap-2 shadow-inner">
                  <span className="text-base animate-bounce">👆</span>
                  <span>Управление: делай свайп пальцем налево ⇄ направо</span>
                </div>
              </div>

              {/* Game Cards Grid (3 Games) */}
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950">
                {/* GAME 1: Зимний Дракон (Active & Ready) */}
                <div className="relative rounded-2xl bg-gradient-to-b from-sky-950/80 to-slate-900 border-2 border-sky-400/50 p-4 flex flex-col justify-between shadow-xl shadow-sky-500/10 hover:border-sky-400 transition-all group">
                  <div className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full bg-sky-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md">
                    Готово 🟢
                  </div>

                  <div>
                    {/* Visual Icon / Art */}
                    <div className="w-full aspect-video rounded-xl shadow-inner border border-sky-400/30 group-hover:scale-[1.02] transition-transform overflow-hidden">
                      <img src="/images/game-hub/winter-dragon.webp" alt="Дракон спускается по снежной горе" className="w-full h-full object-cover" />
                    </div>

                    <h3 className="text-base font-black text-white mt-3 flex items-center gap-1.5">
                      <span>Зимний Дракон</span>
                    </h3>
                    <p className="text-[11px] text-slate-300 font-medium mt-1 leading-relaxed">
                      Спуск с горы на глайд-борде, снежный склон, сбор кристаллов и звёзд.
                    </p>

                    <div className="mt-2.5 flex items-center gap-1 text-[10px] font-bold text-sky-300">
                      <span>1 герой: Дракончик</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveGameId("dragon-snow")}
                    className="mt-4 w-full h-11 rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 active:scale-95 transition-all cursor-pointer"
                  >
                    <Play size={16} className="fill-current" />
                    <span>В путь!</span>
                  </button>
                </div>

                {/* GAME 2: Турбо Драйв (5 суперкаров в гараже) */}
                <div className="relative rounded-2xl bg-gradient-to-b from-amber-950/40 to-slate-900 border-2 border-amber-500/40 p-4 flex flex-col justify-between shadow-xl shadow-amber-500/10 hover:border-amber-400 transition-all group">
                  <div className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md">
                    Готово 🟢
                  </div>

                  <div>
                    {/* Visual Cutout Image */}
                    <div className="w-full aspect-video rounded-xl bg-gradient-to-tr from-slate-900 to-amber-950/60 flex items-center justify-center shadow-inner border border-amber-500/30 group-hover:scale-[1.02] transition-transform overflow-hidden">
                      <img
                        src="/images/game-hub/turbo-drive.webp"
                        alt="Пять суперкаров на скоростной трассе"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <h3 className="text-base font-black text-white mt-3 flex items-center gap-1.5">
                      <span>Турбо Драйв</span>
                    </h3>
                    <p className="text-[11px] text-slate-300 font-medium mt-1 leading-relaxed">
                      Скоростное шоссе, 5 суперкаров в 3D-гараже на выбор и живой трафик.
                    </p>

                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-bold text-amber-300">
                      <span>🏎️ Porsche • BMW • Lambo</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveGameId("car-highway")}
                    className="mt-4 w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Play size={16} className="fill-current" />
                    <span>Погнали!</span>
                  </button>
                </div>

                {/* GAME 3: Космический охотник */}
                <div className="relative rounded-2xl bg-gradient-to-b from-violet-950/60 to-slate-950 border-2 border-violet-400/40 p-4 flex flex-col justify-between shadow-xl shadow-violet-500/10 hover:border-violet-300 transition-all group">
                  <div className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full bg-violet-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md">
                    Новая миссия 🟢
                  </div>
                  <div>
                    {/* Visual Icon / Art */}
                    <div className="relative w-full aspect-video rounded-xl shadow-inner border border-violet-300/25 overflow-hidden group-hover:scale-[1.02] transition-transform">
                      <img src="/images/game-hub/space-hunter.webp" alt="Космический охотник вступает в бой" className="w-full h-full object-cover" />
                    </div>

                    <h3 className="text-base font-black text-white mt-3 flex items-center gap-1.5">
                      <span>Космический охотник</span>
                    </h3>
                    <p className="text-[11px] text-slate-300 font-medium mt-1 leading-relaxed">
                      Пять Andromeda, астероиды и трёхфазная битва с главным кораблём.
                    </p>

                  </div>

                  <button
                    onClick={() => setActiveGameId("dreadnought-breakthrough")}
                    className="mt-4 w-full h-11 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Play size={16} className="fill-current" />
                    <span>Старт!</span>
                  </button>
                </div>
              </div>

              {/* Bottom Footer Info */}
              <div className="px-6 py-3.5 bg-slate-900/90 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold">
                  🏆 Награда за победу: <strong className="text-amber-300">+500 звёзд ⭐</strong>
                </span>
                <span className="text-[11px] text-slate-500">
                  Версия: 3D Engine v2.0
                </span>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}
    </>
  );
}
