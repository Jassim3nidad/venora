import { PaymentError } from "@/lib/errors";
import type {
  CreateTransferParams,
  DisbursementGateway,
  ReceivingInstitution,
  TransferNetwork,
  TransferResult,
  TransferStatus,
} from "../../domain/gateways/disbursement-gateway.port";

/**
 * PayMongo Treasury (Money Movement) adapter.
 *
 * The single place that knows PayMongo's wire format. Endpoints and field
 * names below are taken verbatim from the Treasury documentation:
 *
 *   POST /v2/batch_transfers                     create transfers
 *   GET  /v2/transfers/{id}                      authoritative status
 *   GET  /v1/wallets/receiving_institutions      BIC lookup
 *
 * Note the version split is PayMongo's own, not a mistake: transfers are
 * v2, the institution list is still served from v1.
 *
 * Nothing here invents fields. `callback_url` is sent so PayMongo will
 * notify us, but its payload is undocumented, so status is only ever read
 * back through getTransfer().
 */

const API_BASE = "https://api.paymongo.com";
const REQUEST_TIMEOUT_MS = 20_000;
const SUPPORTED_CURRENCIES = ["PHP"];

export interface TreasuryConfig {
  secretKey: string;
  sourceAccountNumber: string;
  sourceAccountName: string;
  sourceAccountBic: string;
  callbackUrl: string;
  /** Kill switch: money-out stays off until explicitly enabled. */
  enabled: boolean;
  /** Sent as `purpose` on every transfer. */
  transferPurpose: string;
}

interface TreasuryErrorBody {
  errors?: Array<{ code?: string; detail?: string; message?: string }>;
  message?: string;
}

/** Shape of a transfer object in both the create and retrieve responses. */
interface TransferPayload {
  id?: string;
  status?: string;
  provider?: string;
  amount?: number;
  fee?: number | string;
  reference_number?: string;
  provider_reference_number?: string | null;
  batch_transfer_id?: string | null;
}

const TRANSFER_STATUSES: TransferStatus[] = ["pending", "succeeded", "failed"];

function toTransferStatus(value: unknown): TransferStatus {
  return TRANSFER_STATUSES.includes(value as TransferStatus)
    ? (value as TransferStatus)
    : // An unrecognised status must never be read as success. Treating it
      // as pending keeps the withdrawal in flight for getTransfer() to
      // resolve, rather than settling or releasing on a guess.
      "pending";
}

