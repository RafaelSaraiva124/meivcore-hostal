"use client";

import { useState } from "react";
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
  const [guest2Name, setGuest2Name] = useState("");
  const [guest2Phone, setGuest2Phone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!guest2Name.trim()) {
      showAlert("error", "Nome do segundo hóspede é obrigatório");
      return;
    }
    setLoading(true);
    try {
      const { updateRoom } = await import("@/lib/actions/rooms");
      const result = await updateRoom({
        id: room.id,
        guest2Name: guest2Name.trim(),
        guest2Phone: guest2Phone.trim() || undefined,
      });
      if (result.success && result.data) {
        onSuccess(result.data);
        showAlert("success", "Segundo hóspede adicionado com sucesso!");
        setGuest2Name("");
        setGuest2Phone("");
      } else {
        showAlert("error", result.error || "Erro ao atualizar segundo hóspede");
      }
    } catch (err) {
      console.error(err);
      showAlert("error", "Erro inesperado ao atualizar segundo hóspede");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-4 border rounded bg-gray-50">
      <h3 className="font-medium text-gray-700">
        Adicionar / Atualizar Segundo Hóspede
      </h3>

      <Input
        placeholder="Nome completo"
        value={guest2Name}
        onChange={(e) => setGuest2Name(e.target.value)}
        disabled={loading}
      />
      <Input
        placeholder="Telefone"
        value={guest2Phone}
        onChange={(e) => setGuest2Phone(e.target.value)}
        disabled={loading}
      />

      <Button
        onClick={handleSave}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
          </span>
        ) : (
          "Salvar Segundo Hóspede"
        )}
      </Button>
    </div>
  );
};
