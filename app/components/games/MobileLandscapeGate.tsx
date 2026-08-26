"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";

export function useMobileLandscapeLaunch() {
  const [showRotateHint, setShowRotateHint] = useState(false);
  const [isPortraitTouch, setIsPortraitTouch] = useState(false);
  const pendingAction = useRef<null | (() => void)>(null);
  const shownAt = useRef(0);

  const launchInLandscape = useCallback(async (action: () => void) => {
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouchDevice || window.innerWidth > window.innerHeight) {
      action();
      return;
    }
    pendingAction.current = action;
    shownAt.current = performance.now();
    setShowRotateHint(true);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      const orientation = screen.orientation as ScreenOrientation & { lock?: (value: "landscape-primary") => Promise<void> };
      await orientation.lock?.("landscape-primary").catch(() => undefined);
    } catch {}
  }, []);

  useEffect(() => {
    const update = () => setIsPortraitTouch(window.matchMedia("(pointer: coarse)").matches && window.innerHeight > window.innerWidth);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  useEffect(() => {
    if (!showRotateHint) return;
    const checkOrientation = () => {
      if (window.innerWidth <= window.innerHeight || performance.now() - shownAt.current < 1800) return;
      const action = pendingAction.current;
      pendingAction.current = null;
      setShowRotateHint(false);
      action?.();
    };
    const timer = window.setInterval(checkOrientation, 180);
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, [showRotateHint]);

  return { showRotateHint, isPortraitTouch, launchInLandscape };
}

export function MobileLandscapeGate({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[90] flex items-center justify-center p-6 bg-[#030617]/96 backdrop-blur-xl pointer-events-auto text-white">
      <motion.div initial={{ scale: 0.84, y: 16 }} animate={{ scale: 1, y: 0 }} className="text-center max-w-xs">
        <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
          <RotateCcw size={104} className="absolute text-cyan-300/80 animate-spin [animation-duration:2.4s]" />
          <span className="text-5xl rotate-[-25deg]">📱</span>
        </div>
        <p className="mt-3 text-xs font-black uppercase tracking-[.2em] text-cyan-300">Приготовься</p>
        <h2 className="mt-2 text-2xl font-black">Поверни телефон влево</h2>
        <p className="mt-2 text-sm text-slate-300">Игра начнётся сама в альбомном режиме</p>
      </motion.div>
    </motion.div>
  );
}