function toMinorOrNull(value: number | string | undefined): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export class PayMongoTreasuryAdapter implements DisbursementGateway {
  readonly id = "paymongo" as const;

  constructor(private readonly config: TreasuryConfig) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.enabled &&
      this.config.secretKey &&
      this.config.sourceAccountNumber &&
      this.config.sourceAccountName &&
      this.config.sourceAccountBic,
    );
  }

  /** Names the missing pieces so misconfiguration is actionable, not silent. */
  private assertConfigured(): void {
    if (!this.config.enabled) {
      throw new PaymentError(
        "DISBURSEMENT_NOT_ENABLED",
        "Automated payouts are switched off for this environment. This withdrawal must be settled manually by finance.",
      );
    }

    const missing = (
      [
        ["PAYMONGO_SECRET_KEY", this.config.secretKey],
        ["PAYMONGO_SOURCE_ACCOUNT_NUMBER", this.config.sourceAccountNumber],
        ["PAYMONGO_SOURCE_ACCOUNT_NAME", this.config.sourceAccountName],
        ["PAYMONGO_SOURCE_ACCOUNT_BIC", this.config.sourceAccountBic],
      ] as const
    )
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length > 0) {
      throw new PaymentError(
        "DISBURSEMENT_NOT_CONFIGURED",
        `Payout provider is not fully configured. Missing: ${missing.join(", ")}.`,
      );
    }
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.config.secretKey}:`).toString("base64")}`;
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
    } catch (error) {
      // A timeout on a money-out call is genuinely ambiguous: the transfer
      // may or may not have been created. Surfaced as its own code so the
      // caller can leave the withdrawal in flight for reconciliation
      // instead of releasing funds that might already be moving.
      if (error instanceof Error && error.name === "AbortError") {
        console.error(
          `[treasury] ${method} ${path} timed out after ${REQUEST_TIMEOUT_MS}ms`,
        );
        throw new PaymentError(
          "DISBURSEMENT_PROVIDER_TIMEOUT",
          "The payout provider did not respond in time. This transfer may still be in progress and will be reconciled.",
        );
      }
      console.error(`[treasury] ${method} ${path} network error:`, error);
      throw new PaymentError(
        "DISBURSEMENT_PROVIDER_UNREACHABLE",
        "Could not reach the payout provider. Please try again.",
      );
    } finally {
      clearTimeout(timeout);
    }

    const json = (await response.json().catch(() => null)) as
      (TreasuryErrorBody & { data?: T }) | null;

    if (!response.ok) {
      const detail =
        json?.errors?.[0]?.detail ??
        json?.errors?.[0]?.message ??
        json?.message ??
        `Payout provider returned ${response.status}`;

      // Status is logged, body is not: error payloads can echo back
      // account numbers and names.
      console.error(
        `[treasury] ${method} ${path} failed with ${response.status}: ${detail}`,
      );

      if (response.status === 401 || response.status === 403) {
        throw new PaymentError(
          "DISBURSEMENT_AUTH_FAILED",
          "The payout provider rejected our credentials. Check PAYMONGO_SECRET_KEY and that Money Movement is enabled.",
        );
      }
      if (response.status === 422 || response.status === 400) {
        throw new PaymentError("DISBURSEMENT_REJECTED", detail);
      }
      throw new PaymentError("DISBURSEMENT_PROVIDER_ERROR", detail);
    }

    if (!json?.data) {
      console.error(`[treasury] ${method} ${path} returned no data envelope`);
      throw new PaymentError(
        "DISBURSEMENT_PROVIDER_ERROR",
        "The payout provider returned an unexpected response.",
      );
    }

    return json.data;
  }

  private toResult(transfer: TransferPayload): TransferResult {
    if (!transfer.id) {
      throw new PaymentError(
        "DISBURSEMENT_PROVIDER_ERROR",
        "The payout provider returned a transfer without an id.",
      );
    }

    return {
      transferId: transfer.id,
      batchTransferId: transfer.batch_transfer_id ?? null,
      providerReferenceNumber: transfer.provider_reference_number ?? null,
      status: toTransferStatus(transfer.status),
      network: transfer.provider ?? "unknown",
      feeMinor: toMinorOrNull(transfer.fee),
    };
  }

  async createTransfer(params: CreateTransferParams): Promise<TransferResult> {
    this.assertConfigured();

    if (!SUPPORTED_CURRENCIES.includes(params.currency.toUpperCase())) {
      throw new PaymentError(
        "UNSUPPORTED_CURRENCY",
        `Treasury transfers support ${SUPPORTED_CURRENCIES.join(", ")} only, not ${params.currency}.`,
      );
    }

    if (!Number.isInteger(params.amountMinor) || params.amountMinor <= 0) {
      throw new PaymentError(
        "DISBURSEMENT_REJECTED",
        "Transfer amount must be a positive whole number of centavos.",
      );
    }

    // One transfer per batch. Batching is for bulk payroll; here each
    // withdrawal is independently approved and must fail independently.
    const data = await this.request<{
      id?: string;
      transfers?: TransferPayload[];
    }>("POST", "/v2/batch_transfers", {
      transfers: [
        {
          provider: params.network,
          amount: params.amountMinor,
          currency: params.currency.toUpperCase(),
          purpose: this.config.transferPurpose,
          description: params.description,
          reference_number: params.reference,
          source_account: {
            number: this.config.sourceAccountNumber,
            name: this.config.sourceAccountName,
            bic: this.config.sourceAccountBic,
          },
          destination_account: {
            number: params.destination.accountNumber,
            name: params.destination.accountName,
            bic: params.destination.institutionCode,
          },
          ...(this.config.callbackUrl
            ? { callback_url: this.config.callbackUrl }
            : {}),
          ...(params.metadata ? { metadata: params.metadata } : {}),
        },
      ],
    });

    const transfer = data.transfers?.[0];
    if (!transfer) {
      throw new PaymentError(
        "DISBURSEMENT_PROVIDER_ERROR",
        "The payout provider accepted the batch but returned no transfer.",
      );
    }

    return {
      ...this.toResult(transfer),
      batchTransferId: transfer.batch_transfer_id ?? data.id ?? null,
    };
  }

  async getTransfer(transferId: string): Promise<TransferResult> {
    this.assertConfigured();
    const data = await this.request<TransferPayload>(
      "GET",
      `/v2/transfers/${encodeURIComponent(transferId)}`,
    );
    return this.toResult(data);
  }

  async listReceivingInstitutions(
    network: TransferNetwork,
  ): Promise<ReceivingInstitution[]> {
    // Deliberately not behind assertConfigured(): the picker must work
    // while money-out is still switched off, so accounts can be collected
    // and verified before the first payout.
    if (!this.config.secretKey) {
      throw new PaymentError(
        "DISBURSEMENT_NOT_CONFIGURED",
        "PAYMONGO_SECRET_KEY is required to load supported institutions.",
      );
    }

    const data = await this.request<
      Array<{
        id?: string;
        attributes?: {
          name?: string;
          provider?: string;
          provider_code?: string;
        };
      }>
    >("GET", `/v1/wallets/receiving_institutions?provider=${network}`);

    return (Array.isArray(data) ? data : [])
      .map((item) => ({
        code: item.attributes?.provider_code ?? "",
        name: item.attributes?.name ?? "",
        network,
      }))
      .filter((item) => item.code && item.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function createPayMongoTreasuryAdapter(): PayMongoTreasuryAdapter {
  return new PayMongoTreasuryAdapter({
    secretKey: process.env.PAYMONGO_SECRET_KEY ?? "",
    sourceAccountNumber: process.env.PAYMONGO_SOURCE_ACCOUNT_NUMBER ?? "",
    sourceAccountName: process.env.PAYMONGO_SOURCE_ACCOUNT_NAME ?? "",
    sourceAccountBic: process.env.PAYMONGO_SOURCE_ACCOUNT_BIC ?? "",
    callbackUrl: process.env.PAYMONGO_CALLBACK_URL ?? "",
    enabled: process.env.PAYMONGO_DISBURSEMENTS_ENABLED === "true",
    transferPurpose: process.env.PAYMONGO_TRANSFER_PURPOSE ?? "Disbursement",
  });
}
