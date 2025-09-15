"use server";

import { db } from "@/database/drizzle";
import { Rooms, RoomHistory } from "@/database/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { Room } from "@/lib/types";

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

    const record = await db.insert(Rooms).values(roomData).returning();

    return { success: true, data: JSON.parse(JSON.stringify(record)) };
  } catch (error) {
    console.log(error);
    return { success: false, error: "Erro ao criar quarto" };
  }
};

// Atualizar quarto
export const updateRoom = async (
  roomData: Partial<Room> & { id: string; company?: string },
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

    // Função auxiliar para formatar a data no padrão YYYY-MM-DD
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    const updated = await db
      .update(Rooms)
      .set({
        ...roomData,
        guest1CheckinDate:
          roomData.status === "Ocupied"
            ? formatDate(new Date())
            : roomData.guest1CheckinDate,
        guest2CheckinDate:
          roomData.status === "Ocupied" && roomData.guest2Name
            ? formatDate(new Date())
            : roomData.guest2CheckinDate,
      })
      .where(eq(Rooms.id, roomData.id))
      .returning();

    // Se está fazendo check-in (mudando para Ocupied), criar registro no histórico
    if (
      roomData.status === "Ocupied" &&
      roomData.guest1Name &&
      currentRoom[0].status !== "Ocupied"
    ) {
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
    }

    return { success: true, data: updated[0] };
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

// Checkout do quarto
export const checkoutRoom = async (roomId: string, userId?: string) => {
  try {
    const currentRoom = await db
      .select()
      .from(Rooms)
      .where(eq(Rooms.id, roomId))
      .limit(1);

    if (!currentRoom[0])
      return { success: false, error: "Quarto não encontrado" };

    if (currentRoom[0].guest1Name) {
      await db
        .update(RoomHistory)
        .set({
          checkoutDate: new Date(),
          updatedBy: userId || null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(RoomHistory.roomId, roomId),
            eq(RoomHistory.guest1Name, currentRoom[0].guest1Name),
            sql`${RoomHistory.checkoutDate} IS NULL`,
          ),
        );
    }

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
        company: null,
      })
      .where(eq(Rooms.id, roomId))
      .returning();

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

// Filtrar quartos
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

// ==================== ROOM HISTORY ====================

// Obter histórico de quartos
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

// Obter histórico por quarto
export const getRoomHistoryByRoomId = async (roomId: string) => {
  try {
    const history = await db
      .select()
      .from(RoomHistory)
      .where(eq(RoomHistory.roomId, roomId))
      .orderBy(desc(RoomHistory.checkinDate));
    return { success: true, data: JSON.parse(JSON.stringify(history)) };
  } catch (error) {
    console.log(error);
    return { success: false, error: "Erro ao buscar histórico do quarto" };
  }
};

// Pesquisar hóspedes (incluindo empresa)
export const searchGuests = async (searchTerm: string) => {
  try {
    const guests = await db
      .select()
      .from(RoomHistory)
      .where(
        sql`LOWER(${RoomHistory.guest1Name}) LIKE LOWER(${"%" + searchTerm + "%"})
        OR LOWER(${RoomHistory.guest2Name}) LIKE LOWER(${"%" + searchTerm + "%"})
        OR LOWER(${RoomHistory.companyName}) LIKE LOWER(${"%" + searchTerm + "%"})
        OR ${RoomHistory.guest1Phone} LIKE ${"%" + searchTerm + "%"}
        OR ${RoomHistory.guest2Phone} LIKE ${"%" + searchTerm + "%"}`,
      )
      .orderBy(desc(RoomHistory.checkinDate))
      .limit(50);

    return { success: true, data: JSON.parse(JSON.stringify(guests)) };
  } catch (error) {
    console.log(error);
    return { success: false, error: "Erro ao pesquisar hóspedes" };
  }
};

// Estatísticas do histórico
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

// Hóspedes atuais (sem checkout)
export const getCurrentGuests = async () => {
  try {
    const currentGuests = await db
      .select()
      .from(RoomHistory)
      .where(sql`${RoomHistory.checkoutDate} IS NULL`)
      .orderBy(desc(RoomHistory.checkinDate));

    return { success: true, data: JSON.parse(JSON.stringify(currentGuests)) };
  } catch (error) {
    console.log(error);
    return { success: false, error: "Erro ao buscar hóspedes atuais" };
  }
};

// Empresas mais frequentes
export const getTopCompanies = async (filters?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}) => {
  try {
    let whereConditions = [sql`${RoomHistory.companyName} IS NOT NULL`];
    if (filters?.startDate)
      whereConditions.push(
        sql`${RoomHistory.checkinDate} >= ${filters.startDate}`,
      );
    if (filters?.endDate)
      whereConditions.push(
        sql`${RoomHistory.checkinDate} <= ${filters.endDate}`,
      );

    const companies = await db
      .select({
        companyName: RoomHistory.companyName,
        count: sql<number>`COUNT(*)`.as("count"),
      })
      .from(RoomHistory)
      .where(and(...whereConditions))
      .groupBy(RoomHistory.companyName)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(filters?.limit || 10);

    return { success: true, data: JSON.parse(JSON.stringify(companies)) };
  } catch (error) {
    console.log(error);
    return { success: false, error: "Erro ao buscar empresas mais frequentes" };
  }
};

// Histórico por empresa
export const getHistoryByCompany = async (companyName: string) => {
  try {
    const history = await db
      .select()
      .from(RoomHistory)
      .where(eq(RoomHistory.companyName, companyName))
      .orderBy(desc(RoomHistory.checkinDate));

    return { success: true, data: JSON.parse(JSON.stringify(history)) };
  } catch (error) {
    console.log(error);
    return { success: false, error: "Erro ao buscar histórico da empresa" };
  }
};
