"""
Standard 108-card UNO deck factory.
"""
import random
from typing import List
from .card import Card, Color, CardType


def create_deck() -> List[Card]:
    """
    Build a freshly shuffled standard UNO deck:
      • 76 coloured cards  (1×0, 2×1-9, 2×Skip, 2×Reverse, 2×Draw Two per colour)
      • 8  black cards     (4×Wild, 4×Wild Draw Four)
    Total: 108 cards
    """
    deck: List[Card] = []
    colours = [Color.RED, Color.GREEN, Color.BLUE, Color.YELLOW]

    for colour in colours:
        # One zero per colour
        deck.append(Card(color=colour, card_type=CardType.NUMBER, number=0))

        # Two of each 1-9 and each action card per colour
        for _ in range(2):
            for n in range(1, 10):
                deck.append(Card(color=colour, card_type=CardType.NUMBER, number=n))
            deck.append(Card(color=colour, card_type=CardType.SKIP))
            deck.append(Card(color=colour, card_type=CardType.REVERSE))
            deck.append(Card(color=colour, card_type=CardType.DRAW_TWO))

    # Four Wilds and four Wild Draw Fours
    for _ in range(4):
        deck.append(Card(color=Color.WILD, card_type=CardType.WILD))
        deck.append(Card(color=Color.WILD, card_type=CardType.WILD_DRAW_FOUR))

    random.shuffle(deck)
    return deck
