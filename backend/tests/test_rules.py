"""
Full UNO rules test suite.

Covers every official rule, edge case, and server-side validation.
Run from the backend/ directory:
    python -m pytest tests/test_rules.py -v
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from game.card import Card, Color, CardType
from game.player import Player
from game.game_state import GameState, GameStatus
from game.deck import create_deck


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def make_game(*names) -> GameState:
    """Create a GameState with named players already joined."""
    g = GameState("TEST")
    for name in names:
        g.add_player(Player(name=name))
    return g


def force_start(g: GameState) -> None:
    """Start the game and reset to a fully deterministic state.

    Replaces the top discard with a neutral Red 5 and resets every field
    that start-card side-effects may have altered so tests always begin
    from a known baseline: p0's turn, clockwise, no pending penalty.
    """
    g.start_game()
    safe = Card(color=Color.RED, card_type=CardType.NUMBER, number=5)
    g.discard_pile[-1] = safe
    g.current_color = Color.RED
    g.current_player_index = 0
    g.direction = 1            # Reverse start card can flip this to -1
    g.draw_stack = 0
    g.drawn_card_id = None
    g.challenge_available = False


def give_hand(player: Player, *cards: Card) -> None:
    """Replace player's hand with the given cards."""
    player.hand = list(cards)


def c(color: str, ctype: str, number: int = None) -> Card:
    """Shorthand card constructor."""
    return Card(
        color=Color(color),
        card_type=CardType(ctype),
        number=number,
    )


def p0(g): return g.players[0]
def p1(g): return g.players[1]
def p2(g): return g.players[2] if len(g.players) > 2 else None

# Safe filler card — never playable on a Red 5 top (different colour and number)
# Use as second arg to give_hand() so playing the first card doesn't trigger win.
FILLER = lambda: c("blue", "number", 8)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Deck composition
# ─────────────────────────────────────────────────────────────────────────────

class TestDeck:
    def test_total_108_cards(self):
        deck = create_deck()
        assert len(deck) == 108

    def test_four_zeros_per_colour(self):
        deck = create_deck()
        zeros = [c for c in deck if c.card_type == CardType.NUMBER and c.number == 0]
        assert len(zeros) == 4  # one per colour

    def test_two_of_each_1_to_9_per_colour(self):
        deck = create_deck()
        for colour in (Color.RED, Color.GREEN, Color.BLUE, Color.YELLOW):
            for n in range(1, 10):
                count = sum(
                    1 for c in deck
                    if c.card_type == CardType.NUMBER and c.number == n and c.color == colour
                )
                assert count == 2, f"Expected 2 of {colour} {n}, got {count}"

    def test_two_skip_per_colour(self):
        deck = create_deck()
        for colour in (Color.RED, Color.GREEN, Color.BLUE, Color.YELLOW):
            count = sum(1 for c in deck if c.card_type == CardType.SKIP and c.color == colour)
            assert count == 2

    def test_two_reverse_per_colour(self):
        deck = create_deck()
        for colour in (Color.RED, Color.GREEN, Color.BLUE, Color.YELLOW):
            count = sum(1 for c in deck if c.card_type == CardType.REVERSE and c.color == colour)
            assert count == 2

    def test_two_draw_two_per_colour(self):
        deck = create_deck()
        for colour in (Color.RED, Color.GREEN, Color.BLUE, Color.YELLOW):
            count = sum(1 for c in deck if c.card_type == CardType.DRAW_TWO and c.color == colour)
            assert count == 2

    def test_four_wilds(self):
        deck = create_deck()
        assert sum(1 for c in deck if c.card_type == CardType.WILD) == 4

    def test_four_wild_draw_fours(self):
        deck = create_deck()
        assert sum(1 for c in deck if c.card_type == CardType.WILD_DRAW_FOUR) == 4


# ─────────────────────────────────────────────────────────────────────────────
# 2. Lobby / room management
# ─────────────────────────────────────────────────────────────────────────────

