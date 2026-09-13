import tempfile
import unittest
from pathlib import Path

from optimizer.art import find_existing_art


class FindExistingArt(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())

    def write(self, folder, name, data=b"png"):
        path = self.root / folder / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def test_finds_a_file_named_by_slug(self):
        self.write("art", "common-4.png", b"new")
        self.assertEqual(find_existing_art([self.root / "art"], "common-4"), b"new")

    def test_finds_a_legacy_file_with_an_id_prefix(self):
        self.write("skills", "01-fire-slash.png", b"old")
        self.assertEqual(find_existing_art([self.root / "skills"], "fire-slash"), b"old")

    def test_does_not_match_a_longer_name_ending_in_the_slug(self):
        self.write("skills", "25-hellfire-slash.png")
        self.assertIsNone(find_existing_art([self.root / "skills"], "fire-slash"))

    def test_earlier_folders_win_and_missing_folders_are_skipped(self):
        self.write("art", "sala.png", b"current")
        self.write("spirits", "01-sala.png", b"legacy")
        folders = [self.root / "missing", self.root / "art", self.root / "spirits"]
        self.assertEqual(find_existing_art(folders, "sala"), b"current")

    def test_nothing_found_returns_none(self):
        self.assertIsNone(find_existing_art([self.root / "art"], "rave"))


if __name__ == "__main__":
    unittest.main()
