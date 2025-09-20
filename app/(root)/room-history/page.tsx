"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { getRoomHistory, getHistoryStats } from "@/lib/actions/rooms";
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
  // MUDANÇA: Separar dados completos dos dados filtrados
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

  // Função para organizar dados por mês
  const organizeByMonth = useCallback((data: HistoryRecord[]) => {
    const monthsMap = new Map<string, MonthlyData>();

    data.forEach((record) => {
      const date = new Date(record.guest1CheckinDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthName = date.toLocaleDateString("es-ES", {
        month: "long",
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
      // Ordenar por ano descendente e depois por mês
      if (b.year !== a.year) return b.year - a.year;
      // Extrair o número do mês do nome para ordenação correta
      const monthA = new Date(Date.parse(a.month + " 1")).getMonth();
      const monthB = new Date(Date.parse(b.month + " 1")).getMonth();
      return monthB - monthA;
    });

    setMonthlyData(sortedMonthlyData);
  }, []);

  // MUDANÇA: Carregar dados completos apenas uma vez
  const loadAllHistoryData = useCallback(async () => {
    setIsLoading(true);
    setAlert(null);

    try {
      // Busca todos os check-ins (sem filtrar por data)
      const result = await getRoomHistory({ limit: 5000 });

      if (result.success && result.data) {
        // Normaliza os dados
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

        // MUDANÇA: Salvar dados completos separadamente
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

  // MUDANÇA: Nova função para filtrar por ano
  const filterDataByYear = useCallback(() => {
    if (allHistoryData.length === 0) return;

    const filteredByYear = allHistoryData.filter(
      (record) =>
        new Date(record.guest1CheckinDate).getFullYear() === selectedYear,
    );

    setHistoryData(filteredByYear);
    organizeByMonth(filteredByYear);
  }, [allHistoryData, selectedYear, organizeByMonth]);

  // MUDANÇA: Carregar dados completos apenas uma vez na inicialização
  useEffect(() => {
    loadAllHistoryData();
  }, [loadAllHistoryData]);

  // MUDANÇA: Filtrar por ano quando os dados ou o ano mudam
  useEffect(() => {
    filterDataByYear();
  }, [filterDataByYear]);

  // Funções auxiliares
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
      return new Date(dateString).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Filtrar dados mensais com memoização
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

  // MUDANÇA: Anos disponíveis baseados em TODOS os dados, não apenas os filtrados
  const availableYears = useMemo(() => {
    if (allHistoryData.length === 0) {
      // Se não há dados, pelo menos mostrar o ano atual
      return [new Date().getFullYear()];
    }

    const years = Array.from(
      new Set(
        allHistoryData.map((record) =>
          new Date(record.guest1CheckinDate).getFullYear(),
        ),
      ),
    ).sort((a, b) => b - a);

    // Adicionar o ano atual se não estiver na lista
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) {
      years.unshift(currentYear);
      years.sort((a, b) => b - a);
    }

    return years;
  }, [allHistoryData]); // MUDANÇA: Depende de allHistoryData, não de historyData

  // Renderização
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header con estadísticas */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">
            Historial de Hospedajes
          </h1>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border rounded-md w-full sm:w-auto focus:ring-2 focus:ring-blue-500"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Búsqueda y botones */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, teléfono, habitación o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Button
              onClick={() =>
                setExpandedMonths(
                  new Set(
                    filteredMonthlyData.map((_, index) => index.toString()),
                  ),
                )
              }
              variant="outline"
              className="hover:bg-gray-50"
            >
              Expandir Todos
            </Button>
            <Button
              onClick={() => setExpandedMonths(new Set())}
              variant="outline"
              className="hover:bg-gray-50"
            >
              Colapsar Todos
            </Button>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {alert && (
        <Alert
          className={`flex items-center gap-2 p-3 rounded ${
            alert.type === "success"
              ? "border-green-300 bg-green-50"
              : "border-red-300 bg-red-50"
          }`}
        >
          {alert.type === "success" ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <AlertDescription
            className={
              alert.type === "success" ? "text-green-800" : "text-red-800"
            }
          >
            {alert.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Datos mensuales */}
      <div className="space-y-4">
        {filteredMonthlyData.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-500">
              {searchTerm
                ? "No se encontraron resultados para tu búsqueda."
                : "No hay registros para este año."}
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
                  className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleMonth(monthKey)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold capitalize">
                      {monthData.month}
                    </h3>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
                    <span className="bg-gray-100 px-2 py-1 rounded">
                      {monthData.records.length} reservas
                    </span>
                    <span className="bg-gray-100 px-2 py-1 rounded">
                      {monthData.totalGuests} huéspedes
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 font-medium whitespace-nowrap">
                            Habitación
                          </th>
                          <th className="text-left p-3 font-medium whitespace-nowrap">
                            Empresa
                          </th>
                          <th className="text-left p-3 font-medium whitespace-nowrap">
                            Huésped(es)
                          </th>
                          <th className="text-left p-3 font-medium whitespace-nowrap">
                            Teléfono
                          </th>
                          <th className="text-left p-3 font-medium whitespace-nowrap">
                            Check-in
                          </th>
                          <th className="text-left p-3 font-medium whitespace-nowrap">
                            Check-out
                          </th>
                          <th className="text-left p-3 font-medium whitespace-nowrap">
                            Tipo
                          </th>
                          <th className="text-left p-3 font-medium whitespace-nowrap">
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
                          .map((record) => (
                            <tr
                              key={record.id}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Home className="h-4 w-4 text-gray-500" />
                                  <span className="font-medium">
                                    {record.roomNumber}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="text-gray-700">
                                  {record.companyName || "-"}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-500" />
                                  <div>
                                    <div className="font-medium">
                                      {record.guest1Name}
                                    </div>
                                    {record.guest2Name && (
                                      <div className="text-gray-600 text-xs">
                                        {record.guest2Name}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                {(record.guest1Phone || record.guest2Phone) && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-gray-500" />
                                    <div>
                                      {record.guest1Phone && (
                                        <div className="text-sm">
                                          {record.guest1Phone}
                                        </div>
                                      )}
                                      {record.guest2Phone && (
                                        <div className="text-sm text-gray-600">
                                          {record.guest2Phone}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <span className="text-green-700 font-medium">
                                  {formatDate(record.guest1CheckinDate)}
                                </span>
                              </td>
                              <td className="p-3">
                                {record.checkoutDate ? (
                                  <span className="text-red-700 font-medium">
                                    {formatDate(record.checkoutDate)}
                                  </span>
                                ) : (
                                  <span className="text-blue-600 font-medium">
                                    En curso
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs uppercase font-medium">
                                  {record.roomType}
                                </span>
                              </td>
                              <td className="p-3">
                                {record.checkoutDate ? (
                                  <span className="flex items-center gap-1 text-green-700">
                                    <CheckCircle className="h-4 w-4" />
                                    Completada
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-blue-600">
                                    <Clock className="h-4 w-4" />
                                    Activa
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
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
