from scramjet.pyfca import Pyfca, DropChunk
import asyncio
from scramjet.ansi_color_codes import *
from os import environ
import scramjet.utils as utils
from collections.abc import Iterable, AsyncIterable
import re

DEBUG = 'DATASTREAM_DEBUG' in environ or 'SCRAMJET_DEBUG' in environ
tr = utils.print_trimmed

def log(stream, *args):
    if DEBUG:  # pragma: no cover
        utils.LogWithTimer.log(f"{grey}{stream.name}{reset}", *args)


class UnsupportedOperation(Exception):
    pass

class StreamAlreadyConsumed(Exception):
    pass


class Stream():
    def __init__(self, max_parallel=64, upstream=None, origin=None, name="datastream"):
        self._upstream = upstream
        self._origin = origin if origin else self
        self.name = name
        # whether we can write to the stream instance
        self._writable = True
        # whether the stream was already "used" (transformed/read from)
        self._consumed = False
        self._pyfca = upstream._pyfca if upstream else Pyfca(max_parallel)
        self._ready_to_start = asyncio.Future()
        self._sinks = []
        log(self, f'INIT stream created with pyfca {self._pyfca}')

    def __await__(self):
        raise TypeError(
            "Stream objects cannot be awaited on. To get data from a stream, "
            "use a sink method (such as .to_list()) and await on that."
        )

    async def __aiter__(self):
        self._uncork()
        while True:
            chunk = await self._pyfca.read()
            if chunk is None:
                break
            yield chunk

    def _uncork(self):
        if not self._ready_to_start.done():
            self._ready_to_start.set_result(True)
            log(self, f'{green}uncorked{reset}')
            if self._upstream:
                log(self, f'uncorking upstream: {self._upstream.name}')
                self._upstream._uncork()

    def _mark_consumed(self):
        if self._consumed:  # cannot consume the same stream twice
            raise StreamAlreadyConsumed
        else:
            self._consumed = True

    def _as(self, target_class):
        """Create a stream of type target_class from current one."""
        return target_class(
            upstream=self,
            max_parallel=self._pyfca.max_parallel,
            name=f'{self.name}+_'
        )

    def use(self, func):
        """Perform a function on the whole stream and return the result."""
        return func(self)

    def write(self, chunk):
        """Write a single item to the datastream."""
        return self._origin._pyfca.write(chunk)

    def end(self):
        """Mark the end of input to the datastream."""
        self._pyfca.end()

    async def read(self):
        """Read a single item from the datastream."""
        # cannot read from stream consumed by something else
        if self._consumed:
            raise StreamAlreadyConsumed
        self._uncork()
        return await self._pyfca.read()


    @classmethod
    def read_from(cls, source, max_parallel=64, chunk_size=None):
        """
        Create a new stream from specified source, which must be either
        an Iterable or implement .read() method.
        """
        if chunk_size:
            if hasattr(source, 'read'):
                return cls.from_callback(
                    max_parallel, source.read, chunk_size)
            else:
                msg = (f"chunk_size was specified, but source {source} "
                        "does not implement read() method.")
                raise UnsupportedOperation(msg)
        else:
            if isinstance(source, (Iterable, AsyncIterable)):
                return cls.from_iterable(
                    source, max_parallel=max_parallel)
            else:
                msg = (f"Source {source} is not iterable. It cannot be used "
                       "unless it exposes read() method and chunk_size "
                       "is specified.")
                raise UnsupportedOperation(msg)


    @classmethod
    def from_iterable(cls, iterable, max_parallel=64):
        """Create a new stream from an iterable object."""
        stream = cls(max_parallel)
        async def consume():
            await stream._ready_to_start
            if isinstance(iterable, Iterable):
                for item in iterable:
                    await stream._pyfca.write(item)
            elif isinstance(iterable, AsyncIterable):
                async for item in iterable:
                    await stream._pyfca.write(item)
            stream._pyfca.end()

        asyncio.create_task(consume())
        stream._writable = False
        return stream


    @classmethod
    def from_callback(cls, max_parallel, callback, *args):
        """Create a new stream using callback to get chunks."""
        stream = cls(max_parallel)

        async def consume():
            await stream._ready_to_start
            while True:
                chunk = callback(*args)
                if asyncio.iscoroutine(chunk):
                    chunk = await chunk
                if chunk == '' or chunk == b'':
                    break
                await stream._pyfca.write(chunk)
            stream._pyfca.end()

        asyncio.create_task(consume())
        stream._writable = False
        return stream


    def map(self, func, *args):
        """Transform each chunk using a function."""
        self._mark_consumed()
        new_stream = self.__class__(upstream=self, origin=self._origin, name=f'{self.name}+m')
        async def run_mapper(chunk):
            if args:
                log(new_stream, f'calling mapper {func} with args: {chunk, *args}')
            result = func(chunk, *args)
            if asyncio.iscoroutine(result):
                result = await result
            log(new_stream, f'mapper result: {tr(chunk)} -> {tr(result)}')
            return result
        log(new_stream, f'adding mapper: {func}')
        new_stream._pyfca.add_transform(run_mapper)
        return new_stream


    def each(self, func, *args):
        """Perform an operation on each chunk and return it unchanged."""
        async def mapper(chunk):
            result = func(chunk, *args)
            if asyncio.iscoroutine(result):
                await result
            return chunk
        return self.map(mapper)


    def decode(self, encoding):
        """Convert chunks of bytes into strings using specified encoding."""
        import codecs
        # Incremental decoders handle characters split across inputs.
        # Input with only partial data yields empty string - drop these.
        decoder = codecs.getincrementaldecoder(encoding)()
        return self._as(StringStream).map(
            lambda chunk: decoder.decode(chunk) or DropChunk
        )


    def filter(self, func, *args):
        """Keep only chunks for which func evaluates to True."""
        self._mark_consumed()
        new_stream = self.__class__(upstream=self, origin=self._origin, name=f'{self.name}+f')
        async def run_filter(chunk):
            if args:
                log(new_stream, f'calling filter {func} with args: {chunk, *args}')
            decision = func(chunk, *args)
            if asyncio.iscoroutine(decision):
                decision = await decision
            log(new_stream, f'filter result: {tr(chunk)} -> {cyan}{decision}{reset}')
            return chunk if decision else DropChunk
        log(new_stream, f'adding filter: {func}')
        new_stream._pyfca.add_transform(run_filter)
        return new_stream


    def flatmap(self, func, *args):
        """Run func on each chunk and return all results as separate chunks."""
        self._mark_consumed()
        new_stream = self.__class__(
            max_parallel=self._pyfca.max_parallel, origin=self._origin, name=f'{self.name}+fm'
        )
        async def consume():
            self._uncork()
            while True:
                chunk = await self._pyfca.read()
                log(self, f'got: {tr(chunk)}')
                if chunk is None:
                    break
                results = func(chunk, *args)
                if asyncio.iscoroutine(results):
                    results = await results
                log(self, f'{cyan}split:{reset} -> {repr(results)}')
                for item in results:
                    log(new_stream, f'put: {tr(item)}')
                    await new_stream._pyfca.write(item)
                    log(new_stream, f'{blue}drained{reset}')
            log(new_stream, f'ending pyfca {new_stream._pyfca}')
            new_stream._pyfca.end()
        asyncio.create_task(consume(), name='flatmap-consumer')
        return new_stream


    def batch(self, func, *args):
        """
        Convert a stream of chunks into a stream of lists of chunks.

        func: called on each chunk to determine when the batch will end.
        """
        self._mark_consumed()
        new_stream = self.__class__(
            max_parallel=self._pyfca.max_parallel, origin=self._origin, name=f'{self.name}+b'
        )
        async def consume():
            self._uncork()
            batch = []

            while True:
                chunk = await self._pyfca.read()
                log(self, f'got: {tr(chunk)}')
                if chunk is None:
                    break
                batch.append(chunk)
                if args:
                    log(new_stream, f'calling {func} with args: {chunk, *args}')
                if func(chunk, *args):
                    log(new_stream, f'{pink}put batch:{reset} {tr(batch)}')
                    await new_stream._pyfca.write(batch)
                    batch = []

            if len(batch):
                log(new_stream, f'{pink}put batch:{reset} {tr(batch)}')
                await new_stream._pyfca.write(batch)

            log(new_stream, f'ending pyfca {new_stream._pyfca}')
            new_stream._pyfca.end()
        asyncio.create_task(consume())
        return new_stream


    def sequence(self, sequencer, initialPartial=None):
        """
        Change how the data is chopped into chunks.

        sequencer: two-argument function taking partial result from previous
        operation and current chunk. It should return an iterable; all items
        from the iterable except the last one will become new chunks, and the
        last one will be fed to the next call of the sequencer.
        """
        self._mark_consumed()
        new_stream = self.__class__(
            max_parallel=self._pyfca.max_parallel, origin=self._origin, name=f'{self.name}+s'
        )
        async def consume():
            self._uncork()
            partial = initialPartial

            while True:
                chunk = await self._pyfca.read()
                log(self, f'got: {tr(chunk)}')
                if chunk is None:
                    break
                chunks = sequencer(partial, chunk)
                if asyncio.iscoroutine(chunks):
                    chunks = await chunks
                log(new_stream, f'{blue}{len(chunks)} chunks:{reset} {chunks}')
                for chunk in chunks[:-1]:
                    log(new_stream, f'put: {tr(chunk)}')
                    await new_stream._pyfca.write(chunk)
                log(new_stream, f'carrying over partial result: {tr(chunks[-1])}')
                partial = chunks[-1]

            log(new_stream, f'leftover: {tr(partial)}')
            if partial:
                log(new_stream, f'put: {tr(partial)}')
                await new_stream._pyfca.write(partial)
            log(new_stream, f'ending pyfca {new_stream._pyfca}')
            new_stream._pyfca.end()
        asyncio.create_task(consume())
        return new_stream


    def pipe(self, target):
        """Forward all chunks from current stream into target."""
        self._consumed = True
        self._sinks.append(target)
        async def consume():
            self._uncork()
            while True:
                chunk = await self._pyfca.read()
                if chunk is None:
                    break
                drains = [target._pyfca.write(chunk) for target in self._sinks]
                await asyncio.gather(*drains)
            for target in self._sinks:
                target._pyfca.end()
        if len(self._sinks) == 1:
            asyncio.create_task(consume(), name='pipe-consumer')
        return target


    async def to_list(self):
        """Create a list with all resulting stream chunks."""
        self._mark_consumed()
        self._uncork()
        result = []
        log(self, f'sink: {repr(result)}')
        chunk = await self._pyfca.read()
        while chunk is not None:
            log(self, f'got: {tr(chunk)}')
            result.append(chunk)
            chunk = await self._pyfca.read()
        return result


    async def write_to(self, target):
        """
        Write all resulting stream chunks into target.

        target: object implementing .write() method
        """
        self._mark_consumed()
        self._uncork()
        log(self, f'sink: {repr(target)}')
        chunk = await self._pyfca.read()
        while chunk is not None:
            log(self, f'got: {tr(chunk)}')
            write = target.write(chunk)
            if asyncio.iscoroutine(write):
                await write
            chunk = await self._pyfca.read()
        return target


    async def reduce(self, func, initial=None):
        """
        Apply two-argument func to elements from the stream cumulatively,
        producing an awaitable that will resolve to a single value when the
        stream ends. For a stream of [1,2,3,4] the result will be
        func(func(func(1,2),3),4).
        """
        self._mark_consumed()
        self._uncork()
        if initial is None:
            accumulator = await self._pyfca.read()
            log(self, f'got: {tr(accumulator)}')
        else:
            accumulator = initial
            log(self, f'reducer: initialized accumulator with {initial}')
        while True:
            chunk = await self._pyfca.read()
            log(self, f'got: {tr(chunk)}')
            if chunk is None:
                break
            accumulator = func(accumulator, chunk)
            if asyncio.iscoroutine(accumulator):
                accumulator = await accumulator
            log(self, f'reduce - intermediate result: {accumulator}')
        return accumulator



class StringStream(Stream):
    def __init__(self, max_parallel=64, upstream=None, origin=None, name="stringstream"):
        super().__init__(max_parallel=max_parallel, upstream=upstream, origin=origin, name=name)

    def parse(self, func, *args):
        """Transform StringStream into Stream."""
        return self._as(Stream).map(func, *args)

    def match(self, pattern):
        """Extract matching parts of chunk as new chunks."""
        regex = re.compile(pattern)
        def mapper(chunk):
            matches = regex.findall(chunk)
            if regex.groups <= 1:
                return matches
            else:
                flattened = []
                for tuple in matches:
                    flattened.extend(tuple)
                return flattened

        return self.flatmap(mapper)

    def split(self, separator=None):
        """Split each chunk into multiple new chunks."""
        def splitter(part, chunk):
            words = (part+chunk).split(sep=separator)
            # .split() without delimiter ignores trailing whitespace, e.g.
            # "foo bar ".split() -> ["foo", "bar"] and not ["foo", "bar", ""].
            # This would incorrectly treat last word as partial result, so we
            # add an empty string as a sentinel.
            if not separator and chunk[-1].isspace():
                words.append("")
            return words
        return self.sequence(splitter, "")
