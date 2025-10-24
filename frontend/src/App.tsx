import { useEffect, useMemo, useState } from "react";
import {
  calculateTrain,
  cloneWagon,
  createTrain,
  createWagon,
  deleteTrain,
  deleteWagon,
  listTrains,
  listWagons,
  reorderWagons,
} from "./api";
import type { Train, TrainCalculation, Wagon, WagonPayload, TrainPayload } from "./types";
import WagonTrack from "./components/WagonTrack";
import SplashScreen from "./components/SplashScreen";

interface WagonFormState extends WagonPayload {}

const emptyWagonPayload: WagonFormState = {
  position: 1,
  identifier: "",
  length_m: 20,
  tare_weight_t: 20,
  load_weight_t: 0,
  braked_weight_t: 20,
  brake_type: "P",
  axle_count: 4,
};

function App() {
  const [trains, setTrains] = useState<Train[]>([]);
  const [selectedTrainId, setSelectedTrainId] = useState<number | null>(null);
  const [wagons, setWagons] = useState<Wagon[]>([]);
  const [calc, setCalc] = useState<TrainCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wagonForm, setWagonForm] = useState<WagonFormState>(emptyWagonPayload);
  const [newTrainForm, setNewTrainForm] = useState<TrainPayload>({ name: "", description: "" });
  const [cloneCount, setCloneCount] = useState<number>(1);
  const [isReordering, setIsReordering] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await listTrains();
        setTrains(data);
        if (data.length > 0) {
          setSelectedTrainId((prev) => prev ?? data[0].id);
        }
      } catch (err) {
        setError("Konnte Züge nicht laden.");
        console.error(err);
      } finally {
        setTimeout(() => setShowSplash(false), 1500);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedTrainId) {
      setWagons([]);
      setCalc(null);
      return;
    }
    reloadWagons(selectedTrainId);
  }, [selectedTrainId]);

  const reloadWagons = async (trainId: number) => {
    setIsLoading(true);
    try {
      const [wagonsData, calcData] = await Promise.all([listWagons(trainId), calculateTrain(trainId)]);
      setWagons(wagonsData);
      setCalc(calcData);
      setWagonForm((prev) => ({
        ...prev,
        position: wagonsData.length + 1,
      }));
    } catch (err) {
      setError("Konnte Wagen nicht laden.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTrain = async () => {
    if (!newTrainForm.name) {
      setError("Bitte einen Namen für den Zug angeben.");
      return;
    }
    setError(null);
    try {
      const created = await createTrain({ name: newTrainForm.name, description: newTrainForm.description?.trim() });
      const next = await listTrains();
      setTrains(next);
      setSelectedTrainId(created.id);
      setNewTrainForm({ name: "", description: "" });
    } catch (err) {
      setError("Zug konnte nicht erzeugt werden.");
      console.error(err);
    }
  };

  const handleDeleteTrain = async (trainId: number) => {
    if (!window.confirm("Zug wirklich löschen?")) {
      return;
    }
    try {
      await deleteTrain(trainId);
      const remaining = trains.filter((train) => train.id !== trainId);
      setTrains(remaining);
      if (remaining.length > 0) {
        setSelectedTrainId(remaining[0].id);
      } else {
        setSelectedTrainId(null);
        setWagons([]);
        setCalc(null);
      }
    } catch (err) {
      setError("Zug konnte nicht gelöscht werden.");
      console.error(err);
    }
  };

  const handleCreateWagon = async () => {
    if (!selectedTrainId) {
      setError("Bitte zuerst einen Zug auswählen oder erstellen.");
      return;
    }
    const payload = sanitizeWagonPayload({ ...wagonForm });
    if (!validateWagon(payload)) {
      setError("Bitte alle Wagenfelder korrekt ausfüllen.");
      return;
    }
    try {
      await createWagon(selectedTrainId, payload);
      await reloadWagons(selectedTrainId);
      setWagonForm((prev) => ({
        ...prev,
        identifier: "",
        load_weight_t: 0,
      }));
      setError(null);
    } catch (err) {
      setError("Wagen konnte nicht gespeichert werden.");
      console.error(err);
    }
  };

  const handleClone = async (wagon: Wagon) => {
    if (!selectedTrainId) {
      return;
    }
    try {
      await cloneWagon(selectedTrainId, wagon.id, cloneCount);
      await reloadWagons(selectedTrainId);
    } catch (err) {
      setError("Wagen konnte nicht geklont werden.");
      console.error(err);
    }
  };

  const handleDeleteWagon = async (wagon: Wagon) => {
    if (!selectedTrainId) {
      return;
    }
    if (!window.confirm(`Wagen ${wagon.identifier ?? wagon.position} wirklich löschen?`)) {
      return;
    }
    try {
      await deleteWagon(selectedTrainId, wagon.id);
      await reloadWagons(selectedTrainId);
    } catch (err) {
      setError("Wagen konnte nicht gelöscht werden.");
      console.error(err);
    }
  };

  const handleReorderWagons = async (orderedIds: number[]) => {
    if (!selectedTrainId) {
      return;
    }
    setIsReordering(true);
    try {
      await reorderWagons(selectedTrainId, orderedIds);
      await reloadWagons(selectedTrainId);
      setError(null);
    } catch (err) {
      setError("Neue Wagenreihenfolge konnte nicht gespeichert werden.");
      console.error(err);
      throw err;
    } finally {
      setIsReordering(false);
    }
  };

  const selectedTrain = useMemo(
    () => trains.find((train) => train.id === selectedTrainId) ?? null,
    [trains, selectedTrainId],
  );

  return (
    <div className="app">
      <SplashScreen isReady={!showSplash} />
      <h1>PZB Zudatenberechner</h1>
      <p>Erstelle einen Zug, erfasse Wagen und erhalte die drei PZB-Eingabewerte.</p>

      {error && <div className="card error">{error}</div>}

      <div className="stack">
        <div className="card card--trains">
          <h2>Züge</h2>
          <div className="button-row">
            <select
              value={selectedTrainId ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedTrainId(value === "" ? null : Number(value));
              }}
            >
              <option value="">Zug auswählen</option>
              {trains.map((train) => (
                <option key={train.id} value={train.id}>
                  {train.name}
                </option>
              ))}
            </select>
            {selectedTrain && (
              <button className="danger-button" onClick={() => handleDeleteTrain(selectedTrain.id)}>
                Zug löschen
              </button>
            )}
          </div>
          <div className="stack" style={{ marginTop: "1rem" }}>
            <div className="field">
              <label>Zugname</label>
              <input
                value={newTrainForm.name}
                onChange={(event) => setNewTrainForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="z. B. Gz 4711"
              />
            </div>
            <div className="field">
              <label>Beschreibung (optional)</label>
              <input
                value={newTrainForm.description ?? ""}
                onChange={(event) => setNewTrainForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <button className="primary-button" onClick={handleCreateTrain}>
              Zug hinzufügen
            </button>
          </div>
        </div>

        {wagons.length > 0 && (
          <WagonTrack
            wagons={wagons}
            onReorder={handleReorderWagons}
            isReordering={isReordering}
            className="card card--track"
          />
        )}

        <div className="card card--form">
          <h2>Wagen erfassen</h2>
          <div className="stack">
            <div className="field">
              <label>Position</label>
              <input
                type="number"
                min={1}
                value={wagonForm.position}
                onChange={(event) => setWagonForm((prev) => ({ ...prev, position: Number(event.target.value) }))}
              />
            </div>
            <div className="field">
              <label>Wagennummer</label>
              <input
                value={wagonForm.identifier ?? ""}
                onChange={(event) => setWagonForm((prev) => ({ ...prev, identifier: event.target.value }))}
                placeholder="optional"
              />
            </div>
            <div className="field">
              <label>Länge (m)</label>
              <input
                type="number"
                min={1}
                step={0.1}
                value={wagonForm.length_m}
                onChange={(event) => setWagonForm((prev) => ({ ...prev, length_m: Number(event.target.value) }))}
              />
            </div>
            <div className="field">
              <label>Leergewicht (t)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={wagonForm.tare_weight_t}
                onChange={(event) => setWagonForm((prev) => ({ ...prev, tare_weight_t: Number(event.target.value) }))}
              />
            </div>
            <div className="field">
              <label>Ladegewicht (t)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={wagonForm.load_weight_t}
                onChange={(event) => setWagonForm((prev) => ({ ...prev, load_weight_t: Number(event.target.value) }))}
              />
            </div>
            <div className="field">
              <label>Gebremstes Gewicht (t)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={wagonForm.braked_weight_t}
                onChange={(event) =>
                  setWagonForm((prev) => ({ ...prev, braked_weight_t: Number(event.target.value) }))
                }
              />
            </div>
            <div className="field">
              <label>Bremse (G/P/R)</label>
              <select
                value={wagonForm.brake_type ?? ""}
                onChange={(event) => setWagonForm((prev) => ({ ...prev, brake_type: event.target.value }))}
              >
                <option value="P">P</option>
                <option value="G">G</option>
                <option value="R">R</option>
              </select>
            </div>
            <div className="field">
              <label>Achsanzahl</label>
              <input
                type="number"
                min={0}
                value={wagonForm.axle_count ?? 0}
                onChange={(event) => setWagonForm((prev) => ({ ...prev, axle_count: Number(event.target.value) }))}
              />
            </div>
            <button className="primary-button" onClick={handleCreateWagon} disabled={isLoading}>
              Wagen hinzufügen
            </button>
          </div>
        </div>

        <div className="card card--wagonlist">
          <h2>Wagenübersicht</h2>
          {wagons.length === 0 ? (
            <p>Noch keine Wagen erfasst.</p>
          ) : (
            <>
              <div className="field" style={{ maxWidth: "200px" }}>
                <label>Anzahl beim Klonen</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={cloneCount}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isNaN(value)) {
                      setCloneCount(1);
                      return;
                    }
                    setCloneCount(Math.max(1, Math.min(20, value)));
                  }}
                />
              </div>
              <div className="wagons-table-container">
                <table className="wagons-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Wagennummer</th>
                      <th>Länge (m)</th>
                      <th>Leergewicht (t)</th>
                      <th>Ladegewicht (t)</th>
                      <th>Gebremst (t)</th>
                      <th>Bremse</th>
                      <th>Achsanzahl</th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wagons.map((wagon) => (
                      <tr key={wagon.id} className="wagons-row">
                        <td>{wagon.position}</td>
                        <td>{wagon.identifier ?? "—"}</td>
                        <td>{wagon.length_m.toFixed(2)}</td>
                        <td>{wagon.tare_weight_t.toFixed(2)}</td>
                        <td>{wagon.load_weight_t.toFixed(2)}</td>
                        <td>{wagon.braked_weight_t.toFixed(2)}</td>
                        <td>{wagon.brake_type ?? "?"}</td>
                        <td>{wagon.axle_count ?? "?"}</td>
                        <td className="button-row">
                          <button className="secondary-button" onClick={() => handleClone(wagon)}>
                            Klonen
                          </button>
                          <button className="danger-button" onClick={() => handleDeleteWagon(wagon)}>
                            Löschen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="card card--summary">
          <h2>Ergebnis für PZB</h2>
          {calc ? (
            <div className="summary-grid">
              <div className="summary-item">
                <div className="summary-label">Zuglänge</div>
                <div className="summary-value">{calc.train_length_m.toFixed(2)} m</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Zuggewicht</div>
                <div className="summary-value">{calc.train_weight_t.toFixed(2)} t</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Bremshundertstel</div>
                <div className="summary-value">{calc.braking_percentage.toFixed(2)} ‰</div>
              </div>
            </div>
          ) : (
            <p>Bitte Wagen erfassen, um die Werte zu berechnen.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function sanitizeWagonPayload(payload: WagonFormState): WagonPayload {
  const identifier = payload.identifier?.trim();
  return {
    position: Number(payload.position),
    identifier: identifier ? identifier : undefined,
    length_m: Number(payload.length_m),
    tare_weight_t: Number(payload.tare_weight_t),
    load_weight_t: Number(payload.load_weight_t),
    braked_weight_t: Number(payload.braked_weight_t),
    brake_type: payload.brake_type ?? "P",
    axle_count: payload.axle_count ?? undefined,
  };
}

function validateWagon(payload: WagonPayload): boolean {
  return (
    payload.position >= 1 &&
    payload.length_m > 0 &&
    payload.tare_weight_t >= 0 &&
    payload.load_weight_t >= 0 &&
    payload.braked_weight_t >= 0
  );
}

export default App;
