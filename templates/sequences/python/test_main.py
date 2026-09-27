import asyncio
import unittest

from main import main


class AsyncValues:
    def __init__(self, values):
        self.values = iter(values)

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            return next(self.values)
        except StopIteration as error:
            raise StopAsyncIteration from error


class NativeTemplatePythonTest(unittest.TestCase):
    def test_produces_native_python_template_output(self):
        output = asyncio.run(main(None, AsyncValues(["hello", "world"])))
        self.assertEqual(output, "native-template-python: hello world")


if __name__ == "__main__":
    unittest.main()
