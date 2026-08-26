"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX, RotateCcw, Trophy, Sparkles, Heart, Zap, Play } from "lucide-react";
import confetti from "canvas-confetti";
import { MobileLandscapeGate, useMobileLandscapeLaunch } from "./MobileLandscapeGate";

interface DragonSnowGameProps {
  onClose: () => void;
  onVictory?: (score: number, stars: number) => void;
  targetScore?: number;
}

// Procedural Pine Tree Builder
function createWinterPineTree() {
  const tree = new THREE.Group();

  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 2.2, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3f2d21, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1.1;
  tree.add(trunk);

  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x164e3b, roughness: 0.85, flatShading: true });
  const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

  const layers = [
    { r: 2.1, h: 1.9, y: 1.9 },
    { r: 1.6, h: 1.6, y: 3.0 },
    { r: 1.1, h: 1.3, y: 4.0 },
  ];

  layers.forEach((l) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(l.r, l.h, 7), foliageMat);
    cone.position.y = l.y;
    tree.add(cone);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(l.r * 0.82, l.h * 0.45, 7), snowCapMat);
    cap.position.y = l.y + l.h * 0.28;
    tree.add(cap);
  });

  return tree;
}

// Sound Synthesizer
class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private initCtx() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) this.ctx = new AudioCtx();
  }

  public playCollectStar() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
    } catch {}
  }

  public playCollectCrystal() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const now = this.ctx.currentTime;
      const notes = [659.25, 830.61, 1046.5, 1318.51];
      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.04);
        gain.gain.setValueAtTime(0.15, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.26);
      });
    } catch {}
  }

  public playHit() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.28);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.29);
    } catch {}
  }

  public playVictory() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const now = this.ctx.currentTime;
      const fanfares = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
      fanfares.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.09);
        gain.gain.setValueAtTime(0.2, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.42);
      });
    } catch {}
  }
}

