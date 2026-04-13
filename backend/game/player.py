"""
Player model — holds a player's identity and current hand.
"""
import uuid
from dataclasses import dataclass, field
from typing import List
from .card import Card


@dataclass
class Player:
    name: str
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    hand: List[Card] = field(default_factory=list)
    is_connected: bool = True

    def to_dict(self) -> dict:
        """Public summary (no hand contents — use game_state view for that)."""
        return {
            "id": self.id,
            "name": self.name,
            "card_count": len(self.hand),
            "is_connected": self.is_connected,
        }
