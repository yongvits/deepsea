import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Shield, 
  Wind, 
  Gauge, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Sparkles, 
  Award, 
  Wrench, 
  Play, 
  Battery, 
  Languages, 
  Heart,
  Compass,
  ArrowLeft,
  Settings,
  HelpCircle,
  Video,
  ChevronRight,
  RefreshCw,
  Coins
} from 'lucide-react';
import './index.css';

// ======================================================================
// TYPE DECLARATIONS & CONFIG
// ======================================================================

interface SubColor {
  id: string;
  name: string;
  primary: string;
  glow: string;
  window: string;
  nameColor: string;
}

const COLOR_OPTIONS: SubColor[] = [
  { id: 'yellow', name: 'เหลืองคลาสสิก', primary: '#eab308', glow: 'rgba(234, 179, 8, 0.4)', window: '#22d3ee', nameColor: 'text-yellow-400' },
  { id: 'cyan', name: 'นีออนไซแอน', primary: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', window: '#fbbf24', nameColor: 'text-cyan-400' },
  { id: 'red', name: 'คริมสันแดง', primary: '#dc2626', glow: 'rgba(220, 38, 38, 0.4)', window: '#22d3ee', nameColor: 'text-red-500' },
  { id: 'green', name: 'เขียวมรกต', primary: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', window: '#f43f5e', nameColor: 'text-emerald-400' },
  { id: 'purple', name: 'ม่วงแฟนตาซี', primary: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)', window: '#34d399', nameColor: 'text-purple-400' }
];

const CONFIG = {
  baseScrollSpeed: 2.2,
};

const ZONES = [
  { nameTh: 'เขตรับแสงแดด (Sunlit)', startDepth: 0, descTh: 'แสงแดดส่องถึงได้อย่างชัดเจน พบปลาทั่วไปสีสันสวยงาม' },
  { nameTh: 'เขตแดนพลบค่ำ (Twilight)', startDepth: 1000, descTh: 'แสงอาทิตย์เลือนลางกลายเป็นสีครามเข้ม เริ่มพบสัตว์เรืองแสง' },
  { nameTh: 'เขตเที่ยงคืน (Midnight)', startDepth: 2500, descTh: 'ความมืดมิดร้อยเปอร์เซ็นต์ พบแมงกะพรุนเรืองแสงและอสูรกายที่มีแสงล่อเหยื่อ' },
  { nameTh: 'เหวลึกใต้มหาสมุทร (Abyss)', startDepth: 5000, descTh: 'แรงดันกดทับระดับทำลายล้าง ถิ่นพำนักของเจ้าทะเลโบราณและอสูรกายหมึกกัปตัน' }
];

interface Upgrades {
  hull: number;      
  engine: number;    
  oxygen: number;    
  light: number;      
}

interface LeaderboardEntry {
  id: string;
  playerName: string;
  depth: number;
  coinsGained: number;
  date: string;
  subColorIndex: number;
}

interface HistoryEntry {
  id: string;
  playerName: string;
  depth: number;
  coinsGained: number;
  reason: string;
  date: string;
  time: string;
}

interface GameState {
  playerName: string;
  coins: number;
  highscore: number;
  upgrades: Upgrades;
  controlMode: 'touch' | 'camera' | 'tilt';
  subColorIndex: number;
}

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', playerName: 'กัปตันมารีน', depth: 3250, coinsGained: 450, date: '2 ส.ค.', subColorIndex: 1 },
  { id: '2', playerName: 'นักดิ่งนีออน', depth: 2840, coinsGained: 380, date: '2 ส.ค.', subColorIndex: 0 },
  { id: '3', playerName: 'กัปตันอันดามัน', depth: 2100, coinsGained: 290, date: '1 ส.ค.', subColorIndex: 4 },
  { id: '4', playerName: 'ผู้พิชิตเหวลึก', depth: 1650, coinsGained: 210, date: '1 ส.ค.', subColorIndex: 3 },
  { id: '5', playerName: 'กัปตันสายหมอก', depth: 1280, coinsGained: 160, date: '1 ส.ค.', subColorIndex: 2 },
  { id: '6', playerName: 'นักสำรวจอ่าวไทย', depth: 950, coinsGained: 110, date: '31 ก.ค.', subColorIndex: 0 },
  { id: '7', playerName: 'กัปตันสมอเรือ', depth: 620, coinsGained: 80, date: '31 ก.ค.', subColorIndex: 1 }
];

const UPGRADES_CONF = {
  hull: {
    maxLevel: 5,
    costMultiplier: 80,
    values: [150, 200, 280, 380, 500]
  },
  engine: {
    maxLevel: 5,
    costMultiplier: 70,
    values: [0.22, 0.28, 0.35, 0.42, 0.50] 
  },
  oxygen: {
    maxLevel: 5,
    costMultiplier: 70,
    values: [0.015, 0.011, 0.008, 0.005, 0.002] 
  },
  light: {
    maxLevel: 5,
    costMultiplier: 60,
    values: [
      { length: 240, width: 60 },
      { length: 280, width: 70 },
      { length: 320, width: 80 },
      { length: 380, width: 95 },
      { length: 450, width: 120 }
    ]
  }
};

// ======================================================================
// RETRO AUDIO CONTROLLER (WEB AUDIO API SYNTHESIZER)
// ======================================================================
class RetroAudioController {
  public ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private activeOscillators: Set<OscillatorNode> = new Set();
  private lastSonarTime: number = 0;
  private lastSoundTimes: Record<string, number> = {};

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
    } catch (e) {
      console.error("AudioContext blocked or unsupported.");
    }
  }

  resumeContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  stopAll() {
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    this.activeOscillators.clear();
  }

  playTone(freqStart: number, freqEnd: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.08, soundKey?: string) {
    if (!this.enabled) return;

    const now = performance.now();
    if (soundKey) {
      if (this.lastSoundTimes[soundKey] && now - this.lastSoundTimes[soundKey] < 120) {
        return;
      }
      this.lastSoundTimes[soundKey] = now;
    }

    this.resumeContext();
    if (!this.ctx || this.ctx.state === 'closed') return;

    if (this.activeOscillators.size >= 4) return;

    const safeStart = isNaN(freqStart) ? 440 : Math.max(30, Math.min(freqStart, 8000));
    const safeEnd = isNaN(freqEnd) ? 440 : Math.max(30, Math.min(freqEnd, 8000));
    const safeDur = isNaN(duration) ? 0.1 : Math.max(0.01, Math.min(duration, 0.8));
    const safeVol = isNaN(volume) ? 0.05 : Math.max(0.0, Math.min(volume, 0.2));

    try {
      const audioNow = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(safeStart, audioNow);
      if (safeEnd !== safeStart) {
        osc.frequency.exponentialRampToValueAtTime(safeEnd, audioNow + safeDur);
      }

      gainNode.gain.setValueAtTime(0, audioNow);
      gainNode.gain.linearRampToValueAtTime(safeVol, audioNow + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioNow + safeDur);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      this.activeOscillators.add(osc);

      const cleanup = () => {
        this.activeOscillators.delete(osc);
        try {
          gainNode.disconnect();
          osc.disconnect();
        } catch (e) {}
      };

      osc.onended = cleanup;
      osc.start(audioNow);
      osc.stop(audioNow + safeDur);

      setTimeout(cleanup, safeDur * 1000 + 40);
    } catch (err) {
      console.warn("Audio playback failover:", err);
    }
  }

  playCoin() {
    this.playTone(587.33, 880, 0.15, 'sine', 0.06, 'coin');
  }

  playPowerup() {
    this.playTone(330, 880, 0.25, 'triangle', 0.08, 'powerup');
  }

  playHit() {
    this.playTone(160, 50, 0.15, 'triangle', 0.08, 'hit');
  }

  playExplosion() {
    this.playTone(100, 20, 0.3, 'triangle', 0.1, 'explosion');
  }

  playGameOver() {
    this.playTone(220, 55, 0.6, 'sine', 0.1, 'gameover');
  }

  playSonarWarning(isExtremelyUrgent = false) {
    const now = performance.now();
    const cooldown = isExtremelyUrgent ? 1200 : 2000;
    if (now - this.lastSonarTime < cooldown) return;
    this.lastSonarTime = now;

    const pitch = isExtremelyUrgent ? 880 : 660;
    this.playTone(pitch, pitch, 0.1, 'sine', 0.05, 'sonar');
  }
}

const audio = new RetroAudioController();

