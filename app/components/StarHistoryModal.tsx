"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, CheckCircle, BookOpen, Gift } from "lucide-react";

interface LedgerItem {
  id: string;
  amount: number;
  source: string;
  sourceId?: string;
  reason: string;
  createdAt: string;
}

export default function StarHistoryModal({ childId, open, onClose }: { childId: string; open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [streakRewards, setStreakRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/star-ledger?childId=${childId}&limit=30`).then(r => r.json()),
      fetch('/api/streak-rewards').then(r => r.json()).catch(() => [])
    ])
      .then(([ledgerData, rewardsData]) => {
        setItems(Array.isArray(ledgerData.ledger) ? [...ledgerData.ledger].reverse() : []);
        setStreakRewards(Array.isArray(rewardsData) ? rewardsData : []);
      })
      .catch(err => console.error('Error fetching data for history:', err))
      .finally(() => setLoading(false));
  }, [childId, open]);

  const getIcon = (item: LedgerItem) => {
    if (item.source === 'streak-reward' && item.sourceId) {
      const reward = streakRewards.find(r => r.id === item.sourceId);
      const imgPath = reward?.image || (() => {
        const match = item.sourceId.match(/^streak-reward-(\d+)$/);
        return match ? `/images/rewards/${match[1]}.png` : null;
      })();

      if (imgPath) {
        return (
          <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 p-0.5">
            <img src={imgPath} alt="Награда" className="w-6 h-6 object-contain" />
          </div>
        );
      }
    }
    
    const iconWrapper = (iconNode: React.ReactNode) => (
      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
        {iconNode}
      </div>
    );

    switch (item.source) {
      case 'task': return iconWrapper(<CheckCircle size={14} className="text-green-500" />);
      case 'grade': return iconWrapper(<BookOpen size={14} className="text-blue-500" />);
      case 'reward-purchase': return iconWrapper(<Gift size={14} className="text-purple-500" />);
      default: return iconWrapper(<Star size={14} className="text-amber-500" />);
    }
  };

  const getRewardInfo = (item: LedgerItem) => {
    if (item.source === 'streak-reward' && item.sourceId) {
      const reward = streakRewards.find(r => r.id === item.sourceId);
      const cleanTitle = reward?.title 
        ? reward.title.replace('дракончик — ', '').replace('чик — ', ' — ').replace('Пандочка — ', '').replace('Капибара — ', '').replace('Енотик — ', '').replace('Пингвинёнок — ', '').replace('Лисёнок — ', '').replace('Тигрёнок — ', '').replace('Орлёнок — ', '').replace('Буйволёнок — ', '').replace('Хамелеончик — ', '').replace('Волчонок — ', '')
        : null;
      return {
        title: cleanTitle || reward?.title || item.reason.split(': ')[1]?.split(' (')[0] || item.reason,
        daysStreak: reward?.daysStreak || item.reason.match(/серию побед (\d+) дней/)?.[1] || item.reason.match(/серию из (\d+) дней/)?.[1] || '3'
      };
    }
    return null;
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm max-h-[60vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Star size={16} className="fill-amber-400 text-amber-400" /> История звёзд
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-2 space-y-1">
              {loading ? (
                <div className="text-center py-6 text-slate-400 text-sm">Загрузка...</div>
              ) : items.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">Пока нет действий</div>
              ) : (
                items.slice(0, 30).map(item => {
                  const rewardInfo = getRewardInfo(item);
                  return (
                    <div key={item.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                      {getIcon(item)}
                      <div className="flex-1 min-w-0">
                        {rewardInfo ? (
                          <>
                            <p className="text-xs font-bold text-slate-800 break-words leading-tight">
                              Награда {rewardInfo.title}
                            </p>
                            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                              получил за серию {rewardInfo.daysStreak} дней подряд • {formatDate(item.createdAt)}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs font-medium text-slate-700 break-words leading-tight">{item.reason}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(item.createdAt)}</p>
                          </>
                        )}
                      </div>
                      <div className={`text-xs font-extrabold shrink-0 ${item.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {item.amount >= 0 ? '+' : ''}{item.amount} ⭐
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
