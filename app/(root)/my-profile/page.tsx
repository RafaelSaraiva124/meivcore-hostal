import React from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/auth";
import { Avatar } from "@/components/ui/avatar";
import { AvatarFallback } from "@radix-ui/react-avatar";
import { User } from "lucide-react"; // ⬅️ ícone de usuário

const Page = () => {
  return (
    <div className="flex flex-col items-center justify-center  bg-gray-50 p-2">
      <div className="bg-white shadow-md rounded-2xl p-2 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Panel de Usuario
        </h1>

        <Avatar className="w-16 h-16 mx-auto mb-4">
          <AvatarFallback className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs sm:text-sm font-semibold flex items-center justify-center rounded-full">
            <User className="w-8 h-8" />
          </AvatarFallback>
        </Avatar>

        <form
          action={async () => {
            "use server";
            await signOut({ redirect: true, redirectTo: "/" });
          }}
          className="mb-4"
        >
          <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors">
            Cerrar Sesión
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Page;
