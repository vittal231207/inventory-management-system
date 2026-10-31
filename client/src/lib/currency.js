/** Format workspace monetary amounts consistently using Indian grouping. */
export function formatCurrency(value, _currency = 'INR', options = {}) {
  // Legacy records may still carry USD metadata; the India-facing UI keeps
  // the stored numeric amount intact and consistently labels it in INR.
  void _currency
  const amount = Number(value)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(Number.isFinite(amount) ? amount : 0)
}
