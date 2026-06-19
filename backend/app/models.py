from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class DamageType(str, Enum):
    ILLEGAL_DUMPING = "illegal_dumping"
    FLOODING = "flooding"
    EROSION = "erosion"
    WATER_POLLUTION = "water_pollution"
    DEFORESTATION = "deforestation"


class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ReportStatus(str, Enum):
    PENDING_REVIEW = "pending_review"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    REJECTED = "rejected"


@dataclass
class Report:
    id: str = ""
    citizen_id: str = ""
    image_url: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    geohash: str = ""
    address: str = ""
    damage_type: DamageType = DamageType.ILLEGAL_DUMPING
    ai_description: str = ""
    ai_confidence: float = 0.0
    severity_level: SeverityLevel = SeverityLevel.LOW
    environment_score: int = 100
    status: ReportStatus = ReportStatus.PENDING_REVIEW
    created_at: str = ""
    updated_at: str = ""

    def to_dict(self) -> dict:
        return {
            "citizen_id": self.citizen_id,
            "image_url": self.image_url,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "geohash": self.geohash,
            "address": self.address,
            "damage_type": self.damage_type.value,
            "ai_description": self.ai_description,
            "ai_confidence": self.ai_confidence,
            "severity_level": self.severity_level.value,
            "environment_score": self.environment_score,
            "status": self.status.value,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @staticmethod
    def from_dict(doc_id: str, data: dict) -> "Report":
        return Report(
            id=doc_id,
            citizen_id=data.get("citizen_id", ""),
            image_url=data.get("image_url", ""),
            latitude=data.get("latitude", 0.0),
            longitude=data.get("longitude", 0.0),
            geohash=data.get("geohash", ""),
            address=data.get("address", ""),
            damage_type=DamageType(data.get("damage_type", "illegal_dumping")),
            ai_description=data.get("ai_description", ""),
            ai_confidence=data.get("ai_confidence", 0.0),
            severity_level=SeverityLevel(data.get("severity_level", "low")),
            environment_score=data.get("environment_score", 100),
            status=ReportStatus(data.get("status", "pending_review")),
            created_at=data.get("created_at", ""),
            updated_at=data.get("updated_at", ""),
        )
