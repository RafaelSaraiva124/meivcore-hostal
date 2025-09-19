import React, { ReactNode } from "react";
import Image from "next/image";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

const Layout = async ({ children }: { children: ReactNode }) => {
  const session = await auth();
  if (session) redirect("/");

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-blue-900">
      <section className="hidden lg:block lg:h-auto lg:flex-1 relative order-first lg:order-last">
        <Image
          className="object-cover w-full h-full"
          src="/hotel.jpg"
          alt="Hotel"
          width={1000}
          height={1000}
          priority
        />
        <div className="absolute inset-0 bg-black/40"></div>
      </section>

      <section className="bg-gradient-to-b from-gray-50 to-white  flex items-center justify-center p-4 lg:p-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <Image
              src="/meivcore.png"
              alt="Logo Hostal Meivcore"
              width={120}
              height={120}
              className="rounded"
            />
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-6 border border-gray-200">
            {children}
          </div>

          <p className="mt-6 text-center text-sm text-gray-900">
            © {new Date().getFullYear()} Hostal Meivcore · Todos los derechos
            reservados
          </p>
        </div>
      </section>
    </main>
  );
};

export default Layout;
