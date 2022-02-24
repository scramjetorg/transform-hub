from enum import Enum

# See packages/symbols/src/communication-channel.ts
class CommunicationChannels(Enum):
    STDIN = "0"
    STDOUT = "1"
    STDERR = "2"
    CONTROL = "3"
    MONITORING = "4"
    IN = "5"
    OUT = "6"
    LOG = "7"


# See packages/symbols/src/runner-message-code.ts
class RunnerMessageCodes(Enum):
    PING = 3000
    MONITORING = 3001
    DESCRIBE_SEQUENCE = 3002
    ERROR = 3003
    SEQUENCE_STOPPED = 3006
    STATUS = 3007  # temporary message code seq.status
    ALIVE = 3010  # temporary message code
    ACKNOWLEDGE = 3004
    SEQUENCE_COMPLETED = 3011
    PANG = 3012
    INPUT_CONTENT_TYPE = 3013

    PONG = 4000
    STOP = 4001
    KILL = 4002
    MONITORING_RATE = 4003
    FORCE_CONFIRM_ALIVE = 4004

    EVENT = 5001
