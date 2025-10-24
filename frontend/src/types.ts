export interface Train {
  id: number;
  name: string;
  description?: string | null;
}

export interface TrainPayload {
  name: string;
  description?: string;
}

export type WagonType = "locomotive" | "control_car" | "passenger" | "freight";

export interface Wagon {
  id: number;
  train_id: number;
  position: number;
  identifier?: string | null;
  length_m: number;
  tare_weight_t: number;
  load_weight_t: number;
  braked_weight_t: number;
  brake_type?: string | null;
  axle_count?: number | null;
  wagon_type: WagonType;
}

export interface WagonPayload
  extends Omit<Wagon, "id" | "train_id"> {}

export interface TrainCalculation {
  train_length_m: number;
  train_weight_t: number;
  braking_percentage: number;
}