class TestLobby:
    def test_add_players_up_to_6(self):
        g = GameState("R1")
        for i in range(6):
            assert g.add_player(Player(name=f"P{i}")) is True
        assert len(g.players) == 6

    def test_cannot_add_7th_player(self):
        g = GameState("R1")
        for i in range(6):
            g.add_player(Player(name=f"P{i}"))
        assert g.add_player(Player(name="Extra")) is False

    def test_first_player_is_host(self):
        g = make_game("Alice", "Bob")
        assert g.host_player_id == g.players[0].id

    def test_cannot_start_with_1_player(self):
        g = make_game("Solo")
        result = g.start_game()
        assert result["success"] is False

    def test_cannot_start_with_more_than_6(self):
        g = GameState("R1")
        for i in range(7):
            g.players.append(Player(name=f"P{i}"))
        result = g.start_game()
        assert result["success"] is False

    def test_start_game_deals_7_cards(self):
        g = make_game("A", "B")
        g.start_game()
        for p in g.players:
            assert len(p.hand) == 7

    def test_start_card_is_not_wild(self):
        for _ in range(20):   # repeat because deck is shuffled
            g = make_game("A", "B")
            g.start_game()
            assert not g.discard_pile[-1].is_wild()

    def test_status_becomes_playing(self):
        g = make_game("A", "B")
        g.start_game()
        assert g.status == GameStatus.PLAYING

    def test_remove_player_from_lobby(self):
        g = make_game("A", "B", "C")
        g.remove_player(g.players[1].id)
        assert len(g.players) == 2

    def test_host_transfers_on_host_leave(self):
        g = make_game("A", "B", "C")
        original_host = g.host_player_id
        g.remove_player(original_host)
        assert g.host_player_id != original_host
        assert g.host_player_id == g.players[0].id


# ─────────────────────────────────────────────────────────────────────────────
# 3. Card — can_play_on logic
# ─────────────────────────────────────────────────────────────────────────────

class TestCanPlayOn:
    def _top(self):
        return c("red", "number", 5)

    def test_same_colour_playable(self):
        assert c("red", "number", 3).can_play_on(self._top(), Color.RED)

    def test_same_number_playable(self):
        assert c("blue", "number", 5).can_play_on(self._top(), Color.RED)

    def test_different_colour_and_number_not_playable(self):
        assert not c("blue", "number", 3).can_play_on(self._top(), Color.RED)

    def test_same_action_type_playable(self):
        top = c("red", "skip")
        card = c("blue", "skip")
        assert card.can_play_on(top, Color.RED)

    def test_wild_always_playable(self):
        assert c("wild", "wild").can_play_on(self._top(), Color.RED)

    def test_wild_draw_four_always_playable(self):
        assert c("wild", "wild_draw_four").can_play_on(self._top(), Color.RED)

    def test_color_matches_current_color_not_top_card(self):
        # After a wild, current_color may differ from top card's color
        top = c("wild", "wild")
        card = c("green", "number", 7)
        # current colour is green — card should be playable
        assert card.can_play_on(top, Color.GREEN)
        # current colour is red — green card NOT playable on a wild top
        assert not card.can_play_on(top, Color.RED)

    def test_draw_two_on_same_colour(self):
        top = c("red", "number", 5)
        assert c("red", "draw_two").can_play_on(top, Color.RED)

    def test_draw_two_on_draw_two_different_colour(self):
        top = c("red", "draw_two")
        assert c("blue", "draw_two").can_play_on(top, Color.RED)


# ─────────────────────────────────────────────────────────────────────────────
# 4. Turn enforcement
# ─────────────────────────────────────────────────────────────────────────────

