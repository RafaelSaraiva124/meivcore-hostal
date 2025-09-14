import React, { ReactNode } from "react";
import Image from "next/image";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

const Layout = async ({ children }: { children: ReactNode }) => {
  const session = await auth();
  if (session) redirect("/");

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-blue-950">
      <section className="h-64 lg:h-auto lg:flex-1 relative order-first lg:order-last">
        <Image
          className="object-cover w-full h-full"
          src="/hotel.jpg"
          alt="hotel"
          width={1000}
          height={1000}
          priority
        />
        <div className="absolute inset-0 bg-black/30"></div>
      </section>

      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <Image
              src="/meivcore.png"
              alt="logo"
              width={37}
              height={37}
              className="rounded"
            />
            <h1 className="text-2xl font-semibold text-white">
              Hostal Meivcore
            </h1>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            {children}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Layout;
