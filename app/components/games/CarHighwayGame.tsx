"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX, RotateCcw, Trophy, Sparkles, Heart, Zap, Play, Gauge, Video, Pause, Play as PlayIcon } from "lucide-react";
import confetti from "canvas-confetti";
import { useMobileLandscapeLaunch } from "./MobileLandscapeGate";

type CarId = "porsche" | "bmw" | "lambo" | "audi" | "nissan";

interface CarInfo {
  id: CarId;
  name: string;
  subtitle: string;
  modelPath: string;
  imgPath: string;
  speedStat: number;
  handlingStat: number;
  nitroStat: number;
  scale: number;
  rotationY: number;
  yOffset: number;
  badge: string;
}

const CARS: CarInfo[] = [
  {
    id: "porsche",
    name: "Porsche 911 GT3 RS",
    subtitle: "Carrera Tribute 992 (White & Python Green)",
    modelPath: "/models/porsche_gt3.glb",
    imgPath: "/images/cars/porsche.webp",
    speedStat: 98,
    handlingStat: 99,
    nitroStat: 95,
    scale: 3.1,
    rotationY: Math.PI,
    yOffset: 0.02,
    badge: "P",
  },
  {
    id: "bmw",
    name: "BMW M8 Competition",
    subtitle: "Widebody Carbon Edition (Gunmetal & Red)",
    modelPath: "/models/bmw_m8.glb",
    imgPath: "/images/cars/bmw.webp",
    speedStat: 97,
    handlingStat: 95,
    nitroStat: 97,
    scale: 3.2,
    rotationY: 0,
    yOffset: 0.02,
    badge: "M",
  },
  {
    id: "lambo",
    name: "Lamborghini Revuelto",
    subtitle: "Duke Dynamics Carbon (V12 Hybrid)",
    modelPath: "/models/lambo.glb",
    imgPath: "/images/cars/lambo.webp",
    speedStat: 100,
    handlingStat: 96,
    nitroStat: 99,
    scale: 3.2,
    rotationY: 0,
    yOffset: 0.03,
    badge: "L",
  },
  {
    id: "audi",
    name: "Audi R8 LMS",
    subtitle: "2016 GT Racing Edition",
    modelPath: "/models/audi_r8.glb",
    imgPath: "/images/cars/audi.webp",
    speedStat: 98,
    handlingStat: 98,
    nitroStat: 96,
    scale: 3.15,
    rotationY: Math.PI,
    yOffset: 0.02,
    badge: "R8",
  },
  {
    id: "nissan",
    name: "Nissan GT-R",
    subtitle: "Most Wanted Street Edition",
    modelPath: "/models/nissan_gtr.glb",
    imgPath: "/images/cars/nissan.webp",
    speedStat: 97,
    handlingStat: 97,
    nitroStat: 98,
    scale: 3.15,
    rotationY: -Math.PI / 2,
    yOffset: 0.02,
    badge: "GT-R",
  },
];

// Procedural Skyscraper Window Texture
function generateSkyscraperTexture() {
  const bldgCanvas = document.createElement("canvas");
  bldgCanvas.width = 256;
  bldgCanvas.height = 512;
  const bCtx = bldgCanvas.getContext("2d");
  if (bCtx) {
    bCtx.fillStyle = "#090d16";
    bCtx.fillRect(0, 0, 256, 512);

    for (let y = 10; y < 500; y += 22) {
      for (let x = 10; x < 246; x += 18) {
        const r = Math.random();
        if (r < 0.45) {
          bCtx.fillStyle = "#111827";
        } else if (r < 0.78) {
          bCtx.fillStyle = "rgba(56, 189, 248, 0.95)"; // Neon Cyan
        } else if (r < 0.94) {
          bCtx.fillStyle = "rgba(254, 240, 138, 0.95)"; // Warm Amber
        } else {
          bCtx.fillStyle = "rgba(244, 63, 94, 0.9)"; // Red beacon
        }
        bCtx.fillRect(x, y, 12, 14);
      }
    }
  }

  const bldgTex = new THREE.CanvasTexture(bldgCanvas);
  bldgTex.wrapS = THREE.RepeatWrapping;
  bldgTex.wrapT = THREE.RepeatWrapping;
  bldgTex.repeat.set(2, 4);
  bldgTex.needsUpdate = true;
  return bldgTex;
}

// Procedural Twilight Crimson Sunset Sky Dome in the background
function createSunsetSky() {
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 512;
  skyCanvas.height = 1024;
  const ctx = skyCanvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0.0, "#030712"); // Zenith Night Sky
    grad.addColorStop(0.32, "#0f172a"); // Deep Indigo
    grad.addColorStop(0.42, "#4c0519"); // Twilight Maroon
    grad.addColorStop(0.48, "#9f1239"); // Rich Crimson
    grad.addColorStop(0.51, "#e11d48"); // Radiant Raspberry Sunset Horizon
    grad.addColorStop(0.54, "#fb7185"); // Sunset Rose Glow
    grad.addColorStop(0.62, "#0b0f19"); // Lower Ground Night
    grad.addColorStop(1.0, "#030712");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 1024);
  }

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.wrapS = THREE.ClampToEdgeWrapping;
  skyTex.wrapT = THREE.ClampToEdgeWrapping;
  skyTex.needsUpdate = true;

  const skyGeo = new THREE.SphereGeometry(300, 32, 24);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false, // Prevents scene fog from obscuring the sunset sky dome!
  });
  return new THREE.Mesh(skyGeo, skyMat);
}