class TestTurnEnforcement:
    def test_wrong_player_cannot_play(self):
        g = make_game("A", "B")
        force_start(g)
        card = c("red", "number", 5)
        give_hand(p1(g), card)
        # p1 tries to play on p0's turn
        result = g.play_card(p1(g).id, card.id)
        assert result["success"] is False
        assert "not your turn" in result["error"].lower()

    def test_wrong_player_cannot_draw(self):
        g = make_game("A", "B")
        force_start(g)
        result = g.draw_card(p1(g).id)
        assert result["success"] is False

    def test_turn_advances_after_number_card(self):
        g = make_game("A", "B")
        force_start(g)
        card = c("red", "number", 3)
        give_hand(p0(g), card, FILLER())
        g.play_card(p0(g).id, card.id)
        assert g.players[g.current_player_index].id == p1(g).id

    def test_turn_advances_after_draw(self):
        g = make_game("A", "B")
        force_start(g)
        # Give p0 an unplayable card so draw ends turn
        g.deck = [c("blue", "number", 9)]  # unplayable on Red 5
        g.draw_card(p0(g).id)
        assert g.players[g.current_player_index].id == p1(g).id


# ─────────────────────────────────────────────────────────────────────────────
# 5. Number card
# ─────────────────────────────────────────────────────────────────────────────

class TestNumberCard:
    def test_play_matching_colour(self):
        g = make_game("A", "B")
        force_start(g)
        card = c("red", "number", 7)
        give_hand(p0(g), card, FILLER())
        result = g.play_card(p0(g).id, card.id)
        assert result["success"] is True
        assert g.current_color == Color.RED

    def test_play_matching_number_different_colour(self):
        g = make_game("A", "B")
        force_start(g)   # top = Red 5
        card = c("blue", "number", 5)
        give_hand(p0(g), card, FILLER())
        result = g.play_card(p0(g).id, card.id)
        assert result["success"] is True
        assert g.current_color == Color.BLUE

    def test_invalid_card_rejected(self):
        g = make_game("A", "B")
        force_start(g)   # top = Red 5
        card = c("blue", "number", 7)  # neither same colour nor same number
        give_hand(p0(g), card)
        result = g.play_card(p0(g).id, card.id)
        assert result["success"] is False


# ─────────────────────────────────────────────────────────────────────────────
# 6. Skip card
# ─────────────────────────────────────────────────────────────────────────────

class TestSkip:
    def test_skip_advances_two_players(self):
        g = make_game("A", "B", "C")
        force_start(g)
        card = c("red", "skip")
        give_hand(p0(g), card, FILLER())
        g.play_card(p0(g).id, card.id)
        # p1 should be skipped; p2 should be current
        assert g.players[g.current_player_index].id == p2(g).id

    def test_skip_in_two_player_skips_opponent(self):
        g = make_game("A", "B")
        force_start(g)
        card = c("red", "skip")
        give_hand(p0(g), card, FILLER())
        g.play_card(p0(g).id, card.id)
        # p1 skipped; back to p0
        assert g.players[g.current_player_index].id == p0(g).id


# ─────────────────────────────────────────────────────────────────────────────
# 7. Reverse card
# ─────────────────────────────────────────────────────────────────────────────

class TestReverse:
    def test_reverse_changes_direction(self):
        g = make_game("A", "B", "C")
        force_start(g)
        assert g.direction == 1
        card = c("red", "reverse")
        give_hand(p0(g), card, FILLER())
        g.play_card(p0(g).id, card.id)
        assert g.direction == -1

    def test_reverse_in_two_player_acts_as_skip(self):
        g = make_game("A", "B")
        force_start(g)
        card = c("red", "reverse")
        give_hand(p0(g), card, FILLER())
        g.play_card(p0(g).id, card.id)
        # In 2-player, reverse = skip — p0 goes again
        assert g.players[g.current_player_index].id == p0(g).id

    def test_reverse_multiplay_next_is_last_player(self):
        g = make_game("A", "B", "C")
        force_start(g)  # order: p0 → p1 → p2
        card = c("red", "reverse")
        give_hand(p0(g), card, FILLER())
        g.play_card(p0(g).id, card.id)
        # Direction reversed: p0 → p2 → p1
        assert g.players[g.current_player_index].id == p2(g).id


# ─────────────────────────────────────────────────────────────────────────────
# 8. Draw Two (+2)
# ─────────────────────────────────────────────────────────────────────────────

