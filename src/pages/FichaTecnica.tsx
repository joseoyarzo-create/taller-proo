import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FichaTecnica, Cliente, RepuestoFicha, Tecnico, EstadoOrden } from '@/types';
import { ESTADOS_ORDEN, ESTADOS_ORDEN_ARRAY } from '@/types/consts';
import { getClientes, saveCliente, saveOrden, generateId, getModelos, saveModelo, getOrdenById, getNextFolio, registrarIngreso } from '@/lib/cloudStorage';
import { enviarWhatsApp, registrarHistorial, getHistorialPorOrden } from '@/lib/communications';
import { generatePdfDocument, printFicha } from '@/lib/generatePdf';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import RepuestosSelector from '@/components/RepuestosSelector';
import ServiciosTable, { DEFAULT_SERVICIOS } from '@/components/ServiciosTable';
import Timeline from '@/components/Timeline';
import { CalendarIcon, FileText, User, Wrench, FileDown, Printer, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const FichaTecnicaPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modelos, setModelos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(!!id);
  const [exportType, setExportType] = useState<'pdf' | 'print'>('pdf');
  const exportTypeRef = useRef<'pdf' | 'print'>('pdf');
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [callResult, setCallResult] = useState<'contesto' | 'no_contesto' | 'fuera_servicio'>('contesto');
  const [historial, setHistorial] = useState<any[]>([]);

  // Form state
  const [numeroOrden, setNumeroOrden] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState<Date>(new Date());
  const [fechaReparacion, setFechaReparacion] = useState<Date>(new Date());
  const [fechaEntrega, setFechaEntrega] = useState<Date | null>(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [modeloMaquina, setModeloMaquina] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [tipoAveria, setTipoAveria] = useState('');
  const [repuestos, setRepuestos] = useState<RepuestoFicha[]>([]);
  const [servicios, setServicios] = useState(DEFAULT_SERVICIOS);
  const [tecnico, setTecnico] = useState<Tecnico>('JORGE');
  const [estado, setEstado] = useState<EstadoOrden>(ESTADOS_ORDEN.INGRESADO);
  const [diagnostico, setDiagnostico] = useState('');
  const [solucion, setSolucion] = useState('');
  const [montoTotal, setMontoTotal] = useState(0);
  const [whatsappEnviado, setWhatsappEnviado] = useState(false);
  const [whatsappFecha, setWhatsappFecha] = useState<Date | null>(null);

  useEffect(() => {
    loadData();
    if (id) {
      loadFicha(id);
    }
  }, [id]);

  const loadFicha = async (fichaId: string) => {
    try {
      const [ficha, historialData] = await Promise.all([
        getOrdenById(fichaId),
        getHistorialPorOrden(fichaId),
      ]);

      if (ficha) {
        setNumeroOrden(ficha.numeroBoleta);
        setFechaIngreso(ficha.fechaIngreso);
        setFechaReparacion(ficha.fechaReparacion || new Date());
        setFechaEntrega(ficha.fechaEntrega);
        setClienteNombre(ficha.cliente.nombre);
        setClienteTelefono(ficha.cliente.telefono);
        setSelectedClienteId(ficha.cliente.id);
        setModeloMaquina(ficha.modeloMaquina);
        setNumeroSerie(ficha.numeroSerie);
        setTipoAveria(ficha.tipoAveria);
        setRepuestos(ficha.repuestos || []);
        // setWhatsappEnviado(ficha.whatsapp_enviado);
        // setWhatsappFecha(ficha.whatsapp_fecha);
        setServicios(ficha.servicios.length > 0 ? ficha.servicios : DEFAULT_SERVICIOS);
        setTecnico(ficha.tecnico);
        setEstado(ficha.estado || ESTADOS_ORDEN.INGRESADO);
        setDiagnostico(ficha.diagnostico || '');
        setSolucion(ficha.solucion || '');
        setMontoTotal(ficha.monto_total || 0);
        setWhatsappEnviado(ficha.whatsapp_enviado || false);
        setWhatsappFecha(ficha.whatsapp_fecha ? new Date(ficha.whatsapp_fecha) : null);
        setHistorial(historialData || []);
      } else {
        toast({ title: 'Error', description: 'Ficha no encontrada', variant: 'destructive' });
        navigate('/');
      }
    } catch (error) {
      console.error('Error loading ficha:', error);
      toast({ title: 'Error', description: 'Error al cargar la ficha', variant: 'destructive' });
    } finally {
      setIsFetching(false);
    }
  };

  const loadData = async () => {
    try {
      const promises: Promise<any>[] = [
        getClientes(),
        getModelos(),
      ];

      if (!id) {
        promises.push(getNextFolio());
      }

      const results = await Promise.all(promises);
      const clientesData = results[0];
      const modelosData = results[1];
      
      setClientes(clientesData);
      setModelos(modelosData.map((m: any) => m.modelo));

      if (!id && results[2]) {
        setNumeroOrden(results[2]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Error', description: 'Error al cargar datos', variant: 'destructive' });
    }
  };

  const handleClienteSelect = (clienteId: string) => {
    if (clienteId === 'nuevo') {
      setSelectedClienteId(null);
      setClienteNombre('');
      setClienteTelefono('');
      return;
    }
    const cliente = clientes.find((c) => c.id === clienteId);
    if (cliente) {
      setSelectedClienteId(cliente.id);
      setClienteNombre(cliente.nombre);
      setClienteTelefono(cliente.telefono);
    }
  };

  const handleModeloSelect = (modelo: string) => {
    if (modelo === 'nuevo') {
      setModeloMaquina('');
      return;
    }
    setModeloMaquina(modelo);
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(exportTypeRef.current);
  };

  const handleSubmit = async (type: 'pdf' | 'print') => {
    if (!numeroOrden.trim()) {
      toast({ title: 'Error', description: 'El número de orden es requerido', variant: 'destructive' });
      return;
    }
    if (!clienteNombre.trim()) {
      toast({ title: 'Error', description: 'El nombre del cliente es requerido', variant: 'destructive' });
      return;
    }
    if (!modeloMaquina.trim()) {
      toast({ title: 'Error', description: 'El modelo de máquina es requerido', variant: 'destructive' });
      return;
    }
    if (!tipoAveria.trim()) {
      toast({ title: 'Error', description: 'El tipo de avería es requerido', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setExportType(type);

    try {
      // Save cliente
      let cliente: Cliente;
      if (selectedClienteId) {
        cliente = { id: selectedClienteId, nombre: clienteNombre, telefono: clienteTelefono };
      } else {
        cliente = { id: generateId(), nombre: clienteNombre, telefono: clienteTelefono };
      }
      await saveCliente(cliente);

      // Save modelo if new
      if (!modelos.includes(modeloMaquina)) {
        await saveModelo({ id: generateId(), modelo: modeloMaquina });
      }

      const ficha: FichaTecnica = {
        id: id || generateId(),
        numeroBoleta: numeroOrden.trim(),
        numeroServicio: numeroOrden.trim(),
        fechaIngreso,
        fechaReparacion,
        cliente,
        modeloMaquina,
        numeroSerie,
        tipoAveria,
        repuestos,
        servicios,
        recomendaciones: 'REPARACIÓN GARANTIZADA POR 10 DÍAS DE LA FECHA DE RETIRO',
        tecnico,
        estado,
        diagnostico,
        solucion,
        monto_total: montoTotal,
        whatsapp_enviado: whatsappEnviado,
        whatsapp_fecha: whatsappFecha,
        fechaEntrega,
      };

      await saveOrden(ficha);

      // if (estado === ESTADOS_ORDEN.TERMINADO) {
      //   enviarWhatsApp(cliente.nombre, cliente.telefono, modeloMaquina, montoTotal);
      //   await registrarHistorial(ficha.id, 'whatsapp', 'enviado');
      //   setWhatsappEnviado(true);
      //   setWhatsappFecha(new Date());
      // }

      // Generate document based on type
      if (estado === ESTADOS_ORDEN.TERMINADO) {
        enviarWhatsApp(cliente.nombre, cliente.telefono, modeloMaquina, montoTotal);
        await registrarHistorial(ficha.id, 'whatsapp', 'enviado');
        setWhatsappEnviado(true);
        setWhatsappFecha(new Date());
        await generatePdfDocument(ficha);
        toast({ title: 'Éxito', description: `Ficha ${id ? 'actualizada' : 'guardada'}, PDF generado y WhatsApp enviado` });
      } else if (type === 'pdf') {
        await generatePdfDocument(ficha);
        toast({ title: 'Éxito', description: `Ficha ${id ? 'actualizada' : 'guardada'} y PDF generado` });
      } else {
        printFicha(ficha);
        toast({ title: 'Éxito', description: `Ficha ${id ? 'actualizada' : 'guardada'} y enviada a impresión` });
      }

      // If we are editing, we don't necessarily want to reset the form, maybe just refresh data or stay there
      if (!id) {
        // Reset form only if creating new
        setNumeroOrden('');
        setClienteNombre('');
        setClienteTelefono('');
        setSelectedClienteId(null);
        setModeloMaquina('');
        setNumeroSerie('');
        setTipoAveria('');
        setRepuestos([]);
        setServicios(DEFAULT_SERVICIOS);
        setFechaIngreso(new Date());
        setFechaReparacion(new Date());
        setFechaEntrega(null);
      }
      
      // Refresh data
      await loadData();
      if (id) {
        // Optionally redirect back or stay
        // navigate('/'); 
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Error al generar el documento', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterCall = async () => {
    if (!id) {
      toast({ title: 'Error', description: 'Debe guardar la ficha antes de registrar una llamada', variant: 'destructive' });
      return;
    }
    try {
      await registrarHistorial(id, 'llamada', callResult);
      toast({ title: 'Éxito', description: 'Llamada registrada correctamente' });
      setIsCallDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo registrar la llamada', variant: 'destructive' });
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cargando ficha...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-heading font-bold">{id ? 'Editar Ficha Técnica' : 'Nueva Ficha Técnica'}</h1>
        </div>

        <form className="grid gap-6" onSubmit={onFormSubmit}>
          {/* Datos del Servicio */}
          <section className="form-section animate-fade-in">
            <h2 className="form-section-title flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Datos del Servicio
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="input-group">
                <Label className="input-label">Nº de Orden</Label>
                <Input
                  required
                  value={numeroOrden}
                  onChange={(e) => setNumeroOrden(e.target.value)}
                  placeholder="Ej: ST-000001"
                  disabled
                />
              </div>

              <div className="input-group">
                <Label className="input-label">Fecha de Ingreso</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !fechaIngreso && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaIngreso ? format(fechaIngreso, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fechaIngreso}
                      onSelect={(date) => date && setFechaIngreso(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="input-group">
                <Label className="input-label">Fecha de Reparación (automática)</Label>
                <Input 
                  value={format(fechaReparacion, 'dd/MM/yyyy', { locale: es })} 
                  disabled 
                  className="bg-muted" 
                />
              </div>

              <div className="input-group">
                <Label className="input-label">Fecha de Entrega</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !fechaEntrega && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaEntrega ? format(fechaEntrega, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fechaEntrega ?? undefined}
                      onSelect={(date) => setFechaEntrega(date ?? null)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="input-group">
                <Label className="input-label">Estado de la Orden</Label>
                <Select value={estado} onValueChange={(value) => setEstado(value as EstadoOrden)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_ORDEN_ARRAY.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Datos del Cliente */}
          <section className="form-section animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h2 className="form-section-title flex items-center gap-2">
              <User className="h-5 w-5" />
              Datos del Cliente
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="input-group">
                <Label className="input-label">Buscar Cliente</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      {selectedClienteId
                        ? clientes.find((c) => c.id === selectedClienteId)?.nombre
                        : "Seleccionar o crear cliente..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar por nombre o teléfono..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => handleClienteSelect('nuevo')}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            <span>Nuevo cliente</span>
                          </CommandItem>
                          {clientes.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.nombre} ${c.telefono}`}
                              onSelect={() => handleClienteSelect(c.id)}
                            >
                              {c.nombre} <span className="text-xs text-muted-foreground ml-2">{c.telefono}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="input-group">
                <Label className="input-label">Nombre *</Label>
                <Input
                  required
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Nombre del cliente"
                />
              </div>

              <div className="input-group">
                <Label className="input-label">Teléfono</Label>
                <Input
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  placeholder="+56 9 1234 5678"
                />
              </div>
            </div>
          </section>

          {/* Datos del Equipo */}
          <section className="form-section animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="form-section-title flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Datos del Equipo
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="input-group">
                <Label className="input-label">Modelo existente</Label>
                <Select onValueChange={handleModeloSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar o nuevo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nuevo">+ Nuevo modelo</SelectItem>
                    {modelos.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="input-group">
                <Label className="input-label">Modelo de Máquina *</Label>
                <Input
                  required
                  value={modeloMaquina}
                  onChange={(e) => setModeloMaquina(e.target.value)}
                  placeholder="Ej: MS 210"
                />
              </div>

              <div className="input-group">
                <Label className="input-label">Nº de Serie</Label>
                <Input
                  value={numeroSerie}
                  onChange={(e) => setNumeroSerie(e.target.value)}
                  placeholder="Ej: 123456789"
                />
              </div>

              <div className="input-group">
                <Label className="input-label">Tipo de Avería (Problema) *</Label>
                <Textarea
                  required
                  value={tipoAveria}
                  onChange={(e) => setTipoAveria(e.target.value)}
                  placeholder="Describa el problema..."
                  rows={2}
                />
              </div>

              <div className="input-group md:col-span-2">
                <Label className="input-label">Diagnóstico Técnico *</Label>
                <Textarea
                  required
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                  placeholder="Describa el diagnóstico..."
                  rows={2}
                />
              </div>

              <div className="input-group md:col-span-2">
                <Label className="input-label">Solución Aplicada *</Label>
                <Textarea
                  required
                  value={solucion}
                  onChange={(e) => setSolucion(e.target.value)}
                  placeholder="Describa la solución..."
                  rows={2}
                />
              </div>

              <div className="input-group">
                <Label className="input-label">Monto Total *</Label>
                <Input
                  type="number"
                  required
                  value={montoTotal}
                  onChange={(e) => setMontoTotal(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>
          </section>

          {/* Repuestos */}
          <section className="form-section animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <h2 className="form-section-title">Repuestos Utilizados</h2>
            <RepuestosSelector
              selectedRepuestos={repuestos}
              onRepuestosChange={setRepuestos}
            />
          </section>

          {/* Servicios */}
          <section className="form-section animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <h2 className="form-section-title">Servicios Realizados</h2>
            <ServiciosTable
              servicios={servicios}
              onServiciosChange={setServicios}
            />
          </section>

          {/* Técnico */}
          <section className="form-section animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <h2 className="form-section-title">Mecánico Encargado</h2>
            <RadioGroup
              value={tecnico}
              onValueChange={(value) => setTecnico(value as Tecnico)}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="JORGE" id="jorge" />
                <Label htmlFor="jorge" className="cursor-pointer font-medium">JORGE</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="JEAN" id="jean" />
                <Label htmlFor="jean" className="cursor-pointer font-medium">JEAN</Label>
              </div>
            </RadioGroup>
          </section>

          {/* Garantía */}
          <section className="form-section animate-fade-in bg-primary/5 border-primary/20" style={{ animationDelay: '0.6s' }}>
            <p className="font-bold text-center text-lg">
              REPARACIÓN GARANTIZADA POR 10 DÍAS DE LA FECHA DE RETIRO
            </p>
          </section>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 animate-fade-in">
            <Button
              type="submit"
              onClick={() => {
                setExportType('pdf');
                exportTypeRef.current = 'pdf';
              }}
              disabled={isLoading}
              size="lg"
              className="flex-1 hover-lift"
            >
              <FileDown className="mr-2 h-5 w-5" />
              {isLoading && exportType === 'pdf' ? 'Generando...' : 'Guardar y PDF'}
            </Button>
            
            <Button
              type="submit"
              onClick={() => {
                setExportType('print');
                exportTypeRef.current = 'print';
              }}
              disabled={isLoading}
              size="lg"
              variant="outline"
              className="flex-1 hover-lift"
            >
              <Printer className="mr-2 h-5 w-5" />
              {isLoading && exportType === 'print' ? 'Imprimiendo...' : 'Guardar e Imprimir'}
            </Button>
          </div>
        </form>

        {id && (
          <section className="form-section animate-fade-in mt-8" style={{ animationDelay: '0.7s' }}>
            <h2 className="form-section-title flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Historial de Comunicación
            </h2>
            <Timeline items={historial} />
            <div className="mt-4 flex gap-2">
              <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> Registrar Llamada
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar Resultado de Llamada</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <RadioGroup value={callResult} onValueChange={(v) => setCallResult(v as any)} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="contesto" id="r1" />
                        <Label htmlFor="r1">Contestó</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no_contesto" id="r2" />
                        <Label htmlFor="r2">No contestó</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fuera_servicio" id="r3" />
                        <Label htmlFor="r3">Fuera de servicio / Equivocado</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleRegisterCall}>Registrar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default FichaTecnicaPage;
