import asyncio

class RunnerClock:
    def __init__(self, delay):
        self.delay = delay
        self.timer_task = None

    async def _timer(self, function):
        await asyncio.sleep(self.delay)
        await function()

    def start(self, function):
        if self.timer_task:
            self.timer_task.cancel()
        self.timer_task = asyncio.create_task(self._timer(function))

    def reset(self, function):
        self.start(function)
