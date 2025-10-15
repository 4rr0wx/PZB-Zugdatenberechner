from __future__ import annotations

from typing import Iterable, TypedDict

from .models import Wagon


class TrainCalculation(TypedDict):
    train_length_m: float
    train_weight_t: float
    braking_percentage: float


def calculate_train(wagons: Iterable[Wagon]) -> TrainCalculation:
    length = 0.0
    weight = 0.0
    braked_weight = 0.0

    for wagon in wagons:
        length += wagon.length_m
        weight += wagon.total_weight_t
        braked_weight += wagon.braked_weight_t

    braking_percentage = 0.0
    if weight > 0:
        braking_percentage = (braked_weight / weight) * 100

    return TrainCalculation(
        train_length_m=round(length, 2),
        train_weight_t=round(weight, 2),
        braking_percentage=round(braking_percentage, 2),
    )
