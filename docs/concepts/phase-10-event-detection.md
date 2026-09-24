# Rules You Can Read

## Post-PCI Watch — Phase 10 Reference

The "Noteworthy events" card used to show three hardcoded fixture events from March. Phase 10
derives events from the stored measurements with explicit, versioned software rules. These are
deterministic software events — not clinical conclusions, not diagnoses, and not model output.

---

## 1. One Mechanism, Configured Twice

Every stored rule is the same comparison:

```text
the last N consecutive readings of one vital are all above / below a threshold
```

| Rule | Vital | Condition | N |
| --- | --- | --- | --- |
| `heartRateAboveThreshold` | heart rate | > 100 bpm | 3 (≈ 15 s) |
| `spo2BelowThresholdSustained` | SpO₂ | < 95 % | 12 (≈ 60 s, "sustained") |

Counting readings rather than measuring elapsed time keeps the rule deterministic: the same
readings always produce the same events, regardless of tick jitter. The thresholds are **demo
configuration** chosen so the simulator can exercise them — not clinical limits — and the
dashboard says so.

The definitions live in `convex/eventRules.ts`, stated in full. Every stored event carries
`rulesVersion` (`rules-v1`), so changing a threshold later cannot silently reinterpret events
computed under the old one.

---

## 2. Episodes, Not Alerts Per Reading

```text
reading meets the condition, no open episode, last N all qualify → open (startedAt = first of N)
reading meets the condition, episode open                        → extend (count, extreme)
reading breaks the condition, episode open                       → close (endedAt = this reading)
```

A heart rate above 100 for two minutes is one event with 24 readings, not 24 events.
`extremeValue` holds the highest value for an "above" rule and the lowest for a "below" rule.

---

## 3. Evaluated in the Writing Transaction

`evaluateRulesForReading` runs inside the mutation that inserted the reading — the simulator's
`tick` and `recordSyntheticHeartRate` — immediately after the insert. Two consequences:

- The index read of "the last N readings" already includes the new row: a Convex transaction
  reads its own writes.
- The reading and the event change it causes commit together or not at all. There is no
  moment where a reading exists and its event is missing.

Rules are not evaluated at read time, so a dashboard showing an event is showing a stored fact
with its version, not a recomputation that could differ between viewers.

---

## 4. Why the Gap Rule Is Different

"No measurements arrived recently" is the absence of writes. Rules evaluated on write can
never see it: nothing runs when nothing arrives. Storing it would need its own scheduled
checker, and scheduled functions are permitted only for the simulator loop.

So the gap is a **condition computed on the dashboard**: while the simulator reports
`running`, if the latest reading is ≥ 30 s old by this client's clock, the card shows
"Measurement gap — ongoing", labelled as computed on screen and not stored. When the simulator
is stopped, silence is expected and nothing is shown.

This is a stated limitation: a gap is visible to someone looking, and leaves no record.

---

## 5. Test Evidence

Heart-rate rule, driven deterministically by manual entries on a patient with no simulator:

```text
110, 120            → no event (2 of 3)
+130                → open; startedAt = the 110 reading; count 3; extreme 130
+140                → extended; count 4; extreme 140
+90                 → closed; endedAt = the 90 reading
+105, +106          → no new event (2 of 3)
another owner lists → Patient not found
```

The SpO₂ rule runs through the same code path with different configuration; whether the
simulator produced a qualifying run during testing is recorded in `PHASE_LOG.md`.

---

## 6. Phase 10 Mental Model

1. A rule is a stated comparison with a version, not a judgement.
2. Count readings, not seconds, and the result is deterministic.
3. One episode per continuous run; open, extend, close.
4. Evaluate in the transaction that writes the reading.
5. An absence cannot trigger a write; say so, rather than pretend it is stored.
6. Demo thresholds are configuration, never clinical limits.
