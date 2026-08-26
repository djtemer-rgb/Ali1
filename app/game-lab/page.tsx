"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gamepad2, Sparkles, Play, Eye, RotateCcw } from "lucide-react";
import DragonSnowGame from "@/app/components/games/DragonSnowGame";
import CarHighwayGame from "@/app/components/games/CarHighwayGame";
import DreadnoughtBreakthroughGame from "@/app/components/games/DreadnoughtBreakthroughGame";
import GameHubModal from "@/app/components/GameHubModal";

export default function GameLabPage() {
  const [activeTest, setActiveTest] = useState<"none" | "direct-dragon" | "direct-car" | "direct-space" | "hub-modal">("none");
  const [lastResult, setLastResult] = useState<{ score: number; stars: number } | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 flex flex-col items-center justify-center">
      {/* DIRECT DRAGON 3D GAME */}
      {activeTest === "direct-dragon" && (
        <DragonSnowGame
          targetScore={600}
          onClose={() => setActiveTest("none")}
          onVictory={(score, stars) => {
            setLastResult({ score, stars });
          }}
        />
      )}

      {/* DIRECT CAR HIGHWAY 3D GAME */}
      {activeTest === "direct-car" && (
        <CarHighwayGame
          targetScore={600}
          onClose={() => setActiveTest("none")}
          onVictory={(score, stars) => {
            setLastResult({ score, stars });
          }}
        />
      )}

      {/* DIRECT SPACE COMBAT GAME */}
      {activeTest === "direct-space" && (
        <DreadnoughtBreakthroughGame
          onClose={() => setActiveTest("none")}
          onVictory={(score, stars) => setLastResult({ score, stars })}
        />
      )}

      {/* GAME HUB MODAL TEST */}
      <GameHubModal
        open={activeTest === "hub-modal"}
        onClose={() => setActiveTest("none")}
        onGameComplete={(gameId, score, stars) => {
          setLastResult({ score, stars });
          setActiveTest("none");
        }}
      />

      {/* CONTROL PANEL */}
      <div className="max-w-xl w-full bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-2 text-slate-300 border border-white/10 transition-all"
          >
            <ArrowLeft size={16} />
            <span>На главную</span>
          </Link>

          <div className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-400" />
            <span>3D Game Laboratory</span>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-amber-300">
            Лаборатория 3D-Игр
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Тестирование физики, свайпов на мобильных и Three.js движка
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setActiveTest("direct-dragon")}
            className="p-4 rounded-2xl bg-gradient-to-br from-sky-950 to-blue-900 border-2 border-sky-400/40 hover:border-sky-400 text-left flex flex-col justify-between shadow-xl shadow-sky-500/10 group cursor-pointer transition-all active:scale-95"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🏂 🐲</span>
              <div className="w-7 h-7 rounded-full bg-sky-400 text-slate-950 flex items-center justify-center font-bold">
                <Play size={14} className="fill-current ml-0.5" />
              </div>
            </div>
            <div>
              <p className="text-sm font-black text-white group-hover:text-sky-300 transition-colors">
                Зимний Дракон
              </p>
              <p className="text-[11px] text-sky-200/70 font-medium">
                Спуск по желобу
              </p>
            </div>
          </button>

          <button
            onClick={() => setActiveTest("direct-car")}
            className="p-4 rounded-2xl bg-gradient-to-br from-amber-950 to-slate-900 border-2 border-amber-400/40 hover:border-amber-400 text-left flex flex-col justify-between shadow-xl shadow-amber-500/10 group cursor-pointer transition-all active:scale-95"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🏎️ 💨</span>
              <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                <Play size={14} className="fill-current ml-0.5" />
              </div>
            </div>
            <div>
              <p className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                Турбо Драйв
              </p>
              <p className="text-[11px] text-amber-200/70 font-medium">
                5 суперкаров в гараже
              </p>
            </div>
          </button>

          <button
            onClick={() => setActiveTest("direct-space")}
            className="p-4 rounded-2xl bg-gradient-to-br from-violet-950 to-slate-950 border-2 border-violet-400/40 hover:border-violet-300 text-left flex flex-col justify-between shadow-xl shadow-violet-500/10 group cursor-pointer transition-all active:scale-95"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🚀 🛸</span>
              <div className="w-7 h-7 rounded-full bg-violet-400 text-slate-950 flex items-center justify-center font-bold">
                <Play size={14} className="fill-current ml-0.5" />
              </div>
            </div>
            <div>
              <p className="text-sm font-black text-white group-hover:text-violet-300 transition-colors">Космический охотник</p>
              <p className="text-[11px] text-violet-200/70 font-medium">Космическая боевая миссия</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTest("hub-modal")}
            className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 border-2 border-purple-400/40 hover:border-purple-400 text-left flex flex-col justify-between shadow-xl shadow-purple-500/10 group cursor-pointer transition-all active:scale-95"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🎮 🌌</span>
              <div className="w-7 h-7 rounded-full bg-purple-400 text-slate-950 flex items-center justify-center font-bold">
                <Eye size={14} />
              </div>
            </div>
            <div>
              <p className="text-sm font-black text-white group-hover:text-purple-300 transition-colors">
                Игровой Хаб
              </p>
              <p className="text-[11px] text-purple-200/70 font-medium">
                Меню выбора 3 игр
              </p>
            </div>
          </button>
        </div>

        {/* Last Game Stats */}
        {lastResult && (
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase font-bold text-slate-400">Последний результат</p>
              <p className="text-sm font-black text-amber-300 mt-0.5">
                Очки: {lastResult.score} • Звёзды: +{lastResult.stars} ⭐
              </p>
            </div>
            <button
              onClick={() => setActiveTest("direct-dragon")}
              className="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold flex items-center gap-1.5 text-white"
            >
              <RotateCcw size={14} />
              <span>Повтор</span>
            </button>
          </div>
        )}

        {/* Developer Diagnostics */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-xs text-slate-400 space-y-1.5">
          <p className="font-bold text-slate-300">⚙️ Параметры движка:</p>
          <p>• Three.js WebGL: v0.183 (ACESFilmic + PCFSoftShadows)</p>
          <p>• 3D-модели: Dragon, 5 суперкаров и 3 оптимизированных космических корабля</p>
          <p>• Физика: Dynamic Delta Time + Smooth Lerp + Touch Action Lock</p>
        </div>
      </div>
    </div>
  );
}
