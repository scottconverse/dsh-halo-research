import unittest

loader = unittest.TestLoader()
suite = unittest.TestSuite()
for name in ('test_visible', 'test_fix'):
    suite.addTests(loader.discover('.', pattern=name + '.py'))
runner = unittest.TextTestRunner(verbosity=2)
result = runner.run(suite)
raise SystemExit(0 if result.wasSuccessful() else 1)
