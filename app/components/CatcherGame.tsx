"use client";

import { useEffect, useRef, useState } from "react";
import { X, Play, Volume2, VolumeX, Sparkles, Heart } from "lucide-react";

interface CatcherGameProps {
  childId: string;
  rewardId: string;
  characterId: string; // 'streak-reward-2', 'streak-reward-14', 'streak-reward-17'
  characterName: string; // "Капи", "Гром", "Титан"
  onClose: (completed?: boolean) => void;
  testMode?: boolean;
}

interface FallingItem {
  x: number;
  y: number;
  vy: number;
  width: number;
  height: number;
  type: "star" | "normal" | "danger";
  collected: boolean;
  lane: number;
}

interface Particle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  color: string;
  rot: number;
  rotSpeed: number;
}

export default function CatcherGame({ childId, rewardId, characterId, characterName, onClose, testMode = false }: CatcherGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"start" | "playing" | "paused" | "success" | "fail">("start");
  const [hearts, setHearts] = useState(3);
  const [caughtCount, setCaughtCount] = useState(0);
  const [tempStars, setTempStars] = useState(0);
  const [showRotationHint, setShowRotationHint] = useState(true);
  const [shouldRotate, setShouldRotate] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);

  const spriteImgRef = useRef<HTMLImageElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const GAME_DURATION = 60; // Max 60 seconds
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);

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
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      } else if (type === "star") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      } else if (type === "hit") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.25);
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
    switch (characterId) {
      case "streak-reward-2": return "/images/bonus-games/catcher/02_capybara_kapi.png";
      case "streak-reward-14": return "/images/bonus-games/catcher/14_buffalo_grom.png";
      case "streak-reward-17": return "/images/bonus-games/catcher/17_rhino_titan.png";
      default: return "/images/bonus-games/catcher/02_capybara_kapi.png";
    }
  };

  // Theme Settings
  const getThemeColors = () => {
    switch (characterId) {
      case "streak-reward-2": return { bg: "from-emerald-400 via-teal-500 to-indigo-600", accent: "text-emerald-300" };
      case "streak-reward-14": return { bg: "from-sky-300 via-blue-400 to-indigo-500", accent: "text-yellow-200" };
      case "streak-reward-17": return { bg: "from-fuchsia-300 via-purple-400 to-indigo-500", accent: "text-pink-200" };
      default: return { bg: "from-teal-400 to-emerald-600", accent: "text-emerald-300" };
    }
  };

  const theme = getThemeColors();

  // Seasonal/Character graphics themes
  const getSeasonalTheme = () => {
    switch (characterId) {
      case "streak-reward-2": // Capybara (Summer riverbank style)
        return {
          skyGradient: ["#bae6fd", "#f0fdf4"], // tropical sunny sky
          subGroundColor: "#78350f", // warm soil brown
          groundTrimColor: "#4ade80", // bright green grass top
          particleType: "leaf",
          particleColors: ["#86efac", "#4ade80", "#22c55e"],
          drawExtraDecorations: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, groundY: number) => {
            // Grass blades at the bottom
            ctx.strokeStyle = "rgba(74, 222, 128, 0.4)";
            ctx.lineWidth = 2;
            for (let x = 20; x < canvas.width; x += 30) {
              const h = 15 + (x % 4) * 6;
              ctx.beginPath();
              ctx.moveTo(x, canvas.height);
              ctx.lineTo(x - 2, canvas.height - h);
              ctx.moveTo(x, canvas.height);
              ctx.lineTo(x + 2, canvas.height - h + 2);
              ctx.stroke();
            }
            // Lotus leaves in water under groundY
            ctx.fillStyle = "#15803d";
            for (let x = 100; x < canvas.width; x += 220) {
              ctx.beginPath();
              ctx.ellipse(x, groundY + 25, 24, 7, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        };
      case "streak-reward-17": // Rhino (Purple crystal caves style)
        return {
          skyGradient: ["#c084fc", "#fae8ff"], // light glowing purple/lavender cave light
          subGroundColor: "#9ca3af", // medium light grey basalt
          groundTrimColor: "#e9d5ff", // purple crystal top
          particleType: "spark",
          particleColors: ["#c084fc", "#a855f7", "#ffffff"],
          drawExtraDecorations: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, groundY: number) => {
            // Glowing crystals at the bottom
            ctx.fillStyle = "#c084fc";
            for (let x = 60; x < canvas.width; x += 140) {
              const h = 18 + (x % 3) * 10;
              ctx.beginPath();
              ctx.moveTo(x - 8, canvas.height);
              ctx.lineTo(x, canvas.height - h);
              ctx.lineTo(x + 8, canvas.height);
              ctx.closePath();
              ctx.fill();
            }
          }
        };
      case "streak-reward-14": // Buffalo (Stormy lightning plains style)
        return {
          skyGradient: ["#94a3b8", "#cbd5e1"], // light stormy slate-grey
          subGroundColor: "#475569", // medium slate grey
          groundTrimColor: "#eab308", // bright yellow lightning trim
          particleType: "spark",
          particleColors: ["#fef08a", "#fde047", "#ffffff"],
          drawExtraDecorations: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, groundY: number) => {
            // Electrical discharges/sparks at the bottom
            ctx.strokeStyle = "rgba(234, 179, 8, 0.4)";
            ctx.lineWidth = 1.5;
            for (let x = 40; x < canvas.width; x += 110) {
              ctx.beginPath();
              ctx.moveTo(x, canvas.height);
              ctx.lineTo(x - 5, canvas.height - 15);
              ctx.lineTo(x + 5, canvas.height - 25);
              ctx.stroke();
            }
          }
        };
      default:
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

  const themeConf = getSeasonalTheme();

  // Screen Orientation Detection - Transient hint screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRotationHint(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

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

  // Main gameplay engine states ref
  const gameRef = useRef<{
    player: {
      x: number;
      targetX: number;
      y: number;
      width: number;
      height: number;
      facingLeft: boolean;
      catchingTimer: number;
      invulnerable: number;
      frame: number;
      frameTimer: number;
    };
    items: FallingItem[];
    particles: Particle[];
    spawnTimer: number;
    lastTime: number;
  }>({
    player: {
      x: 370,
      targetX: 370,
      y: 225, // groundY (325) - height (100)
      width: 73, // Aspect ratio 0.66 scaled to height 110 (73x110)
      height: 110,
      facingLeft: false,
      catchingTimer: 0,
      invulnerable: 0,
      frame: 0,
      frameTimer: 0
    },
    items: [],
    particles: [],
    spawnTimer: 0,
    lastTime: 0
  });

  // Handle movements
  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Support both mouse and touch clientX
    let clientX = 0;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }
    
    // Scale X according to rotated canvas
    let relX = 0;
    if (shouldRotate) {
      // In rotated portrait mode, pointer Y relative to canvas bounding client bounds maps to canvas X
      relX = ((clientX - rect.left) / rect.width) * canvas.width;
    } else {
      relX = ((clientX - rect.left) / rect.width) * canvas.width;
    }

    const g = gameRef.current;
    // Set target X (center of character on pointer X)
    g.player.targetX = relX - g.player.width / 2;
  };

  // Keyboard support for testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      const g = gameRef.current;
      const step = 45;
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        g.player.targetX = Math.max(0, g.player.x - step);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        g.player.targetX = Math.min(840 - g.player.width, g.player.x + step);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  // Main game loop logic
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
    g.items = [];

    // Populate flying particles
    g.particles = Array.from({ length: 15 }, () => {
      const color = themeConf.particleColors[Math.floor(Math.random() * themeConf.particleColors.length)];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * (canvas.height - 120),
        vx: -(0.5 + Math.random() * 1.2),
        vy: themeConf.particleType === "snow" ? 0.6 + Math.random() * 0.8 : 0.3 + Math.random() * 0.6,
        size: 3 + Math.random() * 4,
        color,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04
      };
    });

    const groundY = canvas.height - 75; // ground y level is 325

    const loop = (time: number) => {
      const dt = Math.min(100, time - g.lastTime) / 16.666; // Normalize to 60fps delta
      g.lastTime = time;

      // 1. Draw themed sky background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
      skyGrad.addColorStop(0, themeConf.skyGradient[0]);
      skyGrad.addColorStop(1, themeConf.skyGradient[1]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw Buffalo thunderbolt flash if applicable
      if (characterId === "streak-reward-14") {
        if (Math.random() < 0.012) {
          ctx.fillStyle = "rgba(254, 240, 138, 0.4)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = "#fef08a";
          ctx.lineWidth = 3;
          ctx.beginPath();
          const lx = Math.random() * canvas.width;
          ctx.moveTo(lx, 0);
          ctx.lineTo(lx - 25, 90);
          ctx.lineTo(lx + 15, 170);
          ctx.lineTo(lx - 10, 240);
          ctx.stroke();
        }
      }

      // 3. Draw clouds in sky
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      for (let i = 0; i < 4; i++) {
        const cx = ((i * 260) - (time * 0.012) + canvas.width) % (canvas.width + 120) - 60;
        const cy = 35 + (i % 2) * 20;
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.arc(cx + 14, cy - 7, 20, 0, Math.PI * 2);
        ctx.arc(cx + 28, cy, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Update & Draw falling particles
      if (themeConf.particleType !== "none") {
        g.particles.forEach((p) => {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.rotSpeed * dt;

          if (p.x < -10) {
            p.x = canvas.width + 10;
            p.y = Math.random() * (canvas.height - 100);
          }
          if (p.y > groundY) {
            p.y = -10;
            p.x = Math.random() * canvas.width;
          }

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;

          // Fade out particles when they go below 180px down to groundY (325px)
          let alpha = 0.75;
          if (p.y > 180) {
            alpha = Math.max(0, 0.75 * (1 - (p.y - 180) / (groundY - 180)));
          }
          ctx.globalAlpha = alpha;

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

      // 5. Ground trail rendering
      ctx.fillStyle = themeConf.subGroundColor;
      ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
      ctx.fillStyle = themeConf.groundTrimColor;
      ctx.fillRect(0, groundY, canvas.width, 8); // Grass/snow/crystal top trim

      // Draw custom ground texture/decorations
      themeConf.drawExtraDecorations(ctx, canvas, groundY);

      // 6. Smooth player movement lerp
      const oldX = g.player.x;
      g.player.x += (g.player.targetX - g.player.x) * 0.22 * dt;
      
      // Bound check
      if (g.player.x < 0) g.player.x = 0;
      if (g.player.x > canvas.width - g.player.width) g.player.x = canvas.width - g.player.width;

      // Update facing orientation
      if (Math.abs(g.player.x - oldX) > 0.5) {
        g.player.facingLeft = (g.player.x < oldX);
      }

      // Update walk frame timer
      g.player.frameTimer += dt;
      if (g.player.frameTimer > 8) {
        g.player.frame = (g.player.frame + 1) % 2; // alternates frame 0 and 1
        g.player.frameTimer = 0;
      }

      if (g.player.invulnerable > 0) {
        g.player.invulnerable -= dt * 16.666;
      }

      // 7. Spawning items (Left, Center, Right lanes)
      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0) {
        // Choose one of the three lanes randomly
        const lane = Math.floor(Math.random() * 3); // 0, 1, 2
        // X coordinates mapping for the 3 lanes
        const laneXs = [180, 400, 620];
        const itemX = laneXs[lane];

        // Choose item type with probability: 50% normal, 25% star, 25% danger
        const rand = Math.random();
        let type: "star" | "normal" | "danger" = "normal";
        if (rand < 0.25) {
          type = "star";
        } else if (rand < 0.5) {
          type = "danger";
        }

        g.items.push({
          x: itemX,
          y: -70,
          vy: 3.5 + Math.random() * 1.5,
          width: 40,
          height: 60,
          type,
          collected: false,
          lane
        });

        // Speed up spawn rate slightly as you score more
        const spawnDelay = Math.max(50, 95 - (caughtCount * 2));
        g.spawnTimer = spawnDelay + Math.random() * 45;
      }

      // 8. Update & Draw falling items
      g.items.forEach((item) => {
        item.y += item.vy * dt;

        if (!item.collected) {
          // Draw item
          if (spriteImg.complete && spriteImg.naturalWidth > 0) {
            // Slicing parameters: column width 418, row height 627
            // Star is index 0, normal index 1, danger index 2 of bottom row (y = 627)
            let col = 1;
            if (item.type === "star") col = 0;
            if (item.type === "danger") col = 2;

            ctx.save();
            // Apply glow
            ctx.shadowColor = item.type === "star" ? "rgba(253, 224, 71, 0.95)" : 
                              item.type === "danger" ? "rgba(239, 68, 68, 0.95)" : 
                              (characterId === "streak-reward-2" ? "rgba(74, 222, 128, 0.95)" : 
                               characterId === "streak-reward-14" ? "rgba(56, 189, 248, 0.95)" : "rgba(232, 121, 249, 0.95)");
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            ctx.drawImage(
              spriteImg,
              col * 418, 627, 418, 627, // Source rect
              item.x, item.y, item.width, item.height // Destination rect
            );
            ctx.restore();
          } else {
            // Fallback drawing if image not ready
            ctx.fillStyle = item.type === "star" ? "#eab308" : item.type === "danger" ? "#ef4444" : "#3b82f6";
            ctx.beginPath();
            ctx.arc(item.x + 20, item.y + 30, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "12px sans-serif";
            ctx.fillText(item.type === "star" ? "⭐" : item.type === "danger" ? "💣" : "🍏", item.x + 13, item.y + 34);
          }

          // Collision detection check (tight inner hitbox using center of falling item)
          const itemCenterX = item.x + item.width / 2;
          const itemCenterY = item.y + item.height / 2;
          const px = g.player.x;
          const py = g.player.y;
          const pw = g.player.width;
          const ph = g.player.height;

          if (
            itemCenterX > px + 8 && itemCenterX < px + pw - 8 &&
            itemCenterY > py + 8 && itemCenterY < py + ph
          ) {
            item.collected = true;
            g.player.catchingTimer = 300; // Trigger catching sprite frame

            if (item.type === "danger") {
              if (g.player.invulnerable <= 0) {
                playSound("hit");
                setHearts((prev) => {
                  const nextVal = prev - 1;
                  if (nextVal <= 0) {
                    setGameState("fail");
                    playSound("fail");
                  }
                  return nextVal;
                });
                g.player.invulnerable = 1200; // 1.2s flashing invulnerability
              }
            } else {
              // star or normal item
              if (item.type === "star") {
                playSound("star");
                setTempStars((prev) => prev + 1);
              } else {
                playSound("collect");
              }

              setCaughtCount((prev) => {
                const nextVal = prev + 1;
                // Target: catch 15 items to win
                if (nextVal >= 15) {
                  clearInterval(timer);
                  setGameState("success");
                  playSound("success");
                }
                return nextVal;
              });
            }
          }
        }
      });

      // Cleanup items that fell off screen
      g.items = g.items.filter((i) => i.y < canvas.height + 20);

      // 9. Draw Player Character
      const px = g.player.x;
      const py = g.player.y;

      const drawPlayer = () => {
        // Flashing animation frame skip if invulnerable
        if (g.player.invulnerable > 0 && Math.floor(g.player.invulnerable / 100) % 2 === 0) {
          return;
        }

        // Slicing parameters: column width 418, row height 627
        let frameIndex = g.player.frame; // walks between frame 0 and 1
        if (g.player.catchingTimer > 0) {
          frameIndex = 2; // display catching frame
          g.player.catchingTimer -= dt * 16.666;
        }

        if (spriteImg.complete && spriteImg.naturalWidth > 0) {
          ctx.save();
          // Apply character glow
          ctx.shadowColor = characterId === "streak-reward-2" ? "rgba(110, 231, 183, 0.95)" : 
                            characterId === "streak-reward-14" ? "rgba(253, 224, 71, 0.95)" : "rgba(232, 121, 249, 0.95)";
          ctx.shadowBlur = 18;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          if (g.player.facingLeft) {
            // Mirror image horizontally
            ctx.translate(px + g.player.width, py);
            ctx.scale(-1, 1);
            ctx.drawImage(
              spriteImg,
              frameIndex * 418, 0, 418, 627, // Source
              0, 0, g.player.width, g.player.height // Destination
            );
          } else {
            ctx.drawImage(
              spriteImg,
              frameIndex * 418, 0, 418, 627, // Source
              px, py, g.player.width, g.player.height // Destination
            );
          }
          ctx.restore();
        } else {
          // Fallback shape
          ctx.fillStyle = "#8b5cf6";
          ctx.fillRect(px, py, g.player.width, g.player.height);
          ctx.fillStyle = "#ffffff";
          ctx.font = "24px sans-serif";
          ctx.fillText(frameIndex === 2 ? "🙌" : "🏃", px + 22, py + 65);
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
  }, [gameState, caughtCount]);

  // Restart handler
  const handleRestart = () => {
    setHearts(3);
    setCaughtCount(0);
    setTempStars(0);
    setTimeLeft(GAME_DURATION);
    const g = gameRef.current;
    g.player.x = 370;
    g.player.targetX = 370;
    g.player.invulnerable = 0;
    g.player.catchingTimer = 0;
    g.items = [];
    g.particles = [];
    g.spawnTimer = 0;
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
          gameId: "catcher",
          completed: true
        })
      });
    } catch (e) {
      console.error("Failed to save catcher game completion:", e);
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
              Для запуска бонусной игры переверни устройство в альбомный режим.
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
            {/* Target Catch Count Progress */}
            <div className="bg-black/30 text-emerald-400 font-extrabold text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
              🍎 {caughtCount}/15
            </div>

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
              <span>⭐</span> {tempStars}
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
          onMouseMove={handlePointerMove}
          onTouchMove={handlePointerMove}
          className="w-full h-full bg-slate-900 cursor-pointer object-contain block"
        />

        {/* Start Game View Overlay */}
        {gameState === "start" && (
          <div className={`absolute inset-0 z-30 bg-gradient-to-br ${theme.bg} flex flex-col items-center justify-center text-white text-center p-6`}>
            <div className="text-6xl mb-4 animate-bounce">
              {characterId === "streak-reward-2" ? "🧺🦫" : 
               characterId === "streak-reward-14" ? "🧺🐃" : 
               characterId === "streak-reward-17" ? "🧺🦏" : "🧺🦫"}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wide drop-shadow-md">
              Ловец: {characterName}
            </h1>
            <p className="text-xs md:text-sm text-white/95 max-w-sm leading-relaxed mt-2 drop-shadow-sm">
              Води героя влево и вправо пальцем или мышкой.<br/>
              Лови <span className="font-extrabold text-yellow-300">полезные предметы и звёзды</span>.<br/>
              Опасные предметы лучше пропускать!
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
                Начать
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
            <div className="text-6xl mb-4 animate-[spin_5s_linear_infinite]">👑🏆</div>
            <h2 className="text-2xl md:text-3xl font-black text-yellow-400">Игра пройдена!</h2>
            <p className="text-sm font-bold text-slate-200 mt-2">Поздравляю! Ты поймал все нужные предметы!</p>
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
              Не расстраивайся! Герои не сдаются при неудачах. Давай попробуем ещё разок!
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
