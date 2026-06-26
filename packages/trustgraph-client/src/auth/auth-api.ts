// HTTP auth client for the TrustGraph IAM gateway endpoints.
//
// These endpoints run before the WebSocket exists, so they use plain
// fetch rather than the socket transport.

const DEFAULT_BOOTSTRAP_STATUS_URL = "/api/v1/auth/bootstrap-status";
const DEFAULT_LOGIN_URL = "/api/v1/auth/login";

export interface BootstrapStatus {
  bootstrapAvailable: boolean;
}

export interface LoginResult {
  jwt: string;
  jwtExpires: string;
}

export class AuthError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export interface AuthApiOptions {
  bootstrapStatusUrl?: string;
  loginUrl?: string;
  fetchImpl?: typeof fetch;
}

export class AuthApi {
  private bootstrapStatusUrl: string;
  private loginUrl: string;
  private fetchImpl: typeof fetch;

  constructor(options: AuthApiOptions = {}) {
    this.bootstrapStatusUrl =
      options.bootstrapStatusUrl ?? DEFAULT_BOOTSTRAP_STATUS_URL;
    this.loginUrl = options.loginUrl ?? DEFAULT_LOGIN_URL;
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  }

  async bootstrapStatus(): Promise<BootstrapStatus> {
    const resp = await this.fetchImpl(this.bootstrapStatusUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!resp.ok) {
      throw new AuthError(
        `bootstrap-status failed: ${resp.status}`,
        resp.status,
      );
    }
    const body = await resp.json();
    return { bootstrapAvailable: !!body.bootstrap_available };
  }

  async login(
    username: string,
    password: string,
    default_workspace?: string,
  ): Promise<LoginResult> {
    const payload: Record<string, string> = { username, password };
    if (default_workspace) payload.default_workspace = default_workspace;

    const resp = await this.fetchImpl(this.loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (resp.status === 401) {
      throw new AuthError("auth failure", 401);
    }
    if (!resp.ok) {
      throw new AuthError(`login failed: ${resp.status}`, resp.status);
    }
    const body = await resp.json();
    if (!body.jwt) {
      throw new AuthError("login response missing jwt");
    }
    return { jwt: body.jwt, jwtExpires: body.jwt_expires ?? "" };
  }
}

export const createAuthApi = (options?: AuthApiOptions) =>
  new AuthApi(options);
