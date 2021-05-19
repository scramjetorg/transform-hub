[@scramjet/host](../README.md) / [host](../modules/host.md) / Host

# Class: Host

[host](../modules/host.md).Host

## Hierarchy

* **Host**

## Implements

* *IComponent*

## Table of contents

### Constructors

- [constructor](host.host-1.md#constructor)

### Properties

- [api](host.host-1.md#api)
- [apiBase](host.host-1.md#apibase)
- [csiControllers](host.host-1.md#csicontrollers)
- [logger](host.host-1.md#logger)
- [sequenceStore](host.host-1.md#sequencestore)
- [socketServer](host.host-1.md#socketserver)

### Methods

- [attachHostAPIs](host.host-1.md#attachhostapis)
- [getCSIControllersMap](host.host-1.md#getcsicontrollersmap)
- [getSequencesData](host.host-1.md#getsequencesdata)
- [getSequencesMap](host.host-1.md#getsequencesmap)
- [identifySequence](host.host-1.md#identifysequence)
- [main](host.host-1.md#main)
- [startCSIController](host.host-1.md#startcsicontroller)

## Constructors

### constructor

\+ **new Host**(`apiServer`: APIExpose, `socketServer`: [*SocketServer*](socket_server.socketserver.md)): [*Host*](host.host-1.md)

#### Parameters:

Name | Type |
------ | ------ |
`apiServer` | APIExpose |
`socketServer` | [*SocketServer*](socket_server.socketserver.md) |

**Returns:** [*Host*](host.host-1.md)

Defined in: [src/lib/host.ts:86](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L86)

## Properties

### api

• **api**: APIExpose

Defined in: [src/lib/host.ts:64](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L64)

___

### apiBase

• **apiBase**: *string*= "/api/v1"

Defined in: [src/lib/host.ts:66](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L66)

___

### csiControllers

• **csiControllers**: { [key: string]: [*CSIController*](csi_controller.csicontroller.md);  }

Defined in: [src/lib/host.ts:70](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L70)

___

### logger

• **logger**: Console

Defined in: [src/lib/host.ts:74](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L74)

___

### sequenceStore

• **sequenceStore**: [*SequenceStore*](host.sequencestore.md)

Defined in: [src/lib/host.ts:72](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L72)

___

### socketServer

• **socketServer**: [*SocketServer*](socket_server.socketserver.md)

Defined in: [src/lib/host.ts:68](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L68)

## Methods

### attachHostAPIs

▸ **attachHostAPIs**(): *void*

Setting up handlers for general Host API endpoints:
- listing all instances running on the CSH
- listing all sequences saved on the CSH
- creating Sequence (passing stream with the compressed package)
- starting Instance (based on a given Sequence ID passed in the HTTP request body)

**Returns:** *void*

Defined in: [src/lib/host.ts:127](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L127)

___

### getCSIControllersMap

▸ **getCSIControllersMap**(): *object*

**Returns:** *object*

Defined in: [src/lib/host.ts:239](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L239)

___

### getSequencesData

▸ **getSequencesData**(`sequenceId`: *string*): [*Sequence*](../modules/host.md#sequence)

#### Parameters:

Name | Type |
------ | ------ |
`sequenceId` | *string* |

**Returns:** [*Sequence*](../modules/host.md#sequence)

Defined in: [src/lib/host.ts:248](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L248)

___

### getSequencesMap

▸ **getSequencesMap**(): *object*

**Returns:** *object*

Defined in: [src/lib/host.ts:244](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L244)

___

### identifySequence

▸ **identifySequence**(`stream`: *Readable*): *MaybePromise*<RunnerConfig\>

#### Parameters:

Name | Type |
------ | ------ |
`stream` | *Readable* |

**Returns:** *MaybePromise*<RunnerConfig\>

Defined in: [src/lib/host.ts:211](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L211)

___

### main

▸ **main**(): *Promise*<*void*\>

**Returns:** *Promise*<*void*\>

Defined in: [src/lib/host.ts:97](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L97)

___

### startCSIController

▸ **startCSIController**(`sequence`: [*Sequence*](../modules/host.md#sequence), `appConfig`: AppConfig, `sequenceArgs?`: *any*[]): *Promise*<*string*\>

#### Parameters:

Name | Type |
------ | ------ |
`sequence` | [*Sequence*](../modules/host.md#sequence) |
`appConfig` | AppConfig |
`sequenceArgs?` | *any*[] |

**Returns:** *Promise*<*string*\>

Defined in: [src/lib/host.ts:225](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/host/src/lib/host.ts#L225)
