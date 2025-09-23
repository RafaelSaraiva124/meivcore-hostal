import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ✅ FUNÇÃO CORRIGIDA - Para campos DATE do banco (não DATETIME)
export const toSafeDateString = (dateValue: any): string | null => {
  if (!dateValue) return null;

  // Se já é uma string no formato correto YYYY-MM-DD, retorna diretamente
  if (typeof dateValue === "string") {
    // Verifica se é formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue; // ✅ Retorna diretamente sem conversão
    }

    // Tenta converter string para Date e extrair apenas a parte da data
    try {
      const parsedDate = new Date(dateValue);
      if (isNaN(parsedDate.getTime())) return null;
      return parsedDate.toISOString().split("T")[0]; // ✅ Apenas YYYY-MM-DD
    } catch {
      return null;
    }
  }

  // Se é um objeto Date
  if (dateValue instanceof Date) {
    if (isNaN(dateValue.getTime())) return null;
    return dateValue.toISOString().split("T")[0]; // ✅ Apenas YYYY-MM-DD
  }

  // Tenta converter outros tipos
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0]; // ✅ Apenas YYYY-MM-DD
  } catch {
    return null;
  }
};

// ✅ MANTÉM A FUNÇÃO ORIGINAL PARA CASOS QUE PRECISAM DE ISO COMPLETO
export const toSafeISOString = (dateValue: any): string | null => {
  if (!dateValue) return null;

  // Se já é uma string no formato correto, retorna
  if (typeof dateValue === "string") {
    // Verifica se é formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      // ✅ CORRIGIDO: Usar timezone local em vez de UTC
      return new Date(dateValue + "T00:00:00").toISOString();
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
    // Se é formato YYYY-MM-DD, cria data local (não UTC)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      // ✅ CORRIGIDO: Evitar problemas de timezone
      const [year, month, day] = dateValue.split("-").map(Number);
      return new Date(year, month - 1, day); // Mês é 0-indexed
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

// ✅ CORRIGIDO: Para input de formulário
export const toInputDateFormat = (dateValue: any): string => {
  if (!dateValue) return "";

  // Se já é string no formato correto, retorna
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }

  const date = createSafeDate(dateValue);
  return date.toISOString().split("T")[0];
};

// ✅ CORRIGIDO: De input de formulário para Date
export const fromInputDateFormat = (dateString: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    // Usar timezone local
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
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
