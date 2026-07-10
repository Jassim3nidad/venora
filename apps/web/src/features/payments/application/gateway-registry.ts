import { PaymentError } from "@/lib/errors";
import type { PaymentGateway } from "../domain/gateways/payment-gateway.port";
import type { PaymentProviderId } from "../types/payment.types";

/**
 * Lazy provider registry. Gateways register a factory; instances are
 * created on first use so missing env vars for one provider never break
 * checkout for another.
 */

export class PaymentProviderNotAvailableError extends PaymentError {
  constructor(provider: string) {
    super(
      "PAYMENT_PROVIDER_NOT_AVAILABLE",
      `Payment provider "${provider}" is not available yet. Please choose another payment method.`,
    );
  }
}

type GatewayFactory = () => PaymentGateway;

const factories = new Map<PaymentProviderId, GatewayFactory>();
const instances = new Map<PaymentProviderId, PaymentGateway>();

export function registerGateway(id: PaymentProviderId, factory: GatewayFactory): void {
  factories.set(id, factory);
}

export function isGatewayAvailable(id: PaymentProviderId): boolean {
  return factories.has(id);
}

export function getGateway(id: PaymentProviderId): PaymentGateway {
  const cached = instances.get(id);
  if (cached) return cached;

  const factory = factories.get(id);
  if (!factory) throw new PaymentProviderNotAvailableError(id);

  const gateway = factory();
  instances.set(id, gateway);
  return gateway;
}

export function listAvailableProviders(): PaymentProviderId[] {
  return [...factories.keys()];
}
