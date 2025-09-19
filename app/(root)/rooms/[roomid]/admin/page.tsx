"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  getRoomById,
  updateRoom,
  checkoutRoom,
  updateRoomStatus,
} from "@/lib/actions/rooms";
import { Room, RoomStatus } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { AddSecondGuestForm } from "@/components/AddSecondGuestForm";

interface FormData {
  guest1Name: string;
  guest1Phone: string;
  guest2Name: string;
  guest2Phone: string;
  company: string;
  checkinDate: string;
}

interface AlertState {
  type: "success" | "error";
  message: string;
}

const INITIAL_FORM_DATA: FormData = {
  guest1Name: "",
  guest1Phone: "",
  guest2Name: "",
  guest2Phone: "",
  company: "",
  checkinDate: "",
};

export default function AdminRoomPage() {
  const { roomid } = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [alert, setAlert] = useState<AlertState | null>(null);

  const showAlert = useCallback(
    (type: "success" | "error", message: string) => {
      setAlert({ type, message });
      setTimeout(() => setAlert(null), 5000);
    },
    [],
  );

  const validatePhone = (phone: string) =>
    /^[+]?[1-9]\d{0,15}$/.test(phone.replace(/[\s\-\(\)]/g, ""));

  const validateFormData = (): { isValid: boolean; error?: string } => {
    if (!formData.guest1Name.trim())
      return {
        isValid: false,
        error: "El nombre del huésped 1 es obligatorio",
      };
    if (formData.guest1Phone && !validatePhone(formData.guest1Phone))
      return {
        isValid: false,
        error: "Formato de teléfono inválido para el huésped 1",
      };
    if (formData.guest2Phone && !validatePhone(formData.guest2Phone))
      return {
        isValid: false,
        error: "Formato de teléfono inválido para el huésped 2",
      };
    return { isValid: true };
  };

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

  const handleInputChange = (f: keyof FormData, v: string) =>
    setFormData((p) => ({ ...p, [f]: v }));

  const resetForm = () => setFormData(INITIAL_FORM_DATA);

  const handleAddGuest = async () => {
    if (!room) return showAlert("error", "Datos de la habitación no cargados");

    const today = new Date();
    const formattedToday = today.toISOString().split("T")[0];

    const val = validateFormData();
    if (!val.isValid) return showAlert("error", val.error!);

    setIsSubmitting(true);
    try {
      const updateData = {
        id: room.id,
        guest1Name: formData.guest1Name.trim(),
        guest1Phone: formData.guest1Phone,
        guest2Name: room.type === "double" ? formData.guest2Name || null : null,
        guest2Phone:
          room.type === "double" ? formData.guest2Phone || null : null,
        company: formData.company || undefined,
        status: "Occupied" as RoomStatus,

        // ✅ Usa data escolhida ou a data de hoje
        guest1CheckinDate: formData.checkinDate
          ? new Date(formData.checkinDate).toISOString().split("T")[0] // normaliza input
          : formattedToday,
      };

      const result = await updateRoom(updateData);
      if (result.success && result.data) {
        setRoom({
          ...result.data,
          status: normalizeRoomStatus(result.data.status),
        });
        resetForm();
        showAlert("success", "¡Check-in realizado con éxito!");
      } else {
        showAlert("error", result.error || "Error al realizar el check-in");
      }
    } catch (e) {
      console.error(e);
      showAlert("error", "Error inesperado al realizar check-in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    if (!room) return showAlert("error", "Datos de la habitación no cargados");
    if (
      !window.confirm(
        `¿Está seguro de realizar el checkout de la habitación ${room.number}?`,
      )
    )
      return;

    setIsSubmitting(true);
    try {
      const result = await checkoutRoom(room.id);
      if (result.success && result.data) {
        setRoom({
          ...result.data,
          status: normalizeRoomStatus(result.data.status),
        });
        showAlert("success", "¡Checkout realizado con éxito!");
      } else showAlert("error", result.error || "Error al realizar checkout");
    } catch (e) {
      console.error(e);
      showAlert("error", "Error inesperado al realizar checkout");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // ======== Render ========
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
              className={`ml-1 font-semibold px-2 py-1 rounded text-sm ${room.status === "Free" ? "bg-green-100 text-green-700" : room.status === "Occupied" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}
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
          className={`flex items-center gap-2 p-3 rounded border-l-4 ${alert.type === "success" ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}
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

      {/* Quando quarto está livre */}
      {room.status === "Free" && (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-green-800 font-medium">
              🎉 ¡Habitación libre y lista para ocupar!
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Datos del Check-in:</h3>

            <div className="grid gap-3">
              <Input
                placeholder="Nombre del Huésped 1 *"
                value={formData.guest1Name}
                onChange={(e) =>
                  handleInputChange("guest1Name", e.target.value)
                }
                disabled={isSubmitting}
              />
              <Input
                placeholder="Teléfono del Huésped 1"
                value={formData.guest1Phone}
                onChange={(e) =>
                  handleInputChange("guest1Phone", e.target.value)
                }
                disabled={isSubmitting}
              />
              <Input
                placeholder="Empresa"
                value={formData.company}
                onChange={(e) => handleInputChange("company", e.target.value)}
                disabled={isSubmitting}
              />
              <Input
                type="date"
                placeholder="Fecha de Entrada"
                value={
                  formData.checkinDate || new Date().toISOString().split("T")[0]
                }
                onChange={(e) =>
                  handleInputChange("checkinDate", e.target.value)
                }
                disabled={isSubmitting}
              />
              {room.type === "double" && (
                <>
                  <Input
                    placeholder="Nombre del Huésped 2"
                    value={formData.guest2Name}
                    onChange={(e) =>
                      handleInputChange("guest2Name", e.target.value)
                    }
                    disabled={isSubmitting}
                  />
                  <Input
                    placeholder="Teléfono del Huésped 2"
                    value={formData.guest2Phone}
                    onChange={(e) =>
                      handleInputChange("guest2Phone", e.target.value)
                    }
                    disabled={isSubmitting}
                  />
                </>
              )}
            </div>

            <Button
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
              onClick={handleAddGuest}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando Check-in...
                </div>
              ) : (
                "Realizar Check-in"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Quando quarto está ocupado */}
      {room.status === "Occupied" && (
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">
              🔴 Habitación Ocupada
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Huésped:</span> {room.guest1Name}
              </p>
              {room.guest1Phone && (
                <p>
                  <span className="font-medium">Teléfono:</span>{" "}
                  {room.guest1Phone}
                </p>
              )}
              {room.company && (
                <p>
                  <span className="font-medium">Empresa:</span> {room.company}
                </p>
              )}
              {room.type === "double" && room.guest2Name && (
                <>
                  <p>
                    <span className="font-medium">Segundo huésped:</span>{" "}
                    {room.guest2Name}
                  </p>
                  {room.guest2Phone && (
                    <p>
                      <span className="font-medium">Teléfono:</span>{" "}
                      {room.guest2Phone}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {room.type === "double" && !room.guest2Name && (
            <AddSecondGuestForm
              room={room}
              onSuccess={(updated) =>
                setRoom({
                  ...updated,
                  status: normalizeRoomStatus(updated.status),
                })
              }
              showAlert={showAlert}
            />
          )}

          <Button
            className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50"
            onClick={handleCheckout}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando Checkout...
              </div>
            ) : (
              "Realizar Checkout"
            )}
          </Button>
        </div>
      )}

      {/* Quando quarto está sujo */}
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
