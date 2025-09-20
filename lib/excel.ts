// /lib/utils/excel.ts
"use client";

// Função para carregar XLSX dinamicamente
const loadXLSX = async () => {
  if (typeof window !== "undefined" && !(window as any).XLSX) {
    // Carregar a biblioteca do CDN
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

    return new Promise((resolve, reject) => {
      script.onload = () => resolve((window as any).XLSX);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return (window as any).XLSX;
};

// Processar exportação de planilha única
export async function processExcelDownload(result: any): Promise<void> {
  if (!result.success) {
    throw new Error(result.error);
  }

  const XLSX = await loadXLSX();

  // Criar workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(result.data);

  // Aplicar larguras das colunas
  if (result.columnWidths) {
    ws["!cols"] = result.columnWidths;
  }

  // Adicionar worksheet
  XLSX.utils.book_append_sheet(wb, ws, result.sheetName || "Dados");

  // Fazer download
  XLSX.writeFile(wb, result.fileName);
}

// Processar exportação de múltiplas planilhas
export async function processMultiSheetExcelDownload(
  result: any,
): Promise<void> {
  if (!result.success) {
    throw new Error(result.error);
  }

  const XLSX = await loadXLSX();

  // Criar workbook
  const wb = XLSX.utils.book_new();

  // Adicionar cada planilha
  result.sheetsData.forEach((sheet: any) => {
    const ws = XLSX.utils.json_to_sheet(sheet.data);

    // Aplicar larguras das colunas
    if (result.columnWidths) {
      ws["!cols"] = result.columnWidths;
    }

    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  // Fazer download
  XLSX.writeFile(wb, result.fileName);
}

// Função auxiliar para validar dados antes da exportação
export function validateExportData(data: any[]): boolean {
  return Array.isArray(data) && data.length > 0;
}

// Função para formatar nomes de arquivo
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-z0-9áéíóúàèìòùâêîôûãõç\s-_]/gi, "")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

// Tipos para TypeScript
export interface ExportOptions {
  fileName?: string;
  sheetName?: string;
  columnWidths?: Array<{ wch: number }>;
}

export interface MultiSheetData {
  name: string;
  data: any[];
}

export interface ExportResult {
  success: boolean;
  fileName?: string;
  error?: string;
  data?: any[];
  sheetsData?: MultiSheetData[];
  sheetName?: string;
  columnWidths?: Array<{ wch: number }>;
}
