// ISO 4217 code of the only currency the hotel takes.
const VND_CURRENCY_CODE = 'VND';

// An integer VND amount as the mail's language writes money, e.g. `2.400.000 ₫`.
export function formatVnd(lang: string, amount: number): string {
  return new Intl.NumberFormat(lang, {
    style: 'currency',
    currency: VND_CURRENCY_CODE,
  }).format(amount);
}
