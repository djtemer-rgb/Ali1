"use client";

import { useEffect, useRef, useState } from "react";
import { X, Play, Volume2, VolumeX, Heart } from "lucide-react";

interface JumpGameProps {
  childId: string;
  rewardId: string;
  characterId: string; // 'streak-reward-3', 'streak-reward-9', 'streak-reward-12', 'streak-reward-18'
  characterName: string;
  onClose: (completed?: boolean) => void;
  testMode?: boolean;
}

interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  type: "normal" | "moving";
  vx?: number;
  rangeX?: [number, number];
}

interface StarItem {
  x: number;
  y: number;
  w: number;
  h: number;
  collected: boolean;
}

interface DangerItem {
  x: number;
  y: number;
  w: number;
  h: number;
  active: boolean;
  pulseTimer?: number;
}

interface UsefulItem {
  x: number;
  y: number;
  w: number;
  h: number;
  collected: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation?: number;
  rotSpeed?: number;
}

export default function JumpGame({ childId, rewardId, characterId, characterName, onClose, testMode = false }: JumpGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"start" | "playing" | "paused" | "success" | "fail">("start");
  const [hearts, setHearts] = useState(3);
  const [tempStars, setTempStars] = useState(0);
  const [score, setScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [failReason, setFailReason] = useState<"hearts" | "timeout" | null>(null);
  const [loopError, setLoopError] = useState<string | null>(null);

  const spriteImgRef = useRef<HTMLImageElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const GAME_DURATION = 40; // 40 seconds to climb
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);

  // Play Sound Synth
  const playSound = (type: "bounce" | "collect" | "star" | "hit" | "success" | "fail") => {
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

      if (type === "bounce") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      } else if (type === "star" || type === "collect") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(783.99, now + 0.08); // G5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      } else if (type === "hit") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.25);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
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
        osc.frequency.linearRampToValueAtTime(70, now + 0.45);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
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
    let basePath = "";
    switch (characterId) {
      case "streak-reward-3": basePath = "/images/bonus-games/jump/03_raccoon_plush.png"; break;
      case "streak-reward-9": basePath = "/images/bonus-games/jump/09_wolf_nord.png"; break;
      case "streak-reward-12": basePath = "/images/bonus-games/jump/12_tiger_ryks.png"; break;
      case "streak-reward-18": basePath = "/images/bonus-games/jump/18_leopard_blitz.png"; break;
      default: basePath = "/images/bonus-games/jump/03_raccoon_plush.png";
    }
    return basePath + "?v=4";
  };

  const getUsefulItemEmoji = () => {
    switch (characterId) {
      case "streak-reward-3": return "🌰";
      case "streak-reward-9": return "❄️";
      case "streak-reward-12": return "🥩";
      case "streak-reward-18": return "💎";
      default: return "🌰";
    }
  };

  const getUsefulItemGlowColor = () => {
    switch (characterId) {
      case "streak-reward-3": return "rgba(245, 158, 11, 0.4)";
      case "streak-reward-9": return "rgba(14, 165, 233, 0.4)";
      case "streak-reward-12": return "rgba(239, 68, 68, 0.4)";
      case "streak-reward-18": return "rgba(168, 85, 247, 0.4)";
      default: return "rgba(255, 255, 255, 0.4)";
    }
  };

  // Theme colors for start overlay
  const getThemeColors = () => {
    switch (characterId) {
      case "streak-reward-3": return { bg: "from-green-400 via-emerald-500 to-teal-600", accent: "text-green-200" };
      case "streak-reward-9": return { bg: "from-cyan-400 via-sky-500 to-indigo-600", accent: "text-cyan-200" };
      case "streak-reward-12": return { bg: "from-amber-400 via-orange-500 to-red-600", accent: "text-yellow-200" };
      case "streak-reward-18": return { bg: "from-purple-400 via-fuchsia-500 to-indigo-700", accent: "text-purple-200" };
      default: return { bg: "from-teal-400 to-emerald-600", accent: "text-emerald-300" };
    }
  };

  const theme = getThemeColors();

  // Character graphics themes for canvas
  const getCanvasTheme = () => {
    switch (characterId) {
      case "streak-reward-3": // Raccoon (Forest theme)
        return {
          skyGradient: ["#dcfce7", "#bbf7d0"], // Soft scanning green forest
          particleType: "leaf",
          particleColors: ["#4ade80", "#22c55e", "#86efac"],
          drawExtraDecorations: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cameraY: number) => {
            // Draw background trees relative to cameraY
            ctx.fillStyle = "rgba(21, 128, 61, 0.08)";
            for (let i = 0; i < 5; i++) {
              const x = 50 + i * 110;
              const y = 600 - ((cameraY * 0.3 + i * 90) % 800);
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x - 40, y + 160);
              ctx.lineTo(x + 40, y + 160);
              ctx.closePath();
              ctx.fill();
            }
          }
        };
      case "streak-reward-9": // Wolf (Winter theme)
        return {
          skyGradient: ["#bae6fd", "#e0f2fe"], // cold winter morning sky
          particleType: "snow",
          particleColors: ["#ffffff", "#e0f2fe", "#bae6fd"],
          drawExtraDecorations: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cameraY: number) => {
            // Draw distant ice mountains
            ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
            for (let i = 0; i < 3; i++) {
              const x = 80 + i * 180;
              const y = 500 - ((cameraY * 0.15 + i * 150) % 800);
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x - 90, y + 300);
              ctx.lineTo(x + 90, y + 300);
              ctx.closePath();
              ctx.fill();
            }
          }
        };
      case "streak-reward-12": // Tiger (Jungle theme)
        return {
          skyGradient: ["#fef08a", "#fde047"], // sunny golden jungle
          particleType: "leaf",
          particleColors: ["#facc15", "#f97316", "#a3e635"],
          drawExtraDecorations: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cameraY: number) => {
            // Draw jungle foliage background silhouettes
            ctx.fillStyle = "rgba(163, 230, 53, 0.1)";
            for (let i = 0; i < 6; i++) {
              const x = 20 + i * 95;
              const y = 550 - ((cameraY * 0.35 + i * 70) % 800);
              ctx.beginPath();
              ctx.arc(x, y + 100, 50, 0, Math.PI * 2);
              ctx.arc(x - 20, y + 80, 40, 0, Math.PI * 2);
              ctx.arc(x + 20, y + 80, 40, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        };
      case "streak-reward-18": // Leopard (Sky / Magic theme)
        return {
          skyGradient: ["#fae8ff", "#e9d5ff"], // magical clouds, lavender sky
          particleType: "bubble", // magical floating light bubbles
          particleColors: ["rgba(168, 85, 247, 0.4)", "rgba(232, 121, 249, 0.4)", "rgba(255, 255, 255, 0.5)"],
          drawExtraDecorations: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cameraY: number) => {
            // Draw glowing sky circles
            ctx.fillStyle = "rgba(192, 132, 252, 0.08)";
            for (let i = 0; i < 4; i++) {
              const x = 100 + i * 140;
              const y = 450 - ((cameraY * 0.2 + i * 120) % 800);
              ctx.beginPath();
              ctx.arc(x, y, 60 + i * 10, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        };
      default:
        return {
          skyGradient: ["#f0f9ff", "#e0f2fe"],
          particleType: "none",
          particleColors: ["#ffffff"],
          drawExtraDecorations: () => {}
        };
    }
  };

  const canvasTheme = getCanvasTheme();

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
    player: {
      x: number;
      targetX: number;
      y: number;
      vx: number;
      vy: number;
      width: number;
      height: number;
      facingLeft: boolean;
      invulnerable: number;
      prepareTimer: number; // to show the "crouch/prepare" frame briefly
      bounceAnim: number; // scale animation on bounce
    };
    cameraY: number;
    platforms: Platform[];
    stars: StarItem[];
    usefulItems: UsefulItem[];
    dangers: DangerItem[];
    particles: Particle[];
    lastTime: number;
    frameCount: number;
    score: number;
    levelHeight: number;
    finishPlatform: { x: number; y: number; w: number; h: number };
    dragActive: boolean;
    dragStartX: number;
    dragStartPlayerX: number;
  }>({
    player: {
      x: 240 - 30,
      targetX: 240 - 30,
      y: 50,
      vx: 0,
      vy: 0,
      width: 60,
      height: 90,
      facingLeft: false,
      invulnerable: 0,
      prepareTimer: 0,
      bounceAnim: 0
    },
    cameraY: 0,
    platforms: [],
    stars: [],
    usefulItems: [],
    dangers: [],
    particles: [],
    lastTime: 0,
    frameCount: 0,
    score: 0,
    levelHeight: 4600,
    finishPlatform: { x: 90, y: -4630, w: 300, h: 40 },
    dragActive: false,
    dragStartX: 0,
    dragStartPlayerX: 240 - 30
  });

  // Setup/generate level components
  const generateLevel = () => {
    const g = gameRef.current;
    g.platforms = [];
    g.stars = [];
    g.usefulItems = [];
    g.dangers = [];
    g.particles = [];
    g.score = 0;
    setScore(0);
    
    // Bottom starter platform
    g.platforms.push({
      x: 240 - 75,
      y: 650,
      w: 150,
      h: 22,
      type: "normal"
    });

    let currentY = 510;
    let prevX = 240 - 50;
    const verticalGap = 135;

    while (currentY > -g.levelHeight) {
      // Horizontal span reachable constraint
      let minX = Math.max(35, prevX - 165);
      let maxX = Math.min(480 - 145, prevX + 165);
      let x = minX + Math.random() * (maxX - minX);

      const isMoving = Math.random() < 0.26;
      g.platforms.push({
        x,
        y: currentY,
        w: 110, // Wider platforms to make landing easier for kids
        h: 20,
        type: isMoving ? "moving" : "normal",
        vx: isMoving ? (Math.random() < 0.5 ? -1.8 : 1.8) : 0,
        rangeX: [30, 480 - 140]
      });

      prevX = x;

      // Spawn item or danger relative to platform
      const rand = Math.random();
      if (rand < 0.28) {
        // Spawn star floating above platform
        g.stars.push({
          x: x + 40,
          y: currentY - 45,
          w: 30,
          h: 30,
          collected: false
        });
      } else if (rand < 0.60) {
        // Spawn useful item floating above platform
        g.usefulItems.push({
          x: x + 40,
          y: currentY - 45,
          w: 30,
          h: 30,
          collected: false
        });
      } else if (rand > 0.86 && currentY < 450) { // No bombs on the very first few screens
        // Spawn danger element in a fair, dodgeable position
        // Place it horizontally away from the platform center, or at the screen edges
        const platformCenter = x + 55;
        let dangerX = 40 + Math.random() * 400;
        
        // If it overlaps the platform center, nudge it to the sides
        if (Math.abs(dangerX - platformCenter) < 90) {
          dangerX = platformCenter > 240 ? 60 : 380;
        }

        g.dangers.push({
          x: Math.max(30, Math.min(450 - 35, dangerX)),
          y: currentY - 68, // Halfway between platforms vertically
          w: 35,
          h: 35,
          active: true,
          pulseTimer: Math.random() * Math.PI
        });
      }

      currentY -= (verticalGap + Math.random() * 25);
    }

    // Set finish platform at the very top
    g.finishPlatform = {
      x: 240 - 125,
      y: -g.levelHeight - 40,
      w: 250,
      h: 30
    };
    
    // Player spawn positioning
    g.player.x = 240 - 30;
    g.player.targetX = 240 - 30;
    g.player.y = 650 - 90 - 5; // right on the starter platform
    g.player.vx = 0;
    g.player.vy = 0;
    g.player.facingLeft = false;
    g.player.invulnerable = 0;
    g.player.prepareTimer = 0;
    g.player.bounceAnim = 0;

    g.cameraY = 650 - 450; // Align camera initially
    setHearts(3);
    setTempStars(0);
    setTimeLeft(GAME_DURATION);
    setFailReason(null);
    setLoopError(null);
  };

  // Touch and Drag handlers
  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing" || !canvasRef.current) return;
    
    let clientX = 0;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    const g = gameRef.current;
    g.dragActive = true;
    g.dragStartX = clientX;
    g.dragStartPlayerX = g.player.targetX;
  };

  const handlePointerUp = () => {
    gameRef.current.dragActive = false;
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (gameState !== "playing" || !canvasRef.current || !g.dragActive) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    // Direct translation: mapping coordinates to screen
    const scale = canvas.width / rect.width;
    const deltaX = (clientX - g.dragStartX) * scale;
    
    g.player.targetX = Math.max(0, Math.min(canvas.width - g.player.width, g.dragStartPlayerX + deltaX));
  };

  // Tap fallback to instantly snap/move targetX
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    
    gameRef.current.player.targetX = Math.max(0, Math.min(canvas.width - gameRef.current.player.width, mx - gameRef.current.player.width / 2));
  };

  // Main gameplay loop
  useEffect(() => {
    if (gameState !== "playing") return;

    // Time ticks
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

    // Populate ambient particles
    g.particles = Array.from({ length: 15 }, () => {
      const color = canvasTheme.particleColors[Math.floor(Math.random() * canvasTheme.particleColors.length)];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: canvasTheme.particleType === "bubble" ? -(0.4 + Math.random() * 0.4) : (0.4 + Math.random() * 0.4),
        size: 3 + Math.random() * 4,
        color,
        alpha: 0.2 + Math.random() * 0.4,
        decay: 0.0,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.02
      };
    });

    const loop = (time: number) => {
      try {
        g.frameCount++;
        if (!time) {
          time = performance.now();
        }
        let delta = time - g.lastTime;
        if (delta < 0 || isNaN(delta) || delta > 1000) {
          delta = 16.666;
        }
        const dt = Math.min(100, delta) / 16.666;
        g.lastTime = time;

        // 1. Physics update
        // Invulnerable timer decay
        if (g.player.invulnerable > 0) {
          g.player.invulnerable -= delta;
        }
        if (g.player.prepareTimer > 0) {
          g.player.prepareTimer -= dt;
        }
        if (g.player.bounceAnim > 0) {
          g.player.bounceAnim -= 0.08 * dt;
        }

        // Horizontal easing
        const targetX = g.player.targetX;
        const diffX = targetX - g.player.x;
        
        // Horizontal orientation flip
        if (diffX < -1.8) {
          g.player.facingLeft = true;
        } else if (diffX > 1.8) {
          g.player.facingLeft = false;
        }

        // Apply movement interpolation
        g.player.x += diffX * 0.16 * dt;

        // Apply Gravity
        g.player.vy += 0.38 * dt; // gravity
        g.player.y += g.player.vy * dt;

        // Warp screen edges
        if (g.player.x + g.player.width < 0) {
          g.player.x = canvas.width;
          g.player.targetX = canvas.width - g.player.width / 2;
        } else if (g.player.x > canvas.width) {
          g.player.x = -g.player.width;
          g.player.targetX = -g.player.width / 2;
        }

        // Update moving platforms
        g.platforms.forEach((plat) => {
          if (plat.type === "moving" && plat.vx && plat.rangeX) {
            plat.x += plat.vx * dt;
            if (plat.x < plat.rangeX[0]) {
              plat.x = plat.rangeX[0];
              plat.vx = -plat.vx;
            } else if (plat.x > plat.rangeX[1]) {
              plat.x = plat.rangeX[1];
              plat.vx = -plat.vx;
            }
          }
        });

        // 2. Platform collision (Only if falling)
        if (g.player.vy > 0) {
          let hit = false;
          
          // Test regular platforms
          for (let i = 0; i < g.platforms.length; i++) {
            const plat = g.platforms[i];
            
            // Allow a small horizontal tolerance
            const feetL = g.player.x + 12;
            const feetR = g.player.x + g.player.width - 12;
            const feetY = g.player.y + g.player.height;
            
            if (
              feetL < plat.x + plat.w &&
              feetR > plat.x &&
              feetY >= plat.y &&
              feetY <= plat.y + 18
            ) {
              // Bounced on platform!
              g.player.y = plat.y - g.player.height;
              g.player.vy = -12.5; // Upward impulse
              g.player.prepareTimer = 6; // Crouching animation frames
              g.player.bounceAnim = 1.0;
              playSound("bounce");
              hit = true;

              // Spawn tiny dirt/ice shards
              for (let p = 0; p < 6; p++) {
                g.particles.push({
                  x: g.player.x + g.player.width / 2,
                  y: plat.y,
                  vx: (Math.random() - 0.5) * 4,
                  vy: -(Math.random() * 2 + 1),
                  size: 2 + Math.random() * 3,
                  color: canvasTheme.particleColors[0],
                  alpha: 1.0,
                  decay: 0.05
                });
              }
              break;
            }
          }

          // Test Top/Finish platform
          if (!hit) {
            const plat = g.finishPlatform;
            const feetL = g.player.x + 10;
            const feetR = g.player.x + g.player.width - 10;
            const feetY = g.player.y + g.player.height;

            if (
              feetL < plat.x + plat.w &&
              feetR > plat.x &&
              feetY >= plat.y &&
              feetY <= plat.y + 20
            ) {
              // VICTORY! Landed on finishing line
              g.player.y = plat.y - g.player.height;
              g.player.vy = 0;
              setGameState("success");
              playSound("success");
              cancelAnimationFrame(animId);
              clearInterval(timer);
              return;
            }
          }
        }

        // 3. Items collision (Stars and Dangers)
        // Stars
        g.stars.forEach((star) => {
          if (!star.collected) {
            // AABB check
            if (
              g.player.x + 8 < star.x + star.w &&
              g.player.x + g.player.width - 8 > star.x &&
              g.player.y + 8 < star.y + star.h &&
              g.player.y + g.player.height - 8 > star.y
            ) {
              star.collected = true;
              playSound("star");
              setTempStars((prev) => prev + 1);

              // Explosion sparkles
              for (let p = 0; p < 12; p++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = 1.5 + Math.random() * 2.5;
                g.particles.push({
                  x: star.x + star.w / 2,
                  y: star.y + star.h / 2,
                  vx: Math.cos(angle) * spd,
                  vy: Math.sin(angle) * spd,
                  size: 2.5 + Math.random() * 3,
                  color: "#fbbf24",
                  alpha: 1.0,
                  decay: 0.035,
                  rotation: Math.random() * Math.PI,
                  rotSpeed: (Math.random() - 0.5) * 0.08
                });
              }
            }
          }
        });

        // Useful Items
        g.usefulItems.forEach((item) => {
          if (!item.collected) {
            // AABB check
            if (
              g.player.x + 8 < item.x + item.w &&
              g.player.x + g.player.width - 8 > item.x &&
              g.player.y + 8 < item.y + item.h &&
              g.player.y + g.player.height - 8 > item.y
            ) {
              item.collected = true;
              playSound("collect");
              setScore((prev) => prev + 1);
              g.score += 1;

              // Sparkle particles
              const glowColor = getUsefulItemGlowColor();
              const sparkleColor = glowColor.includes("rgba") ? glowColor.replace("0.4", "1.0") : "#10b981";
              for (let p = 0; p < 8; p++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = 1.0 + Math.random() * 2.0;
                g.particles.push({
                  x: item.x + item.w / 2,
                  y: item.y + item.h / 2,
                  vx: Math.cos(angle) * spd,
                  vy: Math.sin(angle) * spd,
                  size: 2.0 + Math.random() * 2.5,
                  color: sparkleColor,
                  alpha: 1.0,
                  decay: 0.04,
                  rotation: Math.random() * Math.PI,
                  rotSpeed: (Math.random() - 0.5) * 0.05
                });
              }
            }
          }
        });

        // Dangers
        g.dangers.forEach((danger) => {
          if (danger.active && g.player.invulnerable <= 0) {
            // Precise circular collision for extra fairness (forgiving bounding sphere)
            const playerCX = g.player.x + g.player.width / 2;
            const playerCY = g.player.y + g.player.height / 2;
            const dangerCX = danger.x + danger.w / 2;
            const dangerCY = danger.y + danger.h / 2;
            const dist = Math.hypot(playerCX - dangerCX, playerCY - dangerCY);

            if (dist < 26) { // Forgiving threshold (player bounding circle + danger bounding circle overlap)
              // Collided with danger!
              danger.active = false;
              g.player.invulnerable = 1500; // 1.5s flashing immunity
              g.player.vy = -6.5; // Upward hop recoil
              playSound("hit");

              // Spawn toxic explosion particles
              for (let p = 0; p < 12; p++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = 2.0 + Math.random() * 2.0;
                g.particles.push({
                  x: danger.x + danger.w / 2,
                  y: danger.y + danger.h / 2,
                  vx: Math.cos(angle) * spd,
                  vy: Math.sin(angle) * spd,
                  size: 3 + Math.random() * 4,
                  color: "#ef4444",
                  alpha: 1.0,
                  decay: 0.04
                });
              }

              // Deduct heart
              setHearts((prev) => {
                const nextHearts = prev - 1;
                if (nextHearts <= 0) {
                  setFailReason("hearts");
                  setGameState("fail");
                  playSound("fail");
                  cancelAnimationFrame(animId);
                  clearInterval(timer);
                }
                return nextHearts;
              });
            }
          }
        });

        // 4. Camera movement
        // Smoothly scroll camera up when player climbs above 50% screen height
        const idealCamY = g.player.y - 360;
        if (idealCamY < g.cameraY) {
          g.cameraY += (idealCamY - g.cameraY) * 0.15 * dt;
        }

        // Prevent camera from falling down below base
        if (g.cameraY > 650 - 450) {
          g.cameraY = 650 - 450;
        }

        // Death by falling below screen view
        if (g.player.y > g.cameraY + canvas.height) {
          playSound("hit");
          
          setHearts((prev) => {
            const nextHearts = prev - 1;
            if (nextHearts <= 0) {
              setFailReason("hearts");
              setGameState("fail");
              playSound("fail");
              cancelAnimationFrame(animId);
              clearInterval(timer);
              return 0;
            } else {
              // Checkpoint respawn: find nearest platform above camera bottom
              let respawnPlat = g.platforms[0];
              let minDist = Infinity;
              
              g.platforms.forEach((plat) => {
                // Plat should be within view (y < cameraY + height) and above player death threshold
                if (plat.y < g.cameraY + canvas.height - 80) {
                  const dist = Math.abs(plat.y - (g.cameraY + 250));
                  if (dist < minDist) {
                    minDist = dist;
                    respawnPlat = plat;
                  }
                }
              });

              // Respawn player
              g.player.x = respawnPlat.x + respawnPlat.w / 2 - g.player.width / 2;
              g.player.targetX = g.player.x;
              g.player.y = respawnPlat.y - g.player.height - 10;
              g.player.vy = -10; // Upward hop on respawn
              g.player.invulnerable = 1500; // Flashing immunity

              // Reset camera position smoothly
              g.cameraY = g.player.y - 360;
            }
            return nextHearts;
          });
        }

        // 5. Draw elements
        // Clear background
        const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGrad.addColorStop(0, canvasTheme.skyGradient[0]);
        skyGrad.addColorStop(1, canvasTheme.skyGradient[1]);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw custom decorations
        canvasTheme.drawExtraDecorations(ctx, canvas, g.cameraY);

        // Ambient particles update & draw
        g.particles.forEach((p) => {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.rotation !== undefined && p.rotSpeed) {
            p.rotation += p.rotSpeed * dt;
          }

          if (p.decay) {
            p.alpha -= p.decay * dt;
          } else {
            // Ambient wrap-around
            if (p.y > canvas.height + 15) p.y = -15;
            if (p.y < -15) p.y = canvas.height + 15;
            if (p.x < -15) p.x = canvas.width + 15;
            if (p.x > canvas.width + 15) p.x = -15;
          }

          if (p.alpha > 0.01) {
            ctx.save();
            ctx.translate(p.x, p.y);
            if (p.rotation !== undefined) ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });

        // Filter dead particles
        g.particles = g.particles.filter((p) => p.alpha > 0.01);

        // Draw normal platforms
        g.platforms.forEach((plat) => {
          // Draw relative to cameraY
          const py = plat.y - g.cameraY;
          if (py + plat.h >= 0 && py <= canvas.height) {
            if (spriteImg.complete && spriteImg.naturalWidth > 0) {
              // Col 0, Row 1 of spritesheet is the platform
              ctx.drawImage(
                spriteImg,
                0, 627, 418, 220, // Source rect
                plat.x, py - 4, plat.w, 55 // Destination (slight overlap correction, height 55)
              );
            } else {
              // Fallback
              ctx.fillStyle = "#84cc16"; // Bright green
              ctx.fillRect(plat.x, py, plat.w, plat.h);
            }
          }
        });

        // Draw Finish pedestal
        const fpy = g.finishPlatform.y - g.cameraY;
        if (fpy + g.finishPlatform.h >= 0 && fpy <= canvas.height) {
          ctx.fillStyle = "#fbbf24"; // Golden finish line
          ctx.strokeStyle = "#d97706";
          ctx.lineWidth = 4;
          
          // Draw a beautiful golden archway / platform
          ctx.beginPath();
          ctx.rect(g.finishPlatform.x, fpy, g.finishPlatform.w, g.finishPlatform.h);
          ctx.fill();
          ctx.stroke();

          // Finish Text
          ctx.fillStyle = "#78350f";
          ctx.font = "bold 16px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🌟 ФИНИШ 🌟", g.finishPlatform.x + g.finishPlatform.w / 2, fpy + g.finishPlatform.h / 2);
        }

        // Draw Stars
        g.stars.forEach((star) => {
          if (!star.collected) {
            const sy = star.y - g.cameraY;
            if (sy + star.h >= 0 && sy <= canvas.height) {
              if (spriteImg.complete && spriteImg.naturalWidth > 0) {
                // Col 1, Row 1 is the Star
                ctx.drawImage(
                  spriteImg,
                  418, 627, 418, 418,
                  star.x, sy, star.w, star.h
                );
              } else {
                // Fallback star
                ctx.fillStyle = "#fbbf24";
                ctx.font = "20px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("⭐", star.x + star.w / 2, sy + star.h / 2 + 6);
              }
            }
          }
        });

        // Draw Useful Items
        g.usefulItems.forEach((item) => {
          if (!item.collected) {
            const iy = item.y - g.cameraY;
            if (iy + item.h >= 0 && iy <= canvas.height) {
              ctx.save();
              const itemCX = item.x + item.w / 2;
              const itemCY = iy + item.h / 2;
              
              const glowRadius = 15 + Math.sin(g.frameCount * 0.1) * 3;
              const glowGrad = ctx.createRadialGradient(
                itemCX, itemCY, 2,
                itemCX, itemCY, glowRadius
              );
              glowGrad.addColorStop(0, getUsefulItemGlowColor());
              glowGrad.addColorStop(1, "rgba(0,0,0,0)");
              
              ctx.fillStyle = glowGrad;
              ctx.beginPath();
              ctx.arc(itemCX, itemCY, glowRadius, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();

              // Draw emoji
              ctx.fillStyle = "#ffffff";
              ctx.font = "22px sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(getUsefulItemEmoji(), itemCX, itemCY + 2);
            }
          }
        });

        // Draw Dangers
        g.dangers.forEach((danger) => {
          if (danger.active) {
            const dy = danger.y - g.cameraY;
            if (dy + danger.h >= 0 && dy <= canvas.height) {
              if (danger.pulseTimer !== undefined) {
                danger.pulseTimer += 0.05 * dt;
              }
              const pulse = Math.sin(danger.pulseTimer || 0) * 3;
              
              // Draw a warning red glow circle behind the bomb
              ctx.save();
              const dangerCX = danger.x + danger.w / 2;
              const dangerCY = dy + danger.h / 2;
              
              // Pulsing halo radius
              const haloRadius = 18 + Math.sin(danger.pulseTimer || 0) * 4;
              const haloGlow = ctx.createRadialGradient(
                dangerCX, dangerCY, 2,
                dangerCX, dangerCY, haloRadius
              );
              haloGlow.addColorStop(0, "rgba(239, 68, 68, 0.45)");
              haloGlow.addColorStop(0.5, "rgba(239, 68, 68, 0.15)");
              haloGlow.addColorStop(1, "rgba(239, 68, 68, 0)");
              
              ctx.fillStyle = haloGlow;
              ctx.beginPath();
              ctx.arc(dangerCX, dangerCY, haloRadius, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
              
              if (spriteImg.complete && spriteImg.naturalWidth > 0) {
                // Col 2, Row 1 is the Danger Item
                ctx.drawImage(
                  spriteImg,
                  836, 627, 418, 418,
                  danger.x - pulse/2, dy - pulse/2, danger.w + pulse, danger.h + pulse
                );
              } else {
                // Fallback danger bomb
                ctx.fillStyle = "#ef4444";
                ctx.font = "22px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("💣", danger.x + danger.w / 2, dy + danger.h / 2 + 7);
              }
            }
          }
        });

        // Draw Player character
        const px = g.player.x;
        const py = g.player.y - g.cameraY;

        // Flash when invulnerable
        let visible = true;
        if (g.player.invulnerable > 0 && Math.floor(g.player.invulnerable / 100) % 2 === 0) {
          visible = false;
        }

        if (visible) {
          // Determine sprite column based on physics
          let col = 0; // Col 0 is Idle
          if (g.player.prepareTimer > 0) {
            col = 1; // Col 1 is Crouch/prepare
          } else if (g.player.vy < -1.5) {
            col = 2; // Col 2 is Jump
          }

          ctx.save();
          
          // Move origin to the bottom center of the player
          const cx = px + g.player.width / 2;
          const cy = py + g.player.height;
          ctx.translate(cx, cy);
          
          // Apply bounce scale squash/stretch
          let scaleX = 1;
          let scaleY = 1;
          if (g.player.bounceAnim > 0) {
            scaleY = 1 + g.player.bounceAnim * 0.18;
            scaleX = 1 - g.player.bounceAnim * 0.14;
          }
          ctx.scale(scaleX, scaleY);
          
          // Apply horizontal flipping
          if (g.player.facingLeft) {
            ctx.scale(-1, 1);
          }

          // Glow depending on invulnerable or normal
          if (g.player.invulnerable > 0) {
            ctx.shadowColor = "rgba(239, 68, 68, 0.85)";
            ctx.shadowBlur = 12;
          } else {
            ctx.shadowColor = "rgba(255, 255, 255, 0.35)";
            ctx.shadowBlur = 10;
          }

          if (spriteImg.complete && spriteImg.naturalWidth > 0) {
            // Draw centered around origin (bottom-center is at local 0,0)
            ctx.drawImage(
              spriteImg,
              col * 418, 0, 418, 627, // Source
              -g.player.width / 2, -g.player.height, g.player.width, g.player.height // Destination
            );
          } else {
            // Fallback rendering centered around origin
            ctx.fillStyle = g.player.invulnerable > 0 ? "#f87171" : "#3b82f6";
            ctx.fillRect(-g.player.width / 2, -g.player.height, g.player.width, g.player.height);
            ctx.fillStyle = "#ffffff";
            ctx.font = "30px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(characterId === "streak-reward-9" ? "🐺" : "🦊", 0, -g.player.height / 2 + 10);
          }

          ctx.restore();
        }

        // Draw a tiny pointer indicator to guide the child
        if (g.dragActive) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(g.player.x + g.player.width / 2, g.player.y + g.player.height - g.cameraY);
          ctx.lineTo(g.player.targetX + g.player.width / 2, g.player.y + g.player.height - g.cameraY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

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
    generateLevel();
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
          gameId: "jump",
          completed: true
        })
      });
    } catch (e) {
      console.error("Failed to save jump game completion:", e);
    }
    onClose(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 font-sans select-none overflow-hidden touch-none">
      
      {/* Main Game Shell (portrait card style) */}
      <div className="relative w-full h-full max-w-[450px] max-h-[750px] bg-slate-900 overflow-hidden flex flex-col md:rounded-3xl md:shadow-2xl border border-slate-800">
        
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

            {/* Useful Items Collected */}
            <div className="bg-black/40 border border-white/10 text-emerald-400 font-extrabold text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
              <span>{getUsefulItemEmoji()}</span> {score}
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
          onMouseMove={handlePointerMove}
          onTouchMove={handlePointerMove}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchEnd={handlePointerUp}
          onTouchCancel={handlePointerUp}
          onClick={handleCanvasClick}
          className="w-full h-full bg-slate-900 cursor-pointer object-cover block"
        />

        {/* Start Game View Overlay */}
        {gameState === "start" && (
          <div className={`absolute inset-0 z-30 bg-gradient-to-br ${theme.bg} flex flex-col items-center justify-center text-white text-center p-6`}>
            <div className="text-7xl mb-5 animate-bounce">
              {characterId === "streak-reward-3" ? "🍃🦝" : 
               characterId === "streak-reward-9" ? "❄️🐺" : 
               characterId === "streak-reward-12" ? "🔥🐯" : 
               characterId === "streak-reward-18" ? "✨🐆" : "🍃🦝"}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wide drop-shadow-md">
              Прыжки: {characterName}
            </h1>
            <p className="text-xs md:text-sm text-white/95 max-w-xs leading-relaxed mt-3 drop-shadow-sm">
              Герой прыгает <span className="font-extrabold text-yellow-300">вверх автоматически</span>!<br/>
              Води пальцем или мышкой влево-вправо, чтобы направлять его на платформы.<br/>
              Собирай полезные предметы {getUsefulItemEmoji()}, звёзды ⭐ и избегай опасных бомбочек 💣!
            </p>
            {!imageLoaded ? (
              <div className="mt-6 flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full border-4 border-white/20 border-t-yellow-400 animate-spin" />
                <span className="text-[11px] text-white/80 font-bold uppercase tracking-wider">Загрузка героя...</span>
              </div>
            ) : (
              <button 
                onClick={() => {
                  generateLevel();
                  setGameState("playing");
                }}
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
            <p className="text-sm font-bold text-slate-200 mt-3">Поздравляю! Ты поднялся на самый верх!</p>
              <p className="text-xs text-emerald-400 mt-1">Собрано полезных предметов: {score} {getUsefulItemEmoji()}</p>
            <p className="text-xs text-amber-400 mt-0.5">Собрано временных звёзд: {tempStars} ⭐</p>
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
                  Не хватило времени, чтобы добраться до вершины. Давай попробуем ещё разок!
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
