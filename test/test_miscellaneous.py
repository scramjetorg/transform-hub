from scramjet.datastream import DataStream, StringStream
import pytest

async def read_as_binary_and_decode(size, expected):
    with open('test/sample_multibyte_text.txt', 'rb') as file:
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

@pytest.mark.asyncio
async def test_read_from_respects_stream_class():
    stream = StringStream.read_from(['a', 'b', 'c', 'd'])
    assert type(stream) == StringStream

@pytest.mark.asyncio
async def test_changing_datastream_to_stringstream():
    s1 = DataStream.read_from(['a', 'b', 'c', 'd'])
    s2 = s1._as(StringStream)
    assert type(s2) == StringStream
    assert type(s1) == DataStream
    assert await s2.to_list() == ['a', 'b', 'c', 'd']

@pytest.mark.asyncio
async def test_mapping_stringstream_produces_stringstream():
    s1 = StringStream.read_from(['a', 'b', 'c', 'd'])
    s2 = s1.map(lambda s: s*2)
    assert type(s1) == type(s2) == StringStream
    assert await s2.to_list() == ['aa', 'bb', 'cc', 'dd']

@pytest.mark.asyncio
async def test_decoding_datastream_produces_stringstream():
    s1 = DataStream.read_from([b'foo\n', b'bar baz\n', b'qux'])
    s2 = s1.decode("UTF-8")
    assert type(s2) == StringStream
    assert await s2.to_list() == ['foo\n', 'bar baz\n', 'qux']

@pytest.mark.asyncio
async def test_converting_streams_does_not_break_pyfca():
    s1 = DataStream.read_from(['a', 'b', 'c', 'd']).map(lambda x: x*2)
    s2 = s1._as(StringStream).map(lambda x: 'foo '+x)
    assert s2._pyfca == s1._pyfca