class TestDrawTwo:
    def test_draw_two_sets_stack(self):
        g = make_game("A", "B")
        force_start(g)
        card = c("red", "draw_two")
        give_hand(p0(g), card, FILLER())
        g.play_card(p0(g).id, card.id)
        assert g.draw_stack == 2

    def test_next_player_must_draw_two(self):
        g = make_game("A", "B")
        force_start(g)
        card = c("red", "draw_two")
        give_hand(p0(g), card, FILLER())
        g.play_card(p0(g).id, card.id)
        initial_count = len(p1(g).hand)
        g.draw_card(p1(g).id)
        assert len(p1(g).hand) == initial_count + 2

    def test_draw_two_victim_loses_turn(self):
        g = make_game("A", "B", "C")
        force_start(g)
        card = c("red", "draw_two")
        give_hand(p0(g), card, FILLER())
        g.play_card(p0(g).id, card.id)
        g.draw_card(p1(g).id)   # p1 accepts penalty
        # Turn should now be p2's
        assert g.players[g.current_player_index].id == p2(g).id

    def test_cannot_stack_draw_two_on_draw_two(self):
        """Official rules: no stacking draw cards."""
        g = make_game("A", "B")
        force_start(g)
        give_hand(p0(g), c("red", "draw_two"), FILLER())
        g.play_card(p0(g).id, p0(g).hand[0].id)
        # p1 now has draw_stack == 2; tries to stack another +2
        stack_card = c("blue", "draw_two")
        give_hand(p1(g), stack_card)
        result = g.play_card(p1(g).id, stack_card.id)
        assert result["success"] is False
        assert "draw" in result["error"].lower()

    def test_cannot_stack_draw_four_on_draw_two(self):
        """Official rules: no stacking draw cards."""
        g = make_game("A", "B")
        force_start(g)
        give_hand(p0(g), c("red", "draw_two"), FILLER())
        g.play_card(p0(g).id, p0(g).hand[0].id)
        stack_card = c("wild", "wild_draw_four")
        give_hand(p1(g), stack_card)
        result = g.play_card(p1(g).id, stack_card.id)
        assert result["success"] is False


# ─────────────────────────────────────────────────────────────────────────────
# 9. Wild card
# ─────────────────────────────────────────────────────────────────────────────

class TestWild:
    def test_wild_playable_on_any_card(self):
        g = make_game("A", "B")
        force_start(g)
        card = c("wild", "wild")
        give_hand(p0(g), card)
        result = g.play_card(p0(g).id, card.id, chosen_color="green")
        assert result["success"] is True

    def test_wild_requires_colour_choice(self):
        g = make_game("A", "B")
        force_start(g)
        card = c("wild", "wild")
        give_hand(p0(g), card)
        result = g.play_card(p0(g).id, card.id)          # no colour
        assert result["success"] is False

    def test_wild_invalid_colour_rejected(self):
        g = make_game("A", "B")
        force_start(g)
        card = c("wild", "wild")
        give_hand(p0(g), card)
        result = g.play_card(p0(g).id, card.id, chosen_color="purple")
        assert result["success"] is False

    def test_wild_sets_current_colour(self):
        g = make_game("A", "B")
        force_start(g)
        card = c("wild", "wild")
        give_hand(p0(g), card, FILLER())
        g.play_card(p0(g).id, card.id, chosen_color="blue")
        assert g.current_color == Color.BLUE

    def test_next_play_must_match_declared_colour(self):
        g = make_game("A", "B")
        force_start(g)
        wild = c("wild", "wild")
        give_hand(p0(g), wild)
        g.play_card(p0(g).id, wild.id, chosen_color="blue")
        # p1 plays a green card — should fail because current colour is blue
        green_card = c("green", "number", 4)
        give_hand(p1(g), green_card)
        result = g.play_card(p1(g).id, green_card.id)
        assert result["success"] is False

    def test_next_play_blue_card_after_wild_blue(self):
        g = make_game("A", "B")
        force_start(g)
        wild = c("wild", "wild")
        give_hand(p0(g), wild, FILLER())
        g.play_card(p0(g).id, wild.id, chosen_color="blue")
        blue_card = c("blue", "number", 4)
        give_hand(p1(g), blue_card)
        result = g.play_card(p1(g).id, blue_card.id)
        assert result["success"] is True


