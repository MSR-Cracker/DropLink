/** Minimal typed shapes for the external OAuth service responses. */
export type ExchangeTokenRequest = {
  clientId: string;
  grantType: "authorization_code";
  code: string;
  redirectUri: string;
};
export type ExchangeTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  [key: string]: unknown;
};
export type GetUserInfoResponse = {
  openId: string;
  name?: string | null;
  email?: string | null;
  platform?: string | null;
  loginMethod?: string | null;
  platforms?: unknown;
  [key: string]: unknown;
};
export type GetUserInfoWithJwtRequest = {
  jwtToken: string;
  projectId: string;
};
export type GetUserInfoWithJwtResponse = GetUserInfoResponse;
