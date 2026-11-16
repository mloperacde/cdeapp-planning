import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Plus, ListChecks } from 'lucide-react';
import ActivityRow from './ActivityRow';
import { formatMinutes } from './ProcessTimelinePreview';

function newActivity(index) {
  return {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    orden: index + 1,
    nombre: '',
    tipo: 'Manual',
    fase: 'Producción',
    estacion_element_id: '',
    estacion_nombre: '',
    maquina_id: '',
    maquina_nombre: '',
    duracion_minutos: 0,
    offset_minutos: 0,
    responsable: '',
    notas: '',
  };
}

export default function ActivitySequenceEditor({ actividades = [], layoutElements = [], machines = [], onChange }) {
  const reindex = (list) => list.map((a, i) => ({ ...a, orden: i + 1 }));

  const update = (id, changes) => {
    onChange(reindex(actividades.map(a => (a.id === id ? { ...a, ...changes } : a))));
  };

  const add = () => onChange(reindex([...actividades, newActivity(actividades.length)]));

  const duplicate = (id) => {
    const idx = actividades.findIndex(a => a.id === id);
    if (idx < 0) return;
    const copy = { ...actividades[idx], id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
    const next = [...actividades];
    next.splice(idx + 1, 0, copy);
    onChange(reindex(next));
  };

  const remove = (id) => onChange(reindex(actividades.filter(a => a.id !== id)));

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const next = Array.from(actividades);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    onChange(reindex(next));
  };

  const total = actividades.reduce((s, a) => s + (Number(a.duracion_minutos) || 0), 0);
  const preMilestone = actividades
    .filter(a => (Number(a.offset_minutos) || 0) < 0)
    .reduce((s, a) => s + (Number(a.duracion_minutos) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {actividades.length} actividad(es) · {formatMinutes(total)} en total
          {preMilestone > 0 && <span className="text-amber-600"> · {formatMinutes(preMilestone)} antes del hito</span>}
        </div>
        <Button size="sm" onClick={add} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white h-8">
          <Plus className="w-4 h-4" /> Añadir actividad
        </Button>
      </div>

      {actividades.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-border p-10 text-center">
          <ListChecks className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">Sin actividades todavía</p>
          <p className="text-xs text-slate-400">Añade las preparaciones previas al hito y las actividades de producción.</p>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="article-process-activities">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {actividades.map((activity, index) => (
                <Draggable key={activity.id} draggableId={activity.id} index={index}>
                  {(prov, snapshot) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      className={snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-300 rounded-xl' : ''}
                    >
                      <ActivityRow
                        activity={activity}
                        index={index}
                        layoutElements={layoutElements}
                        machines={machines}
                        dragHandleProps={prov.dragHandleProps}
                        onChange={(changes) => update(activity.id, changes)}
                        onDuplicate={() => duplicate(activity.id)}
                        onDelete={() => remove(activity.id)}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}