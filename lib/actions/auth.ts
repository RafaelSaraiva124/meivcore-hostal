"use server";

import { signIn } from "@/auth";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";

export const signInWithCredentials = async (
  params: Pick<AuthCredentials, "email" | "password">,
) => {
  const { email, password } = params;

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.log(error, "Signin error");
    return { success: false, error: "signin error" };
  }
};

export const signUp = async (params: AuthCredentials) => {
  const { fullName, email, password } = params;

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existingUser.length > 0) {
    return { success: false, message: "O utilizador já existe" };
  }

  const hashedPassword = await hash(password, 10);
  try {
    await db.insert(users).values({
      fullName,
      email,
      password: hashedPassword,
    });
    await signInWithCredentials({ email, password });
    return { success: true };
  } catch (error) {
    console.log(error, "signup error");
    return { success: false, error: "Erro ao criar utilizador" };
  }
};
export const getRoomRedirect = async (roomId: string, session?: any) => {
  if (!roomId || roomId.trim() === "") {
    return { success: false, error: "Room ID inválido" };
  }

  try {
    let role: string | undefined = session?.user?.role;

    if (!role) {
      const userId = session?.user?.id;
      if (!userId) {
        return {
          success: false,
          error: "Sessão inválida ou usuário não encontrado",
        };
      }

      const [user] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return { success: false, error: "Usuário não encontrado no banco" };
      }

      role = user.role;
    }

    const redirectUrl =
      role === "Admin" ? `/rooms/${roomId}/admin` : `/rooms/${roomId}/worker`;

    return { success: true, redirectUrl };
  } catch (error) {
    console.error("Erro ao obter role do usuário:", error);
    return {
      success: false,
      error: "Não foi possível determinar a role do usuário",
    };
  }
};
export async function requireAdmin(userId: string, userRole?: string) {
  try {
    let role = userRole;

    if (!role) {
      const [user] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return { allowed: false, error: "Usuário não encontrado" };
      }

      role = user.role;
    }

    const isAdmin = role === "Admin";

    return {
      allowed: isAdmin,
      error: isAdmin ? null : "Acesso negado: apenas administradores",
    };
  } catch (error) {
    console.error("Erro ao verificar permissões:", error);
    return { allowed: false, error: "Erro interno do servidor" };
  }
}

export async function requireAdminFromSession(session: any) {
  if (!session?.user?.role) {
    return { allowed: false, error: "Sessão inválida" };
  }
  const isAdmin = String(session.user.role).toLowerCase() === "admin";
  return {
    allowed: isAdmin,
    error: isAdmin ? null : "Acesso negado: apenas administradores",
  };
}
