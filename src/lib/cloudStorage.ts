import { supabase } from '@/integrations/supabase/client';
import { Cliente, Repuesto, FichaTecnica, ServicioItem, RepuestoFicha } from '@/types';
import type { Json } from '@/integrations/supabase/types';

const PAGE_SIZE = 1000;

export const generateId = (): string => {
  return crypto.randomUUID();
};

// Clientes
export const getClientes = async (): Promise<Cliente[]> => {
  const all: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre')
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error('Error fetching clientes:', error);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all.map(c => ({
    id: c.id,
    nombre: c.nombre,
    telefono: c.telefono || '',
  }));
};

export const saveCliente = async (cliente: Cliente): Promise<void> => {
  const { error } = await supabase
    .from('clientes')
    .upsert({
      id: cliente.id,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
    }, { onConflict: 'id' });
  
  if (error) {
    console.error('Error saving cliente:', error);
    throw error;
  }
};

export const deleteCliente = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting cliente:', error);
    throw error;
  }
};

// Repuestos
export const getRepuestos = async (): Promise<Repuesto[]> => {
  const all: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('repuestos')
      .select('*')
      .order('nombre')
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error('Error fetching repuestos:', error);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all.map(r => ({
    id: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    precio: Number(r.precio),
  }));
};

export const saveRepuesto = async (repuesto: Repuesto): Promise<void> => {
  const { error } = await supabase
    .from('repuestos')
    .upsert({
      id: repuesto.id,
      codigo: repuesto.codigo,
      nombre: repuesto.nombre,
      precio: repuesto.precio,
    }, { onConflict: 'id' });
  
  if (error) {
    console.error('Error saving repuesto:', error);
    throw error;
  }
};

export const saveRepuestosBulk = async (nuevosRepuestos: Repuesto[]): Promise<void> => {
  const CHUNK_SIZE = 500;
  for (let i = 0; i < nuevosRepuestos.length; i += CHUNK_SIZE) {
    const chunk = nuevosRepuestos.slice(i, i + CHUNK_SIZE);
    const payload = chunk.map(r => ({
      id: r.id,
      codigo: r.codigo,
      nombre: r.nombre,
      precio: r.precio,
    }));
    
    const { error } = await supabase
      .from('repuestos')
      .upsert(payload, { onConflict: 'codigo' });
      
    if (error) {
      console.error(`Error bulk saving repuestos (chunk ${i}-${i+CHUNK_SIZE}):`, error);
      throw error;
    }
  }
};

export const deleteRepuesto = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('repuestos')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting repuesto:', error);
    throw error;
  }
};

export const deleteAllRepuestos = async (): Promise<void> => {
  const { error } = await supabase
    .from('repuestos')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
  
  if (error) {
    console.error('Error deleting all repuestos:', error);
    throw error;
  }
};

// Modelos
export const getModelos = async (): Promise<{ id: string; modelo: string }[]> => {
  const { data, error } = await supabase
    .from('modelos')
    .select('*')
    .order('nombre');
  
  if (error) {
    console.error('Error fetching modelos:', error);
    return [];
  }
  
  return data.map(m => ({
    id: m.id,
    modelo: m.nombre,
  }));
};

export const saveModelo = async (modelo: { id: string; modelo: string }): Promise<void> => {
  const { error } = await supabase
    .from('modelos')
    .upsert({
      id: modelo.id,
      nombre: modelo.modelo,
    }, { onConflict: 'id' });
  
  if (error) {
    console.error('Error saving modelo:', error);
    throw error;
  }
};

// Órdenes
export const getOrdenesByClienteNombre = async (nombre: string): Promise<FichaTecnica[]> => {
  const { data, error } = await supabase
    .from('ordenes')
    .select('*')
    .eq('cliente_nombre', nombre)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching ordenes by client:', error);
    return [];
  }

  return data.map(f => ({
    id: f.id,
    numeroBoleta: f.numero_orden,
    numeroServicio: f.numero_orden,
    fechaIngreso: new Date(f.fecha_ingreso),
    fechaReparacion: f.fecha_reparacion ? new Date(f.fecha_reparacion) : null,
    fechaEntrega: f.fecha_entrega ? new Date(f.fecha_entrega) : null,
    cliente: {
      id: f.id,
      nombre: f.cliente_nombre,
      telefono: f.cliente_telefono || '',
    },
    modeloMaquina: f.modelo_maquina,
    numeroSerie: f.numero_serie || '',
    tipoAveria: f.observaciones || '',
    repuestos: validateRepuestos(f.repuestos),
    servicios: validateServicios(f.servicios),
    recomendaciones: 'REPARACIÓN GARANTIZADA POR 10 DÍAS DE LA FECHA DE RETIRO',
    tecnico: f.mecanico as 'JORGE' | 'JEAN',
  }));
};

export const getOrdenes = async (): Promise<FichaTecnica[]> => {
  const { data, error } = await supabase
    .from('ordenes')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching ordenes:', error);
    return [];
  }
  
  return data.map(f => ({
    id: f.id,
    numeroBoleta: f.numero_orden,
    numeroServicio: f.numero_orden,
    fechaIngreso: new Date(f.fecha_ingreso),
    fechaReparacion: f.fecha_reparacion ? new Date(f.fecha_reparacion) : null,
    fechaEntrega: f.fecha_entrega ? new Date(f.fecha_entrega) : null,
    cliente: {
      id: f.id,
      nombre: f.cliente_nombre,
      telefono: f.cliente_telefono || '',
    },
    modeloMaquina: f.modelo_maquina,
    numeroSerie: f.numero_serie || '',
    tipoAveria: f.observaciones || '',
    repuestos: validateRepuestos(f.repuestos),
    servicios: validateServicios(f.servicios),
    recomendaciones: 'REPARACIÓN GARANTIZADA POR 10 DÍAS DE LA FECHA DE RETIRO',
    tecnico: f.mecanico as 'JORGE' | 'JEAN',
  }));
};