# ─────────────────────────────────────────────────────────────────────────────
# 10. Wild Draw Four (+4)
# ─────────────────────────────────────────────────────────────────────────────

class TestWildDrawFour:
    def test_draw_four_sets_stack_and_challenge_flag(self):
        g = make_game("A", "B")
        force_start(g)
        card = c("wild", "wild_draw_four")
        give_hand(p0(g), card, FILLER())
        result = g.play_card(p0(g).id, card.id, chosen_color="green")
        assert result["success"] is True
        assert g.draw_stack == 4
        assert g.challenge_available is True

    def test_draw_four_victim_draws_4_and_loses_turn(self):
        g = make_game("A", "B", "C")
        force_start(g)
        card = c("wild", "wild_draw_four")
        give_hand(p0(g), card, FILLER())
        g.play_card(p0(g).id, card.id, chosen_color="green")
        initial = len(p1(g).hand)
        g.draw_card(p1(g).id)
        assert len(p1(g).hand) == initial + 4
        assert g.players[g.current_player_index].id == p2(g).id

    def test_cannot_stack_draw_two_on_draw_four(self):
        """Official rules: +2 cannot be stacked on a +4."""
        g = make_game("A", "B")
        force_start(g)
        give_hand(p0(g), c("wild", "wild_draw_four"))
        g.play_card(p0(g).id, p0(g).hand[0].id, chosen_color="red")
        stack_card = c("red", "draw_two")
        give_hand(p1(g), stack_card)
        result = g.play_card(p1(g).id, stack_card.id)
        assert result["success"] is False

    def test_cannot_stack_draw_four_on_draw_four(self):
        g = make_game("A", "B")
        force_start(g)
        give_hand(p0(g), c("wild", "wild_draw_four"))
        g.play_card(p0(g).id, p0(g).hand[0].id, chosen_color="red")
        stack_card = c("wild", "wild_draw_four")
        give_hand(p1(g), stack_card)
        result = g.play_card(p1(g).id, stack_card.id)
        assert result["success"] is False

    def test_challenge_flag_cleared_after_draw(self):
        g = make_game("A", "B")
        force_start(g)
        give_hand(p0(g), c("wild", "wild_draw_four"), FILLER())
        g.play_card(p0(g).id, p0(g).hand[0].id, chosen_color="red")
        g.draw_card(p1(g).id)   # accept penalty
        assert g.challenge_available is False

    def test_draw_four_requires_colour(self):
        g = make_game("A", "B")
        force_start(g)
        card = c("wild", "wild_draw_four")
        give_hand(p0(g), card)
        result = g.play_card(p0(g).id, card.id)  # no colour
        assert result["success"] is False


# ─────────────────────────────────────────────────────────────────────────────
# 11. Wild Draw Four challenge
# ─────────────────────────────────────────────────────────────────────────────

