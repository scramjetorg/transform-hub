async def main(context, input_stream, *args):
    def on_test_event(message):
        context.emit("test-response", f"reply to {message}")

    context.on("test-event", on_test_event)
    await __import__("asyncio").Event().wait()
