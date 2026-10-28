// Only these public values may reach the browser. Never serialize process.env.
export function publicPlatformConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    projectId: env.APP_ID ?? env.DROPLINK_APP_ID ?? env.MANUS_PROJECT_ID ?? "",
    oauthPortalUrl: env.OAUTH_PORTAL_URL ?? env.MANUS_OAUTH_PORTAL_URL ?? "",
    apiUrl: env.PUBLIC_API_URL ?? env.STORAGE_API_URL ?? env.MANUS_API_URL ?? "",
    apiBrowserKey: env.PUBLIC_API_BROWSER_KEY ?? env.MANUS_API_BROWSER_KEY ?? "",
    developerName: "MSR_Coder",
    developerUrl: "https://msr-coder.pages.dev",
  };
}

export function publicPlatformScript(env: NodeJS.ProcessEnv = process.env): string {
  const json = JSON.stringify(publicPlatformConfig(env)).replaceAll("<", "\\u003c");
  return `window.__DROPLINK_CONFIG__=${json};window.__PLATFORM_CONFIG__=${json};`;
}
