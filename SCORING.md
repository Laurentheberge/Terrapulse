# Environment Score Formula

Every location starts at a clean baseline of **100**. Each report deducts points based on damage type (fixed penalty) × severity (multiplier).

```
deduction = type_penalty(damage_type) * severity_multiplier(severity_level)
score     = clamp(100 + deduction, 0, 100)
```

## Type penalties

| Damage type      | Penalty |
|------------------|---------|
| Illegal dumping  | -15     |
| Flooding         | -20     |
| Erosion          | -25     |
| Water pollution  | -30     |
| Deforestation    | -35     |

## Severity multipliers

| Severity | Multiplier |
|----------|------------|
| Low      | ×1.0       |
| Medium   | ×1.5       |
| High     | ×2.0       |

## Example

Deforestation (-35) at high severity (×2) → -70 → score = max(0, 100 - 70) = 30.

## Cluster scoring

For a hotspot cluster (multiple unresolved reports within ~200m), sum the deductions from all non-resolved reports before clamping to 0-100, so recurring problem areas score lower than a single isolated report of the same type.

Constants defined in `backend/app/scoring.py`.
