"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  getRoomById,
  checkInRoom,
  checkoutRoom,
  checkoutFirstGuest,
  checkoutSecondGuest,
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
  guest1CheckinDate: string;
  guest2Name: string;
  guest2Phone: string;
  guest2CheckinDate: string;
  company: string;
}

interface AlertState {
  type: "success" | "error";
  message: string;
}

const INITIAL_FORM_DATA: FormData = {
  guest1Name: "",
  guest1Phone: "",
  guest1CheckinDate: new Date().toISOString().split("T")[0],
  guest2Name: "",
  guest2Phone: "",
  guest2CheckinDate: new Date().toISOString().split("T")[0],
  company: "",
};

export default function AdminRoomPage() {
  const { data: session } = useSession();
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
      return { isValid: false, error: "Nome do hóspede 1 é obrigatório" };
    if (formData.guest1Phone && !validatePhone(formData.guest1Phone))
      return { isValid: false, error: "Telefone do hóspede 1 inválido" };
    if (formData.guest2Phone && !validatePhone(formData.guest2Phone))
      return { isValid: false, error: "Telefone do hóspede 2 inválido" };

    // Validar data do primeiro hóspede
    if (!formData.guest1CheckinDate)
      return {
        isValid: false,
        error: "Data de entrada do hóspede 1 é obrigatória",
      };

    // Se há segundo hóspede, validar sua data
    if (formData.guest2Name.trim() && !formData.guest2CheckinDate)
      return {
        isValid: false,
        error: "Data de entrada do hóspede 2 é obrigatória",
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

  const formatDisplayDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es");
    } catch {
      return dateString;
    }
  };

  useEffect(() => {
    const fetchRoom = async () => {
      const roomId = Array.isArray(roomid) ? roomid[0] : roomid;
      if (!roomId) {
        setIsLoading(false);
        showAlert("error", "ID do quarto não fornecido");
        return;
      }
      try {
        const result = await getRoomById(roomId);
        if (result.success && result.data) {
          setRoom({
            ...result.data,
            status: normalizeRoomStatus(result.data.status),
          });
        } else showAlert("error", result.error || "Quarto não encontrado");
      } catch (e) {
        console.error(e);
        showAlert("error", "Erro ao carregar dados do quarto");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoom();
  }, [roomid, showAlert]);

  const handleInputChange = (field: keyof FormData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const resetForm = () => setFormData(INITIAL_FORM_DATA);

  const handleAddGuest = async () => {
    if (!room) return showAlert("error", "Dados do quarto não carregados");
    if (!session?.user?.id)
      return showAlert("error", "Usuário não autenticado");

    const validation = validateFormData();
    if (!validation.isValid) return showAlert("error", validation.error!);

    setIsSubmitting(true);
    try {
      const checkInData: any = {
        roomId: room.id,
        guest1Name: formData.guest1Name.trim(),
        guest1Phone: formData.guest1Phone.trim() || undefined,
        guest1CheckinDate: formData.guest1CheckinDate,
        company: formData.company.trim() || undefined,
        userId: session.user.id,
      };

      // Adicionar segundo hóspede se fornecido (só para quartos duplos)
      if (room.type === "double" && formData.guest2Name.trim()) {
        checkInData.guest2Name = formData.guest2Name.trim();
        checkInData.guest2Phone = formData.guest2Phone.trim() || undefined;
        checkInData.guest2CheckinDate = formData.guest2CheckinDate;
      }

      const result = await checkInRoom(checkInData);

      if (result.success && result.data) {
        setRoom({
          ...result.data,
          status: normalizeRoomStatus(result.data.status),
        });
        resetForm();
        showAlert("success", "Check-in realizado com sucesso!");
      } else showAlert("error", result.error || "Erro ao realizar check-in");
    } catch (e) {
      console.error(e);
      showAlert("error", "Erro inesperado ao realizar check-in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    if (!room) return showAlert("error", "Dados do quarto não carregados");
    if (
      !window.confirm(
        `Tem certeza que deseja fazer checkout completo do quarto ${room.number}?`,
      )
    )
      return;

    setIsSubmitting(true);
    try {
      const result = await checkoutRoom(room.id, session?.user?.id);
      if (result.success && result.data) {
        setRoom({
          ...result.data,
          status: normalizeRoomStatus(result.data.status),
        });
        showAlert("success", "Checkout completo realizado com sucesso!");
      } else showAlert("error", result.error || "Erro ao realizar checkout");
    } catch (e) {
      console.error(e);
      showAlert("error", "Erro inesperado ao realizar checkout");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckoutFirstGuest = async () => {
    if (!room) return showAlert("error", "Dados do quarto não carregados");
    if (
      !window.confirm(
        `Tem certeza que deseja fazer checkout apenas do primeiro hóspede (${room.guest1Name})?`,
      )
    )
      return;

    setIsSubmitting(true);
    try {
      const result = await checkoutFirstGuest(room.id, session?.user?.id);
      if (result.success && result.data) {
        // 🔑 Atualizar estado com dados do backend
        setRoom({
          ...result.data,
          status: normalizeRoomStatus(result.data.status),
        });

        showAlert(
          "success",
          "Checkout do primeiro hóspede realizado com sucesso!",
        );
      } else {
        showAlert("error", result.error || "Erro ao realizar checkout");
      }
    } catch (e) {
      console.error(e);
      showAlert("error", "Erro inesperado ao realizar checkout");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckoutSecondGuest = async () => {
    if (!room) return showAlert("error", "Dados do quarto não carregados");
    if (
      !window.confirm(
        `Tem certeza que deseja fazer checkout apenas do segundo hóspede (${room.guest2Name})?`,
      )
    )
      return;

    setIsSubmitting(true);
    try {
      const result = await checkoutSecondGuest(room.id, session?.user?.id);
      if (result.success && result.data) {
        setRoom({
          ...result.data,
          status: normalizeRoomStatus(result.data.status),
        });
        showAlert(
          "success",
          "Checkout do segundo hóspede realizado com sucesso!",
        );
      } else showAlert("error", result.error || "Erro ao realizar checkout");
    } catch (e) {
      console.error(e);
      showAlert("error", "Erro inesperado ao realizar checkout");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkClean = async () => {
    if (!room) return showAlert("error", "Dados do quarto não carregados");
    setIsSubmitting(true);
    try {
      const result = await updateRoomStatus(room.id, "Free");
      if (result.success && result.data) {
        setRoom({
          ...result.data,
          status: normalizeRoomStatus(result.data.status),
        });
        showAlert("success", "Quarto marcado como limpo!");
      } else showAlert("error", result.error || "Erro ao atualizar estado");
    } catch (e) {
      console.error(e);
      showAlert("error", "Erro inesperado ao atualizar estado");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] gap-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Carregando...</span>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center text-red-600">Quarto não encontrado</div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6 bg-white shadow-md rounded-lg">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold mb-2">Quarto {room.number}</h1>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-gray-600">
            Tipo:{" "}
            <span className="font-medium text-gray-800 uppercase">
              {room.type === "single" ? "Solteiro" : "Duplo"}
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
                ? "Livre"
                : room.status === "Occupied"
                  ? "Ocupado"
                  : "Sujo"}
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

      {/* Quarto Livre */}
      {room.status === "Free" && (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-green-800 font-medium">
              🎉 Quarto livre e pronto para ocupar!
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Dados do Check-in:</h3>

            {/* Dados do Primeiro Hóspede */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-gray-700 border-b pb-1">
                Hóspede Principal
              </h4>
              <div className="grid gap-3">
                <Input
                  placeholder="Nome do Hóspede 1 *"
                  value={formData.guest1Name}
                  onChange={(e) =>
                    handleInputChange("guest1Name", e.target.value)
                  }
                  disabled={isSubmitting}
                />
                <Input
                  placeholder="Telefone do Hóspede 1"
                  value={formData.guest1Phone}
                  onChange={(e) =>
                    handleInputChange("guest1Phone", e.target.value)
                  }
                  disabled={isSubmitting}
                />
                <div className="space-y-1">
                  <label className="text-sm text-gray-600">
                    Data de Entrada do Hóspede 1 *
                  </label>
                  <Input
                    type="date"
                    value={formData.guest1CheckinDate}
                    onChange={(e) =>
                      handleInputChange("guest1CheckinDate", e.target.value)
                    }
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Dados do Segundo Hóspede (apenas para quartos duplos) */}
            {room.type === "double" && (
              <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                <h4 className="font-medium text-gray-700 border-b pb-1">
                  Segundo Hóspede (Opcional)
                </h4>
                <div className="grid gap-3">
                  <Input
                    placeholder="Nome do Hóspede 2"
                    value={formData.guest2Name}
                    onChange={(e) =>
                      handleInputChange("guest2Name", e.target.value)
                    }
                    disabled={isSubmitting}
                  />
                  <Input
                    placeholder="Telefone do Hóspede 2"
                    value={formData.guest2Phone}
                    onChange={(e) =>
                      handleInputChange("guest2Phone", e.target.value)
                    }
                    disabled={isSubmitting}
                  />
                  <div className="space-y-1">
                    <label className="text-sm text-gray-600">
                      Data de Entrada do Hóspede 2
                    </label>
                    <Input
                      type="date"
                      value={formData.guest2CheckinDate}
                      onChange={(e) =>
                        handleInputChange("guest2CheckinDate", e.target.value)
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Dados Gerais */}
            <div className="space-y-3">
              <Input
                placeholder="Empresa"
                value={formData.company}
                onChange={(e) => handleInputChange("company", e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <Button
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
              onClick={handleAddGuest}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando Check-in...
                </div>
              ) : (
                "Realizar Check-in"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Quarto Ocupado */}
      {room.status === "Occupied" && (
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">
              🔴 Quarto Ocupado
            </h3>
            <div className="space-y-3 text-sm">
              {/* Primeiro Hóspede */}
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium text-gray-700 mb-2">
                  Hóspede Principal
                </h4>
                <div className="space-y-1">
                  <p>
                    <span className="font-medium">Nome:</span> {room.guest1Name}
                  </p>
                  {room.guest1Phone && (
                    <p>
                      <span className="font-medium">Telefone:</span>{" "}
                      {room.guest1Phone}
                    </p>
                  )}
                  {room.guest1CheckinDate && (
                    <p>
                      <span className="font-medium">Data de entrada:</span>{" "}
                      {formatDisplayDate(room.guest1CheckinDate)}
                    </p>
                  )}
                </div>
              </div>

              {/* Segundo Hóspede */}
              {room.type === "double" && room.guest2Name && (
                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Segundo Hóspede
                  </h4>
                  <div className="space-y-1">
                    <p>
                      <span className="font-medium">Nome:</span>{" "}
                      {room.guest2Name}
                    </p>
                    {room.guest2Phone && (
                      <p>
                        <span className="font-medium">Telefone:</span>{" "}
                        {room.guest2Phone}
                      </p>
                    )}
                    {room.guest2CheckinDate && (
                      <p>
                        <span className="font-medium">Data de entrada:</span>{" "}
                        {formatDisplayDate(room.guest2CheckinDate)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Informações Gerais */}
              {room.company && (
                <div className="bg-white p-3 rounded border">
                  <p>
                    <span className="font-medium">Empresa:</span> {room.company}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Formulário para adicionar segundo hóspede */}
          {room.type === "double" && !room.guest2Name && (
            <div className="border-t pt-4">
              <AddSecondGuestForm
                room={room}
                onSuccess={(updated) => {
                  setRoom({
                    ...updated,
                    status: normalizeRoomStatus(updated.status),
                  });
                }}
                showAlert={showAlert}
              />
            </div>
          )}

          {/* Botões de Checkout */}
          <div className="space-y-3">
            {/* Para quartos SOLTEIRO - botão único de checkout */}
            {room.type === "single" && (
              <Button
                className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50"
                onClick={handleCheckout}
                disabled={isSubmitting || !room.guest1Name}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando Checkout...
                  </div>
                ) : (
                  "Realizar Checkout"
                )}
              </Button>
            )}

            {/* Para quartos DUPLOS - apenas botões individuais */}
            {room.type === "double" && (
              <>
                {/* Botões individuais quando há ambos hóspedes */}
                {room.guest1Name && room.guest2Name && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-sm"
                      onClick={handleCheckoutFirstGuest}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        `Checkout: ${room.guest1Name.split(" ")[0]}`
                      )}
                    </Button>
                    <Button
                      className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-sm"
                      onClick={handleCheckoutSecondGuest}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        `Checkout: ${room.guest2Name.split(" ")[0]}`
                      )}
                    </Button>
                  </div>
                )}

                {/* Botão individual quando há apenas o primeiro hóspede */}
                {room.guest1Name && !room.guest2Name && (
                  <Button
                    className="w-full bg-blue-400 hover:bg-blue-500 disabled:opacity-50"
                    onClick={handleCheckoutFirstGuest}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processando Checkout...
                      </div>
                    ) : (
                      `Checkout: ${room.guest1Name}`
                    )}
                  </Button>
                )}

                {/* Botão individual quando há apenas o segundo hóspede */}
                {!room.guest1Name && room.guest2Name && (
                  <Button
                    className="w-full bg-blue-400 hover:bg-blue-500 disabled:opacity-50"
                    onClick={handleCheckoutSecondGuest}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processando Checkout...
                      </div>
                    ) : (
                      `Checkout: ${room.guest2Name}`
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Quarto Sujo */}
      {room.status === "Dirty" && (
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-1">
              🧹 Quarto precisa de limpeza
            </h3>
            <p className="text-sm text-yellow-700">
              Este quarto foi utilizado e precisa ser limpo antes da próxima
              ocupação.
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
                Atualizando estado...
              </div>
            ) : (
              "✅ Marcar como limpo"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
