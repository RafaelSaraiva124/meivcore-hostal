"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { getRoomHistory, getHistoryStats } from "@/lib/actions/rooms";
import {
  exportMonthlyHistory,
  exportYearlyHistory,
  exportStatistics,
} from "@/lib/actions/export";
import {
  processExcelDownload,
  processMultiSheetExcelDownload,
} from "@/lib/excel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  User,
  Phone,
  Home,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  Expand,
  Minimize,
  Download,
  BarChart3,
} from "lucide-react";

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

const Page = () => {
  const [allHistoryData, setAllHistoryData] = useState<HistoryRecord[]>([]);
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const organizeByMonth = useCallback((data: HistoryRecord[]) => {
    const monthsMap = new Map<string, MonthlyData>();

    data.forEach((record) => {
      const date = new Date(record.guest1CheckinDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthName = date.toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric",
      });

      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, {
          month: monthName,
          year: date.getFullYear(),
          records: [],
          totalGuests: 0,
        });
      }

      const monthData = monthsMap.get(monthKey)!;
      monthData.records.push(record);
      monthData.totalGuests += record.guest2Name ? 2 : 1;
    });

    const sortedMonthlyData = Array.from(monthsMap.values()).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      const monthA = new Date(Date.parse(a.month + " 1")).getMonth();
      const monthB = new Date(Date.parse(b.month + " 1")).getMonth();
      return monthB - monthA;
    });

    setMonthlyData(sortedMonthlyData);
  }, []);

  const loadAllHistoryData = useCallback(async () => {
    setIsLoading(true);
    setAlert(null);

    try {
      const result = await getRoomHistory({ limit: 5000 });

      if (result.success && result.data) {
        const normalizedData: HistoryRecord[] = result.data.map(
          (record: any) => ({
            id: record.id,
            roomNumber: record.roomNumber,
            guest1Name: record.guest1Name,
            guest1Phone: record.guest1Phone ?? undefined,
            guest2Name: record.guest2Name ?? undefined,
            guest2Phone: record.guest2Phone ?? undefined,
            checkoutDate: record.checkoutDate ?? undefined,
            companyName: record.companyName ?? undefined,
            roomType: record.roomType,
            guest1CheckinDate: record.checkinDate,
          }),
        );

        setAllHistoryData(normalizedData);
      } else {
        setAlert({
          type: "error",
          message: result.error || "Error al cargar el historial",
        });
      }
    } catch (error) {
      console.error("Error loading history:", error);
      setAlert({
        type: "error",
        message: "Error inesperado al cargar los datos",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filterDataByYear = useCallback(() => {
    if (allHistoryData.length === 0) return;

    const filteredByYear = allHistoryData.filter(
      (record) =>
        new Date(record.guest1CheckinDate).getFullYear() === selectedYear,
    );

    setHistoryData(filteredByYear);
    organizeByMonth(filteredByYear);
  }, [allHistoryData, selectedYear, organizeByMonth]);

  useEffect(() => {
    loadAllHistoryData();
  }, [loadAllHistoryData]);

  useEffect(() => {
    filterDataByYear();
  }, [filterDataByYear]);

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const filteredMonthlyData = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    return monthlyData
      .map((monthData) => ({
        ...monthData,
        records: monthData.records.filter(
          (record) =>
            !searchTerm ||
            record.guest1Name.toLowerCase().includes(searchLower) ||
            record.guest2Name?.toLowerCase().includes(searchLower) ||
            record.roomNumber.includes(searchTerm) ||
            record.guest1Phone?.includes(searchTerm) ||
            record.guest2Phone?.includes(searchTerm) ||
            record.companyName?.toLowerCase().includes(searchLower),
        ),
      }))
      .filter((monthData) => monthData.records.length > 0);
  }, [monthlyData, searchTerm]);

  const availableYears = useMemo(() => {
    if (allHistoryData.length === 0) {
      return [new Date().getFullYear()];
    }

    const years = Array.from(
      new Set(
        allHistoryData.map((record) =>
          new Date(record.guest1CheckinDate).getFullYear(),
        ),
      ),
    ).sort((a, b) => b - a);

    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) {
      years.unshift(currentYear);
      years.sort((a, b) => b - a);
    }

    return years;
  }, [allHistoryData]);

  // Função para exportar mês específico
  const handleExportMonth = useCallback(async (monthData: MonthlyData) => {
    try {
      const result = await exportMonthlyHistory(monthData);
      await processExcelDownload(result);

      setAlert({
        type: "success",
        message: `Arquivo ${result.fileName} baixado com sucesso!`,
      });
    } catch (error) {
      console.error("Erro ao exportar mês:", error);
      setAlert({
        type: "error",
        message:
          error instanceof Error ? error.message : "Erro ao exportar mês",
      });
    }
  }, []);

  // Função para exportar ano completo
  const handleExportYear = useCallback(async () => {
    try {
      const result = await exportYearlyHistory(
        filteredMonthlyData,
        selectedYear,
      );
      await processMultiSheetExcelDownload(result);

      setAlert({
        type: "success",
        message: `Arquivo ${result.fileName} baixado com sucesso!`,
      });
    } catch (error) {
      console.error("Erro ao exportar ano:", error);
      setAlert({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro ao exportar ano completo",
      });
    }
  }, [filteredMonthlyData, selectedYear]);

  // Função para exportar estatísticas
  const handleExportStats = useCallback(async () => {
    try {
      const result = await exportStatistics(filteredMonthlyData, selectedYear);
      await processExcelDownload(result);

      setAlert({
        type: "success",
        message: `Arquivo ${result.fileName} baixado com sucesso!`,
      });
    } catch (error) {
      console.error("Erro ao exportar estatísticas:", error);
      setAlert({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro ao exportar estatísticas",
      });
    }
  }, [filteredMonthlyData, selectedYear]);

  // Componente super compacto para mobile
  const CompactRecordCard = ({ record }: { record: HistoryRecord }) => (
    <div className="border-b border-gray-200 py-2 px-1 last:border-b-0">
      <div className="flex justify-between items-start gap-2">
        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="font-medium text-sm bg-blue-50 px-1.5 py-0.5 rounded text-blue-700">
              {record.roomNumber}
            </span>
            <span className="text-xs text-gray-500 uppercase">
              {record.roomType}
            </span>
            {record.checkoutDate ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : (
              <Clock className="h-3 w-3 text-blue-500" />
            )}
          </div>

          <div className="text-sm font-medium truncate">
            {record.guest1Name}
            {record.guest2Name && (
              <span className="text-sm text-gray-600 font-medium">
                {" "}
                & {record.guest2Name}
              </span>
            )}
          </div>

          {record.companyName && (
            <div className="text-xs text-blue-600 truncate flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {record.companyName}
            </div>
          )}
        </div>

        {/* Datas e telefone */}
        <div className="text-right text-xs text-gray-500 flex-shrink-0">
          <div className="text-green-600 font-medium">
            {formatDate(record.guest1CheckinDate)}
          </div>
          <div className="text-red-600">
            {record.checkoutDate ? formatDate(record.checkoutDate) : "Ativo"}
          </div>
          {/* Telefones - mostrar ambos se existirem */}
          {(record.guest1Phone || record.guest2Phone) && (
            <div className="flex flex-col items-end gap-1 mt-1">
              {record.guest1Phone && (
                <a
                  href={`tel:${record.guest1Phone}`}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                  title={record.guest1Name}
                >
                  <span className="text-xs text-gray-400">1</span>
                  <Phone className="h-3 w-3" />
                  <span className="truncate max-w-[70px] text-xs">
                    {record.guest1Phone}
                  </span>
                </a>
              )}
              {record.guest2Phone && (
                <a
                  href={`tel:${record.guest2Phone}`}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                  title={record.guest2Name}
                >
                  <span className="text-xs text-gray-400">2</span>
                  <Phone className="h-3 w-3" />
                  <span className="truncate max-w-[70px] text-xs">
                    {record.guest2Phone}
                  </span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-6 space-y-3 sm:space-y-6">
      {/* Header ultra compacto */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
          <div>
            <h1 className="text-lg sm:text-3xl font-bold">Histórico</h1>
            <div className="flex gap-4 text-xs sm:text-sm text-gray-600 mt-1 sm:hidden">
              <span>
                {filteredMonthlyData.reduce(
                  (sum, month) => sum + month.records.length,
                  0,
                )}{" "}
                reservas
              </span>
              <span>
                {filteredMonthlyData.reduce(
                  (sum, month) => sum + month.totalGuests,
                  0,
                )}{" "}
                hóspedes
              </span>
            </div>
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full sm:w-auto px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Controles compactos */}
      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 py-1.5 text-sm"
            />
          </div>
          <Button
            onClick={() =>
              setExpandedMonths(
                expandedMonths.size === filteredMonthlyData.length
                  ? new Set()
                  : new Set(
                      filteredMonthlyData.map((_, index) => index.toString()),
                    ),
              )
            }
            variant="outline"
            size="sm"
            className="px-2"
          >
            {expandedMonths.size === filteredMonthlyData.length ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Expand className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Botões de exportar */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            onClick={handleExportYear}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-green-700 border-green-300 hover:bg-green-50"
            disabled={historyData.length === 0}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Excel Completo</span>
            <span className="sm:hidden">Excel {selectedYear}</span>
          </Button>

          <Button
            onClick={handleExportStats}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-blue-700 border-blue-300 hover:bg-blue-50"
            disabled={historyData.length === 0}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Estatísticas</span>
            <span className="sm:hidden">Stats</span>
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {alert && (
        <Alert
          className={`p-2 ${alert.type === "success" ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}
        >
          <div className="flex items-center gap-2">
            {alert.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription
              className={`text-sm ${alert.type === "success" ? "text-green-800" : "text-red-800"}`}
            >
              {alert.message}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Lista ultra compacta */}
      <div className="space-y-2 sm:space-y-4">
        {filteredMonthlyData.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-gray-500 text-sm">
              {searchTerm
                ? "Nenhum resultado encontrado."
                : "Não há registros para este ano."}
            </div>
          </div>
        ) : (
          filteredMonthlyData.map((monthData, index) => {
            const monthKey = index.toString();
            const isExpanded = expandedMonths.has(monthKey);

            return (
              <div
                key={monthKey}
                className="bg-white border rounded-lg shadow-sm overflow-hidden"
              >
                {/* Header do mês compacto */}
                <div
                  className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleMonth(monthKey)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-600" />
                    )}
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold capitalize">
                        {monthData.month}
                      </h3>
                    </div>
                  </div>

                  <div className="flex gap-2 text-xs">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {monthData.records.length}
                    </span>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                      {monthData.totalGuests}
                    </span>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportMonth(monthData);
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                      title="Exportar este mês"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t">
                    {/* Vista de tabela para desktop */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-2 font-medium">
                              Quarto
                            </th>
                            <th className="text-left p-2 font-medium">
                              Empresa
                            </th>
                            <th className="text-left p-2 font-medium">
                              Hóspede(s)
                            </th>
                            <th className="text-left p-2 font-medium">
                              Telefone
                            </th>
                            <th className="text-left p-2 font-medium">
                              Check-in
                            </th>
                            <th className="text-left p-2 font-medium">
                              Check-out
                            </th>
                            <th className="text-left p-2 font-medium">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {monthData.records
                            .sort(
                              (a, b) =>
                                new Date(b.guest1CheckinDate).getTime() -
                                new Date(a.guest1CheckinDate).getTime(),
                            )
                            .map((record) => (
                              <tr key={record.id} className="hover:bg-gray-50">
                                <td className="p-2">
                                  <span className="font-medium bg-blue-50 px-2 py-1 rounded text-blue-700">
                                    {record.roomNumber}
                                  </span>
                                </td>
                                <td className="p-2 text-gray-700 truncate max-w-[100px]">
                                  {record.companyName || "-"}
                                </td>
                                <td className="p-2">
                                  <div>
                                    <div className="font-medium">
                                      {record.guest1Name}
                                      {record.guest2Name && (
                                        <span className="text-gray-600 font-medium">
                                          {" "}
                                          & {record.guest2Name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-2">
                                  {(record.guest1Phone ||
                                    record.guest2Phone) && (
                                    <div className="text-sm space-y-1">
                                      {record.guest1Phone && (
                                        <a
                                          href={`tel:${record.guest1Phone}`}
                                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                                          title={record.guest1Name}
                                        >
                                          <span className="text-xs text-gray-400 w-3">
                                            1
                                          </span>
                                          <Phone className="h-3 w-3" />
                                          <span>{record.guest1Phone}</span>
                                        </a>
                                      )}
                                      {record.guest2Phone && (
                                        <a
                                          href={`tel:${record.guest2Phone}`}
                                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                                          title={record.guest2Name}
                                        >
                                          <span className="text-xs text-gray-400 w-3">
                                            2
                                          </span>
                                          <Phone className="h-3 w-3" />
                                          <span>{record.guest2Phone}</span>
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2">
                                  <span className="text-green-700 font-medium">
                                    {formatDate(record.guest1CheckinDate)}
                                  </span>
                                </td>
                                <td className="p-2">
                                  {record.checkoutDate ? (
                                    <span className="text-red-700 font-medium">
                                      {formatDate(record.checkoutDate)}
                                    </span>
                                  ) : (
                                    <span className="text-blue-600 font-medium">
                                      Ativo
                                    </span>
                                  )}
                                </td>
                                <td className="p-2">
                                  {record.checkoutDate ? (
                                    <span className="flex items-center gap-1 text-green-600 text-xs">
                                      <CheckCircle className="h-3 w-3" />
                                      Finalizada
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-blue-600 text-xs">
                                      <Clock className="h-3 w-3" />
                                      Ativa
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Vista super compacta para mobile/tablet */}
                    <div className="lg:hidden">
                      {monthData.records
                        .sort(
                          (a, b) =>
                            new Date(b.guest1CheckinDate).getTime() -
                            new Date(a.guest1CheckinDate).getTime(),
                        )
                        .map((record) => (
                          <CompactRecordCard key={record.id} record={record} />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Page;
