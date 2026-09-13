"""Finds art already in the repo for an item the workbook has no image for."""

import re


def find_existing_art(folders, file_slug):
    """Bytes of the first file named `<slug>.<ext>` or `<id>-<slug>.<ext>`.

    Current art is named by slug; art from the earlier pipelines carries a
    numeric id prefix. Folders are searched in order and missing ones skipped.
    """
    pattern = re.compile(rf"(\d+-)?{re.escape(file_slug)}\.[A-Za-z0-9]+")
    for folder in folders:
        if folder is None or not folder.exists():
            continue
        for candidate in sorted(folder.iterdir()):
            if candidate.is_file() and pattern.fullmatch(candidate.name):
                return candidate.read_bytes()
    return None
