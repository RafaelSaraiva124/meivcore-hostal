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

    // Converter strings de data para objetos Date apenas se não forem vazias
    const insertData = {
      ...roomData,
      status: roomData.status || ("Free" as const),
      guest1CheckinDate: roomData.guest1CheckinDate
        ? roomData.guest1CheckinDate // Para date type, usar string diretamente
        : null,
      guest2CheckinDate: roomData.guest2CheckinDate
        ? roomData.guest2CheckinDate
        : null,
    };

    const record = await db.insert(Rooms).values(insertData).returning();

    roomsCache = null;
    return { success: true, data: JSON.parse(JSON.stringify(record[0])) };
  } catch (error) {
    console.error("Erro ao criar quarto:", error);
    return { success: false, error: "Erro ao criar quarto" };
  }
};

export const checkInRoom = async (data: {
  roomId: string;
  guest1Name: string;
  guest1Phone?: string;
  guest1CheckinDate?: string;
  guest2Name?: string;
  guest2Phone?: string;
  guest2CheckinDate?: string;
  company?: string;
  userId?: string;
}) => {
  try {
    const [room] = await db
      .select()
      .from(Rooms)
      .where(eq(Rooms.id, data.roomId))
      .limit(1);

    if (!room) return { success: false, error: "Quarto não encontrado" };

    // Determinar se é check-in do primeiro ou segundo hóspede
    const isFirstGuestCheckIn = !room.guest1Name;
    const isSecondGuestCheckIn =
      room.guest1Name && !room.guest2Name && data.guest2Name;

    // --- Preparar dados para atualização do quarto ---
    let updatePayload: any = {
      status: "Occupied",
      company: data.company ?? room.company,
    };

    // Check-in do primeiro hóspede
    if (isFirstGuestCheckIn) {
      updatePayload.guest1Name = data.guest1Name;
      updatePayload.guest1Phone = data.guest1Phone ?? null;
      updatePayload.guest1CheckinDate =
        data.guest1CheckinDate ?? new Date().toISOString().split("T")[0];
    }

    // Check-in do segundo hóspede (mantém dados do primeiro)
    if (isSecondGuestCheckIn) {
      updatePayload.guest2Name = data.guest2Name;
      updatePayload.guest2Phone = data.guest2Phone ?? null;
      updatePayload.guest2CheckinDate =
        data.guest2CheckinDate ?? new Date().toISOString().split("T")[0];
    }

    // Se ambos os hóspedes foram enviados no mesmo request
    if (data.guest1Name && data.guest2Name && isFirstGuestCheckIn) {
      updatePayload.guest1Name = data.guest1Name;
      updatePayload.guest1Phone = data.guest1Phone ?? null;
      updatePayload.guest1CheckinDate =
        data.guest1CheckinDate ?? new Date().toISOString().split("T")[0];
      updatePayload.guest2Name = data.guest2Name;
      updatePayload.guest2Phone = data.guest2Phone ?? null;
      updatePayload.guest2CheckinDate =
        data.guest2CheckinDate ?? new Date().toISOString().split("T")[0];
    }

    const [updatedRoom] = await db
      .update(Rooms)
      .set(updatePayload)
      .where(eq(Rooms.id, data.roomId))
      .returning();

    // --- Gerenciar histórico ---
    const [existingHistory] = await db
      .select()
      .from(RoomHistory)
      .where(
        and(
          eq(RoomHistory.roomId, data.roomId),
          isNull(RoomHistory.checkoutDate),
        ),
      )
      .limit(1);

    if (!existingHistory) {
      // Criar novo registro no histórico
      await db.insert(RoomHistory).values({
        roomId: data.roomId,
        roomNumber: updatedRoom.number,
        roomType: updatedRoom.type,
        companyName: data.company ?? null,

        guest1Name: data.guest1Name,
        guest1Phone: data.guest1Phone ?? null,
        guest1CheckinDate: updatePayload.guest1CheckinDate,

        guest2Name: data.guest2Name ?? null,
        guest2Phone: data.guest2Phone ?? null,
        guest2CheckinDate: updatePayload.guest2CheckinDate ?? null,

        createdBy: data.userId ?? null,
      });
    } else {
      // Atualizar histórico existente (para adicionar segundo hóspede)
      const historyUpdate: any = {
        updatedBy: data.userId ?? null,
        updatedAt: new Date(),
      };

      // Se é check-in do segundo hóspede, adicionar os dados
      if (isSecondGuestCheckIn && data.guest2Name) {
        historyUpdate.guest2Name = data.guest2Name;
        historyUpdate.guest2Phone = data.guest2Phone ?? null;
        historyUpdate.guest2CheckinDate = updatePayload.guest2CheckinDate;
      }

      // Atualizar empresa se fornecida
      if (data.company) {
        historyUpdate.companyName = data.company;
      }

      await db
        .update(RoomHistory)
        .set(historyUpdate)
        .where(eq(RoomHistory.id, existingHistory.id));
    }

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

    // Remover campos undefined/null desnecessários
    if (updateData.status === null || updateData.status === undefined) {
      delete updateData.status;
    }

    // Tratar datas corretamente para o tipo date
    if (updateData.guest1CheckinDate) {
      updateData.guest1CheckinDate =
        typeof updateData.guest1CheckinDate === "string"
          ? updateData.guest1CheckinDate
          : updateData.guest1CheckinDate.toISOString().split("T")[0];
    }

    if (updateData.guest2CheckinDate) {
      updateData.guest2CheckinDate =
        typeof updateData.guest2CheckinDate === "string"
          ? updateData.guest2CheckinDate
          : updateData.guest2CheckinDate.toISOString().split("T")[0];
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
      .orderBy(sql`CAST(${Rooms.number} AS INTEGER) ASC`); // Alterado para ASC para ordem mais lógica

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

    // Só atualizar histórico se houver hóspedes
    if (currentRoom[0].guest1Name || currentRoom[0].guest2Name) {
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

    roomsCache = null; // Limpar cache
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

    // Filtra por data de check-in (considera ambos os hóspedes)
    if (filters?.startDate) {
      whereConditions.push(
        sql`(${RoomHistory.guest1CheckinDate} >= ${filters.startDate} OR 
            (${RoomHistory.guest2CheckinDate} IS NOT NULL AND ${RoomHistory.guest2CheckinDate} >= ${filters.startDate}))`,
      );
    }

    if (filters?.endDate) {
      whereConditions.push(
        sql`(${RoomHistory.guest1CheckinDate} <= ${filters.endDate} OR 
            (${RoomHistory.guest2CheckinDate} IS NOT NULL AND ${RoomHistory.guest2CheckinDate} <= ${filters.endDate}))`,
      );
    }

    // Busca por nome do hóspede (em ambos os campos)
    if (filters?.guestName) {
      whereConditions.push(
        sql`(LOWER(${RoomHistory.guest1Name}) LIKE LOWER(${"%" + filters.guestName + "%"}) OR 
            (${RoomHistory.guest2Name} IS NOT NULL AND LOWER(${RoomHistory.guest2Name}) LIKE LOWER(${"%" + filters.guestName + "%"})))`,
      );
    }

    if (filters?.companyName) {
      whereConditions.push(
        sql`LOWER(${RoomHistory.companyName}) LIKE LOWER(${"%" + filters.companyName + "%"})`,
      );
    }

    const history = await db
      .select()
      .from(RoomHistory)
      .where(whereConditions.length ? and(...whereConditions) : undefined)
      .orderBy(desc(RoomHistory.guest1CheckinDate))
      .limit(filters?.limit || 100);

    return { success: true, data: JSON.parse(JSON.stringify(history)) };
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    return { success: false, error: "Erro ao buscar histórico" };
  }
};

export const getHistoryStats = async (filters?: {
  startDate?: string;
  endDate?: string;
}) => {
  try {
    let whereConditions: any[] = [];

    if (filters?.startDate) {
      whereConditions.push(
        sql`(${RoomHistory.guest1CheckinDate} >= ${filters.startDate} OR 
            (${RoomHistory.guest2CheckinDate} IS NOT NULL AND ${RoomHistory.guest2CheckinDate} >= ${filters.startDate}))`,
      );
    }

    if (filters?.endDate) {
      whereConditions.push(
        sql`(${RoomHistory.guest1CheckinDate} <= ${filters.endDate} OR 
            (${RoomHistory.guest2CheckinDate} IS NOT NULL AND ${RoomHistory.guest2CheckinDate} <= ${filters.endDate}))`,
      );
    }

    const history = await db
      .select()
      .from(RoomHistory)
      .where(whereConditions.length ? and(...whereConditions) : undefined);

    // Contar hóspedes corretamente
    let totalGuests = 0;
    let completedStays = 0;
    let currentGuests = 0;

    history.forEach((record) => {
      // Contar guest1
      if (record.guest1Name) {
        totalGuests++;
        if (record.checkoutDate) {
          completedStays++;
        } else {
          currentGuests++;
        }
      }

      // Contar guest2 (se existe)
      if (record.guest2Name) {
        totalGuests++;
        if (record.checkoutDate) {
          completedStays++;
        } else {
          currentGuests++;
        }
      }
    });

    const stats = {
      totalBookings: history.length, // Total de reservas (registros no histórico)
      totalGuests, // Total de hóspedes individuais
      completedStays, // Hóspedes que já fizeram checkout
      currentGuests, // Hóspedes atualmente no hotel
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error("Erro ao buscar estatísticas do histórico:", error);
    return {
      success: false,
      error: "Erro ao buscar estatísticas do histórico",
    };
  }
};

// ==================== ROOM STATS ====================

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

// ==================== FILTERED ROOMS ====================

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
          ? sql`CAST(${Rooms.number} AS INTEGER) ASC`
          : sql`CAST(${Rooms.number} AS INTEGER) DESC`,
      );

    return { success: true, data: JSON.parse(JSON.stringify(rooms)) };
  } catch (error) {
    console.error("Erro ao buscar quartos filtrados:", error);
    return { success: false, error: "Erro ao buscar quartos filtrados" };
  }
};

