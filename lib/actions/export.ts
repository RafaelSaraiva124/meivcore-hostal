// /lib/actions/export.ts
"use server";

interface HistoryRecord {
  id: string;
  roomNumber: string;
  companyName?: string;
  guest1Name: string;
  guest1Phone?: string;
  guest1CheckinDate: string;
  guest2Name?: string;
  guest2Phone?: string;
  guest2CheckinDate?: string;
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
      "Check-in H1": new Date(record.guest1CheckinDate).toLocaleDateString(
        "pt-BR",
      ),
      "Hóspede 2": record.guest2Name || "",
      "Telefone 2": record.guest2Phone || "",
      "Check-in H2": record.guest2CheckinDate
        ? new Date(record.guest2CheckinDate).toLocaleDateString("pt-BR")
        : "",
      "Data Check-out": record.checkoutDate
        ? new Date(record.checkoutDate).toLocaleDateString("pt-BR")
        : "Em curso",
      Status: record.checkoutDate ? "Finalizada" : "Ativa",
      "Total Hóspedes": record.guest2Name ? 2 : 1,
    }));
}

// Função para preparar dados detalhados (cada hóspede em linha separada)
function prepareDetailedExcelData(records: HistoryRecord[]) {
  const detailedRows: any[] = [];

  records
    .sort(
      (a, b) =>
        new Date(b.guest1CheckinDate).getTime() -
        new Date(a.guest1CheckinDate).getTime(),
    )
    .forEach((record) => {
      // Linha para o primeiro hóspede
      detailedRows.push({
        Quarto: record.roomNumber,
        "Tipo de Quarto": record.roomType,
        Empresa: record.companyName || "",
        "Nº Hóspede": 1,
        "Nome do Hóspede": record.guest1Name,
        Telefone: record.guest1Phone || "",
        "Data Check-in": new Date(record.guest1CheckinDate).toLocaleDateString(
          "pt-BR",
        ),
        "Data Check-out": record.checkoutDate
          ? new Date(record.checkoutDate).toLocaleDateString("pt-BR")
          : "Em curso",
        Status: record.checkoutDate ? "Finalizada" : "Ativa",
        "ID Reserva": record.id,
      });

      // Linha para o segundo hóspede (se existir)
      if (record.guest2Name) {
        detailedRows.push({
          Quarto: record.roomNumber,
          "Tipo de Quarto": record.roomType,
          Empresa: record.companyName || "",
          "Nº Hóspede": 2,
          "Nome do Hóspede": record.guest2Name,
          Telefone: record.guest2Phone || "",
          "Data Check-in": record.guest2CheckinDate
            ? new Date(record.guest2CheckinDate).toLocaleDateString("pt-BR")
            : new Date(record.guest1CheckinDate).toLocaleDateString("pt-BR"),
          "Data Check-out": record.checkoutDate
            ? new Date(record.checkoutDate).toLocaleDateString("pt-BR")
            : "Em curso",
          Status: record.checkoutDate ? "Finalizada" : "Ativa",
          "ID Reserva": record.id,
        });
      }
    });

  return detailedRows;
}

// Configuração das colunas para dados resumidos
const getColumnWidths = () => [
  { wch: 8 }, // Quarto
  { wch: 12 }, // Tipo de Quarto
  { wch: 20 }, // Empresa
  { wch: 25 }, // Hóspede 1
  { wch: 15 }, // Telefone 1
  { wch: 12 }, // Check-in H1
  { wch: 25 }, // Hóspede 2
  { wch: 15 }, // Telefone 2
  { wch: 12 }, // Check-in H2
  { wch: 12 }, // Data Check-out
  { wch: 10 }, // Status
  { wch: 10 }, // Total Hóspedes
];

