"use server";

import { db } from "@/database/drizzle";
import { Rooms, RoomHistory } from "@/database/schema";
import { eq, desc, sql, and, isNull } from "drizzle-orm";
import { Room } from "@/lib/types";

let roomsCache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 5000; // 5 segundos

// ==================== ROOMS ====================

// Criar novo quarto
export const createRoom = async (roomData: {
  number: string;
  type: Room["type"];
  status?: Room["status"];
  guest1Name?: string;
  guest1Phone?: string;
  guest1CheckinDate?: string;
  guest2Name?: string;
  guest2Phone?: string;
  guest2CheckinDate?: string;
  company?: string;
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

    const insertData = {
      ...roomData,
      status: roomData.status || ("Free" as const),
    };

    const record = await db.insert(Rooms).values(insertData).returning();

    roomsCache = null;
    return { success: true, data: JSON.parse(JSON.stringify(record[0])) };
  } catch (error) {
    console.error("Erro ao criar quarto:", error);
    return { success: false, error: "Erro ao criar quarto" };
  }
};

// ✅ Fazer Check-in
export const checkInRoom = async (data: {
  roomId: string;
  guest1Name: string;
  guest1Phone?: string;
  guest2Name?: string;
  guest2Phone?: string;
  company?: string;
  checkinDate?: string;
  userId?: string;
}) => {
  try {
    const [room] = await db
      .select()
      .from(Rooms)
      .where(eq(Rooms.id, data.roomId))
      .limit(1);
    if (!room) return { success: false, error: "Quarto não encontrado" };

    const [updatedRoom] = await db
      .update(Rooms)
      .set({
        status: "Occupied",
        guest1Name: data.guest1Name,
        guest1Phone: data.guest1Phone || null,
        guest2Name: data.guest2Name || null,
        guest2Phone: data.guest2Phone || null,
        company: data.company || null,
      })
      .where(eq(Rooms.id, data.roomId))
      .returning();

    await db.insert(RoomHistory).values({
      roomId: data.roomId,
      roomNumber: updatedRoom.number,
      guest1Name: data.guest1Name,
      guest1Phone: data.guest1Phone || null,
      guest2Name: data.guest2Name || null,
      guest2Phone: data.guest2Phone || null,
      companyName: data.company || null,
      roomType: updatedRoom.type,
      createdBy: data.userId || null,
      checkinDate: data.checkinDate ? new Date(data.checkinDate) : new Date(),
    });

    roomsCache = null;
    return { success: true, data: updatedRoom };
  } catch (e) {
    console.error("Erro ao fazer check-in:", e);
    return { success: false, error: "Erro ao fazer check-in" };
  }
};

// Atualizar quarto
export const updateRoom = async (
  roomData: Partial<Room> & { id: string },
  userId?: string,
) => {
  try {
    const currentRoom = await db
      .select()
      .from(Rooms)
      .where(eq(Rooms.id, roomData.id))
      .limit(1);

    if (!currentRoom[0]) {
      return { success: false, error: "Quarto não encontrado" };
    }

    const updateData: any = { ...roomData };
    if (updateData.status === null || updateData.status === undefined) {
      delete updateData.status;
    }

    const updated = await db
      .update(Rooms)
      .set(updateData)
      .where(eq(Rooms.id, roomData.id))
      .returning();

    roomsCache = null;
    return { success: true, data: updated[0] };
  } catch (error) {
    console.error("Erro ao atualizar quarto:", error);
    return { success: false, error: "Erro ao atualizar quarto" };
  }
};

// Obter todos os quartos
export const getRooms = async () => {
  try {
    if (roomsCache && Date.now() - roomsCache.timestamp < CACHE_DURATION) {
      return { success: true, data: roomsCache.data };
    }

    const rooms = await db
      .select()
      .from(Rooms)
      .orderBy(sql`CAST(${Rooms.number} AS INTEGER) DESC`);

    const data = JSON.parse(JSON.stringify(rooms));
    roomsCache = { data, timestamp: Date.now() };

    return { success: true, data };
  } catch (error) {
    console.error("Erro ao buscar quartos:", error);
    return { success: false, error: "Erro ao buscar quartos" };
  }
};

// Atualizar status
export const updateRoomStatus = async (
  roomId: string,
  status: Room["status"],
) => {
  try {
    const validStatuses = ["Free", "Occupied", "Dirty"] as const;
    if (!validStatuses.includes(status as any)) {
      return { success: false, error: "Status inválido" };
    }

    const [updatedRoom] = await db
      .update(Rooms)
      .set({ status })
      .where(eq(Rooms.id, roomId))
      .returning();

    if (!updatedRoom) {
      return { success: false, error: "Quarto não encontrado" };
    }

    roomsCache = null;
    return { success: true, data: JSON.parse(JSON.stringify(updatedRoom)) };
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    return { success: false, error: "Erro ao atualizar status" };
  }
};

