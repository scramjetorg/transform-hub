from datastream import DataStream
import pytest

@pytest.mark.asyncio
async def test_decoding_characters_split_across_chunks():
    with open('sample_multibyte_text.txt', 'rb') as file:
        bytes = await DataStream.read_from(file, chunk_size=1).to_list()

        # ensure that we really have characters split across chunks
        with pytest.raises(UnicodeDecodeError):
            for chunk in bytes:
                chunk.decode("UTF-8")

        result = await DataStream.read_from(bytes).decode("UTF-8").to_list()
        assert result == ['', 'ż', '', 'ó', '', 'ł', '', 'ć']
