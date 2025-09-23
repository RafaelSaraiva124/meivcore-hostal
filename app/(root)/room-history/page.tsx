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
  ArrowRight,
} from "lucide-react";

interface HistoryRecord {
  id: string;
  roomNumber: string;
  companyName?: string;
  guest1Name: string;
  guest1Phone?: string;
  guest1CheckinDate: string;
  guest1CheckoutDate?: string;
  guest2Name?: string;
  guest2Phone?: string;
  guest2CheckinDate?: string;
  guest2CheckoutDate?: string;
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
            guest1CheckoutDate: record.guest1CheckoutDate ?? undefined,
            guest2Name: record.guest2Name ?? undefined,
            guest2Phone: record.guest2Phone ?? undefined,
            guest2CheckinDate: record.guest2CheckinDate ?? undefined,
            guest2CheckoutDate: record.guest2CheckoutDate ?? undefined,
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

  const getReservationStatus = (record: HistoryRecord) => {
    if (record.roomType === "single") {
      return record.guest1CheckoutDate || record.checkoutDate
        ? "Terminado"
        : "Ativa";
    }

    if (record.roomType === "double") {
      const guest1Active = !record.guest1CheckoutDate;
      const guest2Active = record.guest2Name && !record.guest2CheckoutDate;

      if (record.checkoutDate) return "Terminado";

      if (
        record.guest1CheckoutDate &&
        (!record.guest2Name || record.guest2CheckoutDate)
      ) {
        return "Terminado";
      }

      if (guest1Active || guest2Active) return "Ativa";

      return "Terminado";
    }

    return record.checkoutDate ? "Terminado" : "Ativa";
  };

