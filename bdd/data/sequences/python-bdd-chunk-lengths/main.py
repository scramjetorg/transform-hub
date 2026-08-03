async def main(context, input_stream, *args):
    """
    Count characters per line for text input, or total bytes for binary input.

    For text input (str chunks), each chunk is a line including trailing newline.
    Output comma-terminated character counts per line.
    For binary input (bytes chunks), output comma-terminated total byte count.
    """
    total_bytes = 0
    text_counts = []

    async for chunk in input_stream:
        if isinstance(chunk, bytes):
            total_bytes += len(chunk)
        else:
            text_counts.append(f"{len(chunk)},")

    if total_bytes > 0:
        yield f"{total_bytes},"
    else:
        for count in text_counts:
            yield count
