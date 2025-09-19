"use server";

import { db } from "@/database/drizzle";
import { Rooms, RoomHistory } from "@/database/schema";
import { eq, desc, sql, and, isNull } from "drizzle-orm";
import { Room } from "@/lib/types";

// Cache para dados que não mudam frequentemente
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

    // Invalidar cache
    roomsCache = null;

    return { success: true, data: JSON.parse(JSON.stringify(record[0])) };
  } catch (error) {
    console.error("Erro ao criar quarto:", error);
    return { success: false, error: "Erro ao criar quarto" };
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

    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const updateData: any = { ...roomData };

    // Remover status null/undefined
    if (updateData.status === null || updateData.status === undefined) {
      delete updateData.status;
    }

    if (roomData.status === "Occupied" && !currentRoom[0].guest1CheckinDate) {
      updateData.guest1CheckinDate = formatDate(new Date());
      if (roomData.guest2Name && !currentRoom[0].guest2CheckinDate) {
        updateData.guest2CheckinDate = formatDate(new Date());
      }
    }

    const updated = await db
      .update(Rooms)
      .set(updateData)
      .where(eq(Rooms.id, roomData.id))
      .returning();

    // Invalidar cache
    roomsCache = null;

    // Gerenciar histórico
    if (
      roomData.status === "Occupied" &&
      roomData.guest1Name &&
      currentRoom[0].status !== "Occupied"
    ) {
      // Novo check-in - criar histórico
      await db.insert(RoomHistory).values({
        roomId: roomData.id,
        roomNumber: updated[0].number,
        guest1Name: roomData.guest1Name,
        guest1Phone: roomData.guest1Phone || null,
        guest2Name: roomData.guest2Name || null,
        guest2Phone: roomData.guest2Phone || null,
        companyName: roomData.company || null,
        roomType: updated[0].type,
        createdBy: userId || null,
        checkinDate: new Date(),
      });
    } else if (
      roomData.guest2Name &&
      currentRoom[0].status === "Occupied" &&
      !currentRoom[0].guest2Name
    ) {
      // Adicionar segundo hóspede
      await db
        .update(RoomHistory)
        .set({
          guest2Name: roomData.guest2Name,
          guest2Phone: roomData.guest2Phone || null,
          updatedBy: userId || null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(RoomHistory.roomId, roomData.id),
            isNull(RoomHistory.checkoutDate),
          ),
        );
    }

    return { success: true, data: updated[0] };
  } catch (error) {
    console.error("Erro ao atualizar quarto:", error);
    return { success: false, error: "Erro ao atualizar quarto" };
  }
};

// Obter todos os quartos com cache
export const getRooms = async () => {
  try {
    // Verificar cache
    if (roomsCache && Date.now() - roomsCache.timestamp < CACHE_DURATION) {
      return { success: true, data: roomsCache.data };
    }

    const rooms = await db
      .select()
      .from(Rooms)
      .orderBy(sql`CAST(${Rooms.number} AS INTEGER) DESC`);

    const data = JSON.parse(JSON.stringify(rooms));

    // Atualizar cache
    roomsCache = { data, timestamp: Date.now() };

    return { success: true, data };
  } catch (error) {
    console.error("Erro ao buscar quartos:", error);
    return { success: false, error: "Erro ao buscar quartos" };
  }
};

// Obter estatísticas dos quartos
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

    return {
      success: true,
      data: {
        ...result,
        occupancyRate,
      },
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return { success: false, error: "Erro ao buscar estatísticas" };
  }
};

// Atualizar status do quarto
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

    // Invalidar cache
    roomsCache = null;

    return { success: true, data: JSON.parse(JSON.stringify(updatedRoom)) };
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    return { success: false, error: "Erro ao atualizar status" };
  }
};

// Fazer checkout
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

    // Invalidar cache
    roomsCache = null;

    return { success: true, data: JSON.parse(JSON.stringify(updatedRoom)) };
  } catch (error) {
    console.error("Erro ao fazer checkout:", error);
    return { success: false, error: "Erro ao fazer checkout" };
  }
};
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
  status?: Room["status"] | null; // Allow null in the parameter
  sortByNumber?: "asc" | "desc";
}) => {
  try {
    // Only apply status filter if it's a valid non-null status
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
    console.log(error);
    return { success: false, error: "Erro ao buscar quartos filtrados" };
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