class TestChallenge:
    def _setup_challenge(self, p0_has_legal: bool):
        """
        p0 plays +4 declaring green.
        If p0_has_legal=True, p0 still has a red card (illegal play).
        If p0_has_legal=False, p0 has no red cards (legal play).
        """
        g = make_game("A", "B")
        force_start(g)  # top = Red 5, current_color = Red
        wild4 = c("wild", "wild_draw_four")
        if p0_has_legal:
            # has a red card alongside the +4 → illegal play
            give_hand(p0(g), wild4, c("red", "number", 3))
        else:
            # no red cards → legal play
            give_hand(p0(g), wild4, c("blue", "number", 3))
        g.play_card(p0(g).id, wild4.id, chosen_color="green")
        return g

    def test_successful_challenge_p0_draws_4(self):
        """Challenger is correct: +4 was played illegally."""
        g = self._setup_challenge(p0_has_legal=True)
        initial_p0 = len(p0(g).hand)
        initial_p1 = len(p1(g).hand)
        result = g.challenge_wild_four(p1(g).id)
        assert result["success"] is True
        assert result["challenge_result"] == "success"
        assert len(p0(g).hand) == initial_p0 + 4   # p0 draws 4
        assert len(p1(g).hand) == initial_p1        # p1 draws nothing

    def test_successful_challenge_challenger_keeps_turn(self):
        """After a successful challenge, the challenger keeps their turn."""
        g = self._setup_challenge(p0_has_legal=True)
        g.challenge_wild_four(p1(g).id)
        assert g.players[g.current_player_index].id == p1(g).id

    def test_failed_challenge_p1_draws_6(self):
        """Challenger is wrong: +4 was played legally."""
        g = self._setup_challenge(p0_has_legal=False)
        initial_p1 = len(p1(g).hand)
        result = g.challenge_wild_four(p1(g).id)
        assert result["success"] is True
        assert result["challenge_result"] == "failed"
        assert len(p1(g).hand) == initial_p1 + 6   # 4 original + 2 penalty

    def test_failed_challenge_advances_turn(self):
        g = self._setup_challenge(p0_has_legal=False)
        g.challenge_wild_four(p1(g).id)
        # p1's turn ended; back to p0
        assert g.players[g.current_player_index].id == p0(g).id

    def test_no_challenge_available_without_draw_four(self):
        g = make_game("A", "B")
        force_start(g)
        result = g.challenge_wild_four(p0(g).id)
        assert result["success"] is False

    def test_cannot_challenge_after_drawing(self):
        g = self._setup_challenge(p0_has_legal=False)
        g.draw_card(p1(g).id)  # accept penalty
        result = g.challenge_wild_four(p1(g).id)
        assert result["success"] is False

    def test_challenge_checks_previous_colour(self):
        """Challenge looks at colour BEFORE the +4, not the declared colour."""
        g = make_game("A", "B")
        force_start(g)  # current_color = RED
        wild4 = c("wild", "wild_draw_four")
        # p0 has a red card → playing +4 is illegal
        give_hand(p0(g), wild4, c("red", "number", 9))
        g.play_card(p0(g).id, wild4.id, chosen_color="blue")
        result = g.challenge_wild_four(p1(g).id)
        assert result["challenge_result"] == "success"


# ─────────────────────────────────────────────────────────────────────────────
# 12. Draw card (normal draw)
# ─────────────────────────────────────────────────────────────────────────────