// Configuração das colunas para dados detalhados
const getDetailedColumnWidths = () => [
  { wch: 8 }, // Quarto
  { wch: 12 }, // Tipo de Quarto
  { wch: 20 }, // Empresa
  { wch: 8 }, // Nº Hóspede
  { wch: 25 }, // Nome do Hóspede
  { wch: 15 }, // Telefone
  { wch: 12 }, // Data Check-in
  { wch: 12 }, // Data Check-out
  { wch: 10 }, // Status
  { wch: 15 }, // ID Reserva
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

    // Preparar ambos os formatos de dados
    const summaryData = prepareExcelData(monthData.records);
    const detailedData = prepareDetailedExcelData(monthData.records);

    // Nome do arquivo
    const monthName = monthData.month.toLowerCase().replace(/\s+/g, "_");
    const fileName = `historico_${monthName}.xlsx`;

    // Retornar dados preparados para o cliente processar
    return {
      success: true,
      fileName,
      // @ts-ignore - dados serão processados no cliente
      sheetsData: [
        {
          name: "Resumo",
          data: summaryData,
          columnWidths: getColumnWidths(),
        },
        {
          name: "Detalhado",
          data: detailedData,
          columnWidths: getDetailedColumnWidths(),
        },
      ],
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

    // Preparar dados para cada mês + aba resumo anual
    const sheetsData: any[] = [];

    // Aba com resumo anual
    const allRecords = monthlyData.flatMap((m) => m.records);
    const annualSummary = prepareExcelData(allRecords);
    const annualDetailed = prepareDetailedExcelData(allRecords);

    sheetsData.push(
      {
        name: `Resumo ${year}`,
        data: annualSummary,
        columnWidths: getColumnWidths(),
      },
      {
        name: `Detalhado ${year}`,
        data: annualDetailed,
        columnWidths: getDetailedColumnWidths(),
      },
    );

    // Abas para cada mês
    monthlyData.forEach((monthData) => {
      const summaryData = prepareExcelData(monthData.records);
      const sheetName =
        monthData.month.length > 28
          ? monthData.month.substring(0, 25) + "..."
          : monthData.month;

      sheetsData.push({
        name: sheetName,
        data: summaryData,
        columnWidths: getColumnWidths(),
      });
    });

    const fileName = `historico_completo_${year}.xlsx`;

    return {
      success: true,
      fileName,
      // @ts-ignore - dados serão processados no cliente
      sheetsData,
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
    // Estatísticas mensais
    const monthlyStatsData = monthlyData.map((monthData) => ({
      Mês: monthData.month,
      Ano: monthData.year,
      "Total de Reservas": monthData.records.length,
      "Total de Hóspedes": monthData.totalGuests,
      "Reservas Ativas": monthData.records.filter((r) => !r.checkoutDate)
        .length,
      "Reservas Finalizadas": monthData.records.filter((r) => r.checkoutDate)
        .length,
      "Taxa de Finalização":
        monthData.records.length > 0
          ? `${((monthData.records.filter((r) => r.checkoutDate).length / monthData.records.length) * 100).toFixed(1)}%`
          : "0%",
      "Empresas Diferentes": new Set(
        monthData.records.map((r) => r.companyName).filter(Boolean),
      ).size,
      "Quartos Singles": monthData.records.filter(
        (r) => r.roomType === "single",
      ).length,
      "Quartos Duplos": monthData.records.filter((r) => r.roomType === "double")
        .length,
    }));

    // Estatísticas anuais consolidadas
    const allRecords = monthlyData.flatMap((m) => m.records);
    const totalGuests = monthlyData.reduce((sum, m) => sum + m.totalGuests, 0);
    const uniqueCompanies = new Set(
      allRecords.map((r) => r.companyName).filter(Boolean),
    );

    const annualSummaryData = [
      {
        Indicador: "Total de Reservas no Ano",
        Valor: allRecords.length,
      },
      {
        Indicador: "Total de Hóspedes no Ano",
        Valor: totalGuests,
      },
      {
        Indicador: "Reservas Ativas",
        Valor: allRecords.filter((r) => !r.checkoutDate).length,
      },
      {
        Indicador: "Reservas Finalizadas",
        Valor: allRecords.filter((r) => r.checkoutDate).length,
      },
      {
        Indicador: "Taxa de Finalização Anual",
        Valor:
          allRecords.length > 0
            ? `${((allRecords.filter((r) => r.checkoutDate).length / allRecords.length) * 100).toFixed(1)}%`
            : "0%",
      },
      {
        Indicador: "Empresas Únicas",
        Valor: uniqueCompanies.size,
      },
      {
        Indicador: "Reservas em Quartos Singles",
        Valor: allRecords.filter((r) => r.roomType === "single").length,
      },
      {
        Indicador: "Reservas em Quartos Duplos",
        Valor: allRecords.filter((r) => r.roomType === "double").length,
      },
      {
        Indicador: "Média de Hóspedes por Reserva",
        Valor:
          allRecords.length > 0
            ? (totalGuests / allRecords.length).toFixed(2)
            : "0",
      },
    ];

    const fileName = `estatisticas_${year}.xlsx`;

    return {
      success: true,
      fileName,
      // @ts-ignore
      sheetsData: [
        {
          name: `Resumo Anual`,
          data: annualSummaryData,
          columnWidths: [
            { wch: 30 }, // Indicador
            { wch: 15 }, // Valor
          ],
        },
        {
          name: `Por Mês`,
          data: monthlyStatsData,
          columnWidths: [
            { wch: 15 }, // Mês
            { wch: 8 }, // Ano
            { wch: 15 }, // Total de Reservas
            { wch: 15 }, // Total de Hóspedes
            { wch: 15 }, // Reservas Ativas
            { wch: 18 }, // Reservas Finalizadas
            { wch: 15 }, // Taxa de Finalização
            { wch: 18 }, // Empresas Diferentes
            { wch: 15 }, // Quartos Singles
            { wch: 15 }, // Quartos Duplos
          ],
        },
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
