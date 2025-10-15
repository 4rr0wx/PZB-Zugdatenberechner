from datetime import datetime
from typing import List, Optional

from sqlmodel import Field, Relationship, SQLModel


class TrainBase(SQLModel):
    name: str = Field(index=True, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)


class Train(TrainBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, nullable=False, sa_column_kwargs={"onupdate": datetime.utcnow}
    )

    wagons: List["Wagon"] = Relationship(
        back_populates="train",
        sa_relationship_kwargs={"cascade": "all, delete", "order_by": "Wagon.position"},
    )


class TrainCreate(TrainBase):
    pass


class TrainUpdate(SQLModel):
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)


class TrainRead(TrainBase):
    id: int


class WagonBase(SQLModel):
    position: int = Field(description="Order of the wagon within the train", ge=1)
    identifier: Optional[str] = Field(default=None, max_length=100, description="Optional wagon number")
    length_m: float = Field(gt=0, description="Length in meters")
    tare_weight_t: float = Field(ge=0, description="Empty weight in tons")
    load_weight_t: float = Field(ge=0, description="Payload in tons")
    braked_weight_t: float = Field(ge=0, description="Braked weight in tons")
    brake_type: Optional[str] = Field(default=None, max_length=50, description="e.g. G/P/R")
    axle_count: Optional[int] = Field(default=None, ge=0)

    @property
    def total_weight_t(self) -> float:
        return self.tare_weight_t + self.load_weight_t


class Wagon(WagonBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    train_id: int = Field(foreign_key="train.id", index=True, nullable=False)

    train: Optional["Train"] = Relationship(back_populates="wagons")


class WagonCreate(WagonBase):
    pass


class WagonUpdate(SQLModel):
    position: Optional[int] = Field(default=None, ge=1)
    identifier: Optional[str] = Field(default=None, max_length=100)
    length_m: Optional[float] = Field(default=None, gt=0)
    tare_weight_t: Optional[float] = Field(default=None, ge=0)
    load_weight_t: Optional[float] = Field(default=None, ge=0)
    braked_weight_t: Optional[float] = Field(default=None, ge=0)
    brake_type: Optional[str] = Field(default=None, max_length=50)
    axle_count: Optional[int] = Field(default=None, ge=0)


class WagonRead(WagonBase):
    id: int
    train_id: int