class TestDrawCard:
    def test_draw_adds_card_to_hand(self):
        g = make_game("A", "B")
        force_start(g)
        before = len(p0(g).hand)
        g.deck = [c("blue", "number", 9)]   # unplayable → turn ends
        g.draw_card(p0(g).id)
        assert len(p0(g).hand) == before + 1

    def test_draw_unplayable_ends_turn(self):
        g = make_game("A", "B")
        force_start(g)
        g.deck = [c("blue", "number", 9)]   # not Red, not 5
        result = g.draw_card(p0(g).id)
        assert result["turn_ends"] is True
        assert g.players[g.current_player_index].id == p1(g).id

    def test_draw_playable_does_not_end_turn(self):
        g = make_game("A", "B")
        force_start(g)
        g.deck = [c("red", "number", 9)]   # same colour → playable
        result = g.draw_card(p0(g).id)
        assert result["turn_ends"] is False
        assert result["can_play"] is True
        assert g.drawn_card_id is not None
        assert g.players[g.current_player_index].id == p0(g).id

    def test_can_play_drawn_card(self):
        g = make_game("A", "B")
        force_start(g)
        drawn = c("red", "number", 9)
        g.deck = [drawn]
        g.draw_card(p0(g).id)
        result = g.play_card(p0(g).id, drawn.id)
        assert result["success"] is True

    def test_cannot_play_other_card_after_drawing(self):
        g = make_game("A", "B")
        force_start(g)
        drawn = c("red", "number", 9)
        other = c("red", "number", 3)
        g.deck = [drawn]
        give_hand(p0(g), other)
        g.draw_card(p0(g).id)
        result = g.play_card(p0(g).id, other.id)
        assert result["success"] is False
        assert "drew" in result["error"].lower()

    def test_pass_after_draw_ends_turn(self):
        g = make_game("A", "B")
        force_start(g)
        drawn = c("red", "number", 9)
        g.deck = [drawn]
        g.draw_card(p0(g).id)
        result = g.pass_turn(p0(g).id)
        assert result["success"] is True
        assert g.players[g.current_player_index].id == p1(g).id

    def test_cannot_pass_without_drawing(self):
        g = make_game("A", "B")
        force_start(g)
        result = g.pass_turn(p0(g).id)
        assert result["success"] is False

    def test_reshuffle_when_deck_empty(self):
        g = make_game("A", "B")
        force_start(g)
        # Empty the deck
        g.deck = []
        # Put several cards in discard (top card stays)
        g.discard_pile = [
            c("red", "number", 5),   # will stay as top
            c("blue", "number", 1),
            c("green", "number", 2),
        ]
        g.draw_card(p0(g).id)
        # Deck should have been reshuffled from the old discard cards
        # (2 cards were recycled, 1 drawn → 1 remains or 0)
        assert len(g.discard_pile) == 1   # only the original top remains


# ─────────────────────────────────────────────────────────────────────────────
# 13. UNO call and catch
# ─────────────────────────────────────────────────────────────────────────────

class TestUno:
    def test_call_uno_with_one_card(self):
        g = make_game("A", "B")
        force_start(g)
        give_hand(p0(g), c("red", "number", 5))
        result = g.call_uno(p0(g).id)
        assert result["success"] is True
        assert p0(g).id in g.uno_called

    def test_cannot_call_uno_with_multiple_cards(self):
        g = make_game("A", "B")
        force_start(g)
        give_hand(p0(g), c("red", "number", 5), c("blue", "number", 3))
        result = g.call_uno(p0(g).id)
        assert result["success"] is False

    def test_catch_uno_player_draws_2(self):
        g = make_game("A", "B")
        force_start(g)
        # p0 has 1 card but hasn't called UNO
        give_hand(p0(g), c("red", "number", 5))
        before = len(p0(g).hand)
        result = g.catch_uno_violation(p1(g).id, p0(g).id)
        assert result["success"] is True
        assert len(p0(g).hand) == before + 2

    def test_cannot_catch_player_who_called_uno(self):
        g = make_game("A", "B")
        force_start(g)
        give_hand(p0(g), c("red", "number", 5))
        g.call_uno(p0(g).id)
        result = g.catch_uno_violation(p1(g).id, p0(g).id)
        assert result["success"] is False

    def test_cannot_catch_player_with_more_than_1_card(self):
        g = make_game("A", "B")
        force_start(g)
        result = g.catch_uno_violation(p1(g).id, p0(g).id)
        assert result["success"] is False


# ─────────────────────────────────────────────────────────────────────────────
# 14. Win condition
# ─────────────────────────────────────────────────────────────────────────────

class TestWinCondition:
    def test_playing_last_card_wins(self):
        g = make_game("A", "B")
        force_start(g)
        last = c("red", "number", 3)
        give_hand(p0(g), last)
        result = g.play_card(p0(g).id, last.id)
        assert result.get("game_over") is True
        assert g.status == GameStatus.FINISHED
        assert g.winner == "A"
        assert g.winner_id == p0(g).id

    def test_game_state_serialised_with_winner(self):
        g = make_game("A", "B")
        force_start(g)
        last = c("red", "number", 3)
        give_hand(p0(g), last)
        g.play_card(p0(g).id, last.id)
        state = g.get_state_for_player(p0(g).id)
        assert state["status"] == "finished"
        assert state["winner"] == "A"
        assert state["winner_id"] == p0(g).id


