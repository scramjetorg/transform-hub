[@scramjet/symbols](../README.md) / [Exports](../modules.md) / OpRecordCode

# Enumeration: OpRecordCode

## Table of contents

### Enumeration Members

- [DELETE\_SEQUENCE](OpRecordCode.md#delete_sequence)
- [GET\_INSTANCE](OpRecordCode.md#get_instance)
- [GET\_INSTANCE\_EVENT](OpRecordCode.md#get_instance_event)
- [GET\_INSTANCE\_EVENTS](OpRecordCode.md#get_instance_events)
- [GET\_INSTANCE\_EVENT\_ONCE](OpRecordCode.md#get_instance_event_once)
- [GET\_INSTANCE\_HEALTH](OpRecordCode.md#get_instance_health)
- [GET\_INSTANCE\_LOG](OpRecordCode.md#get_instance_log)
- [GET\_INSTANCE\_MONITORING](OpRecordCode.md#get_instance_monitoring)
- [GET\_INSTANCE\_OUTPUT](OpRecordCode.md#get_instance_output)
- [GET\_INSTANCE\_STDERR](OpRecordCode.md#get_instance_stderr)
- [GET\_INSTANCE\_STDIN](OpRecordCode.md#get_instance_stdin)
- [GET\_INSTANCE\_STDOUT](OpRecordCode.md#get_instance_stdout)
- [GET\_SEQUENCE](OpRecordCode.md#get_sequence)
- [GET\_TOPIC](OpRecordCode.md#get_topic)
- [HOST\_HEARTBEAT](OpRecordCode.md#host_heartbeat)
- [HUB\_CONNECTED](OpRecordCode.md#hub_connected)
- [HUB\_DISCONNECTED](OpRecordCode.md#hub_disconnected)
- [INSTANCE\_HEARTBEAT](OpRecordCode.md#instance_heartbeat)
- [INSTANCE\_STOPPED](OpRecordCode.md#instance_stopped)
- [MANAGER\_HEARTBEAT](OpRecordCode.md#manager_heartbeat)
- [NOT\_PROCESSABLE](OpRecordCode.md#not_processable)
- [POST\_INSTANCE\_EVENT](OpRecordCode.md#post_instance_event)
- [POST\_INSTANCE\_INPUT](OpRecordCode.md#post_instance_input)
- [POST\_INSTANCE\_MONITORING\_RATE](OpRecordCode.md#post_instance_monitoring_rate)
- [POST\_KILL\_INSTANCE](OpRecordCode.md#post_kill_instance)
- [POST\_SEQUENCE](OpRecordCode.md#post_sequence)
- [POST\_START\_INSTANCE](OpRecordCode.md#post_start_instance)
- [POST\_STOP\_INSTANCE](OpRecordCode.md#post_stop_instance)
- [POST\_TOPIC](OpRecordCode.md#post_topic)

## Enumeration Members

### DELETE\_SEQUENCE

• **DELETE\_SEQUENCE** = ``10400``

#### Defined in

[op-record-code.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L31)

___

### GET\_INSTANCE

• **GET\_INSTANCE** = ``11200``

The message codes related to the operation on an Instance.
They are triggered in response to the user operations performed by the API.

#### Defined in

[op-record-code.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L8)

___

### GET\_INSTANCE\_EVENT

• **GET\_INSTANCE\_EVENT** = ``11210``

#### Defined in

[op-record-code.ts:17](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L17)

___

### GET\_INSTANCE\_EVENTS

• **GET\_INSTANCE\_EVENTS** = ``11209``

#### Defined in

[op-record-code.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L16)

___

### GET\_INSTANCE\_EVENT\_ONCE

• **GET\_INSTANCE\_EVENT\_ONCE** = ``11211``

#### Defined in

[op-record-code.ts:18](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L18)

___

### GET\_INSTANCE\_HEALTH

• **GET\_INSTANCE\_HEALTH** = ``11208``

#### Defined in

[op-record-code.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L15)

___

### GET\_INSTANCE\_LOG

• **GET\_INSTANCE\_LOG** = ``11204``

#### Defined in

[op-record-code.ts:12](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L12)

___

### GET\_INSTANCE\_MONITORING

• **GET\_INSTANCE\_MONITORING** = ``11205``

#### Defined in

[op-record-code.ts:13](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L13)

___

### GET\_INSTANCE\_OUTPUT

• **GET\_INSTANCE\_OUTPUT** = ``11206``

#### Defined in

[op-record-code.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L14)

___

### GET\_INSTANCE\_STDERR

• **GET\_INSTANCE\_STDERR** = ``11202``

#### Defined in

[op-record-code.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L10)

___

### GET\_INSTANCE\_STDIN

• **GET\_INSTANCE\_STDIN** = ``11203``

#### Defined in

[op-record-code.ts:11](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L11)

___

### GET\_INSTANCE\_STDOUT

• **GET\_INSTANCE\_STDOUT** = ``11201``

#### Defined in

[op-record-code.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L9)

___

### GET\_SEQUENCE

• **GET\_SEQUENCE** = ``10200``

The message codes related to the operation on a Sequence.
They are triggered in response to the user operations performed by the API.

#### Defined in

[op-record-code.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L30)

___

### GET\_TOPIC

• **GET\_TOPIC** = ``12200``

The message codes related to the operation on Topics.
They are triggered in response to the user operations performed by the API.

#### Defined in

[op-record-code.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L40)

___

### HOST\_HEARTBEAT

• **HOST\_HEARTBEAT** = ``13010``

The HEARTBEAT message is a signal issued periodically (configurable)
by the CSI Controller, the Host and the Manager.
It indicates whether the services are still operational.

#### Defined in

[op-record-code.ts:53](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L53)

___

### HUB\_CONNECTED

• **HUB\_CONNECTED** = ``14000``

Message codes related to STH connection states
Inticates whether the hub has been connected or disconnected

#### Defined in

[op-record-code.ts:61](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L61)

___

### HUB\_DISCONNECTED

• **HUB\_DISCONNECTED** = ``14001``

#### Defined in

[op-record-code.ts:62](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L62)

___

### INSTANCE\_HEARTBEAT

• **INSTANCE\_HEARTBEAT** = ``13012``

#### Defined in

[op-record-code.ts:54](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L54)

___

### INSTANCE\_STOPPED

• **INSTANCE\_STOPPED** = ``-1``

The INSTANCE_STOPPED message is sent when an Instance terminated not
in response to the API request but gracefully by itself or by throwing an error.

#### Defined in

[op-record-code.ts:68](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L68)

___

### MANAGER\_HEARTBEAT

• **MANAGER\_HEARTBEAT** = ``13020``

#### Defined in

[op-record-code.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L55)

___

### NOT\_PROCESSABLE

• **NOT\_PROCESSABLE** = ``0``

#### Defined in

[op-record-code.ts:70](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L70)

___

### POST\_INSTANCE\_EVENT

• **POST\_INSTANCE\_EVENT** = ``11110``

#### Defined in

[op-record-code.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L21)

___

### POST\_INSTANCE\_INPUT

• **POST\_INSTANCE\_INPUT** = ``11107``

#### Defined in

[op-record-code.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L19)

___

### POST\_INSTANCE\_MONITORING\_RATE

• **POST\_INSTANCE\_MONITORING\_RATE** = ``11112``

#### Defined in

[op-record-code.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L20)

___

### POST\_KILL\_INSTANCE

• **POST\_KILL\_INSTANCE** = ``11115``

#### Defined in

[op-record-code.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L23)

___

### POST\_SEQUENCE

• **POST\_SEQUENCE** = ``10100``

#### Defined in

[op-record-code.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L32)

___

### POST\_START\_INSTANCE

• **POST\_START\_INSTANCE** = ``10117``

#### Defined in

[op-record-code.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L33)

___

### POST\_STOP\_INSTANCE

• **POST\_STOP\_INSTANCE** = ``11114``

#### Defined in

[op-record-code.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L22)

___

### POST\_TOPIC

• **POST\_TOPIC** = ``12100``

#### Defined in

[op-record-code.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/symbols/src/op-record-code.ts#L41)
