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

export const requireAdmin = async (userId: string) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.role !== "Admin") {
      return { allowed: false, message: "Acceso denegado" };
    }

    return { allowed: true, user };
  } catch (error) {
    console.error("Erro ao verificar admin:", error);
    return { allowed: false, message: "Error inesperado" };
  }
};
