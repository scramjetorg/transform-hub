import array
import struct
from binascii import hexlify, unhexlify
from socket import inet_ntoa, inet_aton
from attrs import define,field

ENDIANESS = '<'

def USE_BIGENDIAN():
    global ENDIANESS
    ENDIANESS = '>'

def USE_LITTLENDIAN():
    global ENDIANESS
    ENDIANESS = '<'

@define
class TCPSegment:
    class Options:
        EOL = 0
        NOP = 1
        MSS = 2
        WSOPT= 3
        SACKPERM = 4
        SACK = 5
        TSOPT = 8

        @staticmethod
        def parse_options(val):
            return val
        
        
    class Flags:
        FIN = 0x01 # end of data
        SYN = 0x02 # synchronize sequence numbers
        RST = 0x04 # reset connection
        PSH = 0x08 # push
        ACK = 0x10 # acknowledgment number set
        URG = 0x20 # urgent pointer set
        ECE = 0x40 # ECN echo, RFC 3168
        CWR = 0x80 # congestion window reduced
        NS = 0x100 # nonce sum, RFC 3540

        @staticmethod
        def flags_to_str(val):
            flags = []
            if val & TCPSegment.Flags.FIN:
                flags.append('FIN')
            if val & TCPSegment.Flags.SYN:
                flags.append('SYN')
            if val & TCPSegment.Flags.RST:
                flags.append('RST')
            if val & TCPSegment.Flags.PSH:
                flags.append('PSH')
            if val & TCPSegment.Flags.ACK:
                flags.append('ACK')
            if val & TCPSegment.Flags.URG:
                flags.append('URG')
            if val & TCPSegment.Flags.ECE:
                flags.append('ECE')
            if val & TCPSegment.Flags.CWR:
                flags.append('CWR')
            if val & TCPSegment.Flags.NS:
                flags.append('NS')
            return '+'.join(flags)
        
        @staticmethod
        def parse_flags(value):
            res = 0
            if value is None:
                return 0
            if isinstance(value,int):
                return value
            
            for flag in value:
                res = res | getattr(TCPSegment.Flags, flag )
            return res


    src_port: int = field(default = 0)
    dst_port: int = field(default = 0)
    seq: int = field(default = 0)
    ack: int = field(default = 0)
    offset: int = field(default = 0, converter = lambda value: value >> 4)
    flags: int = field(default = 0, repr = lambda value: TCPSegment.Flags.flags_to_str(value), \
                        converter = lambda value: TCPSegment.Flags.parse_flags(value))
    win: int = field(default = 8192)
    checksum: int = field(default = 0, repr = lambda value: hex(value))
    urp: int = field(default = 0)
    data: bytes = field(default=b'', repr = lambda value: f'{value[0:5]}... <len:{len(value)}>' \
                        if len(value)>5 else f'{value}')

    opt: bytes = field(default=b'', converter = lambda value: TCPSegment.Options.parse_options(value))

    @classmethod
    def from_buffer(cls,buffer):
        TCP_MIN = 20
        src_port, dst_port, seq, ack, offres, flags, win, checksum, urp = struct.unpack(ENDIANESS +"HHIIBBHHH", buffer[0:TCP_MIN])
        hdr_len = (offres >> 4) * 4

        if hdr_len <= TCP_MIN: 
            return cls(src_port, dst_port, seq, ack, offres, flags, win, checksum, urp, buffer[TCP_MIN:], b'')

        if hdr_len > TCP_MIN:
            return cls(src_port, dst_port, seq, ack, offres, flags, win, checksum, urp, buffer[hdr_len:],buffer[TCP_MIN:hdr_len])

        
    def to_buffer(self):
        return struct.pack(ENDIANESS+'HHIIBBHHH', \
            self.src_port,\
            self.dst_port,\
            self.seq,\
            self.ack,\
            self.offset << 4,\
            self.flags,\
            self.win,\
            self.checksum,\
            self.urp) + (self.data.encode("utf-8") if isinstance(self.data,str) else self.data)
    
    def set_flags(self, list_of_flags):
        self.flags = list_of_flags
        return self
    
    def is_flag(self,flag):
        return (self.flags & getattr(TCPSegment.Flags, flag)) > 0

    def encapsulate(self, src_addr: str, dst_addr: str):
        return IPPacket(src_addr=src_addr, dst_addr=dst_addr,segment=self)

