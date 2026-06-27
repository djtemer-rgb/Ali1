"use client";

import { useEffect, useRef, useState } from "react";
import { X, Play, Volume2, VolumeX, Heart } from "lucide-react";

interface TapReactionGameProps {
  childId: string;
  rewardId: string;
  characterId: string; // 'streak-reward-4', 'streak-reward-8', 'streak-reward-10', 'streak-reward-19'
  characterName: string;
  onClose: (completed?: boolean) => void;
  testMode?: boolean;
}

interface SpannedItem {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "star" | "normal" | "danger";
  spawnTime: number;
  duration: number; // visibility duration in ms
  clicked: boolean;
  opacity: number;
  scale: number;
  glowColor: string;
  elapsed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay?: number;
  rotation?: number;
  rotSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  wavePhase?: number;
}

export default function TapReactionGame({ childId, rewardId, characterId, characterName, onClose, testMode = false }: TapReactionGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"start" | "playing" | "paused" | "success" | "fail">("start");
  const [hearts, setHearts] = useState(3);
  const [scoreCount, setScoreCount] = useState(0);
  const [tempStars, setTempStars] = useState(0);
  const [showRotationHint, setShowRotationHint] = useState(true);
  const [shouldRotate, setShouldRotate] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [failReason, setFailReason] = useState<"hearts" | "timeout" | null>(null);
  const [loopError, setLoopError] = useState<string | null>(null);

  const spriteImgRef = useRef<HTMLImageElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const getGameDuration = (charId: string) => {
    return charId === "streak-reward-19" ? 40 : 30;
  };
  const [timeLeft, setTimeLeft] = useState(() => getGameDuration(characterId));

  useEffect(() => {
    setTimeLeft(getGameDuration(characterId));
  }, [characterId]);

  // Play Sound Synth
  const playSound = (type: "collect" | "star" | "hit" | "success" | "fail") => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === "collect") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      } else if (type === "star") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(987.77, now + 0.08); // B5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      } else if (type === "hit") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.2);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      } else if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      } else if (type === "fail") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(70, now + 0.4);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.error(e);
    }
  };

  // Asset Path Selector
  const getAssetPath = () => {
    switch (characterId) {
      case "streak-reward-4": return "/images/bonus-games/tap-reaction/04_penguin_pix.png";
      case "streak-reward-8": return "/images/bonus-games/tap-reaction/08_crocodile_croxy.png";
      case "streak-reward-10": return "/images/bonus-games/tap-reaction/10_koala_evka.png";
      case "streak-reward-19": return "/images/bonus-games/tap-reaction/19_shark_reef.png";
      default: return "/images/bonus-games/tap-reaction/10_koala_evka.png";
    }
  };

  // Theme Colors for Start overlay
  const getThemeColors = () => {
    switch (characterId) {
      case "streak-reward-4": return { bg: "from-cyan-400 via-sky-500 to-indigo-600", accent: "text-cyan-200", itemGlow: "rgba(34, 211, 238, 0.95)" };
      case "streak-reward-8": return { bg: "from-amber-400 via-orange-500 to-red-600", accent: "text-yellow-200", itemGlow: "rgba(245, 158, 11, 0.95)" };
      case "streak-reward-10": return { bg: "from-emerald-400 via-green-500 to-teal-600", accent: "text-green-200", itemGlow: "rgba(52, 211, 153, 0.95)" };
      case "streak-reward-19": return { bg: "from-sky-500 via-blue-600 to-slate-900", accent: "text-blue-200", itemGlow: "rgba(14, 165, 233, 0.95)" };
      default: return { bg: "from-teal-400 to-emerald-600", accent: "text-emerald-300", itemGlow: "rgba(16, 185, 129, 0.95)" };
    }
  };

  const theme = getThemeColors();

  // Theme settings for Canvas drawing
  const getCanvasTheme = () => {
    switch (characterId) {
      case "streak-reward-4": // Penguin (Ice/Snow theme)
        return {
          skyGradient: ["#bae6fd", "#f0fdf4"], // bright cold sky
          particleType: "snow",
          particleColors: ["#ffffff", "#e0f2fe", "#bae6fd"],
          usefulGlow: "rgba(14, 165, 233, 0.9)",
          gameDuration: 30,
          maxDanger: 7,
          dangerInterval: 4285,
          customDraw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number) => {
            // Ice block base in bottom center
            ctx.fillStyle = "rgba(186, 230, 253, 0.4)";
            ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2 - 100, canvas.height / 2 + 130);
            ctx.lineTo(canvas.width / 2 + 100, canvas.height / 2 + 130);
            ctx.lineTo(canvas.width / 2 + 80, canvas.height / 2 + 160);
            ctx.lineTo(canvas.width / 2 - 80, canvas.height / 2 + 160);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Draw crystal lines inside the ice block
            ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2 - 70, canvas.height / 2 + 135);
            ctx.lineTo(canvas.width / 2 - 20, canvas.height / 2 + 155);
            ctx.moveTo(canvas.width / 2 + 60, canvas.height / 2 + 135);
            ctx.lineTo(canvas.width / 2 + 30, canvas.height / 2 + 152);
            ctx.stroke();
          }
        };
      case "streak-reward-8": // Crocodile (Fire/Orange theme)
        return {
          skyGradient: ["#ffedd5", "#fde047"], // sunset gold
          particleType: "spark",
          particleColors: ["#f97316", "#ef4444", "#facc15", "#ffffff"],
          usefulGlow: "rgba(249, 115, 22, 0.9)",
          gameDuration: 30,
          maxDanger: 9,
          dangerInterval: 3333,
          customDraw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number) => {
            // Golden pedestal base
            ctx.fillStyle = "rgba(254, 240, 138, 0.4)";
            ctx.strokeStyle = "rgba(234, 179, 8, 0.6)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2 - 100, canvas.height / 2 + 130);
            ctx.lineTo(canvas.width / 2 + 100, canvas.height / 2 + 130);
            ctx.lineTo(canvas.width / 2 + 85, canvas.height / 2 + 155);
            ctx.lineTo(canvas.width / 2 - 85, canvas.height / 2 + 155);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Radial flame glow behind the pedestal
            const fireGlow = ctx.createRadialGradient(
              canvas.width / 2, canvas.height / 2 + 130, 5,
              canvas.width / 2, canvas.height / 2 + 130, 80
            );
            fireGlow.addColorStop(0, "rgba(249, 115, 22, 0.22)");
            fireGlow.addColorStop(1, "rgba(249, 115, 22, 0)");
            ctx.fillStyle = fireGlow;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2 + 130, 80, 0, Math.PI * 2);
            ctx.fill();
          }
        };
      case "streak-reward-10": // Koala (Forest/Nature theme)
        return {
          skyGradient: ["#dcfce7", "#bbf7d0"], // soft green field
          particleType: "leaf",
          particleColors: ["#4ade80", "#22c55e", "#86efac"],
          usefulGlow: "rgba(34, 197, 94, 0.9)",
          gameDuration: 30,
          maxDanger: 12,
          dangerInterval: 2500,
          customDraw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number) => {
            // Leafy round pedestal
            ctx.fillStyle = "rgba(134, 239, 172, 0.4)";
            ctx.strokeStyle = "rgba(34, 197, 94, 0.6)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(canvas.width / 2, canvas.height / 2 + 135, 90, 20, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Draw small forest flowers on the sides
            ctx.fillStyle = "#facc15"; // center
            ctx.beginPath();
            ctx.arc(canvas.width / 2 - 70, canvas.height / 2 + 135, 3, 0, Math.PI * 2);
            ctx.arc(canvas.width / 2 + 70, canvas.height / 2 + 135, 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = "#f87171"; // Red petals
            for (let i = 0; i < 5; i++) {
              const angle = (i * Math.PI * 2) / 5;
              ctx.beginPath();
              ctx.arc(canvas.width / 2 - 70 + Math.cos(angle) * 5, canvas.height / 2 + 135 + Math.sin(angle) * 5, 2, 0, Math.PI * 2);
              ctx.arc(canvas.width / 2 + 70 + Math.cos(angle) * 5, canvas.height / 2 + 135 + Math.sin(angle) * 5, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        };
      case "streak-reward-19": // Shark (Deep Sea theme)
        return {
          skyGradient: ["#0284c7", "#0c4a6e"], // deep water
          particleType: "bubble",
          particleColors: ["rgba(255, 255, 255, 0.6)", "rgba(186, 230, 253, 0.5)", "rgba(224, 242, 254, 0.4)"],
          usefulGlow: "rgba(14, 165, 233, 0.9)",
          gameDuration: 40,
          maxDanger: 15,
          dangerInterval: 2666,
          customDraw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number) => {
            // Draw 3 small fish silhouettes swimming in the background
            ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
            for (let i = 0; i < 3; i++) {
              const speed = 0.04 + i * 0.02;
              const fishX = ((time * speed + i * 150) % (canvas.width + 100)) - 50;
              const fishY = 150 + i * 120 + Math.sin(time * 0.002 + i) * 15;
              
              ctx.beginPath();
              ctx.ellipse(fishX, fishY, 12, 6, 0, 0, Math.PI * 2);
              ctx.fill();
              
              // Tail
              ctx.beginPath();
              ctx.moveTo(fishX - 12, fishY);
              ctx.lineTo(fishX - 18, fishY - 6);
              ctx.lineTo(fishX - 18, fishY + 6);
              ctx.closePath();
              ctx.fill();
            }

            // Coral style ring base
            ctx.fillStyle = "rgba(56, 189, 248, 0.3)";
            ctx.strokeStyle = "rgba(14, 165, 233, 0.5)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(canvas.width / 2, canvas.height / 2 + 135, 95, 22, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        };
      default:
        return {
          skyGradient: ["#f0fdf4", "#dcfce7"],
          particleType: "none",
          particleColors: ["#ffffff"],
          usefulGlow: "rgba(34, 197, 94, 0.9)",
          gameDuration: 30,
          maxDanger: 8,
          dangerInterval: 3750,
          customDraw: () => {}
        };
    }
  };

  const canvasTheme = getCanvasTheme();

  // Screen Orientation Detection
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRotationHint(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        const isTouch = window.matchMedia("(pointer: coarse)").matches;
        // On touch screens, show rotation prompt if rotated landscape
        setShouldRotate(window.innerWidth > window.innerHeight && isTouch);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Pre-load the character sprite sheet
  useEffect(() => {
    setImageLoaded(false);
    const img = new Image();
    img.src = getAssetPath();
    img.onload = () => {
      setImageLoaded(true);
    };
    if (img.complete) {
      setImageLoaded(true);
    }
    spriteImgRef.current = img;
  }, [characterId]);

  // Main gameplay engine states ref
  const gameRef = useRef<{
    happyTimer: number; // remaining ms for happy sprite
    alertTimer: number; // remaining ms for alert sprite
    items: SpannedItem[];
    particles: Particle[];
    spawnTimer: number;
    lastTime: number;
    itemIdCounter: number;
    frameCount: number;
    score: number;
    dangerCount: number;
    lastDangerTime: number;
  }>({
    happyTimer: 0,
    alertTimer: 0,
    items: [],
    particles: [],
    spawnTimer: 0,
    lastTime: 0,
    itemIdCounter: 0,
    frameCount: 0,
    score: 0,
    dangerCount: 0,
    lastDangerTime: 0
  });

  // Handle pointer down (tap on item)
  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Map client coordinates to canvas space
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (clientX - rect.left) * scaleX;
    const my = (clientY - rect.top) * scaleY;

    const g = gameRef.current;
    const clickTolerance = 25; // user-friendly padding for easy tapping

    // Find the clicked item
    // Traverse backwards to click items on top first
    for (let i = g.items.length - 1; i >= 0; i--) {
      const item = g.items[i];
      if (item.clicked || item.opacity < 0.15) continue;

      if (
        mx >= item.x - clickTolerance &&
        mx <= item.x + item.width + clickTolerance &&
        my >= item.y - clickTolerance &&
        my <= item.y + item.height + clickTolerance
      ) {
        // Mark as clicked
        item.clicked = true;

        if (item.type === "danger") {
          // Negative tap
          playSound("hit");
          g.alertTimer = 900;
          g.happyTimer = 0;
          
          // Spawn danger particles (red/dark explosion)
          for (let p = 0; p < 12; p++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 2.5;
            g.particles.push({
              x: item.x + item.width / 2,
              y: item.y + item.height / 2,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 3 + Math.random() * 4,
              color: Math.random() < 0.5 ? "#ef4444" : "#475569",
              alpha: 1.0,
              decay: 0.035
            });
          }

          setHearts((prev) => {
            const nextVal = prev - 1;
            if (nextVal <= 0) {
              setFailReason("hearts");
              setGameState("fail");
              playSound("fail");
            }
            return nextVal;
          });
        } else {
          // Useful item or Star tap
          if (item.type === "star") {
            playSound("star");
            setTempStars((prev) => prev + 1);
            
            // Spawn gold star explosion particles
            for (let p = 0; p < 15; p++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 2.0 + Math.random() * 3.0;
              g.particles.push({
                x: item.x + item.width / 2,
                y: item.y + item.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 4,
                color: "#fbbf24",
                alpha: 1.0,
                decay: 0.025,
                rotation: Math.random() * Math.PI,
                rotSpeed: (Math.random() - 0.5) * 0.1
              });
            }
          } else {
            playSound("collect");
            
            // Spawn themed sparkle particles
            const color = theme.itemGlow.replace("0.95", "1").replace("0.9", "1");
            for (let p = 0; p < 12; p++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 1.5 + Math.random() * 2.5;
              g.particles.push({
                x: item.x + item.width / 2,
                y: item.y + item.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 3,
                color: color,
                alpha: 1.0,
                decay: 0.03
              });
            }
          }

          g.happyTimer = 900;
          g.alertTimer = 0;

          g.score++;
          setScoreCount(g.score);
          if (g.score >= 15) {
            setGameState("success");
            playSound("success");
          }
        }
        break; // Tapped one item, don't tap overlapping ones underneath
      }
    }
  };

  // Main game loop logic
  useEffect(() => {
    if (gameState !== "playing") return;

    // Timer Interval
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setFailReason("timeout");
          setGameState("fail");
          playSound("fail");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const spriteImg = spriteImgRef.current || new Image();
    if (!spriteImg.src) {
      spriteImg.src = getAssetPath();
    }

    const g = gameRef.current;
    g.lastTime = performance.now();
    g.items = [];
    g.happyTimer = 0;
    g.alertTimer = 0;
    g.score = 0;
    g.dangerCount = 0;
    g.lastDangerTime = performance.now();

    // Pre-populate background ambient floating particles (12 items)
    g.particles = Array.from({ length: 12 }, () => {
      const color = canvasTheme.particleColors[Math.floor(Math.random() * canvasTheme.particleColors.length)];
      
      let x = Math.random() * canvas.width;
      let y = Math.random() * canvas.height;
      let vx = (Math.random() - 0.5) * 0.4;
      let vy = 0.3 + Math.random() * 0.5;
      
      if (canvasTheme.particleType === "bubble") {
        vy = -(0.5 + Math.random() * 0.8); // Bubbles float upwards
      } else if (canvasTheme.particleType === "spark") {
        vy = -(0.2 + Math.random() * 0.4); // Sparks float slightly upwards
        vx = (Math.random() - 0.5) * 0.6;
      } else if (canvasTheme.particleType === "snow") {
        vy = 0.5 + Math.random() * 0.7; // Snow falls down
        vx = (Math.random() - 0.3) * 0.3;
      } else if (canvasTheme.particleType === "leaf") {
        vy = 0.4 + Math.random() * 0.5; // Leaves fall down
        vx = (Math.random() - 0.5) * 0.4;
      }

      return {
        x,
        y,
        vx,
        vy,
        size: 3 + Math.random() * 4,
        color,
        alpha: 0.3 + Math.random() * 0.5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.03,
        waveFrequency: 0.01 + Math.random() * 0.02,
        waveAmplitude: 3 + Math.random() * 6,
        wavePhase: Math.random() * Math.PI * 2
      };
    });

    const loop = (time: number) => {
      try {
        g.frameCount++;
        if (!time) {
          time = performance.now();
        }
        if (g.frameCount === 1) {
          g.lastDangerTime = time;
        }
        let delta = time - g.lastTime;
        if (delta < 0 || isNaN(delta) || delta > 1000) {
          delta = 16.666;
        }
        const dt = Math.min(100, delta) / 16.666; // Normalize to 60fps delta
        g.lastTime = time;


      // 1. Draw themed sky background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGrad.addColorStop(0, canvasTheme.skyGradient[0]);
      skyGrad.addColorStop(1, canvasTheme.skyGradient[1]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw custom background decorations (pedestal, ice, coral etc.)
      canvasTheme.customDraw(ctx, canvas, time);

      // 3. Update & Draw ambient particles
      g.particles.forEach((p) => {
        // Update positions
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        
        if (p.rotation !== undefined && p.rotSpeed !== undefined) {
          p.rotation += p.rotSpeed * dt;
        }

        // Apply wave behavior to bubbles and leaves
        if (canvasTheme.particleType === "bubble" && p.waveFrequency && p.waveAmplitude && p.wavePhase !== undefined) {
          p.x += Math.sin(time * p.waveFrequency + p.wavePhase) * 0.25 * dt;
        } else if (canvasTheme.particleType === "leaf" && p.waveFrequency && p.waveAmplitude && p.wavePhase !== undefined) {
          p.x += Math.sin(time * p.waveFrequency + p.wavePhase) * 0.35 * dt;
        }

        // Decay special explosion particles (decay is defined on clicks)
        if (p.decay) {
          p.alpha -= p.decay * dt;
        }

        // Bounds wrapping for ambient particles
        if (!p.decay) {
          if (canvasTheme.particleType === "bubble" || canvasTheme.particleType === "spark") {
            if (p.y < -15) {
              p.y = canvas.height + 15;
              p.x = Math.random() * canvas.width;
            }
          } else {
            if (p.y > canvas.height + 15) {
              p.y = -15;
              p.x = Math.random() * canvas.width;
            }
          }
          if (p.x < -15) p.x = canvas.width + 15;
          if (p.x > canvas.width + 15) p.x = -15;
        }

        // Draw particle
        if (p.alpha > 0.01) {
          ctx.save();
          ctx.translate(p.x, p.y);
          if (p.rotation !== undefined) {
            ctx.rotate(p.rotation);
          }
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;

          if (canvasTheme.particleType === "snow" || p.decay) {
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
          } else if (canvasTheme.particleType === "bubble") {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.stroke();
            // Highlight shine
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.beginPath();
            ctx.arc(-p.size * 0.3, -p.size * 0.3, p.size * 0.2, 0, Math.PI * 2);
            ctx.fill();
          } else if (canvasTheme.particleType === "leaf") {
            ctx.beginPath();
            ctx.moveTo(-p.size, 0);
            ctx.lineTo(0, -p.size * 0.6);
            ctx.lineTo(p.size, 0);
            ctx.lineTo(0, p.size * 0.6);
            ctx.closePath();
            ctx.fill();
          } else if (canvasTheme.particleType === "spark") {
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      });

      // Filter out dead particles
      g.particles = g.particles.filter((p) => !p.decay || p.alpha > 0.01);

      // Update character sprite timers
      if (g.happyTimer > 0) g.happyTimer -= dt * 16.666;
      if (g.alertTimer > 0) g.alertTimer -= dt * 16.666;

      // 4. Draw central character
      // Scaled dimensions: 160x240
      const charW = 160;
      const charH = 240;
      const charX = (canvas.width - charW) / 2;
      const charY = (canvas.height - charH) / 2 + 10; // slightly lowered for pedestal overlap

      if (spriteImg.complete && spriteImg.naturalWidth > 0) {
        // Frame mapping: Row 0 is characters.
        // Col 0: idle, Col 1: happy, Col 2: alert
        let col = 0;
        if (g.alertTimer > 0) col = 2;
        else if (g.happyTimer > 0) col = 1;

        ctx.save();
        ctx.shadowColor = col === 1 ? "rgba(110, 231, 183, 0.75)" :
                           col === 2 ? "rgba(239, 68, 68, 0.75)" : "rgba(255, 255, 255, 0.2)";
        ctx.shadowBlur = 18;
        ctx.drawImage(
          spriteImg,
          col * 418, 0, 418, 627, // Source rect
          charX, charY, charW, charH // Dest rect
        );
        ctx.restore();
      } else {
        // Fallback graphics
        ctx.fillStyle = "#8b5cf6";
        ctx.fillRect(charX, charY, charW, charH);
        ctx.fillStyle = "#ffffff";
        ctx.font = "32px sans-serif";
        ctx.textAlign = "center";
        const emoji = g.alertTimer > 0 ? "😰" : g.happyTimer > 0 ? "😄" : "🐨";
        ctx.fillText(emoji, charX + charW / 2, charY + charH / 2 + 10);
      }

      // 5. Spawn logic
      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0) {
        // Calculate dynamic boundaries around character
        // Avoid spawning exactly on top of character center
        // Canvas is 480x800. Center character box is [160, 290] -> [320, 530]
        // Spawning region: X in [30, 390], Y in [60, 710]
        
        let itemX = 30 + Math.random() * 360;
        let itemY = 80 + Math.random() * 600;

        // If it overlaps the character center too much, nudge it away
        const charCenterX = canvas.width / 2;
        const charCenterY = canvas.height / 2;
        const distToCenter = Math.hypot(itemX + 30 - charCenterX, itemY + 45 - charCenterY);
        if (distToCenter < 120) {
          // Push outward radially
          const angle = Math.atan2(itemY + 45 - charCenterY, itemX + 30 - charCenterX);
          itemX = charCenterX + Math.cos(angle) * 140 - 30;
          itemY = charCenterY + Math.sin(angle) * 140 - 45;
        }

        // Clamp to screen bounds
        itemX = Math.max(25, Math.min(canvas.width - 85, itemX));
        itemY = Math.max(70, Math.min(canvas.height - 160, itemY));

        // Spawn type logic with soft-interval pacing for danger items
        const rand = Math.random();
        let type: "star" | "normal" | "danger" = "normal";
        
        const timeSinceLastDanger = time - g.lastDangerTime;
        const interval = canvasTheme.dangerInterval;
        
        let shouldForceDanger = false;
        let canSpawnDanger = true;
        
        if (g.dangerCount < canvasTheme.maxDanger) {
          if (timeSinceLastDanger > interval * 1.4) {
            shouldForceDanger = true;
          }
          if (timeSinceLastDanger < interval * 0.7) {
            canSpawnDanger = false;
          }
        } else {
          canSpawnDanger = false;
        }
        
        if (shouldForceDanger) {
          type = "danger";
          g.dangerCount++;
          g.lastDangerTime = time;
        } else if (canSpawnDanger && rand < 0.25) {
          type = "danger";
          g.dangerCount++;
          g.lastDangerTime = time;
        } else {
          type = Math.random() < 0.3 ? "star" : "normal";
        }

        const duration = 1250 + Math.random() * 300; // visible for 1.25s - 1.55s

        g.itemIdCounter++;
        g.items.push({
          id: g.itemIdCounter,
          x: itemX,
          y: itemY,
          width: 60,
          height: 90,
          type,
          spawnTime: time,
          duration,
          clicked: false,
          opacity: 0,
          scale: 0.5,
          glowColor: type === "star" ? "rgba(253, 224, 71, 0.9)" :
                     type === "danger" ? "rgba(239, 68, 68, 0.9)" : canvasTheme.usefulGlow,
          elapsed: 0
        });

        // Delay between spawns, decreases slightly as score increases (more action)
        const spawnDelay = Math.max(35, 75 - g.score * 2);
        g.spawnTimer = spawnDelay + Math.random() * 25;
      }

      // 6. Update & Draw items
      g.items.forEach((item) => {
        item.elapsed += dt * 16.666;
        const elapsed = item.elapsed;
        
        if (elapsed >= item.duration || item.clicked) {
          // Fade out / disappear
          item.opacity -= 0.12 * dt;
          item.scale -= 0.08 * dt;
        } else {
          // Fade in and sustain
          if (elapsed < 200) {
            const factor = elapsed / 200;
            item.opacity = factor;
            item.scale = 0.5 + 0.5 * factor;
          } else if (elapsed > item.duration - 200) {
            const factor = (item.duration - elapsed) / 200;
            item.opacity = factor;
            item.scale = 0.8 + 0.2 * factor;
          } else {
            item.opacity = 1.0;
            item.scale = 1.0;
          }
        }

        // Draw active item
        if (item.opacity > 0.01) {
          ctx.save();
          
          // Apply position centering for scale animation
          const cx = item.x + item.width / 2;
          const cy = item.y + item.height / 2;
          ctx.translate(cx, cy);
          ctx.scale(item.scale, item.scale);
          ctx.translate(-item.width / 2, -item.height / 2);
          
          ctx.globalAlpha = item.opacity;

          if (spriteImg.complete && spriteImg.naturalWidth > 0) {
            // Slicing parameters: Row 1 is items
            // Col 0: star, Col 1: useful, Col 2: danger
            let col = 1;
            if (item.type === "star") col = 0;
            if (item.type === "danger") col = 2;

            ctx.shadowColor = item.glowColor;
            ctx.shadowBlur = 15;
            ctx.drawImage(
              spriteImg,
              col * 418, 627, 418, 627, // Source rect
              0, 0, item.width, item.height // Destination rect
            );
          } else {
            // Fallback rendering
            ctx.fillStyle = item.type === "star" ? "#eab308" : item.type === "danger" ? "#ef4444" : "#10b981";
            ctx.beginPath();
            ctx.arc(item.width / 2, item.height / 2, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "14px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const sym = item.type === "star" ? "⭐" : item.type === "danger" ? "💣" : "🍓";
            ctx.fillText(sym, item.width / 2, item.height / 2);
          }

          ctx.restore();
        }
      });

      // Remove fully faded out or clicked out items
      g.items = g.items.filter((item) => item.opacity > 0.01);

      // Debug overlay removed

      animId = requestAnimationFrame(loop);
      } catch (err: any) {
        console.error("Canvas loop error:", err);
        setLoopError(err?.message || String(err));
      }
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(timer);
    };
  }, [gameState]);

  const handleRestart = () => {
    setHearts(3);
    setScoreCount(0);
    setTempStars(0);
    setTimeLeft(getGameDuration(characterId));
    setFailReason(null);
    setLoopError(null);
    const g = gameRef.current;
    g.happyTimer = 0;
    g.alertTimer = 0;
    g.items = [];
    g.particles = [];
    g.spawnTimer = 0;
    g.itemIdCounter = 0;
    g.frameCount = 0;
    g.score = 0;
    g.dangerCount = 0;
    g.lastDangerTime = 0;
    setGameState("playing");
  };

  const saveCompletion = async () => {
    if (testMode) {
      onClose(true);
      return;
    }
    try {
      await fetch("/api/bonus-games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          rewardId,
          gameId: "tap_reaction",
          completed: true
        }),
        keepalive: true
      });
    } catch (e) {
      console.error("Failed to save tap reaction completion:", e);
    }
    onClose(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 font-sans select-none overflow-hidden touch-none">
      
      {/* 1. Landscape Orientation Blocker Overlay */}
      {showRotationHint && shouldRotate && (
        <div className="absolute inset-0 bg-slate-900 z-[110] flex flex-col items-center justify-center text-white px-6 text-center">
          <div className="text-6xl animate-bounce mb-6">📱🔄</div>
          <h2 className="text-xl font-black mb-2">Поверни телефон</h2>
          <p className="text-slate-400 text-xs max-w-xs leading-normal mb-4">
            Для этой игры переверни устройство обратно в вертикальный (портретный) режим!
          </p>
          <button 
            onClick={() => setShowRotationHint(false)}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs px-5 py-2 rounded-full shadow-md transition-transform transform active:scale-95 cursor-pointer"
          >
            Понятно
          </button>
        </div>
      )}

      {/* Main Game Shell (portrait card style) */}
      <div 
        className="relative w-full h-full max-w-[450px] max-h-[750px] bg-slate-900 overflow-hidden flex flex-col md:rounded-3xl md:shadow-2xl border border-slate-800"
      >
        
        {/* Header HUD panel */}
        <div className="absolute top-0 inset-x-0 h-14 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between px-4 z-20 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button 
              onClick={() => onClose(false)} 
              className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Выйти"
            >
              <X size={18} />
            </button>
            {gameState === "playing" && (
              <button 
                onClick={() => setGameState("paused")} 
                className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="text-xs">⏸️</span>
              </button>
            )}
          </div>

          {/* Hud labels */}
          <div className="flex items-center gap-3.5">
            {/* Target Catch Count Progress */}
            <div className="bg-black/40 border border-white/10 text-emerald-400 font-extrabold text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
              🎯 {scoreCount}/15
            </div>

            {/* Lives */}
            <div className="flex items-center gap-0.5 bg-black/40 border border-white/10 px-2.5 py-1 rounded-full">
              {[...Array(3)].map((_, i) => (
                <Heart 
                  key={i} 
                  size={13} 
                  className={i < hearts ? "text-red-500 fill-red-500" : "text-slate-500 fill-transparent"} 
                />
              ))}
            </div>

            {/* Stars Collected */}
            <div className="bg-black/40 border border-white/10 text-amber-400 font-extrabold text-xs px-2.5 py-1 rounded-full flex items-center gap-0.5">
              <span>⭐</span> {tempStars}
            </div>

            {/* Timer ProgressBar */}
            <div className="bg-black/40 border border-white/10 text-sky-400 font-extrabold text-xs px-2.5 py-1 rounded-full flex items-center gap-1 min-w-[55px] justify-center">
              ⏱️ {timeLeft}s
            </div>
          </div>

          {/* Sound Toggle */}
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className="pointer-events-auto w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>

        {/* Canvas Area */}
        <canvas 
          ref={canvasRef} 
          width={480} 
          height={720} 
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          className="w-full h-full bg-slate-900 cursor-crosshair object-cover block"
        />

        {/* Start Game View Overlay */}
        {gameState === "start" && (
          <div className={`absolute inset-0 z-30 bg-gradient-to-br ${theme.bg} flex flex-col items-center justify-center text-white text-center p-6`}>
            <div className="text-7xl mb-5 animate-bounce">
              {characterId === "streak-reward-4" ? "❄️🐧" : 
               characterId === "streak-reward-8" ? "🔥🐊" : 
               characterId === "streak-reward-10" ? "🍃🐨" : 
               characterId === "streak-reward-19" ? "🌊🦈" : "🍃🐨"}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wide drop-shadow-md">
              Тап-реакция: {characterName}
            </h1>
            <p className="text-xs md:text-sm text-white/95 max-w-xs leading-relaxed mt-3 drop-shadow-sm">
              Нажимай на <span className="font-extrabold text-yellow-300">светящиеся предметы и звёзды</span> вокруг героя, чтобы ловить их!<br/>
              <span className="font-extrabold text-red-300">Опасные шипастые предметы</span> трогать нельзя!
            </p>
            {!imageLoaded ? (
              <div className="mt-6 flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full border-4 border-white/20 border-t-yellow-400 animate-spin" />
                <span className="text-[11px] text-white/80 font-bold uppercase tracking-wider">Загрузка героя...</span>
              </div>
            ) : (
              <button 
                onClick={() => setGameState("playing")}
                className="mt-8 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-sm md:text-base px-10 py-3.5 rounded-full shadow-lg transition-transform transform active:scale-95 cursor-pointer"
              >
                Начать
              </button>
            )}
          </div>
        )}

        {/* Paused View Overlay */}
        {gameState === "paused" && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white text-center p-6">
            <h2 className="text-2xl font-black mb-6">Пауза</h2>
            <button 
              onClick={() => setGameState("playing")}
              className="w-16 h-16 rounded-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 flex items-center justify-center shadow-lg transition-transform transform active:scale-95 cursor-pointer"
            >
              <Play size={24} className="fill-slate-950" />
            </button>
          </div>
        )}

        {/* Success / Victory View Overlay */}
        {gameState === "success" && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center text-white text-center p-6">
            <div className="text-7xl mb-4 animate-[spin_6s_linear_infinite]">👑🏆</div>
            <h2 className="text-2xl md:text-3xl font-black text-yellow-400">Игра пройдена!</h2>
            <p className="text-sm font-bold text-slate-200 mt-3">Поздравляю! Ты справился на отлично!</p>
            <p className="text-xs text-amber-400 mt-1">Собрано временных звёзд: {tempStars} ⭐</p>
            <button 
              onClick={saveCompletion}
              className="mt-8 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-sm md:text-base px-10 py-3.5 rounded-full shadow-lg transition-transform transform active:scale-95 cursor-pointer"
            >
              Окей
            </button>
          </div>
        )}

        {/* Failure / Loss View Overlay */}
        {gameState === "fail" && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center text-white text-center p-6">
            {failReason === "timeout" ? (
              <>
                <div className="text-7xl mb-5">⏱️🥺</div>
                <h2 className="text-2xl md:text-3xl font-black text-amber-400">Время вышло!</h2>
                <p className="text-xs md:text-sm text-slate-400 max-w-xs mt-2.5 leading-relaxed">
                  Не хватило времени, чтобы поймать 15 предметов. Давай попробуем ещё разок!
                </p>
              </>
            ) : (
              <>
                <div className="text-7xl mb-5">💔🥺</div>
                <h2 className="text-2xl md:text-3xl font-black text-red-500">Пока не получилось</h2>
                <p className="text-xs md:text-sm text-slate-400 max-w-xs mt-2.5 leading-relaxed">
                  Потеряны все жизни. Не расстраивайся! Герои не сдаются. Давай попробуем снова!
                </p>
              </>
            )}
            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => onClose(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs md:text-sm px-6 py-3.5 rounded-full transition-colors cursor-pointer"
              >
                Выйти
              </button>
              <button 
                onClick={handleRestart}
                className="bg-red-500 hover:bg-red-600 text-white font-black text-xs md:text-sm px-8 py-3.5 rounded-full shadow-md transition-transform transform active:scale-95 cursor-pointer"
              >
                Начать заново
              </button>
            </div>
          </div>
        )}

        {/* Loop Error overlay */}
        {loopError && (
          <div className="absolute inset-0 z-50 bg-red-950/95 text-white p-6 flex flex-col items-center justify-center text-center">
            <h2 className="text-xl font-bold mb-2">Ошибка в игровом цикле</h2>
            <pre className="bg-black/50 p-4 rounded text-xs overflow-auto max-w-full font-mono text-red-300 mb-4 whitespace-pre-wrap">
              {loopError}
            </pre>
            <button 
              onClick={() => { setLoopError(null); handleRestart(); }}
              className="mt-4 bg-white hover:bg-slate-100 text-red-950 font-black text-xs px-5 py-2 rounded-full shadow-md transition-transform transform active:scale-95 cursor-pointer"
            >
              Начать заново
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
