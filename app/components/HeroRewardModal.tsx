"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, RotateCcw, Volume2 } from "lucide-react";
import { MotivationalRewardItem } from "@/app/lib/motivational-rewards";

interface HeroRewardModalProps {
  open: boolean;
  reward: MotivationalRewardItem | null;
  onClose: () => void;
}

type AudioState = "playing" | "paused" | "ended";

export default function HeroRewardModal({
  open,
  reward,
  onClose,
}: HeroRewardModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioState, setAudioState] = useState<AudioState>("paused");
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (!open || !reward) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setAudioState("paused");
      setHasInteracted(false);
      return;
    }

    // Attempt autoplay audio on open
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setAudioState("playing");
            setHasInteracted(true);
          })
          .catch((err) => {
            // Autoplay blocked by browser policy; user will click the bottom play button
            console.warn("Autoplay audio blocked by browser policy:", err);
            setAudioState("paused");
          });
      }
    }
  }, [open, reward]);

  const handleToggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audioState === "playing") {
      audio.pause();
      setAudioState("paused");
    } else if (audioState === "paused") {
      audio
        .play()
        .then(() => setAudioState("playing"))
        .catch((e) => console.error("Audio play error:", e));
      setHasInteracted(true);
    } else if (audioState === "ended") {
      audio.currentTime = 0;
      audio
        .play()
        .then(() => setAudioState("playing"))
        .catch((e) => console.error("Audio replay error:", e));
    }
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAudioState("paused");
    onClose();
  };

  if (!open || !reward) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        {/* Hidden HTML Audio element */}
        <audio
          ref={audioRef}
          src={reward.audioSrc}
          preload="auto"
          onEnded={() => setAudioState("ended")}
          onPause={() => {
            if (audioRef.current && !audioRef.current.ended) {
              setAudioState("paused");
            }
          }}
          onPlay={() => setAudioState("playing")}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative w-full max-w-sm sm:max-w-md bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button (top right) */}
          <button
            onClick={handleClose}
            aria-label="Закрыть"
            className="absolute top-4 right-4 z-30 w-11 h-11 rounded-full bg-black/55 text-white/90 hover:text-white hover:bg-black/80 backdrop-blur-md flex items-center justify-center transition-all shadow-lg active:scale-95"
          >
            <X size={24} strokeWidth={2.5} />
          </button>

          {/* Theme & title badge (subtle overlay on top left) */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none">
            <div className="px-3.5 py-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/10 flex items-center gap-2 text-white shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold tracking-wide uppercase">
                {reward.title}
              </span>
            </div>
          </div>

          {/* 1:1 Square Video Loop */}
          <div className="relative w-full aspect-square bg-slate-950 overflow-hidden select-none">
            <video
              src={reward.videoSrc}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="w-full h-full object-cover pointer-events-none"
            />
            {/* Soft gradient overlay at bottom for clean button separation */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent pointer-events-none" />
          </div>

          {/* Bottom audio control button bar */}
          <div className="p-4 sm:p-5 bg-slate-900 flex flex-col items-center gap-3">
            <button
              onClick={handleToggleAudio}
              className={`w-full py-3.5 px-6 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-98 ${
                audioState === "playing"
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                  : audioState === "ended"
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                  : "bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20"
              }`}
            >
              {audioState === "playing" && (
                <>
                  <Pause size={20} className="fill-current" />
                  <span>Пауза</span>
                </>
              )}
              {audioState === "paused" && (
                <>
                  <Play size={20} className="fill-current" />
                  <span>{hasInteracted ? "Продолжить" : "Слушать"}</span>
                </>
              )}
              {audioState === "ended" && (
                <>
                  <RotateCcw size={20} />
                  <span>Ещё раз</span>
                </>
              )}
            </button>

            <p className="text-slate-400 text-xs font-medium tracking-wide flex items-center gap-1.5">
              <Volume2 size={13} className="text-slate-400" />
              <span>Напутствие героя дня ({reward.theme})</span>
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
