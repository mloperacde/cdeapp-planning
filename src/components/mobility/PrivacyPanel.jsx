import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Shield, Check, X, Info, AlertTriangle } from 'lucide-react';

const AVISO_VERSION = '1.0';
const AVISO_TEXTO = `El presente módulo trata datos personales con la finalidad de gestionar el Plan de Movilidad Sostenible al Trabajo (PMST) conforme a la Ley 9/2025.

Datos recogidos: zona o código postal aproximado de origen (nunca domicilio exacto), turno, preferencias de viaje y formación en seguridad vial. No se realiza geolocalización continua ni se almacenan trayectos GPS.

Base jurídica: ejecución del contrato de trabajo y cumplimiento de obligaciones legales en materia de movilidad sostenible. El consentimiento se recaba únicamente para preferencias voluntarias no vinculadas al cumplimiento normativo.

Conservación: los datos de movilidad se conservan mientras el PMST esté vigente y durante el plazo de seguimiento bienal. Los registros de consentimiento se conservan para acreditar el cumplimiento.

Destinatarios: los datos no se ceden a terceros. El acceso interno se limita a personal autorizado de RR. HH. y representación legal para funciones de seguimiento agregado.

Derechos: puede ejercer derechos de acceso, rectificación, supresión, limitación y oposición. Para retirar preferencias voluntarias o solicitar la supresión de sus datos, utilice los botones de este panel.

Esta información debe revisarse con el Delegado de Protección de Datos antes de su puesta en producción.`;

export default function PrivacyPanel({ workCenter, user, isAdmin }) {
  const { toast } = useToast();
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFull, setShowFull] = useState(false);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    try {
      const c = await base44.entities.MobilityPrivacyConsent.filter({ user_id: user.id });
      setConsents(c || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const registerAction = async (accion, datosConsentidos = []) => {
    try {
      await base44.entities.MobilityPrivacyConsent.create({
        user_id: user.id,
        user_email: user.email,
        work_center_id: workCenter?.id,
        aviso_version: AVISO_VERSION,
        aviso_texto_hash: btoa(AVISO_TEXTO).slice(0, 32),
        accion,
        base_juridica: 'ejecucion_contrato',
        datos_consentidos: datosConsentidos,
        fecha_accion: new Date().toISOString(),
        activo: true
      });
      toast({ title: 'Acción registrada' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const hasConsent = consents.some(c => c.accion === 'consentimiento_preferencias' && c.activo);
  const hasInfo = consents.some(c => c.accion === 'informado');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> Aviso de privacidad – Movilidad Sostenible</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-line max-h-48 overflow-y-auto">
            {showFull ? AVISO_TEXTO : AVISO_TEXTO.slice(0, 280) + '...'}
          </div>
          <Button variant="link" className="p-0 h-auto text-xs" onClick={() => setShowFull(!showFull)}>
            {showFull ? 'Ver menos' : 'Ver aviso completo'}
          </Button>

          <div className="flex flex-wrap gap-2 pt-2">
            {!hasInfo && (
              <Button size="sm" variant="outline" onClick={() => registerAction('informado')}>
                <Info className="w-4 h-4 mr-1" /> Acusar información recibida
              </Button>
            )}
            {!hasConsent ? (
              <Button size="sm" onClick={() => registerAction('consentimiento_preferencias', ['zona_origen_aprox', 'preferencias_viaje', 'formacion_seguridad'])}>
                <Check className="w-4 h-4 mr-1" /> Consentir preferencias voluntarias
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => registerAction('retirada_preferencias')}>
                <X className="w-4 h-4 mr-1" /> Retirar preferencias voluntarias
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => registerAction('solicitud_actualizacion')}>Solicitar actualización</Button>
            <Button size="sm" variant="ghost" onClick={() => registerAction('solicitud_supresion')}>Solicitar supresión</Button>
          </div>

          {hasConsent && <Badge variant="default" className="mt-1"><Check className="w-3 h-3 mr-1" /> Preferencias consentidas</Badge>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Historial de acciones</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
          {!loading && consents.length === 0 && <p className="text-sm text-muted-foreground">Sin acciones registradas.</p>}
          {consents.map((c) => (
            <div key={c.id} className="border rounded-lg p-2 text-sm flex items-center justify-between">
              <div>
                <Badge variant="outline" className="text-xs mr-2">{c.accion.replace(/_/g, ' ')}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(c.fecha_accion).toLocaleString('es-ES')}</span>
              </div>
              <Badge variant={c.activo ? 'default' : 'secondary'} className="text-xs">{c.activo ? 'Activo' : 'Inactivo'}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-500">
            Los textos definitivos, la base jurídica y los plazos de conservación deben validarse con el Delegado de Protección de Datos antes de producción. Esta versión es orientativa.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}