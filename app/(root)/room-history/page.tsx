"use client";

import React, { useEffect, useState } from "react";
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
  companyName?: string; // empresa agregada
  guest1Name: string;
  guest1Phone?: string;
  guest2Name?: string;
  guest2Phone?: string;
  checkinDate: string;
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
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<{
    totalBookings: number;
    completedStays: number;
    currentGuests: number;
  }>({
    totalBookings: 0,
    completedStays: 0,
    currentGuests: 0,
  });

  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    loadHistoryData();
    loadStats();
  }, [selectedYear]);

  const loadHistoryData = async () => {
    setIsLoading(true);
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      const result = await getRoomHistory({ startDate, endDate, limit: 1000 });

      if (result.success && result.data) {
        const normalizedData = result.data.map((record: any) => ({
          ...record,
          guest1Phone: record.guest1Phone ?? undefined,
          guest2Name: record.guest2Name ?? undefined,
          guest2Phone: record.guest2Phone ?? undefined,
          checkoutDate: record.checkoutDate ?? undefined,
          companyName: record.companyName ?? undefined,
        }));

        setHistoryData(normalizedData);
        organizeByMonth(normalizedData);
      } else {
        setAlert({
          type: "error",
          message: result.error || "Error al cargar el historial",
        });
      }
    } catch {
      setAlert({
        type: "error",
        message: "Error inesperado al cargar los datos",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      const result = await getHistoryStats({ startDate, endDate });
      if (result.success && result.data) {
        setStats({
          totalBookings: result.data.totalBookings,
          completedStays: result.data.completedStays,
          currentGuests: result.data.currentGuests,
        });
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error);
    }
  };

  const organizeByMonth = (data: HistoryRecord[]) => {
    const monthsMap = new Map<string, MonthlyData>();

    data.forEach((record) => {
      const date = new Date(record.checkinDate);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}`;
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

    const sortedMonths = Array.from(monthsMap.values()).sort(
      (a, b) => b.year - a.year || a.month.localeCompare(b.month),
    );

    setMonthlyData(sortedMonths);
  };

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) newExpanded.delete(monthKey);
    else newExpanded.add(monthKey);
    setExpandedMonths(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const filteredMonthlyData = monthlyData
    .map((monthData) => ({
      ...monthData,
      records: monthData.records.filter(
        (record) =>
          !searchTerm ||
          record.guest1Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.guest2Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.roomNumber.includes(searchTerm) ||
          record.guest1Phone?.includes(searchTerm) ||
          record.guest2Phone?.includes(searchTerm) ||
          record.companyName?.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    }))
    .filter((monthData) => monthData.records.length > 0);

  const availableYears = Array.from(
    new Set(
      historyData.map((record) => new Date(record.checkinDate).getFullYear()),
    ),
  ).sort((a, b) => b - a);

  if (isLoading)
    return <div className="text-center mt-10">Cargando historial...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Historial de Hospedajes</h1>
        <div className="flex gap-4 items-center">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border rounded-md"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, teléfono, número de habitación o empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() =>
            setExpandedMonths(
              new Set(filteredMonthlyData.map((_, index) => index.toString())),
            )
          }
          variant="outline"
        >
          Expandir Todos
        </Button>
        <Button onClick={() => setExpandedMonths(new Set())} variant="outline">
          Colapsar Todos
        </Button>
      </div>

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
          <div className="text-center py-8 text-gray-500">
            {searchTerm
              ? "No se encontraron resultados para la búsqueda."
              : "No se encontraron registros para este año."}
          </div>
        ) : (
          filteredMonthlyData.map((monthData, index) => {
            const monthKey = index.toString();
            const isExpanded = expandedMonths.has(monthKey);

            return (
              <div
                key={monthKey}
                className="bg-white border rounded-lg shadow-sm"
              >
                <div
                  className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleMonth(monthKey)}
                >
                  <div className="flex items-center gap-4">
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
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>{monthData.records.length} reservas</span>
                      <span>{monthData.totalGuests} huéspedes</span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3 font-medium">
                              Habitación
                            </th>
                            <th className="text-left p-3 font-medium">
                              Empresa
                            </th>
                            <th className="text-left p-3 font-medium">
                              Huésped(es)
                            </th>
                            <th className="text-left p-3 font-medium">
                              Teléfono
                            </th>
                            <th className="text-left p-3 font-medium">
                              Check-in
                            </th>
                            <th className="text-left p-3 font-medium">
                              Check-out
                            </th>
                            <th className="text-left p-3 font-medium">Tipo</th>
                            <th className="text-left p-3 font-medium">
                              Estado
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthData.records
                            .sort(
                              (a, b) =>
                                new Date(b.checkinDate).getTime() -
                                new Date(a.checkinDate).getTime(),
                            )
                            .map((record) => (
                              <tr
                                key={record.id}
                                className="border-t hover:bg-gray-50"
                              >
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <Home className="h-4 w-4 text-gray-600" />
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
                                    <User className="h-4 w-4 text-gray-600" />
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
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-gray-600" />
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
                                </td>
                                <td className="p-3 text-green-700">
                                  {formatDate(record.checkinDate)}
                                </td>
                                <td className="p-3">
                                  {record.checkoutDate ? (
                                    <span className="text-red-700">
                                      {formatDate(record.checkoutDate)}
                                    </span>
                                  ) : (
                                    <span className="text-blue-600 font-medium">
                                      En curso
                                    </span>
                                  )}
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-1 bg-gray-100 rounded text-xs uppercase">
                                    {record.roomType}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {record.checkoutDate ? (
                                    <span className="flex items-center gap-1 text-green-700">
                                      <CheckCircle className="h-4 w-4" />{" "}
                                      Completada
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-blue-600">
                                      <Clock className="h-4 w-4" /> Activa
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
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
