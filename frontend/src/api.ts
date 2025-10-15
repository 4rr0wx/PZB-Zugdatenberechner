import axios from "axios";
import { Train, TrainPayload, Wagon, WagonPayload, TrainCalculation } from "./types";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? "/api",
});

export async function listTrains(): Promise<Train[]> {
  const { data } = await apiClient.get<Train[]>("/trains");
  return data;
}

export async function createTrain(payload: TrainPayload): Promise<Train> {
  const { data } = await apiClient.post<Train>("/trains", payload);
  return data;
}

export async function updateTrain(id: number, payload: Partial<TrainPayload>): Promise<Train> {
  const { data } = await apiClient.patch<Train>(`/trains/${id}`, payload);
  return data;
}

export async function deleteTrain(id: number): Promise<void> {
  await apiClient.delete(`/trains/${id}`);
}

export async function listWagons(trainId: number): Promise<Wagon[]> {
  const { data } = await apiClient.get<Wagon[]>(`/trains/${trainId}/wagons`);
  return data;
}

export async function createWagon(trainId: number, payload: WagonPayload): Promise<Wagon> {
  const { data } = await apiClient.post<Wagon>(`/trains/${trainId}/wagons`, payload);
  return data;
}

export async function updateWagon(
  trainId: number,
  wagonId: number,
  payload: Partial<WagonPayload>,
): Promise<Wagon> {
  const { data } = await apiClient.patch<Wagon>(`/trains/${trainId}/wagons/${wagonId}`, payload);
  return data;
}

export async function deleteWagon(trainId: number, wagonId: number): Promise<void> {
  await apiClient.delete(`/trains/${trainId}/wagons/${wagonId}`);
}

export async function cloneWagon(
  trainId: number,
  wagonId: number,
  quantity: number,
): Promise<Wagon[]> {
  const { data } = await apiClient.post<Wagon[]>(
    `/trains/${trainId}/wagons/${wagonId}/clone`,
    undefined,
    { params: { quantity } },
  );
  return data;
}

export async function calculateTrain(trainId: number): Promise<TrainCalculation> {
  const { data } = await apiClient.get<TrainCalculation>(`/trains/${trainId}/calculation`);
  return data;
}

export async function reorderWagons(trainId: number, wagonIds: number[]): Promise<Wagon[]> {
  const { data } = await apiClient.post<Wagon[]>(
    `/trains/${trainId}/wagons/reorder`,
    { wagon_ids: wagonIds },
  );
  return data;
}
