[@scramjet/model](../README.md) / [Exports](../modules.md) / MonitoringMessage

# Interface: MonitoringMessage

Monitoring message including detailed performance statistics.
This message type is sent from Runner.

## Hierarchy

* **MonitoringMessage**

## Table of contents

### Properties

- [cpu](monitoringmessage.md#cpu)
- [memoryFree](monitoringmessage.md#memoryfree)
- [memoryUsed](monitoringmessage.md#memoryused)
- [msgCode](monitoringmessage.md#msgcode)
- [pressure](monitoringmessage.md#pressure)
- [swapFree](monitoringmessage.md#swapfree)
- [swapUsed](monitoringmessage.md#swapused)
- [throughput](monitoringmessage.md#throughput)

## Properties

### cpu

• **cpu**: *number*

CPU usage

Defined in: [messages/monitoring.ts:19](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/monitoring.ts#L19)

___

### memoryFree

• **memoryFree**: *number*

The amount of free RAM.

Defined in: [messages/monitoring.ts:25](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/monitoring.ts#L25)

___

### memoryUsed

• **memoryUsed**: *number*

The amount of RAM in use.

Defined in: [messages/monitoring.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/monitoring.ts#L22)

___

### msgCode

• **msgCode**: RunnerMessageCode

Message type code from RunnerMessageCode enumeration

Defined in: [messages/monitoring.ts:10](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/monitoring.ts#L10)

___

### pressure

• **pressure**: *number*

Calculated backpressure: processing * throughput / buffer.

Defined in: [messages/monitoring.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/monitoring.ts#L16)

___

### swapFree

• **swapFree**: *number*

The amount of free swap memory.

Defined in: [messages/monitoring.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/monitoring.ts#L31)

___

### swapUsed

• **swapUsed**: *number*

The amount of swap memory in use.

Defined in: [messages/monitoring.ts:28](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/monitoring.ts#L28)

___

### throughput

• **throughput**: *number*

How many items are processed by the Sequence per second.

Defined in: [messages/monitoring.ts:13](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/e4cc8a9/src/model/messages/monitoring.ts#L13)
