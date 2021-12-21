from enum import Enum

class CommunicationChannels(Enum):
    STDIN = "0"
    STDOUT = "1"
    STDERR = "2"
    CONTROL = "3"
    MONITORING = "4"
    IN = "5"
    OUT = "6"
    LOG = "7"