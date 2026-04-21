import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, RefreshCcw } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 12 },
  { x: 10, y: 13 },
  { x: 10, y: 14 }
];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const BASE_SPEED = 120;

const TRACKS = [
  { title: "Cyber Slither", artist: "AI Synthesizer", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { title: "Neon Pulse", artist: "Neural Beats", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { title: "Glitch Garden", artist: "Deep Core AI", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
];

export default function App() {
  // Game State
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 10, y: 5 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Audio State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState("0:00");
  const [durationStr, setDurationStr] = useState("0:00");
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextDirection = useRef(INITIAL_DIRECTION);

  const generateFood = useCallback((currentSnake: {x: number, y: number}[]) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      // Make sure food is not on snake
      // eslint-disable-next-line no-loop-func
      if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
        break;
      }
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    nextDirection.current = INITIAL_DIRECTION;
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    setFood(generateFood(INITIAL_SNAKE));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'w', 'W'].includes(e.key) && direction.y === 0) {
        nextDirection.current = { x: 0, y: -1 };
      }
      if (['ArrowDown', 's', 'S'].includes(e.key) && direction.y === 0) {
        nextDirection.current = { x: 0, y: 1 };
      }
      if (['ArrowLeft', 'a', 'A'].includes(e.key) && direction.x === 0) {
        nextDirection.current = { x: -1, y: 0 };
      }
      if (['ArrowRight', 'd', 'D'].includes(e.key) && direction.x === 0) {
        nextDirection.current = { x: 1, y: 0 };
      }
      if (e.key === ' ' || e.key === 'Enter') {
        if (gameOver) resetGame();
        else setIsPaused(p => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, gameOver]);

  // Game Loop
  useEffect(() => {
    if (gameOver || isPaused) return;

    const moveSnake = () => {
      setSnake(prevSnake => {
        const head = prevSnake[0];
        const currentDir = nextDirection.current;
        setDirection(currentDir);

        const newHead = {
          x: head.x + currentDir.x,
          y: head.y + currentDir.y
        };

        // Check Wall Collision
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          handleGameOver();
          return prevSnake;
        }

        // Check Self Collision
        if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          handleGameOver();
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check Food
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(s => {
            const nextScore = s + 10;
            setHighScore(hs => Math.max(hs, nextScore));
            return nextScore;
          });
          setFood(generateFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const handleGameOver = () => {
      setGameOver(true);
    };

    const speed = Math.max(60, BASE_SPEED - Math.floor(score * 0.5));
    const interval = setInterval(moveSnake, speed);
    return () => clearInterval(interval);
  }, [food, gameOver, isPaused, score, generateFood]);

  // Audio effects
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Auto-play was prevented.
            setIsPlaying(false);
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 0;
      setProgress((current / duration) * 100 || 0);
      setCurrentTimeStr(formatTime(current));
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDurationStr(formatTime(audioRef.current.duration));
    }
  };

  const handleAudioEnded = () => {
    nextTrack();
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const padScore = (s: number) => s.toString().padStart(6, '0');

  const currentTrack = TRACKS[currentTrackIndex];

  return (
    <div className="flex h-screen flex-col font-sans overflow-hidden bg-black text-white">
      <audio
        ref={audioRef}
        src={currentTrack.src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 border-r border-zinc-800 p-6 flex flex-col gap-8 bg-zinc-950/80 shrink-0">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter neon-text-pink italic">SNAKE</h1>
            <h1 className="text-3xl font-black tracking-tighter neon-text-green italic">BEATS v1.0</h1>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Playlist</p>
            <div className="space-y-2">
              {TRACKS.map((track, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentTrackIndex(i);
                    setIsPlaying(true);
                  }}
                  className={`w-full text-left transition-all ${
                    i === currentTrackIndex ? 'track-active p-3 rounded-r flex items-center gap-3' : 'p-3 flex items-center gap-3 opacity-50 hover:opacity-80'
                  }`}
                >
                  <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center text-xs shrink-0 font-mono">
                    {(i + 1).toString().padStart(2, '0')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{track.title}</p>
                    <p className="text-xs text-zinc-500 truncate">{track.artist}</p>
                  </div>
                  {i === currentTrackIndex && isPlaying && (
                    <div className="ml-auto w-4 h-4 flex items-end gap-[2px]">
                      <div className="w-1 bg-green-500 animate-[bounce_0.8s_infinite] h-full"></div>
                      <div className="w-1 bg-green-500 animate-[bounce_0.5s_infinite_0.1s] h-2/3"></div>
                      <div className="w-1 bg-green-500 animate-[bounce_1s_infinite_0.2s] h-1/2"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <p className="text-[10px] text-zinc-500 uppercase mb-2 font-bold tracking-wider">Instructions</p>
            <p className="text-xs leading-relaxed text-zinc-400 font-mono italic">
              Use [W][A][S][D] or Arrows to move.<br/><br/>
              Press [SPACE] to pause or restart.<br/><br/>
              Eat nodes to sync frequency.
            </p>
          </div>
        </aside>

        {/* Main Game Area */}
        <main className="flex-1 flex flex-col items-center justify-center relative bg-[radial-gradient(circle_at_center,_#111827_0%,_#050505_100%)]">
          
          <div className="absolute top-10 left-10 flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">High Score</span>
            <span className="text-4xl font-black text-white/30 font-mono">{padScore(highScore)}</span>
          </div>
          
          <div className="absolute top-10 right-10 flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">Current Score</span>
            <span className="text-4xl font-black neon-text-green font-mono">{padScore(score)}</span>
          </div>

          <div className="neon-border bg-black p-1 relative rounded">
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(${GRID_SIZE}, 20px)`, 
                gridTemplateRows: `repeat(${GRID_SIZE}, 20px)`, 
                background: '#09090b',
                position: 'relative'
              }}
            >
              {/* Grid Background */}
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
                <div key={i} className="snake-cell opacity-5" />
              ))}

              {/* Food */}
              <div 
                className="snake-food absolute"
                style={{
                  width: 20, height: 20,
                  left: food.x * 20,
                  top: food.y * 20,
                }}
              />

              {/* Snake */}
              {snake.map((segment, index) => {
                const isHead = index === 0;
                return (
                  <div
                    key={`${segment.x}-${segment.y}-${index}`}
                    className={`absolute ${isHead ? 'snake-head' : 'snake-body'}`}
                    style={{
                      width: 20, height: 20,
                      left: segment.x * 20,
                      top: segment.y * 20,
                    }}
                  />
                );
              })}
            </div>

            {/* Overlays */}
            {gameOver && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded">
                <h2 className="text-4xl font-black neon-text-pink mb-2 italic tracking-tighter">GAME OVER</h2>
                <p className="text-zinc-400 font-mono mb-6">SIGNAL LOST</p>
                <button 
                  onClick={resetGame}
                  className="px-6 py-2 bg-zinc-900 border border-zinc-700 hover:border-green-500 hover:text-green-400 font-bold uppercase tracking-widest text-xs transition-colors flex items-center gap-2 rounded"
                >
                  <RefreshCcw size={16} /> Re-sync
                </button>
              </div>
            )}

            {isPaused && !gameOver && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center rounded">
                <h2 className="text-3xl font-black text-white mb-2 tracking-widest">PAUSED</h2>
                <button 
                  onClick={() => setIsPaused(false)}
                  className="px-6 py-2 bg-zinc-900 border border-zinc-700 hover:border-white font-bold uppercase tracking-widest text-xs transition-colors rounded"
                >
                  Resume
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer Music Player */}
      <footer className="h-24 glass flex items-center px-8 gap-12 shrink-0 relative z-20">
        <div className="flex items-center gap-4 w-72 shrink-0">
          <div className="w-12 h-12 bg-zinc-800 rounded flex-shrink-0 relative overflow-hidden flex items-center justify-center border border-zinc-700">
             <div className={`absolute bottom-0 left-0 w-full bg-green-500 opacity-20 transition-all duration-300 ${isPlaying ? 'h-full' : 'h-0'}`}></div>
             <span className="font-mono text-zinc-500 text-xs z-10">AI</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{currentTrack.title}</p>
            <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="flex items-center gap-6">
            <button onClick={prevTrack} className="text-zinc-400 hover:text-white transition-colors">
              <SkipBack fill="currentColor" size={20} />
            </button>
            <button 
              onClick={togglePlay} 
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} className="ml-1" />}
            </button>
            <button onClick={nextTrack} className="text-zinc-400 hover:text-white transition-colors">
              <SkipForward fill="currentColor" size={20} />
            </button>
          </div>
          
          <div className="w-full max-w-xl flex items-center gap-3 text-[10px] font-mono text-zinc-500">
            <p className="w-8 text-right">{currentTimeStr}</p>
            <div 
              className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden relative cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                if (audioRef.current) {
                  audioRef.current.currentTime = pos * audioRef.current.duration;
                }
              }}
            >
              <div 
                className="h-full bg-green-500 shadow-[0_0_10px_#22c55e] relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </div>
            <p className="w-8">{durationStr}</p>
          </div>
        </div>

        <div className="w-72 flex justify-end gap-4 shrink-0">
          <div className="flex items-center gap-2 text-zinc-400">
            <button onClick={() => setIsMuted(!isMuted)} className="hover:text-white transition-colors">
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <div 
              className="w-24 h-1.5 bg-zinc-800 rounded-full cursor-pointer relative group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                setVolume(pos);
                setIsMuted(false);
              }}
            >
              <div 
                className="h-full bg-zinc-400 group-hover:bg-green-400 transition-colors rounded-full"
                style={{ width: `${isMuted ? 0 : volume * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

