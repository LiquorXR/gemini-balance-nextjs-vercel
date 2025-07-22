import { i18n } from "@/i18n-config";
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { NextRequest, NextResponse } from "next/server";

function getLocale(request: NextRequest): string | undefined {
  // 1. Check for language preference in cookie
  const localeCookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (
    localeCookie &&
    (i18n.locales as readonly string[]).includes(localeCookie)
  ) {
    return localeCookie;
  }

  // 2. Fallback to Accept-Language header
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  const locales = i18n.locales;
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  const defaultLocale = i18n.defaultLocale;

  return matchLocale(languages, locales, defaultLocale);
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if there is any supported locale in the pathname
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // Redirect if there is no locale
  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }

  // Add the locale to the request headers
  const localeInPath =
    i18n.locales.find(
      (locale) =>
        pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    ) || i18n.defaultLocale;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-ui-locale", localeInPath);

  // Protect the /admin route
  if (
    pathname.startsWith(`/${i18n.defaultLocale}/admin`) ||
    pathname.startsWith(`/zh/admin`)
  ) {
    const tokenFromCookie = request.cookies.get("auth_token")?.value;

    // If the cookie is not present, redirect to the login page.
    if (!tokenFromCookie) {
      const url = request.nextUrl.clone();
      // Redirect to the login page for the current locale
      const locale = pathname.split("/")[1];
      url.pathname = `/${locale}/auth`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // Matcher ignoring `/_next/` and `/api/`
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|health|gemini|openai|v1beta).*)",
  ],
};