export const getOrdenById = async (id: string): Promise<FichaTecnica | null> => {
  const { data, error } = await supabase
    .from('ordenes')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching orden:', error);
    return null;
  }
  
  return {
    id: data.id,
    numeroBoleta: data.numero_orden,
    numeroServicio: data.numero_orden,
    fechaIngreso: new Date(data.fecha_ingreso),
    fechaReparacion: data.fecha_reparacion ? new Date(data.fecha_reparacion) : null,
    fechaEntrega: data.fecha_entrega ? new Date(data.fecha_entrega) : null,
    cliente: {
      id: data.id,
      nombre: data.cliente_nombre,
      telefono: data.cliente_telefono || '',
    },
    modeloMaquina: data.modelo_maquina,
    numeroSerie: data.numero_serie || '',
    tipoAveria: data.observaciones || '',
    repuestos: validateRepuestos(data.repuestos),
    servicios: validateServicios(data.servicios),
    recomendaciones: 'REPARACIÓN GARANTIZADA POR 10 DÍAS DE LA FECHA DE RETIRO',
    tecnico: data.mecanico as 'JORGE' | 'JEAN',
  };
};

// Helper functions for validation
const validateRepuestos = (json: Json | null): RepuestoFicha[] => {
  if (!Array.isArray(json)) return [];
  return json.map((item: any) => ({
    id: item.id || '',
    codigo: item.codigo || '',
    nombre: item.nombre || '',
    precio: Number(item.precio) || 0,
    cantidad: Number(item.cantidad) || 1,
    precioEditado: item.precioEditado ? Number(item.precioEditado) : undefined
  })).filter(r => r.id && r.codigo);
};

const validateServicios = (json: Json | null): ServicioItem[] => {
  if (!Array.isArray(json)) return [];
  return json.map((item: any) => ({
    nombre: item.nombre || '',
    revision: Boolean(item.revision),
    reparacion: Boolean(item.reparacion)
  }));
};

export const saveOrden = async (ficha: FichaTecnica): Promise<void> => {
  const fichaData = {
    numero_orden: ficha.numeroBoleta,
    fecha_ingreso: ficha.fechaIngreso.toISOString(),
    fecha_reparacion: ficha.fechaReparacion?.toISOString() || null,
    fecha_entrega: ficha.fechaEntrega?.toISOString() || null,
    cliente_nombre: ficha.cliente.nombre,
    cliente_telefono: ficha.cliente.telefono,
    modelo_maquina: ficha.modeloMaquina,
    numero_serie: ficha.numeroSerie,
    mecanico: ficha.tecnico,
    repuestos: JSON.parse(JSON.stringify(ficha.repuestos)) as Json,
    servicios: JSON.parse(JSON.stringify(ficha.servicios)) as Json,
    observaciones: ficha.tipoAveria,
    whatsapp_enviado: ficha.whatsapp_enviado,
    whatsapp_fecha: ficha.whatsapp_fecha?.toISOString() || null,
  };

  // Check if ficha exists
  const { data: existing } = await supabase
    .from('ordenes')
    .select('id')
    .eq('id', ficha.id)
    .maybeSingle();

  let error;
  if (existing) {
    const result = await supabase
      .from('ordenes')
      .update(fichaData)
      .eq('id', ficha.id);
    error = result.error;
  } else {
    const insertData = { ...fichaData } as Record<string, unknown>;
    insertData.id = ficha.id;
    const result = await supabase
      .from('ordenes')
      .insert(insertData as never);
    error = result.error;
  }
  
  if (error) {
    console.error('Error saving orden:', error);
    throw error;
  }
};

export const deleteOrden = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('ordenes')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting orden:', error);
    throw error;
  }
};

// Contador
export const getNextNumero = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('contador')
    .select('valor')
    .eq('id', 'boleta')
    .single();
  
  if (error) {
    console.error('Error fetching contador:', error);
    return 1;
  }
  
  return (data?.valor || 0) + 1;
};

export const incrementContador = async (): Promise<void> => {
  const nextValue = await getNextNumero();
  
  const { error } = await supabase
    .from('contador')
    .update({ valor: nextValue })
    .eq('id', 'boleta');
  
  if (error) {
    console.error('Error incrementing contador:', error);
    throw error;
  }
};

export const registrarIngreso = async (orden_id: string, monto: number): Promise<void> => {
  const { error } = await supabase
    .from('ingresos')
    .insert({ orden_id, monto, fecha: new Date().toISOString() });

  if (error) {
    console.error('Error saving income:', error);
    throw error;
  }
};

export const getHistorialCompleto = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('historial_comunicacion')
    .select('*, ordenes(numero_orden, cliente_nombre)')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching complete history:', error);
    return [];
  }

  return data;
};


export const getNextFolio = async (): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('ordenes')
      .select('numero_orden')
      .order('numero_orden', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching last order number:', error);
      // If the table doesn't exist or another error, start from 1
      return 'ST-000001';
    }

    let nextNumber = 1;
    if (data && data.length > 0) {
      const lastOrderNumber = data[0].numero_orden;
      const match = lastOrderNumber.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format the number with leading zeros
    const formattedNumber = nextNumber.toString().padStart(6, '0');
    return `ST-${formattedNumber}`;

  } catch (error) {
    console.error('Error in getNextFolio:', error);
    return 'ST-000001'; // Fallback
  }
};
