export const ORDER_STEPS = ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'];
export function validateStatusChange(current, next) {
  if (current === next) return true;
  if (current === 'CANCELLED' || current === 'DELIVERED') return false;
  if (next === 'CANCELLED') return !['SHIPPED', 'DELIVERED'].includes(current);
  return ORDER_STEPS.indexOf(next) > ORDER_STEPS.indexOf(current);
}
export function invoiceType(paymentStatus) {
  return paymentStatus === 'PAID' ? 'Payment receipt' : 'Order invoice · payment pending';
}
