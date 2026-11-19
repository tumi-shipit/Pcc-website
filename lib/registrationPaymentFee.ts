export const ONLINE_REGISTRATION_FEE_RATE = 0.0372;

export function calculateOnlineRegistrationTotal(entryFee: number) {
  const entryFeeCents = Math.round(Number(entryFee) * 100);
  const onlineFeeCents = Math.round(entryFeeCents * ONLINE_REGISTRATION_FEE_RATE);

  return {
    entryFeeCents,
    onlineFeeCents,
    totalCents: entryFeeCents + onlineFeeCents,
  };
}

export function formatZarCents(cents: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
