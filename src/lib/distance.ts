// Shared distance + pricing helpers. Keep this logic in sync with
// supabase/functions/create-booking-checkout/index.ts so the UI breakdown
// matches the server-computed checkout total exactly.

export const PLATFORM_FEE_PCT = 5;

// Haversine distance in miles
export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 3958.7613; // earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Round to one decimal mile — used for both display and fee math
export function roundMiles(miles: number): number {
  return Math.round(miles * 10) / 10;
}

function roundCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function calcTravelFee(
  miles: number,
  freeRadius: number,
  perMile: number
): number {
  const rounded = roundMiles(miles);
  const billable = Math.max(0, rounded - (freeRadius || 0));
  return roundCents(billable * (perMile || 0));
}

export interface PriceBreakdown {
  servicePrice: number;
  distanceMiles: number | null; // rounded to 0.1
  billableMiles: number;
  freeRadius: number;
  perMile: number;
  travelFee: number;
  subtotal: number; // service + travel
  platformFee: number;
  total: number;
}

export function calcBreakdown(opts: {
  servicePrice: number;
  rawDistanceMiles: number | null;
  freeRadius: number;
  perMile: number;
}): PriceBreakdown {
  const servicePrice = roundCents(opts.servicePrice || 0);
  const freeRadius = Number(opts.freeRadius || 0);
  const perMile = Number(opts.perMile || 0);
  const distanceMiles =
    opts.rawDistanceMiles != null ? roundMiles(opts.rawDistanceMiles) : null;
  const billableMiles =
    distanceMiles != null ? Math.max(0, roundMiles(distanceMiles - freeRadius)) : 0;
  const travelFee =
    distanceMiles != null ? roundCents(billableMiles * perMile) : 0;
  const subtotal = roundCents(servicePrice + travelFee);
  const platformFee = roundCents((subtotal * PLATFORM_FEE_PCT) / 100);
  const total = roundCents(subtotal + platformFee);
  return {
    servicePrice,
    distanceMiles,
    billableMiles,
    freeRadius,
    perMile,
    travelFee,
    subtotal,
    platformFee,
    total,
  };
}
