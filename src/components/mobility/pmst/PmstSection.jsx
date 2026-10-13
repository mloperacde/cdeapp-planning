import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

export default function PmstSection({ title, description, icon: Icon, onSave, saving, isAdmin, children, footer }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-primary" />} {title}
        </CardTitle>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        {(onSave || footer) && (
          <div className="flex items-center justify-end gap-2 pt-3 border-t flex-wrap">
            {footer}
            {isAdmin && onSave && (
              <Button onClick={onSave} disabled={saving}>
                <Check className="w-4 h-4 mr-1" /> {saving ? 'Guardando...' : 'Guardar sección'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Field({ label, children, hint }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}