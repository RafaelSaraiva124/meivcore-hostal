import React from "react";
import { ReactNode } from "react";
import Header from "@/components/Header";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

import { SpeedInsights } from "@vercel/speed-insights/next";

const Layout = async ({ children }: { children: ReactNode }) => {
  const session = await auth();
  if (!session) redirect("/sign-in");
  {
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col">
      <div className="mx-auto w-full max-w-7xl px-5 xs:px-10 md:px-16">
        <Header session={session} />
        <SpeedInsights />
        <div className="mt-20 pb-20 flex justify-center">
          <div className="w-full max-w-4xl">{children}</div>
        </div>
      </div>
    </main>
  );
};

export default Layout;
