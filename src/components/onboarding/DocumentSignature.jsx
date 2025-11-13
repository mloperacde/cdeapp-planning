import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  PenTool, 
  Trash2, 
  CheckCircle2, 
  Download,
  Eye
} from "lucide-react";
import { toast } from "sonner";

export default function DocumentSignature({ 
  document, 
  employeeName, 
  onSigned,
  onClose 
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [currentDate] = useState(new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    setSignatureData(canvas.toDataURL());
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const handleSign = () => {
    if (!signatureData) {
      toast.error("Por favor, firma el documento");
      return;
    }

    if (!acceptTerms) {
      toast.error("Debes aceptar los términos del documento");
      return;
    }

    // Crear un objeto con los datos de la firma
    const signedDocument = {
      ...document,
      firma_digital: signatureData,
      fecha_firma: new Date().toISOString(),
      firmante: employeeName,
      ip_address: "Simulado",
      recibido: true,
      fecha_recepcion: new Date().toISOString(),
    };

    onSigned(signedDocument);
    toast.success("Documento firmado correctamente");
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Firma Digital de Documento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del Documento */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Documento</p>
                  <p className="font-semibold text-blue-900">{document.nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 font-medium">Firmante</p>
                  <p className="font-semibold text-blue-900">{employeeName}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 font-medium">Fecha</p>
                  <p className="font-semibold text-blue-900">{currentDate}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 font-medium">Estado</p>
                  <Badge className="bg-amber-600">Pendiente de Firma</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vista previa del documento (simulada) */}
          <Card>
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Contenido del Documento</span>
                {document.archivo_url && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(document.archivo_url, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Documento Completo
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-white border-2 border-slate-200 rounded-lg p-6 max-h-64 overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">{document.nombre}</h3>
                <div className="prose prose-sm text-slate-700">
                  <p className="mb-3">
                    Por medio del presente documento, el/la empleado/a <strong>{employeeName}</strong> 
                    declara haber recibido, leído y entendido el contenido del siguiente documento:
                  </p>
                  <p className="mb-3">
                    <strong>{document.nombre}</strong>
                  </p>
                  {document.requerido && (
                    <p className="mb-3 text-red-700 font-semibold">
                      Este documento es de carácter obligatorio y requiere firma.
                    </p>
                  )}
                  <p className="mb-3">
                    El empleado/a se compromete a cumplir con lo establecido en este documento 
                    y a mantener la confidencialidad requerida según aplique.
                  </p>
                  <p className="text-xs text-slate-500 mt-6">
                    Fecha de generación: {currentDate}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Área de Firma */}
          <Card>
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-base flex items-center gap-2">
                <PenTool className="w-4 h-4 text-blue-600" />
                Firma con tu dedo o ratón
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white relative">
                  <canvas
                    ref={canvasRef}
                    width={700}
                    height={200}
                    className="w-full cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                  <div className="absolute bottom-2 left-2 text-xs text-slate-400 pointer-events-none">
                    Firma aquí ↑
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={clearSignature}
                    disabled={!signatureData}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpiar Firma
                  </Button>

                  {signatureData && (
                    <Badge className="bg-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Firma Capturada
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aceptación de Términos */}
          <Card className="bg-slate-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="accept-terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="accept-terms" className="text-sm text-slate-700 cursor-pointer">
                  <strong>Declaro</strong> que he leído, entendido y acepto el contenido de este documento. 
                  Confirmo que la firma digital arriba realizada es auténtica y corresponde a mi voluntad 
                  de firmar este documento de forma electrónica, con la misma validez que una firma manuscrita.
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Información Legal */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800">
            <p className="font-semibold mb-1">ℹ️ Información sobre la Firma Digital</p>
            <p>
              Esta firma digital tiene validez legal según la normativa aplicable. 
              Se registrará la fecha, hora, documento firmado y datos del firmante. 
              Este registro es irreversible y constituye prueba de la aceptación del documento.
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSign}
              disabled={!signatureData || !acceptTerms}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Firmar Documento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}