""" inet.py - contains TCP Segment, IP Packet and Ethernet Frame support for Tecemux in Python runner
"""

import struct
from binascii import hexlify, unhexlify
from socket import inet_ntoa, inet_aton
from attrs import define, field


class _Singleton(type):
    """Metaclass for Singleton pattern
    """
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(
                _Singleton, cls).__call__(*args, **kwargs)
        return cls._instances[cls]


class SequenceOrder(metaclass=_Singleton):
    """Sets sequence order for buffer analysis
    """
    class _Order:
        """ Contains suported orders. For internal usage only
        """        
        LITTLE_ENDIAN = '<'
        BIG_ENDIAN = '>'

    endianess = _Order.LITTLE_ENDIAN

    def use_big_endian(self):
        """ Sets Big-Endian order
        """
        self.endianess = SequenceOrder._Order.BIG_ENDIAN

    def use_little_endian(self):
        """ Sets Little-endian order
        """
        self.endianess = SequenceOrder._Order.LITTLE_ENDIAN

    def get(self):
        """ Returns order struct module format
        '<' is little-endian
        '>' is big-endian

        Returns:
            str: return endianess for struct module
        """        
        return self.endianess


@define
class TCPSegment:
    """ Class for manage TCP segment data
    """

    class Options:
        """ TCP Segments options, at the end of TCP Header
        """        

        EOL = 0
        NOP = 1
        MSS = 2
        WSOPT = 3
        SACKPERM = 4
        SACK = 5
        TSOPT = 8

        @staticmethod
        def parse_options(val):
            """Returns TCP option in readable format

            Args:
                val (bytes): Part of TCP Header

            Returns:
                str: Options in readable format
            """            
            return val

    class Flags:
        """TCP Segments flags
        """

        FIN = 0x01  # end of data
        SYN = 0x02  # synchronize sequence numbers
        RST = 0x04  # reset connection
        PSH = 0x08  # push
        ACK = 0x10  # acknowledgment number set
        URG = 0x20  # urgent pointer set
        ECE = 0x40  # ECN echo, RFC 3168
        CWR = 0x80  # congestion window reduced
        NS = 0x100  # nonce sum, RFC 3540

        @staticmethod
        def flags_to_str(val):
            """Returns TCP flags in readable format

            Args:
                val (bytes): Part of TCP segment header

            Returns:
                list: List of setted flags in segment
            """
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
            """Checks Bit state of each flag int TCP Header

            Args:
                value (None,int,bytes): TCP Header part to analyze

            Returns:
                int: Integer values represents bit state of each flag
            """
            res = 0
            if value is None:
                return 0
            if isinstance(value, int):
                return value

            for flag in value:
                res = res | getattr(TCPSegment.Flags, flag)
            return res

    src_port: int = field(default=0)
    dst_port: int = field(default=0)
    seq: int = field(default=0)
    ack: int = field(default=0)
    offset: int = field(default=0, converter=lambda value: value >> 4)
    flags: int = field(default=0, repr=lambda value: TCPSegment.Flags.flags_to_str(value),
                       converter=lambda value: TCPSegment.Flags.parse_flags(value))
    win: int = field(default=8192)
    checksum: int = field(default=0, repr=lambda value: hex(value))
    urp: int = field(default=0)
    data: bytes = field(default=b'', repr=lambda value: f'{value[0:5]}... <len:{len(value)}>'
                        if len(value) > 5 else f'{value}')

    opt: bytes = field(
        default=b'', converter=lambda value: TCPSegment.Options.parse_options(value))

    @classmethod
    def from_buffer(cls, buffer: bytes):
        """Creates TCP Segment object from provided raw buffer

        Args:
            buffer (bytes): Data from socket

        Returns:
            TCPSegment: Object of TCP Segment
        """

        TCP_MIN = 20
        src_port, dst_port, seq, ack, offres, flags, win, checksum, urp = struct.unpack(
            SequenceOrder().get() + "HHIIBBHHH", buffer[0:TCP_MIN])
        hdr_len = (offres >> 4) * 4

        if hdr_len <= TCP_MIN:
            return cls(src_port, dst_port, seq, ack, offres, flags, win, checksum, urp, buffer[TCP_MIN:], b'')

        if hdr_len > TCP_MIN:
            return cls(src_port, dst_port, seq, ack, offres, flags, win, checksum, urp, buffer[hdr_len:], buffer[TCP_MIN:hdr_len])

    def to_buffer(self):
        """Build raw buffer from TCP Segment object 

        Returns:
            bytes: Raw buffer
        """
        return struct.pack(SequenceOrder().get()+'HHIIBBHHH',
                           self.src_port,
                           self.dst_port,
                           self.seq,
                           self.ack,
                           self.offset << 4,
                           self.flags,
                           self.win,
                           self.checksum,
                           self.urp) + (self.data.encode("utf-8") if isinstance(self.data, str) else self.data)

    def set_flags(self, list_of_flags: int):
        """Enables flags in segment

        Args:
            list_of_flags (int): Single integer value represents all flag bits

        Returns:
            TCPObject: Retuns self
        """    
        self.flags = list_of_flags
        return self

    def is_flag(self, flag: Flags) -> bool:
        """Checks whether provided flag is enabled in segment

        Args:
            flag (TCPSegment.Flags): Specific flag to check

        Returns:
            bool: State of provided flag
        """

        return (self.flags & getattr(TCPSegment.Flags, flag)) > 0

