import pytest
from inet import TCPSegment, IPPacket, EthernetFrame, USE_BIGENDIAN, USE_LITTLENDIAN

class TestIP:
    def test_mf_df_flags(self):

        USE_BIGENDIAN()

        data = b'E\x00\x00\x14\x00\x01`\x00@\x00\x1c\xe7\x7f\x00\x00\x01\x7f\x00\x00\x01'
        pkt = IPPacket.from_buffer(data)
        assert pkt.flags == (IPPacket.Flags.MF | IPPacket.Flags.DF) & ~IPPacket.Flags.RF
        assert pkt.is_flag('MF') == True
        assert pkt.is_flag('DF') == True
        assert pkt.is_flag('RF') == False

    def test_mf_flags(self):

        USE_BIGENDIAN()

        data = b'E\x00\x00\x14\x00\x01 \x00@\x00\\\xe7\x7f\x00\x00\x01\x7f\x00\x00\x01'
        pkt = IPPacket.from_buffer(data)
        assert pkt.flags == IPPacket.Flags.MF & ~IPPacket.Flags.RF
        assert pkt.is_flag('MF') == True
        assert pkt.is_flag('DF') == False
        assert pkt.is_flag('RF') == False

    def test_df_flags(self):

        USE_BIGENDIAN()

        data = (b'\x00\x23\x20\xd4\x2a\x8c\x00\x23\x20\xd4\x2a\x8c\x08\x00\x45\x00\x00\x54\x00\x00\x40\x00'
            b'\x40\x01\x25\x8d\x0a\x00\x00\x8f\x0a\x00\x00\x8e\x08\x00\x2e\xa0\x01\xff\x23\x73\x20\x48'
            b'\x4a\x4d\x00\x00\x00\x00\x78\x85\x02\x00\x00\x00\x00\x00\x10\x11\x12\x13\x14\x15\x16\x17'
            b'\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f\x20\x21\x22\x23\x24\x25\x26\x27\x28\x29\x2a\x2b\x2c\x2d'
            b'\x2e\x2f\x30\x31\x32\x33\x34\x35\x36\x37')

        pkt = EthernetFrame.from_buffer(data).get_packet()

        assert pkt.flags == IPPacket.Flags.DF
        assert pkt.flags == (IPPacket.Flags.DF & (~IPPacket.Flags.MF & ~IPPacket.Flags.RF))

        assert pkt.is_flag('DF') == True
        assert pkt.is_flag('MF') == False
        assert pkt.is_flag('RF') == False

        assert pkt.offset == 0

    def test_checksum_calc(self):

        USE_BIGENDIAN()

        data = b'E\x00\x00\x14\x00\x01\x00\x00@\x00j\xd6\x01\x02\x03\x04\x05\x06\x07\x08'
        checksum = 27350
        pkt = IPPacket.from_buffer(data)
        pkt.checksum = 0

        assert pkt.checksum == 0

        pkt.build()

        assert pkt.checksum == checksum

    def test_packet_creation(self):

        USE_BIGENDIAN()

        pkt = IPPacket(src_addr='172.25.44.3', dst_addr='172.25.44.254',
                       segment=TCPSegment(dst_port=3, flags=['ACK']))

        assert pkt.src_addr == '172.25.44.3'
        assert pkt.dst_addr == '172.25.44.254'


    def test_pseudoheader(self):
        
        USE_LITTLENDIAN()

        data = bytes([10, 0, 0, 1, 10, 0, 0, 2, 0, 1, 32, 0, 0, 0, 0, 0, 249, 252, 104, 127, 0, 0, 0, 0, 0, 8, 0, 0, 149, 136, 0, 0])
        res = IPPacket.from_buffer_with_pseudoheader(data)

        assert res.src_addr == '10.0.0.1'
        assert res.dst_addr == '10.0.0.2'
        assert res.len == 32
        assert res.protocol == 1

        assert res.segment.seq == 2137586937
        assert res.segment.ack == 0 


        psh = res.build_pseudoheader()

        assert psh == data[0:12]

