import { auth } from "@/auth"; // ou getServerSession, se for NextAuth v4
import { getRoomRedirect } from "@/lib/actions/auth";

export async function GET(req: Request) {
  const session = await auth();
  const roomId = new URL(req.url).searchParams.get("roomId") ?? "";
  const result = await getRoomRedirect(roomId, session);
  return Response.json(result);
}
