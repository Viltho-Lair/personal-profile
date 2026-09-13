import unittest

from openpyxl import Workbook

from optimizer.workbook import (
    MissingHeader,
    find_cell,
    find_header_row,
    header_columns,
    number,
    rows_until_blank,
    slug,
    split_grade,
    text,
)


def sheet_with(rows, title="Data"):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = title
    for r, row in enumerate(rows, 1):
        for c, value in enumerate(row, 1):
            if value is not None:
                sheet.cell(r, c, value)
    return sheet


class FindCell(unittest.TestCase):
    def test_matches_ignoring_case_and_whitespace(self):
        sheet = sheet_with([[None, "Equip  ATK\nfactor"]])
        self.assertEqual(find_cell(sheet, "equip atk factor"), (1, 2))

    def test_missing_text_is_named_in_the_error(self):
        sheet = sheet_with([["WEAPONS"]])
        with self.assertRaisesRegex(MissingHeader, "ACCESSORIES"):
            find_cell(sheet, "ACCESSORIES")

    def test_search_can_be_limited_to_columns(self):
        sheet = sheet_with([[None, "SPIRITS"], [None, None, "SPIRITS"]])
        self.assertEqual(find_cell(sheet, "SPIRITS", min_col=3), (2, 3))


class HeaderColumns(unittest.TestCase):
    def test_maps_each_name_to_its_column(self):
        sheet = sheet_with([["TYPE", "OWNED", "MULTIPLIER"]])
        self.assertEqual(
            header_columns(sheet, 1, ["TYPE", "MULTIPLIER"]),
            {"TYPE": 1, "MULTIPLIER": 3},
        )

    def test_reports_every_missing_header(self):
        sheet = sheet_with([["TYPE"]])
        with self.assertRaisesRegex(MissingHeader, r"MULTIPLIER.*MAX LVL"):
            header_columns(sheet, 1, ["TYPE", "MULTIPLIER", "MAX LVL"])

    def test_find_header_row_returns_the_first_row_with_every_header(self):
        sheet = sheet_with([["ICON"], [None], ["ICON", "RELIC", "BONUS"]])
        self.assertEqual(
            find_header_row(sheet, ["ICON", "RELIC"]),
            (3, {"ICON": 1, "RELIC": 2}),
        )

    def test_find_header_row_names_the_headers_when_absent(self):
        sheet = sheet_with([["ICON"]])
        with self.assertRaisesRegex(MissingHeader, "RELIC"):
            find_header_row(sheet, ["ICON", "RELIC"])


class RowsUntilBlank(unittest.TestCase):
    def test_stops_at_the_first_row_without_text(self):
        sheet = sheet_with([["a"], ["b"], [None], ["c"]])
        self.assertEqual(list(rows_until_blank(sheet, 1, 1)), [1, 2])


class Values(unittest.TestCase):
    def test_split_grade(self):
        self.assertEqual(split_grade("Common 4"), ("Common", 4))
        self.assertEqual(split_grade("Immortal"), ("Immortal", None))

    def test_number_turns_whole_floats_into_ints(self):
        self.assertEqual(number(250.0), 250)
        self.assertEqual(number(0.055), 0.055)
        self.assertIsNone(number(None))

    def test_number_reads_numeric_text(self):
        self.assertEqual(number("200"), 200)
        self.assertIsNone(number("Locked"))

    def test_text_collapses_whitespace_and_blanks_become_none(self):
        self.assertEqual(text("  Steel Sword\nGrade 1 "), "Steel Sword Grade 1")
        self.assertIsNone(text("   "))

    def test_slug(self):
        self.assertEqual(slug("Hunter's Eye"), "hunter-s-eye")


if __name__ == "__main__":
    unittest.main()
