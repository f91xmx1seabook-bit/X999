import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { HistoryEvent, LeaderboardEntry } from './types';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

const INITIAL_EVENTS: HistoryEvent[] = [
  { id: 'event1', title: '荷蘭人建城', year: 1624 },
  { id: 'event2', title: '鄭成功來台', year: 1662 },
  { id: 'event3', title: '清領時期', year: 1683 },
  { id: 'event4', title: '日治時期', year: 1895 },
];

const shuffleArray = (array: HistoryEvent[]) => [...array].sort(() => Math.random() - 0.5);

export default function App() {
  const [gameState, setGameState] = useState<'home' | 'playing' | 'won' | 'lost'>('home');
  const [shuffledEvents, setShuffledEvents] = useState<HistoryEvent[]>([]);
  const [slots, setSlots] = useState<(HistoryEvent | null)[]>(Array(4).fill(null));
  const [draggedEvent, setDraggedEvent] = useState<HistoryEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [userName, setUserName] = useState('');
  const [timeTaken, setTimeTaken] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'leaderboard'), orderBy('time', 'asc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as LeaderboardEntry);
      setLeaderboard(data);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameState('lost');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  const startGame = () => {
    setShuffledEvents(shuffleArray(INITIAL_EVENTS));
    setSlots(Array(4).fill(null));
    setStartTime(Date.now());
    setTimeLeft(30);
    setGameState('playing');
    setUserName('');
  };

  const saveScore = async () => {
    await addDoc(collection(db, 'leaderboard'), { name: userName || '匿名', time: timeTaken });
    setGameState('home');
  };

  const handleDragStart = (e: React.DragEvent, event: HistoryEvent) => {
    setDraggedEvent(event);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.style.opacity = '1';
    setDraggedEvent(null);
  };

  const handleDrop = (index: number) => {
    if (draggedEvent) {
      const newSlots = [...slots];
      newSlots[index] = draggedEvent;
      setSlots(newSlots);
      setDragOverIndex(null);
    }
  };

  const checkAnswer = () => {
    const isCorrect = slots.every((event, index) => event?.id === INITIAL_EVENTS[index].id);
    if (isCorrect) {
      const time = 30 - timeLeft;
      setTimeTaken(time);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      setGameState('won');
    } else {
      setShowModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      {gameState === 'home' && (
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-8">台灣歷史排序大挑戰</h1>
          <button onClick={startGame} className="px-8 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition mb-12">開始遊戲</button>
          <div className="bg-white p-6 rounded-lg shadow-md w-80">
            <h2 className="text-xl font-bold mb-4">排行榜 (最快時間)</h2>
            {leaderboard.length === 0 ? <p className="text-slate-400">尚無紀錄</p> : (
              <ul className="text-left">{leaderboard.map((entry, i) => <li key={i} className="mb-1">{i + 1}. {entry.name} - {entry.time} 秒</li>)}</ul>
            )}
          </div>
        </div>
      )}

      {(gameState === 'playing' || gameState === 'won' || gameState === 'lost') && (
        <div className="w-full max-w-2xl flex flex-col items-center p-4">
          <div className="flex justify-between w-full mb-6 items-center">
             <h1 className="text-2xl font-bold text-slate-800">
               {gameState === 'playing' ? '請拖曳排序' : gameState === 'won' ? '恭喜過關!' : '時間到!'}
             </h1>
             {gameState === 'playing' && <div className="text-xl font-mono font-bold text-red-600"> {timeLeft}秒 </div>}
          </div>
          
          {gameState === 'playing' && (
            <div className="grid grid-cols-2 gap-3 mb-8 w-full">
              {shuffledEvents.map((event) => (
                <div key={event.id} draggable onDragStart={(e) => handleDragStart(e, event)} onDragEnd={handleDragEnd} className="h-16 bg-white p-2 shadow-sm rounded-lg flex items-center justify-center cursor-grab border border-slate-200 text-center text-sm font-medium">
                  {event.title}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-8 w-full">
            {slots.map((event, index) => (
              <div key={index} onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }} onDragLeave={() => setDragOverIndex(null)} onDrop={() => handleDrop(index)} className={`h-16 border-2 border-dashed rounded-lg flex items-center justify-center ${dragOverIndex === index ? 'bg-slate-200 border-slate-400' : 'border-slate-300'}`}>
                {event ? <span className="text-sm font-medium">{event.title}</span> : <span className="text-slate-400 text-xs">空槽</span>}
              </div>
            ))}
          </div>

          {gameState === 'playing' && (
            <div className="flex gap-4">
              <button onClick={() => setGameState('home')} className="px-6 py-2 bg-slate-200 rounded-lg hover:bg-slate-300 transition">返回首頁</button>
              <button onClick={checkAnswer} className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">檢查答案</button>
            </div>
          )}
          
          {gameState === 'won' && (
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <p className="mb-4 text-lg">您花了 {timeTaken} 秒過關！</p>
              <input type="text" placeholder="請輸入名字" value={userName} onChange={(e) => setUserName(e.target.value)} className="border p-2 rounded mb-4 w-full" />
              <button onClick={saveScore} className="px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition">儲存紀錄</button>
            </div>
          )}

          {gameState === 'lost' && (
            <div className="flex gap-4">
              <button onClick={() => setGameState('home')} className="px-6 py-2 bg-slate-200 rounded-lg hover:bg-slate-300 transition">返回首頁</button>
              <button onClick={startGame} className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">再試一次</button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl text-center">
            <p className="text-lg text-slate-800 mb-4">順序還有點不對喔，再試試看！</p>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300">關閉</button>
          </div>
        </div>
      )}
    </div>
  );
}
