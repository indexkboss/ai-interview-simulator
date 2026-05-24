def compute_audio_stress(features, filler_data):

    filler_score = min(filler_data["filler_ratio"] * 5, 1)

    # stress often increases pitch instability
    variation_score = min(features["pitch_variation"] / 80, 1)

    # low energy can indicate fear/stress
    energy_score = 1 - min(features["energy"] * 20, 1)

    stress = (
        0.4 * filler_score +
        0.4 * variation_score +
        0.2 * energy_score
    )

    return round(min(max(stress, 0), 1), 3)