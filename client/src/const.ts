import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS, APP_NAME, DEVELOPER_NAME, DEVELOPER_URL } from "@shared/const";

export const getPlatformConfig = () =>
  window.__DROPLINK_CONFIG__ ?? window.__PLATFORM_CONFIG__;

export const startLogin = () => {
  const cfg = getPlatformConfig();
  const oauthPortalUrl = cfg?.oauthPortalUrl;
  const appId = cfg?.projectId;
  if (!oauthPortalUrl || !appId) throw new Error("OAuth login is not configured");
  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  const nonce = crypto.randomUUID();
  const secureFlag = window.location.protocol === "https:" ? "; SameSite=None; Secure" : "; SameSite=Lax";
  document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600${secureFlag}`;
  const state = encodeOAuthState({ redirectUri, nonce });

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("responseType", "code");

  window.location.href = url.toString();
};
