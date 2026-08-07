export const formatCurrency = (amount: number = 0, currency: string = 'QR'): string => {
  return `${currency} ${(Number(amount) || 0).toFixed(2)}`;
};
