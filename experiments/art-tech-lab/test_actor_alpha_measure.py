import unittest

import numpy as np

from actor_alpha_measure import assess, infer_alpha


class ActorAlphaMeasureTest(unittest.TestCase):
    def setUp(self):
        self.approved = np.zeros((16, 16), dtype=np.uint8)
        self.approved[2:14, 2:14] = 255
        self.approved[9:12, 9:12] = 0  # Intentional negative space between limbs.

    def test_regression_detects_transparency_inside_the_body(self):
        rendered = self.approved.copy()
        rendered[5, 5] = 0
        rendered[6, 6] = 170
        result = assess(rendered, self.approved)
        self.assertEqual(result["status"], "fail")
        self.assertEqual(result["leakingPixels"], 2)
        self.assertEqual(result["fullyOpenPixels"], 1)
        self.assertEqual(result["unexpectedPaintPixels"], 0)

    def test_regression_rejects_a_rectangular_patch_over_intentional_transparency(self):
        rendered = self.approved.copy()
        rendered[9:12, 9:12] = 255
        result = assess(rendered, self.approved)
        self.assertEqual(result["status"], "fail")
        self.assertEqual(result["leakingPixels"], 0)
        self.assertEqual(result["unexpectedPaintPixels"], 1)

    def test_approved_outline_and_negative_space_pass(self):
        self.assertEqual(assess(self.approved, self.approved)["status"], "pass")

    def test_independent_background_pair_recovers_alpha(self):
        source = self.approved.copy()
        source[5, 5] = 127
        foreground = np.array([186, 80, 34])
        green = np.array([32, 248, 77])

        def render(background):
            alpha = source[:, :, None] / 255
            return np.rint(foreground * alpha + background * (1 - alpha)).astype(np.int16)

        black, white, contrast = [render(background) for background in [0, 255, green]]
        np.testing.assert_array_equal(infer_alpha(black, white, contrast, green), source)
        contrast[5, 5] = 255
        with self.assertRaisesRegex(ValueError, "Third background"):
            infer_alpha(black, white, contrast, green)


if __name__ == "__main__":
    unittest.main()
