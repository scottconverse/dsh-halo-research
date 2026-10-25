def latest_by_id(rows):
    last = {}
    for i, row in enumerate(rows):
        last[row["id"]] = i
    return [row for i, row in enumerate(rows) if last[row["id"]] == i]