class TestTCP:
    def test_tcp_offset(self):

        USE_BIGENDIAN()

        data = b'\x01\xbb\xc0\xd7\xb6\x56\xa8\xb9\xd1\xac\xaa\xb1\x50\x18\x40\x00\x56\xf8\x00\x00'
        segment = TCPSegment.from_buffer(data)
        assert segment.offset == 5

    def test_prepare_segment_with_flags(self):

        USE_BIGENDIAN()

        segment = TCPSegment(flags=['FIN', 'SYN', 'ACK'])

        assert segment.is_flag('FIN') == True
        assert segment.is_flag('SYN') == True
        assert segment.is_flag('ACK') == True
        assert segment.is_flag('PSH') == False

        segment = TCPSegment(flags=['SYN', 'PSH'])

        assert segment.is_flag('FIN') == False
        assert segment.is_flag('SYN') == True
        assert segment.is_flag('ACK') == False
        assert segment.is_flag('PSH') == True

        segment = TCPSegment().set_flags(['FIN', 'SYN', 'ACK'])

        assert segment.is_flag('FIN') == True
        assert segment.is_flag('SYN') == True
        assert segment.is_flag('ACK') == True
        assert segment.is_flag('PSH') == False

        segment = TCPSegment().set_flags(['SYN', 'PSH'])

        assert segment.is_flag('FIN') == False
        assert segment.is_flag('SYN') == True
        assert segment.is_flag('ACK') == False
        assert segment.is_flag('PSH') == True

    def test_basic_details(self):
        
        USE_BIGENDIAN()

        data = b'E\x00\x00(\x00\x01@\x00@\x06,\xbe\x01\x02\x03\x04\x04\x05\x06\x07\x00\x14\x00P\x00\x00\x00\x00\x00\x00\x00\x00P\x02 \x00\x81m\x00\x00'
        pkt = IPPacket.from_buffer(data)
        assert pkt.segment.dst_port == 80
        assert pkt.segment.flags & TCPSegment.Flags.SYN
        assert pkt.segment.is_flag('SYN') == True
        assert pkt.segment.is_flag('PSH') == False

    def test_checksum(self):
        
        USE_BIGENDIAN()

        data = b'E\x00\x00(\x00\x01@\x00@\x06,\xbe\x01\x02\x03\x04\x04\x05\x06\x07\x00\x14\x00P\x00\x00\x00\x00\x00\x00\x00\x00P\x02 \x00\x81m\x00\x00'
        pkt = IPPacket.from_buffer(data)
        assert pkt.segment.checksum == 33133

    def test_checksum_calc(self):
        
        USE_BIGENDIAN()

        data = b'E\x00\x00*\x00\x01\x00\x00@\x06N\x9d\n\x0b\x0c\x0e\n\x0b\x0c\r\x00\x14\x00P\x00\x00\x00\x00\x00\x00\x00\x00P\x02 \x00\x00\x00\x00\x00Hi'
        pkt = IPPacket.from_buffer(data)

        assert pkt.segment.checksum == 0

        pkt = IPPacket.from_buffer(data).build()

        assert pkt.segment.checksum == 6883

    def test_unpack(self):
        
        USE_BIGENDIAN()

        data = (b'\x00\x50\x0d\x2c\x11\x4c\x61\x8b\x38\xaf\xfe\x14\x70\x12\x16\xd0'
                b'\x5b\xdc\x00\x00\x02\x04\x05\x64\x01\x01\x04\x02')
        pkt = TCPSegment.from_buffer(data)
        assert pkt.flags == (TCPSegment.Flags.SYN | TCPSegment.Flags.ACK)
        assert pkt.offset == 7
        assert pkt.win == 5840
        assert pkt.dst_port == 3372
        assert pkt.seq == 290218379
        assert pkt.ack == 951057940

    def test_parse_only_first_packet(self):
        
            
        USE_BIGENDIAN()

        data = (b"\x05\x00\x005\x00\x00\x00\x00\xff\x06\xfb\xc3\x00\x00\x00\x00\x00"
                b"\x00\x00\x00\x00\x00\x00\x03\x00\x00\x00\x00\x00\x00\x00\x00\x00"
                b"\x00\x00\x00#g\x00\x00{'foo':'bar'}\x05\x00\x006\x00\x00\x00\x00"
                b"\xff\x06\xfb\xc2\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x05"
                b"\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00x\xdc\x00"
                b"\x00{'bar':'foo2'}")

        pkt = IPPacket.from_buffer(data)

        assert pkt.len == 53
        assert pkt.get_segment().data == b"{'foo':'bar'}"
