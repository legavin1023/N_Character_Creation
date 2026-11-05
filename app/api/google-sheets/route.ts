import {
  getCookieValue,
  getSiteAccessConfig,
  isValidSiteAccessSession,
  SITE_ACCESS_COOKIE,
} from "@/lib/site-access";

interface SyncRequest {
  action: "load" | "save";
  characters?: unknown[];
}

interface AppsScriptResponse {
  ok?: boolean;
  error?: string;
  characters?: unknown;
  count?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCharacterList(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every((character) =>
    isRecord(character) &&
    typeof character.id === "string" &&
    typeof character.name === "string" &&
    typeof character.updatedAt === "string",
  );
}

export async function POST(request: Request) {
  const accessConfig = getSiteAccessConfig();
  if (!accessConfig) {
    return Response.json(
      { error: "사이트 비밀번호 설정이 완료되지 않았습니다." },
      { status: 503 },
    );
  }
  const session = getCookieValue(
    request.headers.get("cookie"),
    SITE_ACCESS_COOKIE,
  );
  if (!isValidSiteAccessSession(session, accessConfig.signingSecret)) {
    return Response.json({ error: "사이트에 먼저 비밀번호를 입력해 주세요." }, { status: 401 });
  }

  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  const appsScriptSecret = process.env.GOOGLE_APPS_SCRIPT_SECRET;
  if (!appsScriptUrl || !appsScriptSecret) {
    return Response.json(
      { error: "서버의 Google Sheets 연동 설정이 완료되지 않았습니다." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 2_000_000) {
      return Response.json({ error: "요청 데이터가 너무 큽니다." }, { status: 413 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (
    !isRecord(body) ||
    (body.action !== "load" && body.action !== "save")
  ) {
    return Response.json({ error: "요청 항목이 올바르지 않습니다." }, { status: 400 });
  }

  const action: SyncRequest["action"] = body.action;
  if (action === "save" && !isCharacterList(body.characters)) {
    return Response.json({ error: "저장할 캐릭터 목록 형식이 올바르지 않습니다." }, { status: 400 });
  }

  let endpoint: URL;
  try {
    endpoint = new URL(appsScriptUrl);
  } catch {
    return Response.json({ error: "서버의 Apps Script URL 형식이 올바르지 않습니다." }, { status: 500 });
  }
  if (
    endpoint.protocol !== "https:" ||
    endpoint.hostname !== "script.google.com" ||
    !/^\/macros\/s\/[^/]+\/exec$/.test(endpoint.pathname)
  ) {
    return Response.json({ error: "서버의 Apps Script URL이 허용된 형식이 아닙니다." }, { status: 500 });
  }

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        secret: appsScriptSecret,
        ...(action === "save" ? { characters: body.characters } : {}),
      }),
      cache: "no-store",
    });
    const responseText = await upstream.text();
    let result: unknown;
    try {
      result = JSON.parse(responseText);
    } catch {
      const pageTitle = responseText
        .match(/<title[^>]*>([^<]{0,160})<\/title>/i)?.[1]
        ?.replace(/\s+/g, " ")
        .trim()
        .toLocaleLowerCase();
      if (
        upstream.status === 401 &&
        (pageTitle?.includes("페이지를 찾을 수 없음") || pageTitle?.includes("page not found"))
      ) {
        return Response.json(
          {
            error:
              "Google이 배포 주소에서 '페이지를 찾을 수 없음'을 반환했습니다. Apps Script의 배포 관리에서 활성 웹 앱 URL을 다시 복사해 GOOGLE_APPS_SCRIPT_URL에 넣고 개발 서버를 재시작해 주세요. URL은 /exec로 끝나야 합니다.",
          },
          { status: 502 },
        );
      }
      return Response.json(
        {
          error:
            "Google Apps Script가 JSON 대신 로그인 또는 권한 화면을 반환했습니다. 활성 웹 앱 배포의 실행 계정이 '나', 액세스 권한이 '모든 사용자'인지 확인하고, GOOGLE_APPS_SCRIPT_URL에 배포 URL 전체(/exec)를 설정한 뒤 서버를 다시 시작해 주세요.",
        },
        { status: 502 },
      );
    }

    if (!upstream.ok || !isRecord(result) || result.ok !== true) {
      const error = isRecord(result) && typeof result.error === "string"
        ? result.error
        : `Apps Script 요청 실패 (${upstream.status}).`;
      return Response.json({ error }, { status: 502 });
    }

    const data = result as AppsScriptResponse;
    return Response.json(
      action === "load"
        ? { characters: data.characters }
        : { count: data.count },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Google 서버에 연결하지 못했습니다. 인터넷 연결과 Apps Script 배포를 확인해 주세요." },
      { status: 502 },
    );
  }
}
