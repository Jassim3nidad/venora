import { registerGateway } from "../application/gateway-registry";
import { createPayMongoGateway } from "./paymongo/paymongo.gateway";

/**
 * Central gateway wiring. Import this module (server-side only) before
 * resolving a gateway from the registry.
 *
 *
 * Adding Stripe later:
 *
 *   if (process.env.STRIPE_SECRET_KEY) {
 *     registerGateway("stripe", createStripeGateway);
 *   }
 */
if (process.env.PAYMONGO_SECRET_KEY) {
  registerGateway("paymongo", createPayMongoGateway);
}
