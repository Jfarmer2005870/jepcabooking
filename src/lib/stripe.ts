import { loadStripe } from "@stripe/stripe-js";

export const STRIPE_PUBLISHABLE_KEY =
  "pk_test_51T4swGIoKT8N01gWNzy2gA3OoUrgDKKwEvvty0S3kbBJkmTDfA1haA6CQt97sLEcEjmmPsU4VFbXJUD0GHefUFiH00rrKXMLHj";

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
