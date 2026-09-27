"""Minimal Python sequence template with no third-party dependencies."""


async def main(context, input_stream):
    """Collect input values and return the documented template output."""
    values = []
    async for value in input_stream:
        values.append(str(value))
    return f"native-template-python: {' '.join(values)}"
