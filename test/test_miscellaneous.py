from datastream import DataStream
import pytest

async def read_as_binary_and_decode(size, expected):
    with open('sample_multibyte_text.txt', 'rb') as file:
        bytes = await DataStream.read_from(file, chunk_size=size).to_list()

        # ensure that we really have characters split across chunks
        with pytest.raises(UnicodeDecodeError):
            for chunk in bytes:
                chunk.decode("UTF-8")

        result = await DataStream.read_from(bytes).decode("UTF-8").to_list()
        assert result == expected

@pytest.mark.asyncio
async def test_decoding_characters_split_across_chunks():
    await read_as_binary_and_decode(3, ['ż', 'ół', 'ć'])

@pytest.mark.asyncio
async def test_decoding_chunks_with_():
    # with chunk_size == 1 some incoming chunks will contain only partial
    # data, yielding empty strings. Ensure these are dropped.
    await read_as_binary_and_decode(1, ['ż', 'ó', 'ł', 'ć'])
