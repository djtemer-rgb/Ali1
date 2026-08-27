"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Pause, Play, RotateCcw, Shield, Sparkles, Trophy, Volume2, VolumeX, X, Zap } from "lucide-react";
import confetti from "canvas-confetti";
import { useMobileLandscapeLaunch } from "./MobileLandscapeGate";

type FighterId = "azure" | "solar" | "phantom";
type GameState = "hangar" | "loading" | "playing" | "gameover" | "victory";

interface DreadnoughtBreakthroughGameProps {
  onClose: () => void;
  onVictory?: (score: number, stars: number) => void;
  initialFighter?: FighterId;
}

interface FighterStyle {
  id: FighterId;
  name: string;
  subtitle: string;
  color: number;
  accent: string;
  glow: string;
}

interface Projectile {
  mesh: THREE.Object3D;
  velocity: THREE.Vector3;
  hostile: boolean;
  damage: number;
  radius: number;
}

interface CombatEnemy {
  root: THREE.Group;
  health: number;
  maxHealth: number;
  lane: number;
  targetLane: number;
  timer: number;
  shotTimer: number;
  turnTimer: number;
  turning: boolean;
  turned: boolean;
  boss: boolean;
  spawnGraceUntil: number;
  moveSeed: number;
}

interface Asteroid {
  mesh: THREE.Mesh;
  speed: number;
  radius: number;
  spin: THREE.Vector3;
  health: number;
  fragment: boolean;
  driftX: number;
}

const FIGHTERS: FighterStyle[] = [
  { id: "azure", name: "Лазурный Страж", subtitle: "Синий Class-3 Fighter", color: 0x22d3ee, accent: "from-cyan-400 to-blue-600", glow: "shadow-cyan-500/30" },
  { id: "solar", name: "Ионное Крыло", subtitle: "Зелёный Class-3 Fighter", color: 0xa3e635, accent: "from-lime-400 to-emerald-600", glow: "shadow-lime-500/30" },
  { id: "phantom", name: "Белый Призрак", subtitle: "Белый Class-3 Fighter", color: 0xe2e8f0, accent: "from-slate-200 to-slate-500", glow: "shadow-slate-300/30" },
];

const LANES = [-4.2, -1.4, 1.4, 4.2];
const NORMAL_ENEMY_LANES = [LANES[1], LANES[2]];
const MAX_SHIELD = 18;
const MAX_AMMO = 10;
const CHARGED_SHOT_COST = 7;

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Line)) return;
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material?.dispose());
  });
}

function createLaserBolt(color: number, length: number, radius: number) {
  const group = new THREE.Group();
  const glow = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius * 2.8, length * 1.08, 4, 10),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  const core = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length, 4, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.98, blending: THREE.AdditiveBlending }),
  );
  const aura = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius * 1.55, length * 1.03, 4, 10),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  [glow, aura, core].forEach((part) => { part.rotation.x = Math.PI / 2; group.add(part); });
  return group;
}

function normalizeModel(model: THREE.Object3D, targetSize: number) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const max = Math.max(size.x, size.y, size.z) || 1;
  model.scale.multiplyScalar(targetSize / max);
  const normalizedBox = new THREE.Box3().setFromObject(model);
  const center = normalizedBox.getCenter(new THREE.Vector3());
  model.position.sub(center);
  return model;
}

function tintModel(model: THREE.Object3D, color: number) {
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = false;
    child.receiveShadow = false;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    child.material = materials.map((material) => {
      const clone = material.clone();
      if (clone instanceof THREE.MeshStandardMaterial) {
        clone.color.lerp(new THREE.Color(color), 0.38);
        clone.emissive = new THREE.Color(color);
        clone.emissiveIntensity = 0.12;
        clone.roughness = Math.min(clone.roughness, 0.58);
      }
      return clone;
    });
  });
}

function createStars(count: number, radius: number) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color(0xffffff), new THREE.Color(0x8be9fd), new THREE.Color(0xc4b5fd)];
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * radius * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * radius;
    positions[i * 3 + 2] = -Math.random() * radius * 2 + 25;
    const color = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }));
}

function selectFighterVariant(source: THREE.Object3D, fighterId: FighterId) {
  const variants = source.children.filter((child) => {
    let hasMesh = false;
    child.traverse((item) => { if (item instanceof THREE.Mesh) hasMesh = true; });
    return hasMesh;
  });
  const variantIndex: Record<FighterId, number> = { azure: 2, solar: 1, phantom: 0 };
  const chosen = variants[variantIndex[fighterId]] ?? variants[0] ?? source;
  const model = cloneSkeleton(chosen);
  normalizeModel(model, 4.8);
  model.rotation.y += Math.PI;
  return model;
}

function createBlackHole() {
  const group = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(2.15, 28, 20), new THREE.MeshBasicMaterial({ color: 0x000008 }));
  group.add(core);
  [0, 1, 2].forEach((index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.1 + index * 0.42, 0.22 - index * 0.04, 10, 80),
      new THREE.MeshBasicMaterial({ color: index === 0 ? 0xf59e0b : index === 1 ? 0xc026d3 : 0x38bdf8, transparent: true, opacity: 0.54 - index * 0.1, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    ring.rotation.x = Math.PI / 2.65;
    ring.rotation.z = index * 0.4;
    group.add(ring);
  });
  return group;
}

function createNebulaTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 126);
    gradient.addColorStop(0, "rgba(124, 92, 255, .72)");
    gradient.addColorStop(0.35, "rgba(76, 65, 190, .34)");
    gradient.addColorStop(0.72, "rgba(37, 50, 132, .11)");
    gradient.addColorStop(1, "rgba(4, 8, 30, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(canvas);
}

function createMilkyWayTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  const gradient = context.createLinearGradient(0, 512, 1024, 0);
  gradient.addColorStop(0, "rgba(20,10,55,0)");
  gradient.addColorStop(0.35, "rgba(111,70,220,.2)");
  gradient.addColorStop(0.52, "rgba(220,205,255,.65)");
  gradient.addColorStop(0.68, "rgba(90,70,210,.22)");
  gradient.addColorStop(1, "rgba(10,8,40,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 900; i += 1) {
    const x = Math.random() * 1024;
    const centerY = 512 - x * 0.5;
    const y = centerY + (Math.random() - 0.5) * 150;
    const alpha = Math.max(0, 1 - Math.abs(y - centerY) / 90) * (0.15 + Math.random() * 0.75);
    context.fillStyle = `rgba(${180 + Math.random() * 75},${175 + Math.random() * 70},255,${alpha})`;
    context.fillRect(x, y, Math.random() * 2 + 0.5, Math.random() * 2 + 0.5);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createPlanet(color: number, radius: number, ringed = false) {
  const group = new THREE.Group();
  const planet = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 20), new THREE.MeshStandardMaterial({ color, roughness: 0.8, emissive: color, emissiveIntensity: 0.07 }));
  group.add(planet);
  if (ringed) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 1.35, radius * 2.15, 64), new THREE.MeshBasicMaterial({ color: 0xe7c58d, transparent: true, opacity: 0.58, side: THREE.DoubleSide }));
    ring.rotation.x = Math.PI / 2.45;
    group.add(ring);
  }
  return group;
}

