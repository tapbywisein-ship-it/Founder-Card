export const formatINR = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined || amount === '') return '₹0';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return '₹0';
  if (n === 0) return 'Free';
  return `₹${n.toLocaleString('en-IN')}`;
};

export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';
