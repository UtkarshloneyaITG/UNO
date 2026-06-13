"""
Core UNO game state and authoritative rule engine.

Supports:
  • 2-5 players
  • All standard card effects (Skip, Reverse, Draw Two, Wild, Wild Draw Four)
  • Draw-card stacking (house rule — any Draw Two or Wild Draw Four can stack)
  • Wild Draw Four challenge
  • UNO-call tracking and catch-penalty
  • Turn-after-draw: player may play the card they just drew, or pass
  • Reconnection-aware player state
"""
import random
from enum import Enum
from typing import Dict, List, Optional, Set

from .card import Card, Color, CardType
from .deck import create_deck
from .player import Player


class GameStatus(str, Enum):
    WAITING = "waiting"
    PLAYING = "playing"
    FINISHED = "finished"


class GameState:
    def __init__(self, room_id: str) -> None:
        self.room_id: str = room_id
        self.players: List[Player] = []
        self.deck: List[Card] = []
        self.discard_pile: List[Card] = []
        self.current_player_index: int = 0
        self.direction: int = 1               # +1 = clockwise, -1 = counter-clockwise
        self.status: GameStatus = GameStatus.WAITING
        self.current_color: Optional[Color] = None
        self.previous_color: Optional[Color] = None   # colour before last wild
        self.draw_stack: int = 0              # accumulated draw penalty
        self.winner: Optional[str] = None
        self.winner_id: Optional[str] = None
        self.uno_called: Set[str] = set()     # player IDs who called UNO
        self.challenge_available: bool = False
        self.last_wild_draw_four_player_id: Optional[str] = None
        self.drawn_card_id: Optional[str] = None  # card drawn this turn (may play)
        self.host_player_id: Optional[str] = None
        self.last_action: str = ""
        self.action_log: List[str] = []
        self.skipped_player_id: Optional[str] = None   # set when a Skip card is played
        self.turn_deadline_ms: Optional[int] = None    # epoch ms the current turn must act by
        # Multi-place ranking
        self.placements: List[dict] = []              # [{rank, id, name}] in finish order
        self.finished_player_ids: Set[str] = set()    # players who have emptied their hand
        # Cumulative match scoring — survives rematches in the same room
        self.scores: Dict[str, int] = {}              # player_id -> total points
        self.last_round_points: int = 0               # points the last round was worth
        self.round_points_awarded: bool = False       # guards against double-award
        self.rounds_played: int = 0
        # Host-configurable room settings (changeable in the lobby only)
        self.settings: dict = {"turn_seconds": 30, "stack_draw_cards": False}
        # Players the host kicked — blocked from reconnecting by player_id
        self.kicked_player_ids: Set[str] = set()

    # ------------------------------------------------------------------
    # Room management
    # ------------------------------------------------------------------

    def add_player(self, player: Player) -> bool:
        """Add a player during the lobby phase. Returns False if full or in-game."""
        if self.status != GameStatus.WAITING:
            return False
        if len(self.players) >= 7:
            return False
        self.players.append(player)
        if not self.host_player_id:
            self.host_player_id = player.id
        return True

    def remove_player(self, player_id: str) -> None:
        """Remove a player from the lobby."""
        self.players = [p for p in self.players if p.id != player_id]
        self.scores.pop(player_id, None)
        # Hand host to next available player if host left
        if self.host_player_id == player_id and self.players:
            self.host_player_id = self.players[0].id
        elif not self.players:
            self.host_player_id = None

    def reconnect_player(self, player_id: str) -> bool:
        if player_id in self.kicked_player_ids:
            return False
        p = self._find_player(player_id)
        if p:
            p.is_connected = True
            return True
        return False

    def disconnect_player(self, player_id: str) -> None:
        p = self._find_player(player_id)
        if p:
            p.is_connected = False

    # ------------------------------------------------------------------
    # Game start
    # ------------------------------------------------------------------

    def start_game(self) -> dict:
        """Initialise the deck, deal cards, and begin play."""
        if self.status == GameStatus.PLAYING:
            return {"success": False, "error": "Game already in progress."}
        if len(self.players) < 2:
            return {"success": False, "error": "Need at least 2 players to start."}
        if len(self.players) > 7:
            return {"success": False, "error": "Maximum 7 players allowed."}

        # Reset game state (cumulative `scores` deliberately survives)
        self.last_round_points = 0
        self.round_points_awarded = False
        self.deck = create_deck()
        self.discard_pile = []
        self.current_player_index = 0
        self.direction = 1
        self.draw_stack = 0
        self.uno_called = set()
        self.drawn_card_id = None
        self.challenge_available = False
        self.last_wild_draw_four_player_id = None
        self.winner = None
        self.winner_id = None
        self.placements = []
        self.finished_player_ids = set()
        self.skipped_player_id = None
        self.action_log = []

        # Deal 7 cards to each player
        for player in self.players:
            player.hand = [self.deck.pop() for _ in range(7)]

        # Flip the starting card — must not be a wild
        while True:
            top = self.deck.pop()
            if not top.is_wild():
                self.discard_pile.append(top)
                self.current_color = top.color
                break
            # Put wild back at the bottom and try again
            self.deck.insert(0, top)

        self.status = GameStatus.PLAYING
        self._apply_start_card_effects()
        self._log(f"Game started! {self.players[self.current_player_index].name}'s turn.")
        return {"success": True}

    def _apply_start_card_effects(self) -> None:
        """Handle Skip / Reverse / Draw Two as the opening card."""
        card = self.discard_pile[-1]
        first = self.players[self.current_player_index]

        if card.card_type == CardType.SKIP:
            self._advance_turn()
            self._log(f"Opening card is Skip — {first.name} is skipped.")

        elif card.card_type == CardType.REVERSE:
            if len(self.players) == 2:
                # Acts as Skip: first player goes again (no advance)
                self._log(f"Opening card is Reverse — {first.name} plays again.")
            else:
                self.direction = -1
                # In multi-player, last seat (counter-clockwise from 0) goes first
                self._advance_turn()
                self._log(
                    f"Opening card is Reverse — direction reversed, "
                    f"{self.players[self.current_player_index].name} starts."
                )

        elif card.card_type == CardType.DRAW_TWO:
            self._draw_for_player(first, 2)
            self._advance_turn()
            self._log(f"Opening card is Draw Two — {first.name} draws 2 and is skipped.")

    # ------------------------------------------------------------------
    # Rematch
    # ------------------------------------------------------------------

    def reset_for_rematch(self) -> dict:
        """
        Return a finished game to the lobby for another round.

        Keeps: room_id, connected players, host, cumulative scores,
        settings and the kicked list. Disconnected players are pruned
        (their ids are returned so the caller can clean up its indexes).
        """
        if self.status != GameStatus.FINISHED:
            return {"success": False, "error": "Game is not finished."}

        removed = [p.id for p in self.players if not p.is_connected]
        if removed:
            self.players = [p for p in self.players if p.is_connected]
            for pid in removed:
                self.scores.pop(pid, None)
        if self.host_player_id not in {p.id for p in self.players}:
            self.host_player_id = self.players[0].id if self.players else None

        for p in self.players:
            p.hand = []
        self.deck = []
        self.discard_pile = []
        self.current_player_index = 0
        self.direction = 1
        self.current_color = None
        self.previous_color = None
        self.draw_stack = 0
        self.uno_called = set()
        self.drawn_card_id = None
        self.challenge_available = False
        self.last_wild_draw_four_player_id = None
        self.winner = None
        self.winner_id = None
        self.placements = []
        self.finished_player_ids = set()
        self.skipped_player_id = None
        self.turn_deadline_ms = None
        self.action_log = []
        self.last_action = ""
        self.status = GameStatus.WAITING
        return {"success": True, "removed_player_ids": removed}

    # ------------------------------------------------------------------
    # Play card
    # ------------------------------------------------------------------

    def play_card(
        self,
        player_id: str,
        card_id: str,
        chosen_color: Optional[str] = None,
    ) -> dict:
        """
        Validate and apply a card play.

        Returns:
            {"success": True}  on success
            {"success": False, "error": "..."}  on failure
        """
        current = self.players[self.current_player_index]

        if current.id != player_id:
            return {"success": False, "error": "It's not your turn."}

        card = next((c for c in current.hand if c.id == card_id), None)
        if not card:
            return {"success": False, "error": "Card not found in your hand."}

        top = self.discard_pile[-1]

        # --- Validate during a draw stack ---
        # Official UNO rules (default): when facing a draw penalty you MUST
        # draw — you cannot stack another +2 or +4 on top.  Challenge a Wild
        # Draw Four via the separate challenge_wild_four() action instead.
        # With the `stack_draw_cards` house rule enabled, the penalty may be
        # passed on: +2 on +2, +4 on +2 or +4 — but never +2 on +4.
        if self.draw_stack > 0:
            if not self.settings.get("stack_draw_cards"):
                return {
                    "success": False,
                    "error": f"You must draw {self.draw_stack} cards (or challenge the +4).",
                }
            if card.card_type not in (CardType.DRAW_TWO, CardType.WILD_DRAW_FOUR):
                return {
                    "success": False,
                    "error": f"Stack another +2/+4 or draw {self.draw_stack}.",
                }
            if (
                card.card_type == CardType.DRAW_TWO
                and top.card_type == CardType.WILD_DRAW_FOUR
            ):
                return {"success": False, "error": "A +2 cannot be stacked on a +4."}
        else:
            # After drawing this turn, only the drawn card may be played
            if self.drawn_card_id and card.id != self.drawn_card_id:
                return {
                    "success": False,
                    "error": "You may only play the card you just drew, or pass.",
                }
            if not card.can_play_on(top, self.current_color):
                return {"success": False, "error": "That card cannot be played here."}

        # Wild cards require a colour selection
        if card.is_wild():
            if chosen_color not in ("red", "green", "blue", "yellow"):
                return {"success": False, "error": "Choose a valid colour (red/green/blue/yellow)."}

        # --- Commit the play ---
        current.hand.remove(card)
        self.discard_pile.append(card)
        self.drawn_card_id = None  # drawn-card tracking is cleared on any play

        # ── Placement / win condition ────────────────────────────────
        if len(current.hand) == 0:
            rank = len(self.placements) + 1
            ordinal = ["1st", "2nd", "3rd", "4th", "5th", "6th"][rank - 1]
            self.placements.append({"rank": rank, "id": current.id, "name": current.name})
            self.finished_player_ids.add(current.id)
            self.skipped_player_id = None
            self._log(f"🎉 {current.name} finishes in {ordinal} place!")

            # Round points are snapshotted the moment the first player goes
            # out — continuation play for 2nd/3rd place can't distort them.
            if rank == 1:
                self._award_round_points(current.id)

            # Count remaining active players
            active = [p for p in self.players if p.id not in self.finished_player_ids]

            if len(active) <= 1:
                # Game over — last standing player gets last place
                if active:
                    last_rank = len(self.placements) + 1
                    self.placements.append(
                        {"rank": last_rank, "id": active[0].id, "name": active[0].name}
                    )
                    self.finished_player_ids.add(active[0].id)
                self.status = GameStatus.FINISHED
                self.winner = self.placements[0]["name"]
                self.winner_id = self.placements[0]["id"]
                self._log(f"🏆 Game over! {self.winner} takes the crown!")
                return {"success": True, "game_over": True}

            # Game continues — advance to next active player
            self._advance_turn()
            self._auto_skip_offline()
            return {"success": True}

        # If player played down to 1 card, remove them from uno_called
        # (they must call UNO themselves each time)
        if current.id in self.uno_called and len(current.hand) != 1:
            self.uno_called.discard(current.id)

        self._apply_card_effects(card, current, chosen_color)
        self._auto_skip_offline()
        return {"success": True}

    def _apply_card_effects(
        self, card: Card, player: Player, chosen_color: Optional[str]
    ) -> None:
        name = player.name

        if card.card_type == CardType.NUMBER:
            self.current_color = card.color
            self.skipped_player_id = None
            self._advance_turn()
            self._log(f"{name} played {card.display_name()}.")

        elif card.card_type == CardType.SKIP:
            self.current_color = card.color
            skipped = self.players[self._next_index()]
            self.skipped_player_id = skipped.id
            self._advance_turn()   # land on the skipped player
            self._advance_turn()   # skip past them
            self._log(f"{name} played Skip — {skipped.name} is skipped!")

        elif card.card_type == CardType.REVERSE:
            self.current_color = card.color
            self.skipped_player_id = None
            self.direction *= -1
            if len(self.players) == 2:
                # Reverse acts as Skip in a 2-player game
                self._log(f"{name} played Reverse — {name} plays again!")
            else:
                self._advance_turn()
                self._log(f"{name} played Reverse — direction changed!")

        elif card.card_type == CardType.DRAW_TWO:
            self.current_color = card.color
            self.skipped_player_id = None
            self.draw_stack += 2
            next_player = self.players[self._next_index()]
            self._advance_turn()
            self._log(
                f"{name} played Draw Two — {next_player.name} must draw {self.draw_stack}!"
            )

        elif card.card_type == CardType.WILD:
            self.previous_color = self.current_color
            self.current_color = Color(chosen_color)
            self.skipped_player_id = None
            self.challenge_available = False
            self._advance_turn()
            self._log(f"{name} played Wild — colour changed to {chosen_color}!")

        elif card.card_type == CardType.WILD_DRAW_FOUR:
            was_stacked = self.draw_stack > 0
            self.previous_color = self.current_color
            self.current_color = Color(chosen_color)
            self.skipped_player_id = None
            self.draw_stack += 4
            # A +4 stacked onto an existing penalty cannot be challenged —
            # the challenge resolves a flat 4, not the accumulated stack.
            self.challenge_available = not was_stacked
            self.last_wild_draw_four_player_id = player.id
            next_player = self.players[self._next_index()]
            self._advance_turn()
            self._log(
                f"{name} played Wild Draw Four — {next_player.name} must draw "
                f"{self.draw_stack} (or challenge)!"
            )

    # ------------------------------------------------------------------
    # Draw card
    # ------------------------------------------------------------------

    def draw_card(self, player_id: str) -> dict:
        """
        Player draws a card (or the stacked penalty).

        Returns:
            dict with keys: success, drawn_card / drawn_cards, can_play, turn_ends
        """
        current = self.players[self.current_player_index]

        if current.id != player_id:
            return {"success": False, "error": "It's not your turn."}

        # --- Draw the full stack penalty ---
        if self.draw_stack > 0:
            amount = self.draw_stack
            drawn = self._draw_for_player(current, amount)
            self.draw_stack = 0
            self.challenge_available = False
            self._advance_turn()
            self._log(f"{current.name} drew {len(drawn)} cards.")
            self._auto_skip_offline()
            return {
                "success": True,
                "drawn_cards": [c.to_dict() for c in drawn],
                "turn_ends": True,
            }

        # --- Normal single draw ---
        if not self.deck:
            self._reshuffle()
        if not self.deck:
            # Deck is truly empty — pass turn
            self._advance_turn()
            self._auto_skip_offline()
            return {"success": True, "no_cards": True, "turn_ends": True}

        card = self.deck.pop()
        current.hand.append(card)
        # Top the pile back up immediately if that was the last card, so the
        # reported draw_pile_count never reads 0 while cards remain to recycle.
        if not self.deck:
            self._reshuffle()

        can_play = card.can_play_on(self.discard_pile[-1], self.current_color)

        if can_play:
            # Turn does NOT end yet — player may play this card or pass
            self.drawn_card_id = card.id
            self._log(f"{current.name} drew a card and may play it.")
            return {
                "success": True,
                "drawn_card": card.to_dict(),
                "can_play": True,
                "turn_ends": False,
            }
        else:
            self.drawn_card_id = None
            self._advance_turn()
            self._log(f"{current.name} drew a card (unplayable).")
            self._auto_skip_offline()
            return {
                "success": True,
                "drawn_card": card.to_dict(),
                "can_play": False,
                "turn_ends": True,
            }

    # ------------------------------------------------------------------
    # Pass turn (after drawing a playable card and choosing not to play it)
    # ------------------------------------------------------------------

    def pass_turn(self, player_id: str) -> dict:
        current = self.players[self.current_player_index]

        if current.id != player_id:
            return {"success": False, "error": "It's not your turn."}
        if not self.drawn_card_id:
            return {"success": False, "error": "Nothing to pass — you haven't drawn a card."}

        self.drawn_card_id = None
        self.skipped_player_id = None
        self._advance_turn()
        self._log(f"{current.name} passed.")
        self._auto_skip_offline()
        return {"success": True}

    # ------------------------------------------------------------------
    # Room settings & host controls
    # ------------------------------------------------------------------

    def update_settings(self, player_id: str, new: dict) -> dict:
        """Host-only, lobby-only settings update. Unknown keys are ignored."""
        if player_id != self.host_player_id:
            return {"success": False, "error": "Only the host can change settings."}
        if self.status != GameStatus.WAITING:
            return {"success": False, "error": "Settings can only be changed in the lobby."}
        if not isinstance(new, dict):
            return {"success": False, "error": "Invalid settings payload."}

        if "turn_seconds" in new:
            if new["turn_seconds"] not in (15, 30, 60):
                return {"success": False, "error": "turn_seconds must be 15, 30 or 60."}
            self.settings["turn_seconds"] = new["turn_seconds"]
        if "stack_draw_cards" in new:
            self.settings["stack_draw_cards"] = bool(new["stack_draw_cards"])
        return {"success": True}

    def kick_player(self, requester_id: str, target_id: str) -> dict:
        """
        Host removes a player. In the lobby they're removed outright;
        mid-game they're marked offline (the auto-skip machinery plays
        their turns) and pruned at the next rematch. Kicked ids cannot
        reconnect with the same player_id.
        """
        if requester_id != self.host_player_id:
            return {"success": False, "error": "Only the host can kick players."}
        if requester_id == target_id:
            return {"success": False, "error": "You cannot kick yourself."}
        target = self._find_player(target_id)
        if not target:
            return {"success": False, "error": "Player not found."}

        self.kicked_player_ids.add(target_id)

        if self.status == GameStatus.WAITING:
            self.remove_player(target_id)
            return {"success": True, "removed": True, "player_name": target.name}

        was_current = (
            self.status == GameStatus.PLAYING
            and self.players[self.current_player_index].id == target_id
        )
        self.disconnect_player(target_id)
        if was_current:
            self._auto_skip_offline()
        return {"success": True, "removed": False, "player_name": target.name}

    # ------------------------------------------------------------------
    # Turn timeout penalty
    # ------------------------------------------------------------------

    def timeout_penalty(self) -> dict:
        """Current player ran out of time: draw a penalty and lose the turn."""
        if self.status != GameStatus.PLAYING or not self.players:
            return {"success": False}
        current = self.players[self.current_player_index]
        amount = self.draw_stack if self.draw_stack > 0 else 2
        drawn = self._draw_for_player(current, amount)
        self.draw_stack = 0
        self.challenge_available = False
        self.drawn_card_id = None
        self.skipped_player_id = None
        self._log(f"⏰ {current.name} ran out of time — draws {len(drawn)} and is skipped.")
        self._advance_turn()
        self._auto_skip_offline()
        return {"success": True}

    # ------------------------------------------------------------------
    # UNO call
    # ------------------------------------------------------------------

    def call_uno(self, player_id: str) -> dict:
        player = self._find_player(player_id)
        if not player:
            return {"success": False, "error": "Player not found."}
        if len(player.hand) != 1:
            return {"success": False, "error": "UNO can only be called with exactly 1 card."}

        self.uno_called.add(player_id)
        self._log(f"{player.name} called UNO!")
        return {"success": True}

    def catch_uno_violation(self, caller_id: str, target_id: str) -> dict:
        """
        Caller accuses target of not calling UNO.
        If valid, target draws 2 cards as penalty.
        """
        target = self._find_player(target_id)
        caller = self._find_player(caller_id)
        if not target or not caller:
            return {"success": False, "error": "Player not found."}
        if len(target.hand) != 1:
            return {"success": False, "error": "Target does not have 1 card."}
        if target_id in self.uno_called:
            return {"success": False, "error": "Target already called UNO — penalty doesn't apply."}

        drawn = self._draw_for_player(target, 2)
        self._log(
            f"{caller.name} caught {target.name} without calling UNO! "
            f"{target.name} draws 2 cards."
        )
        return {"success": True, "drawn_cards": [c.to_dict() for c in drawn]}

    # ------------------------------------------------------------------
    # Wild Draw Four challenge
    # ------------------------------------------------------------------

    def challenge_wild_four(self, player_id: str) -> dict:
        """
        The current player challenges the Wild Draw Four played by the previous player.

        Logic:
          • If the challenger had NO card matching the previous colour → challenge fails
            (challenger draws 6 = 4 + 2 penalty, turn advances)
          • If the challenger had a card matching the previous colour → challenge succeeds
            (the Wild Draw Four player draws 4, challenger keeps their turn)
        """
        current = self.players[self.current_player_index]

        if current.id != player_id:
            return {"success": False, "error": "It's not your turn."}
        if not self.challenge_available:
            return {"success": False, "error": "No Wild Draw Four to challenge."}

        challenged = self._find_player(self.last_wild_draw_four_player_id)
        if not challenged:
            return {"success": False, "error": "Could not find the challenged player."}

        self.challenge_available = False

        # Did the challenged player have a legal card of the previous colour?
        had_legal = any(
            not c.is_wild() and c.color == self.previous_color
            for c in challenged.hand
        )

        if had_legal:
            # Challenge succeeds — Wild Draw Four player draws 4
            drawn = self._draw_for_player(challenged, 4)
            self.draw_stack = 0
            self._log(
                f"{current.name} challenged {challenged.name}'s Wild Draw Four — "
                f"SUCCESSFUL! {challenged.name} draws 4."
            )
            return {
                "success": True,
                "challenge_result": "success",
                "drawn_cards": [c.to_dict() for c in drawn],
            }
        else:
            # Challenge fails — challenger draws 6, turn advances
            drawn = self._draw_for_player(current, 6)
            self.draw_stack = 0
            self._advance_turn()
            self._log(
                f"{current.name} challenged {challenged.name}'s Wild Draw Four — "
                f"FAILED! {current.name} draws 6."
            )
            return {
                "success": True,
                "challenge_result": "failed",
                "drawn_cards": [c.to_dict() for c in drawn],
            }

    # ------------------------------------------------------------------
    # State serialisation
    # ------------------------------------------------------------------

    def get_state_for_player(self, player_id: str) -> dict:
        """Return a game state view personalised for the given player."""
        state: dict = {
            "room_id": self.room_id,
            "status": self.status.value,
            "current_player_id": (
                self.players[self.current_player_index].id if self.players else None
            ),
            "direction": self.direction,
            "current_color": self.current_color.value if self.current_color else None,
            "discard_top": self.discard_pile[-1].to_dict() if self.discard_pile else None,
            "draw_pile_count": len(self.deck),
            "draw_stack": self.draw_stack,
            "winner": self.winner,
            "winner_id": self.winner_id,
            "challenge_available": self.challenge_available,
            "drawn_card_id": self.drawn_card_id,
            "skipped_player_id": self.skipped_player_id,
            "turn_deadline": self.turn_deadline_ms,
            "placements": list(self.placements),
            "last_round_points": self.last_round_points,
            "rounds_played": self.rounds_played,
            "settings": dict(self.settings),
            "last_action": self.last_action,
            "action_log": self.action_log[-15:],
            "host_player_id": self.host_player_id,
            "players": [],
            "my_id": player_id,
            "my_hand": [],
            "my_index": None,
        }

        for idx, player in enumerate(self.players):
            # Look up this player's finishing rank (None if still playing)
            finished_rank = next(
                (p["rank"] for p in self.placements if p["id"] == player.id), None
            )
            state["players"].append(
                {
                    "id": player.id,
                    "name": player.name,
                    "card_count": len(player.hand),
                    "has_called_uno": player.id in self.uno_called,
                    "is_connected": player.is_connected,
                    "rank": finished_rank,   # None = still playing; 1/2/3… = placed
                    "score": self.scores.get(player.id, 0),
                }
            )
            if player.id == player_id:
                state["my_hand"] = [c.to_dict() for c in player.hand]
                state["my_index"] = idx

        return state

    def get_room_state(self) -> dict:
        """Lobby state (before the game begins)."""
        return {
            "room_id": self.room_id,
            "status": self.status.value,
            "host_player_id": self.host_player_id,
            "can_start": 2 <= len(self.players) <= 7,
            "settings": dict(self.settings),
            "rounds_played": self.rounds_played,
            "players": [
                {
                    "id": p.id,
                    "name": p.name,
                    "is_connected": p.is_connected,
                    "score": self.scores.get(p.id, 0),
                }
                for p in self.players
            ],
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _find_player(self, player_id: Optional[str]) -> Optional[Player]:
        if not player_id:
            return None
        return next((p for p in self.players if p.id == player_id), None)

    def _award_round_points(self, winner_id: str) -> None:
        """
        Classic UNO scoring: the round winner collects the point value of
        every card left in opponents' hands. Awarded at most once per round.
        """
        if self.round_points_awarded:
            return
        pts = sum(
            c.points() for p in self.players if p.id != winner_id for c in p.hand
        )
        self.scores[winner_id] = self.scores.get(winner_id, 0) + pts
        self.last_round_points = pts
        self.round_points_awarded = True
        self.rounds_played += 1
        winner = self._find_player(winner_id)
        if winner:
            self._log(f"💰 {winner.name} scores {pts} points!")

    def _next_index(self) -> int:
        """Index of the next active (non-finished) player in the current direction."""
        n = len(self.players)
        idx = (self.current_player_index + self.direction) % n
        guard = n
        while guard > 0 and self.players[idx].id in self.finished_player_ids:
            idx = (idx + self.direction) % n
            guard -= 1
        return idx

    def _advance_turn(self) -> None:
        self.current_player_index = self._next_index()

    def _draw_for_player(self, player: Player, count: int) -> List[Card]:
        """Draw `count` cards for `player`, reshuffling discard if needed.

        Cards are recycled from the discard pile on the fly, so a short deck
        can always satisfy a +2/+4 penalty as long as enough cards exist in
        play. The pile is then topped back up so its count stays accurate.
        """
        drawn: List[Card] = []
        for _ in range(count):
            if not self.deck:
                self._reshuffle()
            if self.deck:
                card = self.deck.pop()
                player.hand.append(card)
                drawn.append(card)
        if not self.deck:
            self._reshuffle()
        return drawn

    def _reshuffle(self) -> None:
        """Recycle all discard pile cards (except the top) back into the deck."""
        if len(self.discard_pile) <= 1:
            return
        top = self.discard_pile.pop()
        self.deck = self.discard_pile[:]
        random.shuffle(self.deck)
        self.discard_pile = [top]

    def _auto_skip_offline(self) -> bool:
        """
        If the current player is offline, automatically handle their turn
        so the game never stalls.

        • Pending draw stack  → cards are drawn for them; turn advances.
        • Normal turn         → one card drawn (as if they passed); turn advances.

        Special case: if only ONE player remains online and all others are
        offline, that player wins by default (last person standing).

        Repeats until the current player is online, or until every player has
        been visited once (safety guard for all-offline edge case).

        Returns True if at least one player was skipped (caller should
        re-broadcast the game state).
        """
        if self.status != GameStatus.PLAYING:
            return False

        # Only consider active (non-finished) players
        active_players   = [p for p in self.players if p.id not in self.finished_player_ids]
        online_active    = [p for p in active_players if p.is_connected]

        if not online_active:
            return False  # all active players offline — don't loop forever

        # If only 1 active player remains (regardless of connection), end game
        if len(active_players) <= 1:
            if active_players:
                last_rank = len(self.placements) + 1
                last = active_players[0]
                self.placements.append({"rank": last_rank, "id": last.id, "name": last.name})
                self.finished_player_ids.add(last.id)
            self.status    = GameStatus.FINISHED
            self.winner    = self.placements[0]["name"]
            self.winner_id = self.placements[0]["id"]
            self._award_round_points(self.winner_id)
            self._log(f"🏆 Game over! {self.winner} takes the crown!")
            return True

        # Last online active player wins (others are all offline)
        if len(online_active) == 1 and len(active_players) > 1:
            winner = online_active[0]
            rank = len(self.placements) + 1
            self.placements.append({"rank": rank, "id": winner.id, "name": winner.name})
            self.finished_player_ids.add(winner.id)
            # Remaining offline players get subsequent ranks
            for p in active_players:
                if p.id not in self.finished_player_ids:
                    r = len(self.placements) + 1
                    self.placements.append({"rank": r, "id": p.id, "name": p.name})
                    self.finished_player_ids.add(p.id)
            self.status    = GameStatus.FINISHED
            self.winner    = self.placements[0]["name"]
            self.winner_id = self.placements[0]["id"]
            self._award_round_points(self.winner_id)
            self._log(f"🏆 {winner.name} wins — all other active players disconnected!")
            return True

        # Skip the current player if they are offline
        skipped = False
        guard   = len(active_players)  # max iterations = number of active players

        while guard > 0:
            current = self.players[self.current_player_index]
            # Sanity: skip if this player has already finished (shouldn't happen)
            if current.id in self.finished_player_ids:
                self._advance_turn()
                guard -= 1
                continue
            if current.is_connected:
                break

            if self.draw_stack > 0:
                drawn = self._draw_for_player(current, self.draw_stack)
                self._log(
                    f"⏭ {current.name} is offline — auto-drew {len(drawn)} "
                    f"card{'s' if len(drawn) != 1 else ''} and lost their turn."
                )
                self.draw_stack          = 0
                self.challenge_available = False
            else:
                self._draw_for_player(current, 1)
                self._log(f"⏭ {current.name} is offline — turn skipped.")

            self.drawn_card_id = None
            self._advance_turn()
            skipped = True
            guard  -= 1

        return skipped

    def _log(self, message: str) -> None:
        self.last_action = message
        self.action_log.append(message)
        # Keep log bounded
        if len(self.action_log) > 100:
            self.action_log = self.action_log[-100:]
