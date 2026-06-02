import asyncio


async def run(context, input_stream):
    received = asyncio.Event()
    state = {"text": ""}

    def on_echo(message):
        state["text"] = message["text"]
        context.emit("event-received", {"message": message})
        received.set()

    context.on("echo", on_echo)
    context.emit("sequence-started", {"status": "ready"})
    await received.wait()
    yield f"received:{state['text']}"
