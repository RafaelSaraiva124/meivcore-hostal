import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const toSafeISOString = (dateValue: any): string | null => {
  if (!dateValue) return null;

  // Se já é uma string no formato correto, retorna
  if (typeof dateValue === "string") {
    // Verifica se é formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return new Date(dateValue + "T00:00:00.000Z").toISOString();
    }

    // Tenta converter string para Date
    const parsedDate = new Date(dateValue);
    return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
  }

  // Se é um objeto Date
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue.toISOString();
  }

  // Tenta converter outros tipos
  try {
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch {
    return null;
  }
};

export const createSafeDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();

  if (typeof dateValue === "string") {
    // Se é formato YYYY-MM-DD, adiciona horário
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return new Date(dateValue + "T00:00:00.000Z");
    }
  }

  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? new Date() : date;
};

export const formatDisplayDate = (
  dateValue: any,
  locale: string = "pt-BR",
): string => {
  const date = createSafeDate(dateValue);

  try {
    return date.toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "Data inválida";
  }
};

export const toInputDateFormat = (dateValue: any): string => {
  const date = createSafeDate(dateValue);
  return date.toISOString().split("T")[0];
};

export const fromInputDateFormat = (dateString: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString + "T00:00:00.000Z");
  }
  return new Date(dateString);
};

export const getInitials = (name: string): string =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
