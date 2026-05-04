// Child profile
export type ChildProfile = {
  id: 'ali' | 'said';
  name: string;
  mode: 'full' | 'little-hero';
  avatarLetter: string;
  favoriteHeroes: string[];
  hideGradesInChildHome?: boolean;
  createdAt: string;
  updatedAt: string;
};

// Task template (for parent settings)
export type TaskTemplate = {
  id: string;
  childId: 'ali' | 'said' | 'both';
  title: string;
  category: 'study' | 'sport' | 'boxing' | 'chess' | 'reading' | 'order' | 'home-help' | 'rest' | 'custom';
  customCategory?: string;
  repeatDays: number[]; // 0-6, where 0 is Sunday
  dueTime?: string; // HH:MM
  stars: number;
  active: boolean;
  requiresOpenDetails: boolean;
  detailsText?: string;
  subtasksMode: 'none' | 'checkboxes' | 'plain-list';
  subtasks: { id: string; title: string; done?: boolean }[];
  askDifficultyAfterDone: boolean;
  createdAt: string;
  updatedAt: string;
};

// Daily task instance (for child dashboard)
export type DailyTaskInstance = {
  id: string;
  templateId?: string;
  childId: 'ali' | 'said';
  date: string; // YYYY-MM-DD
  title: string;
  category: string;
  stars: number;
  dueTime?: string;
  completed: boolean;
  completedAt?: string;
  detailsOpened: boolean;
  requiresOpenDetails: boolean;
  subtasksMode: 'none' | 'checkboxes' | 'plain-list';
  subtasks: { id: string; title: string; done: boolean }[];
  difficulty?: 'easy' | 'normal' | 'hard';
};

// Grade
export type Grade = {
  id: string;
  childId: 'ali' | 'said';
  date: string;
  subjectId: string;
  subjectName: string;
  grade: 5 | 4 | 3 | 2;
  starsAwarded: number;
  createdAt: string;
};

// Reward
export type Reward = {
  id: string;
  childId: 'ali' | 'said' | 'both';
  title: string;
  description?: string;
  costStars: number;
  icon: string;
  iconStyle: 'color' | 'minimal';
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

// Star ledger item
export type StarLedgerItem = {
  id: string;
  childId: 'ali' | 'said';
  date: string;
  amount: number;
  source: 'task' | 'grade' | 'manual' | 'reward-purchase' | 'reset' | 'adjustment';
  sourceId?: string;
  reason: string;
  createdAt: string;
};

// Parent event
export type ParentEvent = {
  id: string;
  childId: 'ali' | 'said';
  type: 'reward-available' | 'reward-selected' | 'day-completed' | 'task-completed' | 'grade-added' | 'system';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

// Subject
export type Subject = {
  id: string;
  name: string;
  order: number;
};

// Settings
export type AppSettings = {
  gradeToStars: {
    5: number;
    4: number;
    3: number;
    2: number;
  };
  starExpirationDays?: number;
  children: ChildProfile[];
};