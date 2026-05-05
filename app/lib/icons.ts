export const COLOR_ICONS = [
  '🎮', '🎬', '🧱', '🎪', '🎨', '🚀', '🏰', '🌈',
  '🦁', '🐉', '🦅', '🐺', '🦊', '🐬', '🦋', '🐝',
  '⚽', '🏀', '🎾', '🏆', '🥇', '🥊', '🚴', '🏋️',
  '🎸', '🎹', '🎺', '📚', '🔬', '🌍', '🧩', '🎭',
  '🛹', '🧗', '🤿', '🏄', '🎿', '🪂', '🧘', '🤸',
  '🍕', '🍦', '🍩', '🍪', '🧁', '🍉', '🍇', '🥝',
  '🎁', '💎', '⭐', '🌟', '🔥', '💪', '❤️', '👑',
  '🏕️', '🗺️', '🧭', '🔭', '🔮', '💡', '🕹️', '🎯',
];

export const MINIMAL_ICONS = [
  'star', 'heart', 'trophy', 'crown', 'diamond', 'medal', 'target', 'zap',
  'sun', 'moon', 'flame', 'leaf', 'mountain', 'compass', 'anchor', 'rocket',
  'bolt', 'shield', 'sword', 'helm', 'paw', 'feather', 'shell', 'snowflake',
  'music', 'pencil', 'book', 'lightbulb', 'key', 'lock', 'gift', 'gem',
  'globe', 'plane', 'car', 'bike', 'ship', 'train', 'bell', 'clock',
  'cloud', 'drop', 'wind', 'wave', 'tree', 'flower', 'star-half', 'infinity',
];

export function getIconDisplay(icon: string, iconStyle: 'color' | 'minimal'): string {
  if (iconStyle === 'color') return icon;
  const minimalDisplay: Record<string, string> = {
    'star': '★', 'heart': '♥', 'trophy': '🏆', 'crown': '♛', 'diamond': '◆',
    'medal': '🎖', 'target': '◎', 'zap': '⚡', 'sun': '☀', 'moon': '☽',
    'flame': '🔥', 'leaf': '☘', 'mountain': '⛰', 'compass': '🧭', 'anchor': '⚓',
    'rocket': '🚀', 'bolt': '⚡', 'shield': '🛡', 'sword': '⚔', 'helm': '⛑',
    'paw': '🐾', 'feather': '🪶', 'shell': '🐚', 'snowflake': '❄', 'music': '♪',
    'pencil': '✎', 'book': '📖', 'lightbulb': '💡', 'key': '🔑', 'lock': '🔒',
    'gift': '🎁', 'gem': '💎', 'globe': '🌍', 'plane': '✈', 'car': '🚗',
    'bike': '🚲', 'ship': '🚢', 'train': '🚂', 'bell': '🔔', 'clock': '⏰',
    'cloud': '☁', 'drop': '💧', 'wind': '🌬', 'wave': '🌊', 'tree': '🌳',
    'flower': '🌸', 'star-half': '★', 'infinity': '∞',
  };
  return minimalDisplay[icon] || '★';
}