// Custom Analytical Anti-Aliased Highway Shader (Single Pass, Zero Z-Fighting)
function generateAsphaltTexture(renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // 1. Base dark grey asphalt
    ctx.fillStyle = "#2c2f33"; 
    ctx.fillRect(0, 0, 1024, 1024);

    // 2. High-contrast chunky noise (pebbles/aggregate)
    for (let i = 0; i < 40000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const shade = Math.random() > 0.5 ? "#1a1c1e" : "#3f434a";
      const size = Math.random() * 3.0;
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, size, size);
    }
    
    // 3. Subtle tire tracks
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(128 - 20, 0, 40, 1024);
    ctx.fillRect(384 - 20, 0, 40, 1024);
    ctx.fillRect(640 - 20, 0, 40, 1024);
    ctx.fillRect(896 - 20, 0, 40, 1024);

    // 4. Vivid Yellow shoulders
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(15, 0, 25, 1024);
    ctx.fillRect(1024 - 40, 0, 25, 1024);

    // 5. Crisp White dashed lane dividers (3 lines for 4 lanes)
    ctx.fillStyle = "#ffffff";
    const dashW = 16;
    const dashH = 180;
    const lanes = [256, 512, 768];
    for (let l of lanes) {
      for (let y = 0; y < 1024; y += 341) {
        ctx.fillRect(l - dashW/2, y, dashW, dashH);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 100); // 100 repeats over 500m (5m per repeat)
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Audio System
class CarAudioSystem {
  private ctx: AudioContext | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  public enabled = true;

  private initCtx() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) this.ctx = new AudioCtx();
  }

  public startEngine() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      if (this.engineOsc) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(55, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(340, now);

      gain.gain.setValueAtTime(0.04, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      this.engineOsc = osc;
      this.engineGain = gain;
    } catch {}
  }

  public updateEnginePitch(speedRatio: number) {
    if (!this.ctx || !this.engineOsc) return;
    try {
      const now = this.ctx.currentTime;
      const targetFreq = 50 + speedRatio * 80;
      this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.1);
    } catch {}
  }

  public stopEngine() {
    try {
      if (this.engineOsc) {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
        this.engineOsc = null;
      }
      this.engineGain = null;
    } catch {}
  }

  public playCoin() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const now = this.ctx.currentTime;
      const notes = [987.77, 1318.51, 1975.53];
      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.035);
        gain.gain.setValueAtTime(0.16, now + i * 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.035 + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.035);
        osc.stop(now + i * 0.035 + 0.24);
      });
    } catch {}
  }

  public playNitro() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.3);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch {}
  }

  public playCrash() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.32);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch {}
  }

  public playVictory() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const now = this.ctx.currentTime;
      const notes = [587.33, 739.99, 880, 1174.66, 1479.98];
      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.2, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.38);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.4);
      });
    } catch {}
  }
}

interface CarHighwayGameProps {
  onClose: () => void;
  onVictory?: (score: number, stars: number) => void;
  targetScore?: number;
}

type CameraAngle = "straight" | "diagonal";
type CameraGameState = "garage" | "loading" | "playing" | "gameover" | "victory" | "paused";

const GARAGE_CAR_Z = -1.8;
const TRAFFIC_COPIES_PER_CAR = 1;

function getTrafficGap(progress: number) {
  if (progress >= 2 / 3) return 30;
  if (progress >= 1 / 3) return 42;
  return 56;
}

function applyCameraPose(
  camera: THREE.PerspectiveCamera,
  angle: CameraAngle,
  gameState: CameraGameState,
  playerZ: number
) {
  const targetZ = gameState === "garage" ? GARAGE_CAR_Z : playerZ;

  if (angle === "diagonal") {
    // Match the straight camera's height and forward visibility while keeping
    // a clear three-quarter view of the player's car.
    camera.position.set(3.4, 3.8, targetZ + 7.0);
    camera.lookAt(0, 0.45, targetZ - 1.2);
    return;
  }

  // Centered rear view: high and far enough back to keep all four lanes visible.
  camera.position.set(0, 3.8, targetZ + 7.0);
  camera.lookAt(0, 0.45, targetZ - 1.2);
}

