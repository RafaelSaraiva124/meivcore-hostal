"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFilteredRooms } from "@/lib/actions/rooms";
import { Room } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const getStatusColor = (status: string) => {
  switch (status) {
    case "Free":
      return "bg-green-100 text-green-800 border-green-200";
    case "Ocupied":
      return "bg-red-100 text-red-800 border-red-200";
    case "Dirty":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const RoomListPage = () => {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<Room["status"] | "All">(
    "All",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const filters: {
        status?: Room["status"];
        sortByNumber?: "asc" | "desc";
      } = {
        sortByNumber: sortOrder,
      };
      if (statusFilter !== "All") filters.status = statusFilter;

      const result = await getFilteredRooms(filters);
      if (result.success) setRooms(result.data || []);
      else
        setAlert({
          type: "error",
          message: result.error || "Error al cargar habitaciones",
        });
    } catch {
      setAlert({
        type: "error",
        message: "Error inesperado al cargar habitaciones",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [statusFilter, sortOrder]);

  const handleRoomClick = (roomId: string) => {
    router.push(`/rooms/${roomId}`);
  };

  if (isLoading) return <p>Cargando habitaciones...</p>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Lista de Habitaciones</h1>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <div>
          <label className="mr-2 font-medium">Estado:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border rounded px-2 py-1"
          >
            <option value="All">Todos</option>
            <option value="Free">Libre</option>
            <option value="Ocupied">Ocupada</option>
            <option value="Dirty">Sucia</option>
          </select>
        </div>

        <div>
          <label className="mr-2 font-medium">Ordenar Nº:</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            className="border rounded px-2 py-1"
          >
            <option value="asc">Ascendente</option>
            <option value="desc">Descendente</option>
          </select>
        </div>

        <button
          className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
          onClick={() => {
            setStatusFilter("All");
            setSortOrder("asc");
          }}
        >
          Limpiar filtros
        </button>
      </div>

      {alert && (
        <Alert
          className={`mb-4 ${
            alert.type === "success"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          {alert.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription
            className={
              alert.type === "success" ? "text-green-800" : "text-red-800"
            }
          >
            {alert.message}
          </AlertDescription>
        </Alert>
      )}

      {rooms.length === 0 ? (
        <p>No se encontraron habitaciones.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 p-2 text-left">Nº</th>
                <th className="border border-gray-200 p-2 text-left">Tipo</th>
                <th className="border border-gray-200 p-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr
                  key={room.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleRoomClick(room.id)}
                >
                  <td className="border border-gray-200 p-2">{room.number}</td>
                  <td className="border border-gray-200 p-2 capitalize">
                    {room.type === "single" ? "Individual" : "Doble"}
                  </td>
                  <td className="border border-gray-200 p-2">
                    <Badge className={getStatusColor(room.status)}>
                      {room.status === "Free"
                        ? "Libre"
                        : room.status === "Ocupied"
                          ? "Ocupada"
                          : "Sucia"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RoomListPage;
