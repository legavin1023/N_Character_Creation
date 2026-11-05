import assert from "node:assert/strict";
import test from "node:test";
import {
  createSiteAccessSession,
  getCookieValue,
  isValidSiteAccessSession,
  matchesSecret,
  SITE_ACCESS_SESSION_SECONDS,
} from "./site-access.ts";
import {
  DELETE,
  GET,
  POST,
} from "../app/api/site-access/route.ts";
import { POST as postGoogleSheetsRequest } from "../app/api/google-sheets/route.ts";

test("사이트 잠금 세션은 서명과 만료 시간을 검증한다", () => {
  const now = Date.UTC(2026, 0, 1);
  const session = createSiteAccessSession("test-secret", now);
  assert.equal(isValidSiteAccessSession(session, "test-secret", now), true);
  assert.equal(isValidSiteAccessSession(session, "wrong-secret", now), false);
  assert.equal(
    isValidSiteAccessSession(
      session,
      "test-secret",
      now + (SITE_ACCESS_SESSION_SECONDS + 1) * 1000,
    ),
    false,
  );
  assert.equal(isValidSiteAccessSession("invalid", "test-secret", now), false);
});

test("사이트 잠금은 비밀번호를 정확히 비교하고 쿠키 헤더에서 세션을 찾는다", () => {
  assert.equal(matchesSecret("long secret", "long secret"), true);
  assert.equal(matchesSecret("long secret", "other secret"), false);
  assert.equal(getCookieValue("a=1; numenera-site-access=token.sig; b=2", "numenera-site-access"), "token.sig");
  assert.equal(getCookieValue("a=1", "numenera-site-access"), undefined);
});

test("사이트 비밀번호로 세션을 열고 잠글 수 있으며 저장 API는 세션을 요구한다", async () => {
  const previousPassword = process.env.SITE_ACCESS_PASSWORD;
  const previousSecret = process.env.GOOGLE_APPS_SCRIPT_SECRET;
  process.env.SITE_ACCESS_PASSWORD = "a-long-test-password";
  process.env.GOOGLE_APPS_SCRIPT_SECRET = "test-signing-secret";

  try {
    const initialStatus = await GET(new Request("http://localhost/api/site-access"));
    assert.deepEqual(await initialStatus.json(), { configured: true, authenticated: false });

    const rejectedLogin = await POST(new Request("http://localhost/api/site-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong-password" }),
    }));
    assert.equal(rejectedLogin.status, 401);

    const login = await POST(new Request("http://localhost/api/site-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "a-long-test-password" }),
    }));
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie");
    assert.ok(cookie);

    const authenticatedStatus = await GET(new Request("http://localhost/api/site-access", {
      headers: { Cookie: cookie.split(";")[0] },
    }));
    assert.deepEqual(await authenticatedStatus.json(), { configured: true, authenticated: true });

    const deniedSheetRequest = await postGoogleSheetsRequest(new Request("http://localhost/api/google-sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "load" }),
    }));
    assert.equal(deniedSheetRequest.status, 401);

    const logout = await DELETE();
    assert.equal(logout.status, 204);
    assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/);
  } finally {
    if (previousPassword === undefined) delete process.env.SITE_ACCESS_PASSWORD;
    else process.env.SITE_ACCESS_PASSWORD = previousPassword;
    if (previousSecret === undefined) delete process.env.GOOGLE_APPS_SCRIPT_SECRET;
    else process.env.GOOGLE_APPS_SCRIPT_SECRET = previousSecret;
  }
});
