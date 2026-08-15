// Unified configuration, mapping, and shuffle-bag randomization for Motivational Rewards

export type ChildId = 'ali' | 'said';

export interface MotivationalRewardItem {
  childId: ChildId;
  audioNumber: number;
  audioSrc: string;
  videoSrc: string;
  theme: string;
  title: string;
}

// Rigid Video Mapping according to specifications:
// ALI:
// Audio #2, #5, #6 -> ali_boxing_loop.webm
// Audio #4, #7, #9 -> ali_chess_loop.webm
// Audio #1, #3, #8 -> ali_football_loop.webm
//
// SAID:
// Audio #2, #5, #8 -> said_superhero_loop.webm
// Audio #3, #4, #9 -> said_football_loop.webm
// Audio #1, #6, #7 -> said_stage_loop.webm

export const MOTIVATIONAL_VIDEO_MAP: Record<ChildId, Record<number, { videoSrc: string; theme: string; title: string }>> = {
  ali: {
    1: { videoSrc: '/videos/rewards/ali_football_loop.webm', theme: 'Футбол / Командный дух', title: 'Движение вперёд!' },
    2: { videoSrc: '/videos/rewards/ali_boxing_loop.webm', theme: 'Бокс / Характер', title: 'Сила духа!' },
    3: { videoSrc: '/videos/rewards/ali_football_loop.webm', theme: 'Футбол / Мастерство', title: 'Точный удар!' },
    4: { videoSrc: '/videos/rewards/ali_chess_loop.webm', theme: 'Шахматы / Стратегия', title: 'Мудрый ход!' },
    5: { videoSrc: '/videos/rewards/ali_boxing_loop.webm', theme: 'Бокс / Упорство', title: 'Ни шагу назад!' },
    6: { videoSrc: '/videos/rewards/ali_boxing_loop.webm', theme: 'Бокс / Чемпион', title: 'Путь чемпиона!' },
    7: { videoSrc: '/videos/rewards/ali_chess_loop.webm', theme: 'Шахматы / Тактика', title: 'Победная тактика!' },
    8: { videoSrc: '/videos/rewards/ali_football_loop.webm', theme: 'Футбол / Скорость', title: 'Красивая игра!' },
    9: { videoSrc: '/videos/rewards/ali_chess_loop.webm', theme: 'Шахматы / Гроссмейстер', title: 'Великий замысел!' },
  },
  said: {
    1: { videoSrc: '/videos/rewards/said_stage_loop.webm', theme: 'Сцена / Вдохновение', title: 'Яркое выступление!' },
    2: { videoSrc: '/videos/rewards/said_superhero_loop.webm', theme: 'Супергерой / Сила', title: 'Супергерой дня!' },
    3: { videoSrc: '/videos/rewards/said_football_loop.webm', theme: 'Футбол / Ловкость', title: 'Молниеносный гол!' },
    4: { videoSrc: '/videos/rewards/said_football_loop.webm', theme: 'Футбол / Энергия', title: 'Настоящий драйв!' },
    5: { videoSrc: '/videos/rewards/said_superhero_loop.webm', theme: 'Супергерой / Защитник', title: 'Геройская сила!' },
    6: { videoSrc: '/videos/rewards/said_stage_loop.webm', theme: 'Сцена / Творчество', title: 'Аплодисменты!' },
    7: { videoSrc: '/videos/rewards/said_stage_loop.webm', theme: 'Сцена / Звезда', title: 'Звезда сцены!' },
    8: { videoSrc: '/videos/rewards/said_superhero_loop.webm', theme: 'Супергерой / Полёт', title: 'Полёт к победе!' },
    9: { videoSrc: '/videos/rewards/said_football_loop.webm', theme: 'Футбол / Чемпион', title: 'Футбольный триумф!' },
  },
};

