import { supabase } from '@/integrations/supabase/client';

export const enviarWhatsApp = (cliente: string, telefono: string, equipo: string, monto: number) => {
  const mensaje = `Hola ${cliente}, su equipo ${equipo} ya está listo para retiro. Total reparación: $${monto}. Puede retirarlo en nuestro local. Gracias.`;
  const url = `https://wa.me/56${telefono}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
};

export const registrarHistorial = async (orden_id: string, tipo: string, resultado: string) => {
  const { error } = await supabase
    .from('historial_comunicacion')
    .insert({ orden_id, tipo, resultado, fecha: new Date().toISOString() });

  if (error) {
    console.error('Error saving communication history:', error);
    throw error;
  }
};

export const getHistorialPorOrden = async (orden_id: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from('historial_comunicacion')
    .select('*')
    .eq('orden_id', orden_id)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching communication history:', error);
    return [];
  }

  return data;
};