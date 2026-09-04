// Shared Side View layout constants: lane percentages (screen space, kept
// from the previous static battlefield) mapped into world X so the fixed
// camera frames the whole field.

export const FIELD_WIDTH = 16;
export const PLAYER_LANE = 7;
export const DANGER_LANE = 22.5;

export function laneToWorldX(lane: number): number {
  return (lane / 100) * FIELD_WIDTH - FIELD_WIDTH / 2;
}
