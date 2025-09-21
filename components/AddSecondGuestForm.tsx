"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Room } from "@/lib/types";

interface Props {
  room: Room;
  onSuccess: (updated: Room) => void;
  showAlert: (type: "success" | "error", msg: string) => void;
}

export const AddSecondGuestForm: React.FC<Props> = ({
  room,
  onSuccess,
  showAlert,
}) => {
  const { data: session } = useSession();
  const [guest2Name, setGuest2Name] = useState("");
  const [guest2Phone, setGuest2Phone] = useState("");
  const [guest2CheckinDate, setGuest2CheckinDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = useState(false);

  const validatePhone = (phone: string) =>
    /^[+]?[1-9]\d{0,15}$/.test(phone.replace(/[\s\-\(\)]/g, ""));

  const handleSave = async () => {
    // Validações
    if (!guest2Name.trim()) {
      showAlert("error", "Nome do segundo hóspede é obrigatório");
      return;
    }

    if (!guest2CheckinDate) {
      showAlert("error", "Data de entrada do segundo hóspede é obrigatória");
      return;
    }

    if (guest2Phone && !validatePhone(guest2Phone)) {
      showAlert("error", "Telefone do segundo hóspede inválido");
      return;
    }

    setLoading(true);

    try {
      // Usar a função checkInSecondGuest das actions atualizadas
      const { checkInSecondGuest } = await import("@/lib/actions/rooms");

      const result = await checkInSecondGuest({
        roomId: room.id,
        guest2Name: guest2Name.trim(),
        guest2Phone: guest2Phone.trim() || undefined,
        guest2CheckinDate: guest2CheckinDate,
        userId: session?.user?.id,
      });

      if (result.success && result.data) {
        onSuccess(result.data);
        showAlert("success", "Segundo hóspede adicionado com sucesso!");
        setGuest2Name("");
        setGuest2Phone("");
        setGuest2CheckinDate(new Date().toISOString().split("T")[0]);
      } else {
        showAlert("error", result.error || "Erro ao adicionar segundo hóspede");
      }
    } catch (err) {
      console.error(err);
      showAlert("error", "Erro inesperado ao adicionar segundo hóspede");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-4 border rounded bg-blue-50 border-blue-200">
      <h3 className="font-medium text-blue-800 border-b border-blue-300 pb-2">
        ➕ Adicionar Segundo Hóspede
      </h3>

      <div className="space-y-3">
        <Input
          placeholder="Nome completo do segundo hóspede *"
          value={guest2Name}
          onChange={(e) => setGuest2Name(e.target.value)}
          disabled={loading}
          className="border-blue-300 focus:border-blue-500"
        />

        <Input
          placeholder="Telefone (opcional)"
          value={guest2Phone}
          onChange={(e) => setGuest2Phone(e.target.value)}
          disabled={loading}
          className="border-blue-300 focus:border-blue-500"
        />

        <div className="space-y-1">
          <label className="text-sm text-blue-700 font-medium">
            Data de Entrada do Segundo Hóspede *
          </label>
          <Input
            type="date"
            value={guest2CheckinDate}
            onChange={(e) => setGuest2CheckinDate(e.target.value)}
            disabled={loading}
            className="border-blue-300 focus:border-blue-500"
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={loading || !guest2Name.trim() || !guest2CheckinDate}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 rounded-lg transition-colors"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Adicionando hóspede...
          </span>
        ) : (
          "💾 Adicionar Segundo Hóspede"
        )}
      </Button>

      <p className="text-xs text-blue-600 mt-2">
        💡 O segundo hóspede será adicionado à mesma reserva com sua própria
        data de entrada.
      </p>
    </div>
  );
};
