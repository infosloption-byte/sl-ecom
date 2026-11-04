export const lkrEmail = cents => `LKR ${(Number(cents)/100).toLocaleString('en-LK', {minimumFractionDigits:2,maximumFractionDigits:2})}`;
