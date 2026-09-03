import crypto from "node:crypto";
import { env } from "../../env";

const OKX_BASE = "https://web3.okx.com";
const WALLET_PREFIX = "/priapi/v5/wallet/agentic";

interface AkInitResponse {
  nonce: string;
  iss: string;
}

interface AddressInfo {
  accountId?: string;
  address: string;
  chainIndex: string;
  chainName: string;
  addressType: string;
  chainPath?: string;
}

interface VerifyResponse {
  refreshToken: string;
  accessToken: string;
  teeId: string;
  sessionCert: string;
  encryptedSessionSk: string;
  sessionKeyExpireAt: string;
  projectId: string;
  accountId: string;
  accountName: string;
  isNew: boolean;
  addressList: AddressInfo[];
}

interface AccountListItem {
  projectId: string;
  accountId: string;
  accountName: string;
  isDefault?: boolean;
}

interface CreateAccountResponse {
  projectId: string;
  accountId: string;
  accountName: string;
  addressList: AddressInfo[];
}

interface WalletSession {
  accessToken: string;
  refreshToken: string;
  sessionCert: string;
  sessionPrivateKey: string;
  encryptedSessionSk: string;
  projectId: string;
  accountId: string;
  accountName: string;
  addressList: AddressInfo[];
  expiresAt: number;
}

let cachedSession: WalletSession | null = null;

function anonymousHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "ok-client-version": "2.1.0",
    "Ok-Access-Client-type": "agent-cli",
  };
}

function jwtHeaders(accessToken: string): Record<string, string> {
  return {
    ...anonymousHeaders(),
    Authorization: `Bearer ${accessToken}`,
  };
}

function generateX25519Keypair(): {
  privateKeyB64: string;
  publicKeyB64: string;
} {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("x25519");
  const pubDer = publicKey.export({ type: "spki", format: "der" });
  const privDer = privateKey.export({ type: "pkcs8", format: "der" });
  const rawPub = pubDer.subarray(pubDer.length - 32);
  const rawPriv = privDer.subarray(privDer.length - 32);
  return {
    publicKeyB64: rawPub.toString("base64"),
    privateKeyB64: rawPriv.toString("base64"),
  };
}

function hmacSign(
  timestamp: number,
  method: string,
  path: string,
  params: string,
  secretKey: string,
): string {
  const message = `${timestamp}${method}${path}${params}`;
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(message);
  return hmac.digest("base64");
}

