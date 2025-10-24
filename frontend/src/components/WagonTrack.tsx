import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import type { Wagon, WagonType } from "../types";

const TYPE_META: Record<WagonType, { icon: string; shortLabel: string; label: string }> = {
  locomotive: { icon: "🚂", shortLabel: "Lok", label: "Lokomotive" },
  control_car: { icon: "🛤️", shortLabel: "Steuer", label: "Steuerwagen" },
  passenger: { icon: "🚋", shortLabel: "Pass", label: "Personenwagen" },
  freight: { icon: "🚛", shortLabel: "Güter", label: "Güterwagen" },
};

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
                {items.map((wagon, index) => {
                  const isCab = wagon.wagon_type === "locomotive" || wagon.wagon_type === "control_car";
                  const isFront = index === 0 && isCab;
                  const isRear = index === items.length - 1 && isCab;
                  return (
                    <Draggable
                      key={wagon.id}
                      draggableId={String(wagon.id)}
                      index={index}
                      isDragDisabled={isReordering}
                    >
                      {(dragProvided, snapshot) => {
                        const cardClassNames = [
                          "wagon-card",
                          `wagon-card--${wagon.wagon_type}`,
                          isFront ? "wagon-card--cab-front" : "",
                          isRear ? "wagon-card--cab-rear" : "",
                          snapshot.isDragging ? "is-dragging" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");

                        return (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className="wagon-card-wrapper"
                            style={dragProvided.draggableProps.style}
                          >
                            {wagon.wagon_type === "locomotive" && (
                              <svg
                                className="wagon-card__pantograph"
                                viewBox="0 0 120 80"
                                role="presentation"
                                focusable="false"
                                aria-hidden="true"
                              >
                                <polyline
                                  points="20 56 60 18 100 56"
                                  stroke="#1d4ed8"
                                  strokeWidth="6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  fill="none"
                                />
                                <polyline
                                  points="30 56 60 34 90 56"
                                  stroke="#1d4ed8"
                                  strokeWidth="4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  fill="none"
                                />
                                <line
                                  x1="34"
                                  y1="16"
                                  x2="86"
                                  y2="16"
                                  stroke="#1d4ed8"
                                  strokeWidth="6"
                                  strokeLinecap="round"
                                />
                                <line
                                  x1="44"
                                  y1="62"
                                  x2="76"
                                  y2="62"
                                  stroke="#1f2937"
                                  strokeWidth="6"
                                  strokeLinecap="round"
                                />
                                <line
                                  x1="60"
                                  y1="62"
                                  x2="60"
                                  y2="76"
                                  stroke="#1f2937"
                                  strokeWidth="5"
                                  strokeLinecap="round"
                                />
                                <circle cx="48" cy="62" r="4" fill="#475569" />
                                <circle cx="72" cy="62" r="4" fill="#475569" />
                              </svg>
                            )}
                            <div
                              {...dragProvided.dragHandleProps}
                              className={cardClassNames}
                              data-front={isFront}
                              data-rear={isRear}
                            >
                              <div className="wagon-card__header">
                                <span className="wagon-card__position">{index + 1}</span>
                                <span
                                  className={`type-pill type-pill--${wagon.wagon_type}`}
                                  title={TYPE_META[wagon.wagon_type].label}
                                >
                                  <span className="type-pill__icon">{TYPE_META[wagon.wagon_type].icon}</span>
                                  {TYPE_META[wagon.wagon_type].shortLabel}
                                </span>
                              </div>
                              <div className="wagon-card__identifier">{wagon.identifier ?? "Wagen"}</div>
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
                          </div>
                        );
                      }}
                    </Draggable>
                  );
                })}
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