@define
class IPPacket:
    """ Class for manage IP Packet data
    """

    class Flags:
        """TCP Segments flags
        """
        RF = 0x4  # reserved
        DF = 0x2  # don't fragment
        MF = 0x1  # more fragments

        @staticmethod
        def flags_to_str(val):
            """Returns IP flags in readable format

            Args:
                val (bytes): Part of IP Packet header

            Returns:
                list: List of setted flags in packet
            """
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
            """Checks bit state of each flag in IP Header

            Args:
                value (None,int,bytes): IP Header part to analyze

            Returns:
                int: Integer values represents bit state of each flag
            """            
            res = 0
            if value is None:
                return 0
            if isinstance(value, int):
                return value

            for flag in value:
                res = res | getattr(IPPacket.Flags, flag)
            return res

    ihl: int = 5
    version: int = field(default=69, converter=lambda value: value >> 4)
    tos: int = field(default=0)
    len: int = field(default=0)
    ids: int = field(default=1)
    flags_offset: int = field(default=0)
    flags: int = field(default=0, init=False, repr=lambda value: IPPacket.Flags.flags_to_str(value),
                       converter=lambda value: IPPacket.Flags.parse_flags(value))
    offset: int = field(default=0, init=False)
    ttl: int = field(default=64)
    protocol: int = field(default=6)
    checksum: int = field(default=0, repr=lambda value: hex(value))
    src_addr: str = field(default='10.0.0.1', converter=lambda value: inet_ntoa(
        value) if isinstance(value, bytes) else value)
    dst_addr: str = field(default='10.0.0.2', converter=lambda value: inet_ntoa(
        value) if isinstance(value, bytes) else value)
    segment: TCPSegment = None

    def __attrs_post_init__(self):
        """Internal function executes after constructor
        """

        self.offset = self.flags_offset & 0x1FFF
        self.flags = self.flags_offset >> 13

        # Cut data buffer to IP packet length
        if self.len > 0 and self.segment:
            self.get_segment().data = self.get_segment(
            ).data[:self.len-(self.ihl*4)-20]

    @staticmethod
    def calc_checksum(pkt: bytes) -> int:
        """Calculates checksum for provited packet

        Args:
            pkt (bytes): Raw buffer 

        Returns:
            int: Calculated checsum
        """        
        if len(pkt) % 2 == 1:
            pkt += b"\0"
        s = sum(struct.unpack(('<' if SequenceOrder().get()
                is '>' else '>')+str(len(pkt)//2)+'H', pkt))

        # source: https://github.com/secdev/scapy
        s = (s >> 16) + (s & 0xffff)
        s += s >> 16
        s = ~s
        return (((s >> 8) & 0xff) | s << 8) & 0xffff

    @staticmethod
    def calc_checksum_for_STH(pkt: bytes) -> int:
        """Calculates checksum for provited packet in ormat valid for Transform Hub

        Args:
            pkt (bytes): Raw buffer

        Returns:
            int: Calculated checksum
        """    
        if len(pkt) % 2 == 1:
            pkt += b"\0"
        elements = list(struct.unpack(
            SequenceOrder().get()+str(len(pkt)//2)+'H', pkt))
        elements = elements[:14] + elements[15:]
        s = sum(elements)
        return s % 0x10000

    @classmethod
    def from_buffer_with_pseudoheader(cls, buffer:bytes):
        """Creates IP Packet object and TCP Segment object 
        from provided raw buffer with pseudo TCP Header

        Args:
            buffer (bytes): Raw buffer

        Returns:
            IPPacket: IPPacket object
        """
        src_addr, dst_addr, _, proto, length = struct.unpack(
            SequenceOrder().get()+"4s4sBBH", bytes(buffer[0:12]))
        pkt = cls(0, 0, 0, length, 0, 0, 0, proto, 0, src_addr, dst_addr,
                  TCPSegment.from_buffer(buffer[12:]) if len(buffer) > 12 else None)
        return pkt

    @classmethod
    def from_buffer(cls, buffer: bytes):
        """Creates IP Packet object and TCP Segment object 
        from provided raw buffer with

        Args:
            buffer (bytes): Raw buffer

        Returns:
            IPPacket: IPPacket object
        """        
        ihl = (buffer[0] & 0xf)
        pkt = cls(ihl, *struct.unpack(SequenceOrder().get()+"BBHHHBBH4s4s",
                  buffer[0:ihl*4]), TCPSegment.from_buffer(buffer[ihl*4:]) if len(buffer) > ihl*4 else None)

        # Cut data buffer to IP packet length
        if pkt.segment:
            pkt.get_segment().data = pkt.get_segment(
            ).data[:pkt.len-(ihl*4)-20]

        return pkt

    def is_flag(self, flag: Flags) -> bool:
        """Checks whether provided flag is enabled in packet
        """
        return (self.flags & getattr(IPPacket.Flags, flag)) > 0

    def prepare_pseudoheader(self, protocol:int, length:int) -> bytes:
        """Prepare TCP pseudoheader to calulate checksum

        Args:
            protocol (int): Packet protocol value
            length (int): Length of data (without header)

        Returns:
            bytes: TCP Pseudoheader
        """
        return struct.pack(SequenceOrder().get()+"4s4sBBH",
                           inet_aton(self.src_addr),
                           inet_aton(self.dst_addr),
                           0,
                           protocol,
                           length+12)

    def to_buffer_with_tcp_pseudoheader(self) -> bytes:
        """Build raw buffer from IP Packet with pseudo TCP header

        Returns:
            bytes: Raw buffer
        """
        data = self.get_segment().to_buffer() if self.segment else b''

        return self.prepare_pseudoheader(self.protocol, len(data)) + data

    def to_buffer(self):
        """Build raw buffer from IP Packet

        Returns:
            bytes: Raw buffer
        """

        ihl_ver = (int(self.version) << 4) + int(self.ihl)

        data = self.get_segment().to_buffer() if self.segment else b''
        self.len = 20 + len(data)
        return struct.pack(SequenceOrder().get()+'BBHHHBBH4s4s',
                           ihl_ver,
                           self.tos,
                           self.len,
                           self.ids,
                           self.flags_offset,
                           self.ttl,
                           self.protocol,
                           self.checksum,
                           inet_aton(self.src_addr),
                           inet_aton(self.dst_addr)) + data

    def _validate_tcp(self):
        """ Calculates checksum for TCP segment part only
        """
        tcp_hdr_len = 5
        self.segment.offset = tcp_hdr_len << 4
        self.segment.checksum = 0

        tcp_segment = self.segment.to_buffer()

        pseudo_hdr = self.prepare_pseudoheader(self.protocol, len(tcp_segment))

        self.segment.checksum = IPPacket.calc_checksum(
            pseudo_hdr + tcp_segment)

        return self

    def _validate_tcp_for_STH(self):
        """ Calculates checksum with format valid for Transform Hub
        """
        tcp_hdr_len = 5
        self.segment.offset = tcp_hdr_len << 4
        self.segment.checksum = 0
        self.protocol = 1

        tcp_segment = self.segment.to_buffer()

        pseudo_hdr = self.prepare_pseudoheader(self.protocol, len(tcp_segment))

        self.segment.checksum = IPPacket.calc_checksum_for_STH(
            pseudo_hdr + tcp_segment)

        return self

    def _validate_ip(self):
        """ Calculates checksum IP Packet part only
        """

        self.checksum = 0

        self.checksum = IPPacket.calc_checksum(self.to_buffer()[0:self.ihl*4])

        return self

    def build(self, for_STH=False):
        """Calculates all checksums

        Args:
            for_STH (bool, optional): If True, cheksums calculates with format valid for Transform Hub. 
            Otherise it is calcuated with RFC. Defaults to False.
        """
        if for_STH:
            if self.segment:
                self._validate_tcp_for_STH()
        else:
            if self.segment:
                self._validate_tcp()
            self._validate_ip()

        return self
    def get_segment(self):
        """Return TCP Segment

        Returns:
            TCPSegment: TCP Segment object
        """
        return self.segment

@define
class EthernetFrame:
    """ Class for manage Ethernet frame data
    """

    src_mac: str = field(converter=lambda value: hexlify(value))
    dst_mac: str = field(converter=lambda value: hexlify(value))
    eth_type: bytes = field(repr=lambda value: hexlify(value))
    packet: IPPacket

    @classmethod
    def from_buffer(cls, buffer: bytes):
        """Creates Ethernet frame object from provided raw buffer

        Args:
            buffer (bytes): Raw buffer

        Returns:
            EthernetFrame: Ethernet frame object
        """
        return cls(*struct.unpack(SequenceOrder().get()+"6s6s2s", buffer[0:14]), IPPacket.from_buffer(buffer[14:]))

    def to_buffer(self) -> bytes:
        """Build raw buffer from Ethernet frame object

        Returns:
            _bytes: Raw buffer
        """        
        return struct.pack(SequenceOrder().get()+"6s6s2s", unhexlify(self.src_mac), unhexlify(self.dst_mac), self.eth_type) + self.packet.to_buffer()
    
    def get_packet(self):
        """Return IP Packet object

        Returns:
            IPPacket: IP Packet object
        """        
        return self.packet