/**
 * fxTiming — shared timing constants so audio staggers and 3D card-flight
 * delays stay locked together.
 */

export const DRAW_STAGGER = 0.12      // seconds between cards in a penalty burst
export const DEAL_STEP = 0.08         // seconds between dealt cards at game start
export const FLY_DRAW_DUR = 0.55      // deck → hand flight
export const FLY_PLAY_DUR = 1.15      // hand → discard flight (with reveal pause)
