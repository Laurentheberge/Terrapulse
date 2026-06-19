from app.scoring import environment_score, TYPE_PENALTIES, SEVERITY_MULTIPLIERS


def test_baseline():
    assert environment_score("illegal_dumping", "low") == 85


def test_worst_case():
    assert environment_score("deforestation", "high") == 30


def test_all_types():
    for dmg, penalty in TYPE_PENALTIES.items():
        score = environment_score(dmg, "medium")
        assert score == max(0, min(100, 100 + int(penalty * 1.5)))


def test_all_severities():
    for sev, mult in SEVERITY_MULTIPLIERS.items():
        score = environment_score("flooding", sev)
        assert score == max(0, min(100, 100 + int(-20 * mult)))


def test_cluster_deduction():
    score = environment_score("water_pollution", "high", cluster_deduction=-30)
    assert score == max(0, min(100, 100 + int(-30 * 2.0) + (-30)))