// Checkout
export const checkoutRoom = async (roomId: string, userId?: string) => {
  try {
    const currentRoom = await db
      .select()
      .from(Rooms)
      .where(eq(Rooms.id, roomId))
      .limit(1);

    if (!currentRoom[0]) {
      return { success: false, error: "Quarto não encontrado" };
    }

    if (currentRoom[0].guest1Name) {
      await db
        .update(RoomHistory)
        .set({
          checkoutDate: new Date(),
          updatedBy: userId || null,
          updatedAt: new Date(),
        })
        .where(
          and(eq(RoomHistory.roomId, roomId), isNull(RoomHistory.checkoutDate)),
        );
    }

    const [updatedRoom] = await db
      .update(Rooms)
      .set({
        status: "Dirty" as const,
        guest1Name: null,
        guest1Phone: null,
        guest1CheckinDate: null,
        guest2Name: null,
        guest2Phone: null,
        guest2CheckinDate: null,
        company: null,
      })
      .where(eq(Rooms.id, roomId))
      .returning();

    roomsCache = null;
    return { success: true, data: JSON.parse(JSON.stringify(updatedRoom)) };
  } catch (error) {
    console.error("Erro ao fazer checkout:", error);
    return { success: false, error: "Erro ao fazer checkout" };
  }
};

// Delete room
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

// ==================== ROOM HISTORY ====================

export const getRoomHistory = async (filters?: {
  roomId?: string;
  startDate?: string;
  endDate?: string;
  guestName?: string;
  companyName?: string;
  limit?: number;
}) => {
  try {
    let whereConditions: any[] = [];

    if (filters?.roomId)
      whereConditions.push(eq(RoomHistory.roomId, filters.roomId));
    if (filters?.startDate)
      whereConditions.push(
        sql`${RoomHistory.checkinDate} >= ${filters.startDate}`,
      );
    if (filters?.endDate)
      whereConditions.push(
        sql`${RoomHistory.checkinDate} <= ${filters.endDate}`,
      );
    if (filters?.guestName)
      whereConditions.push(
        sql`LOWER(${RoomHistory.guest1Name}) LIKE LOWER(${"%" + filters.guestName + "%"})`,
      );
    if (filters?.companyName)
      whereConditions.push(
        sql`LOWER(${RoomHistory.companyName}) LIKE LOWER(${"%" + filters.companyName + "%"})`,
      );

    const history = await db
      .select()
      .from(RoomHistory)
      .where(whereConditions.length ? and(...whereConditions) : undefined)
      .orderBy(desc(RoomHistory.checkinDate))
      .limit(filters?.limit || 100);

    return { success: true, data: JSON.parse(JSON.stringify(history)) };
  } catch (error) {
    console.log(error);
    return { success: false, error: "Erro ao buscar histórico" };
  }
};

export const getHistoryStats = async (filters?: {
  startDate?: string;
  endDate?: string;
}) => {
  try {
    let whereConditions: any[] = [];
    if (filters?.startDate)
      whereConditions.push(
        sql`${RoomHistory.checkinDate} >= ${filters.startDate}`,
      );
    if (filters?.endDate)
      whereConditions.push(
        sql`${RoomHistory.checkinDate} <= ${filters.endDate}`,
      );

    const history = await db
      .select()
      .from(RoomHistory)
      .where(whereConditions.length ? and(...whereConditions) : undefined);

    const stats = {
      totalBookings: history.length,
      completedStays: history.filter((h) => h.checkoutDate !== null).length,
      currentGuests: history.filter((h) => h.checkoutDate === null).length,
    };

    return { success: true, data: stats };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: "Erro ao buscar estatísticas do histórico",
    };
  }
};

export const getRoomStats = async () => {
  try {
    const stats = await db
      .select({
        total: sql<number>`COUNT(*)`,
        free: sql<number>`COUNT(*) FILTER (WHERE status = 'Free')`,
        occupied: sql<number>`COUNT(*) FILTER (WHERE status = 'Occupied')`,
        dirty: sql<number>`COUNT(*) FILTER (WHERE status = 'Dirty')`,
      })
      .from(Rooms);

    const result = stats[0];
    const occupancyRate =
      result.total > 0 ? Math.round((result.occupied / result.total) * 100) : 0;

    return { success: true, data: { ...result, occupancyRate } };
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return { success: false, error: "Erro ao buscar estatísticas" };
  }
};

export const getFilteredRooms = async (filters?: {
  status?: Room["status"] | null;
  sortByNumber?: "asc" | "desc";
}) => {
  try {
    const statusCondition =
      filters?.status && filters.status !== null
        ? eq(Rooms.status, filters.status)
        : undefined;

    const rooms = await db
      .select()
      .from(Rooms)
      .where(statusCondition)
      .orderBy(
        filters?.sortByNumber === "asc"
          ? sql`${Rooms.number} ASC`
          : desc(Rooms.number),
      );

    return { success: true, data: JSON.parse(JSON.stringify(rooms)) };
  } catch (error) {
    console.error("Erro ao buscar quartos filtrados:", error);
    return { success: false, error: "Erro ao buscar quartos filtrados" };
  }
};
