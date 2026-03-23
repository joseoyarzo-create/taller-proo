import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FichaTecnica } from '@/types';
import { getOrdenes, getRepuestos, getClientes, deleteOrden } from '@/lib/cloudStorage';
import { getTimeStatus } from '@/lib/utils';
import { generatePdfDocument, printFicha } from '@/lib/generatePdf';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { Clock, Download, Edit, FileDown, FileText, Package, Plus, Printer, Search, Trash2, Users, Wrench } from 'lucide-react';
import stihlLogo from '@/assets/stihl-logo.jpg';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Index = () => {
  const { toast } = useToast();
  const [allFichas, setAllFichas] = useState<FichaTecnica[]>([]);
  const [fichas, setFichas] = useState<FichaTecnica[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ repuestos: 0, clientes: 0, fichas: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFichas(allFichas.slice(0, 5));
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = allFichas.filter(f => 
        f.numeroBoleta.toLowerCase().includes(term) ||
        f.cliente.nombre.toLowerCase().includes(term) ||
        f.modeloMaquina.toLowerCase().includes(term)
      );
      setFichas(filtered);
    }
  }, [searchTerm, allFichas]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allFichasData, repuestos, clientes] = await Promise.all([
        getOrdenes(),
        getRepuestos(),
        getClientes(),
      ]);
      setAllFichas(allFichasData);
      setFichas(allFichasData.slice(0, 5));
      setStats({
        repuestos: repuestos.length,
        clientes: clientes.length,
        fichas: allFichasData.length,
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Error', description: 'Error al cargar datos', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };



  const handleDownloadPdf = async (ficha: FichaTecnica) => {
    try {
      await generatePdfDocument(ficha);
      toast({ title: 'Éxito', description: 'PDF descargado' });
    } catch (error) {
      toast({ title: 'Error', description: 'Error al generar PDF', variant: 'destructive' });
    }
  };

  const handlePrint = (ficha: FichaTecnica) => {
    try {
      printFicha(ficha);
      toast({ title: 'Éxito', description: 'Enviado a impresión' });
    } catch (error) {
      toast({ title: 'Error', description: 'Error al imprimir', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar esta ficha?')) {
      try {
        await deleteOrden(id);
        toast({ title: 'Éxito', description: 'Ficha eliminada' });
        loadData();
      } catch (error) {
        toast({ title: 'Error', description: 'Error al eliminar ficha', variant: 'destructive' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      
      <main className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link to="/ficha-tecnica" className="no-underline">
            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-stihl-orange/10 rounded-full">
                  <Plus className="h-6 w-6 text-stihl-orange" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Nueva Ficha</h3>
                  <p className="text-sm text-muted-foreground">Ingresar equipo</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/repuestos" className="no-underline">
            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-full">
                  <Package className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Repuestos</h3>
                  <p className="text-sm text-muted-foreground">{stats.repuestos} artículos</p>
                </div>
              </div>
            </div>
          </Link>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-border">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <Wrench className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">En Proceso</h3>
                <p className="text-sm text-muted-foreground">{stats.enProceso} equipos</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-border">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <Wrench className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Listos para Retiro</h3>
                <p className="text-sm text-muted-foreground">{stats.listos} equipos</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-border">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-full">
                <FileText className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Ingresos Totales</h3>
                <p className="text-sm text-muted-foreground">{stats.fichas} equipos</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-border">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <Users className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Reparaciones</h3>
                <p className="text-sm text-muted-foreground">{stats.fichas} realizadas</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-border">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Package className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Dinero Generado</h3>
                <p className="text-sm text-muted-foreground">${stats.dineroGenerado.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="p-6 border-b border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-stihl-orange" />
              Últimos Ingresos
            </h2>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por boleta, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Boleta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Equipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      Cargando datos...
                    </td>
                  </tr>
                ) : fichas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No se encontraron registros
                    </td>
                  </tr>
                ) : (
                  fichas.map((ficha) => (
                    <tr key={ficha.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-stihl-orange">
                        #{ficha.numeroBoleta}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {format(ficha.fechaIngreso, 'dd/MM/yyyy', { locale: es })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{ficha.cliente.nombre}</div>
                        <div className="text-xs text-muted-foreground">{ficha.cliente.telefono}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {ficha.modeloMaquina}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          En Taller
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Link to={`/ficha-tecnica/${ficha.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:text-gray-700 hover:bg-gray-100">
                                <FileText className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleDownloadWord(ficha)}>
                                <FileDown className="mr-2 h-4 w-4" />
                                Descargar Word
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadPdf(ficha)}>
                                <Download className="mr-2 h-4 w-4" />
                                Descargar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrint(ficha)}>
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(ficha.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
