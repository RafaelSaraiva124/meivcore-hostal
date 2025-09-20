// /lib/actions/export.ts
"use server";

interface HistoryRecord {
  id: string;
  roomNumber: string;
  companyName?: string;
  guest1Name: string;
  guest1Phone?: string;
  guest2Name?: string;
  guest2Phone?: string;
  guest1CheckinDate: string;
  checkoutDate?: string;
  roomType: string;
}

interface MonthlyData {
  month: string;
  year: number;
  records: HistoryRecord[];
  totalGuests: number;
}

interface ExportResult {
  success: boolean;
  fileName?: string;
  error?: string;
}

// Função auxiliar para preparar dados para Excel
function prepareExcelData(records: HistoryRecord[]) {
  return records
    .sort(
      (a, b) =>
        new Date(b.guest1CheckinDate).getTime() -
        new Date(a.guest1CheckinDate).getTime(),
    )
    .map((record) => ({
      Quarto: record.roomNumber,
      "Tipo de Quarto": record.roomType,
      Empresa: record.companyName || "",
      "Hóspede 1": record.guest1Name,
      "Telefone 1": record.guest1Phone || "",
      "Hóspede 2": record.guest2Name || "",
      "Telefone 2": record.guest2Phone || "",
      "Data Check-in": new Date(record.guest1CheckinDate).toLocaleDateString(
        "pt-BR",
      ),
      "Data Check-out": record.checkoutDate
        ? new Date(record.checkoutDate).toLocaleDateString("pt-BR")
        : "Em curso",
      Status: record.checkoutDate ? "Finalizada" : "Ativa",
      "Total Hóspedes": record.guest2Name ? 2 : 1,
    }));
}

// Configuração padrão das colunas
const getColumnWidths = () => [
  { wch: 8 }, // Quarto
  { wch: 12 }, // Tipo de Quarto
  { wch: 20 }, // Empresa
  { wch: 25 }, // Hóspede 1
  { wch: 15 }, // Telefone 1
  { wch: 25 }, // Hóspede 2
  { wch: 15 }, // Telefone 2
  { wch: 12 }, // Data Check-in
  { wch: 12 }, // Data Check-out
  { wch: 10 }, // Status
  { wch: 10 }, // Total Hóspedes
];

// Exportar histórico mensal para Excel
export async function exportMonthlyHistory(
  monthData: MonthlyData,
): Promise<ExportResult> {
  try {
    if (monthData.records.length === 0) {
      return {
        success: false,
        error: "Não há dados para exportar neste mês",
      };
    }

    // Preparar dados
    const excelData = prepareExcelData(monthData.records);

    // Nome do arquivo
    const monthName = monthData.month.toLowerCase().replace(/\s+/g, "_");
    const fileName = `historico_${monthName}.xlsx`;

    // Retornar dados preparados para o cliente processar
    return {
      success: true,
      fileName,
      // @ts-ignore - dados serão processados no cliente
      data: excelData,
      sheetName: monthName,
      columnWidths: getColumnWidths(),
    };
  } catch (error) {
    console.error("Erro ao preparar exportação mensal:", error);
    return {
      success: false,
      error: "Erro ao preparar dados para exportação",
    };
  }
}

// Exportar histórico anual para Excel (múltiplas abas)
export async function exportYearlyHistory(
  monthlyData: MonthlyData[],
  year: number,
): Promise<ExportResult> {
  try {
    if (monthlyData.length === 0) {
      return {
        success: false,
        error: "Não há dados para exportar",
      };
    }

    // Preparar dados para cada mês
    const sheetsData = monthlyData.map((monthData) => {
      const excelData = prepareExcelData(monthData.records);
      const sheetName =
        monthData.month.length > 31
          ? monthData.month.substring(0, 28) + "..."
          : monthData.month;

      return {
        name: sheetName,
        data: excelData,
      };
    });

    const fileName = `historico_completo_${year}.xlsx`;

    return {
      success: true,
      fileName,
      // @ts-ignore - dados serão processados no cliente
      sheetsData,
      columnWidths: getColumnWidths(),
    };
  } catch (error) {
    console.error("Erro ao preparar exportação anual:", error);
    return {
      success: false,
      error: "Erro ao preparar dados para exportação",
    };
  }
}

// Gerar dados de estatísticas para Excel
export async function exportStatistics(
  monthlyData: MonthlyData[],
  year: number,
): Promise<ExportResult> {
  try {
    const statsData = monthlyData.map((monthData) => ({
      Mês: monthData.month,
      Ano: monthData.year,
      "Total de Reservas": monthData.records.length,
      "Total de Hóspedes": monthData.totalGuests,
      "Reservas Ativas": monthData.records.filter((r) => !r.checkoutDate)
        .length,
      "Reservas Finalizadas": monthData.records.filter((r) => r.checkoutDate)
        .length,
      "Taxa de Ocupação":
        monthData.records.length > 0
          ? `${((monthData.records.filter((r) => r.checkoutDate).length / monthData.records.length) * 100).toFixed(1)}%`
          : "0%",
      "Empresas Diferentes": new Set(
        monthData.records.map((r) => r.companyName).filter(Boolean),
      ).size,
    }));

    const fileName = `estatisticas_${year}.xlsx`;

    return {
      success: true,
      fileName,
      // @ts-ignore
      data: statsData,
      sheetName: `Estatísticas ${year}`,
      columnWidths: [
        { wch: 15 }, // Mês
        { wch: 8 }, // Ano
        { wch: 15 }, // Total de Reservas
        { wch: 15 }, // Total de Hóspedes
        { wch: 15 }, // Reservas Ativas
        { wch: 18 }, // Reservas Finalizadas
        { wch: 15 }, // Taxa de Ocupação
        { wch: 18 }, // Empresas Diferentes
      ],
    };
  } catch (error) {
    console.error("Erro ao preparar estatísticas:", error);
    return {
      success: false,
      error: "Erro ao gerar estatísticas",
    };
  }
}
