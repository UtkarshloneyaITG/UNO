"""
UNO Card model — defines colors, types, and the Card dataclass.
"""
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional
import uuid


class Color(str, Enum):
    RED = "red"
    GREEN = "green"
    BLUE = "blue"
    YELLOW = "yellow"
    WILD = "wild"   # placeholder color for wild cards


class CardType(str, Enum):
    NUMBER = "number"
    SKIP = "skip"
    REVERSE = "reverse"
    DRAW_TWO = "draw_two"
    WILD = "wild"
    WILD_DRAW_FOUR = "wild_draw_four"


@dataclass
class Card:
    color: Color
    card_type: CardType
    number: Optional[int] = None          # 0-9 for number cards, None otherwise
    id: str = field(default_factory=lambda: str(uuid.uuid4()))

    # ------------------------------------------------------------------
    # Serialisation
    # ------------------------------------------------------------------
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "color": self.color.value,
            "card_type": self.card_type.value,
            "number": self.number,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def is_wild(self) -> bool:
        return self.card_type in (CardType.WILD, CardType.WILD_DRAW_FOUR)

    def can_play_on(self, top_card: "Card", current_color: Color) -> bool:
        """Return True when this card is legally playable on the current discard pile."""
        # Wild cards are always playable
        if self.is_wild():
            return True

        # Matches the active colour (which may differ from top card after a wild)
        if self.color == current_color:
            return True

        # Matches the top card's type
        if self.card_type == top_card.card_type:
            # For number cards, the numbers must also match
            if self.card_type == CardType.NUMBER:
                return self.number == top_card.number
            return True

        return False

    def display_name(self) -> str:
        """Human-readable label for log messages."""
        if self.card_type == CardType.NUMBER:
            return f"{self.color.value.capitalize()} {self.number}"
        labels = {
            CardType.SKIP: "Skip",
            CardType.REVERSE: "Reverse",
            CardType.DRAW_TWO: "Draw Two",
            CardType.WILD: "Wild",
            CardType.WILD_DRAW_FOUR: "Wild Draw Four",
        }
        prefix = "" if self.is_wild() else f"{self.color.value.capitalize()} "
        return f"{prefix}{labels[self.card_type]}"
