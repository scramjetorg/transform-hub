[@scramjet/host-one](../README.md) / HostOne

# Class: HostOne

## Implements

- *IComponent*

## Table of contents

### Constructors

- [constructor](hostone.md#constructor)

### Properties

- [errors](hostone.md#errors)
- [logger](hostone.md#logger)

### Methods

- [awaitConnection](hostone.md#awaitconnection)
- [cleanup](hostone.md#cleanup)
- [controlStreamsCliHandler](hostone.md#controlstreamsclihandler)
- [createApiServer](hostone.md#createapiserver)
- [createNetServer](hostone.md#createnetserver)
- [handleHandshake](hostone.md#handlehandshake)
- [hookLogStream](hostone.md#hooklogstream)
- [hookupMonitorStream](hostone.md#hookupmonitorstream)
- [hookupStreams](hostone.md#hookupstreams)
- [init](hostone.md#init)
- [kill](hostone.md#kill)
- [main](hostone.md#main)
- [onSupervisorExit](hostone.md#onsupervisorexit)
- [stop](hostone.md#stop)
- [vorpalExec](hostone.md#vorpalexec)

## Constructors

### constructor

\+ **new HostOne**(): [*HostOne*](hostone.md)

**Returns:** [*HostOne*](hostone.md)

Defined in: [host-one.ts:99](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L99)

## Properties

### errors

• **errors**: *object*

#### Type declaration

| Name | Type |
| :------ | :------ |
| `noImplement` | *string* |
| `noParams` | *string* |
| `parsingError` | *string* |

Defined in: [host-one.ts:75](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L75)

___

### logger

• **logger**: Console

Logger.

Implementation of: IComponent.logger

Defined in: [host-one.ts:73](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L73)

## Methods

### awaitConnection

▸ **awaitConnection**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [host-one.ts:257](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L257)

___

### cleanup

▸ **cleanup**(): *Promise*<unknown\>

**Returns:** *Promise*<unknown\>

Defined in: [host-one.ts:394](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L394)

___

### controlStreamsCliHandler

▸ **controlStreamsCliHandler**(): *void*

**Returns:** *void*

Defined in: [host-one.ts:338](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L338)

___

### createApiServer

▸ **createApiServer**(): *Promise*<void\>

Creates API Server and defines it's endpoints.

**Returns:** *Promise*<void\>

Defined in: [host-one.ts:207](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L207)

___

### createNetServer

▸ **createNetServer**(): *Promise*<void\>

Starts socket server.

**Returns:** *Promise*<void\>

Defined in: [host-one.ts:198](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L198)

___

### handleHandshake

▸ **handleHandshake**(): *Promise*<void\>

Sends handshake response via control stream.
Response contains sequence configuration and arguments.

**Returns:** *Promise*<void\>

Defined in: [host-one.ts:306](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L306)

___

### hookLogStream

▸ **hookLogStream**(): *void*

Creates StringStream from log stream.

**Returns:** *void*

Defined in: [host-one.ts:179](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L179)

___

### hookupMonitorStream

▸ **hookupMonitorStream**(): *void*

Adds handshake listener to monitor stream.

**Returns:** *void*

Defined in: [host-one.ts:287](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L287)

___

### hookupStreams

▸ **hookupStreams**(): *void*

Connects upstreams with downstreams.

**Returns:** *void*

Defined in: [host-one.ts:271](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L271)

___

### init

▸ **init**(`packageStream`: *ReadStream*, `appConfig`: AppConfig, `sequenceArgs?`: *any*[]): *void*

Initializes HostOne.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `packageStream` | *ReadStream* | sequence stream |
| `appConfig` | AppConfig | config file |
| `sequenceArgs?` | *any*[] | other optional arguments |

**Returns:** *void*

Defined in: [host-one.ts:147](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L147)

___

### kill

▸ **kill**(): *Promise*<void\>

Sends kill command via control stream.

**Returns:** *Promise*<void\>

Defined in: [host-one.ts:333](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L333)

___

### main

▸ **main**(): *Promise*<void\>

Starts all submodules.

**Returns:** *Promise*<void\>

Defined in: [host-one.ts:111](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L111)

___

### onSupervisorExit

▸ **onSupervisorExit**(`code`: *any*, `signal`: *any*): *Promise*<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | *any* |
| `signal` | *any* |

**Returns:** *Promise*<void\>

Defined in: [host-one.ts:407](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L407)

___

### stop

▸ **stop**(`timeout`: *number*, `canCallKeepalive`: *boolean*): *Promise*<void\>

Sends stop command via control stream.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `timeout` | *number* | The time the sequence has to respond. |
| `canCallKeepalive` | *boolean* | When true, sequence can ask to be allowed to run for additional period of time. |

**Returns:** *Promise*<void\>

Defined in: [host-one.ts:326](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L326)

___

### vorpalExec

▸ **vorpalExec**(`command`: *string*): *Promise*<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `command` | *string* |

**Returns:** *Promise*<void\>

Defined in: [host-one.ts:390](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host-one/src/host-one.ts#L390)