async function walletPost<T>(
  path: string,
  body: Record<string, unknown>,
  headers: Record<string, string>,
): Promise<T> {
  const url = `${OKX_BASE}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (response.status >= 500) {
    throw new Error(`Wallet API server error (HTTP ${response.status})`);
  }

  const json = (await response.json()) as {
    code: string | number;
    msg: string;
    data: T[];
  };

  const codeOk = json.code === "0" || json.code === 0;
  if (!codeOk) {
    throw new Error(`Wallet API error [${json.code}]: ${json.msg}`);
  }

  return json.data[0] as T;
}

async function walletGet<T>(
  path: string,
  params: Record<string, string>,
  headers: Record<string, string>,
): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const url = `${OKX_BASE}${path}${qs ? `?${qs}` : ""}`;
  const response = await fetch(url, { method: "GET", headers });

  if (response.status >= 500) {
    throw new Error(`Wallet API server error (HTTP ${response.status})`);
  }

  const json = (await response.json()) as {
    code: string | number;
    msg: string;
    data: T;
  };

  const codeOk = json.code === "0" || json.code === 0;
  if (!codeOk) {
    throw new Error(`Wallet API error [${json.code}]: ${json.msg}`);
  }

  return json.data;
}

export async function akLogin(): Promise<WalletSession> {
  if (!env.OKX_API_KEY || !env.OKX_SECRET_KEY || !env.OKX_PASSPHRASE) {
    throw new Error("Legacy OKX wallet provider is not configured");
  }
  if (cachedSession && Date.now() / 1000 < cachedSession.expiresAt - 60) {
    return cachedSession;
  }

  const initResp = await walletPost<AkInitResponse>(
    `${WALLET_PREFIX}/auth/ak/init`,
    { apiKey: env.OKX_API_KEY },
    anonymousHeaders(),
  );

  const { privateKeyB64, publicKeyB64 } = generateX25519Keypair();

  const locale = "en-US";
  const timestamp = Date.now();
  const method = "GET";
  const signPath = "/web3/ak/agentic/login";
  const params = `?locale=${locale}&nonce=${initResp.nonce}&iss=${initResp.iss}`;
  const sign = hmacSign(
    timestamp,
    method,
    signPath,
    params,
    env.OKX_SECRET_KEY,
  );

  const verifyResp = await walletPost<VerifyResponse>(
    `${WALLET_PREFIX}/auth/ak/verify`,
    {
      tempPubKey: publicKeyB64,
      apiKey: env.OKX_API_KEY,
      passphrase: env.OKX_PASSPHRASE,
      timestamp: timestamp.toString(),
      sign,
      locale,
    },
    anonymousHeaders(),
  );

  cachedSession = {
    accessToken: verifyResp.accessToken,
    refreshToken: verifyResp.refreshToken,
    sessionCert: verifyResp.sessionCert,
    sessionPrivateKey: privateKeyB64,
    encryptedSessionSk: verifyResp.encryptedSessionSk,
    projectId: verifyResp.projectId,
    accountId: verifyResp.accountId,
    accountName: verifyResp.accountName,
    addressList: verifyResp.addressList,
    expiresAt: Number(verifyResp.sessionKeyExpireAt),
  };

  return cachedSession;
}

export async function refreshTokens(): Promise<WalletSession> {
  if (!cachedSession) {
    return akLogin();
  }

  const resp = await walletPost<{ refreshToken: string; accessToken: string }>(
    `${WALLET_PREFIX}/auth/refresh`,
    { refreshToken: cachedSession.refreshToken },
    anonymousHeaders(),
  );

  cachedSession.accessToken = resp.accessToken;
  cachedSession.refreshToken = resp.refreshToken;
  return cachedSession;
}

async function getAuthedSession(): Promise<WalletSession> {
  if (!cachedSession) {
    return akLogin();
  }
  if (Date.now() / 1000 >= cachedSession.expiresAt - 60) {
    return akLogin();
  }
  return cachedSession;
}

export async function createAccount(): Promise<CreateAccountResponse> {
  const session = await getAuthedSession();
  return walletPost<CreateAccountResponse>(
    `${WALLET_PREFIX}/account/create`,
    { projectId: session.projectId },
    jwtHeaders(session.accessToken),
  );
}

export async function listAccounts(): Promise<AccountListItem[]> {
  const session = await getAuthedSession();
  const resp = await walletPost<AccountListItem[]>(
    `${WALLET_PREFIX}/account/list`,
    { projectId: session.projectId },
    jwtHeaders(session.accessToken),
  );
  return Array.isArray(resp) ? resp : [resp as unknown as AccountListItem];
}

export async function getAddresses(accountIds: string[]): Promise<{
  accounts: Array<{ accountId: string; addresses: AddressInfo[] }>;
}> {
  const session = await getAuthedSession();
  return walletPost(
    `${WALLET_PREFIX}/account/address/list`,
    { accountIds },
    jwtHeaders(session.accessToken),
  );
}

export async function getWalletBalance(
  chainId?: string,
  tokenAddress?: string,
): Promise<{ totalValueUsd: string; details: unknown[] }> {
  const session = await getAuthedSession();
  const params: Record<string, string> = {};
  if (chainId) params.chainIndex = chainId;
  if (tokenAddress) params.tokenContractAddress = tokenAddress;
  return walletGet(
    `${WALLET_PREFIX}/asset/wallet-all-token-balances`,
    params,
    jwtHeaders(session.accessToken),
  );
}

export async function getWalletBalanceBatch(
  accountIds: string[],
): Promise<unknown> {
  const session = await getAuthedSession();
  return walletGet(
    `${WALLET_PREFIX}/asset/wallet-all-token-balances-batch`,
    { accountIds: accountIds.join(",") },
    jwtHeaders(session.accessToken),
  );
}

export async function preTransactionUnsignedInfo(params: {
  chainIndex: number;
  fromAddr: string;
  toAddr: string;
  value: string;
  inputData?: string;
  gasLimit?: string;
}): Promise<{
  unsignedTxHash: string;
  unsignedTx: string;
  uopHash: string;
  hash: string;
  executeErrorMsg: string;
  executeResult: boolean;
  extraData: Record<string, unknown>;
}> {
  const session = await getAuthedSession();
  const chainPath = `m/44/60`;
  return walletPost(
    `${WALLET_PREFIX}/pre-transaction/unsignedInfo`,
    {
      chainPath,
      chainIndex: params.chainIndex,
      fromAddr: params.fromAddr,
      toAddr: params.toAddr,
      value: params.value,
      sessionCert: session.sessionCert,
      ...(params.inputData ? { inputData: params.inputData } : {}),
      ...(params.gasLimit ? { gasLimit: params.gasLimit } : {}),
    },
    jwtHeaders(session.accessToken),
  );
}

export async function broadcastTransaction(params: {
  accountId: string;
  address: string;
  chainIndex: string;
  extraData: string;
}): Promise<{ pkgId: string; orderId: string; txHash: string }> {
  const session = await getAuthedSession();
  return walletPost(
    `${WALLET_PREFIX}/pre-transaction/broadcast-transaction`,
    {
      accountId: params.accountId,
      address: params.address,
      chainIndex: params.chainIndex,
      extraData: params.extraData,
    },
    jwtHeaders(session.accessToken),
  );
}

export function getSession(): WalletSession | null {
  return cachedSession;
}

export function clearSession(): void {
  cachedSession = null;
}
