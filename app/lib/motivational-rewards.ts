// Unified configuration, mapping, and shuffle-bag randomization for Motivational Rewards

export type ChildId = 'ali' | 'said';

export interface MotivationalRewardItem {
  childId: ChildId;
  audioNumber: number;
  audioSrc: string;
  videoSrc: string;
  theme: string;
  title: string;
  personalTrackSrc: string;
  childName: string;
}

export const CHILD_PERSONAL_TRACKS: Record<ChildId, { trackSrc: string; name: string }> = {
  ali: {
    trackSrc: '/audio/rewards/tracks/ali_theme.mp3',
    name: 'Али',
  },
  said: {
    trackSrc: '/audio/rewards/tracks/said_theme.mp3',
    name: 'Саид',
  },
};

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

export const MOTIVATIONAL_VIDEO_MAP: Record<ChildId, Record<number, { videoSrc: string; theme: string; title: string; group: string }>> = {
  ali: {
    1: { videoSrc: '/videos/rewards/ali_football_loop.webm', theme: 'Футбол / Командный дух', title: 'Движение вперёд!', group: 'football' },
    2: { videoSrc: '/videos/rewards/ali_boxing_loop.webm', theme: 'Бокс / Характер', title: 'Сила духа!', group: 'boxing' },
    3: { videoSrc: '/videos/rewards/ali_football_loop.webm', theme: 'Футбол / Мастерство', title: 'Точный удар!', group: 'football' },
    4: { videoSrc: '/videos/rewards/ali_chess_loop.webm', theme: 'Шахматы / Стратегия', title: 'Мудрый ход!', group: 'chess' },
    5: { videoSrc: '/videos/rewards/ali_boxing_loop.webm', theme: 'Бокс / Упорство', title: 'Ни шагу назад!', group: 'boxing' },
    6: { videoSrc: '/videos/rewards/ali_boxing_loop.webm', theme: 'Бокс / Чемпион', title: 'Путь чемпиона!', group: 'boxing' },
    7: { videoSrc: '/videos/rewards/ali_chess_loop.webm', theme: 'Шахматы / Тактика', title: 'Победная тактика!', group: 'chess' },
    8: { videoSrc: '/videos/rewards/ali_football_loop.webm', theme: 'Футбол / Скорость', title: 'Красивая игра!', group: 'football' },
    9: { videoSrc: '/videos/rewards/ali_chess_loop.webm', theme: 'Шахматы / Гроссмейстер', title: 'Великий замысел!', group: 'chess' },
  },
  said: {
    1: { videoSrc: '/videos/rewards/said_stage_loop.webm', theme: 'Сцена / Вдохновение', title: 'Яркое выступление!', group: 'stage' },
    2: { videoSrc: '/videos/rewards/said_superhero_loop.webm', theme: 'Супергерой / Сила', title: 'Супергерой дня!', group: 'superhero' },
    3: { videoSrc: '/videos/rewards/said_football_loop.webm', theme: 'Футбол / Ловкость', title: 'Молниеносный гол!', group: 'football' },
    4: { videoSrc: '/videos/rewards/said_football_loop.webm', theme: 'Футбол / Энергия', title: 'Настоящий драйв!', group: 'football' },
    5: { videoSrc: '/videos/rewards/said_superhero_loop.webm', theme: 'Супергерой / Защитник', title: 'Геройская сила!', group: 'superhero' },
    6: { videoSrc: '/videos/rewards/said_stage_loop.webm', theme: 'Сцена / Творчество', title: 'Аплодисменты!', group: 'stage' },
    7: { videoSrc: '/videos/rewards/said_stage_loop.webm', theme: 'Сцена / Звезда', title: 'Звезда сцены!', group: 'stage' },
    8: { videoSrc: '/videos/rewards/said_superhero_loop.webm', theme: 'Супергерой / Полёт', title: 'Полёт к победе!', group: 'superhero' },
    9: { videoSrc: '/videos/rewards/said_football_loop.webm', theme: 'Футбол / Чемпион', title: 'Футбольный триумф!', group: 'football' },
  },
};

export const CHILD_VIDEO_GROUPS: Record<ChildId, Record<string, number[]>> = {
  ali: {
    football: [1, 3, 8],
    boxing: [2, 5, 6],
    chess: [4, 7, 9],
  },
  said: {
    stage: [1, 6, 7],
    superhero: [2, 5, 8],
    football: [3, 4, 9],
  },
};