// ==================== FUNÇÕES ADICIONAIS ÚTEIS ====================

// Função para fazer check-in apenas do segundo hóspede
export const checkInSecondGuest = async (data: {
  roomId: string;
  guest2Name: string;
  guest2Phone?: string;
  guest2CheckinDate?: string;
  userId?: string;
}) => {
  try {
    const [room] = await db
      .select()
      .from(Rooms)
      .where(eq(Rooms.id, data.roomId))
      .limit(1);

    if (!room) return { success: false, error: "Quarto não encontrado" };
    if (!room.guest1Name)
      return { success: false, error: "Não há primeiro hóspede no quarto" };
    if (room.guest2Name)
      return {
        success: false,
        error: "Já existe um segundo hóspede no quarto",
      };

    const updatePayload = {
      guest2Name: data.guest2Name,
      guest2Phone: data.guest2Phone ?? null,
      guest2CheckinDate:
        data.guest2CheckinDate ?? new Date().toISOString().split("T")[0],
    };

    const [updatedRoom] = await db
      .update(Rooms)
      .set(updatePayload)
      .where(eq(Rooms.id, data.roomId))
      .returning();

    // Atualizar histórico existente
    await db
      .update(RoomHistory)
      .set({
        guest2Name: data.guest2Name,
        guest2Phone: data.guest2Phone ?? null,
        guest2CheckinDate: updatePayload.guest2CheckinDate,
        updatedBy: data.userId ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(RoomHistory.roomId, data.roomId),
          isNull(RoomHistory.checkoutDate),
        ),
      );

    roomsCache = null;
    return { success: true, data: updatedRoom };
  } catch (error) {
    console.error("Erro ao fazer check-in do segundo hóspede:", error);
    return {
      success: false,
      error: "Erro ao fazer check-in do segundo hóspede",
    };
  }
};