function createFighterSilhouette(color: number) {
  const group = new THREE.Group();
  const hullMaterial = new THREE.MeshStandardMaterial({ color: 0x172554, metalness: 0.82, roughness: 0.22, emissive: color, emissiveIntensity: 0.18 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color, metalness: 0.62, roughness: 0.2, emissive: color, emissiveIntensity: 0.72 });
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x67e8f9, metalness: 0.45, roughness: 0.08, emissive: 0x0891b2, emissiveIntensity: 0.75 });
  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.72, 3.3, 7), hullMaterial);
  hull.rotation.x = -Math.PI / 2;
  hull.position.z = -0.15;
  group.add(hull);
  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.12, 1.5), hullMaterial);
    wing.position.set(side * 0.95, -0.08, 0.22);
    wing.rotation.y = side * 0.28;
    group.add(wing);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 0.11), accentMaterial);
    strip.position.set(side * 1.05, 0.01, -0.42);
    strip.rotation.y = side * 0.28;
    group.add(strip);
  });
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 10), glassMaterial);
  cockpit.scale.set(0.72, 0.38, 1.25);
  cockpit.position.set(0, 0.35, -0.42);
  group.add(cockpit);
  return group;
}

class SpaceAudio {
  enabled = true;
  private context: AudioContext | null = null;

  private init() {
    if (this.context) return;
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtor) this.context = new AudioCtor();
  }

  tone(frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.08, endFrequency?: number) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.context) return;
      if (this.context.state === "suspended") void this.context.resume();
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    } catch {}
  }

  shot(powered = false) {
    this.tone(powered ? 760 : 480, powered ? 0.28 : 0.14, "sawtooth", powered ? 0.11 : 0.065, powered ? 1900 : 1120);
    this.tone(powered ? 190 : 240, powered ? 0.34 : 0.1, "triangle", powered ? 0.08 : 0.035, powered ? 720 : 410);
  }
  hit() { this.tone(210, 0.14, "square", 0.065, 65); this.tone(880, 0.07, "triangle", 0.035, 420); }
  warning() { this.tone(560, 0.42, "triangle", 0.095, 250); window.setTimeout(() => this.tone(740, 0.25, "square", 0.05, 390), 180); }
  explosion() { this.tone(150, 0.72, "sawtooth", 0.13, 32); this.tone(62, 0.9, "square", 0.07, 28); }
  bossArrival() { [110, 165, 220, 330].forEach((note, index) => window.setTimeout(() => this.tone(note, 0.7, index % 2 ? "sawtooth" : "triangle", 0.07, note * 1.7), index * 150)); }
  shield() { this.tone(660, 0.4, "sine", 0.1, 1320); }
  victory() { [523, 659, 784, 1047].forEach((note, index) => window.setTimeout(() => this.tone(note, 0.32, "triangle", 0.09), index * 110)); }
}

