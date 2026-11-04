export interface EmojiGroup {
  id: string;
  label: string;
  icon: string;
  emojis: string[];
}

/** One-tap reactions shown above the input, like Messenger's quick reactions. */
export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export const EMOJI_GROUPS: EmojiGroup[] = [
  {
    id: "faces",
    label: "Faces",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😉", "😊", "😇",
      "🥰", "😍", "🤩", "😘", "😋", "😛", "😜", "🤪", "🤔", "🤨", "😐", "😑",
      "😏", "😒", "🙄", "😬", "😮", "😯", "😲", "😳", "🥺", "😢", "😭", "😤",
      "😠", "😡", "🤯", "😱", "😨", "😰", "🥵", "🥶", "😴", "🤤", "😎", "🤓"
    ]
  },
  {
    id: "gestures",
    label: "Gestures",
    icon: "👍",
    emojis: [
      "👍", "👎", "👏", "🙌", "🤝", "🙏", "💪", "👌", "✌️", "🤞", "🤟", "🤘",
      "👋", "🤚", "✋", "🫡", "🫶", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤",
      "💔", "💯", "💥", "✨", "⭐", "🌟", "💫", "🎉"
    ]
  },
  {
    id: "game",
    label: "Game",
    icon: "⚔️",
    emojis: [
      "⚔️", "🛡️", "🏹", "🗡️", "🔥", "⚡", "❄️", "🌪️", "☠️", "💀", "👑", "🏆",
      "🥇", "🎯", "🎲", "🃏", "🧙", "🐉", "🦅", "🐺", "🍀", "⏳", "⌛", "🚩"
    ]
  }
];

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*)+$/u;

/** True when the text is only 1 to 3 emoji, so the bubble can show them large. */
export function isEmojiOnly(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  if (!compact || !EMOJI_ONLY.test(compact)) return false;
  return Array.from(compact.matchAll(/\p{Extended_Pictographic}/gu)).length <= 3;
}
