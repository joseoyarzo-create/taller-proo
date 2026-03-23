import { useState, useEffect } from 'react';
import { getHistorialCompleto } from '@/lib/cloudStorage';
import Header from '@/components/Header';
import Timeline from '@/components/Timeline';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const HistorialPage = () => {
  const [historial, setHistorial] = useState<any[]>([]);
  const [filteredHistorial, setFilteredHistorial] = useState<any[]>([]);
  const [clientes, setClientes] = useState<string[]>([]);
  const [ordenes, setOrdenes] = useState<string[]>([]);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedOrden, setSelectedOrden] = useState('');

  useEffect(() => {
    const loadHistorial = async () => {
      const data = await getHistorialCompleto();
      const validData = data.filter(item => item.ordenes);
      setHistorial(validData);
      setFilteredHistorial(validData);

      const uniqueClientes = [...new Set(validData.map(item => 
        Array.isArray(item.ordenes) ? item.ordenes[0]?.cliente_nombre : item.ordenes?.cliente_nombre
      ))].filter(Boolean) as string[];

      const uniqueOrdenes = [...new Set(validData.map(item => 
        Array.isArray(item.ordenes) ? item.ordenes[0]?.numero_orden : item.ordenes?.numero_orden
      ))].filter(Boolean) as string[];
      setClientes(uniqueClientes);
      setOrdenes(uniqueOrdenes);
    };
    loadHistorial();
  }, []);

  useEffect(() => {
    let filtered = historial;
    if (selectedCliente) {
      filtered = filtered.filter(item => item.ordenes.cliente_nombre === selectedCliente);
    }
    if (selectedOrden) {
      filtered = filtered.filter(item => item.ordenes.numero_orden === selectedOrden);
    }
    setFilteredHistorial(filtered);
  }, [selectedCliente, selectedOrden, historial]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-heading font-bold mb-8">Historial de Comunicación</h1>
        <div className="flex gap-4 mb-8">
          <Select onValueChange={setSelectedCliente} value={selectedCliente}>
            <SelectTrigger><SelectValue placeholder="Filtrar por cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los clientes</SelectItem>
              {clientes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select onValueChange={setSelectedOrden} value={selectedOrden}>
            <SelectTrigger><SelectValue placeholder="Filtrar por orden" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las ordenes</SelectItem>
              {ordenes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Timeline items={filteredHistorial} />
      </main>
    </div>
  );
};

export default HistorialPage;
