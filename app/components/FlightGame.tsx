import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Play, RotateCcw } from "lucide-react";
import confetti from "canvas-confetti";

interface FlightGameProps {
  childId: string;
  rewardId: string;
  characterId: string;
  characterName: string;
  onClose: (completed: boolean) => void;
  testMode?: boolean;
}

interface StarItem {
  x: number;
  y: number;
  w: number;
  h: number;
  collected: boolean;
  isSpecial?: boolean;
  isInsidePortal?: boolean;
}

interface PortalItem {
  x: number;
  y: number;
  w: number;
  h: number;
  gapHeight: number;
  passed: boolean;
}

interface DangerItem {
  x: number;
  y: number;
  w: number;
  h: number;
  active: boolean;
  angle: number;
  rotationSpeed: number;
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
}

export default function FlightGame({
  childId,
  rewardId,
  characterId,
  characterName,
  onClose,
  testMode = false
}: FlightGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"start" | "playing" | "paused" | "success" | "fail">("start");
  const [hearts, setHearts] = useState(3);
  const [starsCollected, setStarsCollected] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  
  const spriteImgRef = useRef<HTMLImageElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const GAME_DURATION = 90; // 90 seconds (1 minute 30 seconds)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);

  // Check Landscape orientation
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    return () => window.removeEventListener("resize", checkOrientation);
  }, []);

  // Theme settings based on characterId
  const getTheme = () => {
    switch (characterId) {
      case "streak-reward-6": // Ice Dragon
        return {
          bgGradient: ["#e0f2fe", "#bae6fd"], // light blue sky
          particleColors: ["#ffffff", "#e0f2fe", "#bae6fd"],
          particleType: "snow",
          accentColor: "#38bdf8",
          glowColor: "rgba(56, 189, 248, 0.4)",
          usefulEmoji: "❄️"
        };
      case "streak-reward-11": // Fire Dragon
        return {
          bgGradient: ["#ffedd5", "#fed7aa"], // warm sunset/dawn
          particleColors: ["#f97316", "#ef4444", "#facc15"],
          particleType: "fire",
          accentColor: "#ea580c",
          glowColor: "rgba(234, 88, 12, 0.4)",
          usefulEmoji: "🔥"
        };
      case "streak-reward-16": // Forest Dragon
        return {
          bgGradient: ["#f0fdf4", "#dcfce7"], // light green/teal magic forest
          particleColors: ["#84cc16", "#22c55e", "#a7f3d0"],
          particleType: "leaf",
          accentColor: "#16a34a",
          glowColor: "rgba(22, 163, 74, 0.4)",
          usefulEmoji: "🍃"
        };
      case "streak-reward-13": // Eaglet Sky
      default:
        return {
          bgGradient: ["#f0f9ff", "#e0f2fe"], // clear windy sky
          particleColors: ["#ffffff", "#cbd5e1", "#e2e8f0"],
          particleType: "bubble",
          accentColor: "#0284c7",
          glowColor: "rgba(2, 132, 199, 0.4)",
          usefulEmoji: "⭐"
        };
    }
  };

  const theme = getTheme();

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
        // Wing flap sound (gentle woosh)
        osc.type = "sine";
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      } else if (type === "star" || type === "collect") {
        // Chime for collecting stars
        osc.type = "sine";
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      } else if (type === "hit") {
        // Blunt bump sound when hit
        osc.type = "triangle";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.25);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      } else if (type === "success") {
        // Upward arpeggio on win
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      } else if (type === "fail") {
        // Sad slide on fail
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.5);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.error(e);
    }
  };

  // Asset Path Loader
  const getAssetPath = () => {
    let basePath = "";
    switch (characterId) {
      case "streak-reward-6": basePath = "/images/bonus-games/flight/06_ice_dragon_crystal.png"; break;
      case "streak-reward-11": basePath = "/images/bonus-games/flight/11_fire_dragon_iskrik.png"; break;
      case "streak-reward-13": basePath = "/images/bonus-games/flight/13_eaglet_sky.png"; break;
      case "streak-reward-16": basePath = "/images/bonus-games/flight/16_forest_dragon_verdan.png"; break;
      default: basePath = "/images/bonus-games/flight/13_eaglet_sky.png";
    }
    return basePath + "?v=2";
  };

  // Load Image Asset
  useEffect(() => {
    const img = new Image();
    img.src = getAssetPath();
    img.onload = () => {
      spriteImgRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error("Failed to load Flight spritesheet:", img.src);
    };
  }, [characterId]);

  // Main game state references to persist inside RAF loop
  const gameRef = useRef<{
    player: {
      y: number;
      vy: number;
      w: number;
      h: number;
      targetY: number;
      invulnerable: number;
      wingFrame: number;
      wingAnimTimer: number;
    };
    scrollX: number;
    scrollSpeed: number;
    levelLength: number;
    portals: PortalItem[];
    stars: StarItem[];
    dangers: DangerItem[];
    particles: Particle[];
    frameCount: number;
    lastTime: number;
    finishPortal: PortalItem | null;
  }>({
    player: {
      y: 180,
      vy: 0,
      w: 80,
      h: 55,
      targetY: 180,
      invulnerable: 0,
      wingFrame: 0,
      wingAnimTimer: 0
    },
    scrollX: 0,
    scrollSpeed: 2.4, // standard flight scrolling speed
    levelLength: 4800,
    portals: [],
    stars: [],
    dangers: [],
    particles: [],
    frameCount: 0,
    lastTime: 0,
    finishPortal: null
  });

  const generateLevel = () => {
    const g = gameRef.current;
    g.scrollX = 0;
    g.player.y = 180;
    g.player.vy = 0;
    g.player.invulnerable = 0;
    g.player.wingFrame = 0;
    g.player.wingAnimTimer = 0;
    g.portals = [];
    g.stars = [];
    g.dangers = [];
    g.particles = [];
    g.frameCount = 0;
    setHearts(3);
    setStarsCollected(0);
    setTimeLeft(GAME_DURATION);

    // 1. Generate Portals
    const numPortals = 20; // 20 portals for longer level path (approx 1m 10s pass time)
    const startX = 650;
    const spacing = 480; // wider spacing (was 380) for more player response time
    let lastPortalY = 200; // start with middle height

    for (let i = 0; i < numPortals; i++) {
      // Trajectory range [100, 300] (some portals go low to block floor sliding)
      const range = 100;
      let nextY = lastPortalY + (Math.random() - 0.5) * range;
      nextY = Math.max(100, Math.min(300, nextY)); 
      lastPortalY = nextY;

      g.portals.push({
        x: startX + i * spacing,
        y: nextY,
        w: 70, // restored to original width
        h: 220, // restored to original height
        gapHeight: 140, // restored to original wide gap
        passed: false
      });
    }

    // 2. Generate Final Portal
    g.finishPortal = {
      x: startX + numPortals * spacing,
      y: 200,
      w: 120, // restored to original finish portal width
      h: 300, // restored to original finish portal height
      gapHeight: 200,
      passed: false
    };

    // 3. Generate Stars (placed inside portal gaps for reward feedback)
    g.portals.forEach((p, idx) => {
      // Spawn star inside the portal
      g.stars.push({
        x: p.x + p.w / 2 - 15,
        y: p.y - 15,
        w: 30,
        h: 30,
        collected: false,
        isSpecial: false,
        isInsidePortal: true
      });
      
      // Spawn secondary item in the open space between portals
      if (idx < numPortals - 1) {
        const isSpecialItem = idx % 2 === 1; // alternate between stars and special items
        g.stars.push({
          x: p.x + spacing / 2 - 15,
          y: p.y + (Math.random() - 0.5) * 80,
          w: 30,
          h: 30,
          collected: false,
          isSpecial: isSpecialItem,
          isInsidePortal: false
        });
      }
    });

    // 4. Generate Dangers (placed halfway between portals, but only 50% of the time to avoid crowding)
    g.portals.forEach((p, idx) => {
      if (idx < numPortals - 1) {
        // Spawn danger on alternate segments only to make air space cleaner
        const spawnDanger = idx % 2 === 0;
        if (spawnDanger) {
          const nextP = g.portals[idx + 1];
          const dangerX = p.x + spacing / 2 + 50;
          const midY = (p.y + nextP.y) / 2;
          
          // Offset vertically so it is either above or below the trajectory
          const isAbove = Math.random() < 0.5;
          const dangerY = midY + (isAbove ? -100 : 100);
          
          g.dangers.push({
            x: dangerX,
            y: Math.max(50, Math.min(350, dangerY)),
            w: 35,
            h: 35,
            active: true,
            angle: Math.random() * Math.PI * 2,
            rotationSpeed: 0.02 + Math.random() * 0.03
          });
        }
      }
    });
  };

  // Flap Wings lift impulse
  const handleFlap = () => {
    if (gameState !== "playing") return;
    const g = gameRef.current;
    
    // soft physics: cap rising velocity
    g.player.vy = -3.8;
    playSound("bounce");
    
    // add small puff tail particles
    const theme = getTheme();
    for (let i = 0; i < 4; i++) {
      g.particles.push({
        x: 100 + g.player.w * 0.25,
        y: g.player.y + g.player.h * 0.5 + (Math.random() - 0.5) * 15,
        vx: -1.5 - Math.random() * 1.5,
        vy: (Math.random() - 0.5) * 1.0,
        size: 3 + Math.random() * 5,
        color: theme.particleColors[Math.floor(Math.random() * theme.particleColors.length)],
        alpha: 0.8,
        decay: 0.03,
        rotation: Math.random() * Math.PI * 2
      });
    }
  };

  // Touch listener to trigger flap and prevent double clicks / scrolling
  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    handleFlap();
  };

  // Keyboard Space bar support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleFlap();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  // Main Loop
  useEffect(() => {
    if (gameState !== "playing") return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    generateLevel();

    let timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameState("fail");
          playSound("fail");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const spriteImg = spriteImgRef.current || new Image();

    const loop = (timestamp: number) => {
      const g = gameRef.current;
      if (!g.lastTime) g.lastTime = timestamp;
      const dt = Math.min(30, timestamp - g.lastTime) / 16.666; // normalize frame time
      g.lastTime = timestamp;
      g.frameCount++;

      // 1. Clear Screen
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 2. Draw Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGrad.addColorStop(0, theme.bgGradient[0]);
      skyGrad.addColorStop(1, theme.bgGradient[1]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2b. Draw Rich Dynamic Background (Sun/Moon, Parallax Mountains/Hills, Stars)
      ctx.save();
      
      // A. Astronomical Body in the upper-right sky & theme specific objects
      if (characterId === "streak-reward-6") {
        // Ice Dragon: Draw a gorgeous crescent moon & twinkling stars & shooting stars & planet
        // Twinkling stars
        for (let j = 0; j < 15; j++) {
          const starX = (j * 117 + g.scrollX * 0.02) % canvas.width;
          const starY = (j * 43) % 150 + 20;
          const opacity = 0.3 + Math.abs(Math.sin(g.frameCount * 0.05 + j)) * 0.6;
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.beginPath();
          ctx.arc(starX, starY, j % 2 === 0 ? 1.5 : 1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Shooting Star
        const shootCycle = g.frameCount % 180;
        if (shootCycle < 35) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * (1 - shootCycle / 35)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          const startX = (canvas.width - 250) - shootCycle * 5;
          const startY = 40 + shootCycle * 3;
          ctx.moveTo(startX, startY);
          ctx.lineTo(startX - 30, startY + 18);
          ctx.stroke();
        }

        // Ringed Planet in distance
        const planetX = 160;
        const planetY = 90;
        const planetGlow = ctx.createRadialGradient(planetX, planetY, 2, planetX, planetY, 20);
        planetGlow.addColorStop(0, "rgba(167, 139, 250, 0.35)");
        planetGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = planetGlow;
        ctx.beginPath();
        ctx.arc(planetX, planetY, 20, 0, Math.PI * 2);
        ctx.fill();
        // Planet body
        ctx.fillStyle = "#c084fc";
        ctx.beginPath();
        ctx.arc(planetX, planetY, 9, 0, Math.PI * 2);
        ctx.fill();
        // Rings
        ctx.strokeStyle = "rgba(192, 132, 252, 0.5)";
        ctx.lineWidth = 2.5;
        ctx.save();
        ctx.translate(planetX, planetY);
        ctx.rotate(-Math.PI / 6);
        ctx.scale(2.4, 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Crescent Moon
        const moonX = canvas.width - 120;
        const moonY = 70;
        ctx.beginPath();
        const moonGlow = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 40);
        moonGlow.addColorStop(0, "rgba(255, 255, 255, 0.8)");
        moonGlow.addColorStop(0.5, "rgba(186, 230, 253, 0.3)");
        moonGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = moonGlow;
        ctx.arc(moonX, moonY, 40, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#fef08a"; // pale yellow moon
        ctx.beginPath();
        ctx.arc(moonX, moonY, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = theme.bgGradient[0]; // cut-out to make crescent
        ctx.beginPath();
        ctx.arc(moonX - 7, moonY - 3, 17, 0, Math.PI * 2);
        ctx.fill();
      } else if (characterId === "streak-reward-11") {
        // Fire Dragon: sunset, sun with pulsing/rotating rays, rising volcanic embers
        const sunX = canvas.width - 120;
        const sunY = 70;

        // Pulsing rays
        ctx.save();
        ctx.translate(sunX, sunY);
        ctx.rotate(g.frameCount * 0.005);
        ctx.fillStyle = "rgba(249, 115, 22, 0.12)";
        for (let j = 0; j < 8; j++) {
          ctx.rotate(Math.PI / 4);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-12, 100);
          ctx.lineTo(12, 100);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // Sun disc
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 60);
        sunGlow.addColorStop(0, "rgba(253, 224, 71, 0.85)");
        sunGlow.addColorStop(0.5, "rgba(249, 115, 22, 0.35)");
        sunGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
        ctx.fill();

        // Volcanic rising embers
        ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
        for (let j = 0; j < 12; j++) {
          const emberX = (j * 73 - g.scrollX * 0.1 + canvas.width) % canvas.width;
          const emberY = canvas.height - ((g.frameCount * 0.7 + j * 47) % (canvas.height - 80));
          const size = 1.2 + Math.abs(Math.sin(g.frameCount * 0.06 + j)) * 1.5;
          ctx.beginPath();
          ctx.arc(emberX, emberY, size, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (characterId === "streak-reward-16") {
        // Forest Dragon: Teal magical sun, floating fireflies
        const sunX = canvas.width - 120;
        const sunY = 70;

        const sunGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 60);
        sunGlow.addColorStop(0, "rgba(167, 243, 208, 0.7)");
        sunGlow.addColorStop(0.5, "rgba(139, 92, 246, 0.2)");
        sunGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#a7f3d0";
        ctx.beginPath();
        ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
        ctx.fill();

        // Floating fireflies
        for (let j = 0; j < 14; j++) {
          const fX = (j * 67 - g.scrollX * 0.06 + Math.sin(g.frameCount * 0.03 + j) * 20 + canvas.width) % canvas.width;
          const fY = (j * 29 + Math.cos(g.frameCount * 0.02 + j) * 15 + canvas.height) % (canvas.height - 80) + 40;
          const size = 1.5 + Math.abs(Math.sin(g.frameCount * 0.08 + j)) * 1.5;
          
          const glow = ctx.createRadialGradient(fX, fY, 1, fX, fY, size * 2.5);
          glow.addColorStop(0, "rgba(255, 255, 255, 0.9)");
          glow.addColorStop(0.4, "rgba(132, 204, 22, 0.5)");
          glow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(fX, fY, size * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Eaglet Sky: Windy Day theme, sun, wind swirls, far flying birds
        const sunX = canvas.width - 120;
        const sunY = 70;

        const sunGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 60);
        sunGlow.addColorStop(0, "rgba(253, 224, 71, 0.8)");
        sunGlow.addColorStop(0.5, "rgba(2, 132, 199, 0.15)");
        sunGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
        ctx.fill();

        // Wind swirls
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 2;
        for (let j = 0; j < 3; j++) {
          const swirlX = (j * 320 - g.scrollX * 0.45 + canvas.width) % (canvas.width + 200) - 100;
          const swirlY = 90 + j * 70;
          ctx.beginPath();
          ctx.moveTo(swirlX, swirlY);
          ctx.bezierCurveTo(
            swirlX + 40, swirlY - 15,
            swirlX + 70, swirlY + 15,
            swirlX + 110, swirlY
          );
          ctx.stroke();
        }

        // Far away flying birds
        ctx.strokeStyle = "rgba(100, 116, 139, 0.28)";
        ctx.lineWidth = 1.2;
        for (let j = 0; j < 4; j++) {
          const birdX = (j * 240 - g.scrollX * 0.16 + canvas.width) % (canvas.width + 100) - 50;
          const birdY = 70 + (j % 2) * 50 + Math.sin(g.frameCount * 0.04 + j) * 4;
          const wingFlap = Math.sin(g.frameCount * 0.1 + j) * 3.5;
          
          ctx.beginPath();
          ctx.moveTo(birdX - 7, birdY + wingFlap);
          ctx.lineTo(birdX, birdY);
          ctx.lineTo(birdX + 7, birdY + wingFlap);
          ctx.stroke();
        }
      }

      // B. Parallax Mountains/Hills Silhouettes at the bottom
      const pX = - (g.scrollX * 0.08) % canvas.width;
      ctx.fillStyle = characterId === "streak-reward-6" ? "rgba(186, 230, 253, 0.45)" : // Ice Mountains
                      characterId === "streak-reward-11" ? "rgba(254, 215, 170, 0.38)" : // Fire Mountains
                      characterId === "streak-reward-16" ? "rgba(209, 250, 229, 0.42)" : // Forest hills
                      "rgba(224, 242, 254, 0.45)"; // Eaglet Hills
                      
      // Distant mountain outline (slow parallax)
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      
      const mountainCount = 6;
      const mStep = canvas.width / (mountainCount - 1);
      for (let j = 0; j < mountainCount + 1; j++) {
        const mx = pX + j * mStep;
        let mHeight = 100 + (Math.sin(j * 1.7) * 40 + Math.cos(j * 0.9) * 20);
        if (characterId === "streak-reward-16") {
          mHeight = 80 + Math.sin(j * 1.5) * 25;
        }
        ctx.lineTo(mx, canvas.height - mHeight);
      }
      ctx.lineTo(pX + (mountainCount + 1) * mStep, canvas.height);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.fill();
      
      // Second parallax layer (closer, scrolls a bit faster)
      const pX2 = - (g.scrollX * 0.22) % canvas.width;
      ctx.fillStyle = characterId === "streak-reward-6" ? "rgba(14, 165, 233, 0.18)" : 
                      characterId === "streak-reward-11" ? "rgba(249, 115, 22, 0.18)" : 
                      characterId === "streak-reward-16" ? "rgba(16, 185, 129, 0.18)" : 
                      "rgba(14, 165, 233, 0.18)";
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      for (let j = 0; j < mountainCount + 1; j++) {
        const mx = pX2 + j * mStep;
        let mHeight = 60 + (Math.cos(j * 2.3) * 25 + Math.sin(j * 1.1) * 15);
        if (characterId === "streak-reward-16") {
          mHeight = 50 + Math.cos(j * 1.8) * 18;
        }
        ctx.lineTo(mx, canvas.height - mHeight);
      }
      ctx.lineTo(pX2 + (mountainCount + 1) * mStep, canvas.height);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.fill();

      ctx.restore();

      // 3. Draw Background clouds
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 300) - (g.scrollX * 0.15) + canvas.width) % (canvas.width + 160) - 80;
        const cy = 60 + (i % 2) * 50;
        ctx.beginPath();
        ctx.arc(cx, cy, 35, 0, Math.PI * 2);
        ctx.arc(cx - 20, cy + 10, 25, 0, Math.PI * 2);
        ctx.arc(cx + 20, cy + 10, 25, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Update Game Physics
      g.scrollX += g.scrollSpeed * dt;

      // 5. Update Player position
      const gravity = 0.16;
      g.player.vy += gravity * dt;
      // Clamp speed
      if (g.player.vy > 5.5) g.player.vy = 5.5;
      if (g.player.vy < -5.5) g.player.vy = -5.5;

      g.player.y += g.player.vy * dt;

      // Bound player inside canvas vertically with gentle spring bounce (no heart loss)
      if (g.player.y < 5) {
        g.player.y = 5;
        g.player.vy = 1.3; // softly push downward (increased by 25% to avoid sliding)
        playSound("bounce");
        // Spawn particles at the top ceiling
        for (let i = 0; i < 5; i++) {
          g.particles.push({
            x: 100 + g.player.w / 2 + (Math.random() - 0.5) * 30,
            y: 5,
            vx: (Math.random() - 0.5) * 2,
            vy: 0.5 + Math.random() * 1,
            size: 2 + Math.random() * 3,
            color: theme.accentColor,
            alpha: 0.8,
            decay: 0.04
          });
        }
      }
      const bottomLimit = canvas.height - g.player.h - 5;
      if (g.player.y > bottomLimit) {
        g.player.y = bottomLimit;
        g.player.vy = -2.3; // softly push upward (increased by 25% to avoid sliding)
        playSound("bounce");
        // Spawn particles at the floor
        for (let i = 0; i < 5; i++) {
          g.particles.push({
            x: 100 + g.player.w / 2 + (Math.random() - 0.5) * 30,
            y: bottomLimit + g.player.h,
            vx: (Math.random() - 0.5) * 2,
            vy: -0.5 - Math.random() * 1,
            size: 2 + Math.random() * 3,
            color: theme.accentColor,
            alpha: 0.8,
            decay: 0.04
          });
        }
      }

      if (g.player.invulnerable > 0) {
        g.player.invulnerable -= 16.66 * dt;
      }

      // 6. Update Wing Flapping Frame
      g.player.wingAnimTimer += dt;
      // Wing flap speed depends on vertical motion
      const animRate = g.player.vy < 0 ? 3.5 : 8.0; 
      if (g.player.wingAnimTimer >= animRate) {
        g.player.wingAnimTimer = 0;
        // Cycle: 0 -> 1 -> 2 -> 1 -> 0
        g.player.wingFrame = (g.player.wingFrame + 1) % 4;
      }
      
      let spriteCol = 0;
      if (g.player.wingFrame === 0) spriteCol = 0;      // Wings up
      else if (g.player.wingFrame === 1) spriteCol = 1; // Wings middle
      else if (g.player.wingFrame === 2) spriteCol = 2; // Wings down
      else spriteCol = 1;                               // Wings middle

      // 7. Update Particles
      g.particles.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= p.decay * dt;
        
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        if (p.rotation !== undefined) {
          ctx.rotate(p.rotation);
        }
        
        ctx.fillStyle = p.color;
        if (theme.particleType === "snow") {
          // Draw snowflake shape / small star
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (theme.particleType === "fire") {
          // Spark diamond
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size, 0);
          ctx.closePath();
          ctx.fill();
        } else if (theme.particleType === "leaf") {
          // Green leaf oval
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.4, p.size * 0.7, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Floating bubbles
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      g.particles = g.particles.filter((p) => p.alpha > 0.01);

      // Spawn ambient trail particles behind the dragon
      if (g.frameCount % 2 === 0) {
        g.particles.push({
          x: 100 + g.player.w * 0.15,
          y: g.player.y + g.player.h * 0.5 + (Math.random() - 0.5) * 12,
          vx: -1.0 - Math.random() * 0.8,
          vy: (Math.random() - 0.5) * 0.5,
          size: 2.0 + Math.random() * 4.0,
          color: theme.particleColors[Math.floor(Math.random() * theme.particleColors.length)],
          alpha: 0.6,
          decay: 0.02,
          rotation: Math.random() * Math.PI
        });
      }

      // 8. Draw and check Portals
      g.portals.forEach((p) => {
        const px = p.x - g.scrollX;
        // Check if on screen
        if (px + p.w >= -100 && px <= canvas.width + 100) {
          ctx.save();
          // Draw Portal Glow
          const portalCX = px + p.w / 2;
          const portalCY = p.y;
          const glowGrad = ctx.createRadialGradient(
            portalCX, portalCY, p.gapHeight / 2 - 20,
            portalCX, portalCY, p.gapHeight / 2 + 30
          );
          glowGrad.addColorStop(0, "rgba(255, 255, 255, 0.1)");
          glowGrad.addColorStop(0.5, theme.glowColor);
          glowGrad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(portalCX, portalCY, p.gapHeight / 2 + 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          if (spriteImg.complete && spriteImg.naturalWidth > 0) {
            // Draw Portal Sprite (Row 1, Col 0)
            ctx.drawImage(
              spriteImg,
              0, 627, 418, 627, // Source
              px, p.y - p.h / 2, p.w, p.h // Destination centered vertically around p.y
            );
          } else {
            // Fallback portal rings
            ctx.strokeStyle = theme.accentColor;
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.ellipse(portalCX, portalCY, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Draw red glowing danger indicator arcs on the top and bottom frames of the portal
          ctx.save();
          
          const topDangerCenterY = p.y - p.gapHeight / 2;
          const bottomDangerCenterY = p.y + p.gapHeight / 2;
          
          // 1. Draw top danger indicator
          // Outer safe glow circle (children can touch the edges safely)
          ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
          ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(portalCX, topDangerCenterY, 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Inner hot damage circle (actual collision point)
          ctx.fillStyle = "#ef4444";
          ctx.shadowBlur = 10;
          ctx.shadowColor = "#ef4444";
          ctx.beginPath();
          ctx.arc(portalCX, topDangerCenterY, 6, 0, Math.PI * 2);
          ctx.fill();
          
          // 2. Draw bottom danger indicator
          ctx.shadowBlur = 0; // reset shadow
          // Outer safe glow circle
          ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
          ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(portalCX, bottomDangerCenterY, 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Inner hot damage circle
          ctx.fillStyle = "#ef4444";
          ctx.shadowBlur = 10;
          ctx.shadowColor = "#ef4444";
          ctx.beginPath();
          ctx.arc(portalCX, bottomDangerCenterY, 6, 0, Math.PI * 2);
          ctx.fill();

          // Spawn small warning flames/sparks
          if (g.frameCount % 5 === 0) {
            g.particles.push({
              x: portalCX + (Math.random() - 0.5) * 8,
              y: topDangerCenterY + (Math.random() - 0.5) * 8,
              vx: -0.5 - Math.random() * 0.5,
              vy: (Math.random() - 0.5) * 0.5,
              size: 1.5 + Math.random() * 2,
              color: "#ef4444",
              alpha: 0.8,
              decay: 0.05
            });
            g.particles.push({
              x: portalCX + (Math.random() - 0.5) * 8,
              y: bottomDangerCenterY + (Math.random() - 0.5) * 8,
              vx: -0.5 - Math.random() * 0.5,
              vy: (Math.random() - 0.5) * 0.5,
              size: 1.5 + Math.random() * 2,
              color: "#ef4444",
              alpha: 0.8,
              decay: 0.05
            });
          }
          ctx.restore();

          // Collisions checking
          if (100 + g.player.w > px && 100 < px + p.w) {
            if (g.player.invulnerable <= 0) {
              const playerMinX = 100 + 20; // 20px horizontal inset
              const playerMaxX = 100 + g.player.w - 20;
              const playerMinY = g.player.y + 10; // 10px vertical inset
              const playerMaxY = g.player.y + g.player.h - 10;

              // 1. Check top danger center
              const closestTopX = Math.max(playerMinX, Math.min(portalCX, playerMaxX));
              const closestTopY = Math.max(playerMinY, Math.min(topDangerCenterY, playerMaxY));
              const distTopX = portalCX - closestTopX;
              const distTopY = topDangerCenterY - closestTopY;
              const hitTopFrame = (distTopX * distTopX + distTopY * distTopY) < 36; // 6px radius squared

              // 2. Check bottom danger center
              const closestBottomX = Math.max(playerMinX, Math.min(portalCX, playerMaxX));
              const closestBottomY = Math.max(playerMinY, Math.min(bottomDangerCenterY, playerMaxY));
              const distBottomX = portalCX - closestBottomX;
              const distBottomY = bottomDangerCenterY - closestBottomY;
              const hitBottomFrame = (distBottomX * distBottomX + distBottomY * distBottomY) < 36; // 6px radius squared

              if (hitTopFrame || hitBottomFrame) {
                // Collide with portal frame!
                setHearts((prev) => {
                  const next = prev - 1;
                  if (next <= 0) {
                    setGameState("fail");
                    playSound("fail");
                  } else {
                    playSound("hit");
                  }
                  return next;
                });
                g.player.invulnerable = 1200; // invulnerable for 1.2s
                g.player.vy = 0;
              }
            }
            
            // Mark passed regardless of invulnerability
            if (!p.passed && px + p.w / 2 < 100 + g.player.w / 2) {
              // Passed safely!
              p.passed = true;
            }
          }
        }
      });

      // 9. Draw and check Stars
      g.stars.forEach((s) => {
        if (!s.collected) {
          const sx = s.x - g.scrollX;
          if (sx + s.w >= -40 && sx <= canvas.width + 40) {
            const scx = sx + s.w / 2;
            const scy = s.y + s.h / 2;
            
            if (s.isSpecial) {
              ctx.save();
              ctx.translate(scx, scy);
              const rotation = g.frameCount * 0.03;
              ctx.rotate(rotation);
              
              // Draw a beautiful glowing berry or diamond or magic fruit
              let fruitEmoji = "🍓";
              let glowColor = "rgba(239, 68, 68, 0.4)";
              
              if (characterId === "streak-reward-6") {
                fruitEmoji = "💎"; // Ice Diamond
                glowColor = "rgba(56, 189, 248, 0.4)";
              } else if (characterId === "streak-reward-11") {
                fruitEmoji = "🍓"; // Fire Berry
                glowColor = "rgba(239, 68, 68, 0.4)";
              } else if (characterId === "streak-reward-16") {
                fruitEmoji = "🍇"; // Forest Berry
                glowColor = "rgba(167, 243, 208, 0.4)";
              } else {
                fruitEmoji = "🍒"; // Sky Cherry
                glowColor = "rgba(251, 191, 36, 0.4)";
              }
              
              // Draw glow behind
              const fruitGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, s.w / 2 + 10);
              fruitGlow.addColorStop(0, "rgba(255,255,255,0.8)");
              fruitGlow.addColorStop(0.5, glowColor);
              fruitGlow.addColorStop(1, "rgba(0,0,0,0)");
              ctx.fillStyle = fruitGlow;
              ctx.beginPath();
              ctx.arc(0, 0, s.w / 2 + 10, 0, Math.PI * 2);
              ctx.fill();
              
              // Draw emoji
              ctx.font = "24px sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(fruitEmoji, 0, 0);
              ctx.restore();
            } else {
              ctx.save();
              const pulse = 1 + Math.sin(g.frameCount * 0.08) * 0.08;
              
              if (spriteImg.complete && spriteImg.naturalWidth > 0) {
                ctx.translate(scx, scy);
                ctx.rotate(g.frameCount * 0.02);
                // Draw Star Sprite (Row 1, Col 1)
                ctx.drawImage(
                  spriteImg,
                  418, 627, 418, 418, // Source
                  -s.w * pulse / 2, -s.h * pulse / 2, s.w * pulse, s.h * pulse // Destination centered
                );
              } else {
                // Fallback emoji Star
                ctx.fillStyle = "#fbbf24";
                ctx.font = "24px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("⭐", scx, scy);
              }
              ctx.restore();
            }
            
            // Collision check
            if (
              100 < sx + s.w &&
              100 + g.player.w > sx &&
              g.player.y < s.y + s.h &&
              g.player.y + g.player.h > s.y
            ) {
              s.collected = true;
              
              if (s.isSpecial) {
                playSound("star");
                
                // Benefit: restore life (if < 3), else add +3 stars!
                setHearts((prev) => {
                  if (prev < 3) {
                    // Spawn healing particles (glowing green circles)
                    for (let pIdx = 0; pIdx < 12; pIdx++) {
                      const angle = Math.random() * Math.PI * 2;
                      const spd = 1.0 + Math.random() * 2.0;
                      g.particles.push({
                        x: 100 + g.player.w / 2,
                        y: g.player.y + g.player.h / 2,
                        vx: Math.cos(angle) * spd,
                        vy: Math.sin(angle) * spd,
                        size: 2.0 + Math.random() * 2.5,
                        color: "#22c55e",
                        alpha: 0.9,
                        decay: 0.03
                      });
                    }
                    return prev + 1;
                  } else {
                    // Full health: give 3 stars instead
                    setStarsCollected((stars) => stars + 3);
                    // Spawn rainbow gold/cyan sparks
                    const bonusColors = ["#facc15", "#60a5fa", "#34d399", "#f472b6"];
                    for (let pIdx = 0; pIdx < 15; pIdx++) {
                      const angle = Math.random() * Math.PI * 2;
                      const spd = 1.5 + Math.random() * 2.5;
                      g.particles.push({
                        x: scx,
                        y: scy,
                        vx: Math.cos(angle) * spd,
                        vy: Math.sin(angle) * spd,
                        size: 2.0 + Math.random() * 3.0,
                        color: bonusColors[Math.floor(Math.random() * bonusColors.length)],
                        alpha: 0.9,
                        decay: 0.04
                      });
                    }
                    return prev;
                  }
                });
              } else {
                // Standard Star collected
                playSound("star");
                const starsGained = s.isInsidePortal ? 2 : 1;
                setStarsCollected((prev) => prev + starsGained);

                // Spark particles (more sparks and larger size for X2 inside portal)
                const sparkCount = s.isInsidePortal ? 14 : 8;
                for (let pIdx = 0; pIdx < sparkCount; pIdx++) {
                  const angle = Math.random() * Math.PI * 2;
                  const spd = 1.5 + Math.random() * (s.isInsidePortal ? 3.0 : 2.0);
                  g.particles.push({
                    x: scx,
                    y: scy,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    size: (s.isInsidePortal ? 2.5 : 2.0) + Math.random() * 3.0,
                    color: s.isInsidePortal ? "#facc15" : "#eab308",
                    alpha: 1.0,
                    decay: 0.04,
                    rotation: Math.random() * Math.PI
                  });
                }
              }
            }
          }
        }
      });

      // 10. Draw and check Dangers
      g.dangers.forEach((d) => {
        if (d.active) {
          const dx = d.x - g.scrollX;
          if (dx + d.w >= -40 && dx <= canvas.width + 40) {
            ctx.save();
            const dcx = dx + d.w / 2;
            const dcy = d.y + d.h / 2;
            d.angle += d.rotationSpeed * dt;
            
            // 1. Draw burning hot background fire aura
            const pulseGlow = 24 + Math.sin(g.frameCount * 0.2) * 8;
            const warningGlow = ctx.createRadialGradient(
              dcx, dcy, 4,
              dcx, dcy, pulseGlow
            );
            warningGlow.addColorStop(0, "rgba(239, 68, 68, 0.95)"); // solid red center
            warningGlow.addColorStop(0.35, "rgba(249, 115, 22, 0.85)"); // hot orange middle
            warningGlow.addColorStop(0.7, "rgba(239, 68, 68, 0.4)"); // outer red glow
            warningGlow.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = warningGlow;
            ctx.beginPath();
            ctx.arc(dcx, dcy, pulseGlow, 0, Math.PI * 2);
            ctx.fill();

            // 2. Draw danger sprite / fallback
            ctx.save();
            if (spriteImg.complete && spriteImg.naturalWidth > 0) {
              ctx.translate(dcx, dcy);
              ctx.rotate(d.angle);
              ctx.drawImage(
                spriteImg,
                836, 627, 418, 418, // Source
                -d.w / 2, -d.h / 2, d.w, d.h // Destination centered
              );
            } else {
              // Fallback Danger bomb
              ctx.fillStyle = "#ef4444";
              ctx.font = "24px sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText("💣", dcx, dcy);
            }
            ctx.restore();

            // 3. Draw animated spinning fire buzzsaw flames on top of the sprite
            ctx.save();
            const numFlames = 8;
            for (let f = 0; f < numFlames; f++) {
              const angle = (f * Math.PI * 2) / numFlames + g.frameCount * 0.08;
              const flameDist = d.w / 2 + 1 + Math.sin(g.frameCount * 0.25 + f) * 3;
              const fx = dcx + Math.cos(angle) * flameDist;
              const fy = dcy + Math.sin(angle) * flameDist;
              const fSize = 5 + Math.sin(g.frameCount * 0.15 + f) * 2;
              
              ctx.fillStyle = f % 2 === 0 ? "#ef4444" : "#f97316"; // alternate red / orange
              ctx.beginPath();
              ctx.arc(fx, fy, fSize, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();

            // 4. Draw a pulsing neon warning boundary circle
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#ef4444";
            ctx.beginPath();
            ctx.arc(dcx, dcy, d.w / 2 + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0; // reset shadow blur

            // Spawn fire sparks trailing from the danger item (thicker, every 2 frames)
            if (g.frameCount % 2 === 0) {
              g.particles.push({
                x: dcx,
                y: dcy,
                vx: -1.5 - Math.random() * 1.5,
                vy: (Math.random() - 0.5) * 1.0,
                size: 2 + Math.random() * 3,
                color: Math.random() < 0.6 ? "#ef4444" : "#f97316", // red or orange
                alpha: 0.9,
                decay: 0.04
              });
            }
            ctx.restore();

            // Collision check (circular collision with player core box)
            if (g.player.invulnerable <= 0) {
              const playerMinX = 100 + 20; // 20px horizontal inset
              const playerMaxX = 100 + g.player.w - 20;
              const playerMinY = g.player.y + 10; // 10px vertical inset
              const playerMaxY = g.player.y + g.player.h - 10;

              const closestX = Math.max(playerMinX, Math.min(dcx, playerMaxX));
              const closestY = Math.max(playerMinY, Math.min(dcy, playerMaxY));
              
              const distX = dcx - closestX;
              const distY = dcy - closestY;
              const distSq = distX * distX + distY * distY;
              
              // Collision radius: 12px (visually extremely forgiving, since sprite is 35px wide)
              if (distSq < 144) {
              setHearts((prev) => {
                const next = prev - 1;
                if (next <= 0) {
                  setGameState("fail");
                  playSound("fail");
                } else {
                  playSound("hit");
                }
                return next;
              });
              g.player.invulnerable = 1200; // invulnerable for 1.2s
              
              // Spark particles
              for (let pIdx = 0; pIdx < 8; pIdx++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = 2.0 + Math.random() * 2.0;
                g.particles.push({
                  x: dcx,
                  y: dcy,
                  vx: Math.cos(angle) * spd,
                  vy: Math.sin(angle) * spd,
                  size: 2.0 + Math.random() * 3.5,
                  color: "#ef4444",
                  alpha: 1.0,
                  decay: 0.05,
                  rotation: Math.random() * Math.PI
                });
              }
            }
          }
        }
      }
    });

      // 11. Draw Finish Portal
      if (g.finishPortal) {
        const fp = g.finishPortal;
        const fpx = fp.x - g.scrollX;
        if (fpx + fp.w >= -150 && fpx <= canvas.width + 150) {
          ctx.save();
          // Glow finish
          const fpcx = fpx + fp.w / 2;
          const fpcy = fp.y;
          const finishGlow = ctx.createRadialGradient(
            fpcx, fpcy, fp.gapHeight / 2 - 20,
            fpcx, fpcy, fp.gapHeight / 2 + 50
          );
          finishGlow.addColorStop(0, "rgba(255, 255, 255, 0.2)");
          finishGlow.addColorStop(0.5, "rgba(234, 179, 8, 0.4)");
          finishGlow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = finishGlow;
          ctx.beginPath();
          ctx.arc(fpcx, fpcy, fp.gapHeight / 2 + 50, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          if (spriteImg.complete && spriteImg.naturalWidth > 0) {
            // Draw Portal Sprite (Row 1, Col 0) but scaled larger
            ctx.drawImage(
              spriteImg,
              0, 627, 418, 627, // Source
              fpx, fp.y - fp.h / 2, fp.w, fp.h
            );
          } else {
            // Fallback finish gate
            ctx.strokeStyle = "#eab308";
            ctx.lineWidth = 20;
            ctx.beginPath();
            ctx.ellipse(fpcx, fpcy, fp.w / 2, fp.h / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Finish text banner
          ctx.fillStyle = "#713f12";
          ctx.font = "bold 16px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🌟 ФИНАЛ 🌟", fpcx, fp.y);

          // Success trigger
          if (100 + g.player.w / 2 > fpx + fp.w / 2 && !fp.passed) {
            fp.passed = true;
            clearInterval(timer);
            setGameState("success");
            playSound("success");
            // Confetti explosion
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 }
            });
          }
        }
      }

      // 12. Draw Player character (horizontal flyer)
      let visible = true;
      if (g.player.invulnerable > 0 && Math.floor(g.player.invulnerable / 100) % 2 === 0) {
        visible = false;
      }

      if (visible) {
        ctx.save();
        const px = 100;
        const py = g.player.y;
        
        // Tilt slightly depending on vertical speed
        const tilt = g.player.vy * 0.06;
        ctx.translate(px + g.player.w / 2, py + g.player.h / 2);
        ctx.rotate(tilt);

        if (spriteImg.complete && spriteImg.naturalWidth > 0) {
          // Draw character wings frame centered
          ctx.drawImage(
            spriteImg,
            spriteCol * 418, 0, 418, 627, // Source
            -g.player.w / 2, -g.player.h / 2, g.player.w, g.player.h
          );
        } else {
          // Fallback box flyer
          ctx.fillStyle = theme.accentColor;
          ctx.fillRect(-g.player.w / 2, -g.player.h / 2, g.player.w, g.player.h);
          ctx.fillStyle = "#ffffff";
          ctx.font = "24px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🐉", 0, 0);
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
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
          gameId: "flight",
          completed: true
        })
      });
    } catch (e) {
      console.error("Failed to save flight game completion:", e);
    }
    onClose(true);
  };

  // Orientation Check warning render
  if (!isLandscape && !testMode) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none touch-none">
        <div className="text-5xl mb-4 animate-bounce">📱🔄</div>
        <h3 className="text-white font-extrabold text-lg">Поверни телефон</h3>
        <p className="text-slate-400 text-xs mt-2 max-w-xs leading-relaxed">
          Для этой игры нужен альбомный (горизонтальный) режим экрана. Поверни устройство или сделай экран шире!
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 font-sans select-none overflow-hidden touch-none">
      
      {/* Main landscape canvas container */}
      <div className="relative w-full max-w-[840px] aspect-[84/40] bg-slate-900 shadow-2xl border border-white/5 md:rounded-2xl overflow-hidden flex items-center justify-center">
        
        {/* HUD Overlay during play */}
        {gameState === "playing" && (
          <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between">
            {/* Exit Cross */}
            <button 
              onClick={() => onClose(false)}
              className="bg-black/40 border border-white/10 hover:bg-black/60 text-white font-black text-xs px-3 py-1.5 rounded-full cursor-pointer flex items-center justify-center transition-all"
            >
              ✕ Выход
            </button>
            
            {/* Lives, Stars and Timer HUD group */}
            <div className="flex items-center gap-3">
              {/* Hearts */}
              <div className="bg-black/40 border border-white/10 px-3 py-1 rounded-full flex items-center gap-1">
                {[1, 2, 3].map((hVal) => (
                  <span 
                    key={hVal} 
                    className={`text-sm md:text-base transition-transform duration-300 ${hVal <= hearts ? "scale-100 filter-none" : "scale-90 filter grayscale opacity-30"}`}
                  >
                    ❤️
                  </span>
                ))}
              </div>

              {/* Stars */}
              <div className="bg-black/40 border border-white/10 text-yellow-400 font-extrabold text-xs px-2.5 py-1 rounded-full flex items-center gap-0.5">
                <span>⭐</span> {starsCollected}
              </div>

              {/* Timer */}
              <div className="bg-black/40 border border-white/10 text-sky-400 font-extrabold text-xs px-2.5 py-1 rounded-full flex items-center gap-0.5">
                <span>⏱️</span> {timeLeft}c
              </div>
            </div>

            {/* Pause & Mute controls */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSoundEnabled((prev) => !prev)}
                className="bg-black/40 border border-white/10 hover:bg-black/60 text-white p-2 rounded-full cursor-pointer transition-all flex items-center justify-center"
              >
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>
              <button 
                onClick={() => setGameState("paused")}
                className="bg-black/40 border border-white/10 hover:bg-black/60 text-white font-black text-xs px-3.5 py-1.5 rounded-full cursor-pointer transition-all"
              >
                Пауза
              </button>
            </div>
          </div>
        )}

        {/* Action interactive Screen Area */}
        <canvas 
          ref={canvasRef} 
          width={840} 
          height={400} 
          onMouseDown={handleFlap}
          onTouchStart={handleTouch}
          className="w-full h-full bg-slate-950 cursor-pointer object-contain block"
        />

        {/* 1. START OVERLAY */}
        {gameState === "start" && (
          <div className="absolute inset-0 z-30 bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center text-white text-center p-6">
            <div className="text-6xl mb-4 animate-[bounce_2s_infinite]">🐉✨</div>
            <h1 className="text-xl md:text-2xl font-black tracking-wide drop-shadow-md">
              Полёт «Сквозь порталы»: {characterName}
            </h1>
            <p className="text-[11px] md:text-xs text-slate-300 max-w-sm leading-relaxed mt-2.5">
              Нажимай на экран, чтобы взлетать выше.<br/>
              Пролетай сквозь широкие порталы.<br/>
              Собирай звёзды ⭐ и уворачивайся от опасностей!
            </p>
            {!imageLoaded ? (
              <div className="mt-5 flex flex-col items-center gap-2">
                <div className="w-6 h-6 rounded-full border-4 border-white/20 border-t-yellow-400 animate-spin" />
                <span className="text-[10px] text-white/70 font-extrabold tracking-wider">Загрузка героя...</span>
              </div>
            ) : (
              <button
                onClick={() => setGameState("playing")}
                className="mt-6 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-slate-950 font-black text-sm px-10 py-3 rounded-full shadow-lg transform active:scale-95 transition-all cursor-pointer"
              >
                Начать
              </button>
            )}
            <button 
              onClick={() => onClose(false)}
              className="absolute top-4 right-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-full cursor-pointer transition-all"
            >
              ✕ Выйти
            </button>
          </div>
        )}

        {/* 2. PAUSE OVERLAY */}
        {gameState === "paused" && (
          <div className="absolute inset-0 z-30 bg-black/75 flex flex-col items-center justify-center text-white text-center">
            <h2 className="text-xl font-black mb-5">Игра на паузе</h2>
            <button 
              onClick={() => setGameState("playing")}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 p-4 rounded-full shadow-xl transform active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            >
              <Play size={24} fill="currentColor" />
            </button>
          </div>
        )}

        {/* 3. SUCCESS OVERLAY */}
        {gameState === "success" && (
          <div className="absolute inset-0 z-30 bg-black/85 flex flex-col items-center justify-center text-white text-center p-6">
            <div className="text-7xl mb-4 animate-[spin_5s_linear_infinite]">🏆👑</div>
            <h2 className="text-2xl md:text-3xl font-black text-yellow-400">Игра пройдена!</h2>
            <p className="text-sm font-bold text-slate-200 mt-2">Поздравляю! Ты пролетел все порталы!</p>
            <p className="text-xs text-yellow-400/90 mt-1">Собрано звёзд: {starsCollected} ⭐</p>
            <button 
              onClick={saveCompletion}
              className="mt-6 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-sm px-10 py-3.5 rounded-full shadow-lg transform active:scale-95 transition-all cursor-pointer"
            >
              Окей
            </button>
          </div>
        )}

        {/* 4. FAIL OVERLAY */}
        {gameState === "fail" && (
          <div className="absolute inset-0 z-30 bg-black/85 flex flex-col items-center justify-center text-white text-center p-6">
            <div className="text-7xl mb-4 animate-bounce">😢🌌</div>
            <h2 className="text-xl md:text-2xl font-black text-red-500">Пока не получилось</h2>
            <p className="text-xs md:text-sm text-slate-300 mt-2">Не переживай, попробуй ещё раз!</p>
            <div className="flex gap-4 mt-6">
              <button 
                onClick={handleRestart}
                className="bg-white hover:bg-slate-100 text-slate-950 font-black text-xs md:text-sm px-6 py-3 rounded-full shadow-md flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw size={14} /> Начать заново
              </button>
              <button 
                onClick={() => onClose(false)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/10 font-bold text-xs md:text-sm px-6 py-3 rounded-full active:scale-95 transition-all cursor-pointer"
              >
                Выйти
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
