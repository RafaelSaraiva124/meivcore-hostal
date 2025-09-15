"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, getInitials } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { AvatarFallback } from "@radix-ui/react-avatar";
import { Session } from "next-auth";
import { requireAdmin } from "@/lib/actions/auth";

const Header = ({ session }: { session: Session }) => {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!session?.user?.id) return;
      const result = await requireAdmin(session.user.id);
      setIsAdmin(result.allowed);
    };
    checkAdmin();
  }, [session]);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex justify-between items-center">
          {/* Logo/Marca */}
          <Link
            href="/"
            className="flex items-center space-x-2 text-lg sm:text-xl font-bold text-gray-800 hover:text-blue-600 transition-colors duration-200 no-underline"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs sm:text-sm">H</span>
            </div>
            <span className="hidden xs:block sm:inline">Hostal Meivcore</span>
          </Link>

          {/* Navegación */}
          <nav className="flex items-center space-x-2 sm:space-x-8">
            <ul className="flex items-center space-x-2 sm:space-x-6 list-none m-0 p-0">
              {/* Botón “Gestionar” solo para admins */}
              {isAdmin && (
                <li>
                  <Link
                    href="/create-room"
                    className={cn(
                      "relative px-1.5 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-200 no-underline rounded-md",
                      pathname === "/create-room"
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                    )}
                  >
                    <span className="text-xs sm:text-sm">Gestionar</span>
                    {pathname === "/create-room" && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-600 rounded-full -mb-0.5 sm:-mb-1"></div>
                    )}
                  </Link>
                </li>
              )}

              <li>
                <Link
                  href="/room-list"
                  className={cn(
                    "relative px-1.5 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-200 no-underline rounded-md",
                    pathname === "/room-list"
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                  )}
                >
                  <span className="text-xs sm:text-sm">Habitaciones</span>
                  {pathname === "/room-list" && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-600 rounded-full -mb-0.5 sm:-mb-1"></div>
                  )}
                </Link>
              </li>
              <li>
                <Link
                  href="/room-history"
                  className={cn(
                    "relative px-1.5 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-200 no-underline rounded-md",
                    pathname === "/room-history"
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                  )}
                >
                  <span className="text-xs sm:text-sm">Historial</span>
                  {pathname === "/room-history" && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-600 rounded-full -mb-0.5 sm:-mb-1"></div>
                  )}
                </Link>
              </li>

              {/* Perfil del usuario */}
              <li>
                <Link
                  href="/my-profile"
                  className="flex items-center space-x-1 sm:space-x-2 p-0.5 sm:p-1 rounded-full hover:bg-gray-50 transition-colors duration-200"
                >
                  <Avatar className="w-7 h-7 sm:w-9 sm:h-9 ring-1 sm:ring-2 ring-gray-200 hover:ring-blue-300 transition-all duration-200">
                    <AvatarFallback className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-700 text-white text-[10px] sm:text-sm font-semibold flex items-center justify-center rounded-full">
                      {getInitials(session?.user?.name || "IN")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block">
                    <p className="text-xs sm:text-sm font-medium text-gray-700 truncate max-w-16 sm:max-w-24">
                      {session?.user?.name?.split(" ")[0] || "Usuario"}
                    </p>
                  </div>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
