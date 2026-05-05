"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, CheckCircle, BookOpen, Gift } from "lucide-react";

interface LedgerItem {
  id: string;
  amount: number;
  source: string;
  reason: string;
  createdAt: string;
}

export default function StarHistoryModal({ childId, open, onClose }: { childId: string; open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/star-ledger?childId=${childId}&limit=30`)
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d.ledger) ? [...d.ledger].reverse() : []))
      .finally(() => setLoading(false));
  }, [childId, open]);

  const getIcon = (source: string) => {
    switch (source) {
      case 'task': return <CheckCircle size={14} className="text-green-500" />;
      case 'grade': return <BookOpen size={14} className="text-blue-500" />;
      case 'reward-purchase': return <Gift size={14} className="text-purple-500" />;
      default: return <Star size={14} className="text-amber-500" />;
    }
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
                items.slice(0, 30).map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      {getIcon(item.source)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{item.reason}</p>
                      <p className="text-[10px] text-slate-400">{formatDate(item.createdAt)}</p>
                    </div>
                    <div className={`text-xs font-extrabold shrink-0 ${item.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {item.amount >= 0 ? '+' : ''}{item.amount} ⭐
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