export function getRewardItem(childId: ChildId, audioNumber: number): MotivationalRewardItem {
  const num = Math.min(Math.max(audioNumber, 1), 9);
  const info = MOTIVATIONAL_VIDEO_MAP[childId][num] || {
    videoSrc: childId === 'ali' ? '/videos/rewards/ali_football_loop.webm' : '/videos/rewards/said_superhero_loop.webm',
    theme: 'Герой дня',
    title: 'Отличная работа!',
  };

  return {
    childId,
    audioNumber: num,
    audioSrc: `/audio/rewards/${childId}/${num}.mp3`,
    videoSrc: info.videoSrc,
    theme: info.theme,
    title: info.title,
  };
}

// Fisher-Yates shuffle
function shuffleArray(arr: number[]): number[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generates a new shuffled bag of 1..9, attempting to avoid starting with the same video as the last played video
function generateShuffledBag(childId: ChildId, lastAudioNumber?: number): number[] {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  let shuffled = shuffleArray(numbers);

  if (lastAudioNumber) {
    const lastVideo = MOTIVATIONAL_VIDEO_MAP[childId][lastAudioNumber]?.videoSrc;
    // If the first item in the new shuffled bag has the same video, swap it with another item if possible
    if (lastVideo && MOTIVATIONAL_VIDEO_MAP[childId][shuffled[0]]?.videoSrc === lastVideo) {
      const diffIdx = shuffled.findIndex((num) => MOTIVATIONAL_VIDEO_MAP[childId][num]?.videoSrc !== lastVideo);
      if (diffIdx > 0) {
        [shuffled[0], shuffled[diffIdx]] = [shuffled[diffIdx], shuffled[0]];
      }
    }
  }

  return shuffled;
}

interface StoredBagState {
  bag: number[];
  currentIndex: number;
  lastAudioNumber?: number;
}

const STORAGE_BAG_PREFIX = 'aq:motivational-bag:';
const STORAGE_VIEWED_PREFIX = 'aq:motivational-viewed:';

function getStoredBag(childId: ChildId): StoredBagState {
  if (typeof window === 'undefined') {
    return { bag: [1, 2, 3, 4, 5, 6, 7, 8, 9], currentIndex: 0 };
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_BAG_PREFIX}${childId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.bag) && parsed.bag.length === 9 && typeof parsed.currentIndex === 'number') {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse stored bag state:', e);
  }

  // Initialize new bag
  const bag = generateShuffledBag(childId);
  const state: StoredBagState = { bag, currentIndex: 0 };
  saveStoredBag(childId, state);
  return state;
}

function saveStoredBag(childId: ChildId, state: StoredBagState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_BAG_PREFIX}${childId}`, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save bag state:', e);
  }
}

/**
 * Gets the next motivational reward using the 9-item shuffle bag.
 * Advances the pointer and stores the new state in localStorage.
 */
export function getNextMotivationalReward(childId: ChildId): MotivationalRewardItem {
  let state = getStoredBag(childId);

  // If we exceeded the bag length, generate a fresh shuffled cycle
  if (state.currentIndex >= state.bag.length) {
    state.bag = generateShuffledBag(childId, state.lastAudioNumber);
    state.currentIndex = 0;
  }

  const selectedNumber = state.bag[state.currentIndex];
  state.lastAudioNumber = selectedNumber;
  state.currentIndex += 1;

  saveStoredBag(childId, state);

  return getRewardItem(childId, selectedNumber);
}

/**
 * For testing purposes: preview next reward without mutating child's real completion flags.
 */
export function getNextTestReward(childId: ChildId): MotivationalRewardItem {
  return getNextMotivationalReward(childId);
}

/**
 * Checks if the motivational reward was already displayed and closed for this child today.
 */
export function isDayRewardViewed(childId: string, date: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(`${STORAGE_VIEWED_PREFIX}${childId}:${date}`) === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks today's motivational reward as viewed and closed for this child.
 */
export function markDayRewardViewed(childId: string, date: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_VIEWED_PREFIX}${childId}:${date}`, 'true');
  } catch (e) {
    console.error('Failed to mark day reward viewed:', e);
  }
}