  // Componente redesenhado para as informações de hóspede
  const GuestCard = ({
    name,
    phone,
    checkinDate,
    checkoutDate,
    guestNumber,
    isCompact = false,
  }: {
    name: string;
    phone?: string;
    checkinDate: string;
    checkoutDate?: string;
    guestNumber: 1 | 2;
    isCompact?: boolean;
  }) => (
    <div className={`bg-gray-50 rounded-lg p-3 ${isCompact ? "p-2" : "p-3"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium`}
          >
            {guestNumber}
          </div>
          <span
            className={`font-medium text-gray-900 ${isCompact ? "text-sm" : "text-base"}`}
          >
            {name}
          </span>
        </div>
        <div className="flex items-center">
          {checkoutDate ? (
            <div className="flex items-center gap-1 text-red-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Salido</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-green-600">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Activo</span>
            </div>
          )}
        </div>
      </div>

      {phone && (
        <div className="mb-2">
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors text-sm"
          >
            <Phone className="h-3 w-3" />
            <span>{phone}</span>
          </a>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-medium">
          {formatDate(checkinDate)}
        </span>
        {checkoutDate && (
          <>
            <ArrowRight className="h-3 w-3 text-gray-400" />
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-medium">
              {formatDate(checkoutDate)}
            </span>
          </>
        )}
      </div>
    </div>
  );

  const CompactRecordCard = ({ record }: { record: HistoryRecord }) => {
    const reservationStatus = getReservationStatus(record);
    const isActive = reservationStatus === "Ativa";

    return (
      <div className="bg-white border-b border-gray-200 p-4 last:border-b-0 hover:bg-gray-50 transition-colors">
        {/* Header do Card */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white px-3 py-1 rounded-lg font-bold text-sm">
              {record.roomNumber}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase font-medium">
                {record.roomType === "single"
                  ? "Habitación Solteiro"
                  : "Habitación Duplo"}
              </span>
            </div>
          </div>
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              isActive
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {isActive ? (
              <Clock className="h-3 w-3" />
            ) : (
              <CheckCircle className="h-3 w-3" />
            )}
            {isActive ? "Ativa" : "Terminado"}
          </div>
        </div>

        {/* Empresa se existir */}
        {record.companyName && (
          <div className="mb-3 p-2 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              <Building2 className="h-4 w-4" />
              <span className="text-sm font-medium">{record.companyName}</span>
            </div>
          </div>
        )}

        {/* Hóspedes */}
        <div className="space-y-3">
          <GuestCard
            name={record.guest1Name}
            phone={record.guest1Phone}
            checkinDate={record.guest1CheckinDate}
            checkoutDate={record.guest1CheckoutDate}
            guestNumber={1}
            isCompact={true}
          />

          {record.guest2Name && (
            <GuestCard
              name={record.guest2Name}
              phone={record.guest2Phone}
              checkinDate={record.guest2CheckinDate || record.guest1CheckinDate}
              checkoutDate={record.guest2CheckoutDate}
              guestNumber={2}
              isCompact={true}
            />
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                Historial de reservas
              </h1>
              <div className="flex gap-6 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {filteredMonthlyData.reduce(
                    (sum, month) => sum + month.records.length,
                    0,
                  )}{" "}
                  reservas
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {filteredMonthlyData.reduce(
                    (sum, month) => sum + month.totalGuests,
                    0,
                  )}{" "}
                  Huéspedes
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, habitación, teléfono o empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <Button
                onClick={() =>
                  setExpandedMonths(
                    expandedMonths.size === filteredMonthlyData.length
                      ? new Set()
                      : new Set(
                          filteredMonthlyData.map((_, index) =>
                            index.toString(),
                          ),
                        ),
                  )
                }
                variant="outline"
                className="h-10 px-4"
              >
                {expandedMonths.size === filteredMonthlyData.length ? (
                  <>
                    <Minimize className="h-4 w-4 mr-2" />
                    Fechar Todos
                  </>
                ) : (
                  <>
                    <Expand className="h-4 w-4 mr-2" />
                    Abrir Todos
                  </>
                )}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleExportYear}
                variant="outline"
                className="flex items-center gap-2 text-green-700 border-green-300 hover:bg-green-50 h-10"
                disabled={historyData.length === 0}
              >
                <Download className="h-4 w-4" />
                Excel {selectedYear}
              </Button>
              <Button
                onClick={handleExportStats}
                variant="outline"
                className="flex items-center gap-2 text-blue-700 border-blue-300 hover:bg-blue-50 h-10"
                disabled={historyData.length === 0}
              >
                <BarChart3 className="h-4 w-4" />
                Estatísticas
              </Button>
            </div>
          </div>
        </div>

        {/* Alertas */}
        {alert && (
          <Alert
            className={`${
              alert.type === "success"
                ? "border-green-300 bg-green-50"
                : "border-red-300 bg-red-50"
            }`}
          >
            <div className="flex items-center gap-2">
              {alert.type === "success" ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription
                className={`${
                  alert.type === "success" ? "text-green-800" : "text-red-800"
                }`}
              >
                {alert.message}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Conteúdo Principal */}
        <div className="space-y-4">
          {filteredMonthlyData.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Calendar className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? "Nenhum resultado encontrado" : "Sem registros"}
              </h3>
              <p className="text-gray-500">
                {searchTerm
                  ? "Tente ajustar os termos de busca."
                  : `Não há registros para o ano de ${selectedYear}.`}
              </p>
            </div>
          ) : (
            filteredMonthlyData.map((monthData, index) => {
              const monthKey = index.toString();
              const isExpanded = expandedMonths.has(monthKey);

              return (
                <div
                  key={monthKey}
                  className="bg-white rounded-xl shadow-sm overflow-hidden"
                >
                  {/* Header do Mês */}
                  <div
                    className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 transition-colors border-b"
                    onClick={() => toggleMonth(monthKey)}
                  >
                    <div className="flex items-center gap-4">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 capitalize">
                            {monthData.month}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {monthData.records.length} reservas •{" "}
                            {monthData.totalGuests} Huéspedes
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportMonth(monthData);
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:bg-green-50"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Conteúdo do Mês */}
                  {isExpanded && (
                    <div>
                      {/* Vista Desktop (Tabela) */}
                      <div className="hidden lg:block">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-4 font-medium text-gray-700">
                                Habitación
                              </th>
                              <th className="text-left p-4 font-medium text-gray-700">
                                Empresa
                              </th>
                              <th className="text-left p-4 font-medium text-gray-700">
                                Huéspedes
                              </th>
                              <th className="text-left p-4 font-medium text-gray-700">
                                Estado
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
                              .map((record) => {
                                const status = getReservationStatus(record);
                                const isActive = status === "Ativa";

                                return (
                                  <tr
                                    key={record.id}
                                    className="hover:bg-gray-50"
                                  >
                                    <td className="p-4">
                                      <div className="flex items-center gap-2">
                                        <span className="bg-blue-600 text-white px-3 py-1 rounded-lg font-bold text-sm">
                                          {record.roomNumber}
                                        </span>
                                        <span className="text-xs text-gray-500 uppercase">
                                          {record.roomType === "single"
                                            ? "Solteiro"
                                            : "Duplo"}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      {record.companyName ? (
                                        <div className="flex items-center gap-2 text-blue-700">
                                          <Building2 className="h-4 w-4" />
                                          <span className="text-sm font-medium max-w-32 truncate">
                                            {record.companyName}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="p-4">
                                      <div
                                        className={`flex gap-3 ${record.guest2Name ? "grid grid-cols-2" : ""}`}
                                      >
                                        <GuestCard
                                          name={record.guest1Name}
                                          phone={record.guest1Phone}
                                          checkinDate={record.guest1CheckinDate}
                                          checkoutDate={
                                            record.guest1CheckoutDate
                                          }
                                          guestNumber={1}
                                        />
                                        {record.guest2Name && (
                                          <GuestCard
                                            name={record.guest2Name}
                                            phone={record.guest2Phone}
                                            checkinDate={
                                              record.guest2CheckinDate ||
                                              record.guest1CheckinDate
                                            }
                                            checkoutDate={
                                              record.guest2CheckoutDate
                                            }
                                            guestNumber={2}
                                          />
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <div
                                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                                          isActive
                                            ? "bg-green-100 text-green-700"
                                            : "bg-red-100 text-red-700"
                                        }`}
                                      >
                                        {isActive ? (
                                          <Clock className="h-4 w-4" />
                                        ) : (
                                          <CheckCircle className="h-4 w-4" />
                                        )}
                                        {status}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>

                      {/* Vista Mobile */}
                      <div className="lg:hidden divide-y divide-gray-200">
                        {monthData.records
                          .sort(
                            (a, b) =>
                              new Date(b.guest1CheckinDate).getTime() -
                              new Date(a.guest1CheckinDate).getTime(),
                          )
                          .map((record) => (
                            <CompactRecordCard
                              key={record.id}
                              record={record}
                            />
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
    </div>
  );
};

export default Page;
