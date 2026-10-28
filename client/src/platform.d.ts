export {};
declare global {
  interface Window {
    __DROPLINK_CONFIG__?: {
      projectId: string;
      oauthPortalUrl: string;
      apiUrl: string;
      apiBrowserKey: string;
      developerName?: string;
      developerUrl?: string;
    };
    __PLATFORM_CONFIG__?: {
      projectId: string;
      oauthPortalUrl: string;
      apiUrl: string;
      apiBrowserKey: string;
      developerName?: string;
      developerUrl?: string;
    };
  }
}
