def latest_by_id(rows):
    last = {}
    for i, row in enumerate(rows):
        last[row["id"]] = (i, row)
    return [row for _, row in sorted(last.values(), key=lambda item: item[0])]
