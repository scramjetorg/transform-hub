from scramjet.streams import Stream, StringStream
import asyncio

# color codes for pretty output
grey="\033[37m"
strong="\033[97;1m"
reset="\033[0m"



# Simple stream transforming a list of dollar amounts
async def simple_stream_example():
    data = ['$8', '$25', '$3', '$14', '$20', '$9', '$13', '$16']
    print("Input:", data, '\n')
    result = await (
        Stream
            .read_from(data)
            .each(lambda x: print("Echo (in):", repr(x)))
            .map(lambda s: int(s[1:]))
            .filter(lambda x: x % 2 == 0)
            .map(lambda x: x/2)
            .map(lambda x: "$" + str(x))
            .each(lambda x: print("Echo (out):", repr(x)))
            .to_list()
    )
    print("\nOutput:", result)  # ['$4.0', '$7.0', '$10.0', '$8.0']

print(f"\n{strong}Running simple_stream_example:{reset}")
asyncio.run(simple_stream_example())



# Asynchronous transformations are performed concurrently on multiple chunks.
import random
random.seed()

async def delayed_square(x):
    delay = round(random.uniform(0.1, 0.5), 2)
    print(f"Start processing {x}  {grey}({delay}s){reset}")
    await asyncio.sleep(delay)
    print(f"Result: {x} -> {x**2}  {grey}({delay}s){reset}")
    return x**2

async def async_stream_example():
    result = await (
        Stream
            .read_from(range(12), max_parallel=4)
            .map(delayed_square)
            .to_list()
    )
    print("\nOutput:", result)

print(f"\n{strong}Running async_stream_example:{reset}")
asyncio.run(async_stream_example())



# Chunk size can be specified. Notice how words that were split across
# the chunks are later glued together.
async def stream_from_file_example():
    path = 'test/sample_text_3.txt'
    with open(path) as file:
        print("Input:", file.read(), '\n')

    with open(path) as file:
        result = await (
            StringStream
                .read_from(file, chunk_size=32)
                .each(lambda x: print(f"Read: {repr(x)}"))
                .split()
                .to_list()
        )
        print("\nOutput:", result)

print(f"\n{strong}Running stream_from_file_example:{reset}")
asyncio.run(stream_from_file_example())
