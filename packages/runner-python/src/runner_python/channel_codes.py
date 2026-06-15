from enum import Enum


class ChannelCode(str, Enum):
    IN = "5"
    OUT = "6"
    LOG = "7"
    REQUESTS = "8"