export default function CarHighwayGame({
  onClose,
  onVictory,
  targetScore = 600, // Doubled duration for long satisfying race!
}: CarHighwayGameProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const audioSysRef = useRef<CarAudioSystem>(new CarAudioSystem());

  const [selectedCarIndex, setSelectedCarIndex] = useState(0);
  const selectedCar = CARS[selectedCarIndex];

  const [gameState, setGameState] = useState<CameraGameState>("garage");
  const [score, setScore] = useState(0);
  const [starsCount, setStarsCount] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [soundMuted, setSoundMuted] = useState(false);
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>("diagonal");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const carPickerRef = useRef<HTMLDivElement | null>(null);
  const { launchInLandscape, getLandscapePointerX, landscapeFrameStyle } = useMobileLandscapeLaunch();

  // Exact 4-lane centers across 10m road (dividers at -2.5, 0.0, +2.5)
  const LANES = [-3.75, -1.25, 1.25, 3.75];

  const gameRef = useRef({
    running: false,
    score: 0,
    stars: 0,
    hearts: 3,
    baseSpeed: 34,
    speed: 34,
    displayedSpeedMultiplier: 1.0,
    speedPenalty: 1.0,
    targetX: 1.25,
    playerX: 1.25,
    playerZ: -4.2,
    jumpY: 0,
    roadWidth: 10.0,
    roadLength: 500,
    spawnHeart: null as any,
    roadShaderMat: null as THREE.MeshStandardMaterial | null,
    
    roadOffset: 0,
    invincibleTimer: 0,
    hasSpawned50: false,
    hasSpawned75: false,
    currentCameraAngle: "diagonal",
    gameState: "garage",
    selectedCarId: "porsche" as CarId,
    items: [] as Array<{
      mesh: THREE.Object3D;
      type: "coin" | "nitro" | "traffic" | "heart";
      lane: number;
      z: number;
      collected: boolean;
      radius: number;
      speedFactor?: number;
      trafficCarId?: CarId;
    }>,
    buildings: null as THREE.InstancedMesh | null,
    carRoot: null as THREE.Group | null,
    turntableMesh: null as THREE.Mesh | null,
    speedLines: null as THREE.LineSegments | null,
    starPoints: null as THREE.Points | null,
    loadedModels: {} as Record<string, THREE.Object3D>,
    loadingModels: {} as Record<string, Promise<THREE.Object3D>>,
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
  });

  const toggleSound = () => {
    audioSysRef.current.enabled = soundMuted;
    setSoundMuted(!soundMuted);
  };

  const toggleCamera = useCallback(() => {
    const nextAngle: CameraAngle = gameRef.current.currentCameraAngle === "straight" ? "diagonal" : "straight";
    gameRef.current.currentCameraAngle = nextAngle;
    setCameraAngle(nextAngle);

    if (gameRef.current.camera) {
      applyCameraPose(
        gameRef.current.camera,
        nextAngle,
        gameRef.current.gameState as CameraGameState,
        gameRef.current.playerZ
      );
    }
  }, []);

  const handleLaunchRace = () => {
    if (!gameRef.current.carRoot) return;

    if (gameRef.current.camera) {
      // Camera interpolates automatically in animate loop
      // Camera interpolates automatically in animate loop
    }

    if (gameRef.current.carRoot) {
      gameRef.current.carRoot.position.set(1.25, 0.04, gameRef.current.playerZ);
      gameRef.current.carRoot.rotation.set(0, 0, 0);
    }
    gameRef.current.targetX = 1.25;
    gameRef.current.playerX = 1.25;
    gameRef.current.jumpY = 0;
    gameRef.current.speedPenalty = 1.0;
    gameRef.current.invincibleTimer = 0;
    gameRef.current.hasSpawned50 = false;
    gameRef.current.hasSpawned75 = false;
    let visibleTrafficIndex = 0;
    gameRef.current.items.forEach((item) => {
      if (item.type === "traffic") {
        const isVisibleTraffic = item.trafficCarId !== gameRef.current.selectedCarId;
        item.mesh.visible = isVisibleTraffic;
        if (isVisibleTraffic) {
          item.mesh.position.z = -70 - visibleTrafficIndex * getTrafficGap(0);
          item.mesh.position.x = LANES[Math.floor(Math.random() * LANES.length)];
          visibleTrafficIndex += 1;
        }
      }
    });

    if (gameRef.current.turntableMesh) {
      gameRef.current.turntableMesh.visible = false;
    }

    audioSysRef.current.startEngine();
    gameRef.current.gameState = "playing";
    setGameState("playing");
    setHasInteracted(true);
    gameRef.current.running = true;
  };

  const requestLaunchRace = () => {
    if (!modelsReady) return;
    void launchInLandscape(handleLaunchRace);
  };

  useEffect(() => {
    const selectedButton = carPickerRef.current?.querySelector<HTMLElement>(`[data-car-index="${selectedCarIndex}"]`);
    selectedButton?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selectedCarIndex]);

  const handleBackToGarage = useCallback(() => {
    gameRef.current.currentCameraAngle = "diagonal";
    setCameraAngle("diagonal");
    audioSysRef.current.stopEngine();
    gameRef.current.running = false;
    setScore(0);
    setStarsCount(0);
    setHearts(3);
    setSpeedMultiplier(1.0);
    gameRef.current.displayedSpeedMultiplier = 1.0;
    gameRef.current.score = 0;
    gameRef.current.stars = 0;
    gameRef.current.hearts = 3;
    gameRef.current.speed = gameRef.current.baseSpeed;
    gameRef.current.speedPenalty = 1.0;
    gameRef.current.playerX = 1.25;
    gameRef.current.targetX = 1.25;
    gameRef.current.jumpY = 0;
    gameRef.current.invincibleTimer = 0;
    gameRef.current.items.forEach((item) => {
      if (item.type === "traffic") item.mesh.visible = false;
    });

    gameRef.current.gameState = "garage";
    if (gameRef.current.camera) {
      applyCameraPose(gameRef.current.camera, "diagonal", "garage", gameRef.current.playerZ);
    }

    if (gameRef.current.carRoot) {
      gameRef.current.carRoot.position.set(0, 0.2, -1.8);
      gameRef.current.carRoot.rotation.set(0, 0.35, 0);
    }

    if (gameRef.current.turntableMesh) {
      gameRef.current.turntableMesh.visible = true;
    }

    setGameState("garage");
  }, []);

  const togglePause = useCallback(() => {
    if (gameState === "playing") {
      gameRef.current.gameState = "paused";
      setGameState("paused");
      gameRef.current.running = false;
      audioSysRef.current.stopEngine();
    } else if (gameState === "paused") {
      gameRef.current.gameState = "playing";
      setGameState("playing");
      gameRef.current.running = true;
      audioSysRef.current.startEngine();
    }
  }, [gameState]);

  const handleRestartRace = useCallback(() => {
    gameRef.current.currentCameraAngle = "diagonal";
    setCameraAngle("diagonal");
    setScore(0);
    setStarsCount(0);
    setHearts(3);
    setSpeedMultiplier(1.0);
    gameRef.current.displayedSpeedMultiplier = 1.0;
    gameRef.current.score = 0;
    gameRef.current.stars = 0;
    gameRef.current.hearts = 3;
    gameRef.current.speed = gameRef.current.baseSpeed;
    gameRef.current.speedPenalty = 1.0;
    gameRef.current.playerX = 1.25;
    gameRef.current.targetX = 1.25;
    gameRef.current.jumpY = 0;
    gameRef.current.invincibleTimer = 0;

    gameRef.current.gameState = "playing";
    if (gameRef.current.camera) {
      applyCameraPose(gameRef.current.camera, "diagonal", "playing", gameRef.current.playerZ);
    }

    if (gameRef.current.carRoot) {
      gameRef.current.carRoot.position.set(1.25, 0.04, gameRef.current.playerZ);
      gameRef.current.carRoot.rotation.set(0, 0, 0);
    }

    let trafficIndex = 0;
    gameRef.current.items.forEach((item, idx) => {
      if (item.type === "traffic") {
        const isVisibleTraffic = item.trafficCarId !== gameRef.current.selectedCarId;
        item.mesh.visible = isVisibleTraffic;
        if (isVisibleTraffic) {
          item.mesh.position.z = -70 - trafficIndex * getTrafficGap(0);
          item.mesh.position.x = LANES[Math.floor(Math.random() * LANES.length)];
          trafficIndex += 1;
        }
      } else {
        item.mesh.position.z = -35 - idx * 28 - Math.random() * 5;
        item.mesh.visible = true;
      }
      item.collected = false;
    });

    audioSysRef.current.startEngine();
    setGameState("playing");
    gameRef.current.running = true;
  }, []);

  const getCarModel = useCallback((car: CarInfo) => {
    if (gameRef.current.loadedModels[car.id]) {
      return Promise.resolve(gameRef.current.loadedModels[car.id]);
    }
    if (gameRef.current.loadingModels[car.id]) {
      return gameRef.current.loadingModels[car.id];
    }
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    const loading = new Promise<THREE.Object3D>((resolve, reject) => {
      loader.load(car.modelPath, (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = car.scale / maxDim;

        model.scale.set(scale, scale, scale);

        model.position.set(
          -center.x * scale,
          -box.min.y * scale + car.yOffset,
          -center.z * scale
        );

        model.rotation.y = car.rotationY;

        // Nissan's source pivot is off-center after its required quarter-turn.
        // Recenter the rotated bounds without changing the models that are
        // already approved in the garage.
        if (car.id === "nissan") {
          model.updateMatrixWorld(true);
          const rotatedBox = new THREE.Box3().setFromObject(model);
          const rotatedCenter = rotatedBox.getCenter(new THREE.Vector3());
          model.position.x -= rotatedCenter.x;
          model.position.z -= rotatedCenter.z;
        }

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (mat && car.id === "lambo") {
              mat.roughness = 0.22;
              mat.metalness = 0.85;
              if (mat.color.r < 0.18 && mat.color.g < 0.18 && mat.color.b < 0.18) {
                mat.color.setHex(0x384152);
              }
            }
          }
        });

        gameRef.current.loadedModels[car.id] = model;
        resolve(model);
      }, undefined, reject);
    }).finally(() => {
      delete gameRef.current.loadingModels[car.id];
    });

    gameRef.current.loadingModels[car.id] = loading;
    return loading;
  }, []);

  // Strict car switcher. Clones share optimized geometry and textures, so the
  // player and traffic do not duplicate heavy GPU assets.
  const switchCarModel = useCallback(async (car: CarInfo) => {
    try {
      const model = await getCarModel(car);
      if (!gameRef.current.carRoot || gameRef.current.selectedCarId !== car.id) return;
      while (gameRef.current.carRoot.children.length > 0) {
        gameRef.current.carRoot.remove(gameRef.current.carRoot.children[0]);
      }
      gameRef.current.carRoot.add(cloneSkeleton(model));
    } catch (err) {
      console.error("Car load error:", err);
    }
  }, [getCarModel]);

  useEffect(() => {
    gameRef.current.selectedCarId = selectedCar.id;
    gameRef.current.items.forEach((item) => {
      if (item.type === "traffic") {
        item.mesh.visible = gameRef.current.gameState !== "garage" && !item.collected && item.trafficCarId !== selectedCar.id;
      }
    });
    switchCarModel(selectedCar);
  }, [selectedCar, switchCarModel]);


  useEffect(() => {
    gameRef.current.currentCameraAngle = cameraAngle;
  }, [cameraAngle]);
  useEffect(() => {
    gameRef.current.gameState = gameState;
  }, [gameState]);

  useEffect(() => {
    if (!mountRef.current) return;
    setModelsReady(false);
    const container = mountRef.current;
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a101f, 0.006); // Dark clean atmospheric night fog
    gameRef.current.scene = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(56, width / height, 0.1, 500);
    applyCameraPose(camera, "diagonal", "garage", gameRef.current.playerZ);
    gameRef.current.camera = camera;

    // 3. Renderer
    const mobilePerformanceMode = window.matchMedia("(pointer: coarse)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: !mobilePerformanceMode, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    // Mobile browsers otherwise render several times more physical pixels than
    // the landscape viewport needs. 1.35 improves edge clarity while keeping
    // most of the mobile GPU headroom recovered by the traffic/city pass.
    renderer.setPixelRatio(mobilePerformanceMode ? 1.35 : Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // 4. Twilight Crimson Sunset Sky & Starfield
    const skyDome = createSunsetSky();
    scene.add(skyDome);

    // Starfield in upper night sky
    const starCount = 800;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 400;
      starPositions[i + 1] = 5 + Math.random() * 250;
      starPositions[i + 2] = (Math.random() - 0.5) * 400;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.9,
      transparent: true,
      opacity: 0.9,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);
    gameRef.current.starPoints = starPoints;

    // 5. Clean, Natural City Lighting (No artificial pink staining!)
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0f172a, 2.2); // Clean cool sky / dark ground
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.6); // Clean neutral key light
    sunLight.position.set(25, 45, -15);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.0); // Crisp cyan rim light
    rimLight.position.set(-25, 20, 20);
    scene.add(rimLight);

    const spotLight = new THREE.SpotLight(0xffffff, 4.0, 30, Math.PI / 4, 0.3);
    spotLight.position.set(0, 12, -1.8);
    spotLight.target.position.set(0, 0, -1.8);
    scene.add(spotLight);
    scene.add(spotLight.target);

    // 6. Solid Single-Pass Analytical Highway Plane (100% Z-Fighting Free, Zero Moire!)
    const roadWidth = 10.0;
    const roadLength = 500;

    const roadTex = generateAsphaltTexture(renderer);
    const roadShaderMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.8,
      metalness: 0.1,
    });
    gameRef.current.roadShaderMat = roadShaderMat;

    const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength, 1, 1);
    const roadMesh = new THREE.Mesh(roadGeo, roadShaderMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, -roadLength / 2 + 20);
    scene.add(roadMesh);

    // Guardrails
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.9,
      metalness: 0.9,
      roughness: 0.15,
    });
    const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, roadLength), railMat);
    leftRail.position.set(-roadWidth / 2 - 0.175, 0.3, -roadLength / 2 + 20);
    scene.add(leftRail);

    const rightRail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, roadLength), railMat);
    rightRail.position.set(roadWidth / 2 + 0.175, 0.3, -roadLength / 2 + 20);
    scene.add(rightRail);

    // Bridge Bed Understructure
    const bridgeBedMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.95 });
    const bridgeBed = new THREE.Mesh(new THREE.BoxGeometry(roadWidth + 1.2, 2.0, roadLength), bridgeBedMat);
    bridgeBed.position.set(0, -1.1, -roadLength / 2 + 20);
    scene.add(bridgeBed);

    // Bridge Piers
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x141028, roughness: 0.95 });
    const piers = new THREE.InstancedMesh(new THREE.BoxGeometry(3.5, 40, 3.5), pillarMat, 14);
    const pierTransform = new THREE.Object3D();
    for (let p = 0; p < 14; p++) {
      pierTransform.position.set(0, -21.0, -p * 35);
      pierTransform.updateMatrix();
      piers.setMatrixAt(p, pierTransform.matrix);
    }
    piers.instanceMatrix.needsUpdate = true;
    scene.add(piers);

    // 7. Active Glowing Night Skyscrapers
    const bldgTex = generateSkyscraperTexture();
    const bldgMat = new THREE.MeshStandardMaterial({
      map: bldgTex,
      emissiveMap: bldgTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.35,
      roughness: 0.5,
      metalness: 0.2,
    });

    const numBuildings = 36;
    const cityLoopLength = 280;
    const buildings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bldgMat, numBuildings * 2);
    const buildingTransform = new THREE.Object3D();
    for (let i = 0; i < numBuildings; i++) {
      const h = 32 + Math.random() * 55;
      const wBldg = 10 + Math.random() * 8;
      const isRight = i % 2 === 0;
      const x = isRight ? 14.0 + (i % 4) * 3.0 : -14.0 - (i % 4) * 3.0;
      const z = -Math.floor(i / 2) * 16 - Math.random() * 6;
      [z, z - cityLoopLength].forEach((instanceZ, copyIndex) => {
        buildingTransform.position.set(x, h / 2 - 6, instanceZ);
        buildingTransform.scale.set(wBldg, h, wBldg);
        buildingTransform.updateMatrix();
        buildings.setMatrixAt(i + copyIndex * numBuildings, buildingTransform.matrix);
      });
    }
    buildings.instanceMatrix.needsUpdate = true;
    scene.add(buildings);
    gameRef.current.buildings = buildings;

    // Glowing Turntable in Garage Mode
    const turntableGeo = new THREE.CylinderGeometry(2.6, 2.7, 0.15, 32);
    const turntableMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35,
      metalness: 0.9,
      roughness: 0.2,
    });
    const turntableMesh = new THREE.Mesh(turntableGeo, turntableMat);
    turntableMesh.position.set(0, 0.08, -1.8);
    scene.add(turntableMesh);
    gameRef.current.turntableMesh = turntableMesh;

    // Speed Lines
    const lineCount = 70;
    const linePositions: number[] = [];
    for (let i = 0; i < lineCount; i++) {
      const x = (Math.random() - 0.5) * roadWidth;
      const y = 0.5 + Math.random() * 4.5;
      const z = -Math.random() * 140;
      linePositions.push(x, y, z);
      linePositions.push(x, y, z - 10);
    }
    const speedLinesGeo = new THREE.BufferGeometry();
    speedLinesGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    const speedLinesMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
    });
    const speedLines = new THREE.LineSegments(speedLinesGeo, speedLinesMat);
    scene.add(speedLines);
    gameRef.current.speedLines = speedLines;

    // 8. Car Player Root
    const carRoot = new THREE.Group();
    carRoot.position.set(0, 0.2, -1.8);
    carRoot.rotation.set(0, 0.35, 0);
    scene.add(carRoot);
    gameRef.current.carRoot = carRoot;

    switchCarModel(CARS[selectedCarIndex]);

    // 9. Deterministic Obstacles & Collectibles
    const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.14, 20);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.95,
      metalness: 0.9,
      roughness: 0.1,
    });

    const nitroGeo = new THREE.OctahedronGeometry(0.55, 0);
    const nitroMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.0,
      metalness: 0.95,
      roughness: 0.05,
    });

    const heartGeo = new THREE.IcosahedronGeometry(0.7, 0);
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0x10b981, // emerald
      emissive: 0x059669,
      emissiveIntensity: 1.2,
      metalness: 0.9,
      roughness: 0.1,
    });
    gameRef.current.spawnHeart = () => {
      const mesh = new THREE.Mesh(heartGeo, heartMat);
      const lane = LANES[Math.floor(Math.random() * LANES.length)];
      mesh.position.set(lane, 1.0, -105); // appears soon after each milestone
      scene.add(mesh);
      gameRef.current.items.push({
        mesh, type: "heart", lane, z: -105, collected: false, radius: 1.0
      });
    };
    const itemsPool: typeof gameRef.current.items = [];
    const numRows = 24;

    for (let r = 0; r < numRows; r++) {
      const zPos = -35 - r * 28;
      const rewardLane = LANES[Math.floor(Math.random() * LANES.length)];
      const isNitro = Math.random() < 0.25;

      let rewardMesh: THREE.Object3D;
      let rewardType: "coin" | "nitro" | "heart" = isNitro ? "nitro" : "coin";
      if (isNitro) {
        rewardMesh = new THREE.Mesh(nitroGeo, nitroMat);
        rewardMesh.position.set(rewardLane, 0.85, zPos);
      } else {
        rewardMesh = new THREE.Mesh(coinGeo, coinMat);
        rewardMesh.rotation.z = Math.PI / 2;
        rewardMesh.position.set(rewardLane, 0.7, zPos);
      }
      scene.add(rewardMesh);
      itemsPool.push({
        mesh: rewardMesh,
        type: rewardType,
        lane: rewardLane,
        z: zPos,
        collected: false,
        radius: 0.75,
      });
    }
    gameRef.current.items = itemsPool;

    // Every non-selected supercar becomes slow traffic. Models are cloned
    // from the same optimized assets as the player car, keeping mobile memory
    // use low. The 55m spacing is intentionally much larger than the former
    // barrier spacing so a child has time to swipe around a full-length car.
    Array.from({ length: CARS.length * TRAFFIC_COPIES_PER_CAR }, (_, index) => ({
      trafficCar: CARS[index % CARS.length],
      index,
    })).forEach(({ trafficCar, index }) => {
      getCarModel(trafficCar).then((model) => {
        // Ignore a model that finished loading for a React/Three scene that
        // has already been replaced. Otherwise it becomes an invisible but
        // collidable object in the new run.
        if (gameRef.current.scene !== scene) return;
        const trafficMesh = new THREE.Group();
        trafficMesh.add(cloneSkeleton(model));
        const lane = LANES[Math.floor(Math.random() * LANES.length)];
        const z = -70 - index * getTrafficGap(0);
        trafficMesh.position.set(lane, 0.04, z);
        trafficMesh.visible =
          gameRef.current.gameState !== "garage" &&
          trafficCar.id !== gameRef.current.selectedCarId;
        scene.add(trafficMesh);
        gameRef.current.items.push({
          mesh: trafficMesh,
          type: "traffic",
          lane,
          z,
          collected: false,
          radius: 1.05,
          speedFactor: 0.72,
          trafficCarId: trafficCar.id,
        });
      }).catch((err) => console.error("Traffic car load error:", err));
    });

    // Finish model decoding and GPU preparation in the garage. Letting a new
    // traffic model finish during the race causes a visible hitch on Android.
    void Promise.all(CARS.map((car) => getCarModel(car))).then(() => {
      if (gameRef.current.scene === scene) setModelsReady(true);
    }).catch((err) => console.error("Car preload error:", err));

    // 10. Controls
    let isPointerDown = false;
    let startPointerX = 0;
    let startPlayerX = 0;

    const onPointerDown = (e: PointerEvent) => {
      isPointerDown = true;
      startPointerX = getLandscapePointerX(e.clientX, e.clientY);
      startPlayerX = gameRef.current.targetX;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDown) return;
      const pointerX = getLandscapePointerX(e.clientX, e.clientY);
      const deltaX = pointerX - startPointerX;
      const landscapeWidth = Math.max(window.innerWidth, window.innerHeight);
      const sensitivity = (LANES[LANES.length - 1] - LANES[0]) / Math.max(120, landscapeWidth / 3);
      const maxX = roadWidth / 2 - 0.9;
      gameRef.current.targetX = THREE.MathUtils.clamp(
        startPlayerX + deltaX * sensitivity,
        -maxX,
        maxX
      );
    };

    const onPointerUp = () => {
      isPointerDown = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      let closestIdx = 0;
      let minDiff = 999;
      LANES.forEach((laneX, i) => {
        const diff = Math.abs(gameRef.current.targetX - laneX);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      });

      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        const nextIdx = Math.max(0, closestIdx - 1);
        gameRef.current.targetX = LANES[nextIdx];
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        const nextIdx = Math.min(LANES.length - 1, closestIdx + 1);
        gameRef.current.targetX = LANES[nextIdx];
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);

    const onResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", onResize);

    // 11. Main 60 FPS Loop
    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();

      if (gameRef.current.gameState === "garage" && carRoot) {
        carRoot.rotation.y = time * 0.45;
        if (turntableMesh) turntableMesh.rotation.y = time * 0.45;
      }

      if (gameRef.current.speedLines) {
        const positions = gameRef.current.speedLines.geometry.attributes.position.array as Float32Array;
        for (let i = 2; i < positions.length; i += 3) {
          positions[i] += delta * 65;
          if (positions[i] > 10) positions[i] = -140;
        }
        gameRef.current.speedLines.geometry.attributes.position.needsUpdate = true;
      }

      if (gameRef.current.starPoints) {
        gameRef.current.starPoints.rotation.y = time * 0.01;
      }

      // Camera remains interactive even while the simulation is stopped in
      // the garage or paused. Applying an absolute pose also prevents drift
      // after a restart, crash, or return to the garage.
      applyCameraPose(
        camera,
        gameRef.current.currentCameraAngle as CameraAngle,
        gameRef.current.gameState as CameraGameState,
        gameRef.current.playerZ
      );

      if (gameRef.current.running) {
        // Quick 1.2-second recovery after impact
        if (gameRef.current.speedPenalty < 1.0) {
          gameRef.current.speedPenalty = Math.min(1.0, gameRef.current.speedPenalty + delta * 0.6);
        }

        // Progressive gentle speed curve: 1.0x -> max 1.25x over 600 points (full 60 seconds duration!)
        const speedFactor = 1.0 + Math.min(gameRef.current.score / 500, 0.25);
        const effectiveSpeed = gameRef.current.baseSpeed * speedFactor * gameRef.current.speedPenalty;
        gameRef.current.speed = effectiveSpeed;

        const nextSpeedMultiplier = parseFloat((speedFactor * gameRef.current.speedPenalty).toFixed(1));
        if (nextSpeedMultiplier !== gameRef.current.displayedSpeedMultiplier) {
          gameRef.current.displayedSpeedMultiplier = nextSpeedMultiplier;
          setSpeedMultiplier(nextSpeedMultiplier);
        }
        audioSysRef.current.updateEnginePitch(speedFactor * gameRef.current.speedPenalty);

        const moveDist = effectiveSpeed * delta;
        if (gameRef.current.score >= targetScore * 0.5 && !gameRef.current.hasSpawned50) {
          gameRef.current.hasSpawned50 = true;
          if (gameRef.current.spawnHeart) gameRef.current.spawnHeart();
        }
        if (gameRef.current.score >= targetScore * 0.75 && !gameRef.current.hasSpawned75) {
          gameRef.current.hasSpawned75 = true;
          if (gameRef.current.spawnHeart) gameRef.current.spawnHeart();
        }

        // Smooth Texture Scrolling
        if (gameRef.current.roadShaderMat) {
          gameRef.current.roadOffset += (effectiveSpeed / 500.0) * delta;
          if (gameRef.current.roadShaderMat.map) { gameRef.current.roadShaderMat.map.offset.y = -(gameRef.current.roadOffset * 100); }
        }

        // Move active skyscrapers
        if (gameRef.current.buildings) {
          gameRef.current.buildings.position.z += moveDist;
          if (gameRef.current.buildings.position.z >= cityLoopLength) {
            gameRef.current.buildings.position.z -= cityLoopLength;
          }
        }

        // Smooth Car Steering
        const dx = gameRef.current.targetX - gameRef.current.playerX;
        gameRef.current.playerX += dx * 0.12; // buttery smooth independent of minor delta spikes
        carRoot.position.x = gameRef.current.playerX;
        carRoot.position.z = gameRef.current.playerZ;

        // Jump impulse decay
        if (gameRef.current.jumpY > 0) {
          gameRef.current.jumpY = Math.max(0, gameRef.current.jumpY - delta * 2.2);
        }

        const steerRoll = -dx * 0.09;
        carRoot.rotation.z = THREE.MathUtils.lerp(carRoot.rotation.z, steerRoll, delta * 14);
        carRoot.rotation.y = THREE.MathUtils.lerp(carRoot.rotation.y, dx * 0.15, delta * 12);
        carRoot.position.y = 0.04 + gameRef.current.jumpY + Math.sin(time * 30) * 0.008;

        // Fast 2-blink collision feedback (0.7s total duration, only 2 quick blinks!)
        if (gameRef.current.invincibleTimer > 0) {
          gameRef.current.invincibleTimer -= delta;
          const blinkPhase = Math.floor((0.7 - gameRef.current.invincibleTimer) * 5.7);
          carRoot.visible = blinkPhase % 2 === 0;
        } else {
          carRoot.visible = true;
        }

        // Move road items
        const resetThresholdZ = 10;
        const respawnZ = -300;

        gameRef.current.items.forEach((item) => {
          item.mesh.position.z += moveDist * (item.speedFactor ?? 1);

          if (item.type === "coin" || item.type === "nitro" || item.type === "heart") {
            item.mesh.rotation.y += delta * 4.0;
          }

          // Collision Check
          if (
            !item.collected &&
            item.mesh.visible &&
            item.mesh.parent === scene &&
            item.mesh.position.z > gameRef.current.playerZ - 1.2 &&
            item.mesh.position.z < gameRef.current.playerZ + 1.6 &&
            Math.abs(item.mesh.position.x - gameRef.current.playerX) < (item.type === "traffic" ? 1.28 : item.radius)
          ) {
            if (item.type === "coin" || item.type === "nitro" || item.type === "heart") {
              item.collected = true;
              item.mesh.visible = false;
              if (item.type === "heart") {
                if (gameRef.current.hearts < 3) gameRef.current.hearts++;
                setHearts(gameRef.current.hearts);
                audioSysRef.current.playCoin(); // play sound
              } else if (item.type === "coin") {
                gameRef.current.score += 5; // Balanced point distribution for full 60s runtime
                gameRef.current.stars += 1;
                audioSysRef.current.playCoin();
              } else {
                gameRef.current.score += 10; // Balanced nitro points
                gameRef.current.stars += 2;
                audioSysRef.current.playNitro();
              }
              setScore(gameRef.current.score);
              setStarsCount(gameRef.current.stars);

              if (gameRef.current.score >= targetScore) {
                gameRef.current.running = false;
                audioSysRef.current.stopEngine();
                setGameState("victory");
                audioSysRef.current.playVictory();
                confetti({
                  particleCount: 100,
                  spread: 85,
                  origin: { y: 0.6 },
                });
                if (onVictory) onVictory(gameRef.current.score, gameRef.current.stars);
              }
            } else if (item.type === "traffic") {
              if (gameRef.current.invincibleTimer <= 0) {
                gameRef.current.hearts -= 1;
                gameRef.current.invincibleTimer = 0.7; // Fast 0.7s: 2 quick blinks!
                gameRef.current.speedPenalty = 0.55; // Quick speed drop, recovers in 1.2s
                gameRef.current.jumpY = 0.35; // Bouncy shock jump
                audioSysRef.current.playCrash();
                setHearts(gameRef.current.hearts);

                if (gameRef.current.hearts <= 0) {
                  gameRef.current.running = false;
                  audioSysRef.current.stopEngine();
                  setGameState("gameover");
                }
              }
            }
          }

          if (item.mesh.position.z > resetThresholdZ) {
          if (item.type === "heart") {
            item.mesh.visible = false;
            return; // Hearts don't recycle
          }
            if (item.type === "traffic") {
              const progress = Math.min(gameRef.current.score / targetScore, 1);
              const farthestTrafficZ = gameRef.current.items.reduce((farthest, candidate) => {
                if (
                  candidate.type !== "traffic" ||
                  candidate === item ||
                  candidate.trafficCarId === gameRef.current.selectedCarId ||
                  candidate.mesh.parent !== scene
                ) return farthest;
                return Math.min(farthest, candidate.mesh.position.z);
              }, respawnZ);
              item.mesh.position.z = farthestTrafficZ - getTrafficGap(progress);
            } else {
              item.mesh.position.z = respawnZ - Math.random() * 40;
            }
            const laneIndex = Math.floor(Math.random() * LANES.length);
            item.mesh.position.x = LANES[laneIndex];
            item.collected = false;
            item.mesh.visible = item.type !== "traffic" || item.trafficCarId !== gameRef.current.selectedCarId;
          }
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (gameRef.current.scene === scene) gameRef.current.scene = null;
      audioSysRef.current.stopEngine();
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (dom.parentElement) {
        dom.parentElement.removeChild(dom);
      }
    };
  }, [targetScore, onVictory, switchCarModel, getLandscapePointerX]);

  return (
    <div className={`fixed z-50 bg-slate-950 flex flex-col items-center justify-center select-none overflow-hidden touch-none ${landscapeFrameStyle ? "" : "inset-0"}`} style={landscapeFrameStyle}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* TOP CONTROLS & CLOSE BUTTON (ALWAYS VISIBLE IN ALL STATES) */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        <button
          onClick={toggleSound}
          aria-label="Звук"
          className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/90 hover:text-white flex items-center justify-center transition-all shadow-xl active:scale-95 cursor-pointer"
        >
          {soundMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {(gameState === "playing" || gameState === "paused") && (
          <button
            onClick={togglePause}
            aria-label="Пауза"
            className="w-11 h-11 rounded-full bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all shadow-xl active:scale-95 cursor-pointer"
          >
            {gameState === "paused" ? <PlayIcon size={18} className="fill-current" /> : <Pause size={18} className="fill-current" />}
          </button>
        )}

        <button
          onClick={toggleCamera}
          aria-label="Смена Камеры"
          className="w-11 h-11 rounded-full bg-indigo-600/80 hover:bg-indigo-600 backdrop-blur-md border border-indigo-400/40 text-white flex items-center justify-center transition-all shadow-xl active:scale-95 cursor-pointer"
        >
          <Video size={18} />
        </button>

        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="w-11 h-11 rounded-full bg-rose-600/80 hover:bg-rose-600 backdrop-blur-md border border-rose-400/40 text-white flex items-center justify-center transition-all shadow-xl active:scale-95 cursor-pointer"
        >
          <X size={22} strokeWidth={2.5} />
        </button>
      </div>

      {/* HUD BAR DURING RACE */}
      {gameState === "playing" && (
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2 pointer-events-none">
          <div className="px-3.5 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center gap-1.5 text-white shadow-xl pointer-events-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                size={18}
                className={i < hearts ? "text-rose-500 fill-rose-500 animate-pulse" : "text-slate-600"}
              />
            ))}
          </div>

          <div className="px-3.5 py-2 rounded-full bg-amber-950/70 backdrop-blur-md border border-amber-400/30 flex items-center gap-1 text-amber-300 font-extrabold text-xs shadow-xl pointer-events-auto">
            <Zap size={14} className="text-amber-400 fill-amber-400" />
            <span>{speedMultiplier}x</span>
          </div>

          <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-amber-400/30 flex items-center gap-2 text-white shadow-xl pointer-events-auto">
            <Sparkles size={16} className="text-amber-400 animate-spin" />
            <span className="font-black text-sm sm:text-base text-amber-300 tracking-wider">
              {score}
            </span>
            <span className="text-xs text-slate-400">/ {targetScore}</span>
          </div>
        </div>
      )}

      {/* GARAGE / CAR SELECTION */}
      {gameState === "garage" && (
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 pointer-events-none">
          <div className="pt-2 text-center pointer-events-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-widest shadow-xl">
              <Gauge size={14} className="text-amber-400" />
              <span>Турбо Драйв • Гараж Суперкаров</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1.5 drop-shadow-lg">
              {selectedCar.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-semibold drop-shadow">
              {selectedCar.subtitle}
            </p>
          </div>

          <div className="w-full max-w-2xl mx-auto flex flex-col gap-3 pointer-events-auto pb-2">
            <div ref={carPickerRef} className="w-[min(42vw,330px)] sm:w-full ml-auto mr-5 sm:mx-auto flex gap-2 sm:gap-3 overflow-x-auto px-[calc(50%_-_46px)] sm:px-0 pb-1 snap-x snap-mandatory justify-start sm:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CARS.map((car, idx) => {
                const isSelected = idx === selectedCarIndex;
                return (
                  <button
                    key={car.id}
                    data-car-index={idx}
                    onClick={() => setSelectedCarIndex(idx)}
                    className={`relative w-[92px] sm:w-28 shrink-0 snap-center rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 flex flex-col items-center justify-between transition-all cursor-pointer border-2 min-h-[62px] sm:min-h-[106px] ${
                      isSelected
                        ? "bg-slate-900/90 border-amber-400 shadow-xl shadow-amber-500/25 scale-[1.03]"
                        : "bg-slate-950/70 border-white/10 opacity-75 hover:opacity-100 hover:border-white/30"
                    }`}
                  >
                    <div className="w-full h-10 sm:h-auto sm:aspect-[16/10] rounded-lg sm:rounded-xl overflow-hidden flex items-center justify-center p-0.5 sm:p-1 bg-black/40">
                      {car.imgPath ? (
                        <img
                          src={car.imgPath}
                          alt={car.name}
                          className="w-full h-full object-contain drop-shadow-lg"
                        />
                      ) : (
                        <div className="w-full h-full rounded-lg bg-gradient-to-br from-slate-700 via-slate-900 to-black flex items-center justify-center text-amber-300 font-black text-lg tracking-tight border border-white/10">
                          {car.badge}
                        </div>
                      )}
                    </div>

                    <div className="text-center mt-0.5 sm:mt-1.5 w-full">
                      <p className="text-[9px] sm:text-xs font-black text-white truncate">
                        {car.name}
                      </p>
                      <div className="hidden sm:flex items-center justify-center gap-2 mt-0.5 text-[10px] text-slate-400 font-bold">
                        <span>⚡ {car.speedStat}</span>
                        <span>🎯 {car.handlingStat}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 w-full"><button
              onClick={toggleCamera}
              className="w-14 sm:w-16 h-14 sm:h-16 shrink-0 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-white/10 flex items-center justify-center text-indigo-400 transition-all active:scale-95 shadow-xl cursor-pointer"
              title="Смена ракурса камеры"
            >
              <Video size={22} />
            </button>
            <button
              onClick={requestLaunchRace}
              disabled={!modelsReady}
              className={`flex-1 h-14 sm:h-16 rounded-2xl text-slate-950 font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all uppercase tracking-wider ${modelsReady ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 shadow-amber-500/30 cursor-pointer" : "bg-slate-400 text-slate-700 cursor-wait"}`}
            >
              <Play size={22} className="fill-current" />
              <span>{modelsReady ? "Погнали на трассу! 🏁" : "Готовим машины…"}</span>
            </button></div>
          </div>
        </div>
      )}

            {/* PAUSE OVERLAY */}
      <AnimatePresence>
        {gameState === "paused" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none"
          >
            <div className="text-3xl font-black text-white tracking-widest uppercase drop-shadow-lg mb-8">
              ПАУЗА
            </div>
            <div className="flex gap-4 pointer-events-auto">
              <button
                onClick={togglePause}
                className="h-14 px-8 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-lg flex items-center gap-2 shadow-xl active:scale-95 transition-all cursor-pointer"
              >
                <PlayIcon size={20} className="fill-current" />
                <span>Продолжить</span>
              </button>
              <button
                onClick={handleBackToGarage}
                className="h-14 px-8 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center gap-2 shadow-xl active:scale-95 transition-all cursor-pointer border border-white/10"
              >
                <RotateCcw size={18} />
                <span>В гараж</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING GESTURE HINT */}
      {gameState === "playing" && !hasInteracted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-12 z-20 pointer-events-none px-6 py-3 rounded-2xl bg-black/75 backdrop-blur-md border border-amber-400/40 text-white shadow-2xl flex items-center gap-3"
        >
          <span className="text-2xl animate-bounce">👆</span>
          <div className="text-left">
            <p className="text-xs font-black text-amber-300 uppercase tracking-wider">
              Управление
            </p>
            <p className="text-sm font-bold text-slate-100">
              Свайпай влево ⇄ вправо для перестроения
            </p>
          </div>
        </motion.div>
      )}

      {/* VICTORY MODAL */}
      <AnimatePresence>
        {gameState === "victory" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="absolute z-30 p-6 sm:p-8 max-w-md w-full mx-4 rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-amber-400/40 text-white text-center shadow-2xl flex flex-col items-center gap-4"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center shadow-xl shadow-amber-500/30 animate-bounce">
              <Trophy size={40} className="text-slate-950 fill-current" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-xs uppercase tracking-widest border border-amber-500/30">
                Финиш!
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                Гонка выиграна!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Ты показал высший класс пилотажа!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full my-1">
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-white/10 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Очки</p>
                <p className="text-2xl font-black text-amber-400">{score}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-white/10 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Звёзды</p>
                <p className="text-2xl font-black text-yellow-400">+{starsCount} ⭐</p>
              </div>
            </div>

            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={handleBackToGarage}
                className="flex-1 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 font-black text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw size={16} />
                <span>Гараж / Авто</span>
              </button>
              <button
                onClick={onClose}
                className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>Забрать приз 🎁</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GAME OVER MODAL */}
      <AnimatePresence>
        {gameState === "gameover" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="absolute z-30 p-6 sm:p-8 max-w-md w-full mx-4 rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-rose-500/40 text-white text-center shadow-2xl flex flex-col items-center gap-4"
          >
            <div className="w-18 h-18 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-4xl p-3">
              💥
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-rose-400">
                Авария на трассе!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Набрано очков: <strong className="text-white font-black">{score}</strong>. Жми газ снова!
              </p>
            </div>

            <div className="flex flex-col w-full mt-2 gap-3">
              <div className="flex gap-3 w-full">
                <button
                  onClick={handleRestartRace}
                  className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 font-black text-sm text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCcw size={18} />
                  <span>Попробовать снова</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-14 h-14 shrink-0 rounded-2xl bg-rose-600/80 hover:bg-rose-600 backdrop-blur-md border border-rose-400/40 text-white flex items-center justify-center transition-all shadow-lg active:scale-95 cursor-pointer"
                  aria-label="Выйти"
                >
                  <X size={22} strokeWidth={2.5} />
                </button>
              </div>
              <button
                onClick={handleBackToGarage}
                className="w-full h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-white flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all cursor-pointer"
              >
                <span>В гараж 🏎️</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