@define
class IPPacket:
    class Flags:
        RF = 0x4  # reserved
        DF = 0x2  # don't fragment
        MF = 0x1  # more fragments

        @staticmethod
        def flags_to_str(val):
            flags = []
            if val & IPPacket.Flags.RF == 0:
                if val & IPPacket.Flags.MF != 0:
                    flags.append('MF')
                if val & IPPacket.Flags.DF != 0:
                    flags.append('DF')
            else:
                flags.append('UNKNOWN')
            return '+'.join(flags)
    
        @staticmethod
        def parse_flags(value):
            res = 0
            if value is None:
                return 0
            if isinstance(value,int):
                return value
            
            for flag in value:
                res = res | getattr(IPPacket.Flags, flag )
            return res
        
    ihl: int = 5
    version: int = field( default=69, converter = lambda value: value >> 4)
    tos: int = field(default=0)
    len: int = field(default=0)
    ids: int = field(default=1)
    flags_offset: int = field(default = 0)
    flags: int = field(default = 0, init= False, repr = lambda value: IPPacket.Flags.flags_to_str(value), \
                       converter = lambda value: IPPacket.Flags.parse_flags(value))
    offset: int = field(default = 0, init=False)
    ttl: int = field(default=64)
    protocol: int = field(default=6)
    checksum: int = field(default = 0, repr = lambda value: hex(value))
    src_addr: str = field(default='10.0.0.1', converter = lambda value: inet_ntoa(value) if isinstance(value,bytes) else value)
    dst_addr: str = field(default='10.0.0.2', converter = lambda value: inet_ntoa(value) if isinstance(value,bytes) else value)
    segment: TCPSegment = None

    def __attrs_post_init__(self):
        self.offset = self.flags_offset & 0x1FFF
        self.flags = self.flags_offset >> 13 

        #Cut data buffer to IP packet length
        if self.len > 0 and self.segment:
            self.get_segment().data=self.get_segment().data[:self.len-(self.ihl*4)-20]

    @staticmethod
    def calc_checksum(pkt: bytes) -> int:
        if len(pkt) % 2 == 1:
            pkt += b"\0"
        s = sum(struct.unpack(('<' if ENDIANESS is '>' else '>')+str(len(pkt)//2)+'H',pkt))
        
        #source: https://github.com/secdev/scapy
        s = (s >> 16) + (s & 0xffff)
        s += s >> 16
        s = ~s
        return (((s >> 8) & 0xff) | s << 8) & 0xffff
    
    def calc_checksum_for_STH(pkt):
        if len(pkt) % 2 == 1:
            pkt += b"\0"
        elements = list(struct.unpack(ENDIANESS+str(len(pkt)//2)+'H',pkt))
        elements = elements[:14] + elements[15:]
        s = sum(elements)
        return s % 0x10000
    
        # checksum = 0
        # i = 0

        # if len(pkt) % 2 == 1:
        #      pkt += b'\0'

        # while (i <= len(pkt)-2):
        #     if i != 28:
        #         val = struct.unpack_from('<H',pkt,i)[0]
        #         print(val)
        #         checksum += val
        #     i += 2
        # return checksum % 0x10000
    @classmethod
    def from_buffer_with_pseudoheader(cls,buffer):
        src_addr, dst_addr, _, proto, length = struct.unpack(ENDIANESS+"4s4sBBH",bytes(buffer[0:12]))
        pkt = cls(0, 0, 0, length, 0, 0, 0, proto, 0, src_addr, dst_addr, TCPSegment.from_buffer(buffer[12:]) if len(buffer) > 12 else None)
        return pkt
                
    @classmethod
    def from_buffer(cls,buffer):   
        ihl = (buffer[0] & 0xf)
        pkt = cls(ihl, *struct.unpack(ENDIANESS+"BBHHHBBH4s4s", buffer[0:ihl*4]),TCPSegment.from_buffer(buffer[ihl*4:]) if len(buffer) > ihl*4 else None)

        #Cut data buffer to IP packet length
        if pkt.segment:
            pkt.get_segment().data=pkt.get_segment().data[:pkt.len-(ihl*4)-20]
            
        return pkt

    def is_flag(self,flag):
        return (self.flags & getattr(IPPacket.Flags, flag)) > 0


    def prepare_pseudoheader(self, protocol, len):
        return struct.pack(ENDIANESS+"4s4sBBH", \
                           inet_aton(self.src_addr),\
                           inet_aton(self.dst_addr), \
                           0,\
                           protocol, \
                           len+12)

    def to_buffer_with_tcp_pseudoheader(self):
        
        data = self.get_segment().to_buffer() if self.segment else b''
        
        return self.prepare_pseudoheader(self.protocol, len(data)) + data
            
    def to_buffer(self):
        ihl_ver = (int(self.version) << 4) + int(self.ihl)

        data = self.get_segment().to_buffer() if self.segment else b''
        self.len = 20 + len(data)
        return struct.pack(ENDIANESS+'BBHHHBBH4s4s', \
                            ihl_ver, \
                            self.tos, \
                            self.len, \
                            self.ids,
                            self.flags_offset, \
                            self.ttl, \
                            self.protocol, \
                            self.checksum, \
                            inet_aton(self.src_addr), \
                            inet_aton(self.dst_addr)) + data
    
    def _validate_tcp(self):
        
        tcp_hdr_len = 5 
        self.segment.offset = tcp_hdr_len << 4
        self.segment.checksum = 0

        tcp_segment = self.segment.to_buffer()      
        
        pseudo_hdr = self.prepare_pseudoheader(self.protocol, len(tcp_segment))
        
        self.segment.checksum = IPPacket.calc_checksum(pseudo_hdr + tcp_segment)

        return self
    
    def _validate_tcp_for_STH(self):
        
        tcp_hdr_len = 5 
        self.segment.offset = tcp_hdr_len << 4       
        self.segment.checksum = 0
        self.protocol = 1

        tcp_segment = self.segment.to_buffer()      
        
        pseudo_hdr = self.prepare_pseudoheader(self.protocol, len(tcp_segment))
        
        self.segment.checksum = IPPacket.calc_checksum_for_STH(pseudo_hdr + tcp_segment)

        return self
    
    def _validate_ip(self):

        self.checksum = 0

        self.checksum = IPPacket.calc_checksum(self.to_buffer()[0:self.ihl*4])

        return self
    
    def build(self, for_STH=False):

        if for_STH:
            if self.segment:
                self._validate_tcp_for_STH()
        else:
            if self.segment:
                self._validate_tcp()
            self._validate_ip()
        
        return self
    
    def encapsulate(self):
        return EthernetFrame(b'', b'', b'', self)

    def get_segment(self):
        return self.segment

@define
class EthernetFrame:
    src_mac: str = field(converter = lambda value: hexlify(value))
    dst_mac: str = field(converter = lambda value: hexlify(value))
    eth_type: bytes = field(repr = lambda value: hexlify(value))
    packet: IPPacket

    @classmethod
    def from_buffer(cls,buffer):
        return cls(*struct.unpack(ENDIANESS+"6s6s2s", buffer[0:14]),IPPacket.from_buffer(buffer[14:]))

    def to_buffer(self):
        return struct.pack(ENDIANESS+"6s6s2s", unhexlify(self.src_mac), unhexlify(self.dst_mac),self.eth_type) + self.get_packet().to_buffer()
    
    def get_packet(self):
        return self.packet