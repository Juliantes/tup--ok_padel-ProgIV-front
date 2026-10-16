import { cancel, onUrl, start } from '@fabianlars/tauri-plugin-oauth';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

const OAUTH_TIMEOUT_MS = 120_000;
export const OAUTH_REDIRECT_URI = 'http://127.0.0.1:17652';
const OAUTH_PORT = 17652;
const OAUTH_SUCCESS_HTML = `<html>
<head>
  <meta charset="utf-8" />
  <title>PadelMatch</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, sans-serif;
      background: #f4f7f6;
      color: #1b4332;
    }
    .card {
      text-align: center;
      padding: 2rem 2.5rem;
      border-radius: 12px;
      background: white;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    }
  </style>
  <script>
    window.close();
    setTimeout(function () {
      document.getElementById('done').hidden = false;
    }, 400);
  </script>
</head>
<body>
  <div class="card">
    <p id="done" hidden>Sesión iniciada. Volvé a PadelMatch.</p>
    <p>Completando inicio de sesión…</p>
  </div>
</body>
</html>`;

export interface GoogleOAuthTokens {
  accessToken: string;
  idToken?: string;
}

interface OauthStartConfig {
  ports?: number[];
  response?: string;
}

function base64UrlEncode(buffer: Uint8Array): string {
  const binary = Array.from(buffer, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateCodeVerifier(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

function buildGoogleAuthUrl(clientId: string, redirectUri: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    include_granted_scopes: 'true',
    prompt: 'select_account',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function openOAuthUrl(url: string): Promise<void> {
  try {
    await invoke('open_oauth_url', { url });
  } catch {
    await openUrl(url);
  }
}

function isLocalOAuthCallback(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function parseOAuthCode(url: string): string {
  const parsed = new URL(url);
  const oauthError = parsed.searchParams.get('error');

  if (oauthError) {
    throw new Error(`auth/${oauthError}`);
  }

  const code = parsed.searchParams.get('code');
  if (!code) {
    throw new Error('auth/missing-oauth-code');
  }

  return code;
}

async function exchangeCodeForTokens(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<GoogleOAuthTokens> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = (await response.json()) as {
    access_token?: string;
    id_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok) {
    console.error('[auth][tauri] Token exchange failed:', data);
    throw new Error(`auth/${data.error ?? 'token-exchange-failed'}`);
  }

  if (!data.access_token && !data.id_token) {
    throw new Error('auth/missing-oauth-token');
  }

  return {
    accessToken: data.access_token ?? '',
    idToken: data.id_token,
  };
}

export async function signInWithGoogleViaSystemBrowser(
  clientId: string,
  clientSecret: string,
): Promise<GoogleOAuthTokens> {
  const normalizedClientId = clientId.trim();
  const normalizedClientSecret = clientSecret.trim();

  if (!normalizedClientId || normalizedClientId.startsWith('GOCSPX-')) {
    throw new Error('auth/invalid-oauth-client-id');
  }

  if (!normalizedClientId.endsWith('.apps.googleusercontent.com')) {
    throw new Error('auth/invalid-oauth-client-id');
  }

  if (!normalizedClientSecret || !normalizedClientSecret.startsWith('GOCSPX-')) {
    console.error(
      '[auth][tauri] Falta googleDesktopClientSecret en environment.ts (debe empezar con GOCSPX-)',
    );
    throw new Error('auth/missing-client-secret');
  }

  const redirectUri = OAUTH_REDIRECT_URI;
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const port = await start({
    ports: [OAUTH_PORT],
    response: OAUTH_SUCCESS_HTML,
  } as OauthStartConfig);

  if (port !== OAUTH_PORT) {
    await cancel(port).catch(() => undefined);
    throw new Error('auth/oauth-port-mismatch');
  }

  let settled = false;
  let resolveTokens!: (tokens: GoogleOAuthTokens) => void;
  let rejectTokens!: (error: unknown) => void;

  const tokensPromise = new Promise<GoogleOAuthTokens>((resolve, reject) => {
    resolveTokens = resolve;
    rejectTokens = reject;
  });

  const timeoutId = setTimeout(() => {
    if (settled) {
      return;
    }

    settled = true;
    void cancel(port);
    rejectTokens(new Error('auth/timeout'));
  }, OAUTH_TIMEOUT_MS);

  const unlisten = await onUrl((url) => {
    if (settled || !isLocalOAuthCallback(url)) {
      return;
    }

    void (async () => {
      try {
        console.warn('[auth][tauri] OAuth callback URL:', url);
        const authCode = parseOAuthCode(url);
        const tokens = await exchangeCodeForTokens(
          normalizedClientId,
          normalizedClientSecret,
          authCode,
          redirectUri,
          codeVerifier,
        );

        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutId);
        void cancel(port);
        resolveTokens(tokens);
      } catch (error) {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutId);
        void cancel(port);
        rejectTokens(error);
      }
    })();
  });

  try {
    await openOAuthUrl(buildGoogleAuthUrl(normalizedClientId, redirectUri, codeChallenge));
    return await tokensPromise;
  } catch (error) {
    if (!settled) {
      settled = true;
      clearTimeout(timeoutId);
      await cancel(port).catch(() => undefined);
    }
    throw error;
  } finally {
    unlisten();
  }
}
