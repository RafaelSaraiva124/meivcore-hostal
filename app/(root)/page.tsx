"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getRoomStats } from "@/lib/actions/rooms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bed, Users, AlertCircle, CheckCircle } from "lucide-react";

interface RoomStats {
  total: number;
  free: number;
  occupied: number;
  dirty: number;
  occupancyRate: number;
}

const Page = () => {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<RoomStats>({
    total: 0,
    free: 0,
    occupied: 0,
    dirty: 0,
    occupancyRate: 0,
  });

  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Cargar estadísticas
  const loadStats = async () => {
    try {
      const statsResult = await getRoomStats();
      if (statsResult.success) {
        setStats(
          statsResult.data || {
            total: 0,
            free: 0,
            occupied: 0,
            dirty: 0,
            occupancyRate: 0,
          },
        );
      } else {
        setAlert({
          type: "error",
          message: statsResult.error || "Error al cargar las estadísticas",
        });
      }
    } catch (error) {
      console.error("Error al cargar las estadísticas:", error);
      setAlert({ type: "error", message: "Error al cargar las estadísticas" });
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Auto ocultar alertas
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Gestión de Habitaciones
        </h1>
        <p className="text-gray-600 mt-2">Resumen de estadísticas del hostal</p>
      </div>

      {/* Alertas */}
      {alert && (
        <Alert
          className={
            alert.type === "success"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }
        >
          {alert.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
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

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Habitaciones
            </CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Habitaciones registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Habitaciones Libres
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.free}
            </div>
            <p className="text-xs text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ocupadas</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.occupied}
            </div>
            <p className="text-xs text-muted-foreground">Con huéspedes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tasa de Ocupación
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.occupancyRate}%
            </div>
            <p className="text-xs text-muted-foreground">Ocupación actual</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Page;
