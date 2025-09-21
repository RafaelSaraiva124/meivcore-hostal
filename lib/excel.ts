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

// Tipos para TypeScript
export interface ExportOptions {
  fileName?: string;
  sheetName?: string;
  columnWidths?: Array<{ wch: number }>;
}

export interface MultiSheetData {
  name: string;
  data: any[];
  columnWidths?: Array<{ wch: number }>;
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

// Processar exportação de planilha única
export async function processExcelDownload(
  result: ExportResult,
): Promise<void> {
  if (!result.success) {
    throw new Error(result.error || "Erro ao processar dados para Excel");
  }

  const XLSX = await loadXLSX();

  // Criar workbook
  const wb = XLSX.utils.book_new();

  // Verificar se temos dados diretos ou sheetsData
  if (result.sheetsData && result.sheetsData.length > 0) {
    // Usar a primeira aba dos sheetsData
    const firstSheet = result.sheetsData[0];
    if (!firstSheet.data || firstSheet.data.length === 0) {
      throw new Error("Nenhum dado encontrado para exportar");
    }

    const ws = XLSX.utils.json_to_sheet(firstSheet.data);

    // Aplicar larguras das colunas
    if (firstSheet.columnWidths) {
      ws["!cols"] = firstSheet.columnWidths;
    }

    // Adicionar aba ao workbook
    XLSX.utils.book_append_sheet(wb, ws, firstSheet.name || "Dados");
  } else if (result.data && result.data.length > 0) {
    // Formato antigo - dados diretos
    const ws = XLSX.utils.json_to_sheet(result.data);

    // Aplicar larguras das colunas
    if (result.columnWidths) {
      ws["!cols"] = result.columnWidths;
    }

    // Adicionar aba ao workbook
    XLSX.utils.book_append_sheet(wb, ws, result.sheetName || "Dados");
  } else {
    throw new Error("Nenhum dado encontrado para exportar");
  }

  // Fazer download
  if (!result.fileName) {
    throw new Error("Nome do arquivo não definido");
  }

  XLSX.writeFile(wb, result.fileName);
}

// Processar exportação de múltiplas planilhas
export async function processMultiSheetExcelDownload(
  result: ExportResult,
): Promise<void> {
  if (!result.success) {
    throw new Error(result.error || "Erro ao processar dados para Excel");
  }

  if (!result.sheetsData || result.sheetsData.length === 0) {
    throw new Error("Nenhum dado de abas encontrado para exportar");
  }

  const XLSX = await loadXLSX();

  // Criar workbook
  const wb = XLSX.utils.book_new();

  // Adicionar cada planilha
  result.sheetsData.forEach((sheet, index) => {
    if (!sheet.data || sheet.data.length === 0) {
      console.warn(`Aba ${sheet.name || index} está vazia`);
      return;
    }

    const ws = XLSX.utils.json_to_sheet(sheet.data);

    // Aplicar larguras das colunas (primeiro da sheet, depois geral)
    if (sheet.columnWidths) {
      ws["!cols"] = sheet.columnWidths;
    } else if (result.columnWidths) {
      ws["!cols"] = result.columnWidths;
    }

    // Nome da aba (limitado a 31 caracteres no Excel)
    let sheetName = sheet.name || `Aba${index + 1}`;
    if (sheetName.length > 31) {
      sheetName = sheetName.substring(0, 28) + "...";
    }

    // Garantir que o nome da aba seja único
    let finalSheetName = sheetName;
    let counter = 1;
    while (wb.SheetNames.includes(finalSheetName)) {
      finalSheetName = `${sheetName.substring(0, 25)}_${counter}`;
      counter++;
    }

    XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
  });

  if (wb.SheetNames.length === 0) {
    throw new Error("Nenhuma aba válida foi criada");
  }

  // Fazer download
  if (!result.fileName) {
    throw new Error("Nome do arquivo não definido");
  }

  XLSX.writeFile(wb, result.fileName);
}

// Função para processar qualquer tipo de export automaticamente
export async function processAnyExcelDownload(
  result: ExportResult,
): Promise<void> {
  if (!validateExportData(result)) {
    throw new Error("Dados de exportação inválidos");
  }

  // Verificar qual tipo de processamento usar
  if (result.sheetsData && result.sheetsData.length > 1) {
    // Múltiplas abas
    return await processMultiSheetExcelDownload(result);
  } else {
    // Aba única (pode ser sheetsData[0] ou data direto)
    return await processExcelDownload(result);
  }
}

// Função auxiliar para validar dados antes da exportação
export function validateExportData(result: ExportResult): boolean {
  if (!result.success) {
    console.error("Export result indica falha:", result.error);
    return false;
  }

  if (!result.fileName) {
    console.error("Nome do arquivo não definido");
    return false;
  }

  // Verificar se temos dados em algum formato
  const hasDirectData =
    result.data && Array.isArray(result.data) && result.data.length > 0;
  const hasSheetsData =
    result.sheetsData &&
    Array.isArray(result.sheetsData) &&
    result.sheetsData.some((sheet) => sheet.data && sheet.data.length > 0);

  if (!hasDirectData && !hasSheetsData) {
    console.error("Nenhum dado válido encontrado para exportação");
    return false;
  }

  return true;
}

// Função para formatar nomes de arquivo
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-z0-9áéíóúàèìòùâêîôûãõç\s-_]/gi, "")
    .replace(/\s+/g, "_")
    .toLowerCase();
}
