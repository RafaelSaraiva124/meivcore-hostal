"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getRoomById, updateRoomStatus } from "@/lib/actions/rooms";
import { Room, RoomStatus } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AlertState {
  type: "success" | "error";
  message: string;
}

export default function WorkerRoomPage() {
  const { roomid } = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<AlertState | null>(null);

  const showAlert = useCallback(
    (type: "success" | "error", message: string) => {
      setAlert({ type, message });
      setTimeout(() => setAlert(null), 5000);
    },
    [],
  );

  const normalizeRoomStatus = (status?: string | null): RoomStatus => {
    if (!status) return "Free";
    const valid: RoomStatus[] = ["Free", "Occupied", "Dirty"];
    return valid.includes(status as RoomStatus)
      ? (status as RoomStatus)
      : "Free";
  };

  useEffect(() => {
    const fetchRoom = async () => {
      const roomId = Array.isArray(roomid) ? roomid[0] : roomid;
      if (!roomId) {
        setIsLoading(false);
        showAlert("error", "ID de la habitación no proporcionado");
        return;
      }
      try {
        const result = await getRoomById(roomId);
        if (result.success && result.data) {
          setRoom({
            ...result.data,
            status: normalizeRoomStatus(result.data.status),
          });
        } else {
          showAlert("error", result.error || "Habitación no encontrada");
        }
      } catch (e) {
        console.error(e);
        showAlert("error", "Error al cargar los datos de la habitación");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoom();
  }, [roomid, showAlert]);

  const handleMarkClean = async () => {
    if (!room) return showAlert("error", "Datos de la habitación no cargados");
    setIsSubmitting(true);
    try {
      const result = await updateRoomStatus(room.id, "Free");
      if (result.success && result.data) {
        setRoom({
          ...result.data,
          status: normalizeRoomStatus(result.data.status),
        });
        showAlert("success", "¡Habitación marcada como limpia!");
      } else showAlert("error", result.error || "Error al actualizar estado");
    } catch (e) {
      console.error(e);
      showAlert("error", "Error inesperado al actualizar estado");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Cargando...</span>
      </div>
    );
  }

  if (!room)
    return (
      <div className="text-center text-red-600">Habitación no encontrada</div>
    );

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6 bg-white shadow-md rounded-lg">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold mb-2">Habitación {room.number}</h1>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-gray-600">
            Tipo:{" "}
            <span className="font-medium text-gray-800 uppercase">
              {room.type}
            </span>
          </span>
          <span className="text-gray-600">
            Estado:{" "}
            <span
              className={`ml-1 font-semibold px-2 py-1 rounded text-sm ${
                room.status === "Free"
                  ? "bg-green-100 text-green-700"
                  : room.status === "Occupied"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {room.status === "Free"
                ? "Libre"
                : room.status === "Occupied"
                  ? "Ocupada"
                  : "Sucio"}
            </span>
          </span>
        </div>
      </div>

      {alert && (
        <Alert
          className={`flex items-center gap-2 p-3 rounded border-l-4 ${
            alert.type === "success"
              ? "border-green-500 bg-green-50"
              : "border-red-500 bg-red-50"
          }`}
        >
          {alert.type === "success" ? (
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
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

      {/* Botão de Marcar como limpa */}
      {room.status === "Dirty" && (
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-1">
              🧹 Habitación necesita limpieza
            </h3>
            <p className="text-sm text-yellow-700">
              Esta habitación ha sido utilizada y necesita ser limpiada antes de
              la próxima ocupación.
            </p>
          </div>

          <Button
            className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50"
            onClick={handleMarkClean}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Actualizando estado...
              </div>
            ) : (
              "✅ Marcar como limpia"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
