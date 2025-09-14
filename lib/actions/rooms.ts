"use server";

import { db } from "@/database/drizzle";
import { Rooms } from "@/database/schema";
import { eq, desc, sql } from "drizzle-orm";
import { Room } from "@/lib/types"; //

// Criar novo quarto
export const createRoom = async (roomData: {
  number: string;
  type: Room["type"];
  status: Room["status"];
  guest1Name?: string;
  guest1Phone?: string;
  guest1CheckinDate?: string;
  guest2Name?: string;
  guest2Phone?: string;
  guest2CheckinDate?: string;
}) => {
  try {
    const existingRoom = await db
      .select()
      .from(Rooms)
      .where(eq(Rooms.number, roomData.number))
      .limit(1);

    if (existingRoom.length > 0) {
      return { success: false, error: "Já existe um quarto com esse número" };
    }

    const record = await db.insert(Rooms).values(roomData).returning();

    return { success: true, data: JSON.parse(JSON.stringify(record)) };
  } catch (error) {
    console.log(error);
    return { success: false, error: "Erro ao criar quarto" };
  }
};

// Atualizar quarto
export const updateRoom = async (roomData: Partial<Room> & { id: string }) => {
  try {
    const updated = await db
      .update(Rooms)
      .set(roomData)
      .where(eq(Rooms.id, roomData.id))
      .returning();

    return {
      success: true,
      data: updated[0],
    };
  } catch (error) {
    console.log(error);
    return { success: false, error: "Erro ao atualizar quarto" };
  }
};

// Obter todos os quartos
export const getRooms = async () => {
  try {
    const rooms = await db.select().from(Rooms).orderBy(desc(Rooms.number));
    return { success: true, data: JSON.parse(JSON.stringify(rooms)) };
  } catch (error) {
    console.log(error);
    return { success: false, error: "Erro ao buscar quartos" };
  }
};

// Obter estatísticas dos quartos
export const getRoomStats = async () => {
  try {
    const rooms = await db.select().from(Rooms);
    const stats = {
      total: rooms.length,
      free: rooms.filter((r) => r.status === "Free").length,
      occupied: rooms.filter((r) => r.status === "Ocupied").length,
      dirty: rooms.filter((r) => r.status === "Dirty").length,
      occupancyRate:
        rooms.length > 0
          ? Math.round(
              (rooms.filter((r) => r.status === "Ocupied").length /
                rooms.length) *
                100,
            )
          : 0,
    };
    return { success: true, data: stats };
  } catch (error) {
    console.log(error);
    return { success: false, error: "Erro ao buscar estatísticas" };
  }
};

// Atualizar status do quarto
export const updateRoomStatus = async (
  roomId: string,
  status: Room["status"],
) => {
  try {
    const [updatedRoom] = await db
      .update(Rooms)
      .set({ status })
      .where(eq(Rooms.id, roomId))
      .returning();

    if (!updatedRoom) return { success: false, error: "Quarto não encontrado" };

    return { success: true, data: JSON.parse(JSON.stringify(updatedRoom)) };
  } catch (error) {
    console.log(error);
    return { success: false, error: "Erro ao atualizar status" };
  }
};

// Checkout - limpar hóspedes e marcar como sujo
export const checkoutRoom = async (roomId: string) => {
  try {
    const [updatedRoom] = await db
      .update(Rooms)
      .set({
        status: "Dirty",
        guest1Name: null,
        guest1Phone: null,
        guest1CheckinDate: null,
        guest2Name: null,
        guest2Phone: null,
        guest2CheckinDate: null,
      })
      .where(eq(Rooms.id, roomId))
      .returning();

    if (!updatedRoom) return { success: false, error: "Quarto não encontrado" };

    return { success: true, data: JSON.parse(JSON.stringify(updatedRoom)) };
  } catch (error) {
    console.log(error);
    return { success: false, error: "Erro ao fazer checkout" };
  }
};

// Deletar quarto
export const deleteRoom = async (roomId: string) => {
  try {
    const [deletedRoom] = await db
      .delete(Rooms)
      .where(eq(Rooms.id, roomId))
      .returning();

    if (!deletedRoom) return { success: false, error: "Quarto não encontrado" };

    return { success: true, data: JSON.parse(JSON.stringify(deletedRoom)) };
  } catch (error) {
    console.log(error);
    return { success: false, error: "Erro ao deletar quarto" };
  }
};

// Obter quarto por ID
export const getRoomById = async (roomId: string) => {
  try {
    const result = await db
      .select()
      .from(Rooms)
      .where(eq(Rooms.id, roomId))
      .limit(1);

    if (!result.length)
      return { success: false, error: "Quarto não encontrado" };

    return { success: true, data: result[0] as Room };
  } catch (error) {
    return { success: false, error: "Erro ao buscar quarto" };
  }
};

export const getFilteredRooms = async (filters?: {
  status?: Room["status"];
  sortByNumber?: "asc" | "desc";
}) => {
  try {
    const rooms = await db
      .select()
      .from(Rooms)
      .where(filters?.status ? eq(Rooms.status, filters.status) : undefined)
      .orderBy(
        filters?.sortByNumber === "asc"
          ? sql`${Rooms.number} ASC`
          : desc(Rooms.number),
      );

    return { success: true, data: JSON.parse(JSON.stringify(rooms)) };
  } catch (error) {
    console.log(error);
    return { success: false, error: "Erro ao buscar quartos filtrados" };
  }
};
