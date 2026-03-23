export const ESTADOS_ORDEN = {
  INGRESADO: 'ingresado',
  PROCESO: 'proceso',
  TERMINADO: 'terminado',
  ENTREGADO: 'entregado',
} as const;

export type EstadoOrden = typeof ESTADOS_ORDEN[keyof typeof ESTADOS_ORDEN];

export const ESTADOS_ORDEN_ARRAY = Object.values(ESTADOS_ORDEN);
