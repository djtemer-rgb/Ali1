"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, RotateCcw, Volume2, Music } from "lucide-react";
import { MotivationalRewardItem } from "@/app/lib/motivational-rewards";

interface HeroRewardModalProps {
  open: boolean;
  reward: MotivationalRewardItem | null;
  onClose: () => void;
}

type PlaybackState = "playing" | "paused" | "ended";
type ActiveAudio = "speech" | "music";

export default function HeroRewardModal({
  open,
  reward,
  onClose,
}: HeroRewardModalProps) {
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);

  const [speechState, setSpeechState] = useState<PlaybackState>("paused");
  const [musicState, setMusicState] = useState<PlaybackState>("paused");
  const [activeAudio, setActiveAudio] = useState<ActiveAudio>("speech");
  const [hasInteracted, setHasInteracted] = useState(false);

  // Initialize and handle modal open/close
  useEffect(() => {
    if (!open || !reward) {
      if (speechAudioRef.current) {
        speechAudioRef.current.pause();
        speechAudioRef.current.currentTime = 0;
      }
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current.currentTime = 0;
      }
      setSpeechState("paused");
      setMusicState("paused");
      setActiveAudio("speech");
      setHasInteracted(false);
      return;
    }

    // Default start: reset both, then autoplay speech
    if (speechAudioRef.current) speechAudioRef.current.currentTime = 0;
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current.currentTime = 0;
    }
    setMusicState("paused");
    setActiveAudio("speech");

    const speechAudio = speechAudioRef.current;
    if (speechAudio) {
      const playPromise = speechAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setSpeechState("playing");
            setHasInteracted(true);
          })
          .catch((err) => {
            console.warn("Autoplay audio blocked by browser policy:", err);
            setSpeechState("paused");
          });
      }
    }
  }, [open, reward]);

  // Speech button handler
  const handleToggleSpeech = () => {
    const speechAudio = speechAudioRef.current;
    const musicAudio = musicAudioRef.current;
    if (!speechAudio) return;

    // If music is playing, pause it immediately
    if (musicAudio && !musicAudio.paused) {
      musicAudio.pause();
      setMusicState("paused");
    }

    setActiveAudio("speech");
    setHasInteracted(true);

    if (speechState === "playing") {
      speechAudio.pause();
      setSpeechState("paused");
    } else if (speechState === "ended") {
      speechAudio.currentTime = 0;
      speechAudio
        .play()
        .then(() => setSpeechState("playing"))
        .catch((e) => console.error("Speech play error:", e));
    } else {
      speechAudio
        .play()
        .then(() => setSpeechState("playing"))
        .catch((e) => console.error("Speech play error:", e));
    }
  };

  // Music track button handler
  const handleToggleMusic = () => {
    const speechAudio = speechAudioRef.current;
    const musicAudio = musicAudioRef.current;
    if (!musicAudio) return;

    // If speech is playing, pause it immediately
    if (speechAudio && !speechAudio.paused) {
      speechAudio.pause();
      setSpeechState("paused");
    }

    setActiveAudio("music");
    setHasInteracted(true);

    if (musicState === "playing") {
      musicAudio.pause();
      setMusicState("paused");
    } else if (musicState === "ended") {
      musicAudio.currentTime = 0;
      musicAudio
        .play()
        .then(() => setMusicState("playing"))
        .catch((e) => console.error("Music play error:", e));
    } else {
      musicAudio
        .play()
        .then(() => setMusicState("playing"))
        .catch((e) => console.error("Music play error:", e));
    }
  };

  // Close modal and stop all audio
  const handleClose = () => {
    if (speechAudioRef.current) {
      speechAudioRef.current.pause();
      speechAudioRef.current.currentTime = 0;
    }
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current.currentTime = 0;
    }
    setSpeechState("paused");
    setMusicState("paused");
    onClose();
  };

  if (!open || !reward) return null;

  const childName = reward.childName || (reward.childId === "ali" ? "Али" : "Саид");

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        {/* Hidden HTML Audio for Speech */}
        <audio
          ref={speechAudioRef}
          src={reward.audioSrc}
          preload="auto"
          onEnded={() => setSpeechState("ended")}
          onPause={() => {
            if (speechAudioRef.current && !speechAudioRef.current.ended) {
              setSpeechState("paused");
            }
          }}
          onPlay={() => setSpeechState("playing")}
        />

        {/* Hidden HTML Audio for Personal Track */}
        <audio
          ref={musicAudioRef}
          src={reward.personalTrackSrc}
          preload="auto"
          onEnded={() => setMusicState("ended")}
          onPause={() => {
            if (musicAudioRef.current && !musicAudioRef.current.ended) {
              setMusicState("paused");
            }
          }}
          onPlay={() => setMusicState("playing")}
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
            className="absolute top-3.5 right-3.5 z-30 w-11 h-11 rounded-full bg-black/55 text-white/90 hover:text-white hover:bg-black/80 backdrop-blur-md flex items-center justify-center transition-all shadow-lg active:scale-95"
          >
            <X size={24} strokeWidth={2.5} />
          </button>

          {/* Theme & title badge (top left) */}
          <div className="absolute top-3.5 left-3.5 z-20 pointer-events-none">
            <div className="px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/10 flex items-center gap-2 text-white shadow-lg">
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
            {/* Soft gradient overlay at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent pointer-events-none" />
          </div>

          {/* Bottom audio control buttons */}
          <div className="p-4 sm:p-5 bg-slate-900 flex flex-col gap-3">
            {/* Two-button control bar */}
            <div className="grid grid-cols-2 gap-2.5 w-full">
              {/* Button 1: Speech / Речь героя */}
              <button
                onClick={handleToggleSpeech}
                className={`h-12 px-3 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                  speechState === "playing"
                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25 ring-2 ring-amber-400/40"
                    : speechState === "ended"
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                    : activeAudio === "speech" && hasInteracted
                    ? "bg-slate-750 hover:bg-slate-700 text-slate-100 border border-white/10"
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                }`}
              >
                {speechState === "playing" ? (
                  <>
                    <Pause size={17} className="fill-current" />
                    <span>Пауза</span>
                  </>
                ) : speechState === "ended" ? (
                  <>
                    <RotateCcw size={17} />
                    <span>Речь: Ещё</span>
                  </>
                ) : (
                  <>
                    <Play size={17} className="fill-current" />
                    <span>Речь героя</span>
                  </>
                )}
              </button>

              {/* Button 2: Personal Track / Трек ребёнка */}
              <button
                onClick={handleToggleMusic}
                className={`h-12 px-3 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                  musicState === "playing"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/30 ring-2 ring-purple-400/50"
                    : musicState === "ended"
                    ? "bg-purple-700 hover:bg-purple-600 text-white shadow-purple-500/20"
                    : "bg-slate-800 hover:bg-slate-700 text-purple-200 border border-purple-500/30 shadow-purple-900/20"
                }`}
              >
                {musicState === "playing" ? (
                  <>
                    <Pause size={17} className="fill-current" />
                    <span>Пауза ({childName})</span>
                  </>
                ) : musicState === "ended" ? (
                  <>
                    <RotateCcw size={17} />
                    <span>{childName}: Ещё</span>
                  </>
                ) : (
                  <>
                    <Music size={17} className="text-purple-300" />
                    <span>{childName}</span>
                  </>
                )}
              </button>
            </div>

            {/* Status indicator line */}
            <div className="flex items-center justify-center text-xs font-medium text-slate-400 gap-1.5 pt-0.5">
              {speechState === "playing" ? (
                <>
                  <Volume2 size={13} className="text-amber-400 animate-pulse" />
                  <span className="text-amber-300 truncate font-semibold">
                    Речь героя: {reward.theme}
                  </span>
                </>
              ) : musicState === "playing" ? (
                <>
                  <Music size={13} className="text-purple-400 animate-bounce" />
                  <span className="text-purple-300 font-semibold truncate">
                    Играет мотивационный трек {childName}
                  </span>
                </>
              ) : (
                <>
                  <Volume2 size={13} className="text-slate-500" />
                  <span className="text-slate-400 truncate">
                    {reward.theme}
                  </span>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
