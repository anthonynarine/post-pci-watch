// # Filename: convex/simulatorModel.ts
import type { Infer } from "convex/values";

import type { activityState } from "./schema";

/**
 * The synthetic wearable's behaviour, as pure functions. No database, no scheduler: given the
 * previous state and a random source, return the next one. That keeps the physiology readable
 * on its own and keeps convex/simulator.ts about orchestration only.
 *
 * This model exists to exercise the software. It is not a validated physiological model, and
 * nothing it produces carries clinical meaning.
 */

export type ActivityState = Infer<typeof activityState>;

export type Vitals = {
  heartRate: number;
  spo2: number;
  respiratoryRate: number;
};

type Range = readonly [min: number, max: number];

type StateProfile = {
  heartRate: Range;
  spo2: Range;
  respiratoryRate: Range;
  /** Ticks a state must last before a transition is considered. */
  minDwellTicks: number;
  /** Chance per tick of leaving, once the minimum dwell has passed. */
  leaveChance: number;
  /** Where it may go next, with relative weights. Only these moves are possible. */
  next: ReadonlyArray<readonly [ActivityState, number]>;
};

// With a 5-second tick: RESTING at least 1 min, WALKING 1 min, RECOVERY 30 s, SLEEPING 2 min.
const PROFILES: Record<ActivityState, StateProfile> = {
  SLEEPING: {
    heartRate: [52, 62],
    spo2: [94, 97],
    respiratoryRate: [10, 14],
    minDwellTicks: 24,
    leaveChance: 0.08,
    next: [["RESTING", 1]],
  },
  RESTING: {
    heartRate: [62, 78],
    spo2: [95, 98],
    respiratoryRate: [12, 16],
    minDwellTicks: 12,
    leaveChance: 0.15,
    next: [
      ["WALKING", 2],
      ["SLEEPING", 1],
    ],
  },
  WALKING: {
    heartRate: [88, 110],
    spo2: [94, 97],
    respiratoryRate: [18, 24],
    minDwellTicks: 12,
    leaveChance: 0.2,
    next: [["RECOVERY", 1]],
  },
  RECOVERY: {
    heartRate: [75, 92],
    spo2: [95, 98],
    respiratoryRate: [15, 20],
    minDwellTicks: 6,
    leaveChance: 0.25,
    next: [["RESTING", 1]],
  },
};

/** How far each tick moves toward the target: gradual drift, never a jump. */
const APPROACH = 0.25;

/** Per-tick wobble, in each vital's own units. */
const JITTER: Vitals = { heartRate: 1.5, spo2: 0.4, respiratoryRate: 0.6 };

type Random = () => number;

function pickInRange([min, max]: Range, random: Random): number {
  return min + random() * (max - min);
}

function pickWeighted(
  options: ReadonlyArray<readonly [ActivityState, number]>,
  random: Random,
): ActivityState {
  const total = options.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;

  for (const [state, weight] of options) {
    roll -= weight;
    if (roll < 0) return state;
  }

  return options[options.length - 1][0];
}

/** A fresh target inside the state's ranges. Chosen once per state entry, not per tick. */
export function pickTargets(state: ActivityState, random: Random): Vitals {
  const profile = PROFILES[state];
  return {
    heartRate: pickInRange(profile.heartRate, random),
    spo2: pickInRange(profile.spo2, random),
    respiratoryRate: pickInRange(profile.respiratoryRate, random),
  };
}

/** Where a new session starts: resting, already at a resting value. */
export function initialVitals(random: Random): { state: ActivityState; vitals: Vitals } {
  return { state: "RESTING", vitals: pickTargets("RESTING", random) };
}

/** Decides whether to change state this tick. Only the moves listed in `next` can happen. */
export function nextState(
  state: ActivityState,
  ticksInState: number,
  random: Random,
): ActivityState {
  const profile = PROFILES[state];

  if (ticksInState < profile.minDwellTicks) return state;
  if (random() >= profile.leaveChance) return state;

  return pickWeighted(profile.next, random);
}

function step(current: number, target: number, jitter: number, random: Random): number {
  return current + (target - current) * APPROACH + (random() * 2 - 1) * jitter;
}

/** Moves every vital part of the way toward its target, with a small wobble. */
export function stepVitals(current: Vitals, targets: Vitals, random: Random): Vitals {
  return {
    heartRate: step(current.heartRate, targets.heartRate, JITTER.heartRate, random),
    // SpO₂ is a percentage and never exceeds 100, whatever the jitter.
    spo2: Math.min(100, step(current.spo2, targets.spo2, JITTER.spo2, random)),
    respiratoryRate: step(
      current.respiratoryRate,
      targets.respiratoryRate,
      JITTER.respiratoryRate,
      random,
    ),
  };
}

/** What a device would report: whole numbers. Internal state keeps full precision. */
export function reportedValues(vitals: Vitals): Vitals {
  return {
    heartRate: Math.round(vitals.heartRate),
    spo2: Math.round(vitals.spo2),
    respiratoryRate: Math.round(vitals.respiratoryRate),
  };
}
