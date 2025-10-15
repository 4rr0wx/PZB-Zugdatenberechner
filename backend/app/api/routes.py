from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlmodel import Session, select

from ..deps import get_session
from ..models import (
    Train,
    TrainCreate,
    TrainRead,
    TrainUpdate,
    Wagon,
    WagonCreate,
    WagonRead,
    WagonUpdate,
)
from ..services import TrainCalculation, calculate_train

router = APIRouter()


class WagonReorderPayload(BaseModel):
    wagon_ids: list[int]


@router.get("/trains", response_model=list[TrainRead])
def list_trains(session: Annotated[Session, Depends(get_session)]) -> list[Train]:
    statement = select(Train).order_by(Train.created_at.desc())
    return list(session.exec(statement))


@router.post("/trains", response_model=TrainRead, status_code=status.HTTP_201_CREATED)
def create_train(
    payload: TrainCreate, session: Annotated[Session, Depends(get_session)]
) -> Train:
    train = Train.model_validate(payload)
    session.add(train)
    session.commit()
    session.refresh(train)
    return train


@router.get("/trains/{train_id}", response_model=TrainRead)
def get_train(train_id: int, session: Annotated[Session, Depends(get_session)]) -> Train:
    train = session.get(Train, train_id)
    if not train:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Train not found")
    return train


@router.patch("/trains/{train_id}", response_model=TrainRead)
def update_train(
    train_id: int, payload: TrainUpdate, session: Annotated[Session, Depends(get_session)]
) -> Train:
    train = session.get(Train, train_id)
    if not train:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Train not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(train, key, value)

    session.add(train)
    session.commit()
    session.refresh(train)
    return train


@router.delete(
    "/trains/{train_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
def delete_train(train_id: int, session: Annotated[Session, Depends(get_session)]) -> Response:
    train = session.get(Train, train_id)
    if not train:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Train not found")
    session.delete(train)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/trains/{train_id}/wagons",
    response_model=list[WagonRead],
    summary="List wagons for train ordered by position",
)
def list_wagons(train_id: int, session: Annotated[Session, Depends(get_session)]) -> list[Wagon]:
    statement = select(Wagon).where(Wagon.train_id == train_id).order_by(Wagon.position)
    return list(session.exec(statement))


@router.post(
    "/trains/{train_id}/wagons",
    response_model=WagonRead,
    status_code=status.HTTP_201_CREATED,
)
def create_wagon(
    train_id: int, payload: WagonCreate, session: Annotated[Session, Depends(get_session)]
) -> Wagon:
    train = session.get(Train, train_id)
    if not train:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Train not found")

    wagon = Wagon.model_validate(payload, update={"train_id": train_id})
    session.add(wagon)
    session.commit()
    session.refresh(wagon)
    _normalize_positions(train_id=train_id, session=session)
    return wagon


@router.patch(
    "/trains/{train_id}/wagons/{wagon_id}",
    response_model=WagonRead,
)
def update_wagon(
    train_id: int,
    wagon_id: int,
    payload: WagonUpdate,
    session: Annotated[Session, Depends(get_session)],
) -> Wagon:
    wagon = session.get(Wagon, wagon_id)
    if not wagon or wagon.train_id != train_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wagon not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(wagon, key, value)

    session.add(wagon)
    session.commit()
    session.refresh(wagon)
    _normalize_positions(train_id=train_id, session=session)
    return wagon


@router.delete(
    "/trains/{train_id}/wagons/{wagon_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
def delete_wagon(
    train_id: int, wagon_id: int, session: Annotated[Session, Depends(get_session)]
) -> Response:
    wagon = session.get(Wagon, wagon_id)
    if not wagon or wagon.train_id != train_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wagon not found")
    session.delete(wagon)
    session.commit()
    _normalize_positions(train_id=train_id, session=session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/trains/{train_id}/wagons/{wagon_id}/clone",
    response_model=list[WagonRead],
    status_code=status.HTTP_201_CREATED,
)
def clone_wagon(
    train_id: int,
    wagon_id: int,
    session: Annotated[Session, Depends(get_session)],
    quantity: Annotated[int, Query(ge=1, le=20)] = 1,
) -> list[Wagon]:
    source = session.get(Wagon, wagon_id)
    if not source or source.train_id != train_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wagon not found")

    clones: list[Wagon] = []
    clone_ids: list[int] = []
    for offset in range(1, quantity + 1):
        clone = Wagon(
            train_id=train_id,
            position=source.position + offset,
            identifier=source.identifier,
            length_m=source.length_m,
            tare_weight_t=source.tare_weight_t,
            load_weight_t=source.load_weight_t,
            braked_weight_t=source.braked_weight_t,
            brake_type=source.brake_type,
            axle_count=source.axle_count,
        )
        session.add(clone)
        clones.append(clone)

    session.commit()

    for clone in clones:
        session.refresh(clone)
        clone_ids.append(clone.id)

    _normalize_positions(train_id=train_id, session=session)

    statement = (
        select(Wagon)
        .where(Wagon.id.in_(clone_ids))
        .order_by(Wagon.position)
    )
    return list(session.exec(statement))


@router.post(
    "/trains/{train_id}/wagons/reorder",
    response_model=list[WagonRead],
    summary="Persist a new order for wagons in the train",
)
def reorder_wagons(
    train_id: int,
    payload: WagonReorderPayload,
    session: Annotated[Session, Depends(get_session)],
) -> list[Wagon]:
    if not payload.wagon_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No wagon IDs provided")

    wagons = list(
        session.exec(select(Wagon).where(Wagon.train_id == train_id))
    )
    if not wagons:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Train has no wagons")

    existing_ids = {wagon.id for wagon in wagons}
    incoming_ids = list(dict.fromkeys(payload.wagon_ids))  # deduplicate while preserving order

    if existing_ids != set(incoming_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Wagon IDs do not match train wagons",
        )

    id_to_wagon = {wagon.id: wagon for wagon in wagons}
    for index, wagon_id in enumerate(incoming_ids, start=1):
        wagon = id_to_wagon[wagon_id]
        wagon.position = index
        session.add(wagon)

    session.commit()
    statement = select(Wagon).where(Wagon.train_id == train_id).order_by(Wagon.position)
    return list(session.exec(statement))


@router.get(
    "/trains/{train_id}/calculation",
    response_model=TrainCalculation,
    summary="Compute aggregated values for a train",
)
def get_train_calculation(
    train_id: int, session: Annotated[Session, Depends(get_session)]
) -> TrainCalculation:
    train = session.get(Train, train_id)
    if not train:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Train not found")

    return calculate_train(train.wagons)


def _normalize_positions(train_id: int, session: Session) -> None:
    """Ensure sorted positions without gaps after clone/delete operations."""
    statement = select(Wagon).where(Wagon.train_id == train_id).order_by(Wagon.position, Wagon.id)
    wagons = list(session.exec(statement))

    for idx, wagon in enumerate(wagons, start=1):
        if wagon.position != idx:
            wagon.position = idx
            session.add(wagon)

    session.commit()
