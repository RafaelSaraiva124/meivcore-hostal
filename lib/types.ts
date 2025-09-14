// lib/types.ts

export type RoomStatus = "Dirty" | "Free" | "Ocupied";
export type RoomType = "single" | "double";

export interface Room {
  id: string;
  number: string;
  type: RoomType;
  status: RoomStatus;
  guest1Name?: string | null;
  guest1Phone?: string | null;
  guest1CheckinDate?: string | null;
  guest2Name?: string | null;
  guest2Phone?: string | null;
  guest2CheckinDate?: string | null;
}
