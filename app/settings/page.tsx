"use client";

import { useState, useEffect } from "react";
import { Book, Trophy, Star, Key, Bot, Plus, Trash2, Edit3, Check, RefreshCw, Calendar, DollarSign, Save, User, Camera, X } from "lucide-react";
import { useChild } from "@/app/lib/ChildContext";
import AccordionSection from "../components/AccordionSection";
import { COLOR_ICONS, MINIMAL_ICONS, getIconDisplay } from "../lib/icons";
import { Switch } from "@/components/ui/switch";

interface Subject { id: string; name: string; order: number; }
interface Reward { id: string; title: string; description?: string; costStars: number; icon: string; iconStyle: 'color' | 'minimal'; active: boolean; }
interface TaskTemplate { id: string; title: string; category: string; repeatDays: number[]; stars: number; active: boolean; childId: string; }

const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAY_INDEX = [1, 2, 3, 4, 5, 6, 0]; // maps display index to Date.getDay() index
const CATEGORIES: Record<string, string> = { study: 'Учёба', sport: 'Спорт', boxing: 'Бокс', chess: 'Шахматы', reading: 'Чтение', order: 'Порядок', 'home-help': 'Помощь', rest: 'Отдых' };

export default function SettingsPage() {
  const { currentChild, switchChild } = useChild();
  const [settingsChildId, setSettingsChildId] = useState(currentChild.id);
  const childName = settingsChildId === 'ali' ? 'Али' : 'Саид';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');

  // Subjects
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [gradeMapping, setGradeMapping] = useState({ '5': '+5', '4': '+2', '3': '0', '2': '0' });

  // Star economy
  const [currencyEnabled, setCurrencyEnabled] = useState(true);
  const [resetEnabled, setResetEnabled] = useState(false);
  const [resetDays, setResetDays] = useState('90');

  // Rewards
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [rName, setRName] = useState(''); const [rCost, setRCost] = useState(''); const [rDesc, setRDesc] = useState('');
  const [rIcon, setRIcon] = useState('🎁'); const [rStyle, setRStyle] = useState<'color' | 'minimal'>('color'); const [showIcons, setShowIcons] = useState(false);

  // PIN
  const [pin1, setPin1] = useState(''); const [pin2, setPin2] = useState(''); const [recovery, setRecovery] = useState('');
  const [pinStatus, setPinStatus] = useState({ hasPin1: false, hasPin2: false, hasRecovery: false });

  // AI
  const [heroes, setHeroes] = useState('Мухаммед Али, Тайсон, Роналду');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [openRouterUrl, setOpenRouterUrl] = useState('https://openrouter.ai/api/v1');
  const [aiModel, setAiModel] = useState('openai/gpt-4o-mini');
  const [aiLimit, setAiLimit] = useState('3');

  // Interface / avatars
  const [avatarAli, setAvatarAli] = useState<string | null>(null);
  const [avatarSaid, setAvatarSaid] = useState<string | null>(null);

  // Tasks (schedule)
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [newTitle, setNewTitle] = useState(''); const [newStars, setNewStars] = useState('1');
  const [newCategory, setNewCategory] = useState('study'); const [newDays, setNewDays] = useState<number[]>([]);

  useEffect(() => { setSettingsChildId(currentChild.id); }, [currentChild.id]);
  useEffect(() => { loadAll(); }, [settingsChildId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [subjRes, rewRes, authRes, setRes, tplRes] = await Promise.all([
        fetch('/api/grades'), fetch(`/api/rewards?childId=${settingsChildId}`), fetch('/api/auth/parent/settings'),
        fetch('/api/settings'), fetch('/api/tasks/templates')
      ]);
      const subjData = await subjRes.json(); if (Array.isArray(subjData)) setSubjects(subjData);
      const rewData = await rewRes.json(); setRewards(Array.isArray(rewData) ? rewData : []);
      setPinStatus(await authRes.json());
      const setData = await setRes.json();
      if (setData.systemPrompt) setSystemPrompt(setData.systemPrompt);
      if (setData.gradeToStars) {
        const g = setData.gradeToStars;
        setGradeMapping({ '5': `+${g['5']}`, '4': `+${g['4']}`, '3': `${g['3'] >= 0 ? '+' : ''}${g['3']}`, '2': `${g['2'] >= 0 ? '+' : ''}${g['2']}` });
      }
      if (setData.currencyEnabled !== undefined) setCurrencyEnabled(setData.currencyEnabled);
      if (setData.resetEnabled !== undefined) setResetEnabled(setData.resetEnabled);
      if (setData.resetDays) setResetDays(String(setData.resetDays));
      if (setData.openRouterUrl) setOpenRouterUrl(setData.openRouterUrl);
      if (setData.aiModel) setAiModel(setData.aiModel);
      if (setData.heroes) setHeroes(setData.heroes);
      if (setData.aiLimit !== undefined) setAiLimit(String(setData.aiLimit));
      // Load avatars from children API
      const childrenRes = await fetch('/api/children');
      const childrenData = await childrenRes.json();
      if (Array.isArray(childrenData)) {
        const ali = childrenData.find((c: any) => c.id === 'ali');
        const said = childrenData.find((c: any) => c.id === 'said');
        if (ali?.avatarUrl) setAvatarAli(ali.avatarUrl);
        if (said?.avatarUrl) setAvatarSaid(said.avatarUrl);
      }
      const tplData = await tplRes.json(); setTemplates(Array.isArray(tplData) ? tplData.filter((t: TaskTemplate) => t.childId === settingsChildId || t.childId === 'both') : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const showSaved = (msg: string) => { setSaved(msg); setTimeout(() => setSaved(''), 2000); };

  // Subjects
  const addSubject = async () => {
    if (!newSubject.trim()) return;
    const updated = [...subjects, { id: `s-${Date.now()}`, name: newSubject.trim(), order: subjects.length + 1 }];
    setSubjects(updated); setNewSubject('');
    await fetch('/api/grades', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subjects: updated }) });
    showSaved('Предмет добавлен');
  };
  const removeSubject = async (id: string) => {
    const updated = subjects.filter(s => s.id !== id);
    setSubjects(updated);
    await fetch('/api/grades', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subjects: updated }) });
  };

  const saveGradeMapping = async () => {
    const parseVal = (s: string) => { const n = parseFloat(s.replace(/[+]/g, '')); return isNaN(n) ? 0 : n; };
    const gradeToStars = { '5': parseVal(gradeMapping['5']), '4': parseVal(gradeMapping['4']), '3': parseVal(gradeMapping['3']), '2': parseVal(gradeMapping['2']) };
    const settings = await (await fetch('/api/settings')).json();
    settings.gradeToStars = gradeToStars;
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    showSaved('Маппинг оценок сохранён');
  };

  // Star economy
  const saveEconomy = async () => {
    const settings = await (await fetch('/api/settings')).json();
    settings.currencyEnabled = currencyEnabled;
    settings.resetEnabled = resetEnabled;
    settings.resetDays = parseInt(resetDays) || 90;
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    showSaved('Экономика сохранена');
  };

  // Rewards
  const addReward = async () => {
    if (!rName.trim() || !rCost) return;
    const res = await fetch('/api/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: settingsChildId, title: rName.trim(), description: rDesc || undefined, costStars: parseFloat(rCost), icon: rIcon, iconStyle: rStyle, active: true }) });
    const r = await res.json();
    setRewards([...rewards, r]); resetReward(); showSaved('Награда добавлена');
  };
  const editReward = (r: Reward) => { setEditId(r.id); setRName(r.title); setRCost(String(r.costStars)); setRDesc(r.description || ''); setRIcon(r.icon); setRStyle(r.iconStyle); };
  const saveEditReward = async () => {
    if (!editId) return;
    await fetch('/api/rewards', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId, title: rName.trim(), description: rDesc || '', costStars: parseFloat(rCost), icon: rIcon, iconStyle: rStyle }) });
    setEditId(null); resetReward(); loadAll(); showSaved('Награда обновлена');
  };
  const removeReward = async (id: string) => { await fetch(`/api/rewards?id=${id}`, { method: 'DELETE' }); setRewards(rewards.filter(r => r.id !== id)); };
  const resetReward = () => { setRName(''); setRCost(''); setRDesc(''); setRIcon('🎁'); setRStyle('color'); setEditId(null); };

  // PIN
  const savePin = async (slot: number, val: string) => {
    if (val.length < 4) return;
    await fetch('/api/auth/parent/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: val, pinSlot: slot }) });
    showSaved(`PIN ${slot} сохранён`); slot === 1 ? setPin1('') : setPin2('');
    const res = await fetch('/api/auth/parent/settings'); setPinStatus(await res.json());
  };
  const saveRecovery = async () => {
    if (recovery.length < 4) return;
    await fetch('/api/auth/parent/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recoveryWord: recovery }) });
    showSaved('Recovery слово сохранено'); setRecovery('');
    const res = await fetch('/api/auth/parent/settings'); setPinStatus(await res.json());
  };

  // AI
  const saveAI = async () => {
    setSaving(true);
    const settings = await (await fetch('/api/settings')).json();
    settings.systemPrompt = systemPrompt;
    settings.heroes = heroes;
    settings.openRouterUrl = openRouterUrl;
    settings.aiModel = aiModel;
    settings.aiLimit = parseInt(aiLimit) || 3;
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    setSaving(false); showSaved('Настройки AI сохранены');
  };

  // Tasks
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const toggleDay = (day: number) => { setNewDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]); };
  const editTemplate = (t: TaskTemplate) => {
    setEditTemplateId(t.id); setNewTitle(t.title); setNewStars(String(t.stars));
    setNewCategory(t.category); setNewDays(t.repeatDays || []);
  };
  const addTemplate = async () => {
    if (!newTitle.trim() || !newStars) return;
    const current = await (await fetch('/api/tasks/templates')).json();
    let updated = Array.isArray(current) ? [...current] : [];
    if (editTemplateId) {
      updated = updated.map((t: any) => t.id === editTemplateId ? { ...t, title: newTitle.trim(), category: newCategory, repeatDays: newDays, stars: parseFloat(newStars), updatedAt: new Date().toISOString() } : t);
    } else {
      updated.push({ id: `tpl-${Date.now()}`, childId: settingsChildId, title: newTitle.trim(), category: newCategory, repeatDays: newDays, stars: parseFloat(newStars), active: true, requiresOpenDetails: false, detailsText: '', subtasksMode: 'none', subtasks: [], askDifficultyAfterDone: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    await fetch('/api/tasks/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    setNewTitle(''); setNewStars('1'); setNewDays([]); setEditTemplateId(null); loadAll();
  };
  const deleteTemplate = async (id: string) => { const updated = templates.filter(t => t.id !== id); await fetch('/api/tasks/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) }); setTemplates(updated); };
  const moveTemplate = async (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= templates.length) return;
    const updated = [...templates]; [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    await fetch('/api/tasks/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) }); setTemplates(updated);
  };
  const cancelEdit = () => { setEditTemplateId(null); setNewTitle(''); setNewStars('1'); setNewDays([]); };
  const getCategoryLabel = (cat: string) => CATEGORIES[cat] || cat;

  if (loading) return (
    <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">
      <svg width={48} height={48} viewBox="0 0 24 24" fill="none" className="animate-spin text-blue-500"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="60" strokeDashoffset="20"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 pb-10">
      <header className="bg-white px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-40">
        <h1 className="text-lg md:text-xl font-extrabold text-slate-800">Настройки</h1>
        <div className="bg-slate-100 rounded-xl p-1 flex">
          {(['ali', 'said'] as const).map(id => (
            <button key={id} onClick={() => setSettingsChildId(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${settingsChildId === id ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{id === 'ali' ? 'Али' : 'Саид'}</button>
          ))}
        </div>
      </header>

      {saved && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg">✅ {saved}</div>}

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-4 space-y-3">

        {/* 1. PIN AND ACCESS */}
        <AccordionSection id="pin" title="PIN и восстановление" accentColor="border-t-4 border-t-red-500"
          icon={<Key size={18} className="text-red-500" />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            {[
              { label: 'PIN 1', val: pin1, set: setPin1, slot: 1, has: pinStatus.hasPin1 },
              { label: 'PIN 2 (резерв)', val: pin2, set: setPin2, slot: 2, has: pinStatus.hasPin2 },
              { label: 'Recovery слово', val: recovery, set: setRecovery, slot: 3, has: pinStatus.hasRecovery, text: true },
            ].map(item => (
              <div key={item.slot}>
                <label className="block text-xs font-bold text-slate-500 mb-1">{item.label}</label>
                <p className="text-[10px] text-slate-400 mb-1.5">{item.has ? '✅ Установлен' : '❌ Не установлен'}</p>
                <input type={item.text ? 'text' : 'password'} inputMode={item.text ? undefined : 'numeric'} maxLength={item.text ? undefined : 6}
                  placeholder={item.text ? 'Секретное слово' : '4-6 цифр'} value={item.val}
                  onChange={e => item.text ? item.set(e.target.value) : item.set(e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all font-medium text-sm" />
                <button onClick={() => item.slot === 3 ? saveRecovery() : savePin(item.slot, item.val)}
                  disabled={(item.text ? item.val.length : item.val.length) < 4}
                  className="mt-1.5 w-full bg-red-500 text-white py-1.5 rounded-xl font-bold text-xs hover:bg-red-600 transition-colors disabled:opacity-50">Сохранить</button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-[11px] text-slate-400">PIN 1 по умолчанию: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">199991</code></p>
            <button onClick={async () => {
              await fetch('/api/auth/parent/settings', { method: 'DELETE' });
              setPinStatus({ hasPin1: false, hasPin2: false, hasRecovery: false });
              showSaved('PIN сброшен до 199991');
            }} className="text-[11px] text-red-400 hover:text-red-600 font-medium underline">Сбросить PIN</button>
          </div>
        </AccordionSection>

        {/* 2. TASKS (SCHEDULE) */}
        <AccordionSection id="tasks" title="Задачи (расписание)" accentColor="border-t-4 border-t-green-500"
          icon={<Calendar size={18} className="text-green-500" />}>
          <div className="space-y-3 mb-4">
            <input type="text" placeholder="Что нужно сделать?" value={newTitle} onChange={e => setNewTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all font-medium text-sm" />
            <div className="flex gap-2">
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-green-500 transition-all font-medium text-sm bg-white">
                {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="number" step="0.5" min="0.5" placeholder="⭐" value={newStars} onChange={e => setNewStars(e.target.value)}
                className="w-20 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 transition-all font-medium text-sm" />
              {editTemplateId ? (
                <button onClick={cancelEdit} className="bg-slate-300 text-white w-11 h-11 rounded-xl flex items-center justify-center hover:bg-slate-400 shrink-0"><X size={20} /></button>
              ) : null}
              <button onClick={addTemplate} className={editTemplateId ? 'bg-blue-500 text-white w-11 h-11 rounded-xl flex items-center justify-center hover:bg-blue-600 shrink-0' : 'bg-green-500 text-white w-11 h-11 rounded-xl flex items-center justify-center hover:bg-green-600 shrink-0'}>
                {editTemplateId ? <Check size={20} /> : <Plus size={20} />}
              </button>
            </div>
            <div className="flex gap-1.5">
              {DAYS_SHORT.map((day, i) => {
                const di = DAY_INDEX[i];
                return (
                <button key={i} onClick={() => toggleDay(di)}
                  className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all border ${newDays.includes(di) ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300'}`}>{day}</button>
                );
              })}
            </div>
            {newDays.length === 0 && <p className="text-[11px] text-slate-400">Если дни не выбраны — задача разовая</p>}
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {templates.length === 0 && <p className="text-slate-400 text-center py-4 text-sm">Нет задач</p>}
            {templates.map((t, idx) => (
              <div key={t.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center justify-between gap-2 group">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-800 text-sm truncate">{t.title}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">{getCategoryLabel(t.category)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mt-1">
                    {DAYS_SHORT.map((day, i) => (
                      <span key={i} className={`text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center ${t.repeatDays?.includes(DAY_INDEX[i]) ? 'bg-blue-100 text-blue-600' : 'text-slate-300'}`}>{day}</span>
                    ))}
                    <span className="ml-1.5 text-[11px] font-bold text-amber-500">+{t.stars} ⭐</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => moveTemplate(idx, -1)} disabled={idx === 0} className="text-slate-300 hover:text-blue-500 disabled:opacity-20 p-0.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg></button>
                  <button onClick={() => moveTemplate(idx, 1)} disabled={idx === templates.length - 1} className="text-slate-300 hover:text-blue-500 disabled:opacity-20 p-0.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></button>
                  <button onClick={() => editTemplate(t)} className="text-slate-300 hover:text-blue-500 transition-colors p-1"><Edit3 size={13} /></button>
                  <button onClick={() => deleteTemplate(t.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </AccordionSection>

        {/* 3. SUBJECTS */}
        <AccordionSection id="subjects" title="Предметы" accentColor="border-t-4 border-t-blue-500"
          icon={<Book size={18} className="text-blue-500" />}>
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="Новый предмет..." value={newSubject} onChange={e => setNewSubject(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubject()}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-sm" />
            <button onClick={addSubject} className="bg-blue-500 text-white w-11 h-11 rounded-xl flex items-center justify-center hover:bg-blue-600 shrink-0"><Plus size={20} /></button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {subjects.map(s => (
              <div key={s.id} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                {s.name}
                <button onClick={() => removeSubject(s.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
              </div>
            ))}
            {subjects.length === 0 && <p className="text-slate-400 text-xs">Нет предметов</p>}
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-3">Маппинг оценок → звёзды</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {[5, 4, 3, 2].map(g => (
                <div key={g} className="flex items-center gap-1.5 bg-white rounded-xl px-3 py-2 border border-slate-200">
                  <span className="font-bold text-sm">{g}</span>
                  <span className="text-slate-300 text-xs">=</span>
                  <input value={gradeMapping[String(g)]} onChange={e => setGradeMapping(prev => ({ ...prev, [String(g)]: e.target.value }))}
                    className="flex-1 min-w-0 text-sm font-bold text-center outline-none bg-transparent" />
                  <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
                </div>
              ))}
            </div>
            <button onClick={saveGradeMapping} className="bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-600 transition-colors"><Save size={14} className="inline mr-1" />Сохранить маппинг</button>
          </div>
        </AccordionSection>

        {/* 4. STAR ECONOMY */}
        <AccordionSection id="economy" title="Экономика звёзд" accentColor="border-t-4 border-t-amber-500"
          icon={<DollarSign size={18} className="text-amber-500" />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-bold text-slate-700">Звёзды как валюта</p>
                <p className="text-xs text-slate-400">При покупке награды звёзды списываются</p>
              </div>
              <Switch checked={currencyEnabled} onCheckedChange={setCurrencyEnabled} />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-bold text-slate-700">Обнуление через N дней</p>
                <p className="text-xs text-slate-400">Баланс сбрасывается каждые N дней</p>
              </div>
              <Switch checked={resetEnabled} onCheckedChange={setResetEnabled} />
            </div>
            {resetEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Каждые</span>
                <input type="number" value={resetDays} onChange={e => setResetDays(e.target.value)}
                  className="w-20 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-amber-500 transition-all font-medium text-sm text-center" />
                <span className="text-xs font-bold text-slate-500">дней</span>
              </div>
            )}
            <button onClick={saveEconomy} className="bg-amber-500 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-amber-600 transition-colors"><Save size={14} className="inline mr-1" />Сохранить экономику</button>
          </div>
        </AccordionSection>

        {/* 5. REWARDS */}
        <AccordionSection id="rewards" title="Награды" accentColor="border-t-4 border-t-purple-500"
          icon={<Trophy size={18} className="text-purple-500" />}>
          <div className="space-y-2 mb-4">
            <input type="text" placeholder="Название" value={rName} onChange={e => setRName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium text-sm" />
            <div className="grid grid-cols-[1fr_44px_44px] gap-2">
              <input type="number" placeholder="Цена" value={rCost} onChange={e => setRCost(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-all font-medium text-sm" />
              <button onClick={() => setShowIcons(!showIcons)}
                className="w-11 h-11 rounded-xl border-2 border-slate-200 flex items-center justify-center text-xl hover:border-purple-300 transition-colors justify-self-center">{rIcon}</button>
              {editId ? (
                <button onClick={saveEditReward} className="bg-green-500 text-white w-11 h-11 rounded-xl flex items-center justify-center hover:bg-green-600 justify-self-center"><Check size={20} /></button>
              ) : (
                <button onClick={addReward} className="bg-purple-500 text-white w-11 h-11 rounded-xl flex items-center justify-center hover:bg-purple-600 justify-self-center"><Plus size={20} /></button>
              )}
            </div>
            <input type="text" placeholder="Описание (необязательно)" value={rDesc} onChange={e => setRDesc(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-all font-medium text-sm" />
          </div>
          {showIcons && (
            <div className="mb-4 bg-slate-50 rounded-2xl p-3 max-h-40 overflow-y-auto border border-slate-200">
              <div className="flex gap-2 mb-2">
                <button onClick={() => setRStyle('color')} className={`px-3 py-1 rounded-lg text-xs font-bold ${rStyle === 'color' ? 'bg-blue-500 text-white' : 'bg-white text-slate-600'}`}>Цветные</button>
                <button onClick={() => setRStyle('minimal')} className={`px-3 py-1 rounded-lg text-xs font-bold ${rStyle === 'minimal' ? 'bg-blue-500 text-white' : 'bg-white text-slate-600'}`}>Минимал</button>
              </div>
              <div className="grid grid-cols-8 gap-1">
                {(rStyle === 'color' ? COLOR_ICONS : MINIMAL_ICONS.map(i => getIconDisplay(i, 'minimal'))).map((icon, idx) => (
                  <button key={idx} onClick={() => { setRIcon(icon); setShowIcons(false); }}
                    className={`w-8 h-8 rounded-lg text-base flex items-center justify-center hover:bg-blue-100 transition-colors ${rIcon === icon ? 'bg-blue-200 ring-2 ring-blue-400' : ''}`}>{icon}</button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {rewards.map(r => (
              <div key={r.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center justify-between group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg shrink-0">{r.icon}</span>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 text-sm block truncate">{r.title}</span>
                    {r.description && <p className="text-[11px] text-slate-400 truncate">{r.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs font-extrabold text-amber-600">{r.costStars} ⭐</span>
                  <button onClick={() => editReward(r)} className="text-slate-300 hover:text-blue-500"><Edit3 size={13} /></button>
                  <button onClick={() => removeReward(r.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
            {rewards.length === 0 && <p className="text-slate-400 text-center py-4 text-sm">Нет наград</p>}
          </div>
        </AccordionSection>

        {/* 6. AI */}
        <AccordionSection id="ai" title="Послание героя" accentColor="border-t-4 border-t-indigo-500"
          icon={<Bot size={18} className="text-indigo-500" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">OpenRouter Base URL</label>
              <input type="text" value={openRouterUrl} onChange={e => setOpenRouterUrl(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Модель</label>
              <input type="text" value={aiModel} onChange={e => setAiModel(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Любимые герои (через запятую)</label>
              <input type="text" value={heroes} onChange={e => setHeroes(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Лимит посланий в день</label>
              <input type="number" min="1" max="10" value={aiLimit} onChange={e => setAiLimit(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Системный промпт</label>
              <textarea rows={3} value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-sm resize-none" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={saveAI} disabled={saving}
              className="bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-600 transition-colors disabled:opacity-50">
              {saving ? 'Сохранение...' : <><Save size={14} className="inline mr-1" />Сохранить</>}
            </button>
            <button onClick={async () => {
              const today = new Date().toISOString().split('T')[0];
              await fetch(`/api/ai/hero-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ childId: settingsChildId, childName: childName, mode: 'full', tasks: [], resetCounter: true })
              });
              showSaved('Счётчик сброшен');
            }}
              className="bg-orange-100 text-orange-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-200 transition-colors">
              🔄 Сбросить счётчик
            </button>
          </div>
        </AccordionSection>

        {/* 7. INTERFACE */}
        <AccordionSection id="interface" title="Интерфейс" accentColor="border-t-4 border-t-teal-500"
          icon={<User size={18} className="text-teal-500" />}>
          <div className="space-y-4">
            {(['ali', 'said'] as const).map(id => {
              const isAli = id === 'ali';
              const avatar = isAli ? avatarAli : avatarSaid;
              const label = isAli ? 'Али' : 'Саид';
              return (
                <div key={id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                  <div className="relative">
                    {avatar ? (
                      <img src={avatar} alt={label} className="w-14 h-14 rounded-full object-cover border-2 border-slate-200" />
                    ) : (
                      <div className="w-14 h-14 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold">
                        {isAli ? 'А' : 'С'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-700">{label}</p>
                    <p className="text-xs text-slate-400 mb-2">Фото профиля</p>
                    <label className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:border-blue-300 cursor-pointer transition-colors">
                      <Camera size={14} />
                      {avatar ? 'Изменить' : 'Загрузить'}
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 1 * 1024 * 1024) { alert('Файл слишком большой (макс 1MB)'); return; }
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                          const dataUrl = ev.target?.result as string;
                          if (isAli) setAvatarAli(dataUrl); else setAvatarSaid(dataUrl);
                          await fetch('/api/children', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, avatarUrl: dataUrl }) });
                          showSaved(`Фото ${label} обновлено`);
                        };
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                    {avatar && (
                      <button onClick={async () => {
                        if (isAli) setAvatarAli(null); else setAvatarSaid(null);
                        await fetch('/api/children', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, avatarUrl: null }) });
                        showSaved(`Фото ${label} удалено`);
                      }} className="ml-2 text-xs text-red-400 hover:text-red-600 font-medium">Удалить</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </AccordionSection>

        {/* 8. SYSTEM */}
        <AccordionSection id="system" title="Система" accentColor="border-t-4 border-t-slate-500"
          icon={<RefreshCw size={18} className="text-slate-500" />}>
          <div className="space-y-2">
            <button onClick={async () => { await fetch('/api/cleanup', { method: 'POST' }); showSaved('Очистка выполнена'); }}
              className="w-full bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors text-left">
              🗑 Очистить старые данные (90+ дней)
            </button>
            <button onClick={() => {
              const d = new Date(); d.setTime(d.getTime() - 1);
              document.cookie = 'parent-session=; expires=' + d.toUTCString() + '; path=/;';
              window.location.href = '/';
            }}
              className="w-full bg-red-100 text-red-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-red-200 transition-colors text-left">
              🚪 Завершить сессию
            </button>
          </div>
        </AccordionSection>

      </main>
    </div>
  );
}