export default function DreadnoughtBreakthroughGame({ onClose, onVictory, initialFighter = "azure" }: DreadnoughtBreakthroughGameProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef(new SpaceAudio());
  const onVictoryRef = useRef(onVictory);
  const [selectedFighter, setSelectedFighter] = useState<FighterId>(initialFighter);
  const [gameState, setGameState] = useState<GameState>("hangar");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [shield, setShield] = useState(MAX_SHIELD);
  const [enemyHealth, setEnemyHealth] = useState(5);
  const [enemyMaxHealth, setEnemyMaxHealth] = useState(5);
  const [enemiesDefeated, setEnemiesDefeated] = useState(0);
  const [score, setScore] = useState(0);
  const [ammo, setAmmo] = useState(10);
  const [powerCharge, setPowerCharge] = useState(0);
  const [phaseText, setPhaseText] = useState("Сектор Андромеды");
  const [warning, setWarning] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [missionSession, setMissionSession] = useState(0);
  const { launchInLandscape, getLandscapePointerX, landscapeFrameStyle } = useMobileLandscapeLaunch();

  useEffect(() => { onVictoryRef.current = onVictory; }, [onVictory]);

  const runtime = useRef({
    running: false,
    targetX: LANES[1],
    playerX: LANES[1],
    shield: MAX_SHIELD,
    enemyHealth: 5,
    enemyMaxHealth: 5,
    defeated: 0,
    score: 0,
    enemyTimer: 0,
    enemyShotTimer: 2.6,
    warningTimer: 0,
    warningActive: false,
    boss: false,
    bossPhase: 1,
    powered: false,
    victory: false,
    spawnGraceUntil: 0,
    ammo: 10,
    displayedAmmo: 10,
    ammoAtLastShot: 10,
    canShootAt: 0,
    lastShotAt: 0,
    powerCharge: 0,
    displayedPowerCharge: 0,
    lastShieldRegenAt: 0,
    player: null as THREE.Group | null,
    enemy: null as THREE.Group | null,
    enemies: [] as CombatEnemy[],
    playerTemplate: null as THREE.Object3D | null,
    enemyTemplate: null as THREE.Object3D | null,
    bossTemplate: null as THREE.Object3D | null,
    scene: null as THREE.Scene | null,
    projectiles: [] as Projectile[],
    asteroids: [] as Asteroid[],
    keys: new Set<string>(),
    pointers: new Map<number, { x: number; startX: number; startY: number; moved: boolean; held: boolean; holdTimer: number; repeatTimer: number }>(),
    spaceHold: null as null | { held: boolean; holdTimer: number; repeatTimer: number },
  });

  const updateShield = useCallback((next: number) => {
    const value = Math.max(0, Math.min(MAX_SHIELD, next));
    runtime.current.shield = value;
    setShield(value);
    if (value <= 0) {
      runtime.current.running = false;
      setGameState("gameover");
    }
  }, []);

  const fire = useCallback((charged = false) => {
    const game = runtime.current;
    if (!game.running || !game.scene || !game.player || performance.now() < game.canShootAt) return false;
    const isCharged = charged && game.powerCharge >= CHARGED_SHOT_COST;
    if (!isCharged && game.ammo < 1) return false;
    if (isCharged) {
      game.powerCharge -= CHARGED_SHOT_COST;
      game.displayedPowerCharge = Math.floor(game.powerCharge);
      setPowerCharge(game.displayedPowerCharge);
    } else {
      game.ammo -= 1;
      game.ammoAtLastShot = game.ammo;
      game.lastShotAt = performance.now();
      game.displayedAmmo = Math.floor(game.ammo);
      setAmmo(game.displayedAmmo);
    }
    game.canShootAt = performance.now() + (isCharged ? 520 : game.powered ? 145 : 205);
    const color = isCharged ? 0xffd84d : game.powered ? 0x7dd3fc : FIGHTERS.find((fighter) => fighter.id === selectedFighter)?.color ?? 0x22d3ee;
    [-0.34, 0.34].forEach((offset) => {
      const mesh = createLaserBolt(color, isCharged ? 2.8 : game.powered ? 1.4 : 0.95, isCharged ? 0.16 : game.powered ? 0.075 : 0.052);
      mesh.position.set(game.playerX + offset, 0.15, 0.1);
      const target = game.enemies
        .filter((enemy) => !enemy.boss || Math.abs(game.playerX) < 2.8)
        .sort((left, right) => Math.abs(left.root.position.x - game.playerX) - Math.abs(right.root.position.x - game.playerX))[0];
      const projectileSpeed = isCharged ? 48 : game.powered ? 42 : 36;
      const velocity = new THREE.Vector3(0, 0, -projectileSpeed);
      if (target && Math.abs(target.root.position.x - game.playerX) <= 1.75) {
        velocity.copy(target.root.position).sub(mesh.position).normalize().multiplyScalar(projectileSpeed);
        mesh.rotation.y = Math.atan2(velocity.x, velocity.z);
      }
      game.scene!.add(mesh);
      game.projectiles.push({ mesh, velocity, hostile: false, damage: isCharged ? 2 : game.powered ? 0.75 : 0.5, radius: isCharged ? 0.5 : 0.24 });
    });
    audioRef.current.shot(isCharged || game.powered);
    return true;
  }, [selectedFighter]);

  useEffect(() => {
    if (missionSession === 0) return;
    let cancelled = false;
    const game = runtime.current;
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05091c);
    scene.fog = new THREE.FogExp2(0x090d2a, 0.008);
    game.scene = scene;

    const initialAspect = mount.clientWidth / mount.clientHeight;
    const camera = new THREE.PerspectiveCamera(initialAspect < 0.72 ? 68 : 56, initialAspect, 0.1, 260);
    camera.position.set(0, initialAspect < 0.72 ? 6.3 : 5.4, initialAspect < 0.72 ? 17.5 : 13.5);
    camera.lookAt(0, 0, -16);

    const renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio <= 1.5, powerPreference: "high-performance", alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xa5c9ff, 0x160b35, 2.8));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    keyLight.position.set(4, 8, 8);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x7c3aed, 35, 55);
    rimLight.position.set(-10, 5, -20);
    scene.add(rimLight);

    const starsNear = createStars(window.innerWidth < 700 ? 1050 : 1750, 105);
    const starsFar = createStars(window.innerWidth < 700 ? 650 : 1100, 180);
    scene.add(starsNear, starsFar);
    const milkyWay = new THREE.Mesh(new THREE.PlaneGeometry(125, 62), new THREE.MeshBasicMaterial({ map: createMilkyWayTexture(), transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending }));
    milkyWay.position.set(0, 13, -105);
    milkyWay.rotation.z = -0.16;
    scene.add(milkyWay);
    const saturn = createPlanet(0xc99a68, 5.5, true);
    saturn.position.set(29, 13, -85);
    saturn.rotation.z = -0.25;
    scene.add(saturn);
    const jupiter = createPlanet(0xc27d52, 7.2);
    jupiter.position.set(-33, -2, -105);
    scene.add(jupiter);
    const violetMoon = createPlanet(0x6d4db5, 2.8);
    violetMoon.position.set(18, -8, -65);
    scene.add(violetMoon);
    const blackHole = createBlackHole();
    blackHole.position.set(-23, 12, -72);
    blackHole.scale.setScalar(2.3);
    scene.add(blackHole);

    const nebulaMaterial = new THREE.MeshBasicMaterial({ map: createNebulaTexture(), color: 0x8b7cff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let i = 0; i < 5; i += 1) {
      const cloud = new THREE.Mesh(new THREE.PlaneGeometry(20 + i * 4, 20 + i * 4), nebulaMaterial.clone());
      cloud.position.set((i - 2) * 12, (i % 2 ? 1 : -1) * 7, -35 - i * 16);
      cloud.rotation.x = -0.45;
      scene.add(cloud);
    }

    const corridorMaterial = new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending });
    LANES.forEach((lane) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(lane, -0.8, 8), new THREE.Vector3(lane, -0.8, -100)]);
      scene.add(new THREE.Line(geometry, corridorMaterial));
      const laneGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.45, 108),
        new THREE.MeshBasicMaterial({ color: lane > 0 ? 0x312e81 : 0x0e7490, transparent: true, opacity: 0.045, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      laneGlow.rotation.x = -Math.PI / 2;
      laneGlow.position.set(lane, -0.86, -46);
      scene.add(laneGlow);
    });
    [-5.6, -2.8, 0, 2.8, 5.6].forEach((boundary) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.025, 108),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: boundary === 0 ? 0.5 : 0.28, blending: THREE.AdditiveBlending }),
      );
      rail.position.set(boundary, -0.79, -46);
      scene.add(rail);
    });

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const load = (path: string, progressStart: number) => new Promise<THREE.Object3D>((resolve, reject) => {
      loader.load(path, (gltf) => { setLoadingProgress(progressStart + 30); resolve(gltf.scene); }, undefined, reject);
    });

    Promise.all([
      load("/models/class3_fighter.glb", 0),
      load("/models/andromeda.glb", 32),
      load("/models/dreadnought.glb", 65),
    ]).then(([fighter, andromeda, dreadnought]) => {
      if (cancelled) return;
      normalizeModel(andromeda, 5.2);
      andromeda.rotation.y = Math.PI;
      normalizeModel(dreadnought, 17.5);
      dreadnought.rotation.y = Math.PI;
      game.playerTemplate = fighter;
      game.enemyTemplate = andromeda;
      game.bossTemplate = dreadnought;

      const playerRoot = new THREE.Group();
      const playerModel = selectFighterVariant(fighter, selectedFighter);
      playerRoot.add(playerModel);
      playerRoot.position.set(game.playerX, 0, 1.5);
      const engineGlow = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), new THREE.MeshBasicMaterial({ color: FIGHTERS.find((item) => item.id === selectedFighter)?.color ?? 0x22d3ee, transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending, depthWrite: false }));
      engineGlow.name = "engine-glow";
      engineGlow.position.set(0, 0, 1.55);
      engineGlow.scale.set(0.9, 0.52, 1.8);
      playerRoot.add(engineGlow);
      game.player = playerRoot;
      scene.add(playerRoot);
      const playerFill = new THREE.PointLight(0x73dfff, 18, 22, 1.5);
      playerFill.position.set(0, 4.2, 6);
      scene.add(playerFill);

      game.lastShieldRegenAt = performance.now();
      spawnEnemy(false);
      setLoadingProgress(100);
      window.setTimeout(() => {
        if (!cancelled) {
          game.running = true;
          setGameState("playing");
        }
      }, 350);
    }).catch(() => {
      if (!cancelled) setGameState("gameover");
    });

    const removeProjectile = (index: number) => {
      const projectile = game.projectiles[index];
      if (!projectile) return;
      game.scene?.remove(projectile.mesh);
      disposeObject(projectile.mesh);
      game.projectiles.splice(index, 1);
    };
    const clearPlayerShots = () => {
      for (let index = game.projectiles.length - 1; index >= 0; index -= 1) {
        if (!game.projectiles[index].hostile) removeProjectile(index);
      }
    };

    const spawnHostileShot = (enemy: CombatEnemy, damage: number, targetOffset = 0, muzzleOffset = 0) => {
      if (!game.scene || !game.player) return;
      const laserLength = enemy.boss ? (damage === 2 ? 2.5 : 1.15) : (damage === 2 ? 1.25 : 0.58);
      const mesh = createLaserBolt(damage === 2 ? 0xff21d7 : 0xff365f, laserLength, damage === 2 ? 0.17 : 0.075);
      mesh.position.copy(enemy.root.position).add(new THREE.Vector3(muzzleOffset, -0.1, 1.4));
      const aim = new THREE.Vector3(THREE.MathUtils.clamp(game.playerX + targetOffset, LANES[0], LANES[3]), game.player.position.y, game.player.position.z);
      const hostileSpeed = enemy.boss ? (damage === 2 ? 31 : 25) : (damage === 2 ? 21.7 : 17.5);
      const velocity = aim.sub(mesh.position).normalize().multiplyScalar(hostileSpeed);
      mesh.rotation.y = Math.atan2(velocity.x, velocity.z);
      game.scene.add(mesh);
      game.projectiles.push({ mesh, velocity, hostile: true, damage, radius: damage === 2 ? 0.52 : 0.3 });
    };

    const spawnAsteroid = (origin?: THREE.Vector3, fragment = false) => {
      if (!game.scene) return;
      const radius = fragment ? 0.18 + Math.random() * 0.24 : 0.62 + Math.random() * 0.55;
      const mesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(radius, 1),
        new THREE.MeshStandardMaterial({ color: fragment ? 0x75647f : 0x51465f, roughness: 0.88, emissive: 0x2a1048, emissiveIntensity: fragment ? 0.55 : 0.32, flatShading: true }),
      );
      mesh.scale.set(1, 0.7 + Math.random() * 0.5, 0.8 + Math.random() * 0.5);
      if (origin) mesh.position.copy(origin).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.55, 0));
      else mesh.position.set(LANES[Math.floor(Math.random() * LANES.length)] + (Math.random() - 0.5) * 0.38, Math.random() * 1.5 - 0.2, -48);
      game.scene.add(mesh);
      game.asteroids.push({ mesh, speed: fragment ? 18 + Math.random() * 8 : 11 + Math.random() * 5, radius, spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(fragment ? 4 : 1.8), health: fragment ? 1 : 3, fragment, driftX: fragment ? (Math.random() - 0.5) * 4.5 : 0 });
    };

    const syncEnemyHud = () => {
      const health = game.enemies.reduce((sum, enemy) => sum + enemy.health, 0);
      const maxHealth = game.enemies.reduce((sum, enemy) => sum + enemy.maxHealth, 0);
      game.enemyHealth = health;
      game.enemyMaxHealth = Math.max(1, maxHealth);
      setEnemyHealth(health);
      setEnemyMaxHealth(Math.max(1, maxHealth));
    };

    const spawnEnemy = (boss: boolean) => {
      if (!game.scene || !game.enemyTemplate || !game.bossTemplate || game.victory) return;
      clearPlayerShots();
      game.enemies.forEach((enemy) => game.scene?.remove(enemy.root));
      game.enemies = [];
      game.boss = boss;
      const remaining = Math.max(0, 5 - game.defeated);
      const count = boss ? 1 : Math.min(remaining, 2);
      const shuffledLanes = [...NORMAL_ENEMY_LANES].sort(() => Math.random() - 0.5);
      for (let index = 0; index < count; index += 1) {
        const root = new THREE.Group();
        root.add(cloneSkeleton(boss ? game.bossTemplate : game.enemyTemplate));
        const lane = boss ? 0 : shuffledLanes[index];
        root.position.set(lane, boss ? 1.4 : 0.5, boss ? -72 : index === 0 ? -19 : -31);
        if (!boss) root.rotation.y = Math.PI;
        game.scene.add(root);
        game.enemies.push({ root, health: boss ? 24 : 5, maxHealth: boss ? 24 : 5, lane, targetLane: lane, timer: 0, shotTimer: boss ? 1.2 : 1.8 + Math.random(), turnTimer: boss ? 0 : 4 + Math.random() * 2.2, turning: false, turned: false, boss, spawnGraceUntil: performance.now() + 900, moveSeed: Math.random() * 100 });
      }
      game.enemy = game.enemies[0]?.root ?? null;
      game.warningActive = false;
      game.warningTimer = 0;
      setWarning(false);
      syncEnemyHud();
      setPhaseText(boss ? "БОСС • ФАЗА 1" : `${count} ${count === 1 ? "ЦЕЛЬ" : "ЦЕЛИ"}`);
      if (boss) audioRef.current.bossArrival();
    };

    const destroyEnemy = (enemy: CombatEnemy) => {
      if (!game.scene || !game.enemies.includes(enemy)) return;
      audioRef.current.explosion();
      const origin = enemy.root.position.clone();
      for (let i = 0; i < 18; i += 1) {
        const spark = new THREE.Mesh(new THREE.TetrahedronGeometry(0.08 + Math.random() * 0.12), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xf97316 : 0x67e8f9 }));
        spark.position.copy(origin).add(new THREE.Vector3((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 4));
        game.scene.add(spark);
        window.setTimeout(() => { game.scene?.remove(spark); spark.geometry.dispose(); }, 520);
      }
      game.scene.remove(enemy.root);
      game.enemies = game.enemies.filter((item) => item !== enemy);
      game.enemy = game.enemies[0]?.root ?? null;
      if (enemy.boss) {
        game.victory = true;
        game.running = false;
        game.score += 1500;
        setScore(game.score);
        setGameState("victory");
        audioRef.current.victory();
        confetti({ particleCount: 180, spread: 100, origin: { y: 0.58 }, colors: ["#22d3ee", "#fbbf24", "#a78bfa", "#ffffff"] });
        onVictoryRef.current?.(game.score, 500);
        return;
      }
      game.defeated += 1;
      game.score += 250;
      setEnemiesDefeated(game.defeated);
      setScore(game.score);
      syncEnemyHud();
      if (game.enemies.length === 0) {
        clearPlayerShots();
        window.setTimeout(() => spawnEnemy(game.defeated >= 5), 760);
      } else setPhaseText(`${game.enemies.length} ${game.enemies.length === 1 ? "ЦЕЛЬ" : "ЦЕЛИ"}`);
    };

    let lastTime = performance.now();
    let animationFrame = 0;
    const animate = (now: number) => {
      animationFrame = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.034);
      lastTime = now;
      starsNear.position.z += dt * 1.8;
      starsFar.position.z += dt * 0.7;
      if (starsNear.position.z > 35) starsNear.position.z = 0;
      if (starsFar.position.z > 55) starsFar.position.z = 0;
      blackHole.rotation.z += dt * 0.07;

      if (game.running && game.ammo < 10 && now - game.lastShotAt > 800) {
        game.ammo = Math.min(10, game.ammoAtLastShot + (now - game.lastShotAt - 800) / 500);
        const nextDisplayedAmmo = Math.floor(game.ammo + 0.0001);
        if (nextDisplayedAmmo !== game.displayedAmmo) {
          game.displayedAmmo = nextDisplayedAmmo;
          setAmmo(nextDisplayedAmmo);
        }
      }

      if (game.running && game.powerCharge < 10) {
        game.powerCharge = Math.min(10, game.powerCharge + dt * 0.7);
        const nextPower = Math.floor(game.powerCharge + 0.0001);
        if (nextPower !== game.displayedPowerCharge) {
          game.displayedPowerCharge = nextPower;
          setPowerCharge(nextPower);
        }
      }
      if (game.running && game.shield < MAX_SHIELD && now - game.lastShieldRegenAt >= 20000) {
        game.lastShieldRegenAt = now;
        updateShield(game.shield + 1);
        audioRef.current.shield();
      }

      if (game.running && game.player) {
        if (game.keys.has("ArrowLeft") || game.keys.has("KeyA")) game.targetX -= dt * 8.6;
        if (game.keys.has("ArrowRight") || game.keys.has("KeyD")) game.targetX += dt * 8.6;
        game.targetX = THREE.MathUtils.clamp(game.targetX, LANES[0], LANES[3]);
        game.playerX = THREE.MathUtils.damp(game.playerX, game.targetX, 10, dt);
        game.player.position.x = game.playerX;
        game.player.rotation.z = THREE.MathUtils.damp(game.player.rotation.z, (game.targetX - game.playerX) * -0.15, 8, dt);
        game.player.position.y = Math.sin(now * 0.003) * 0.1;
        const glow = game.player.getObjectByName("engine-glow");
        if (glow) glow.scale.z = 1.25 + Math.sin(now * 0.018) * 0.35 + (game.powered ? 0.7 : 0);
      }

      if (game.running && game.enemies.length > 0) {
        let anyWarning = false;
        for (const enemy of game.enemies) {
          enemy.timer += dt;
          enemy.shotTimer -= dt;
          if (enemy.boss && enemy.root.position.z < -44) enemy.root.position.z = Math.min(-44, enemy.root.position.z + dt * 18);
          if (!enemy.boss && enemy.timer > 2.2 + (enemy.moveSeed % 1.5)) {
            const choices = NORMAL_ENEMY_LANES.filter((lane) => lane !== enemy.targetLane);
            enemy.targetLane = choices[Math.floor(Math.random() * choices.length)];
            enemy.timer = 0;
          }
          enemy.root.position.x = THREE.MathUtils.damp(enemy.root.position.x, enemy.targetLane, enemy.boss ? 1.3 : 1.9, dt);
          enemy.root.rotation.z = THREE.MathUtils.damp(enemy.root.rotation.z, (enemy.targetLane - enemy.root.position.x) * -0.06, 6, dt);

          if (!enemy.boss && !enemy.turned && !enemy.turning) {
            enemy.turnTimer -= dt;
            if (enemy.turnTimer <= 0) {
              enemy.turning = true;
              enemy.turnTimer = 1.25;
              audioRef.current.warning();
            }
          }
          if (enemy.turning) {
            anyWarning = true;
            enemy.turnTimer -= dt;
            enemy.root.rotation.y = Math.PI * Math.max(0, enemy.turnTimer) / 1.25;
            if (enemy.turnTimer <= 0) {
              enemy.turning = false;
              enemy.turned = true;
              enemy.root.rotation.y = 0;
              spawnHostileShot(enemy, 2);
              enemy.shotTimer = 0.8;
            }
          }
          if (!enemy.turning && enemy.shotTimer <= 0) {
            if (enemy.boss) {
              spawnHostileShot(enemy, game.bossPhase === 3 ? 2 : 1, 0, -1.8);
              spawnHostileShot(enemy, 1, game.bossPhase >= 2 ? -2.8 : -1.1, 1.8);
              if (game.bossPhase >= 2) spawnHostileShot(enemy, 1, 2.8, 0);
            } else spawnHostileShot(enemy, enemy.turned ? 2 : 1, 0, Math.sin(now * 0.002 + enemy.moveSeed) * 0.7);
            enemy.shotTimer = enemy.boss ? Math.max(0.52, 1.25 - game.bossPhase * 0.2) : enemy.turned ? 3 : 4.1;
          }
        }
        if (anyWarning !== game.warningActive) {
          game.warningActive = anyWarning;
          setWarning(anyWarning);
        }

        if (game.boss) {
          const nextPhase = game.enemyHealth <= 8 ? 3 : game.enemyHealth <= 16 ? 2 : 1;
          if (nextPhase !== game.bossPhase) {
            game.bossPhase = nextPhase;
            setPhaseText(`БОСС • ФАЗА ${nextPhase}`);
            if (nextPhase === 3) {
              game.powered = true;
              setPhaseText("ФАЗА 3 • ЗОЛОТОЙ ЛАЗЕР");
              audioRef.current.shield();
            }
          }
          if ((game.bossPhase === 2 && Math.random() < dt * 0.16) || (game.bossPhase === 3 && Math.random() < dt * 0.28)) spawnAsteroid();
        } else if (Math.random() < dt * 0.075) spawnAsteroid();
      }

      for (let i = game.projectiles.length - 1; i >= 0; i -= 1) {
        const projectile = game.projectiles[i];
        projectile.mesh.position.addScaledVector(projectile.velocity, dt);
        let hitAsteroid = false;
        if (!projectile.hostile) {
          for (let asteroidIndex = game.asteroids.length - 1; asteroidIndex >= 0; asteroidIndex -= 1) {
            const asteroid = game.asteroids[asteroidIndex];
            if (projectile.mesh.position.distanceTo(asteroid.mesh.position) >= asteroid.radius + projectile.radius) continue;
            asteroid.health -= Math.max(1, projectile.damage);
            hitAsteroid = true;
            audioRef.current.hit();
            if (asteroid.health <= 0) {
              const origin = asteroid.mesh.position.clone();
              game.scene?.remove(asteroid.mesh);
              disposeObject(asteroid.mesh);
              game.asteroids.splice(asteroidIndex, 1);
              if (!asteroid.fragment) for (let piece = 0; piece < 5; piece += 1) spawnAsteroid(origin, true);
              game.score += asteroid.fragment ? 12 : 55;
              setScore(game.score);
            }
            break;
          }
        }
        let hitEnemy: CombatEnemy | null = null;
        if (!hitAsteroid && !projectile.hostile) {
          for (const enemy of game.enemies) {
            if (now < enemy.spawnGraceUntil) continue;
            if (enemy.boss && Math.abs(projectile.mesh.position.x) > 2.8) continue;
            const hitbox = new THREE.Box3().setFromObject(enemy.root).expandByScalar(projectile.radius + 0.08);
            if (hitbox.containsPoint(projectile.mesh.position)) { hitEnemy = enemy; break; }
          }
        }
        const hitPlayer = game.running && projectile.hostile && game.player && projectile.mesh.position.distanceTo(game.player.position) < 1.05;
        if (hitEnemy) {
          hitEnemy.health = Math.max(0, hitEnemy.health - projectile.damage);
          game.score += 18 * projectile.damage;
          syncEnemyHud();
          setScore(game.score);
          audioRef.current.hit();
          if (hitEnemy.health <= 0) destroyEnemy(hitEnemy);
        }
        if (hitPlayer) {
          updateShield(game.shield - projectile.damage);
          audioRef.current.hit();
        }
        if (hitAsteroid || hitEnemy || hitPlayer || projectile.mesh.position.z < -75 || projectile.mesh.position.z > 22) removeProjectile(i);
      }

      for (let i = game.asteroids.length - 1; i >= 0; i -= 1) {
        const asteroid = game.asteroids[i];
        asteroid.mesh.position.z += asteroid.speed * dt;
        asteroid.mesh.position.x += asteroid.driftX * dt;
        asteroid.mesh.rotation.x += asteroid.spin.x * dt;
        asteroid.mesh.rotation.y += asteroid.spin.y * dt;
        asteroid.mesh.rotation.z += asteroid.spin.z * dt;
        const hit = game.player && asteroid.mesh.position.distanceTo(game.player.position) < asteroid.radius + 0.7;
        if (hit) {
          updateShield(game.shield - 1);
          audioRef.current.hit();
        }
        if (hit || asteroid.mesh.position.z > 18) {
          game.scene?.remove(asteroid.mesh);
          disposeObject(asteroid.mesh);
          game.asteroids.splice(i, 1);
        }
      }
      renderer.render(scene, camera);
    };
    animationFrame = requestAnimationFrame(animate);

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.fov = camera.aspect < 0.72 ? 68 : 56;
      camera.position.set(0, camera.aspect < 0.72 ? 6.3 : 5.4, camera.aspect < 0.72 ? 17.5 : 13.5);
      camera.lookAt(0, 0, -16);
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    };
    const beginHold = (holder: { held: boolean; holdTimer: number; repeatTimer: number }) => {
      holder.holdTimer = window.setTimeout(() => {
        holder.held = true;
        if (game.powerCharge >= CHARGED_SHOT_COST) fire(true);
        else {
          fire(false);
          holder.repeatTimer = window.setInterval(() => {
            if (game.powerCharge >= CHARGED_SHOT_COST) {
              fire(true);
              window.clearInterval(holder.repeatTimer);
              holder.repeatTimer = 0;
            } else fire(false);
          }, 240);
        }
      }, 1000);
    };
    const endHold = (holder: { held: boolean; holdTimer: number; repeatTimer: number }, moved = false) => {
      window.clearTimeout(holder.holdTimer);
      window.clearInterval(holder.repeatTimer);
      if (!holder.held && !moved) fire(false);
      holder.holdTimer = 0;
      holder.repeatTimer = 0;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "Space", "KeyA", "KeyD"].includes(event.code)) event.preventDefault();
      game.keys.add(event.code);
      if (event.code === "Space" && !event.repeat && !game.spaceHold) {
        game.spaceHold = { held: false, holdTimer: 0, repeatTimer: 0 };
        beginHold(game.spaceHold);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      game.keys.delete(event.code);
      if (event.code === "Space" && game.spaceHold) {
        endHold(game.spaceHold);
        game.spaceHold = null;
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      renderer.domElement.setPointerCapture(event.pointerId);
      const pointerX = getLandscapePointerX(event.clientX, event.clientY);
      const pointer = { x: pointerX, startX: pointerX, startY: event.clientY, moved: false, held: false, holdTimer: 0, repeatTimer: 0 };
      game.pointers.set(event.pointerId, pointer);
      beginHold(pointer);
    };
    const onPointerMove = (event: PointerEvent) => {
      const pointer = game.pointers.get(event.pointerId);
      if (!pointer || !game.running) return;
      const pointerX = getLandscapePointerX(event.clientX, event.clientY);
      const delta = pointerX - pointer.x;
      if (Math.abs(pointerX - pointer.startX) > 9 || Math.abs(event.clientY - pointer.startY) > 9) {
        if (!pointer.moved) {
          window.clearTimeout(pointer.holdTimer);
          window.clearInterval(pointer.repeatTimer);
        }
        pointer.moved = true;
      }
      const landscapeWidth = Math.max(window.innerWidth, window.innerHeight);
      const sensitivity = (LANES[LANES.length - 1] - LANES[0]) / Math.max(120, landscapeWidth / 3);
      game.targetX = THREE.MathUtils.clamp(game.targetX + delta * sensitivity, LANES[0], LANES[3]);
      pointer.x = pointerX;
    };
    const onPointerUp = (event: PointerEvent) => {
      const pointer = game.pointers.get(event.pointerId);
      if (pointer) endHold(pointer, pointer.moved);
      game.pointers.delete(event.pointerId);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);

    return () => {
      cancelled = true;
      game.running = false;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      if (game.spaceHold) endHold(game.spaceHold, true);
      game.spaceHold = null;
      game.pointers.forEach((pointer) => endHold(pointer, true));
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line)) return;
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material?.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
      game.scene = null;
      game.player = null;
      game.enemy = null;
      game.enemies = [];
      game.projectiles = [];
      game.asteroids = [];
      game.pointers.clear();
      game.keys.clear();
    };
  }, [fire, missionSession, selectedFighter, updateShield, getLandscapePointerX]);

  const launchMission = () => {
    const game = runtime.current;
    game.running = false;
    game.projectiles.forEach((projectile) => {
      game.scene?.remove(projectile.mesh);
      disposeObject(projectile.mesh);
    });
    game.asteroids.forEach((asteroid) => {
      game.scene?.remove(asteroid.mesh);
      disposeObject(asteroid.mesh);
    });
    game.projectiles = [];
    game.asteroids = [];
    game.enemy = null;
    game.targetX = LANES[1];
    game.playerX = LANES[1];
    game.shield = MAX_SHIELD;
    game.enemyHealth = 5;
    game.enemyMaxHealth = 5;
    game.defeated = 0;
    game.score = 0;
    game.boss = false;
    game.enemies = [];
    game.bossPhase = 1;
    game.powered = false;
    game.victory = false;
    game.ammo = 10;
    game.displayedAmmo = 10;
    game.ammoAtLastShot = 10;
    game.powerCharge = 0;
    game.displayedPowerCharge = 0;
    game.lastShieldRegenAt = performance.now();
    setShield(MAX_SHIELD);
    setEnemyHealth(5);
    setEnemyMaxHealth(5);
    setEnemiesDefeated(0);
    setScore(0);
    setAmmo(10);
    setPowerCharge(0);
    setPhaseText("2 ЦЕЛИ");
    setIsPaused(false);
    setWarning(false);
    setLoadingProgress(0);
    setGameState("loading");
    setMissionSession((value) => value + 1);
  };

  const startGame = () => {
    launchInLandscape(launchMission);
  };

  const togglePause = useCallback(() => {
    const nextPaused = !isPaused;
    runtime.current.running = !nextPaused;
    if (nextPaused) {
      runtime.current.keys.clear();
      runtime.current.pointers.clear();
      runtime.current.spaceHold = null;
    }
    setIsPaused(nextPaused);
  }, [isPaused]);

  const selected = FIGHTERS.find((fighter) => fighter.id === selectedFighter) ?? FIGHTERS[0];

  return (
    <div className={`fixed z-[80] bg-[#01030d] text-white overflow-hidden select-none ${landscapeFrameStyle ? "" : "inset-0"}`} style={{ ...landscapeFrameStyle, touchAction: "none" }}>
      <div ref={mountRef} className={`absolute inset-0 transition-opacity duration-500 ${gameState === "hangar" ? "opacity-30" : "opacity-100"}`} />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_105%,rgba(34,211,238,0.16),transparent_42%),radial-gradient(ellipse_at_24%_94%,rgba(124,58,237,0.12),transparent_36%),radial-gradient(circle_at_50%_25%,rgba(67,56,202,0.10),transparent_46%)]" />

      {gameState !== "playing" && <button onClick={onClose} aria-label="Закрыть игру" className="absolute z-30 top-[max(12px,env(safe-area-inset-top))] right-3 sm:right-5 w-11 h-11 rounded-full bg-black/55 border border-white/15 backdrop-blur-md flex items-center justify-center pointer-events-auto active:scale-90 transition-transform">
        <X size={22} />
      </button>}

      {gameState !== "hangar" && <div className="absolute z-20 top-[max(6px,env(safe-area-inset-top))] left-2 right-2 sm:left-3 sm:right-3 flex flex-col gap-1.5 pointer-events-none">
        <div className="grid grid-cols-[1.35fr_.85fr_.85fr_.9fr] gap-1.5">
          <div className="min-w-0 h-10 rounded-xl bg-slate-950/76 border border-cyan-300/25 backdrop-blur-md px-2 py-1 shadow-lg">
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wide text-cyan-200"><Shield size={12} /><span>Щит {shield}/{MAX_SHIELD}</span></div>
            <div className="mt-1 flex gap-[2px]">{Array.from({ length: MAX_SHIELD }, (_, index) => <span key={index} className={`h-1.5 min-w-0 flex-1 rounded-sm ${index < shield ? "bg-cyan-300 shadow-[0_0_5px_#22d3ee]" : "bg-slate-700/80"}`} />)}</div>
          </div>
          <div className="min-w-0 h-10 rounded-xl bg-slate-950/76 border border-amber-300/25 backdrop-blur-md px-2 py-1 shadow-lg">
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wide text-amber-200"><Zap size={12} /><span>Огонь {ammo}</span></div>
            <div className="mt-1 flex gap-[2px]">{Array.from({ length: 10 }, (_, index) => <span key={index} className={`h-1.5 min-w-0 flex-1 rounded-sm ${index < ammo ? "bg-amber-300 shadow-[0_0_5px_#fbbf24]" : "bg-slate-700/80"}`} />)}</div>
          </div>
          <div className="min-w-0 h-10 rounded-xl bg-slate-950/76 border border-fuchsia-300/25 backdrop-blur-md px-2 py-1 shadow-lg">
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wide text-fuchsia-200"><Sparkles size={12} /><span>Супер {powerCharge}</span></div>
            <div className="mt-1 flex gap-[2px]">{Array.from({ length: 10 }, (_, index) => <span key={index} className={`h-1.5 min-w-0 flex-1 rounded-sm ${index < powerCharge ? "bg-fuchsia-300 shadow-[0_0_5px_#e879f9]" : "bg-slate-700/80"}`} />)}</div>
          </div>
          <div className="min-w-0 h-10 rounded-xl bg-slate-950/76 border border-violet-300/25 backdrop-blur-md px-2 py-0.5 text-center shadow-lg">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wide text-violet-200 truncate">{phaseText}</p>
            <p className="text-[10px] sm:text-xs font-black leading-tight text-amber-300">{score} очков</p>
          </div>
        </div>
        {gameState === "playing" && <div className="flex items-center gap-1.5">
          <div className="h-10 flex-1 rounded-xl bg-slate-950/76 border border-white/15 backdrop-blur-md px-2 flex items-center gap-2 shadow-lg">
            <div className="h-2 flex-1 rounded-full bg-black/65 border border-white/15 overflow-hidden"><motion.div animate={{ width: `${(enemyHealth / enemyMaxHealth) * 100}%` }} className={`h-full ${runtime.current.boss ? "bg-gradient-to-r from-fuchsia-600 to-red-400" : "bg-gradient-to-r from-violet-500 to-cyan-300"}`} /></div>
            <span className="w-9 text-right text-[9px] font-black text-white/75">{enemyHealth}/{enemyMaxHealth}</span>
          </div>
          <div className="flex gap-1.5 pointer-events-auto">
            <button onClick={() => { audioRef.current.enabled = soundMuted; setSoundMuted(!soundMuted); }} aria-label={soundMuted ? "Включить звук" : "Выключить звук"} className="w-10 h-10 rounded-xl bg-black/65 border border-white/15 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform">{soundMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
            <button onClick={togglePause} aria-label={isPaused ? "Продолжить игру" : "Поставить на паузу"} className="w-10 h-10 rounded-xl bg-black/65 border border-white/15 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform">{isPaused ? <Play size={18} className="fill-current" /> : <Pause size={18} className="fill-current" />}</button>
            <button onClick={onClose} aria-label="Закрыть игру" className="w-10 h-10 rounded-xl bg-black/65 border border-white/15 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform"><X size={19} /></button>
          </div>
        </div>}
      </div>}


      {gameState === "playing" && <>
        <div className="absolute z-20 bottom-[max(10px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-slate-950/58 border border-white/10 backdrop-blur-md text-[9px] sm:text-[10px] font-bold text-slate-200 pointer-events-none whitespace-nowrap">
          <span className="sm:hidden">Свайп — двигаться • Тап — огонь • Удержание — супер</span><span className="hidden sm:inline">← → двигаться • ПРОБЕЛ: тап — огонь, удержание — супер</span>
        </div>
        {isPaused && <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-slate-950/20"><div className="rounded-2xl border border-white/15 bg-slate-950/75 px-5 py-3 text-sm font-black backdrop-blur-md">ПАУЗА</div></div>}
      </>}

      <AnimatePresence>
        {warning && gameState === "playing" && (
          <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute z-30 top-[30%] left-1/2 -translate-x-1/2 pointer-events-none text-center">
            <div className="px-5 py-3 rounded-2xl bg-fuchsia-950/75 border-2 border-fuchsia-400 shadow-[0_0_35px_rgba(232,121,249,.55)] backdrop-blur-md animate-pulse">
              <p className="text-sm sm:text-lg font-black tracking-wider text-fuchsia-100">⚠ ПРОТИВНИК РАЗВОРАЧИВАЕТСЯ</p><p className="text-[10px] sm:text-xs text-fuchsia-200 mt-1">Сейчас он останется лицом к тебе и усилит огонь</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(gameState === "hangar" || gameState === "loading") && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-3 sm:p-6 bg-[radial-gradient(circle_at_50%_30%,rgba(49,46,129,.52),rgba(1,3,13,.94)_70%)] overflow-y-auto pointer-events-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl my-auto rounded-[28px] sm:rounded-[36px] border border-cyan-300/20 bg-slate-950/76 backdrop-blur-xl shadow-[0_0_80px_rgba(79,70,229,.22)] overflow-hidden [@media(max-height:450px)]:rounded-[24px]">
            <div className="px-5 pt-6 pb-4 sm:px-8 text-center [@media(max-height:450px)]:pt-2 [@media(max-height:450px)]:pb-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-300/25 text-[10px] font-black uppercase tracking-[.18em] text-violet-200"><Sparkles size={13} /> Миссия класса «Герой»</div>
              <h1 className="mt-3 text-2xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-cyan-200 via-white to-violet-300 bg-clip-text text-transparent [@media(max-height:450px)]:mt-1 [@media(max-height:450px)]:text-2xl">Космический охотник</h1>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-300 [@media(max-height:450px)]:mt-0.5 [@media(max-height:450px)]:text-[11px]">Пять Andromeda охраняют путь к главному кораблю. Выбери свой истребитель.</p>
            </div>
            <div className="px-4 sm:px-7 grid grid-cols-3 gap-2 sm:gap-4">
              {FIGHTERS.map((fighter) => {
                const active = selectedFighter === fighter.id;
                return <button key={fighter.id} disabled={gameState === "loading"} onClick={() => setSelectedFighter(fighter.id)} className={`min-h-[126px] sm:min-h-[154px] rounded-2xl border p-2.5 sm:p-4 flex flex-col items-center justify-center transition-all active:scale-95 [@media(max-height:450px)]:min-h-[112px] [@media(max-height:450px)]:p-2 ${active ? `border-white/55 bg-gradient-to-b ${fighter.accent} ${fighter.glow} shadow-xl` : "border-white/10 bg-white/[.045] opacity-70 hover:opacity-100"}`}>
                  <div className="relative w-full h-16 sm:h-20 rounded-xl bg-slate-800 overflow-hidden shadow-lg border border-white/10 [@media(max-height:450px)]:h-14">
                    <img src="/images/class3-fighters-reference.webp" alt={fighter.name} className={`h-full w-[300%] max-w-none object-cover ${fighter.id === "azure" ? "translate-x-0" : fighter.id === "solar" ? "-translate-x-[33.333%]" : "-translate-x-[66.666%]"}`} />
                    <span className={`absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t ${fighter.accent} opacity-35`} />
                  </div>
                  <p className="mt-2 text-[10px] sm:text-sm font-black leading-tight [@media(max-height:450px)]:mt-1 [@media(max-height:450px)]:text-xs">{fighter.name}</p><p className={`hidden sm:block mt-1 text-[10px] [@media(max-height:450px)]:hidden ${active ? "text-white/80" : "text-slate-400"}`}>{fighter.subtitle}</p>
                </button>;
              })}
            </div>
            <div className="px-5 py-5 sm:px-8 [@media(max-height:450px)]:py-2">
              {gameState === "loading" ? <div><div className="flex items-center justify-between text-xs font-bold text-cyan-100 mb-2"><span>Подготовка кораблей…</span><span>{loadingProgress}%</span></div><div className="h-3 rounded-full bg-slate-800 overflow-hidden"><motion.div animate={{ width: `${loadingProgress}%` }} className="h-full bg-gradient-to-r from-cyan-400 to-violet-500" /></div></div> : <button onClick={startGame} className={`w-full min-h-14 rounded-2xl bg-gradient-to-r ${selected.accent} text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl ${selected.glow} active:scale-[.98] transition-transform`}><Play size={20} className="fill-current" /> Начать охоту</button>}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[9px] sm:text-[11px] font-bold text-slate-400 [@media(max-height:450px)]:hidden"><span>5 × Andromeda</span><span>18 щитов</span><span>1 × Dreadnought</span></div>
            </div>
          </motion.div>
        </div>
      )}


      {(gameState === "gameover" || gameState === "victory") && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/72 backdrop-blur-lg pointer-events-auto">
          <motion.div initial={{ opacity: 0, scale: 0.82 }} animate={{ opacity: 1, scale: 1 }} className={`w-full max-w-md rounded-[30px] border p-6 sm:p-8 text-center shadow-2xl ${gameState === "victory" ? "bg-gradient-to-b from-indigo-950 to-slate-950 border-amber-300/45" : "bg-slate-950 border-rose-400/35"}`}>
            <div className={`mx-auto w-20 h-20 rounded-3xl flex items-center justify-center ${gameState === "victory" ? "bg-amber-400/15 text-amber-300" : "bg-rose-400/10 text-rose-300"}`}>{gameState === "victory" ? <Trophy size={43} /> : <Heart size={43} />}</div>
            <h2 className="mt-4 text-2xl sm:text-3xl font-black">{gameState === "victory" ? "Дредноут повержен!" : "Щит исчерпан"}</h2>
            <p className="mt-2 text-sm text-slate-300">{gameState === "victory" ? "Звёздный путь свободен. Миссия выполнена, герой!" : `Ты прошёл ${enemiesDefeated} из 5 кораблей Andromeda. Следующий прорыв будет сильнее.`}</p>
            <div className="mt-4 rounded-2xl bg-white/[.055] border border-white/10 py-3"><p className="text-xs text-slate-400">Результат</p><p className="text-xl font-black text-amber-300">{score} очков {gameState === "victory" ? "• +500 ⭐" : ""}</p></div>
            <div className="mt-5 grid grid-cols-2 gap-3"><button onClick={launchMission} className="min-h-12 rounded-xl bg-slate-800 border border-white/10 text-sm font-black flex items-center justify-center gap-2"><RotateCcw size={17} /> Ещё раз</button><button onClick={onClose} className="min-h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-sm font-black">В портал</button></div>
          </motion.div>
        </div>
      )}

      {gameState !== "playing" && <button onClick={() => { audioRef.current.enabled = soundMuted; setSoundMuted(!soundMuted); }} aria-label={soundMuted ? "Включить звук" : "Выключить звук"} className="absolute z-30 bottom-[max(14px,env(safe-area-inset-bottom))] right-3 sm:right-5 w-11 h-11 rounded-full bg-black/55 border border-white/15 backdrop-blur-md flex items-center justify-center pointer-events-auto active:scale-90 transition-transform">
        {soundMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>}
      {runtime.current.powered && gameState === "playing" && <div className="absolute z-20 bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/15 border border-amber-300/40 text-amber-200 text-xs font-black pointer-events-none shadow-[0_0_25px_rgba(251,191,36,.25)]"><Zap size={16} className="fill-current" /> ЗОЛОТОЙ ЛАЗЕР ×2</div>}
    </div>
  );
}
