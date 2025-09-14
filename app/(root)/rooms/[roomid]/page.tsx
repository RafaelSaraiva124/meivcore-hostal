"use client";

import React, { useEffect, useState } from "react";
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
import { CheckCircle, AlertCircle } from "lucide-react";
import { requireAdmin } from "@/lib/actions/auth";
import { useSession } from "next-auth/react"; // Para pegar userId

const Page = () => {
  const { roomid } = useParams();
  const { data: session } = useSession(); // session.user.id disponível
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [guest1Name, setGuest1Name] = useState("");
  const [guest1Phone, setGuest1Phone] = useState("");
  const [guest2Name, setGuest2Name] = useState("");
  const [guest2Phone, setGuest2Phone] = useState("");

  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verificar se usuário é admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!session?.user?.id) return;
      const result = await requireAdmin(session.user.id);
      setIsAdmin(result.allowed);
    };
    checkAdmin();
  }, [session]);

  // Carregar dados da habitación
  useEffect(() => {
    const fetchRoom = async () => {
      const roomId = Array.isArray(roomid) ? roomid[0] : roomid;
      if (!roomId) return;

      setIsLoading(true);
      try {
        const result = await getRoomById(roomId);
        if (result.success && result.data) {
          setRoom({
            ...result.data,
            status: (result.data.status as RoomStatus) || "Free",
          });
        } else {
          setRoom(null);
        }
      } catch {
        setRoom(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [roomid]);

  // Adicionar huésped
  const handleAddGuest = async () => {
    if (
      !guest1Name.trim() ||
      !guest1Phone.trim() ||
      (room?.type === "double" && (!guest2Name.trim() || !guest2Phone.trim()))
    ) {
      setAlert({
        type: "error",
        message: "Complete todos los campos obligatorios.",
      });
      return;
    }
    if (!room) return;

    setIsSubmitting(true);
    try {
      const result = await updateRoom({
        id: room.id,
        guest1Name,
        guest1Phone,
        guest2Name: room.type === "double" ? guest2Name : null,
        guest2Phone: room.type === "double" ? guest2Phone : null,
        status: "Ocupied" as RoomStatus,
      });

      if (result.success && result.data) {
        setRoom({
          ...result.data,
          status: (result.data.status as RoomStatus) || "Free",
        });
        setGuest1Name("");
        setGuest1Phone("");
        setGuest2Name("");
        setGuest2Phone("");
        setAlert({
          type: "success",
          message: "¡Huésped(es) añadido(s) con éxito!",
        });
      } else {
        setAlert({
          type: "error",
          message: result.error || "Error al añadir huésped.",
        });
      }
    } catch {
      setAlert({ type: "error", message: "Error inesperado." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Checkout
  const handleCheckout = async () => {
    if (!room) return;
    const confirm = window.confirm("¿Está seguro que desea hacer el checkout?");
    if (!confirm) return;

    setIsSubmitting(true);
    try {
      const result = await checkoutRoom(room.id);
      if (result.success && result.data) {
        setRoom({
          ...result.data,
          status: (result.data.status as RoomStatus) || "Free",
        });
        setAlert({
          type: "success",
          message: "¡Checkout realizado con éxito!",
        });
      } else {
        setAlert({
          type: "error",
          message: result.error || "Error al realizar el checkout.",
        });
      }
    } catch {
      setAlert({ type: "error", message: "Error inesperado." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Marcar como limpia
  const handleMarkClean = async () => {
    if (!room) return;
    setIsSubmitting(true);
    try {
      const result = await updateRoomStatus(room.id, "Free");
      if (result.success && result.data) {
        setRoom({
          ...result.data,
          status: (result.data.status as RoomStatus) || "Free",
        });
        setAlert({
          type: "success",
          message: "¡Habitación marcada como limpia!",
        });
      } else {
        setAlert({
          type: "error",
          message: result.error || "Error al actualizar estado.",
        });
      }
    } catch {
      setAlert({ type: "error", message: "Error inesperado." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <p className="text-center mt-10">Cargando...</p>;
  if (!room)
    return <p className="text-center mt-10">Habitación no encontrada</p>;

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-2">Habitación {room.number}</h1>
      <p className="text-gray-600 mb-4">
        Tipo:{" "}
        <span className="font-medium text-gray-800 uppercase">{room.type}</span>{" "}
        | Estado:{" "}
        <span
          className={`font-semibold px-2 py-1 rounded text-sm ${
            room.status === "Free"
              ? "bg-green-100 text-green-700"
              : room.status === "Ocupied"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {room.status === "Free"
            ? "Libre"
            : room.status === "Ocupied"
              ? "Ocupado"
              : "Sucio"}
        </span>
      </p>

      {alert && (
        <Alert
          className={`flex items-center gap-2 p-3 rounded ${
            alert.type === "success"
              ? "border-green-300 bg-green-50"
              : "border-red-300 bg-red-50"
          }`}
        >
          {alert.type === "success" ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
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

      {/* HABITACIÓN LIBRE */}
      {room.status === "Free" && isAdmin && (
        <div className="space-y-3">
          <p className="text-gray-700">
            ¡Habitación libre! Añada los datos del huésped:
          </p>
          <div className="space-y-2">
            <Input
              placeholder="Nombre huésped 1"
              value={guest1Name}
              onChange={(e) => setGuest1Name(e.target.value)}
            />
            <Input
              placeholder="Teléfono huésped 1"
              value={guest1Phone}
              onChange={(e) => setGuest1Phone(e.target.value)}
            />
            {room.type === "double" && (
              <>
                <Input
                  placeholder="Nombre huésped 2"
                  value={guest2Name}
                  onChange={(e) => setGuest2Name(e.target.value)}
                />
                <Input
                  placeholder="Teléfono huésped 2"
                  value={guest2Phone}
                  onChange={(e) => setGuest2Phone(e.target.value)}
                />
              </>
            )}
            <Button
              className="w-full"
              onClick={handleAddGuest}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Añadiendo..." : "Añadir Huésped(es)"}
            </Button>
          </div>
        </div>
      )}

      {/* HABITACIÓN OCUPADA */}
      {room.status === "Ocupied" && isAdmin && (
        <div className="space-y-3">
          <p className="text-gray-700">
            Habitación ocupada por{" "}
            <span className="font-semibold">{room.guest1Name}</span>
            {room.type === "double" && room.guest2Name
              ? ` y ${room.guest2Name}`
              : ""}
          </p>
          {room.guest1Phone && (
            <p className="text-sm text-gray-600">
              Teléfono: {room.guest1Phone}
            </p>
          )}
          {room.type === "double" && room.guest2Phone && (
            <p className="text-sm text-gray-600">
              Teléfono: {room.guest2Phone}
            </p>
          )}
          <Button
            className="w-full bg-red-500 hover:bg-red-600"
            onClick={handleCheckout}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Procesando..." : "Checkout"}
          </Button>
        </div>
      )}

      {/* HABITACIÓN SUCIA */}
      {room.status === "Dirty" && (
        <div className="space-y-3">
          <p className="text-gray-700">
            ⚠️ ¡Habitación sucia! Esperando limpieza.
          </p>
          <Button
            className="w-full bg-yellow-500 hover:bg-yellow-600"
            onClick={handleMarkClean}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Procesando..." : "Marcar como limpia"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Page;
