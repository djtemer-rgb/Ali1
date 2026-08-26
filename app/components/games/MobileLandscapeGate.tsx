"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

export function useMobileLandscapeLaunch() {
  const [isPseudoLandscape, setIsPseudoLandscape] = useState(false);

  const launchInLandscape = useCallback((action: () => void) => action(), []);

  useEffect(() => {
    const update = () => setIsPseudoLandscape(window.matchMedia("(pointer: coarse)").matches && window.innerHeight > window.innerWidth);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  useEffect(() => {
    // Three.js renderers listen to window resize. The browser viewport itself
    // does not change in pseudo-landscape, so notify them after the rotated
    // frame receives its swapped dimensions.
    const frame = window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return () => window.cancelAnimationFrame(frame);
  }, [isPseudoLandscape]);

  const getLandscapePointerX = useCallback((clientX: number, clientY: number) => {
    const portraitTouch = window.matchMedia("(pointer: coarse)").matches && window.innerHeight > window.innerWidth;
    return portraitTouch ? clientY : clientX;
  }, []);

  const landscapeFrameStyle: CSSProperties | undefined = isPseudoLandscape
    ? {
        width: "100dvh",
        height: "100dvw",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%) rotate(90deg)",
        transformOrigin: "center",
      }
    : undefined;

  return { launchInLandscape, getLandscapePointerX, landscapeFrameStyle };
}