// ======================================================================
// MAIN REACT COMPONENT
// ======================================================================
function App() {
  const [screen, setScreen] = useState<'menu' | 'game' | 'shop' | 'gameover'>('menu');
  
  // Highscore, Coins, Upgrades State
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem('deep_sea_descent_save_v7');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          playerName: parsed.playerName || 'กัปตันสมอ',
          coins: parsed.coins !== undefined ? parsed.coins : 200,
          highscore: parsed.highscore || 0,
          upgrades: {
            hull: parsed.upgrades?.hull || 1,
            engine: parsed.upgrades?.engine || 1,
            oxygen: parsed.upgrades?.oxygen || 1,
            light: parsed.upgrades?.light || 1,
          },
          controlMode: parsed.controlMode || 'touch',
          subColorIndex: parsed.subColorIndex !== undefined ? parsed.subColorIndex : 0
        };
      } catch (e) {
        console.error("Save load failed", e);
      }
    }
    return {
      playerName: 'กัปตันสมอ',
      coins: 200,
      highscore: 0,
      upgrades: { hull: 1, engine: 1, oxygen: 1, light: 1 },
      controlMode: 'touch',
      subColorIndex: 0
    };
  });

  // Global Leaderboard State
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    const saved = localStorage.getItem('deep_sea_leaderboard_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_LEADERBOARD;
  });

  const [historyLogs, setHistoryLogs] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem('deep_sea_history_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [
      { id: 'h1', playerName: 'กัปตันสมอ', depth: 1250, coinsGained: 180, reason: 'ออกซิเจนหมด', date: '2 ส.ค.', time: '14:20' },
      { id: 'h2', playerName: 'กัปตันสมอ', depth: 680, coinsGained: 90, reason: 'เรือชนสิ่งกีดขวาง', date: '1 ส.ค.', time: '18:45' }
    ];
  });

  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'rankings' | 'history'>('rankings');

  useEffect(() => {
    localStorage.setItem('deep_sea_leaderboard_v2', JSON.stringify(leaderboard));
  }, [leaderboard]);

  useEffect(() => {
    localStorage.setItem('deep_sea_history_v1', JSON.stringify(historyLogs));
  }, [historyLogs]);

  // Soundtrack control
  const [soundOn, setSoundOn] = useState(true);

  // Active Dive Running States
  const [currentDepth, setCurrentDepth] = useState(0);
  const [goldAcquiredThisDive, setGoldAcquiredThisDive] = useState(0);
  const [activeZoneIndex, setActiveZoneIndex] = useState(0);
  const [hullHp, setHullHp] = useState(100);
  const [maxHullHp, setMaxHullHp] = useState(100);
  const [oxygenLevel, setOxygenLevel] = useState(100);
  const [shieldActive, setShieldActive] = useState(false);
  const [isNewHighscore, setIsNewHighscore] = useState(false);
  const [deathReason, setDeathReason] = useState('');

  // Front camera state
  const [cameraActive, setCameraActive] = useState(false);

  // Modal alert
  const [modal, setModal] = useState<{ active: boolean; title: string; desc: string; icon: string; onConfirm?: () => void } | null>(null);

  // Canvas & DOM Element refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const webcamRef = useRef<HTMLVideoElement | null>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep references to state inside game loop to avoid React stale closures
  const stateRef = useRef<GameState>(gameState);
  useEffect(() => {
    stateRef.current = gameState;
    localStorage.setItem('deep_sea_descent_save_v6', JSON.stringify(gameState));
  }, [gameState]);

  const screenRef = useRef(screen);
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  // Audio control sync
  useEffect(() => {
    audio.enabled = soundOn;
  }, [soundOn]);

  const toggleSound = () => {
    audio.resumeContext();
    setSoundOn(!soundOn);
    if (!soundOn) {
      audio.enabled = true;
      audio.playCoin();
    }
  };

  const selectColor = (index: number) => {
    setGameState(prev => ({
      ...prev,
      subColorIndex: index
    }));
    audio.playCoin();
  };

  // Centroid Skin Tone Tracker Loop Variables
  const activeFaceRatio = useRef<number>(0.5);
  const frameIntervalId = useRef<any>(null);

  const startWebcam = () => {
    navigator.mediaDevices.getUserMedia({ video: { width: 160, height: 120, facingMode: "user" }, audio: false })
      .then(stream => {
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
          webcamRef.current.play();
        }
        setCameraActive(true);
        setGameState(prev => ({ ...prev, controlMode: 'camera' }));
        audio.playPowerup();

        // Boot frame analytical thread
        frameIntervalId.current = setInterval(processWebcamFrame, 40);
      })
      .catch(err => {
        console.error("Camera fail:", err);
        setModal({
          active: true,
          icon: "❌",
          title: "กล้องไม่ตอบสนอง",
          desc: "ไม่สามารถเปิดกล้องหน้าของคุณได้ โปรดตรวจสอบสิทธิ์ความปลอดภัยของบราวเซอร์"
        });
        setGameState(prev => ({ ...prev, controlMode: 'touch' }));
      });
  };

  const stopWebcam = () => {
    setCameraActive(false);
    if (frameIntervalId.current) {
      clearInterval(frameIntervalId.current);
      frameIntervalId.current = null;
    }
    if (webcamRef.current && webcamRef.current.srcObject) {
      const stream = webcamRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      webcamRef.current.srcObject = null;
    }
  };

  const toggleCameraControl = () => {
    audio.resumeContext();
    if (gameState.controlMode === 'camera') {
      stopWebcam();
      setGameState(prev => ({ ...prev, controlMode: 'touch' }));
      audio.playHit();
    } else {
      setModal({
        active: true,
        icon: "📷",
        title: "โหมดกล้องหน้า AI",
        desc: "เกมจะเปิดกล้องหน้าเพื่อตรวจจับพิกัดใบหน้าด้วยสีผิวแบบเรียลไทม์ 100% ปลอดภัยและไม่บันทึกรูปภาพ",
        onConfirm: () => {
          startWebcam();
          setModal(null);
        }
      });
    }
  };

  // Gyroscope orientation
  const deviceTiltGamma = useRef<number>(0);

  const activateTilt = () => {
    setGameState(prev => ({ ...prev, controlMode: 'tilt' }));
    window.addEventListener('deviceorientation', handleOrientation);
    stopWebcam();
    audio.playPowerup();
  };

  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (event.gamma !== null) {
      deviceTiltGamma.current = event.gamma;
    }
  };

  const toggleTiltControl = () => {
    audio.resumeContext();
    if (gameState.controlMode === 'tilt') {
      setGameState(prev => ({ ...prev, controlMode: 'touch' }));
      window.removeEventListener('deviceorientation', handleOrientation);
      audio.playHit();
    } else {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        (DeviceOrientationEvent as any).requestPermission()
          .then((permissionState: string) => {
            if (permissionState === 'granted') {
              activateTilt();
            } else {
              setModal({
                active: true,
                icon: "⚠️",
                title: "ข้อผิดพลาด",
                desc: "กรุณาเปิดสิทธิ์เซนเซอร์วัดระนาบเพื่อเล่นเกมโหมดเอียง"
              });
            }
          })
          .catch((e: any) => {
            setModal({
              active: true,
              icon: "❌",
              title: "บราวเซอร์ไม่รองรับ",
              desc: "เครื่องนี้ไม่พร้อมเข้าใช้งานเซนเซอร์ไจโรสโคปได้"
            });
          });
      } else {
        activateTilt();
      }
    }
  };

  // Core webcam skin chroma centroid detector
  const processWebcamFrame = () => {
    if (!webcamRef.current || !cameraCanvasRef.current) return;
    const rawVideo = webcamRef.current;
    if (rawVideo.readyState < 2) return;
    if (rawVideo.videoWidth === 0 || rawVideo.videoHeight === 0) return;

    const cameraCanvas = cameraCanvasRef.current;
    const cameraCtx = cameraCanvas.getContext('2d');
    if (!cameraCtx) return;

    cameraCanvas.width = 120;
    cameraCanvas.height = 160;

    cameraCtx.save();
    cameraCtx.translate(cameraCanvas.width, 0);
    cameraCtx.scale(-1, 1);
    cameraCtx.drawImage(rawVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
    cameraCtx.restore();

    try {
      const imgData = cameraCtx.getImageData(0, 0, cameraCanvas.width, cameraCanvas.height);
      const pixels = imgData.data;

      let sumX = 0;
      let sumY = 0;
      let skinPixelCount = 0;

      for (let y = 0; y < cameraCanvas.height; y += 3) {
        for (let x = 0; x < cameraCanvas.width; x += 3) {
          const idx = (y * cameraCanvas.width + x) * 4;
          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];

          // Normalized skin tone thresholding (Chroma space)
          const isSkin = r > 60 && g > 30 && b > 15 &&
                         r > g && r > b &&
                         (Math.max(r, g, b) - Math.min(r, g, b) > 10) &&
                         Math.abs(r - g) > 10;

          if (isSkin) {
            sumX += x;
            sumY += y;
            skinPixelCount++;
          }
        }
      }

      if (skinPixelCount > 30) {
        const centroidX = sumX / skinPixelCount;
        const centroidY = sumY / skinPixelCount;

        const rawRatio = centroidX / cameraCanvas.width;
        activeFaceRatio.current = activeFaceRatio.current * 0.75 + rawRatio * 0.25;

        // Draw bounding boxes on camera preview canvas
        cameraCtx.strokeStyle = "#22d3ee";
        cameraCtx.lineWidth = 2;
        cameraCtx.strokeRect(centroidX - 22, centroidY - 26, 44, 52);

        cameraCtx.fillStyle = "#22d3ee";
        cameraCtx.beginPath();
        cameraCtx.arc(centroidX, centroidY, 3, 0, Math.PI * 2);
        cameraCtx.fill();
      } else {
        // Return to dead center when missing face pixels
        activeFaceRatio.current = activeFaceRatio.current * 0.95 + 0.5 * 0.05;
      }
    } catch (e) {
      console.error("Frame analysis crash:", e);
    }
  };

  // Class representation of procedural creatures & items inside frame loops to avoid rendering overhead
  const gameActive = useRef<boolean>(false);
  const animationFrameId = useRef<any>(null);

  // Keyboard registers
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- START ACTIVE GAMEPLAY CAMPAIGN ---
  const launchDive = () => {
    audio.resumeContext();
    audio.playPowerup();

    // Reset loop
    gameActive.current = false;
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }

    setScreen('game');
    gameActive.current = true;

    // Apply Upgrades directly to local parameters
    const upgrades = stateRef.current.upgrades;
    const initialMaxHp = UPGRADES_CONF.hull.values[upgrades.hull - 1];
    setMaxHullHp(initialMaxHp);
    setHullHp(initialMaxHp);
    setOxygenLevel(100);
    setShieldActive(false);
    setCurrentDepth(0);
    setGoldAcquiredThisDive(0);
    setActiveZoneIndex(0);

    // Boot interactive loop
    setTimeout(() => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        runGameEngine();
      }
    }, 50);
  };

  // Upgrade buying logic
  const buyUpgrade = (type: keyof Upgrades) => {
    const costMultiplier = UPGRADES_CONF[type].costMultiplier;
    const currentLvl = gameState.upgrades[type];
    if (currentLvl >= UPGRADES_CONF[type].maxLevel) return;

    const cost = currentLvl * costMultiplier;
    if (gameState.coins >= cost) {
      setGameState(prev => {
        const updatedUpgrades = { ...prev.upgrades, [type]: prev.upgrades[type] + 1 };
        return {
          ...prev,
          coins: prev.coins - cost,
          upgrades: updatedUpgrades
        };
      });
      audio.playPowerup();
    } else {
      audio.playHit();
    }
  };

  const resetAllUpgradesAndCoins = () => {
    setModal({
      active: true,
      icon: "⚠️",
      title: "รีเซ็ตการอัปเกรด?",
      desc: "คุณต้องการรีเซ็ตประวัติการอัปเกรดทั้งหมดกลับเป็นค่าเริ่มต้นเลเวล 1 หรือไม่? (จำนวนเหรียญจะถูกรีเซ็ตกลับเป็นเริ่มต้นด้วย)",
      onConfirm: () => {
        setGameState(prev => ({
          ...prev,
          coins: 50,
          upgrades: { hull: 1, engine: 1, oxygen: 1, light: 1 }
        }));
        audio.playHit();
        setModal(null);
      }
    });
  };

  // Core drawing assets
  const runGameEngine = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Local registers matching state references to maintain 60FPS
    const upgradesRaw = (stateRef.current.upgrades || {}) as any;
    const activeUpgrades = {
      hull: upgradesRaw.hull || 1,
      engine: upgradesRaw.engine || 1,
      oxygen: upgradesRaw.oxygen || 1,
      light: upgradesRaw.light || 1,
    };
    const subColor = COLOR_OPTIONS[stateRef.current.subColorIndex] || COLOR_OPTIONS[0];
    const subSpeed = UPGRADES_CONF.engine.values[activeUpgrades.engine - 1] || UPGRADES_CONF.engine.values[0];
    const maxCapacityHp = UPGRADES_CONF.hull.values[activeUpgrades.hull - 1] || UPGRADES_CONF.hull.values[0];
    const flashlightRange = (UPGRADES_CONF.light.values[activeUpgrades.light - 1] || UPGRADES_CONF.light.values[0]).length;
    const flashlightWidth = (UPGRADES_CONF.light.values[activeUpgrades.light - 1] || UPGRADES_CONF.light.values[0]).width;

    const boat = {
      x: canvas.width / 2,
      y: 150,
      width: 48,
      height: 32,
      targetX: canvas.width / 2,
      propellerAngle: 0,
      hp: maxCapacityHp,
      maxHp: maxCapacityHp,
      oxygen: 100,
      shieldTime: 0
    };

    let depthLocal = 0;
    let goldLocal = 0;
    let zoneIndexLocal = 0;
    let shakeStrength = 0;

    let creatures: any[] = [];
    let items: any[] = [];
    let particles: any[] = [];
    let floatingTexts: any[] = [];

    // Screen touch/mouse listeners
    const handleMouseMovement = (e: MouseEvent) => {
      if (stateRef.current.controlMode !== 'touch') return;
      const rect = canvas.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      boat.targetX = (relativeX / rect.width) * canvas.width;
    };

    const handleTouchMovement = (e: TouchEvent) => {
      if (stateRef.current.controlMode !== 'touch') return;
      const rect = canvas.getBoundingClientRect();
      const touchX = e.touches[0].clientX - rect.left;
      boat.targetX = (touchX / rect.width) * canvas.width;
    };

    canvas.addEventListener('mousemove', handleMouseMovement);
    canvas.addEventListener('touchmove', handleTouchMovement, { passive: true });
    canvas.addEventListener('touchstart', (e) => {
      if (stateRef.current.controlMode !== 'touch') return;
      const rect = canvas.getBoundingClientRect();
      const touchX = e.touches[0].clientX - rect.left;
      const progress = touchX / rect.width;
      if (progress < 0.45) {
        boat.targetX = Math.max(30, boat.x - 70);
      } else if (progress > 0.55) {
        boat.targetX = Math.min(canvas.width - 30, boat.x + 70);
      } else {
        boat.targetX = progress * canvas.width;
      }
    }, { passive: true });

    let lastUiTick = 0;

    // Inner tick update
    const loop = () => {
      if (!gameActive.current || screenRef.current !== 'game') {
        gameActive.current = false;
        return;
      }

      // Sanitize counters
      if (isNaN(depthLocal)) depthLocal = 0;
      if (isNaN(goldLocal)) goldLocal = 0;

      // 1. Depth drift
      depthLocal += (0.6 + (activeUpgrades.engine * 0.1));

      // Zone tracker trigger
      for (let i = 0; i < ZONES.length; i++) {
        if (depthLocal >= ZONES[i].startDepth && zoneIndexLocal !== i) {
          zoneIndexLocal = i;
          setActiveZoneIndex(i);
          if (i > 0) {
            audio.playPowerup();
            floatingTexts.push({
              text: "✨ เข้าสู่เขตน้ำลึกใหม่!",
              x: canvas.width / 2,
              y: boat.y + 60,
              color: "#38bdf8",
              alpha: 1.0,
              vy: -1.2
            });
          }
        }
      }

      // 2. Oxygen depletion
      const oxygenDelta = UPGRADES_CONF.oxygen.values[activeUpgrades.oxygen - 1];
      boat.oxygen = Math.max(0, boat.oxygen - oxygenDelta);

      // Alarm/Low oxygen effect (rate limited by RetroAudioController)
      if (boat.oxygen < 25) {
        audio.playSonarWarning(boat.oxygen < 10);
      }

      // Handle raw oxygen exhaustion
      if (boat.oxygen <= 0) {
        boat.hp -= 0.3; // Rhythmic drowning damage
        shakeStrength = Math.max(shakeStrength, 3);
      }

      // Shield active depletion
      if (boat.shieldTime > 0) {
        boat.shieldTime--;
      }

      // Throttled React state updates to eliminate DOM thrashing and render freeze (60FPS -> ~10FPS React sync)
      const nowMs = performance.now();
      if (nowMs - lastUiTick >= 90) {
        lastUiTick = nowMs;
        setCurrentDepth(Math.floor(depthLocal));
        setOxygenLevel(Math.floor(boat.oxygen));
        setHullHp(Math.ceil(boat.hp));
        setShieldActive(boat.shieldTime > 0);
        setGoldAcquiredThisDive(goldLocal);
      }

      // Keyboard Controls fallback
      if (stateRef.current.controlMode === 'touch') {
        if (keysPressed.current['ArrowLeft'] || keysPressed.current['a']) {
          boat.targetX -= 5;
        }
        if (keysPressed.current['ArrowRight'] || keysPressed.current['d']) {
          boat.targetX += 5;
        }
      } else if (stateRef.current.controlMode === 'camera') {
        // Apply camera skin centorid steering
        const difference = activeFaceRatio.current - 0.5;
        if (Math.abs(difference) > 0.015) {
          const steerFactor = Math.min(Math.max(difference / 0.14, -1), 1);
          const velMult = 11 + (activeUpgrades.engine * 3.5);
          boat.targetX = boat.x + (steerFactor * velMult);
        }
      } else if (stateRef.current.controlMode === 'tilt') {
        // Gyro tilt mapping
        if (Math.abs(deviceTiltGamma.current) > 3.0) {
          const tiltFactor = Math.min(Math.max(deviceTiltGamma.current / 24, -1), 1);
          const velMult = 8 + (activeUpgrades.engine * 2.5);
          boat.targetX = boat.x + (tiltFactor * velMult);
        }
      }

      // Sanitize boat coordinates against any NaN drift
      if (isNaN(boat.x)) boat.x = canvas.width / 2;
      if (isNaN(boat.y)) boat.y = 150;
      if (isNaN(boat.targetX)) boat.targetX = boat.x;

      // Horizontal interpolation of coordinates
      boat.x += (boat.targetX - boat.x) * subSpeed;
      if (boat.x < 30) boat.x = 30;
      if (boat.x > canvas.width - 30) boat.x = canvas.width - 30;

      // Main core crash threshold
      if (boat.hp <= 0) {
        stopWithWreckage(boat.oxygen <= 0 ? "oxygen" : "collision", Math.floor(depthLocal), goldLocal);
        return;
      }

      // Bubbles emitters from propeller
      if (Math.random() < 0.25) {
        particles.push({
          x: boat.x - 22,
          y: boat.y,
          vx: -1.8 - Math.random() * 2,
          vy: (Math.random() - 0.5) * 0.8,
          radius: Math.random() * 2.5 + 0.8,
          color: 'rgba(255, 255, 255, 0.45)',
          alpha: 0.55,
          decay: 0.018
        });
      }

      // Ambient background bubbles
      if (Math.random() < 0.08) {
        particles.push({
          x: Math.random() * canvas.width,
          y: canvas.height + 20,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -(1.5 + Math.random() * 2),
          radius: Math.random() * 3 + 1,
          color: 'rgba(14, 165, 233, 0.3)',
          alpha: 0.6,
          decay: 0.002
        });
      }

      // Particles loop
      for (let idx = particles.length - 1; idx >= 0; idx--) {
        const p = particles[idx];
        if (!p || isNaN(p.x) || isNaN(p.y) || isNaN(p.vx) || isNaN(p.vy)) {
          particles.splice(idx, 1);
          continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0 || p.y < -35) {
          particles.splice(idx, 1);
        }
      }
      if (particles.length > 70) {
        particles.splice(0, particles.length - 70);
      }

      // Creatures Spawning
      const creatureRate = 0.02 + (zoneIndexLocal * 0.01);
      if (Math.random() < Math.min(0.065, creatureRate) && creatures.length < 12) {
        creatures.push(generateProceduralCreature(depthLocal, canvas.width, canvas.height));
      }

      // Update creatures positional frame
      for (let idx = creatures.length - 1; idx >= 0; idx--) {
        const cre = creatures[idx];
        if (!cre || isNaN(cre.x) || isNaN(cre.y) || isNaN(cre.animTimer)) {
          creatures.splice(idx, 1);
          continue;
        }
        cre.x += cre.speedX;
        cre.y -= CONFIG.baseScrollSpeed;
        cre.animTimer += 0.05;

        // Smash collision hitbox checking
        const dist = Math.sqrt((boat.x - cre.x) ** 2 + (boat.y - cre.y) ** 2);
        if (dist < 28) {
          if (boat.shieldTime > 0) {
            audio.playHit();
            for (let i = 0; i < 15; i++) {
              particles.push({
                x: cre.x, y: cre.y,
                vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5 - 1,
                radius: Math.random() * 3 + 1, color: '#38bdf8', alpha: 1.0, decay: 0.03
              });
            }
            creatures.splice(idx, 1);
            floatingTexts.push({
              text: "🛡️ ป้องกันสมบูรณ์แบบ!",
              x: boat.x, y: boat.y - 30, color: "#22d3ee", alpha: 1.0, vy: -1.2
            });
            continue;
          } else {
            // Smash take damage
            boat.hp -= cre.damage;
            shakeStrength = 20;
            audio.playHit();
            
            for (let i = 0; i < 12; i++) {
              particles.push({
                x: cre.x, y: cre.y,
                vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6 - 1,
                radius: Math.random() * 4 + 1, color: '#ef4444', alpha: 1.0, decay: 0.03
              });
            }

            if (cre.explosive) {
              audio.playExplosion();
              for (let i = 0; i < 15; i++) {
                particles.push({
                  x: cre.x, y: cre.y,
                  vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8 - 1,
                  radius: Math.random() * 5 + 1, color: '#f59e0b', alpha: 1.0, decay: 0.02
                });
              }
            }

            floatingTexts.push({
              text: `-${cre.damage} HP`,
              x: boat.x, y: boat.y - 30, color: "#f87171", alpha: 1.0, vy: -1.2
            });

            creatures.splice(idx, 1);
            continue;
          }
        }

        if (cre.y < -70) {
          creatures.splice(idx, 1);
        }
      }

      // Item collectibles spawning
      if (Math.random() < 0.035 && items.length < 5) {
        items.push(generateProceduralItem(canvas.width, canvas.height));
      }

      // Items collecting logic loop
      for (let idx = items.length - 1; idx >= 0; idx--) {
        const item = items[idx];
        if (!item || isNaN(item.x) || isNaN(item.y) || isNaN(item.angle)) {
          items.splice(idx, 1);
          continue;
        }
        item.y -= CONFIG.baseScrollSpeed;
        item.angle += 0.03;
        item.pulseFactor = Math.sin(item.angle * 2) * 2;

        const dist = Math.sqrt((boat.x - item.x) ** 2 + (boat.y - item.y) ** 2);
        if (dist < 28) {
          audio.playCoin();

          if (item.type === 'coin') {
            goldLocal += item.val;
            setGoldAcquiredThisDive(goldLocal);
            floatingTexts.push({
              text: `+🪙 ${item.val}`,
              x: item.x, y: item.y - 15, color: "#fbbf24", alpha: 1.0, vy: -1.3
            });
          } else if (item.type === 'oxygen') {
            boat.oxygen = Math.min(100, boat.oxygen + item.val);
            floatingTexts.push({
              text: `+🫧 ${item.val}% O2`,
              x: item.x, y: item.y - 15, color: "#34d399", alpha: 1.0, vy: -1.3
            });
          } else if (item.type === 'repair') {
            boat.hp = Math.min(boat.maxHp, boat.hp + item.val);
            floatingTexts.push({
              text: `+🔧 ซ่อมแซมระบบเรือ`,
              x: item.x, y: item.y - 15, color: "#f87171", alpha: 1.0, vy: -1.3
            });
          } else if (item.type === 'shield') {
            boat.shieldTime = 300; // Forcefield active frames
            floatingTexts.push({
              text: "🛡️ บาเรียนีออนอมตะ!",
              x: item.x, y: item.y - 15, color: "#22d3ee", alpha: 1.0, vy: -1.3
            });
          }

          for (let i = 0; i < 8; i++) {
            particles.push({
              x: item.x, y: item.y,
              vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 - 1,
              radius: Math.random() * 3 + 1, color: item.color, alpha: 0.9, decay: 0.03
            });
          }

          items.splice(idx, 1);
          continue;
        }

        if (item.y < -50) {
          items.splice(idx, 1);
        }
      }

      // Floating text loop
      for (let idx = floatingTexts.length - 1; idx >= 0; idx--) {
        const ft = floatingTexts[idx];
        ft.y += ft.vy;
        ft.alpha -= 0.02;
        if (ft.alpha <= 0) {
          floatingTexts.splice(idx, 1);
        }
      }

      if (shakeStrength > 0) {
        shakeStrength *= 0.9;
        if (shakeStrength < 0.5) shakeStrength = 0;
      }

      // --- RENDERING ROUTINES ---
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Gradient background node builder
      drawAbyssalGradient(ctx, canvas.width, canvas.height, depthLocal);

      // Save scene under shake offsets
      ctx.save();
      if (shakeStrength > 0) {
        const shakeOffsetX = (Math.random() - 0.5) * shakeStrength;
        const shakeOffsetY = (Math.random() - 0.5) * shakeStrength;
        ctx.translate(shakeOffsetX, shakeOffsetY);
      }

      // Render collectibles
      items.forEach((it) => {
        ctx.save();
        ctx.translate(it.x, it.y);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.strokeStyle = it.color || 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 18 + it.pulseFactor / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = `26px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(it.emoji, 0, 0);
        ctx.restore();
      });

      // Render creatures
      creatures.forEach((cre) => {
        ctx.save();
        ctx.translate(cre.x, cre.y);
        if (cre.speedX < 0) {
          ctx.scale(-1, 1); // Flip horizontally depending on drift side
        }
        drawProceduralCreatureAsset(ctx, cre);
        ctx.restore();
      });

      // DRAW ACTUAL SUBMARINE
      ctx.save();
      ctx.translate(boat.x, boat.y);
      const tilt = (boat.targetX - boat.x) * 0.015;
      ctx.rotate(Math.max(-0.25, Math.min(0.25, tilt)));

      // Sub headlight cone rays
      const headlightGrad = ctx.createLinearGradient(0, 12, 0, flashlightRange);
      headlightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.6)');
      headlightGrad.addColorStop(0.3, 'rgba(254, 240, 138, 0.25)');
      headlightGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

      ctx.fillStyle = headlightGrad;
      ctx.beginPath();
      ctx.moveTo(-6, 12);
      ctx.lineTo(-flashlightWidth, flashlightRange);
      ctx.lineTo(flashlightWidth, flashlightRange);
      ctx.lineTo(6, 12);
      ctx.closePath();
      ctx.fill();

      // Propeller rotational blades
      boat.propellerAngle += 0.22;
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 3;
      ctx.save();
      ctx.translate(-24, 0);
      ctx.rotate(boat.propellerAngle);
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(0, 10);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "#475569";
      ctx.fillRect(-26, -4, 4, 8);

      // Main steel Capsule
      ctx.fillStyle = subColor.primary;
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-12, -18, 20, 5);

      // Periscope tower neck
      ctx.strokeStyle = subColor.primary;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(2, -15);
      ctx.lineTo(2, -26);
      ctx.lineTo(10, -26);
      ctx.stroke();

      ctx.fillStyle = subColor.window;
      ctx.beginPath();
      ctx.arc(9, -26, 2, 0, Math.PI * 2);
      ctx.fill();

      // Circular pilot Windows
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(-4, -1, 7, 0, Math.PI * 2);
      ctx.arc(8, -1, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = boat.hp < 30 && Math.floor(Date.now() / 250) % 2 === 0 ? "#ef4444" : subColor.window;
      ctx.beginPath();
      ctx.arc(-4, -1, 5, 0, Math.PI * 2);
      ctx.arc(8, -1, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.beginPath();
      ctx.arc(-5, -2, 2, 0, Math.PI * 2);
      ctx.arc(7, -2, 2, 0, Math.PI * 2);
      ctx.fill();

      // Bottom mounted headlight spotlight casing
      ctx.fillStyle = "#475569";
      ctx.fillRect(-6, 12, 12, 4);
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(0, 15, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Cyan Bubble Force Field
      if (boat.shieldTime > 0) {
        const shieldPulse = 1 + Math.sin(Date.now() * 0.015) * 0.06;
        ctx.strokeStyle = "rgba(34, 211, 238, 0.9)";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, 34 * shieldPulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(34, 211, 238, 0.12)";
        ctx.fill();
      }

      ctx.restore();

      // Draw active particles
      particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Apply Midnight / Abyssal shadow gradient layer mask where only the flashlight cone punches through
      applyAbyssalDarknessShadow(ctx, canvas.width, canvas.height, depthLocal, boat.x, boat.y, flashlightRange, flashlightWidth);

      // Draw floating texts
      floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.font = "bold 15px 'Anuphan', 'Prompt', Arial";
        ctx.textAlign = "center";
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore();

      // Request next tick safely
      if (gameActive.current) {
        animationFrameId.current = requestAnimationFrame(loop);
      }
    };

    // Wreckage triggered
    const stopWithWreckage = (reason: 'collision' | 'oxygen', totalMeters: number, salvageGold: number) => {
      gameActive.current = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      audio.stopAll();
      audio.playGameOver();

      setDeathReason(reason);
      setGameState(prev => {
        const wasNewHigh = totalMeters > prev.highscore;
        setIsNewHighscore(wasNewHigh);
        return {
          ...prev,
          coins: prev.coins + salvageGold,
          highscore: wasNewHigh ? totalMeters : prev.highscore
        };
      });

      if (totalMeters > 0) {
        const nowObj = new Date();
        const todayStr = nowObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        const timeStr = nowObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

        const newEntry: LeaderboardEntry = {
          id: Date.now().toString(),
          playerName: stateRef.current.playerName || 'กัปตันสมอ',
          depth: totalMeters,
          coinsGained: salvageGold,
          date: todayStr,
          subColorIndex: stateRef.current.subColorIndex
        };

        setLeaderboard(prev => {
          const combined = [...prev, newEntry];
          combined.sort((a, b) => b.depth - a.depth);
          return combined.slice(0, 15);
        });

        const historyItem: HistoryEntry = {
          id: Date.now().toString(),
          playerName: stateRef.current.playerName || 'กัปตันสมอ',
          depth: totalMeters,
          coinsGained: salvageGold,
          reason: reason === 'oxygen' ? 'ออกซิเจนหมด' : 'เรือชนสิ่งกีดขวาง',
          date: todayStr,
          time: timeStr
        };

        setHistoryLogs(prev => [historyItem, ...prev].slice(0, 25));
      }

      setScreen('gameover');
    };

    // Begin looping
    animationFrameId.current = requestAnimationFrame(loop);
  };

  // Ambient Menu and Background Animation Loop
  useEffect(() => {
    if (screen === 'game') return;

    let ambientActive = true;
    let animId: any = null;
    let previewPropellerAngle = 0;
    let bobbingTimer = 0;

    // Ambient bubbles array
    const ambientBubbles: Array<{ x: number; y: number; radius: number; speed: number; opacity: number }> = [];
    for (let i = 0; i < 20; i++) {
      ambientBubbles.push({
        x: Math.random() * 400,
        y: Math.random() * 700,
        radius: Math.random() * 2 + 1,
        speed: 0.5 + Math.random() * 1.0,
        opacity: 0.2 + Math.random() * 0.4,
      });
    }

    const runAmbientLoop = () => {
      if (!ambientActive || screenRef.current === 'game') {
        ambientActive = false;
        if (animId) {
          cancelAnimationFrame(animId);
        }
        return;
      }

      bobbingTimer += 0.04;
      previewPropellerAngle += 0.15;

      const subColor = COLOR_OPTIONS[gameState.subColorIndex];

      // 1. Draw on modern gameplay-sized background canvas under overlays
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Adjust canvas size to parent container if needed
          const parent = containerRef.current;
          if (parent) {
            if (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight) {
              canvas.width = parent.clientWidth;
              canvas.height = parent.clientHeight;
            }
          }

          // Clear and draw Abyssal gradient (use current depth if Game Over, or 0 if on Menu/Shop)
          const animDepth = screen === 'gameover' ? currentDepth : 0;
          drawAbyssalGradient(ctx, canvas.width, canvas.height, animDepth);

          // Update and draw ambient bubbles
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ambientBubbles.forEach((b) => {
            b.y -= b.speed;
            if (b.y < -10) {
              b.y = canvas.height + 10;
              b.x = Math.random() * canvas.width;
            }
            ctx.globalAlpha = b.opacity;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1.0;

          // Draw the selected submarine floating gracefully in the center
          const bobX = canvas.width / 2;
          const bobY = 180 + Math.sin(bobbingTimer) * 12;

          ctx.save();
          ctx.translate(bobX, bobY);
          ctx.rotate(Math.sin(bobbingTimer * 0.7) * 0.08);

          // Headlight glow
          const flashlightRange = 160;
          const flashlightWidth = 45;
          const headlightGrad = ctx.createLinearGradient(0, 12, 0, flashlightRange);
          headlightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
          headlightGrad.addColorStop(0.3, 'rgba(254, 240, 138, 0.15)');
          headlightGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

          ctx.fillStyle = headlightGrad;
          ctx.beginPath();
          ctx.moveTo(-6, 12);
          ctx.lineTo(-flashlightWidth, flashlightRange);
          ctx.lineTo(flashlightWidth, flashlightRange);
          ctx.lineTo(6, 12);
          ctx.closePath();
          ctx.fill();

          // Propeller
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 3;
          ctx.save();
          ctx.translate(-24, 0);
          ctx.rotate(previewPropellerAngle);
          ctx.beginPath();
          ctx.moveTo(0, -10);
          ctx.lineTo(0, 10);
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = "#475569";
          ctx.fillRect(-26, -4, 4, 8);

          // Main Chassis Capsule
          ctx.shadowBlur = 8;
          ctx.shadowColor = subColor.glow;
          ctx.fillStyle = subColor.primary;
          ctx.beginPath();
          ctx.ellipse(0, 0, 24, 15, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(-12, -18, 20, 5);

          // Periscope tower neck
          ctx.strokeStyle = subColor.primary;
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(2, -15);
          ctx.lineTo(2, -26);
          ctx.lineTo(10, -26);
          ctx.stroke();

          ctx.fillStyle = subColor.window;
          ctx.beginPath();
          ctx.arc(9, -26, 2, 0, Math.PI * 2);
          ctx.fill();

          // Circular Windows
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.arc(-4, -1, 7, 0, Math.PI * 2);
          ctx.arc(8, -1, 7, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = subColor.window;
          ctx.beginPath();
          ctx.arc(-4, -1, 5, 0, Math.PI * 2);
          ctx.arc(8, -1, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          ctx.beginPath();
          ctx.arc(-5, -2, 2, 0, Math.PI * 2);
          ctx.arc(7, -2, 2, 0, Math.PI * 2);
          ctx.fill();

          // Bottom headlight casing
          ctx.fillStyle = "#475569";
          ctx.fillRect(-6, 12, 12, 4);
          ctx.fillStyle = "#fef08a";
          ctx.beginPath();
          ctx.arc(0, 15, 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      }

      // 2. Draw on small menu preview canvas (middle of menu selector)
      const previewCanvas = document.getElementById('menuPreviewCanvas') as HTMLCanvasElement;
      if (previewCanvas) {
        const ctx = previewCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

          // Dark miniature background matching the app theme
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

          // Draw some microscopic sparkles
          ctx.fillStyle = 'rgba(34, 211, 238, 0.2)';
          for (let i = 0; i < 3; i++) {
            const px = ((Date.now() * 0.05 + i * 50) % previewCanvas.width);
            const py = (10 + (i * 12) % previewCanvas.height);
            ctx.beginPath();
            ctx.arc(px, py, 1, 0, Math.PI * 2);
            ctx.fill();
          }

          // Render miniature submarine bobbing gently in the center
          const subX = previewCanvas.width / 2;
          const subY = previewCanvas.height / 2 + Math.sin(bobbingTimer * 1.5) * 3;

          ctx.save();
          ctx.translate(subX - 5, subY); // Left offset a bit to show propeller
          ctx.scale(0.85, 0.85); // Make it fit nicely inside 160x50

          // Small light beam
          const previewHeadlightGrad = ctx.createLinearGradient(0, 12, 0, 45);
          previewHeadlightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
          previewHeadlightGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
          ctx.fillStyle = previewHeadlightGrad;
          ctx.beginPath();
          ctx.moveTo(-6, 12);
          ctx.lineTo(-24, 45);
          ctx.lineTo(24, 45);
          ctx.lineTo(6, 12);
          ctx.closePath();
          ctx.fill();

          // Propeller
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 2.5;
          ctx.save();
          ctx.translate(-24, 0);
          ctx.rotate(previewPropellerAngle);
          ctx.beginPath();
          ctx.moveTo(0, -8);
          ctx.lineTo(0, 8);
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = "#475569";
          ctx.fillRect(-26, -3, 4, 6);

          // Main Chassis Capsule
          ctx.shadowBlur = 6;
          ctx.shadowColor = subColor.glow;
          ctx.fillStyle = subColor.primary;
          ctx.beginPath();
          ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(-10, -14, 16, 4);

          // Periscope tower neck
          ctx.strokeStyle = subColor.primary;
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(2, -12);
          ctx.lineTo(2, -20);
          ctx.lineTo(8, -20);
          ctx.stroke();

          ctx.fillStyle = subColor.window;
          ctx.beginPath();
          ctx.arc(7, -20, 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Circular Windows
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.arc(-3, -1, 5, 0, Math.PI * 2);
          ctx.arc(6, -1, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = subColor.window;
          ctx.beginPath();
          ctx.arc(-3, -1, 3.5, 0, Math.PI * 2);
          ctx.arc(6, -1, 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(runAmbientLoop);
    };

    // Trigger loop start
    animId = requestAnimationFrame(runAmbientLoop);

    return () => {
      ambientActive = false;
      if (animId) {
        cancelAnimationFrame(animId);
      }
    };
  }, [screen, gameState.subColorIndex]);

  // Safe manual clean-up of animations and events on unmount
  useEffect(() => {
    return () => {
      gameActive.current = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (frameIntervalId.current) {
        clearInterval(frameIntervalId.current);
      }
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  // --- RENDERING INSTRUMENTS ---

  const drawAbyssalGradient = (ctx: CanvasRenderingContext2D, width: number, height: number, depth: number) => {
    const colorNodes = [
      { depth: 0,     top: [14, 116, 144], bot: [3, 105, 120] },     
      { depth: 1000,  top: [3, 105, 120],  bot: [23, 37, 84] },      
      { depth: 2500,  top: [23, 37, 84],   bot: [15, 23, 42] },      
      { depth: 5000,  top: [15, 23, 42],   bot: [8, 10, 24] },       
      { depth: 10000, top: [8, 10, 24],    bot: [0, 0, 4] }          
    ];

    let lowerNode = colorNodes[0];
    let upperNode = colorNodes[1];
    let factor = 0;

    if (depth <= colorNodes[0].depth) {
      lowerNode = colorNodes[0];
      upperNode = colorNodes[0];
      factor = 0;
    } else if (depth >= colorNodes[colorNodes.length - 1].depth) {
      lowerNode = colorNodes[colorNodes.length - 1];
      upperNode = colorNodes[colorNodes.length - 1];
      factor = 0;
    } else {
      for (let i = 0; i < colorNodes.length - 1; i++) {
        if (depth >= colorNodes[i].depth && depth < colorNodes[i + 1].depth) {
          lowerNode = colorNodes[i];
          upperNode = colorNodes[i + 1];
          const range = upperNode.depth - lowerNode.depth;
          factor = (depth - lowerNode.depth) / range;
          break;
        }
      }
    }

    const rTop = Math.floor(lowerNode.top[0] + (upperNode.top[0] - lowerNode.top[0]) * factor);
    const gTop = Math.floor(lowerNode.top[1] + (upperNode.top[1] - lowerNode.top[1]) * factor);
    const bTop = Math.floor(lowerNode.top[2] + (upperNode.top[2] - lowerNode.top[2]) * factor);

    const rBot = Math.floor(lowerNode.bot[0] + (upperNode.bot[0] - lowerNode.bot[0]) * factor);
    const gBot = Math.floor(lowerNode.bot[1] + (upperNode.bot[1] - lowerNode.bot[1]) * factor);
    const bBot = Math.floor(lowerNode.bot[2] + (upperNode.bot[2] - lowerNode.bot[2]) * factor);

    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, `rgb(${rTop}, ${gTop}, ${bTop})`);
    bgGradient.addColorStop(1, `rgb(${rBot}, ${gBot}, ${bBot})`);

    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative superficial sparkles in Sunlit Zone
    if (depth < 800) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(0, 0, width, Math.max(10, 80 - depth * 0.12));
    } else if (depth > 5000) {
      // Epiphytic Hydrothermal vents silhouette
      ctx.fillStyle = 'rgba(16, 185, 129, 0.02)';
      ctx.beginPath();
      ctx.moveTo(60, height);
      ctx.lineTo(110, height - 190);
      ctx.lineTo(145, height);
      ctx.fill();

      ctx.fillStyle = 'rgba(244, 63, 94, 0.015)';
      ctx.beginPath();
      ctx.moveTo(220, height);
      ctx.lineTo(250, height - 150);
      ctx.lineTo(290, height);
      ctx.fill();
    }
  };

  const applyAbyssalDarknessShadow = (ctx: CanvasRenderingContext2D, width: number, height: number, depth: number, subX: number, subY: number, range: number, coneWidth: number) => {
    if (depth < 2500) return;

    const maxDarkness = depth >= 4500 ? 0.95 : 0.65 + ((depth - 2500) / 2000) * 0.3;

    ctx.save();
    // Fill dark overlay
    ctx.fillStyle = `rgba(2, 6, 23, ${maxDarkness})`;
    ctx.fillRect(0, 0, width, height);

    // Punch out illuminated flashlight cone and submarine aura
    ctx.globalCompositeOperation = 'destination-out';

    // Flashlight cone
    ctx.beginPath();
    ctx.moveTo(subX, subY + 12);
    ctx.lineTo(subX - coneWidth, subY + range);
    ctx.lineTo(subX + coneWidth, subY + range);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
    ctx.fill();

    // Submarine radius aura
    ctx.beginPath();
    ctx.arc(subX, subY, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const generateProceduralCreature = (spawnDepth: number, screenWidth: number, screenHeight: number) => {
    const size = 35 + Math.random() * 15;
    let species = 'clownfish';
    let damage = 20;

    if (spawnDepth < 1000) {
      const rand = Math.random();
      if (rand < 0.35) { species = 'clownfish'; damage = 8; }
      else if (rand < 0.70) { species = 'bluetang'; damage = 10; }
      else if (rand < 0.85) { species = 'goldfish'; damage = 12; }
      else { species = 'turtle'; damage = 14; }
    } else if (spawnDepth < 2500) {
      const rand = Math.random();
      if (rand < 0.45) { species = 'lanternfish'; damage = 15; }
      else if (rand < 0.75) { species = 'jellyfish'; damage = 14; }
      else if (rand < 0.90) { species = 'ribboneel'; damage = 12; }
      else { species = 'oarfish'; damage = 22; }
    } else if (spawnDepth < 5000) {
      const rand = Math.random();
      if (rand < 0.45) { species = 'anglerfish'; damage = 25; }
      else if (rand < 0.75) { species = 'viperfish'; damage = 20; }
      else if (rand < 0.90) { species = 'isopod'; damage = 15; }
      else { species = 'mine'; damage = 30; }
    } else {
      const rand = Math.random();
      if (rand < 0.35) { species = 'blobfish'; damage = 12; }
      else if (rand < 0.70) { species = 'gulpereel'; damage = 24; }
      else { species = 'dumbo'; damage = 15; }
    }

    const sideLeft = Math.random() > 0.5;
    const isMine = species === 'mine';
    
    // Sub speed scaling relative to deepness
    const speedCoeff = 1.0 + (spawnDepth / 6500);
    const speedX = isMine ? 0 : (1.8 + Math.random() * 1.8) * (sideLeft ? 1 : -1) * speedCoeff;

    return {
      species,
      damage,
      size,
      x: isMine ? (30 + Math.random() * (screenWidth - 60)) : (sideLeft ? -60 : screenWidth + 60),
      y: screenHeight + 60,
      speedX,
      animTimer: Math.random() * 100,
      glow: spawnDepth > 1000,
      shadowColor: species === 'anglerfish' ? '#f59e0b' : '#38bdf8',
      explosive: isMine,
    };
  };

  const drawProceduralCreatureAsset = (ctx: CanvasRenderingContext2D, cre: any) => {
    let cycle = Math.sin((cre?.animTimer || 0) * 5);
    if (isNaN(cycle)) cycle = 0;
    let s = cre?.size || 40;
    if (isNaN(s) || s <= 0) s = 40;

    switch (cre.species) {
      case 'clownfish':
        ctx.fillStyle = "#f97316"; 
        ctx.beginPath();
        ctx.ellipse(0, 0, s*0.4, s*0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-s*0.1, -s*0.22, s*0.12, s*0.44);
        ctx.fillRect(s*0.15, -s*0.15, s*0.08, s*0.3);
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.moveTo(-s*0.38, 0);
        ctx.quadraticCurveTo(-s*0.6, -s*0.2 + cycle*4, -s*0.55, -s*0.25);
        ctx.quadraticCurveTo(-s*0.48, 0, -s*0.55, s*0.25);
        ctx.quadraticCurveTo(-s*0.6, s*0.2 + cycle*4, -s*0.38, 0);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(s*0.2, -s*0.06, s*0.04, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'bluetang':
        ctx.fillStyle = "#2563eb"; 
        ctx.beginPath();
        ctx.ellipse(0, 0, s*0.4, s*0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1e293b"; 
        ctx.beginPath();
        ctx.ellipse(-s*0.05, -s*0.08, s*0.28, s*0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.moveTo(-s*0.35, 0);
        ctx.lineTo(-s*0.58, -s*0.22 + cycle*3);
        ctx.lineTo(-s*0.58, s*0.22 - cycle*3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(s*0.22, -s*0.08, s*0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(s*0.22, -s*0.08, 0.02*s, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'goldfish':
        ctx.fillStyle = "#f43f5e"; 
        ctx.beginPath();
        ctx.ellipse(0, 0, s*0.38, s*0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fb7185";
        ctx.beginPath();
        ctx.moveTo(-s*0.35, 0);
        ctx.lineTo(-s*0.6, -s*0.3 + cycle*4);
        ctx.lineTo(-s*0.5, 0);
        ctx.lineTo(-s*0.6, s*0.3 - cycle*4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(s*0.2, -s*0.04, s*0.04, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'turtle':
        ctx.fillStyle = "#15803d"; 
        ctx.beginPath();
        ctx.ellipse(0, 0, s*0.4, s*0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#4ade80"; 
        ctx.save();
        ctx.translate(s*0.1, -s*0.1);
        ctx.rotate(cycle * 0.4 - 0.2);
        ctx.beginPath();
        ctx.ellipse(0, -s*0.2, s*0.1, s*0.3, -Math.PI/6, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = "#4ade80";
        ctx.beginPath();
        ctx.ellipse(s*0.45, -s*0.05, s*0.12, s*0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'lanternfish':
        ctx.fillStyle = "#334155"; 
        ctx.beginPath();
        ctx.ellipse(0, 0, s*0.42, s*0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#22d3ee";
        for (let i = -s*0.25; i <= s*0.15; i += s*0.1) {
          ctx.beginPath();
          ctx.arc(i, s*0.08, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s*0.28, -s*0.08);
        ctx.quadraticCurveTo(s*0.4, -s*0.22, s*0.32, -s*0.35 + cycle*2);
        ctx.stroke();
        ctx.fillStyle = "#22d3ee";
        ctx.beginPath();
        ctx.arc(s*0.32, -s*0.35 + cycle*2, 3.5 + cycle*1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#e2e8f0";
        ctx.beginPath();
        ctx.arc(s*0.25, -s*0.05, s*0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        ctx.arc(s*0.25, -s*0.05, s*0.04, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'jellyfish':
        ctx.fillStyle = "rgba(236, 72, 153, 0.75)";
        ctx.beginPath();
        ctx.arc(0, -s*0.1, s*0.3, Math.PI, 0, false);
        ctx.fill();
        ctx.strokeStyle = "rgba(236, 72, 153, 0.8)";
        ctx.lineWidth = 2;
        for (let i = -s*0.2; i <= s*0.2; i += s*0.1) {
          const wave = Math.sin(cre.animTimer * 6 + i) * 6;
          ctx.beginPath();
          ctx.moveTo(i, -s*0.1); 
          ctx.quadraticCurveTo(i + wave, s*0.3, i, s*0.5);
          ctx.stroke();
        }
        break;

      case 'ribboneel':
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-s*0.5, 0);
        for (let x = -s*0.5; x <= s*0.5; x += 5) {
          const wave = Math.sin(cre.animTimer * 5 + x * 0.15) * 8;
          ctx.lineTo(x, wave);
        }
        ctx.stroke();
        ctx.fillStyle = "#eab308"; 
        ctx.beginPath();
        ctx.arc(s*0.45, -2, 2, 0, Math.PI*2);
        ctx.fill();
        break;

      case 'oarfish':
        ctx.fillStyle = "#cbd5e1"; 
        ctx.beginPath();
        ctx.ellipse(0, 0, s*1.3, s*0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#ef4444"; 
        ctx.beginPath();
        ctx.moveTo(-s*1.2, -s*0.12);
        for (let x = -s*1.2; x <= s*1.1; x += 10) {
          const wave = Math.sin(cre.animTimer * 6 + x*0.1) * 4;
          ctx.lineTo(x, -s*0.12 - wave);
        }
        ctx.lineTo(s*1.1, -s*0.1);
        ctx.lineTo(-s*1.2, -s*0.1);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(s*1.1, -s*0.05);
        ctx.lineTo(s*1.3, -s*0.3 + cycle*5);
        ctx.stroke();
        break;

      case 'anglerfish':
        ctx.fillStyle = "#1e1b4b"; 
        ctx.beginPath();
        ctx.ellipse(0, 0, s*0.42, s*0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.moveTo(s*0.1, s*0.1);
        ctx.lineTo(s*0.4, s*0.25);
        ctx.lineTo(s*0.1, -s*0.05);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s*0.2, s*0.02); ctx.lineTo(s*0.28, s*0.12);
        ctx.moveTo(s*0.28, s*0.02); ctx.lineTo(s*0.35, s*0.1);
        ctx.moveTo(s*0.24, s*0.08); ctx.lineTo(s*0.28, -s*0.02);
        ctx.stroke();
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(s*0.2, -s*0.2);
        ctx.quadraticCurveTo(s*0.5, -s*0.4, s*0.48, s*0.1 + cycle*4);
        ctx.stroke();
        const lureX = s*0.48;
        const lureY = s*0.1 + cycle*4;
        const glowRad = 8 + cycle*3;
        const lureGrad = ctx.createRadialGradient(lureX, lureY, 1, lureX, lureY, glowRad);
        lureGrad.addColorStop(0, '#fef08a');
        lureGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');
        ctx.fillStyle = lureGrad;
        ctx.beginPath();
        ctx.arc(lureX, lureY, glowRad, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'viperfish':
        ctx.fillStyle = "#0f172a"; 
        ctx.beginPath();
        ctx.ellipse(0, 0, s*0.5, s*0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.moveTo(s*0.2, s*0.02);
        ctx.lineTo(s*0.45, s*0.1);
        ctx.lineTo(s*0.2, -s*0.08);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s*0.35, s*0.05); ctx.lineTo(s*0.48, -s*0.05);
        ctx.moveTo(s*0.3, s*0.05); ctx.lineTo(s*0.45, s*0.15);
        ctx.stroke();
        break;

      case 'isopod':
        ctx.fillStyle = "#cbd5e1"; 
        ctx.beginPath();
        ctx.ellipse(0, 0, s*0.44, s*0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.5;
        for (let lx = -s*0.3; lx <= s*0.3; lx += s*0.12) {
          ctx.beginPath();
          ctx.moveTo(lx, -s*0.2);
          ctx.lineTo(lx, s*0.2);
          ctx.stroke();
        }
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2;
        for (let lx = -s*0.3; lx <= s*0.3; lx += s*0.1) {
          ctx.beginPath();
          ctx.moveTo(lx, s*0.15);
          ctx.lineTo(lx - s*0.05, s*0.26 + cycle*2);
          ctx.stroke();
        }
        break;

      case 'blobfish':
        ctx.fillStyle = "#fda4af"; 
        ctx.beginPath();
        ctx.ellipse(0, 0, s*0.45, s*0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f43f5e";
        ctx.beginPath();
        ctx.ellipse(s*0.25, 0, s*0.08, s*0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#9f1239";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(s*0.22, s*0.15, s*0.08, Math.PI, 0, false);
        ctx.stroke();
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(s*0.16, -s*0.08, s*0.03, 0, Math.PI * 2);
        ctx.arc(s*0.32, -s*0.08, s*0.03, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'gulpereel':
        ctx.fillStyle = "#090d16"; 
        ctx.beginPath();
        ctx.ellipse(-s*0.1, -s*0.05, s*0.45, s*0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.moveTo(-s*0.1, s*0.05);
        ctx.lineTo(s*0.32, s*0.15);
        ctx.lineTo(-s*0.1, -s*0.15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#4ade80"; 
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-s*0.45, -s*0.05);
        for (let x = -s*0.45; x >= -s*1.1; x -= 6) {
          const wave = Math.sin(cre.animTimer * 6 + x * 0.15) * 10;
          ctx.lineTo(x, wave);
        }
        ctx.stroke();
        break;

      case 'dumbo':
        ctx.fillStyle = "#a855f7"; 
        ctx.beginPath();
        ctx.ellipse(0, -s*0.08, s*0.3, s*0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(0, -s*0.26);
        ctx.rotate(cycle * 0.4);
        ctx.beginPath();
        ctx.ellipse(-s*0.12, 0, s*0.08, s*0.16, -Math.PI/3, 0, Math.PI*2);
        ctx.ellipse(s*0.12, 0, s*0.08, s*0.16, Math.PI/3, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        ctx.moveTo(-s*0.2, s*0.12);
        ctx.quadraticCurveTo(-s*0.12, s*0.35 + cycle*4, -s*0.08, s*0.12);
        ctx.quadraticCurveTo(0, s*0.35 - cycle*4, s*0.08, s*0.12);
        ctx.quadraticCurveTo(s*0.12, s*0.35 + cycle*4, s*0.2, s*0.12);
        ctx.lineTo(s*0.2, s*0.08);
        ctx.lineTo(-s*0.2, s*0.08);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(-s*0.1, 0, s*0.06, 0, Math.PI * 2);
        ctx.arc(s*0.1, 0, s*0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-s*0.11, -s*0.02, s*0.025, 0, Math.PI * 2);
        ctx.arc(s*0.09, -s*0.02, s*0.025, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'mine':
        ctx.fillStyle = "#334155"; 
        ctx.beginPath();
        ctx.arc(0, 0, s*0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 4;
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * s * 0.46, Math.sin(angle) * s * 0.46);
          ctx.stroke();
        }
        ctx.fillStyle = Math.floor(Date.now() / 200) % 2 === 0 ? "#ef4444" : "#7f1d1d";
        ctx.beginPath();
        ctx.arc(0, 0, s*0.12, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  };

  const generateProceduralItem = (screenWidth: number, screenHeight: number) => {
    const choices = [
      { emoji: "🪙", type: "coin", val: 20, shadowColor: "rgba(234, 179, 8, 0.75)", color: "#fbbf24" },
      { emoji: "🫧", type: "oxygen", val: 45, shadowColor: "rgba(16, 185, 129, 0.75)", color: "#34d399" },
      { emoji: "🔧", type: "repair", val: 35, shadowColor: "rgba(239, 68, 68, 0.75)", color: "#f87171" },
      { emoji: "🛡️", type: "shield", val: 450, shadowColor: "rgba(6, 182, 212, 0.75)", color: "#22d3ee" }
    ];
    const candidate = choices[Math.floor(Math.random() * choices.length)];
    return {
      emoji: candidate.emoji,
      type: candidate.type,
      val: candidate.val,
      shadowColor: candidate.shadowColor,
      color: candidate.color,
      x: 35 + Math.random() * (screenWidth - 70),
      y: screenHeight + 50,
      angle: Math.random() * 100,
      pulseFactor: 0
    };
  };

  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center select-none bg-slate-950 font-sans text-white p-2 relative overflow-hidden">
      
      {/* Decorative floating background elements */}
      <div className="absolute inset-0 pointer-events-none opacity-25 z-0">
        <div className="absolute w-[200px] h-[200px] bg-sky-500/10 rounded-full blur-3xl top-10 left-10 animate-pulse"></div>
        <div className="absolute w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-3xl bottom-10 right-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative w-full max-w-[420px] h-[92vh] max-h-[780px] rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl flex flex-col z-10 bg-slate-950">
        
        {/* ==================== CORE GAME SCREEN ==================== */}
        <div ref={containerRef} className="relative flex-1 w-full bg-slate-900 overflow-hidden">
          <canvas ref={canvasRef} className="block w-full h-full"></canvas>

          {/* Active Heads-Up Display (HUD) */}
          {screen === 'game' && (
            <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none z-10">
              <div className="flex flex-col gap-1.5 w-[55%]">
                {/* Structural Hull Hp Bar */}
                <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/5">
                  <span className="text-[10px] font-bold text-red-400 shrink-0">โครงเรือ</span>
                  <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden border border-red-950">
                    <div 
                      className="bg-gradient-to-r from-red-600 to-red-400 h-full transition-all duration-150"
                      style={{ width: `${Math.max(0, (hullHp / maxHullHp) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                {/* Oxygen Tank Capacity */}
                <div className={`flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/5 transition-all duration-300 ${oxygenLevel < 25 ? 'bg-red-950/50 animate-pulse' : ''}`}>
                  <span className="text-[10px] font-bold text-emerald-400 shrink-0">อากาศ</span>
                  <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden border border-emerald-950">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-150"
                      style={{ width: `${oxygenLevel}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Coins & Current Depth Tracker */}
              <div className="flex flex-col items-end gap-1 bg-black/60 px-3 py-1.5 rounded-md backdrop-blur-sm text-right border border-white/5">
                <div className="text-xs font-bold tracking-wide text-cyan-300">ความลึก: {currentDepth} ม.</div>
                <div className="text-[10px] text-yellow-400 flex items-center gap-1 font-extrabold">
                  <span>🪙</span> <span>{gameState.coins}</span>
                </div>
              </div>
            </div>
          )}

          {/* Picture-In-Picture Camera Canvas Feed */}
          <div className={`absolute top-16 right-3 w-28 h-36 rounded-lg border border-cyan-400/50 bg-black/85 shadow-lg overflow-hidden scanlines z-15 pointer-events-none ${cameraActive && screen === 'game' ? 'block' : 'hidden'}`}>
            <div className="scanner-bar"></div>
            <video ref={webcamRef} className="hidden" autoPlay playsInline muted></video>
            <canvas ref={cameraCanvasRef} className="w-full h-full object-cover scale-x-[-1]"></canvas>
            <div className="absolute bottom-1 left-0 right-0 text-[8px] text-center bg-black/70 text-cyan-300 py-0.5 font-bold uppercase tracking-wider">
              กล้องจับใบหน้า
            </div>
          </div>

          {/* Active warnings / shield visual overlays */}
          <div className={`absolute inset-0 border-4 pointer-events-none transition-all duration-300 z-20 ${oxygenLevel < 25 && screen === 'game' ? 'border-red-500/25 animate-pulse' : 'border-red-500/0'}`}></div>
          <div className={`absolute inset-0 border-4 pointer-events-none transition-all duration-300 z-20 ${shieldActive && screen === 'game' ? 'border-cyan-400/20' : 'border-cyan-400/0'}`}></div>

          {/* Help navigation displayed in active gameplay cockpit */}
          {screen === 'game' && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center px-6 pointer-events-none text-white/40 text-[10px] text-center z-10">
              <div className="bg-black/40 px-3 py-1.5 rounded-full border border-white/5 flex items-center gap-1.5 backdrop-blur-sm">
                <span>
                  {gameState.controlMode === 'camera' ? '📷' : gameState.controlMode === 'tilt' ? '📳' : '📱'}
                </span>
                <span>
                  {gameState.controlMode === 'camera' 
                    ? 'หัน/เอียงใบหน้า ของคุณเพื่อบังคับทิศทางก๊อกน้ำ' 
                    : gameState.controlMode === 'tilt' 
                    ? 'เอียงหน้าจอ ซ้าย-ขวา เพื่อควบคุมเลี้ยว' 
                    : 'แตะหน้าจอ ซ้าย / ขวา เพื่อควบคุมทิศทางเรือ'}
                </span>
              </div>
            </div>
          )}

          {/* ==================== DISPLAY SCREEN: MAIN MENU ==================== */}
          {screen === 'menu' && (
            <div className="absolute inset-0 flex flex-col justify-between p-6 bg-gradient-to-b from-blue-950/95 via-slate-900/98 to-slate-950 z-30 transition-all duration-300 text-center overflow-y-auto custom-scroll">
              <div className="my-auto space-y-4">
                <div className="relative inline-block">
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-4xl animate-bounce">
                    🚢
                  </div>
                  <span className="absolute -bottom-2 -right-6 px-2.5 py-0.5 bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 font-black text-[9px] rounded-full uppercase tracking-wider shadow border border-slate-950">
                    v2.5.0-PRO
                  </span>
                </div>
                
                <div>
                  <h1 className="text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-yellow-300 to-amber-500">
                    DEEP SEA DESCENT
                  </h1>
                  <p className="text-[9px] text-cyan-400 font-semibold tracking-widest uppercase mt-0.5">Ultimate Edition - Pure Synthesized</p>
                </div>

                <p className="text-slate-300 text-xs max-w-xs mx-auto leading-relaxed font-light">
                  ผจญภัยสู่ก้นทะเลลึกด้วยคุณสมบัติควบคุมหลากหลาย! รองรับการหมุนเอียงด้วยใบหน้าผ่านกล้องหน้า AI, มัลติเซนเซอร์จับทิศทาง หรือปุ่มสัมผัสตอบสนองสูง
                </p>

                {/* ===================== PLAYER NAME INPUT ===================== */}
                <div className="bg-slate-900/95 p-2.5 rounded-xl border border-slate-800 max-w-xs mx-auto space-y-1.5 shadow-xl text-left">
                  <label className="text-[11px] font-bold text-slate-300 flex justify-between items-center">
                    <span>👤 ชื่อกัปตันเรือ:</span>
                    <span className="text-[10px] text-cyan-400 font-normal">จดจำคะแนนของคุณ</span>
                  </label>
                  <input 
                    type="text"
                    maxLength={16}
                    value={gameState.playerName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGameState(prev => ({ ...prev, playerName: val }));
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-400 transition"
                    placeholder="ใส่ชื่อของคุณ..."
                  />
                </div>

                {/* ===================== SUB HULL COLOR SELECTOR ===================== */}
                <div className="bg-slate-900/95 p-3 rounded-xl border border-slate-800 max-w-xs mx-auto space-y-2.5 shadow-xl">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[11px] font-bold text-slate-300">🎨 เลือกสีตัวเรือของคุณ:</span>
                    <span className={`text-[11px] font-bold ${COLOR_OPTIONS[gameState.subColorIndex].nameColor}`}>
                      {COLOR_OPTIONS[gameState.subColorIndex].name}
                    </span>
                  </div>
                  
                  {/* Color option dots list */}
                  <div className="flex justify-center items-center gap-3 py-0.5">
                    {COLOR_OPTIONS.map((sub, idx) => (
                      <button 
                        key={sub.id}
                        onClick={() => selectColor(idx)}
                        className={`w-6.5 h-6.5 rounded-full border-2 transition-all duration-200 hover:scale-115 cursor-pointer shadow-lg ${idx === gameState.subColorIndex ? 'border-white ring-2 ring-sky-500/40' : 'border-transparent'}`}
                        style={{ backgroundColor: sub.primary }}
                        title={sub.name}
                      ></button>
                    ))}
                  </div>

                  {/* Sub miniature animated canvas */}
                  <div className="flex justify-center bg-slate-950/80 rounded-md py-1.5 border border-slate-800/60">
                    <canvas id="menuPreviewCanvas" width="160" height="50" className="block"></canvas>
                  </div>
                </div>

                {/* Control description logs */}
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-300 space-y-1.5 max-w-xs mx-auto text-left shadow-lg">
                  <div className="flex items-center gap-1.5 text-yellow-400 font-bold">
                    <span>🎮</span> 
                    <span>
                      {gameState.controlMode === 'camera' 
                        ? 'หันเอียงศีรษะหน้ากล้อง ซ้าย-ขวา เพื่อเลี้ยว' 
                        : gameState.controlMode === 'tilt' 
                        ? 'เอียงพวงมาลัยเครื่องโทรศัพท์มือถือ เพื่อหมุนหลบ' 
                        : 'แตะสัมผัส แผงข้างซ้าย / ข้างขวา ในห้องเครื่อง'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[9px] text-slate-400 pt-0.5">
                    <div className="flex items-center gap-1">🟢 <span className="text-emerald-400 font-semibold shrink-0">อากาศ (O2):</span> รักษาระดับตัวถัง</div>
                    <div className="flex items-center gap-1">🔴 <span className="text-red-400 font-semibold shrink-0">ประแจ (HP):</span> ซ่อมแซมโครงเรือ</div>
                    <div className="col-span-2 flex items-center gap-1">🔵 <span className="text-cyan-400 font-semibold shrink-0">บาเรียไฟฟ้า:</span> บินชนกระแทกฝ่าสิ่งกีดขวางไร้เสียหาย</div>
                  </div>
                </div>

                <div className="flex gap-2 justify-center max-w-xs mx-auto">
                  <div className="bg-cyan-950/40 px-3 py-1.5 rounded-lg border border-cyan-800/30 text-xs inline-block shadow flex-1">
                    🏆 สถิติไกลสุด: <span className="text-cyan-300 font-bold">{Math.floor(gameState.highscore)} ม.</span>
                  </div>
                  <button 
                    onClick={() => { audio.playCoin(); setShowLeaderboard(true); }}
                    className="bg-yellow-950/60 hover:bg-yellow-900/80 px-3 py-1.5 rounded-lg border border-yellow-600/40 text-xs font-bold text-yellow-400 shadow cursor-pointer transition flex items-center gap-1 shrink-0"
                  >
                    🏆 ลำดับความลึก
                  </button>
                </div>
              </div>

              {/* Launcher button assemblies */}
              <div className="space-y-2 mt-auto">
                <button 
                  onClick={launchDive}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-base shadow-lg shadow-cyan-500/20 active:scale-95 transition-all transform cursor-pointer"
                >
                  เริ่มภารกิจสำรวจน้ำลึก
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={toggleCameraControl}
                    className={`py-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 cursor-pointer transition-all duration-200 ${gameState.controlMode === 'camera' ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md' : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'}`}
                  >
                    📷 กล้องหน้า AI: {gameState.controlMode === 'camera' ? 'เปิด' : 'ปิด'}
                  </button>
                  <button 
                    onClick={toggleTiltControl}
                    className={`py-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 cursor-pointer transition-all duration-200 ${gameState.controlMode === 'tilt' ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md' : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'}`}
                  >
                    📳 เอียงเครื่อง: {gameState.controlMode === 'tilt' ? 'เปิด' : 'ปิด'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => { audio.playPowerup(); setScreen('shop'); }}
                    className="py-2 bg-slate-900 hover:bg-slate-800 text-yellow-500 font-bold rounded-lg text-xs border border-slate-800 hover:border-slate-700 transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    🔧 อู่ซ่อมและอัปเกรดเรือ
                  </button>
                  <button 
                    onClick={toggleSound}
                    className="py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold rounded-lg text-xs border border-slate-800 hover:border-slate-700 transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    {soundOn ? '🔊 เสียง: เปิด' : '🔇 เสียง: ปิด'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== DISPLAY SCREEN: SHOP INTERFACE ==================== */}
          {screen === 'shop' && (
            <div className="absolute inset-0 flex flex-col justify-between p-5 bg-slate-950/98 border-t border-slate-800 z-35 transition-all duration-300">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-yellow-400 flex items-center gap-1.5">
                  <span>🔧</span> อู่ซ่อมและอัปเกรดเรือ
                </h2>
                <div className="text-xs font-bold bg-yellow-950/50 border border-yellow-700/30 px-2.5 py-1 rounded text-yellow-400 flex items-center gap-1">
                  🪙 <span>{gameState.coins}</span>
                </div>
              </div>

              {/* Upgradable options list view */}
              <div className="flex-1 my-3 overflow-y-auto pr-1 space-y-2.5 custom-scroll">
                
                {/* Upgrade 1: Hull Armor */}
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-100 text-xs">เกราะเรือดำน้ำ (Hull Armor)</h3>
                      <p className="text-[10px] text-slate-400 font-light">เพิ่มความทนของโครงเกราะเรือและความจุเลือด</p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-950/80 text-red-400 font-bold rounded self-start">
                      {gameState.upgrades.hull >= UPGRADES_CONF.hull.maxLevel ? 'MAX' : `Lv.${gameState.upgrades.hull}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="bg-red-500 h-full transition-all duration-200" 
                        style={{ width: `${(gameState.upgrades.hull / UPGRADES_CONF.hull.maxLevel) * 100}%` }}
                      ></div>
                    </div>
                    {gameState.upgrades.hull < UPGRADES_CONF.hull.maxLevel ? (
                      <button 
                        onClick={() => buyUpgrade('hull')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg shrink-0 cursor-pointer ${gameState.coins >= (gameState.upgrades.hull * UPGRADES_CONF.hull.costMultiplier) ? 'bg-yellow-500 text-slate-950 hover:bg-yellow-400' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                      >
                        🪙 {gameState.upgrades.hull * UPGRADES_CONF.hull.costMultiplier}
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 shrink-0">สูงสุดแล้ว</span>
                    )}
                  </div>
                </div>

                {/* Upgrade 2: Propulsion Engine */}
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-100 text-xs">กำลังเครื่องยนต์ (Engine Power)</h3>
                      <p className="text-[10px] text-slate-400 font-light">ความกระฉับกระเฉงในการหมุนเลี้ยวหลบหลีก</p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-cyan-950/80 text-cyan-400 font-bold rounded self-start">
                      {gameState.upgrades.engine >= UPGRADES_CONF.engine.maxLevel ? 'MAX' : `Lv.${gameState.upgrades.engine}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="bg-cyan-500 h-full transition-all duration-200" 
                        style={{ width: `${(gameState.upgrades.engine / UPGRADES_CONF.engine.maxLevel) * 100}%` }}
                      ></div>
                    </div>
                    {gameState.upgrades.engine < UPGRADES_CONF.engine.maxLevel ? (
                      <button 
                        onClick={() => buyUpgrade('engine')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg shrink-0 cursor-pointer ${gameState.coins >= (gameState.upgrades.engine * UPGRADES_CONF.engine.costMultiplier) ? 'bg-yellow-500 text-slate-950 hover:bg-yellow-400' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                      >
                        🪙 {gameState.upgrades.engine * UPGRADES_CONF.engine.costMultiplier}
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 shrink-0">สูงสุดแล้ว</span>
                    )}
                  </div>
                </div>

                {/* Upgrade 3: Aux Oxygen Tank */}
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-100 text-xs">ถังออกซิเจนสำรอง (Oxygen Tank)</h3>
                      <p className="text-[10px] text-slate-400 font-light">ประหยัดการใช้อากาศเพื่อรักษาปริมาตรลงไปใต้น้ำได้นานขึ้น</p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-950/80 text-emerald-400 font-bold rounded self-start">
                      {gameState.upgrades.oxygen >= UPGRADES_CONF.oxygen.maxLevel ? 'MAX' : `Lv.${gameState.upgrades.oxygen}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-200" 
                        style={{ width: `${(gameState.upgrades.oxygen / UPGRADES_CONF.oxygen.maxLevel) * 100}%` }}
                      ></div>
                    </div>
                    {gameState.upgrades.oxygen < UPGRADES_CONF.oxygen.maxLevel ? (
                      <button 
                        onClick={() => buyUpgrade('oxygen')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg shrink-0 cursor-pointer ${gameState.coins >= (gameState.upgrades.oxygen * UPGRADES_CONF.oxygen.costMultiplier) ? 'bg-yellow-500 text-slate-950 hover:bg-yellow-400' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                      >
                        🪙 {gameState.upgrades.oxygen * UPGRADES_CONF.oxygen.costMultiplier}
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 shrink-0">สูงสุดแล้ว</span>
                    )}
                  </div>
                </div>

                {/* Upgrade 4: Super Spotlight */}
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-100 text-xs">ไฟฉายซูเปอร์สปอตไลท์ (Light Beam)</h3>
                      <p className="text-[10px] text-slate-400 font-light">เพิ่มลำแสงกว้างลึกฉายสว่างเพื่อตรวจวิเคราะห์ความไร้กังวล</p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-950/80 text-amber-400 font-bold rounded self-start">
                      {gameState.upgrades.light >= UPGRADES_CONF.light.maxLevel ? 'MAX' : `Lv.${gameState.upgrades.light}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="bg-amber-500 h-full transition-all duration-200" 
                        style={{ width: `${(gameState.upgrades.light / UPGRADES_CONF.light.maxLevel) * 100}%` }}
                      ></div>
                    </div>
                    {gameState.upgrades.light < UPGRADES_CONF.light.maxLevel ? (
                      <button 
                        onClick={() => buyUpgrade('light')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg shrink-0 cursor-pointer ${gameState.coins >= (gameState.upgrades.light * UPGRADES_CONF.light.costMultiplier) ? 'bg-yellow-500 text-slate-950 hover:bg-yellow-400' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                      >
                        🪙 {gameState.upgrades.light * UPGRADES_CONF.light.costMultiplier}
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 shrink-0">สูงสุดแล้ว</span>
                    )}
                  </div>
                </div>

              </div>

              {/* Returning button controls */}
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => { audio.playPowerup(); setScreen('menu'); }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-xs border border-slate-700 hover:border-slate-600 cursor-pointer transition-all duration-200"
                >
                  กลับหน้าหลัก
                </button>
                <button 
                  onClick={resetAllUpgradesAndCoins}
                  className="py-3 px-4 bg-red-950/60 hover:bg-red-900/60 text-red-300 font-semibold rounded-xl text-xs border border-red-800/30 cursor-pointer transition-all duration-200"
                >
                  รีเซ็ตทุบโครงสร้าง
                </button>
              </div>
            </div>
          )}

          {/* ==================== DISPLAY SCREEN: GAME OVER ==================== */}
          {screen === 'gameover' && (
            <div className="absolute inset-0 flex flex-col justify-between p-6 bg-slate-950/98 z-40 transition-all duration-300 text-center">
              <div className="my-auto space-y-4">
                <div className="inline-block p-4 bg-red-500/10 border border-red-500/20 rounded-full text-5xl animate-pulse mb-2">
                  💥
                </div>
                
                <h2 className="text-2xl font-black text-red-500 tracking-wider">
                  ตัวเรืออับปางเสียหาย!
                </h2>
                <p className="text-slate-400 text-xs max-w-xs mx-auto leading-relaxed">
                  {deathReason === 'oxygen' 
                    ? 'สูญเสียปริมาตรอากาศออกซิเจนจนขาดอากาศหายใจก้นทะเลลึก' 
                    : 'เปลือกเรือสูญเสียวินัยรับแรงดันจากการปะทะชนสิ่งกีดขวางมากเกินสเกล'}
                </p>

                <div className="bg-slate-900/80 max-w-xs mx-auto p-4 rounded-xl border border-slate-800 grid grid-cols-2 gap-y-3 gap-x-1 text-center divide-x divide-slate-800 shadow-lg">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-widest leading-normal mb-0.5">ความลึกดิ่งได้</span>
                    <span className="text-lg font-bold text-cyan-400">{currentDepth} ม.</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-widest leading-normal mb-0.5">ทองกู้ชีพเพิ่ม</span>
                    <span className="text-lg font-bold text-yellow-400 flex items-center justify-center gap-0.5">🪙 {goldAcquiredThisDive}</span>
                  </div>
                </div>

                {isNewHighscore && (
                  <div className="inline-block px-4 py-1.5 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs font-extrabold rounded-full uppercase tracking-wider animate-bounce shadow">
                    🏆 บันทึกสถิติสูงสุดใหม่สำเร็จ!
                  </div>
                )}

                <div className="pt-1">
                  <button 
                    onClick={() => { audio.playCoin(); setShowLeaderboard(true); }}
                    className="w-full py-2 bg-yellow-950/60 hover:bg-yellow-900/80 rounded-lg border border-yellow-600/40 text-xs font-bold text-yellow-400 shadow cursor-pointer transition flex items-center justify-center gap-1.5"
                  >
                    🏆 ดูลำดับความลึกที่เล่นได้ไกลที่สุด
                  </button>
                </div>
              </div>

              {/* Actions buttons */}
              <div className="space-y-3 mt-auto">
                <button 
                  onClick={launchDive}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-lg shadow-lg active:scale-95 transition-all transform cursor-pointer"
                >
                  เริ่มจมระดับครั้งใหม่
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => { audio.playPowerup(); setScreen('shop'); }}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-yellow-400 font-bold rounded-lg text-xs border border-slate-700/60 transition cursor-pointer"
                  >
                    🪙 ไปอัปเกรดชิ้นส่วน
                  </button>
                  <button 
                    onClick={() => { audio.playPowerup(); setScreen('menu'); }}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs border border-slate-700/60 transition cursor-pointer"
                  >
                    กลับสู่หน้าหลัก
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== LEADERBOARD & HISTORY MODAL ==================== */}
          {showLeaderboard && (
            <div className="absolute inset-0 bg-black/92 backdrop-blur-md flex flex-col justify-between p-4 z-55 transition-all duration-300">
              <div className="space-y-2 border-b border-slate-800 pb-2.5">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-bold text-yellow-400 flex items-center gap-1.5">
                    <span>🏆</span> ลำดับความลึก & ประวัติบันทึก
                  </h2>
                  <button 
                    onClick={() => setShowLeaderboard(false)}
                    className="text-slate-400 hover:text-white text-lg font-bold px-2 py-0.5 rounded cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Tabs Switcher */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button 
                    onClick={() => setLeaderboardTab('rankings')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${leaderboardTab === 'rankings' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    <span>🏆</span> อันดับความลึกสูงสุด
                  </button>
                  <button 
                    onClick={() => setLeaderboardTab('history')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${leaderboardTab === 'history' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    <span>📜</span> บันทึกย้อนหลัง ({historyLogs.length})
                  </button>
                </div>
              </div>

              {/* Player Name Tag in Modal */}
              <div className="bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs my-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span className="text-[10px] text-cyan-300 font-medium">บันทึกอัตโนมัติในเครื่อง</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[10px]">กัปตันของคุณ:</span>
                  <span className="font-extrabold text-cyan-300">{gameState.playerName}</span>
                </div>
              </div>

              {/* Tab 1: Leaderboard Rankings */}
              {leaderboardTab === 'rankings' && (
                <div className="flex-1 my-1 overflow-y-auto space-y-2 pr-1 custom-scroll">
                  {leaderboard.map((entry, index) => {
                    const badge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                    const isCurrentPlayer = entry.playerName === gameState.playerName;
                    const subColor = COLOR_OPTIONS[entry.subColorIndex || 0] || COLOR_OPTIONS[0];

                    return (
                      <div 
                        key={entry.id || index}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 shadow-sm transition ${isCurrentPlayer ? 'bg-cyan-950/80 border-cyan-500/60 ring-1 ring-cyan-500/30' : 'bg-slate-900/80 border-slate-800'}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`text-base font-black shrink-0 ${index === 0 ? 'text-yellow-400 scale-110' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                            {badge}
                          </span>
                          
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span 
                                className="w-2.5 h-2.5 rounded-full inline-block shrink-0" 
                                style={{ backgroundColor: subColor.primary }}
                              ></span>
                              <span className="font-bold text-xs text-white truncate">
                                {entry.playerName}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>🪙 {entry.coinsGained}</span>
                              <span>•</span>
                              <span>{entry.date}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-extrabold text-cyan-400">
                            {entry.depth} ม.
                          </div>
                          <div className="text-[9px] text-slate-500">
                            ระดับก้นทะเล
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 2: User History Logs */}
              {leaderboardTab === 'history' && (
                <div className="flex-1 my-1 overflow-y-auto space-y-2 pr-1 custom-scroll">
                  {historyLogs.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs font-light">
                      ยังไม่มีบันทึกการดิ่ง เล่นเกมเพื่อสะสมประวัติการเล่นของคุณที่นี่!
                    </div>
                  ) : (
                    historyLogs.map((log) => (
                      <div 
                        key={log.id}
                        className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-cyan-300">{log.playerName}</span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                              {log.reason}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                            <span>📅 {log.date} {log.time}</span>
                            <span>•</span>
                            <span className="text-yellow-400">🪙 +{log.coinsGained}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-emerald-400">
                            {log.depth} ม.
                          </div>
                          <div className="text-[8px] text-slate-500">
                            ระยะความลึก
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              <button 
                onClick={() => setShowLeaderboard(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs border border-slate-700 cursor-pointer transition mt-2"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          )}

          {/* ==================== CUSTOM POPUP MODALS ==================== */}
          {modal && (
            <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 z-50 transition-all duration-300">
              <div className="bg-slate-900 border-2 border-cyan-800 p-5 rounded-2xl max-w-xs w-full text-center space-y-4 shadow-2xl">
                <div className="text-4xl text-cyan-400">{modal.icon}</div>
                <h3 className="font-bold text-base text-slate-100">{modal.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-light">{modal.desc}</p>
                <button 
                  onClick={modal.onConfirm ? modal.onConfirm : () => { audio.playCoin(); setModal(null); }}
                  className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold rounded-lg text-sm transition active:scale-95 cursor-pointer"
                >
                  ตกลง
                </button>
              </div>
            </div>
          )}

          {/* Atmosphere background decorative overlay gradient layer */}
          <div className="absolute inset-0 bg-gradient-to-t from-blue-950/20 to-transparent pointer-events-none z-5"></div>
        </div>
      </div>
    </div>
  );
}

// ======================================================================
// REACT ROOT BOOTSTRAP
// ======================================================================
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
