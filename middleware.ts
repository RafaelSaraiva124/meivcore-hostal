import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

console.log("🔧 Middleware carregado!");

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas
  const publicRoutes = [
    "/sign-in",
    "/sign-up",
    "/api/auth",
    "/api/webhooks",
    "/_next",
    "/favicon.ico",
  ];

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (isPublicRoute) return NextResponse.next();

  try {
    console.log("🔍 Verificando sessão...");
    const session = await auth();

    if (!session?.user?.email) {
      console.log("❌ Sem sessão - redirecionando para login");
      const loginUrl = new URL("/sign-in", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Forçar lowercase no email para evitar problemas
    const email = session.user.email.toLowerCase();

    // Buscar usuário na DB
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.log("❌ Usuário não encontrado - logout");
      const loginUrl = new URL("/sign-in", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const actualRole = user.role;

    console.log(`✅ Usuário ${email} com role: ${actualRole}`);

    // Bloquear usuários pendentes
    if (actualRole === "Pending") {
      return new NextResponse(generatePendingHTML(email), {
        status: 403,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    // Rotas admin
    const adminRoutePatterns = [
      /^\/room-history/,
      /^\/create-room/,
      /^\/rooms\/[^\/]+\/admin/,
    ];
    const needsAdmin = adminRoutePatterns.some((regex) => regex.test(pathname));

    if (needsAdmin && actualRole !== "Admin") {
      return new NextResponse(generateAccessDeniedHTML(email, actualRole), {
        status: 403,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    return NextResponse.next({
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("💥 Erro no middleware:", error);
    const loginUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(loginUrl);
  }
}

// Função para gerar HTML da página "Pending"
function generatePendingHTML(email: string): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conta Pendente - Hostel Manager</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 1rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      text-align: center;
      max-width: 500px;
      width: 100%;
      animation: slideIn 0.5s ease-out;
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1.5rem;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    h1 {
      color: #1f2937;
      margin-bottom: 1rem;
      font-size: 2rem;
      font-weight: 700;
    }
    .user-info {
      background: #f8fafc;
      padding: 1.5rem;
      border-radius: 0.75rem;
      margin-bottom: 2rem;
      border: 1px solid #e2e8f0;
    }
    .user-info p {
      color: #475569;
      font-size: 0.95rem;
      margin-bottom: 0.5rem;
    }
    .user-info p:last-child {
      margin-bottom: 0;
    }
    .description {
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 2rem;
      font-size: 1rem;
    }
    .logout-btn {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      padding: 1rem 2rem;
      border: none;
      border-radius: 0.75rem;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
    }
    .logout-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
    }
    .logout-btn:active {
      transform: translateY(0);
    }
    .status-badge {
      display: inline-block;
      background: #fef3c7;
      color: #d97706;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⏳</div>
    <h1>Conta Pendente de Aprovação</h1>
    
    <div class="user-info">
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Status:</strong> <span class="status-badge">Pendente</span></p>
    </div>
    
    <div class="description">
      <p>A sua conta foi criada com sucesso, mas ainda está <strong>pendente de aprovação</strong> por um administrador do sistema.</p>
      <br>
      <p>Por favor, aguarde a aprovação ou entre em contacto com o administrador.</p>
    </div>
    
    <a href="/api/auth/signout" class="logout-btn">
     Terminar Sessão
    </a>
  </div>
</body>
</html>`;
}

// Função para gerar HTML da página "Access Denied"
function generateAccessDeniedHTML(email: string, role: string): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acesso Negado - Hostel Manager</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 1rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      text-align: center;
      max-width: 500px;
      width: 100%;
      animation: slideIn 0.5s ease-out;
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1.5rem;
    }
    h1 {
      color: #1f2937;
      margin-bottom: 1rem;
      font-size: 2rem;
      font-weight: 700;
    }
    .user-info {
      background: #f8fafc;
      padding: 1.5rem;
      border-radius: 0.75rem;
      margin-bottom: 2rem;
      border: 1px solid #e2e8f0;
    }
    .user-info p {
      color: #475569;
      font-size: 0.95rem;
      margin-bottom: 0.5rem;
    }
    .user-info p:last-child {
      margin-bottom: 0;
    }
    .description {
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 2rem;
      font-size: 1rem;
    }
    .buttons {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .btn {
      padding: 1rem 2rem;
      border: none;
      border-radius: 0.75rem;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
      transition: all 0.2s ease;
      min-width: 140px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
    }
    .btn-secondary {
      background: linear-gradient(135deg, #6b7280, #4b5563);
      color: white;
      box-shadow: 0 4px 15px rgba(107, 114, 128, 0.3);
    }
    .btn-secondary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(107, 114, 128, 0.4);
    }
    .role-badge {
      display: inline-block;
      background: #fee2e2;
      color: #dc2626;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🚫</div>
    <h1>Acesso Negado</h1>
    
    <div class="user-info">
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Role:</strong> <span class="role-badge">${role}</span></p>
    </div>
    
    <div class="description">
      <p>Não tem permissões para aceder a esta área do sistema.</p>
      <br>
      <p>Esta funcionalidade está <strong>restrita a administradores</strong>.</p>
    </div>
    
    <div class="buttons">
      <a href="/" class="btn btn-primary">🏠 Início</a>
      <a href="/api/auth/signout" class="btn btn-secondary">🚪 Sair</a>
    </div>
  </div>
</body>
</html>`;
}

// Configuração do matcher - MUITO IMPORTANTE!
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)",
  ],
};
