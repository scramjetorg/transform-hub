from scramjet.streams import Stream

HEADER_LENGTH = 32


class ITeCeMux: 
    sequence_number = 0 
    frames_sent = 0
    frames_keeper = 0

from enum import Enum
class FrameTarget(Enum):
    API = 0
    INPUT = 1001


BINARY_FLAGS = {
    'FIN': 0b00000001,
    'SYN': 0b00000010,
    'RST': 0b00000100,
    'PSH': 0b00001000,
    'ACK': 0b00010000,
    'URG': 0b00100000,
    'ECE': 0b01000000,
    'CWR': 0b10000000
}
print(BINARY_FLAGS)

BinaryFlags = "FIN" or "SYN" or "RST" or "PSH" or "ACK" or "URG" or "ECE" or "CWR"
print('asdadadad', BinaryFlags)

frame_flags = BINARY_FLAGS.keys()


class FrameData:
    def __init__(self, destination_port = 0, acknowledge_number = 0, flags_array: dict = BINARY_FLAGS):
        self.destination_port = destination_port
        self.acknowledge_number = acknowledge_number
        self.flags_array = flags_array

    def __setattr__(self, name, value):
        int_attr_names = ['acknowledge_number', 'destination_port']
        if name in int_attr_names and not isinstance(value, int):
            raise TypeError('destination_port must be an int')
        super().__setattr__(name, value)

class FrameEncoder(Stream):
    MAX_CHUNK_SIZE = 10 * 1024 - HEADER_LENGTH

    def __init__(self, frame: FrameTarget, tecemux: ITeCeMux):
        self.frame_target = frame
        self.tecemux = tecemux
        self.total = 0
        self.out = Stream()
    
    def get_check_sum() -> int:
        return 255

    def set_flags(self, flag: list = [], flags: bytearray = bytearray([0])):
        for f in flag:
            if hasattr(flag, f):
                flags[0] |= 1 << frame_flags.index(flag[f])
        
        return flags
    
    def set_channel(self, channel_count: int):
        self.out.write(
            self.create_frame(
                [],
                {
                    flags_array: ["PSH"],
                    destination_port: channel_count
                }
            )
        )
    
    def on_channel_end(channel_id: int):
        self.out.write(
            self.create_frame(
                [],
                {
                    flags_array: ["FIN"],
                    destination_port: channel_id
                }
            )
        )

    def create_frame(self, chunk: bytearray, frame: FrameData):
        buffer = b"".join([
            # 0: source address 0 - 3
            bytearray([10, 0, 0, 1]),

            # 32: destination address 4 - 7
            bytearray([10, 0, 0, 2]),

            # 64: zeroes (8bit), protocol (8bit), 8 - 9
            bytearray([0, 1]),

            # tcp length (16bit) 10 - 11
            bytearray(bytearray(len(chunk) + HEADER_LENGTH)),

            # 96: Source port,	destination port 12 - 15
            bytearray(bytearray([0, frame.destination_port or self.frame_target])),

            # 128: sequenceNumber(32 bit, acnowledge number) 16 - 19
            bytearray(bytearray([self.tecemux.sequence_number])),

            # 160: Acknowledgement number 20-23
            bytearray(bytearray([frame.acknowledge_number or 0])),

            # 192: data offset (4bit), reserved (4bit), 24
            bytearray([0b00000000]),

            # // 224: flags (8bit), 25
            self.set_flags(frame.flags_array, bytearray([0b00000000])),
            # window(16bit) 26 - 27, ZEROes before calculation
            bytearray(bytearray([0])),

            #  checksum(16bit) 28 - 29
            bytearray(bytearray([0])),
            # pointer (16bit) 30 - 31
            bytearray(bytearray([0])),

            # // 256: data 32 -
            bytearray(chunk)
        ])

        #TODO: calculate checksum of buffer before returning

        return buffer
    
    async def _transform(chunk, encoding, callback):
        self.total += len(chunk)

        buffer = bytearray(0)

        if len(chunk) > self.MAX_CHUNK_SIZE:
            remaining = chunk[self.MAX_CHUNK_SIZE:]
            chunk = chunk[0:self.MAX_CHUNK_SIZE]

        buffer = self.create_frame(chunk, { destination_port: self.frame_target, flags_array: ["PSH"]})

        #TODO: discuss?


tecemux = ITeCeMux()
frame_target = FrameTarget.API.value
frame_data = FrameData(destination_port=9)
frame_encoder = FrameEncoder(frame_target, tecemux) 

print(frame_data.destination_port)


# print(frame_encoder)
# print(frame_encoder.__dict__)
# print(frame_encoder.tecemux.__dict__)

# print(frame_encoder.MAX_CHUNK_SIZE)

# buffer = frame_encoder.create_frame(chunk=bytearray(0), frame_data)
buffer = frame_encoder.create_frame(bytearray(0), frame_data)
#print(buffer[0:3], bytearray([10, 0, 0, 1]))