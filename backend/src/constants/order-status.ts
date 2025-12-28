export const ORDER_STATUS_VALUES = [
  'PENDING',
  'RECEIVED',
  'READY_TO_SEND',
  'NOTIFIED_CALL',
  'NOTIFIED_WHATSAPP',
  'DELIVERED_COUNTER',
  'CANCELLED',
  'INCOMPLETO',
] as const;

export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];

export const ORDER_STATUS_SET: ReadonlySet<string> = new Set(ORDER_STATUS_VALUES);

export function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUS_SET.has(value);
}


