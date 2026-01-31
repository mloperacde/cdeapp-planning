import React, { useState } from 'react';
import { cdeApp } from '../../api/cdeAppClient';
import { toast } from 'sonner';
import { Download, Table as TableIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function OrderImport() {
  const [rawOrders, setRawOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState([]);

  const fetchOrders = async () => {
    setLoading(true);
    const toastId = toast.loading("Obteniendo datos crudos de CDEApp...");
    try {
      const response = await cdeApp.syncProductions();
      let data = [];
      
      // Normalización de respuesta para asegurar array
      if (Array.isArray(response)) {
          data = response;
      } else if (response && response.data && Array.isArray(response.data)) {
          data = response.data;
      } else if (response && response.data) {
          data = [response.data];
      } else if (response) {
           // Si es un objeto con claves numéricas (tipo array-like)
           if (typeof response === 'object' && Object.keys(response).length > 0 && Object.keys(response).every(key => !isNaN(parseInt(key)))) {
               data = Object.values(response);
           } else {
               data = [response];
           }
      }

      if (data.length > 0) {
        // Obtener todas las claves únicas de todos los objetos para las columnas
        const allKeys = new Set();
        data.forEach(item => {
            if (item && typeof item === 'object') {
                Object.keys(item).forEach(k => allKeys.add(k));
            }
        });
        setColumns(Array.from(allKeys));
      }

      setRawOrders(data);
      toast.success(`${data.length} registros obtenidos sin procesar.`, { id: toastId });
    } catch (error) {
      console.error("Error obteniendo datos:", error);
      toast.error("Error al conectar con CDEApp.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importación de Órdenes (Raw Data)</h1>
          <p className="text-muted-foreground">Visualización directa de datos de CDEApp sin procesar.</p>
        </div>
        <Button onClick={fetchOrders} disabled={loading}>
          {loading ? "Cargando..." : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Obtener Datos
            </>
          )}
        </Button>
      </div>

      {rawOrders.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <TableIcon className="h-5 w-5" />
                Tabla de Datos Crudos ({rawOrders.length} registros)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto max-h-[70vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    {columns.map(col => (
                      <TableHead key={col} className="whitespace-nowrap font-bold">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawOrders.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      {columns.map(col => (
                        <TableCell key={`${i}-${col}`} className="whitespace-nowrap max-w-[300px] truncate" title={String(row[col])}>
                          {row[col] !== undefined && row[col] !== null 
                            ? (typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])) 
                            : <span className="text-gray-300">-</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
            <TableIcon className="h-10 w-10 mb-2 opacity-20" />
            <p>No hay datos cargados.</p>
            <p className="text-sm">Pulse "Obtener Datos" para descargar la información cruda.</p>
        </div>
      )}
    </div>
  );
}
