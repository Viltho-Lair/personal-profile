"""Compares new extractor output with the JSON already in the repo."""

IGNORED_FIELDS = {"icon", "iconSize"}


def diff_items(old_items, new_items, key):
    old = {item[key]: item for item in old_items}
    new = {item[key]: item for item in new_items}

    changed = {}
    for name in sorted(old.keys() & new.keys(), key=str):
        fields = {
            field: (old[name].get(field), new[name].get(field))
            for field in sorted(old[name].keys() | new[name].keys())
            if field not in IGNORED_FIELDS and old[name].get(field) != new[name].get(field)
        }
        if fields:
            changed[name] = fields

    return {
        "added": sorted(new.keys() - old.keys(), key=str),
        "removed": sorted(old.keys() - new.keys(), key=str),
        "changed": changed,
    }


def format_diff(area, diff):
    lines = [
        f"{area}: {len(diff['added'])} added, {len(diff['removed'])} removed, "
        f"{len(diff['changed'])} changed"
    ]
    lines += [f"  + {name}" for name in diff["added"]]
    lines += [f"  - {name}" for name in diff["removed"]]
    for name, fields in diff["changed"].items():
        for field, (before, after) in fields.items():
            lines.append(f"  ~ {name} {field}: {before!r} -> {after!r}")
    return "\n".join(lines)
