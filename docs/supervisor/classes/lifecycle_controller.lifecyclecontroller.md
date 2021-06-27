[@scramjet/supervisor](../README.md) / [lifecycle-controller](../modules/lifecycle_controller.md) / LifeCycleController

# Class: LifeCycleController

[lifecycle-controller](../modules/lifecycle_controller.md).LifeCycleController

LifeCycleController is a main component of Supervisor.
The Supervisor is started by the CSH when the new Sequence is to be deployed.
Each Supervisor is responsible for deploying and running only one Sequence.
When Supervisor starts it creates LifeCycleController class and
initiates Supervisor's lifecycle by calling its start() method.

## Implements

- *IComponent*

## Table of contents

### Constructors

- [constructor](lifecycle_controller.lifecyclecontroller.md#constructor)

### Properties

- [\_endOfSequence](lifecycle_controller.lifecyclecontroller.md#_endofsequence)
- [id](lifecycle_controller.lifecyclecontroller.md#id)
- [logger](lifecycle_controller.lifecyclecontroller.md#logger)

### Accessors

- [endOfSequence](lifecycle_controller.lifecyclecontroller.md#endofsequence)

### Methods

- [configMessageReceived](lifecycle_controller.lifecyclecontroller.md#configmessagereceived)
- [handleKeepAliveCommand](lifecycle_controller.lifecyclecontroller.md#handlekeepalivecommand)
- [handleSequenceCompleted](lifecycle_controller.lifecyclecontroller.md#handlesequencecompleted)
- [handleSequenceStopped](lifecycle_controller.lifecyclecontroller.md#handlesequencestopped)
- [main](lifecycle_controller.lifecyclecontroller.md#main)
- [scheduleExit](lifecycle_controller.lifecyclecontroller.md#scheduleexit)

## Constructors

### constructor

\+ **new LifeCycleController**(`id`: *string*, `lifecycleAdapterRun`: *ILifeCycleAdapterRun*, `lifecycleConfig`: LifeCycleConfig, `client`: ICSHClient): [*LifeCycleController*](lifecycle_controller.lifecyclecontroller.md)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | *string* | supervisor id |
| `lifecycleAdapterRun` | *ILifeCycleAdapterRun* | an implementation of LifeCycle interface |
| `lifecycleConfig` | LifeCycleConfig | configuration specific to running the Sequence on the particular Cloud Server Instance. |
| `client` | ICSHClient | that communicates with the CSH via TCP connection |

**Returns:** [*LifeCycleController*](lifecycle_controller.lifecyclecontroller.md)

Defined in: [lifecycle-controller.ts:65](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/supervisor/src/lib/lifecycle-controller.ts#L65)

## Properties

### \_endOfSequence

• `Optional` **\_endOfSequence**: *Promise*<number\>

Defined in: [lifecycle-controller.ts:53](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/supervisor/src/lib/lifecycle-controller.ts#L53)

___

### id

• **id**: *string*

**`param`** Supervisor id, this id is generated in the host and passed to Supervisor at its initiation.

Defined in: [lifecycle-controller.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/supervisor/src/lib/lifecycle-controller.ts#L20)

___

### logger

• **logger**: Console

Implementation of: IComponent.logger

Defined in: [lifecycle-controller.ts:51](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/supervisor/src/lib/lifecycle-controller.ts#L51)

## Accessors

### endOfSequence

• get **endOfSequence**(): *Promise*<number\>

**Returns:** *Promise*<number\>

Defined in: [lifecycle-controller.ts:55](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/supervisor/src/lib/lifecycle-controller.ts#L55)

• set **endOfSequence**(`prm`: *Promise*<number\>): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `prm` | *Promise*<number\> |

**Returns:** *void*

Defined in: [lifecycle-controller.ts:63](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/supervisor/src/lib/lifecycle-controller.ts#L63)

## Methods

### configMessageReceived

▸ **configMessageReceived**(): *Promise*<RunnerConfig\>

**Returns:** *Promise*<RunnerConfig\>

Defined in: [lifecycle-controller.ts:253](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/supervisor/src/lib/lifecycle-controller.ts#L253)

___

### handleKeepAliveCommand

▸ **handleKeepAliveCommand**(`message`: *EncodedMessage*<ALIVE\>): *EncodedMessage*<ALIVE\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | *EncodedMessage*<ALIVE\> |

**Returns:** *EncodedMessage*<ALIVE\>

Defined in: [lifecycle-controller.ts:322](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/supervisor/src/lib/lifecycle-controller.ts#L322)

___

### handleSequenceCompleted

▸ **handleSequenceCompleted**(`message`: *EncodedMessage*<SEQUENCE\_COMPLETED\>): *Promise*<EncodedMessage<SEQUENCE\_COMPLETED\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | *EncodedMessage*<SEQUENCE\_COMPLETED\> |

**Returns:** *Promise*<EncodedMessage<SEQUENCE\_COMPLETED\>\>

Defined in: [lifecycle-controller.ts:267](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/supervisor/src/lib/lifecycle-controller.ts#L267)

___

### handleSequenceStopped

▸ **handleSequenceStopped**(`message`: *EncodedMessage*<SEQUENCE\_STOPPED\>): *Promise*<EncodedMessage<SEQUENCE\_STOPPED\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `message` | *EncodedMessage*<SEQUENCE\_STOPPED\> |

**Returns:** *Promise*<EncodedMessage<SEQUENCE\_STOPPED\>\>

Defined in: [lifecycle-controller.ts:299](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/supervisor/src/lib/lifecycle-controller.ts#L299)

___

### main

▸ **main**(): *Promise*<void\>

This main method controls logical flow of the Cloud Server Instance lifecycle.

The Supervisor starts by initiating the client that communicates with the CSH
and LifeCycle Adapter Run responsible for deployment of the Sequence.

Before the Sequence is executed the LifeCycle Adapter Run needs to connect the message and data streams
between the client and the LifeCycle Adapter Run.

LifeCycle Controller than requests LifeCycle Adapter Run to run the Sequence.

The Sequence runs until it has not terminated, either by itself or by a command sent from the CSH.

After the Sequence terminates it is possible to perform a snapshot of the container in which it was run.

When the Sequence terminates and (optionally) the snapshot is created, the LifeCycle Controller
requests the LifeCycle Adapter Run to perform the cleanup (e.g. removing unused volumes and containers).

**Returns:** *Promise*<void\>

resolves when Supervisor completed lifecycle without errors.

Defined in: [lifecycle-controller.ts:106](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/supervisor/src/lib/lifecycle-controller.ts#L106)

___

### scheduleExit

▸ **scheduleExit**(`exitCode?`: *number*, `timeout?`: *number*): *void*

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `exitCode?` | *number* | - |
| `timeout` | *number* | 100 |

**Returns:** *void*

Defined in: [lifecycle-controller.ts:288](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/supervisor/src/lib/lifecycle-controller.ts#L288)
