import { auth } from "@/auth";
import { requireAdmin } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import AdminHistoryPage from "./create-roomPage";

const Page = async () => {
  const session = await auth();

  const result = await requireAdmin(session!.user!.id!);
  if (!result.allowed) {
    redirect("/");
  }

  return <AdminHistoryPage />;
};

export default Page;
