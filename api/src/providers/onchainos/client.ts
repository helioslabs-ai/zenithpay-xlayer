import { env } from "../../env";

const OKX_BASE_URL = "https://web3.okx.com";

function generateSignature(
  timestamp: string,
  method: string,
  path: string,
  body: string,
): string {
  const prehash = `${timestamp}${method.toUpperCase()}${path}${body}`;
  const hmac = new Bun.CryptoHasher("sha256", env.OKX_SECRET_KEY);
  hmac.update(prehash);
  return btoa(String.fromCharCode(...new Uint8Array(hmac.digest())));
}

function buildHeaders(
  method: string,
  path: string,
  body: string,
): Record<string, string> {
  if (!env.OKX_API_KEY || !env.OKX_SECRET_KEY || !env.OKX_PASSPHRASE) {
    throw new Error("Legacy OKX provider is not configured");
  }
  const timestamp = new Date().toISOString();
  const sign = generateSignature(timestamp, method, path, body);

  const headers: Record<string, string> = {
    "OK-ACCESS-KEY": env.OKX_API_KEY,
    "OK-ACCESS-SIGN": sign,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": env.OKX_PASSPHRASE,
    "Content-Type": "application/json",
  };

  if (env.OKX_PROJECT_ID) {
    headers["OK-ACCESS-PROJECT"] = env.OKX_PROJECT_ID;
  }

  return headers;
}

export async function okxFetch<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
    params?: Record<string, string>;
  } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  let fullPath = path;

  if (options.params) {
    const qs = new URLSearchParams(options.params).toString();
    fullPath = `${path}?${qs}`;
  }

  const bodyStr =
    method === "POST" && options.body ? JSON.stringify(options.body) : "";
  const headers = buildHeaders(method, fullPath, bodyStr);

  const response = await fetch(`${OKX_BASE_URL}${fullPath}`, {
    method,
    headers,
    body: method === "POST" ? bodyStr : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OKX API error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as {
    code: string;
    msg: string;
    data: T[];
  };

  if (json.code !== "0") {
    throw new Error(`OKX API error [${json.code}]: ${json.msg}`);
  }

  return json.data[0] as T;
}

export async function okxFetchAll<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
    params?: Record<string, string>;
  } = {},
): Promise<T[]> {
  const method = options.method ?? "GET";
  let fullPath = path;

  if (options.params) {
    const qs = new URLSearchParams(options.params).toString();
    fullPath = `${path}?${qs}`;
  }

  const bodyStr =
    method === "POST" && options.body ? JSON.stringify(options.body) : "";
  const headers = buildHeaders(method, fullPath, bodyStr);

  const response = await fetch(`${OKX_BASE_URL}${fullPath}`, {
    method,
    headers,
    body: method === "POST" ? bodyStr : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OKX API error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as {
    code: string;
    msg: string;
    data: T[];
  };

  if (json.code !== "0") {
    throw new Error(`OKX API error [${json.code}]: ${json.msg}`);
  }

  return json.data;
}
