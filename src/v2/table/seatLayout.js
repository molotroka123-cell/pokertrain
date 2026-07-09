// seatLayout.js — IceCrown Engine 2.0: elliptical seat placement for 2–9 players.
// Pure math, no React. All coordinates are percentages (0–100) of the table container.
//
// The hero seat is ALWAYS pinned to bottom-center (x:50, y:88); remaining seats
// are distributed evenly around the rest of the ellipse. Each seat also gets a
// bet anchor (betX/betY) ~28% of the way from the seat toward the table center,
// which is where that seat's wagered chips are rendered.

// Ellipse geometry (percent coords)
const CX = 50;   // table center x
const CY = 46;   // table center y (slightly above middle — leaves room for hero cards)
const RX = 44;   // horizontal radius
const RY = 42;   // vertical radius  → hero lands at y = CY + RY = 88

const BET_FRACTION = 0.28; // how far bet chips sit from seat toward center

/**
 * computeSeats(count, heroIdx) → Array<{ x, y, betX, betY }>
 *
 * @param {number} count    number of seats (clamped to 2..9)
 * @param {number} heroIdx  index in the returned array that must be bottom-center
 * @returns array of length `count`; result[heroIdx] is always { x:50, y:88, ... }
 */
export function computeSeats(count, heroIdx = 0) {
  const n = Math.max(2, Math.min(9, Math.floor(count) || 2));
  const hero = ((Math.floor(heroIdx) % n) + n) % n;
  const seats = new Array(n);

  for (let i = 0; i < n; i++) {
    // k = how many steps this seat is from the hero going around the ellipse.
    // Hero (k=0) sits at angle 90° (bottom of the screen, since +y is down);
    // the other n-1 seats are spaced evenly over the full 360° sweep, which
    // distributes them uniformly along the remaining arc.
    const k = (i - hero + n) % n;
    const theta = Math.PI / 2 + (2 * Math.PI * k) / n;

    const x = round2(CX + RX * Math.cos(theta));
    const y = round2(CY + RY * Math.sin(theta));

    seats[i] = {
      x,
      y,
      betX: round2(x + (CX - x) * BET_FRACTION),
      betY: round2(y + (CY - y) * BET_FRACTION),
    };
  }

  return seats;
}

// Exported so TableViewV2 (and chip-flight targets) share the same center point.
export const TABLE_CENTER = { x: CX, y: CY };

function round2(v) {
  return Math.round(v * 100) / 100;
}

export default computeSeats;