# ─────────────────────────────────────────────────────────────────────────────
# 15. Opening card effects
# ─────────────────────────────────────────────────────────────────────────────

class TestOpeningCard:
    def _make_and_start_with_top(self, card: Card) -> GameState:
        g = make_game("A", "B", "C")
        g.start_game()
        # Force the top card and re-apply effects
        g.discard_pile[-1] = card
        g.current_color = card.color
        g.current_player_index = 0
        g.draw_stack = 0
        g._apply_start_card_effects()
        return g

    def test_opening_skip_skips_first_player(self):
        g = self._make_and_start_with_top(c("red", "skip"))
        # p0 should be skipped
        assert g.players[g.current_player_index].id != p0(g).id

    def test_opening_reverse_3player_changes_direction(self):
        g = self._make_and_start_with_top(c("red", "reverse"))
        assert g.direction == -1

    def test_opening_draw_two_first_player_draws_2(self):
        g = make_game("A", "B", "C")
        g.start_game()
        g.draw_stack = 0
        g.current_player_index = 0
        draw_two = c("red", "draw_two")
        g.discard_pile[-1] = draw_two
        g.current_color = Color.RED
        before = len(p0(g).hand)
        g._apply_start_card_effects()
        assert len(p0(g).hand) >= before + 2


# ─────────────────────────────────────────────────────────────────────────────
# 16. State serialisation
# ─────────────────────────────────────────────────────────────────────────────

class TestStateSerialization:
    def test_my_hand_contains_only_my_cards(self):
        g = make_game("A", "B")
        force_start(g)
        state = g.get_state_for_player(p0(g).id)
        assert len(state["my_hand"]) == len(p0(g).hand)

    def test_opponents_card_count_hidden(self):
        g = make_game("A", "B")
        force_start(g)
        state = g.get_state_for_player(p0(g).id)
        opp = next(p for p in state["players"] if p["id"] == p1(g).id)
        assert opp["card_count"] == len(p1(g).hand)
        assert "hand" not in opp

    def test_state_contains_required_fields(self):
        g = make_game("A", "B")
        force_start(g)
        state = g.get_state_for_player(p0(g).id)
        for field in [
            "room_id", "status", "current_player_id", "direction",
            "current_color", "discard_top", "draw_pile_count", "draw_stack",
            "winner", "winner_id", "challenge_available", "drawn_card_id",
            "last_action", "action_log", "players", "my_hand", "my_index",
        ]:
            assert field in state, f"Missing field: {field}"

    def test_challenge_available_exposed_to_victim(self):
        g = make_game("A", "B")
        force_start(g)
        give_hand(p0(g), c("wild", "wild_draw_four"), FILLER())
        g.play_card(p0(g).id, p0(g).hand[0].id, chosen_color="green")
        state = g.get_state_for_player(p1(g).id)
        assert state["challenge_available"] is True

    def test_drawn_card_id_exposed_to_current_player(self):
        g = make_game("A", "B")
        force_start(g)
        drawn = c("red", "number", 9)
        g.deck = [drawn]
        g.draw_card(p0(g).id)
        state = g.get_state_for_player(p0(g).id)
        assert state["drawn_card_id"] == drawn.id


# ─────────────────────────────────────────────────────────────────────────────
# 17. Reconnection
# ─────────────────────────────────────────────────────────────────────────────

class TestReconnection:
    def test_disconnect_marks_player_offline(self):
        g = make_game("A", "B")
        g.disconnect_player(p0(g).id)
        assert p0(g).is_connected is False

    def test_reconnect_marks_player_online(self):
        g = make_game("A", "B")
        g.disconnect_player(p0(g).id)
        g.reconnect_player(p0(g).id)
        assert p0(g).is_connected is True


# ─────────────────────────────────────────────────────────────────────────────
# Run
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import subprocess, sys
    sys.exit(subprocess.call([sys.executable, "-m", "pytest", __file__, "-v"]))
