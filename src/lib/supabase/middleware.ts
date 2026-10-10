import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };
import { REMEMBER_COOKIE, SESSION_ALIVE_COOKIE } from "@/lib/constants";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth", "/offline", "/api/webhooks", "/api/cron"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: CookieToSet[]) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  const redirectTo = (pathname: string, keepNext = false) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    if (keepNext) url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  };

  // "Remember me" unchecked → the session ends when the browser is closed.
  if (user && request.cookies.get(REMEMBER_COOKIE)?.value === "0" && !request.cookies.get(SESSION_ALIVE_COOKIE)) {
    await supabase.auth.signOut();
    const res = redirectTo("/login");
    res.cookies.delete(REMEMBER_COOKIE);
    return res;
  }

  if (path === "/") return redirectTo(user ? "/dashboard" : "/login");
  if (!user && !isPublic) {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return redirectTo("/login", true);
  }
  if (user && path === "/login") return redirectTo("/dashboard");

  return response;
}
