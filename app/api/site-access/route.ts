import {
  createSiteAccessSession,
  getCookieValue,
  getSiteAccessConfig,
  isValidSiteAccessSession,
  matchesSecret,
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_SESSION_SECONDS,
} from "@/lib/site-access";

const noStoreHeaders = { "Cache-Control": "no-store" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAuthenticated(request: Request, signingSecret: string): boolean {
  const session = getCookieValue(
    request.headers.get("cookie"),
    SITE_ACCESS_COOKIE,
  );
  return isValidSiteAccessSession(session, signingSecret);
}

export async function GET(request: Request) {
  const config = getSiteAccessConfig();
  if (!config) {
    return Response.json(
      { configured: false, authenticated: false },
      { status: 503, headers: noStoreHeaders },
    );
  }
  return Response.json(
    { configured: true, authenticated: isAuthenticated(request, config.signingSecret) },
    { headers: noStoreHeaders },
  );
}

export async function POST(request: Request) {
  const config = getSiteAccessConfig();
  if (!config) {
    return Response.json(
      { error: "사이트 비밀번호 설정이 완료되지 않았습니다." },
      { status: 503, headers: noStoreHeaders },
    );
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 4_096) {
      return Response.json({ error: "요청 데이터가 너무 큽니다." }, { status: 413 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.password !== "string") {
    return Response.json({ error: "비밀번호를 입력해 주세요." }, { status: 400 });
  }
  if (!matchesSecret(body.password, config.password)) {
    return Response.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const session = createSiteAccessSession(config.signingSecret);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return Response.json(
    { authenticated: true },
    {
      headers: {
        ...noStoreHeaders,
        "Set-Cookie": `${SITE_ACCESS_COOKIE}=${session}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SITE_ACCESS_SESSION_SECONDS}${secure}`,
      },
    },
  );
}

export async function DELETE() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return new Response(null, {
    status: 204,
    headers: {
      ...noStoreHeaders,
      "Set-Cookie": `${SITE_ACCESS_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`,
    },
  });
}
