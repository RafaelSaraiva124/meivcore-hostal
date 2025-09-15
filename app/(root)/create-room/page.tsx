"use client";

import React, { useState, useEffect } from "react";
import { createRoom, deleteRoom, getRooms } from "@/lib/actions/rooms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle } from "lucide-react";

type RoomType = "single" | "double";

interface Room {
  id: string;
  number: string;
  type: RoomType;
}

const Page = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [formData, setFormData] = useState({
    number: "",
    type: "single" as RoomType,
  });
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadRooms = async () => {
    try {
      const result = await getRooms();
      if (result.success) setRooms(result.data || []);
    } catch {
      setAlert({ type: "error", message: "Error al cargar habitaciones" });
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.number.trim()) {
      setAlert({
        type: "error",
        message: "El número de la habitación es obligatorio",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await createRoom({
        number: formData.number.trim(),
        type: formData.type,
        status: "Free",
      });
      if (result.success) {
        setAlert({ type: "success", message: "¡Habitación creada con éxito!" });
        setFormData({ number: "", type: "single" });
        await loadRooms();
      } else {
        setAlert({
          type: "error",
          message: result.error || "Error inesperado",
        });
      }
    } catch {
      setAlert({
        type: "error",
        message: "Error inesperado al crear la habitación",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoomId) {
      setAlert({
        type: "error",
        message: "Seleccione una habitación para eliminar",
      });
      return;
    }

    const confirm = window.confirm(
      "¿Está seguro que desea eliminar esta habitación?",
    );
    if (!confirm) return;

    setIsLoading(true);
    try {
      const result = await deleteRoom(selectedRoomId);
      if (result.success) {
        setAlert({
          type: "success",
          message: "¡Habitación eliminada con éxito!",
        });
        setSelectedRoomId("");
        await loadRooms();
      } else {
        setAlert({
          type: "error",
          message: result.error || "Error al eliminar habitación",
        });
      }
    } catch {
      setAlert({
        type: "error",
        message: "Error inesperado al eliminar habitación",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
        Gestión de Habitaciones
      </h1>

      {alert && (
        <Alert
          className={`mb-4 flex items-center space-x-2 p-3 rounded-lg text-xs sm:text-sm ${
            alert.type === "success"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          {alert.type === "success" ? (
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
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

      {/* Crear cuarto */}
      <div className="bg-white shadow-md rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
          Crear Nueva Habitación
        </h2>
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div className="flex flex-col space-y-1">
            <Label htmlFor="number" className="text-xs sm:text-sm">
              Número de Habitación*
            </Label>
            <Input
              id="number"
              value={formData.number}
              onChange={(e) =>
                setFormData({ ...formData, number: e.target.value })
              }
              placeholder="Ej: 101"
              className="border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 text-xs sm:text-sm"
            />
          </div>

          <div className="flex flex-col space-y-1">
            <Label htmlFor="type" className="text-xs sm:text-sm">
              Tipo*
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value: RoomType) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 text-xs sm:text-sm">
                <SelectValue placeholder="Seleccione el tipo" />
              </SelectTrigger>
              <SelectContent className="bg-white text-xs sm:text-sm">
                <SelectItem value="single">Individual</SelectItem>
                <SelectItem value="double">Doble</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-xs sm:text-sm transition-colors"
          >
            {isLoading ? "Creando..." : "Crear Habitación"}
          </Button>
        </form>
      </div>

      {/* Eliminar cuarto */}
      <div className="bg-white shadow-md rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
          Eliminar Habitación
        </h2>
        <div className="space-y-3">
          <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
            <SelectTrigger className="border-gray-300 focus:border-red-500 focus:ring focus:ring-red-200 text-xs sm:text-sm">
              <SelectValue placeholder="Seleccione habitación" />
            </SelectTrigger>
            <SelectContent className="bg-white text-xs sm:text-sm">
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.number} (
                  {room.type === "single" ? "Individual" : "Doble"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleDeleteRoom}
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg text-xs sm:text-sm transition-colors"
          >
            {isLoading ? "Procesando..." : "Eliminar Habitación"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Page;
