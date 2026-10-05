export const SCENES = {
  Boot: 'Boot',
  Title: 'Title',
  ChapterCard: 'ChapterCard',
  Room: 'Room',
  Phone: 'Phone',
  Finale: 'Finale',
  Credits: 'Credits',
  Pause: 'Pause',
} as const;

export type SceneKey = (typeof SCENES)[keyof typeof SCENES];

/** Data passed to each scene's init(). */
export interface ChapterCardData {
  chapter: number; // 1..4
}
export interface RoomData {
  roomId: string;
}
export interface PhoneData {
  index: number; // 0..2, PHONE.messages[index]
}
