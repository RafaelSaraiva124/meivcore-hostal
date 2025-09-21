"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { getRoomHistory } from "@/lib/actions/rooms";
import {
  exportMonthlyHistory,
  exportYearlyHistory,
  exportStatistics,
} from "@/lib/actions/export";
import {
  processExcelDownload,
  processMultiSheetExcelDownload,
  processAnyExcelDownload,
} from "@/lib/excel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Phone,
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
  User,
} from "lucide-react";

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
            guest1CheckinDate: record.guest1CheckinDate,
            guest2Name: record.guest2Name ?? undefined,
            guest2Phone: record.guest2Phone ?? undefined,
            guest2CheckinDate: record.guest2CheckinDate ?? undefined,
            checkoutDate: record.checkoutDate ?? undefined,
            companyName: record.companyName ?? undefined,
            roomType: record.roomType,
          }),
        );

        setAllHistoryData(normalizedData);
      } else {
        setAlert({
          type: "error",
          message: result.error || "Erro ao carregar o histórico",
        });
      }
    } catch (error) {
      console.error("Erro carregando histórico:", error);
      setAlert({
        type: "error",
        message: "Erro inesperado ao carregar os dados",
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

  const handleExportMonth = useCallback(async (monthData: MonthlyData) => {
    try {
      const result = await exportMonthlyHistory(monthData);
      await processAnyExcelDownload(result);

      setAlert({
        type: "success",
        message: `Arquivo ${result.fileName} baixado com sucesso!`,
      });
    } catch (error) {
      console.error("Erro exportando mês:", error);
      setAlert({
        type: "error",
        message:
          error instanceof Error ? error.message : "Erro ao exportar mês",
      });
    }
  }, []);

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
      console.error("Erro exportando ano:", error);
      setAlert({
        type: "error",
        message:
          error instanceof Error ? error.message : "Erro ao exportar ano",
      });
    }
  }, [filteredMonthlyData, selectedYear]);

  const handleExportStats = useCallback(async () => {
    try {
      const result = await exportStatistics(filteredMonthlyData, selectedYear);
      await processAnyExcelDownload(result);

      setAlert({
        type: "success",
        message: `Arquivo ${result.fileName} baixado com sucesso!`,
      });
    } catch (error) {
      console.error("Erro exportando estatísticas:", error);
      setAlert({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro ao exportar estatísticas",
      });
    }
  }, [filteredMonthlyData, selectedYear]);

  // Componente para exibir informações de um hóspede
  const GuestInfo = ({
    guestNumber,
    name,
    phone,
    checkinDate,
    isCompact = false,
  }: {
    guestNumber: 1 | 2;
    name: string;
    phone?: string;
    checkinDate: string;
    isCompact?: boolean;
  }) => (
    <div
      className={`${isCompact ? "space-y-1" : "space-y-2"} ${guestNumber === 2 ? "border-l-2 border-blue-200 pl-2" : ""}`}
    >
      <div className="flex items-center gap-1">
        <User className="h-3 w-3 text-gray-500" />
        <span className="text-xs text-gray-500">Hóspede {guestNumber}</span>
      </div>
      <div className={`font-medium ${isCompact ? "text-xs" : "text-sm"}`}>
        {name}
      </div>
      {phone && (
        <a
          href={`tel:${phone}`}
          className={`flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors ${isCompact ? "text-xs" : "text-sm"}`}
        >
          <Phone className="h-3 w-3" />
          <span>{phone}</span>
        </a>
      )}
      <div
        className={`text-green-600 font-medium ${isCompact ? "text-xs" : "text-sm"}`}
      >
        Check-in: {formatDate(checkinDate)}
      </div>
    </div>
  );

  const CompactRecordCard = ({ record }: { record: HistoryRecord }) => (
    <div className="border-b border-gray-200 py-3 px-2 last:border-b-0">
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm bg-blue-50 px-2 py-1 rounded text-blue-700">
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

        <div className="text-right text-xs">
          <div
            className={`font-medium ${record.checkoutDate ? "text-red-600" : "text-blue-600"}`}
          >
            {record.checkoutDate ? formatDate(record.checkoutDate) : "Ativo"}
          </div>
        </div>
      </div>

      {record.companyName && (
        <div className="text-xs text-blue-600 truncate flex items-center gap-1 mb-2">
          <Building2 className="h-3 w-3" />
          {record.companyName}
        </div>
      )}

      {/* Área dos hóspedes dividida */}
      <div className={`${record.guest2Name ? "grid grid-cols-2 gap-2" : ""}`}>
        <GuestInfo
          guestNumber={1}
          name={record.guest1Name}
          phone={record.guest1Phone}
          checkinDate={record.guest1CheckinDate}
          isCompact={true}
        />

        {record.guest2Name && (
          <GuestInfo
            guestNumber={2}
            name={record.guest2Name}
            phone={record.guest2Phone}
            checkinDate={record.guest2CheckinDate || record.guest1CheckinDate}
            isCompact={true}
          />
        )}
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

      <div className="space-y-2 sm:space-y-4">
        {filteredMonthlyData.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-gray-500 text-sm">
              {searchTerm
                ? "Não foram encontrados resultados."
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
                              Hóspedes
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
                                  <div className="text-xs text-gray-500 mt-1">
                                    {record.roomType}
                                  </div>
                                </td>
                                <td className="p-2 text-gray-700 truncate max-w-[100px]">
                                  {record.companyName || "-"}
                                </td>
                                <td className="p-2">
                                  <div
                                    className={`${record.guest2Name ? "grid grid-cols-2 gap-3" : ""}`}
                                  >
                                    <GuestInfo
                                      guestNumber={1}
                                      name={record.guest1Name}
                                      phone={record.guest1Phone}
                                      checkinDate={record.guest1CheckinDate}
                                    />

                                    {record.guest2Name && (
                                      <GuestInfo
                                        guestNumber={2}
                                        name={record.guest2Name}
                                        phone={record.guest2Phone}
                                        checkinDate={
                                          record.guest2CheckinDate ||
                                          record.guest1CheckinDate
                                        }
                                      />
                                    )}
                                  </div>
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
