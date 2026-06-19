TYPE_PENALTIES = {
    "illegal_dumping": -15,
    "flooding": -20,
    "erosion": -25,
    "water_pollution": -30,
    "deforestation": -35,
}

SEVERITY_MULTIPLIERS = {
    "low": 1.0,
    "medium": 1.5,
    "high": 2.0,
}


def environment_score(
    damage_type: str,
    severity_level: str,
    cluster_deduction: float = 0.0,
) -> int:
    base_deduction = TYPE_PENALTIES.get(damage_type, 0) * SEVERITY_MULTIPLIERS.get(severity_level, 1.0)
    total_deduction = base_deduction + cluster_deduction
    return max(0, min(100, 100 + int(total_deduction)))
