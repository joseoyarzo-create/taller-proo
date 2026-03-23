import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Repuesto } from '@/types';
import { getRepuestos, saveRepuesto, saveRepuestosBulk, deleteRepuesto, deleteAllRepuestos, generateId } from '@/lib/cloudStorage';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { Package, Upload, Plus, Trash2, Search, Edit2, Check, X, FileSpreadsheet } from 'lucide-react';

const RepuestosPage = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // New repuesto form
  const [nuevoCodigo, setNuevoCodigo] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');

  // Edit form
  const [editCodigo, setEditCodigo] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editPrecio, setEditPrecio] = useState('');

  useEffect(() => {
    loadRepuestos();
  }, []);

  const loadRepuestos = async () => {
    setIsLoading(true);
    try {
      const data = await getRepuestos();
      setRepuestos(data);
    } catch (error) {
      console.error('Error loading repuestos:', error);
      toast({ title: 'Error', description: 'Error al cargar repuestos', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, minPrice, maxPrice]);

  const handleAddRepuesto = async () => {
    if (!nuevoCodigo.trim() || !nuevoNombre.trim()) {
      toast({ title: 'Error', description: 'Código y nombre son requeridos', variant: 'destructive' });
      return;
    }

    const precio = nuevoPrecio ? parseInt(nuevoPrecio) : 1;
    const repuesto: Repuesto = {
      id: generateId(),
      codigo: nuevoCodigo.trim().toUpperCase(),
      nombre: nuevoNombre.trim(),
      precio,
    };

    try {
      await saveRepuesto(repuesto);
      await loadRepuestos();
      setNuevoCodigo('');
      setNuevoNombre('');
      setNuevoPrecio('');
      toast({ title: 'Éxito', description: 'Repuesto agregado correctamente' });
    } catch (error) {
      toast({ title: 'Error', description: 'Error al agregar repuesto', variant: 'destructive' });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        if (!jsonData || jsonData.length === 0) {
          toast({ title: 'Error', description: 'El archivo parece estar vacío', variant: 'destructive' });
          return;
        }

        const nuevosRepuestos: Repuesto[] = [];
        
        // Find header row logic
        let startRow = -1;
        let codigoIdx = -1;
        let nombreIdx = -1;
        let precioIdx = -1;

        // Search in first 10 rows for headers
        for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
          const row = jsonData[i];
          if (!row || !Array.isArray(row)) continue;
          
          const rowStr = row.map(c => String(c).toLowerCase());
          const cIdx = rowStr.findIndex(c => c.includes('codigo') || c.includes('código') || c.includes('code'));
          const nIdx = rowStr.findIndex(c => c.includes('nombre') || c.includes('descripcion') || c.includes('descripción'));
          const pIdx = rowStr.findIndex(c => c.includes('precio') || c.includes('valor'));

          if (cIdx !== -1 || nIdx !== -1) {
            startRow = i + 1;
            codigoIdx = cIdx !== -1 ? cIdx : 0;
            nombreIdx = nIdx !== -1 ? nIdx : 1;
            precioIdx = pIdx !== -1 ? pIdx : 2;
            break;
          }
        }

        // If no header found, assume row 0 is data if it has at least 2 columns
        if (startRow === -1) {
          if (jsonData[0] && jsonData[0].length >= 2) {
            startRow = 0;
            codigoIdx = 0;
            nombreIdx = 1;
            precioIdx = 2;
          } else {
             toast({ title: 'Error', description: 'No se pudo detectar el formato de columnas (Código, Nombre)', variant: 'destructive' });
             setIsImporting(false);
             return;
          }
        }

        console.log(`Importing starting from row ${startRow}, Cols: [${codigoIdx}, ${nombreIdx}, ${precioIdx}]`);

        for (let i = startRow; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || !Array.isArray(row)) continue;

          const codigoRaw = row[codigoIdx];
          const nombreRaw = row[nombreIdx];
          
          if (!codigoRaw) continue;

          const codigo = String(codigoRaw).trim().toUpperCase();
          const nombre = nombreRaw ? String(nombreRaw).trim() : 'SIN NOMBRE';
          
          let precio = 1;
          if (precioIdx !== -1 && row[precioIdx] !== undefined) {
             const precioRaw = row[precioIdx];
             if (typeof precioRaw === 'number') {
                precio = precioRaw;
             } else {
                const parsed = parseInt(String(precioRaw).replace(/[^0-9]/g, ''));
                if (!isNaN(parsed) && parsed > 0) precio = parsed;
             }
          }

          if (codigo.length > 0) {
            nuevosRepuestos.push({
              id: generateId(),
              codigo,
              nombre,
              precio,
            });
          }
        }

        // Deduplicate by codigo (keep last occurrence)
        const uniqueRepuestos = Array.from(
          new Map(nuevosRepuestos.map(item => [item.codigo, item])).values()
        );

        if (uniqueRepuestos.length > 0) {
          await saveRepuestosBulk(uniqueRepuestos);
          await loadRepuestos();
          toast({ title: 'Éxito', description: `${uniqueRepuestos.length} repuestos importados correctamente` });
        } else {
          toast({ title: 'Aviso', description: 'No se encontraron repuestos válidos en el archivo', variant: 'destructive' });
        }
      } catch (error: any) {
        console.error('Error parsing Excel:', error);
        toast({ 
          title: 'Error de importación', 
          description: error.message || 'Error al procesar el archivo Excel. Asegúrese de que sea un archivo válido (.xlsx, .xls).', 
          variant: 'destructive' 
        });
      } finally {
        setIsImporting(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = () => {
      toast({ title: 'Error', description: 'Error al leer el archivo', variant: 'destructive' });
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const startEdit = (repuesto: Repuesto) => {
    setEditingId(repuesto.id);
    setEditCodigo(repuesto.codigo);
    setEditNombre(repuesto.nombre);
    setEditPrecio(repuesto.precio.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCodigo('');
    setEditNombre('');
    setEditPrecio('');
  };

  const saveEdit = async (id: string) => {
    if (!editCodigo.trim() || !editNombre.trim()) {
      toast({ title: 'Error', description: 'Código y nombre son requeridos', variant: 'destructive' });
      return;
    }

    const repuesto: Repuesto = {
      id,
      codigo: editCodigo.trim().toUpperCase(),
      nombre: editNombre.trim(),
      precio: parseInt(editPrecio) || 1,
    };

    try {
      await saveRepuesto(repuesto);
      await loadRepuestos();
      cancelEdit();
      toast({ title: 'Éxito', description: 'Repuesto actualizado' });
    } catch (error) {
      toast({ title: 'Error', description: 'Error al actualizar repuesto', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este repuesto?')) {
      try {
        await deleteRepuesto(id);
        await loadRepuestos();
        toast({ title: 'Éxito', description: 'Repuesto eliminado' });
      } catch (error) {
        toast({ title: 'Error', description: 'Error al eliminar repuesto', variant: 'destructive' });
      }
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm('¿ESTÁ SEGURO? Esto eliminará TODOS los repuestos de la base de datos. Esta acción no se puede deshacer.')) {
      if (window.confirm('Confirme nuevamente que desea eliminar TODO el inventario de repuestos.')) {
        try {
          await deleteAllRepuestos();
          await loadRepuestos();
          toast({ title: 'Éxito', description: 'Todos los repuestos han sido eliminados' });
        } catch (error) {
          toast({ title: 'Error', description: 'Error al eliminar repuestos', variant: 'destructive' });
        }
      }
    }
  };

  const filteredRepuestos = repuestos.filter(
    (r) => {
      const matchesSearch = r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.codigo.toLowerCase().includes(searchTerm.toLowerCase());
      
      const min = minPrice ? parseInt(minPrice) : 0;
      const max = maxPrice ? parseInt(maxPrice) : Infinity;
      const matchesPrice = r.precio >= min && r.precio <= max;

      return matchesSearch && matchesPrice;
    }
  );

  const totalPages = Math.ceil(filteredRepuestos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRepuestos = filteredRepuestos.slice(startIndex, startIndex + itemsPerPage);

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <Package className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-heading font-bold">Gestión de Repuestos</h1>
        </div>

        <div className="grid gap-6">
          {/* Import & Add Section */}
          <section className="form-section animate-fade-in">
            <h2 className="form-section-title flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar desde Excel
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="hover-lift"
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Seleccionar archivo Excel
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground self-center">
                Formato esperado: Código | Nombre | Precio (opcional, si no hay se asigna $1)
              </p>
              <Button
                onClick={handleDeleteAll}
                variant="destructive"
                className="hover-lift ml-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar Todo
              </Button>
            </div>
          </section>

          {/* Add Manual */}
          <section className="form-section animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h2 className="form-section-title flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Agregar Repuesto Manual
            </h2>
            <div className="grid sm:grid-cols-4 gap-4">
              <div className="input-group">
                <Label className="input-label">Código *</Label>
                <Input
                  value={nuevoCodigo}
                  onChange={(e) => setNuevoCodigo(e.target.value)}
                  placeholder="Ej: 1234-567-890"
                />
              </div>
              <div className="input-group">
                <Label className="input-label">Nombre *</Label>
                <Input
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Nombre del repuesto"
                />
              </div>
              <div className="input-group">
                <Label className="input-label">Precio (opcional)</Label>
                <Input
                  type="number"
                  value={nuevoPrecio}
                  onChange={(e) => setNuevoPrecio(e.target.value)}
                  placeholder="$1 por defecto"
                />
              </div>
              <div className="input-group flex items-end">
                <Button onClick={handleAddRepuesto} className="w-full hover-lift">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar
                </Button>
              </div>
            </div>
          </section>

          {/* List */}
          <section className="form-section animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="form-section-title flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventario de Repuestos ({repuestos.length})
            </h2>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Input
                  type="number"
                  placeholder="Precio min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full md:w-32"
                />
                <Input
                  type="number"
                  placeholder="Precio max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full md:w-32"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="stihl-table">
                <thead>
                  <tr>
                    <th className="w-40">CÓDIGO</th>
                    <th>NOMBRE</th>
                    <th className="w-32">PRECIO</th>
                    <th className="w-32">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted-foreground py-8">
                        Cargando...
                      </td>
                    </tr>
                  ) : filteredRepuestos.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted-foreground py-8">
                        No hay repuestos. Importa un archivo Excel o agrega manualmente.
                      </td>
                    </tr>
                  ) : (
                    paginatedRepuestos.map((repuesto) => (
                      <tr key={repuesto.id}>
                        {editingId === repuesto.id ? (
                          <>
                            <td>
                              <Input
                                value={editCodigo}
                                onChange={(e) => setEditCodigo(e.target.value)}
                                className="w-full"
                              />
                            </td>
                            <td>
                              <Input
                                value={editNombre}
                                onChange={(e) => setEditNombre(e.target.value)}
                                className="w-full"
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                value={editPrecio}
                                onChange={(e) => setEditPrecio(e.target.value)}
                                className="w-full"
                              />
                            </td>
                            <td>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => saveEdit(repuesto.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEdit}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="font-mono">{repuesto.codigo}</td>
                            <td>{repuesto.nombre}</td>
                            <td className="font-medium">
                              ${repuesto.precio.toLocaleString('es-CL')}
                            </td>
                            <td>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEdit(repuesto)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(repuesto.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredRepuestos.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredRepuestos.length)} de {filteredRepuestos.length} repuestos
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="w-10 font-mono"
                  >
                    {currentPage}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default RepuestosPage;