export function getRewardItem(childId: ChildId, audioNumber: number): MotivationalRewardItem {
  const num = Math.min(Math.max(audioNumber, 1), 9);
  const info = MOTIVATIONAL_VIDEO_MAP[childId][num] || {
    videoSrc: childId === 'ali' ? '/videos/rewards/ali_football_loop.webm' : '/videos/rewards/said_superhero_loop.webm',
    theme: 'Герой дня',
    title: 'Отличная работа!',
    group: 'football',
  };

  const trackInfo = CHILD_PERSONAL_TRACKS[childId] || CHILD_PERSONAL_TRACKS.ali;

  return {
    childId,
    audioNumber: num,
    audioSrc: `/audio/rewards/${childId}/${num}.mp3`,
    videoSrc: info.videoSrc,
    theme: info.theme,
    title: info.title,
    personalTrackSrc: trackInfo.trackSrc,
    childName: trackInfo.name,
  };
}

// Fisher-Yates shuffle helper
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generates an interleaved 9-item shuffled bag such that:
 * 1. Each of the 3 video categories appears once per 3-day round.
 * 2. NO adjacent days have the same video category (strictly 0 consecutive video repeats).
 * 3. The first item in the bag has a different video category from lastAudioNumber (no repeats across cycle boundaries).
 * 4. All 9 audios are played exactly once per 9-day cycle.
 */
function generateInterleavedBag(childId: ChildId, lastAudioNumber?: number): number[] {
  const groupsConfig = CHILD_VIDEO_GROUPS[childId];
  const groupKeys = Object.keys(groupsConfig); // 3 groups

  // Shuffle the 3 audios inside each group
  const pool: Record<string, number[]> = {};
  for (const g of groupKeys) {
    pool[g] = shuffleArray(groupsConfig[g]);
  }

  let currentLastGroup: string | null = null;
  if (lastAudioNumber && MOTIVATIONAL_VIDEO_MAP[childId][lastAudioNumber]) {
    currentLastGroup = MOTIVATIONAL_VIDEO_MAP[childId][lastAudioNumber].group;
  }

  // All 6 permutations of the 3 groups
  const allPermutations: string[][] = [
    [groupKeys[0], groupKeys[1], groupKeys[2]],
    [groupKeys[0], groupKeys[2], groupKeys[1]],
    [groupKeys[1], groupKeys[0], groupKeys[2]],
    [groupKeys[1], groupKeys[2], groupKeys[0]],
    [groupKeys[2], groupKeys[0], groupKeys[1]],
    [groupKeys[2], groupKeys[1], groupKeys[0]],
  ];

  const bag: number[] = [];

  for (let round = 0; round < 3; round++) {
    // Filter permutations where the first group is different from currentLastGroup
    const validPerms = allPermutations.filter(
      (p) => currentLastGroup === null || p[0] !== currentLastGroup
    );
    const chosenPerm = validPerms[Math.floor(Math.random() * validPerms.length)];

    for (const g of chosenPerm) {
      const audioNum = pool[g].pop()!;
      bag.push(audioNum);
    }
    currentLastGroup = chosenPerm[chosenPerm.length - 1];
  }

  return bag;
}

interface StoredBagState {
  bag: number[];
  currentIndex: number;
  lastAudioNumber?: number;
}

const STORAGE_BAG_PREFIX = 'aq:motivational-bag:';
const STORAGE_VIEWED_PREFIX = 'aq:motivational-viewed:';

function hasConsecutiveVideoDuplicates(childId: ChildId, bag: number[]): boolean {
  for (let i = 1; i < bag.length; i++) {
    const prevGroup = MOTIVATIONAL_VIDEO_MAP[childId][bag[i - 1]]?.group;
    const curGroup = MOTIVATIONAL_VIDEO_MAP[childId][bag[i]]?.group;
    if (prevGroup && curGroup && prevGroup === curGroup) {
      return true;
    }
  }
  return false;
}

function getStoredBag(childId: ChildId): StoredBagState {
  if (typeof window === 'undefined') {
    return { bag: generateInterleavedBag(childId), currentIndex: 0 };
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_BAG_PREFIX}${childId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed.bag) &&
        parsed.bag.length === 9 &&
        typeof parsed.currentIndex === 'number' &&
        !hasConsecutiveVideoDuplicates(childId, parsed.bag)
      ) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse stored bag state:', e);
  }

  // Initialize new interleaved bag
  const bag = generateInterleavedBag(childId);
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
 * Gets the next motivational reward using the 9-item interleaved shuffle bag.
 * Advances the pointer and stores the new state in localStorage.
 */
export function getNextMotivationalReward(childId: ChildId): MotivationalRewardItem {
  let state = getStoredBag(childId);

  // If we exceeded the bag length, generate a fresh interleaved cycle
  if (state.currentIndex >= state.bag.length) {
    state.bag = generateInterleavedBag(childId, state.lastAudioNumber);
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
