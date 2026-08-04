export const formatCurrency = (amount: number = 0, currency: string = 'QR'): string => {
  return `${currency} ${amount.toFixed(2)}`;
};