export default function DragonSnowGame({
  onClose,
  onVictory,
  targetScore = 600, // Doubled duration for long satisfying run!
}: DragonSnowGameProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const soundEngineRef = useRef<SoundEngine>(new SoundEngine());

  const [gameState, setGameState] = useState<"loading" | "ready" | "playing" | "gameover" | "victory">("loading");
  const [score, setScore] = useState(0);
  const [starsCount, setStarsCount] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [soundMuted, setSoundMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const { showRotateHint, isPortraitTouch, launchInLandscape } = useMobileLandscapeLaunch();

  // 5 full-width playable lanes covering [-3.8 .. +3.8]
  const LANES = [-4.5, -1.5, 1.5, 4.5];

  const gameRef = useRef({
    running: false,
    score: 0,
    stars: 0,
    hearts: 3,
    baseSpeed: 28,
    speed: 28,
    speedPenalty: 1.0, // Slows on hit, recovers over 3s!
    targetX: 0,
    playerX: 0,
    playerZ: -2.0,
    jumpY: 0,
    gullyRadius: 4.8,
    gullyDepth: 1.2,
    slopeDropRatio: 0.18,
    invincibleTimer: 0,
    items: [] as Array<{
      mesh: THREE.Object3D;
      type: "star" | "crystal" | "rock";
      lane: number;
      z: number;
      collected: boolean;
      radius: number;
    }>,
    trees: [] as Array<THREE.Group>,
    ambientSnow: null as THREE.Points | null,
    carveParticles: [] as Array<{
      mesh: THREE.Mesh;
      life: number;
      maxLife: number;
      vx: number;
      vy: number;
      vz: number;
    }>,
    dragonRoot: null as THREE.Group | null,
  });

  const toggleSound = () => {
    soundEngineRef.current.enabled = soundMuted;
    setSoundMuted(!soundMuted);
  };

  const handleStartGame = useCallback(() => {
    void launchInLandscape(() => {
      setGameState("playing");
      setHasInteracted(true);
      gameRef.current.running = true;
    });
  }, [launchInLandscape]);

  useEffect(() => {
    if (gameState === "playing") gameRef.current.running = !isPortraitTouch;
  }, [gameState, isPortraitTouch]);

  const handleRestart = useCallback(() => {
    setScore(0);
    setStarsCount(0);
    setHearts(3);
    setSpeedMultiplier(1.0);
    gameRef.current.score = 0;
    gameRef.current.stars = 0;
    gameRef.current.hearts = 3;
    gameRef.current.speed = gameRef.current.baseSpeed;
    gameRef.current.speedPenalty = 1.0;
    gameRef.current.playerX = 0;
    gameRef.current.targetX = 0;
    gameRef.current.jumpY = 0;
    gameRef.current.invincibleTimer = 0;

    gameRef.current.items.forEach((item, idx) => {
      const rowIdx = Math.floor(idx / 2);
      item.mesh.position.z = -25 - rowIdx * 25 - Math.random() * 4;
      item.mesh.visible = true;
      item.collected = false;
    });

    setGameState("playing");
    gameRef.current.running = true;
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene & Alpine Sky
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7ec0ee);
    scene.fog = new THREE.FogExp2(0x9bd0f5, 0.007);

    // 2. Camera: Balanced 3rd person perspective overlooking the dragon
    const camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 400);
    camera.position.set(0, 3.0, 4.5);
    camera.lookAt(0, -0.6, -18.0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const hemiLight = new THREE.HemisphereLight(0xf0f9ff, 0x1e3a8a, 2.0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.6);
    sunLight.position.set(25, 45, 15);
    scene.add(sunLight);

    // 5. Solid Natural Downhill Snow Run Ground Mesh
    const groundWidth = 36;
    const groundLength = 400;
    const groundGeo = new THREE.PlaneGeometry(groundWidth, groundLength, 32, 80);
    groundGeo.rotateX(-Math.PI / 2);

    const groundZCenter = -groundLength / 2 + 10;
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const worldZ = vz + groundZCenter;
      const absX = Math.abs(vx);

      const slopeY = worldZ * gameRef.current.slopeDropRatio;

      let gullyY = 0;
      if (absX < gameRef.current.gullyRadius) {
        gullyY = Math.pow(absX / gameRef.current.gullyRadius, 2) * gameRef.current.gullyDepth;
      } else {
        const flankDist = absX - gameRef.current.gullyRadius;
        gullyY = gameRef.current.gullyDepth + Math.pow(flankDist / 4.5, 1.3) * 3.2;
      }

      pos.setY(i, slopeY + gullyY);
    }
    groundGeo.computeVertexNormals();

    const snowCanvas = document.createElement("canvas");
    snowCanvas.width = 512;
    snowCanvas.height = 512;
    const sCtx = snowCanvas.getContext("2d");
    if (sCtx) {
      sCtx.fillStyle = "#e0f2fe";
      sCtx.fillRect(0, 0, 512, 512);

      for (let i = 0; i < 4000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        sCtx.fillStyle = Math.random() > 0.5 ? "rgba(255, 255, 255, 0.7)" : "rgba(186, 230, 253, 0.4)";
        sCtx.fillRect(x, y, 2, 2);
      }

      // Center carved ski tracks
      sCtx.fillStyle = "rgba(125, 211, 252, 0.4)";
      sCtx.fillRect(160, 0, 16, 512);
      sCtx.fillRect(336, 0, 16, 512);
      sCtx.fillStyle = "rgba(56, 189, 248, 0.3)";
      sCtx.fillRect(248, 0, 16, 512);
    }
    const snowTex = new THREE.CanvasTexture(snowCanvas);
    snowTex.wrapS = THREE.RepeatWrapping;
    snowTex.wrapT = THREE.RepeatWrapping;
    snowTex.repeat.set(3, 25);
    snowTex.needsUpdate = true;

    const groundMat = new THREE.MeshStandardMaterial({
      map: snowTex,
      roughness: 0.65,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.set(0, 0, groundZCenter);
    scene.add(groundMesh);

    // 6. Winter Pine Trees
    const treesList: THREE.Group[] = [];
    const numTrees = 32;
    for (let i = 0; i < numTrees; i++) {
      const tree = createWinterPineTree();
      const isRight = i % 2 === 0;
      const x = isRight ? 7.8 + (i % 3) * 2.5 : -7.8 - (i % 3) * 2.5;
      const z = -Math.floor(i / 2) * 16 - Math.random() * 4;

      const slopeY = z * gameRef.current.slopeDropRatio;
      const flankDist = Math.abs(x) - gameRef.current.gullyRadius;
      const flankY = gameRef.current.gullyDepth + Math.pow(Math.max(0, flankDist) / 4.5, 1.3) * 3.2;

      const scale = 0.9 + Math.random() * 0.3;
      tree.scale.set(scale, scale, scale);
      tree.position.set(x, slopeY + flankY, z);
      tree.rotation.y = Math.random() * Math.PI * 2;

      scene.add(tree);
      treesList.push(tree);
    }
    gameRef.current.trees = treesList;

    // 7. Dynamic Snow Carving Plume Particles
    const carveGroup = new THREE.Group();
    scene.add(carveGroup);

    const carveMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    const carveGeo = new THREE.DodecahedronGeometry(0.18, 0);

    const carvePool: Array<any> = [];
    for (let i = 0; i < 60; i++) {
      const pMesh = new THREE.Mesh(carveGeo, carveMat.clone());
      pMesh.visible = false;
      carveGroup.add(pMesh);
      carvePool.push({
        mesh: pMesh,
        life: 0,
        maxLife: 0.55,
        vx: 0,
        vy: 0,
        vz: 0,
      });
    }
    gameRef.current.carveParticles = carvePool;

    // Ambient Snowflakes
    const snowCount = 1000;
    const snowGeo = new THREE.BufferGeometry();
    const snowPos = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount * 3; i += 3) {
      snowPos[i] = (Math.random() - 0.5) * 50;
      snowPos[i + 1] = Math.random() * 30;
      snowPos[i + 2] = (Math.random() - 0.5) * 140;
    }
    snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
    const ambientSnow = new THREE.Points(
      snowGeo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.22,
        transparent: true,
        opacity: 0.8,
      })
    );
    scene.add(ambientSnow);
    gameRef.current.ambientSnow = ambientSnow;

    // 8. Player: Dragon Root (Leaning forward onto paws/feet)
    const dragonRoot = new THREE.Group();
    const playerSlopeY = gameRef.current.playerZ * gameRef.current.slopeDropRatio;
    dragonRoot.position.set(0, playerSlopeY + 0.05, gameRef.current.playerZ);
    dragonRoot.rotation.x = -0.05;
    scene.add(dragonRoot);
    gameRef.current.dragonRoot = dragonRoot;

    // Frost glow ring
    const frostRing = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.55, 20),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      })
    );
    frostRing.rotation.x = -Math.PI / 2;
    frostRing.position.y = 0.02;
    dragonRoot.add(frostRing);

    // Load full 3D Dragon Model (Compact scale)
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    loader.load(
      "/models/dragon.glb",
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.1 / maxDim;
        model.scale.set(scale, scale, scale);

        model.position.set(-center.x * scale, -box.min.y * scale + 0.02, -center.z * scale);
        model.rotation.y = Math.PI;

        dragonRoot.add(model);
        setGameState("ready");
      },
      undefined,
      (err) => {
        console.error("Dragon load error:", err);
        setGameState("ready");
      }
    );

    // 9. Deterministic Solvable Track Rows (5 full lanes)
    const starGeo = new THREE.OctahedronGeometry(0.45, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.95,
      metalness: 0.9,
      roughness: 0.1,
    });

    const crystalGeo = new THREE.IcosahedronGeometry(0.5, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.95,
      metalness: 0.95,
      roughness: 0.05,
    });

    const rockGeo = new THREE.DodecahedronGeometry(0.9, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.85,
      flatShading: true,
    });

    const itemsPool: Array<any> = [];
    const numRows = 24;

    for (let r = 0; r < numRows; r++) {
      const zPos = -25 - r * 25;

      const obsLane1 = Math.floor(Math.random() * LANES.length);
      const spawnSecond = Math.random() < 0.4;
      const obsLane2 = spawnSecond ? (obsLane1 + 2) % LANES.length : -1;

      const rockMesh = new THREE.Mesh(rockGeo, rockMat);
      const absX = Math.abs(LANES[obsLane1]);
      const gullyY = Math.pow(absX / gameRef.current.gullyRadius, 2) * gameRef.current.gullyDepth;
      const slopeY = zPos * gameRef.current.slopeDropRatio;
      rockMesh.position.set(LANES[obsLane1], slopeY + gullyY + 0.65, zPos);
      scene.add(rockMesh);
      itemsPool.push({
        mesh: rockMesh,
        type: "rock",
        lane: LANES[obsLane1],
        z: zPos,
        collected: false,
        radius: 0.8,
      });

      const freeLanes = LANES.filter((_, idx) => idx !== obsLane1 && idx !== obsLane2);
      const rewardLane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
      const isCrystal = Math.random() < 0.3;

      let rewardMesh: THREE.Object3D;
      let rewardType: "star" | "crystal" = isCrystal ? "crystal" : "star";
      if (isCrystal) {
        rewardMesh = new THREE.Mesh(crystalGeo, crystalMat);
      } else {
        rewardMesh = new THREE.Mesh(starGeo, starMat);
      }
      const absRewardX = Math.abs(rewardLane);
      const gullyRewardY = Math.pow(absRewardX / gameRef.current.gullyRadius, 2) * gameRef.current.gullyDepth;
      rewardMesh.position.set(rewardLane, slopeY + gullyRewardY + 0.95, zPos);
      scene.add(rewardMesh);
      itemsPool.push({
        mesh: rewardMesh,
        type: rewardType,
        lane: rewardLane,
        z: zPos,
        collected: false,
        radius: 0.7,
      });
    }
    gameRef.current.items = itemsPool;

    // 10. Controls: Clamped strictly to outer lane limits
    let isPointerDown = false;
    let startPointerX = 0;
    let startPlayerX = 0;

    const onPointerDown = (e: PointerEvent) => {
      isPointerDown = true;
      startPointerX = e.clientX;
      startPlayerX = gameRef.current.targetX;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDown) return;
      const deltaX = e.clientX - startPointerX;
      const sensitivity = 0.022;
      const maxX = 4.5;
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
      let closestIdx = 2;
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

      if (gameRef.current.ambientSnow) {
        const positions = gameRef.current.ambientSnow.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] -= delta * 8.0;
          if (positions[i] < -35) positions[i] = 25;
        }
        gameRef.current.ambientSnow.geometry.attributes.position.needsUpdate = true;
      }

      if (gameRef.current.running) {
        // Slowdown recovery over 3.0s after hitting rock
        if (gameRef.current.speedPenalty < 1.0) {
          gameRef.current.speedPenalty = Math.min(1.0, gameRef.current.speedPenalty + delta * 0.22);
        }

        // Progressive gentle speed curve: 1.0x -> max 1.30x over 600 points (2x longer duration!)
        const speedFactor = 1.0 + Math.min(gameRef.current.score / 500, 0.3);
        const effectiveSpeed = gameRef.current.baseSpeed * speedFactor * gameRef.current.speedPenalty;
        gameRef.current.speed = effectiveSpeed;
        setSpeedMultiplier(parseFloat((speedFactor * gameRef.current.speedPenalty).toFixed(1)));

        // Smooth Movement across gully
        const dx = gameRef.current.targetX - gameRef.current.playerX;
        gameRef.current.playerX += dx * Math.min(delta * 14, 1.0);
        dragonRoot.position.x = gameRef.current.playerX;
        dragonRoot.position.z = gameRef.current.playerZ;

        if (gameRef.current.jumpY > 0) {
          gameRef.current.jumpY = Math.max(0, gameRef.current.jumpY - delta * 2.2);
        }

        const absX = Math.abs(gameRef.current.playerX);
        const gullyY = Math.pow(absX / gameRef.current.gullyRadius, 2) * gameRef.current.gullyDepth;
        const playerSlopeY = gameRef.current.playerZ * gameRef.current.slopeDropRatio;
        dragonRoot.position.y = playerSlopeY + 0.05 + gullyY + gameRef.current.jumpY + Math.sin(time * 10) * 0.03;

        const normX = gameRef.current.playerX / gameRef.current.gullyRadius;
        const bankAngle = -dx * 0.28 - normX * 0.22;
        dragonRoot.rotation.z = THREE.MathUtils.lerp(dragonRoot.rotation.z, bankAngle, delta * 12);
        dragonRoot.rotation.y = THREE.MathUtils.lerp(dragonRoot.rotation.y, dx * 0.16, delta * 10);
        dragonRoot.rotation.x = -0.05;

        // Dynamic snow carving plume
        const spawnCount = Math.abs(dx) > 0.05 ? 3 : 1;
        for (let s = 0; s < spawnCount; s++) {
          const p = gameRef.current.carveParticles.find((item) => item.life <= 0);
          if (p) {
            p.life = p.maxLife;
            p.mesh.visible = true;
            p.mesh.position.set(
              gameRef.current.playerX + (Math.random() - 0.5) * 0.35,
              dragonRoot.position.y + 0.05,
              dragonRoot.position.z + 0.35
            );
            p.vx = -dx * 1.5 + (Math.random() - 0.5) * 0.8;
            p.vy = 0.35 + Math.random() * 0.6;
            p.vz = 4.0 + Math.random() * 2.5;
          }
        }

        gameRef.current.carveParticles.forEach((p) => {
          if (p.life > 0) {
            p.life -= delta;
            p.mesh.position.x += p.vx * delta;
            p.mesh.position.y += p.vy * delta;
            p.mesh.position.z += p.vz * delta;

            const progress = p.life / p.maxLife;
            const scale = (1.0 - progress) * 1.6 + 0.4;
            p.mesh.scale.set(scale, scale, scale);
            (p.mesh.material as THREE.MeshBasicMaterial).opacity = progress * 0.75;

            if (p.life <= 0) {
              p.mesh.visible = false;
            }
          }
        });

        // Fast 2-blink collision feedback (0.7s total duration, only 2 quick blinks!)
        if (gameRef.current.invincibleTimer > 0) {
          gameRef.current.invincibleTimer -= delta;
          const blinkPhase = Math.floor((0.7 - gameRef.current.invincibleTimer) * 5.7);
          dragonRoot.visible = blinkPhase % 2 === 0;
        } else {
          dragonRoot.visible = true;
        }

        camera.position.x = THREE.MathUtils.lerp(camera.position.x, gameRef.current.playerX * 0.3, delta * 6);

        // Move winter trees dynamically along the slope
        const moveDist = effectiveSpeed * delta;
        gameRef.current.trees.forEach((tree) => {
          tree.position.z += moveDist;
          const slopeY = tree.position.z * gameRef.current.slopeDropRatio;
          const flankDist = Math.abs(tree.position.x) - gameRef.current.gullyRadius;
          const flankY = gameRef.current.gullyDepth + Math.pow(Math.max(0, flankDist) / 4.5, 1.3) * 3.2;
          tree.position.y = slopeY + flankY;

          if (tree.position.z > 20) {
            tree.position.z -= 250;
          }
        });

        // Move slope items
        const resetThresholdZ = 8;
        const respawnZ = -250;

        gameRef.current.items.forEach((item) => {
          item.mesh.position.z += moveDist;

          const absItemX = Math.abs(item.mesh.position.x);
          const gY = Math.pow(absItemX / gameRef.current.gullyRadius, 2) * gameRef.current.gullyDepth;
          const sY = item.mesh.position.z * gameRef.current.slopeDropRatio;
          item.mesh.position.y = sY + gY + (item.type === "star" || item.type === "crystal" ? 0.95 : 0.65);

          if (item.type === "star" || item.type === "crystal") {
            item.mesh.rotation.y += delta * 3.5;
            item.mesh.rotation.x += delta * 1.5;
          }

          // Collision Check
          if (
            !item.collected &&
            item.mesh.position.z > gameRef.current.playerZ - 1.0 &&
            item.mesh.position.z < gameRef.current.playerZ + 1.2 &&
            Math.abs(item.mesh.position.x - gameRef.current.playerX) < (item.type === "rock" ? 1.55 : item.radius)
          ) {
            if (item.type === "star" || item.type === "crystal") {
              item.collected = true;
              item.mesh.visible = false;
              if (item.type === "star") {
                gameRef.current.score += 5; // Balanced point distribution for 60s flight
                gameRef.current.stars += 1;
                soundEngineRef.current.playCollectStar();
              } else {
                gameRef.current.score += 10;
                gameRef.current.stars += 2;
                soundEngineRef.current.playCollectCrystal();
              }
              setScore(gameRef.current.score);
              setStarsCount(gameRef.current.stars);

              if (gameRef.current.score >= targetScore) {
                gameRef.current.running = false;
                setGameState("victory");
                soundEngineRef.current.playVictory();
                confetti({
                  particleCount: 100,
                  spread: 85,
                  origin: { y: 0.6 },
                });
                if (onVictory) onVictory(gameRef.current.score, gameRef.current.stars);
              }
            } else if (item.type === "rock") {
              if (gameRef.current.invincibleTimer <= 0) {
                item.collected = true;
                item.mesh.visible = false;
                gameRef.current.hearts -= 1;
                gameRef.current.invincibleTimer = 0.7; // Fast 0.7s: 2 quick blinks!
                gameRef.current.speedPenalty = 0.55; // Quick speed drop, recovers in 1.2s
                gameRef.current.jumpY = 0.35; // Bouncy collision jump
                soundEngineRef.current.playHit();
                setHearts(gameRef.current.hearts);

                if (gameRef.current.hearts <= 0) {
                  gameRef.current.running = false;
                  setGameState("gameover");
                }
              }
            }
          }

          if (item.mesh.position.z > resetThresholdZ) {
            item.mesh.position.z = respawnZ - Math.random() * 35;
            const laneIndex = Math.floor(Math.random() * LANES.length);
            item.mesh.position.x = LANES[laneIndex];
            item.collected = false;
            item.mesh.visible = true;
          }
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
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
  }, [targetScore, onVictory]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center select-none overflow-hidden touch-none">
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />
      <MobileLandscapeGate visible={showRotateHint || (gameState === "playing" && isPortraitTouch)} />

      {/* TOP CONTROLS & CLOSE BUTTON (ALWAYS VISIBLE IN ALL STATES) */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        <button
          onClick={toggleSound}
          aria-label="Звук"
          className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/90 hover:text-white flex items-center justify-center transition-all shadow-xl active:scale-95 cursor-pointer"
        >
          {soundMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        <button
          onClick={onClose}
          aria-label="Выйти"
          className="w-11 h-11 rounded-full bg-rose-600/80 hover:bg-rose-600 backdrop-blur-md border border-rose-400/40 text-white flex items-center justify-center transition-all shadow-xl active:scale-95 cursor-pointer"
        >
          <X size={22} strokeWidth={2.5} />
        </button>
      </div>

      {/* TOP HUD BAR DURING GAME */}
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

          <div className="px-3.5 py-2 rounded-full bg-sky-950/70 backdrop-blur-md border border-sky-400/30 flex items-center gap-1 text-sky-300 font-extrabold text-xs shadow-xl pointer-events-auto">
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

      {/* FLOATING GESTURE HINT */}
      {gameState === "playing" && !hasInteracted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-12 z-20 pointer-events-none px-6 py-3 rounded-2xl bg-black/75 backdrop-blur-md border border-sky-400/40 text-white shadow-2xl flex items-center gap-3"
        >
          <span className="text-2xl animate-bounce">👆</span>
          <div className="text-left">
            <p className="text-xs font-black text-sky-300 uppercase tracking-wider">
              Управление
            </p>
            <p className="text-sm font-bold text-slate-100">
              Свайпай влево ⇄ вправо для маневра
            </p>
          </div>
        </motion.div>
      )}

      {/* START / READY SCREEN */}
      {gameState === "ready" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute z-30 p-6 sm:p-8 max-w-md w-full mx-4 rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-sky-500/30 text-white text-center shadow-2xl flex flex-col items-center gap-4"
        >
          <div className="w-18 h-18 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-4xl shadow-lg shadow-sky-500/30">
            🏂 🐲
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-sky-300 tracking-tight">
              Зимний Дракон
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
              Скоростной спуск по снежному склону с зимними елями!
            </p>
          </div>

          <div className="px-4 py-3 rounded-xl bg-sky-950/60 border border-sky-500/30 text-xs font-semibold text-sky-200 flex items-center gap-2">
            <span>👆 ⇄ Свайпай пальцем или стрелками</span>
          </div>

          <button
            onClick={handleStartGame}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95 transition-all cursor-pointer"
          >
            <Play size={20} className="fill-current" />
            <span>В путь!</span>
          </button>
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
                Победа!
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                Спуск пройден!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Ты мастерски покорил снежный каньон!
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
                onClick={handleRestart}
                className="flex-1 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 font-black text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw size={16} />
                <span>Ещё раз</span>
              </button>
              <button
                onClick={onClose}
                className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>Забрать награду 🎁</span>
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
                Упс! Препятствие!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Набрано очков: <strong className="text-white font-black">{score}</strong>. Попробуй ещё раз!
              </p>
            </div>

            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={handleRestart}
                className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95 transition-all cursor-pointer"
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
