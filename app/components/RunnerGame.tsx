"use client";

import { useEffect, useRef, useState } from "react";
import { X, Play, Volume2, VolumeX, Sparkles, Heart } from "lucide-react";

interface RunnerGameProps {
  childId: string;
  rewardId: string;
  characterId: string; // 'streak-reward-1', 'streak-reward-5', 'streak-reward-7', 'streak-reward-15'
  characterName: string; // "Бамбу", "Фрост", etc.
  onClose: (completed?: boolean) => void;
  testMode?: boolean;
}

interface Obstacle {
  x: number;
  width: number;
  height: number;
  type: number;
}

interface Star {
  x: number;
  y: number;
  collected: boolean;
}

export default function RunnerGame({ childId, rewardId, characterId, characterName, onClose, testMode = false }: RunnerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"start" | "playing" | "paused" | "success" | "fail">("start");
  const [hearts, setHearts] = useState(3);
  const [tempStars, setTempStars] = useState(0);
  const [showRotationHint, setShowRotationHint] = useState(true);
  const [shouldRotate, setShouldRotate] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const spriteImgRef = useRef<HTMLImageElement | null>(null);

  // Detect orientation to apply CSS rotation in portrait
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        setShouldRotate(window.innerHeight > window.innerWidth);
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

  // Gameplay configuration
  const GAME_DURATION = 35; // 35 seconds
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);

  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play Sound Synth
  const playSound = (type: "jump" | "star" | "hit" | "success" | "fail") => {
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

      if (type === "jump") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      } else if (type === "star") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1320, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      } else if (type === "hit") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      } else if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      } else if (type === "fail") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.4);
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

  // Sprite mapping based on reward card ID
  const getAssetPath = () => {
    switch (characterId) {
      case "streak-reward-1": return "/images/bonus-games/runner/01_panda_bambu.png";
      case "streak-reward-5": return "/images/bonus-games/runner/05_husky_frost.png";
      case "streak-reward-7": return "/images/bonus-games/runner/07_fox_foxy.png";
      case "streak-reward-15": return "/images/bonus-games/runner/15_chameleon_spectrum.png";
      default: return "/images/bonus-games/runner/01_panda_bambu.png";
    }
  };

  // Obstacle themes configuration
  const getObstacleNames = () => {
    switch (characterId) {
      case "streak-reward-1": return ["Бамбук", "Серый камень"];
      case "streak-reward-5": return ["Кристалл льда", "Снежок"];
      case "streak-reward-7": return ["Пенёк", "Мухомор"];
      case "streak-reward-15": return ["Красный кристалл", "Ловушка"];
      default: return ["Препятствие 1", "Препятствие 2"];
    }
  };

  // Color theme mapping
  const getThemeColors = () => {
    switch (characterId) {
      case "streak-reward-1": return { bg: "from-emerald-400 via-teal-500 to-indigo-600", accent: "text-emerald-300" };
      case "streak-reward-5": return { bg: "from-blue-400 via-sky-500 to-indigo-700", accent: "text-sky-300" };
      case "streak-reward-7": return { bg: "from-orange-400 via-amber-500 to-red-600", accent: "text-amber-300" };
      case "streak-reward-15": return { bg: "from-purple-400 via-pink-500 to-indigo-600", accent: "text-pink-300" };
      default: return { bg: "from-blue-500 to-indigo-600", accent: "text-sky-300" };
    }
  };

  const theme = getThemeColors();

  // Screen Orientation Detection - Transient hint screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRotationHint(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Get theme values based on season / characterId
  const getSeasonalTheme = () => {
    switch (characterId) {
      case "streak-reward-1": // Winter (Panda)
        return {
          skyGradient: ["#94a3b8", "#cbd5e1"], // frosty snow sky
          subGroundColor: "#94a3b8", // ice/snow grey-blue
          groundTrimColor: "#f8fafc", // bright white snow crust
          particleType: "snow",
          particleColors: ["#ffffff", "#e2e8f0"],
          drawExtraDecorations: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, groundY: number) => {
            // Draw ice mounds and patterns below groundY
            ctx.fillStyle = "#f8fafc";
            ctx.beginPath();
            ctx.arc(120, groundY + 22, 18, 0, Math.PI, true);
            ctx.arc(380, groundY + 28, 24, 0, Math.PI, true);
            ctx.arc(620, groundY + 20, 16, 0, Math.PI, true);
            ctx.fill();

            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.lineWidth = 1.5;
            for (let x = 60; x < canvas.width; x += 160) {
              ctx.beginPath();
              ctx.moveTo(x, groundY + 20);
              ctx.lineTo(x + 10, groundY + 35);
              ctx.lineTo(x + 5, groundY + 45);
              ctx.stroke();
            }
          }
        };
      case "streak-reward-5": // Spring (Husky)
        return {
          skyGradient: ["#bae6fd", "#f0fdf4"], // soft light green/blue spring
          subGroundColor: "#78350f", // warm rich brown soil
          groundTrimColor: "#4ade80", // vibrant light green grass crust
          particleType: "petal",
          particleColors: ["#fbcfe8", "#f472b6", "#f43f5e"], // cherry blossom petals
          drawExtraDecorations: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, groundY: number) => {
            // Tiny sprouts 🌱 and grass blades
            ctx.strokeStyle = "#22c55e";
            ctx.lineWidth = 2.5;
            for (let x = 40; x < canvas.width; x += 90) {
              ctx.beginPath();
              ctx.moveTo(x, groundY + 15);
              ctx.lineTo(x - 5, groundY + 5);
              ctx.moveTo(x, groundY + 15);
              ctx.lineTo(x + 5, groundY + 3);
              ctx.stroke();
            }
            // Tiny white flowers in dirt
            ctx.fillStyle = "#ffffff";
            for (let x = 80; x < canvas.width; x += 140) {
              ctx.beginPath();
              ctx.arc(x, groundY + 25, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        };
      case "streak-reward-7": // Summer (Fox)
        return {
          skyGradient: ["#38bdf8", "#bae6fd"], // bright clear summer sky
          subGroundColor: "#854d0e", // golden summer dirt path
          groundTrimColor: "#22c55e", // thick lush green grass
          particleType: "spark",
          particleColors: ["#fef08a", "#fde047", "#ffffff"],
          drawExtraDecorations: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, groundY: number) => {
            // Summer flowers and blades of grass
            ctx.fillStyle = "#ef4444"; // red poppy
            for (let x = 70; x < canvas.width; x += 150) {
              ctx.beginPath();
              ctx.arc(x, groundY + 18, 3, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = "#ffffff"; // daisies
            for (let x = 130; x < canvas.width; x += 110) {
              ctx.beginPath();
              ctx.arc(x, groundY + 22, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        };
      case "streak-reward-15": // Autumn (Chameleon)
        return {
          skyGradient: ["#fed7aa", "#ffedd5"], // golden orange autumn sunset
          subGroundColor: "#7c2d12", // clay autumn earth
          groundTrimColor: "#ea580c", // fallen orange/gold leaf canopy
          particleType: "leaf",
          particleColors: ["#ea580c", "#d97706", "#f59e0b", "#ca8a04"],
          drawExtraDecorations: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, groundY: number) => {
            // Little blue rain puddles on the trail
            ctx.fillStyle = "rgba(56, 189, 248, 0.45)";
            for (let x = 140; x < canvas.width; x += 220) {
              ctx.beginPath();
              ctx.ellipse(x, groundY + 20, 22, 5, 0, 0, Math.PI * 2);
              ctx.fill();
            }
            // Fallen leaves on the ground
            ctx.fillStyle = "#f59e0b";
            for (let x = 50; x < canvas.width; x += 80) {
              ctx.beginPath();
              ctx.ellipse(x, groundY + 12, 6, 3, 0.4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        };
      default: // Fallback
        return {
          skyGradient: ["#f0f9ff", "#e0f2fe"],
          subGroundColor: "#e2e8f0",
          groundTrimColor: "#22c55e",
          particleType: "none",
          particleColors: ["#ffffff"],
          drawExtraDecorations: () => {}
        };
    }
  };

  // Main game loop engine ref
  const gameRef = useRef<{
    player: {
      y: number;
      vy: number;
      width: number;
      height: number;
      jumping: boolean;
      doubleJumping: boolean;
      frame: number;
      frameTimer: number;
      invulnerable: number;
    };
    obstacles: Obstacle[];
    stars: Star[];
    particles: {
      x: number;
      y: number;
      vy: number;
      vx: number;
      size: number;
      color: string;
      rot: number;
      rotSpeed: number;
    }[];
    bgOffset: number;
    distance: number;
    spawnTimer: number;
    starSpawnTimer: number;
    lastTime: number;
  }>({
    player: {
      y: 0,
      vy: 0,
      width: 96,  // Scaled to exactly 2.0x (96x96 pixels)
      height: 96, // Scaled to exactly 2.0x (96x96 pixels)
      jumping: false,
      doubleJumping: false,
      frame: 0,
      frameTimer: 0,
      invulnerable: 0
    },
    obstacles: [],
    stars: [],
    particles: [],
    bgOffset: 0,
    distance: 0,
    spawnTimer: 100, // Safe delay before first obstacle
    starSpawnTimer: 40,
    lastTime: 0
  });

  // Handle jump triggering
  const triggerJump = () => {
    if (gameState !== "playing") return;
    const g = gameRef.current;
    if (!g.player.jumping) {
      g.player.vy = -13; // Adjusted slightly for larger scale
      g.player.jumping = true;
      playSound("jump");
    } else if (!g.player.doubleJumping) {
      g.player.vy = -10.5;
      g.player.doubleJumping = true;
      playSound("jump");
    }
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        triggerJump();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  // Precise sprite sheet coordinates map for beautiful high-res crops
  // Structure: [frame0_box, frame1_box, frame2_box] -> { x1, y1, width, height }
  const getSpriteCoordinates = () => {
    switch (characterId) {
      case "streak-reward-1": // Panda
        return {
          frames: [
            { x: 48, y: 106, w: 378, h: 511 },
            { x: 484, y: 134, w: 336, h: 478 },
            { x: 855, y: 142, w: 309, h: 470 }
          ],
          obstacles: [
            { x: 354, y: 643, w: 209, h: 506 }, // Bamboo cluster (thick, complete)
            { x: 732, y: 1007, w: 153, h: 142 } // Pebble/Stone
          ]
        };
      case "streak-reward-5": // Husky
        return {
          frames: [
            { x: 20, y: 203, w: 420, h: 389 },
            { x: 459, y: 209, w: 395, h: 417 },
            { x: 872, y: 221, w: 352, h: 405 }
          ],
          obstacles: [
            { x: 307, y: 675, w: 191, h: 390 }, // Ice crystal
            { x: 649, y: 627, w: 333, h: 425 }  // Snowball / Ice block
          ]
        };
      case "streak-reward-7": // Fox
        return {
          frames: [
            { x: 19, y: 225, w: 433, h: 361 },
            { x: 462, y: 224, w: 380, h: 362 },
            { x: 858, y: 224, w: 368, h: 363 }
          ],
          obstacles: [
            { x: 205, y: 787, w: 435, h: 255 }, // Stump
            { x: 687, y: 743, w: 278, h: 295 }  // Red mushroom
          ]
        };
      case "streak-reward-15": // Chameleon
        return {
          frames: [
            { x: 28, y: 191, w: 408, h: 435 },
            { x: 482, y: 187, w: 400, h: 393 },
            { x: 902, y: 187, w: 305, h: 410 }
          ],
          obstacles: [
            { x: 213, y: 627, w: 333, h: 429 }, // Red crystal
            { x: 644, y: 680, w: 457, h: 365 }  // Closed flytrap
          ]
        };
      default:
        return {
          frames: [
            { x: 48, y: 106, w: 378, h: 511 },
            { x: 484, y: 134, w: 336, h: 478 },
            { x: 855, y: 142, w: 309, h: 470 }
          ],
          obstacles: [
            { x: 354, y: 643, w: 209, h: 506 },
            { x: 732, y: 1007, w: 153, h: 142 }
          ]
        };
    }
  };

  const spriteCoords = getSpriteCoordinates();

  // Game setup & loop
  useEffect(() => {
    if (gameState !== "playing") return;

    // Timer Interval
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameState("success");
          playSound("success");
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
    g.distance = 0;

    // Populate particles based on theme
    const themeConf = getSeasonalTheme();
    g.particles = Array.from({ length: 28 }, () => {
      const color = themeConf.particleColors[Math.floor(Math.random() * themeConf.particleColors.length)];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * (canvas.height - 120),
        vx: -(0.8 + Math.random() * 1.5),
        vy: themeConf.particleType === "snow" ? 0.6 + Math.random() * 0.9 : 0.3 + Math.random() * 0.7,
        size: themeConf.particleType === "snow" ? 2 + Math.random() * 3 : 4 + Math.random() * 5,
        color,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.05
      };
    });

    const loop = (time: number) => {
      const dt = Math.min(100, time - g.lastTime) / 16.666; // Normalize to 60fps delta
      g.lastTime = time;
      g.distance += dt;

      // Update positions
      g.bgOffset = (g.bgOffset + 3 * dt) % canvas.width;

      // Player gravity & bounds
      const gravity = 0.55;
      g.player.vy += gravity * dt;
      g.player.y += g.player.vy * dt;

      const groundY = canvas.height - 75; // ground y level
      if (g.player.y > groundY - g.player.height) {
        g.player.y = groundY - g.player.height;
        g.player.vy = 0;
        g.player.jumping = false;
        g.player.doubleJumping = false;
      }

      // Frame animation updating
      g.player.frameTimer += dt;
      if (g.player.frameTimer > 8) {
        g.player.frame = (g.player.frame + 1) % 3;
        g.player.frameTimer = 0;
      }

      if (g.player.invulnerable > 0) {
        g.player.invulnerable -= dt * 16.666; // Milliseconds
      }

      // Obstacles update & spawn
      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0) {
        // Spawn standard or double obstacles (strictly 0 or 1 index)
        const obstacleType = Math.random() > 0.5 ? 0 : 1;
        
        // Load custom aspect ratio height to preserve image dimensions
        const box = spriteCoords.obstacles[obstacleType];
        const aspectRatio = box.w / box.h;
        
        // Define base sizes: Bamboo ~85px height, Stone ~60px height
        let height = obstacleType === 0 ? 80 + Math.random() * 12 : 55 + Math.random() * 8;
        
        // Fox stump (obstacleType === 0) is too large due to broad aspect ratio, scale it down:
        if (characterId === "streak-reward-7" && obstacleType === 0) {
          height = height * 0.45;
        }

        const width = height * aspectRatio;

        g.obstacles.push({
          x: canvas.width,
          width,
          height,
          type: obstacleType
        });
        g.spawnTimer = 110 + Math.random() * 90; // Safe distance spacer
      }

      // Stars spawning
      g.starSpawnTimer -= dt;
      if (g.starSpawnTimer <= 0) {
        g.stars.push({
          x: canvas.width,
          y: groundY - 100 - Math.random() * 80,
          collected: false
        });
        g.starSpawnTimer = 110 + Math.random() * 100;
      }

      // Render seasonal gradient sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height - 75);
      skyGrad.addColorStop(0, themeConf.skyGradient[0]);
      skyGrad.addColorStop(1, themeConf.skyGradient[1]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw sun for Summer (Fox) or general warmth (Winter sun)
      if (characterId === "streak-reward-7" || characterId === "streak-reward-1") {
        // Calculate sun position from right to left based on game time elapsed
        const timeElapsed = GAME_DURATION - timeLeft;
        const progress = timeElapsed / GAME_DURATION;
        const sunX = canvas.width + 50 - (progress * (canvas.width + 150));
        const sunY = 50 + Math.sin(progress * Math.PI) * 20; // gentle arc path

        // Draw sun glow
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 28);
        sunGlow.addColorStop(0, "rgba(254, 240, 138, 1)"); // yellow center
        sunGlow.addColorStop(0.3, "rgba(253, 224, 71, 0.7)");
        sunGlow.addColorStop(1, "rgba(253, 224, 71, 0)");
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
        ctx.fill();

        // Draw solid sun core
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(sunX, sunY, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // Light soft clouds in the background (parallax scrolling effect)
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 220) - g.bgOffset * 0.4 + canvas.width) % (canvas.width + 120) - 60;
        const cy = 40 + (i % 2) * 25;
        // Simple vector cloud shapes
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.arc(cx + 15, cy - 8, 22, 0, Math.PI * 2);
        ctx.arc(cx + 30, cy, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      // Update & Draw particles (snow, petals, autumn leaves)
      if (themeConf.particleType !== "none") {
        g.particles.forEach((p) => {
          // Update physics
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.rotSpeed * dt;

          // Wrap around screen boundaries
          if (p.x < -10) {
            p.x = canvas.width + 10;
            p.y = Math.random() * (canvas.height - 100);
          }
          if (p.y > canvas.height - 75) {
            p.y = -10;
            p.x = Math.random() * canvas.width;
          }

          // Draw particle
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;

          if (themeConf.particleType === "snow") {
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
          } else if (themeConf.particleType === "petal") {
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size * 1.3, p.size * 0.7, 0.4, 0, Math.PI * 2);
            ctx.fill();
          } else if (themeConf.particleType === "leaf") {
            ctx.beginPath();
            ctx.moveTo(-p.size, 0);
            ctx.lineTo(0, -p.size * 0.6);
            ctx.lineTo(p.size, 0);
            ctx.lineTo(0, p.size * 0.6);
            ctx.closePath();
            ctx.fill();
          } else if (themeConf.particleType === "spark") {
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        });
      }

      // Ground render (Themed seasons)
      ctx.fillStyle = themeConf.subGroundColor; // sub-ground color fill
      ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
      
      // Draw top lane grass/snow trim
      ctx.fillStyle = themeConf.groundTrimColor; 
      ctx.fillRect(0, groundY, canvas.width, 8); // Trim

      // Render extra seasonal ground decorations (grass blades, flowers, puddles, snow drifts)
      themeConf.drawExtraDecorations(ctx, canvas, groundY);

      // Move & draw stars
      g.stars.forEach((star) => {
        star.x -= 4.2 * dt;
        if (!star.collected) {
          // Draw star symbol
          ctx.font = "24px sans-serif";
          ctx.fillText("⭐", star.x, star.y);

          // AABB bounding box collision check
          const px = 60;
          const py = g.player.y;
          const pw = g.player.width;
          const ph = g.player.height;
          if (
            star.x > px && star.x < px + pw &&
            star.y > py && star.y < py + ph
          ) {
            star.collected = true;
            setTempStars((prev) => prev + 1);
            playSound("star");
          }
        }
      });

      // Move & draw obstacles
      const obsNames = getObstacleNames();
      g.obstacles.forEach((obs) => {
        obs.x -= 4.2 * dt;

        let yOffset = 0;
        // If it is Fox's stump, lower it down by 8px so the roots are inside the ground
        if (characterId === "streak-reward-7" && obs.type === 0) {
          yOffset = 8;
        }

        // Render obstacle from the bottom row of the sprite sheet using precise coords
        if (spriteImg.complete && spriteImg.naturalWidth > 0) {
          const box = spriteCoords.obstacles[obs.type];
          ctx.drawImage(
            spriteImg,
            box.x, box.y, box.w, box.h, // Precise source rect bounding box crop
            obs.x, groundY - obs.height + yOffset, obs.width, obs.height // Scaled destination rect
          );
        } else {
          // Fallback shape if image not loaded
          ctx.fillStyle = obs.type === 0 ? "#ef4444" : "#f59e0b";
          ctx.beginPath();
          if (obs.type === 0) {
            ctx.moveTo(obs.x, groundY);
            ctx.lineTo(obs.x + obs.width / 2, groundY - obs.height);
            ctx.lineTo(obs.x + obs.width, groundY);
          } else {
            ctx.rect(obs.x, groundY - obs.height, obs.width, obs.height);
          }
          ctx.fill();
        }

        // Player Collision check (with safe margins for better gameplay)
        const px = 60;
        const py = g.player.y;
        const pw = g.player.width;
        const ph = g.player.height;

        if (g.player.invulnerable <= 0) {
          const obsVisualY = groundY - obs.height + yOffset;
          // AABB Collision overlap calculation (inner hitboxes to keep it fair/fun)
          if (
            obs.x < px + pw - 20 &&
            obs.x + obs.width > px + 20 &&
            obsVisualY < py + ph - 12 &&
            groundY > py + 12
          ) {
            // Hit!
            playSound("hit");
            setHearts((prev) => {
              const nextVal = prev - 1;
              if (nextVal <= 0) {
                setGameState("fail");
                playSound("fail");
              }
              return nextVal;
            });
            g.player.invulnerable = 1200; // 1.2s invulnerability
          }
        }
      });

      // Cleanup offscreen objects
      g.obstacles = g.obstacles.filter(o => o.x > -100);
      g.stars = g.stars.filter(s => s.x > -100);

      // Render Player
      const px = 60;
      const py = g.player.y;
      
      const drawPlayer = () => {
        // Double flashing logic if invulnerable
        if (g.player.invulnerable > 0 && Math.floor(g.player.invulnerable / 100) % 2 === 0) {
          return;
        }

        // Try slicing sprite sheets using precise bounding coordinates map
        if (spriteImg.complete && spriteImg.naturalWidth > 0) {
          const box = spriteCoords.frames[g.player.frame];
          ctx.drawImage(
            spriteImg,
            box.x, box.y, box.w, box.h, // Source rect: precise crop
            px, py, g.player.width, g.player.height // Dest rect: 2.0x scaled size
          );
        } else {
          // Fallback colored rectangle with initials/emoji
          ctx.fillStyle = "#10b981";
          ctx.fillRect(px, py, g.player.width, g.player.height);
          ctx.fillStyle = "#ffffff";
          ctx.font = "28px sans-serif";
          ctx.fillText("🦖", px + 20, py + 55);
        }
      };

      drawPlayer();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(timer);
    };
  }, [gameState]);

  // Restart trigger
  const handleRestart = () => {
    setHearts(3);
    setTempStars(0);
    setTimeLeft(GAME_DURATION);
    const g = gameRef.current;
    g.player.y = 0;
    g.player.vy = 0;
    g.player.jumping = false;
    g.player.doubleJumping = false;
    g.player.invulnerable = 0;
    g.obstacles = [];
    g.stars = [];
    g.spawnTimer = 100;
    g.starSpawnTimer = 40;
    setGameState("playing");
  };

  const saveCompletion = async () => {
    if (testMode) {
      onClose(true);
      return;
    }
    try {
      await fetch('/api/bonus-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          rewardId,
          gameId: "runner",
          completed: true
        })
      });
    } catch (e) {
      console.error("Failed to save bonus game stats:", e);
    }
    onClose(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 font-sans select-none overflow-hidden touch-none">
      
      {/* Main Game Shell Window (rotated 90deg clockwise when screen is portrait) */}
      <div 
        style={shouldRotate ? {
          width: "100vh",
          height: "100vw",
          maxWidth: "none",
          maxHeight: "none",
          transform: "rotate(90deg)",
          transformOrigin: "center",
          flexShrink: 0
        } : {}}
        className="relative w-full h-full max-w-[840px] max-h-[480px] bg-slate-900 overflow-hidden flex flex-col md:rounded-3xl md:shadow-2xl border border-slate-800"
      >
        
        {/* 1. Landscape Orientation Check Overlay (inside rotated shell) */}
        {showRotationHint && (
          <div className="absolute inset-0 bg-slate-900 z-[110] flex flex-col items-center justify-center text-white px-6 text-center">
            <div className="text-6xl animate-bounce mb-6">📱🔄</div>
            <h2 className="text-xl font-black mb-2">Поверни телефон</h2>
            <p className="text-slate-400 text-xs max-w-xs leading-normal mb-4">
              Для запуска бонусного забега переверни устройство в альбомный режим.
            </p>
            <button 
              onClick={() => setShowRotationHint(false)}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs px-5 py-2 rounded-full shadow-md transition-transform transform active:scale-95 cursor-pointer"
            >
              Понятно
            </button>
          </div>
        )}
        
        {/* Header HUD panel */}
        <div className="absolute top-0 inset-x-0 h-12 bg-gradient-to-b from-black/50 to-transparent flex items-center justify-between px-4 z-20 pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <button 
              onClick={() => onClose(false)} 
              className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Выйти"
            >
              <X size={18} />
            </button>
            {gameState === "playing" && (
              <button 
                onClick={() => setGameState("paused")} 
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="text-xs">⏸️</span>
              </button>
            )}
          </div>

          {/* Hud labels */}
          <div className="flex items-center gap-5">
            {/* Lives */}
            <div className="flex items-center gap-1 bg-black/30 px-2.5 py-1 rounded-full">
              {[...Array(3)].map((_, i) => (
                <Heart 
                  key={i} 
                  size={14} 
                  className={i < hearts ? "text-red-500 fill-red-500" : "text-slate-500 fill-transparent"} 
                />
              ))}
            </div>

            {/* Stars Collected */}
            <div className="bg-black/30 text-amber-400 font-extrabold text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
              <span>⭐</span> {tempStars}/5
            </div>

            {/* Timer ProgressBar */}
            <div className="bg-black/30 text-sky-400 font-extrabold text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 min-w-[70px] justify-center">
              <span>⏱️</span> {timeLeft}s
            </div>
          </div>

          {/* Sound Toggle */}
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className="pointer-events-auto w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>

        {/* Action click trigger screen canvas */}
        <canvas 
          ref={canvasRef} 
          width={840} 
          height={400} 
          onClick={triggerJump}
          className="w-full h-full bg-slate-900 cursor-pointer object-contain block"
        />

        {/* Start Game View Overlay */}
        {gameState === "start" && (
          <div className={`absolute inset-0 z-30 bg-gradient-to-br ${theme.bg} flex flex-col items-center justify-center text-white text-center p-6`}>
            <div className="text-6xl mb-4 animate-bounce">🏃🦸</div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wide drop-shadow-md">
              Забег героя: {characterName}
            </h1>
            <p className="text-xs md:text-sm text-white/95 max-w-sm leading-relaxed mt-2 drop-shadow-sm">
              Нажимай на экран, чтобы прыгать.<br/>
              Нажми ещё раз в воздухе — сделаешь <span className="font-extrabold text-yellow-300">двойной прыжок</span>!
            </p>
            {!imageLoaded ? (
              <div className="mt-6 flex flex-col items-center gap-2">
                <div className="w-7 h-7 rounded-full border-4 border-white/20 border-t-yellow-400 animate-spin" />
                <span className="text-[11px] text-white/80 font-bold uppercase tracking-wider">Загрузка героя...</span>
              </div>
            ) : (
              <button 
                onClick={() => setGameState("playing")}
                className="mt-6 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-sm md:text-base px-8 py-3 rounded-full shadow-lg transition-transform transform active:scale-95 cursor-pointer"
              >
                Начать забег
              </button>
            )}
          </div>
        )}

        {/* Paused View Overlay */}
        {gameState === "paused" && (
          <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-white text-center p-6">
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
            <div className="text-6xl mb-4">👑🏆</div>
            <h2 className="text-2xl md:text-3xl font-black text-yellow-400">Игра пройдена!</h2>
            <p className="text-sm font-bold text-slate-200 mt-2">Поздравляю, ты успешно добрался до финиша!</p>
            <p className="text-xs text-amber-400 mt-1">Собрано временных звёзд: {tempStars} ⭐</p>
            <button 
              onClick={saveCompletion}
              className="mt-8 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-sm md:text-base px-10 py-3 rounded-full shadow-lg transition-transform transform active:scale-95 cursor-pointer"
            >
              Окей
            </button>
          </div>
        )}

        {/* Failure / Loss View Overlay */}
        {gameState === "fail" && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center text-white text-center p-6">
            <div className="text-6xl mb-4">💔🥺</div>
            <h2 className="text-2xl md:text-3xl font-black text-red-500">Пока не получилось</h2>
            <p className="text-xs md:text-sm text-slate-400 max-w-xs mt-2 leading-relaxed">
              Не расстраивайся! Герои никогда не сдаются перед препятствиями. Попробуй ещё раз!
            </p>
            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => onClose(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs md:text-sm px-6 py-3 rounded-full transition-colors cursor-pointer"
              >
                Выйти
              </button>
              <button 
                onClick={handleRestart}
                className="bg-red-500 hover:bg-red-600 text-white font-black text-xs md:text-sm px-8 py-3 rounded-full shadow-md transition-transform transform active:scale-95 cursor-pointer"
              >
                Начать заново
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
