import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import type { Wagon } from "../types";

interface WagonTrackProps {
  wagons: Wagon[];
  onReorder: (ids: number[]) => Promise<void>;
  isReordering: boolean;
  className?: string;
}

const WagonTrack = ({ wagons, onReorder, isReordering, className }: WagonTrackProps) => {
  const [items, setItems] = useState<Wagon[]>([]);

  useEffect(() => {
    setItems(wagons);
  }, [wagons]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source } = result;
    if (!destination || destination.index === source.index) {
      return;
    }

    const reordered = Array.from(items);
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);
    setItems(reordered);

    try {
      await onReorder(reordered.map((item) => item.id));
    } catch (error) {
      console.error(error);
      setItems(wagons);
    }
  };

  return (
    <div className={className ?? "panel panel--track"}>
      <h2>Grafische Wagenübersicht</h2>
      <p>Ziehe Wagen, um die Reihenfolge zu ändern. Änderungen werden direkt übernommen.</p>
      <div className={`wagon-track${isReordering ? " is-reordering" : ""}`}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="wagons" direction="horizontal">
            {(provided) => (
              <div className="wagon-track__lane" ref={provided.innerRef} {...provided.droppableProps}>
                {items.map((wagon, index) => (
                  <Draggable
                    key={wagon.id}
                    draggableId={String(wagon.id)}
                    index={index}
                    isDragDisabled={isReordering}
                  >
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className={`wagon-card${snapshot.isDragging ? " is-dragging" : ""}`}
                      >
                        <div className="wagon-card__header">
                          <span className="wagon-card__position">{index + 1}</span>
                          <span className="wagon-card__identifier">{wagon.identifier ?? "Wagen"}</span>
                        </div>
                        <div className="wagon-card__metrics">
                          <span>{wagon.length_m.toFixed(1)} m</span>
                          <span>{(wagon.tare_weight_t + wagon.load_weight_t).toFixed(0)} t</span>
                          <span>BrH: {wagon.braked_weight_t.toFixed(0)}</span>
                        </div>
                        <div className="wagon-card__footer">
                          <span>Bremse: {wagon.brake_type ?? "?"}</span>
                          <span>Achs.: {wagon.axle_count ?? "?"}</span>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <div className="wagon-track__rails" aria-hidden="true">
          <div />
          <div />
        </div>
      </div>
    </div>
  );
};

export default WagonTrack;
