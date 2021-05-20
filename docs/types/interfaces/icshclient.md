[@scramjet/types](../README.md) / ICSHClient

# Interface: ICSHClient

## Hierarchy

* [*IComponent*](icomponent.md)

  ↳ **ICSHClient**

## Table of contents

### Properties

- [logger](icshclient.md#logger)

### Methods

- [disconnect](icshclient.md#disconnect)
- [getPackage](icshclient.md#getpackage)
- [hookCommunicationHandler](icshclient.md#hookcommunicationhandler)
- [init](icshclient.md#init)

## Properties

### logger

• **logger**: Console

Inherited from: [IComponent](icomponent.md).[logger](icomponent.md#logger)

Defined in: [packages/types/src/component.ts:2](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/component.ts#L2)

## Methods

### disconnect

▸ **disconnect**(): *Promise*<*void*\>

Disconnects from a host server.

**Returns:** *Promise*<*void*\>

Defined in: [packages/types/src/csh-connector.ts:34](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/csh-connector.ts#L34)

___

### getPackage

▸ **getPackage**(): [*ReadableStream*](readablestream.md)<*Buffer*\>

Load file with sequence (for example zipped file) from ENV and return it as a stream.
Temporary the file is taken from declared path on local machine.

**Returns:** [*ReadableStream*](readablestream.md)<*Buffer*\>

stream with file sequence

Defined in: [packages/types/src/csh-connector.ts:29](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/csh-connector.ts#L29)

___

### hookCommunicationHandler

▸ **hookCommunicationHandler**(`communicationHandler`: [*ICommunicationHandler*](icommunicationhandler.md)): *MaybePromise*<*void*\>

Create array of streams on LCC demand than hook streams.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`communicationHandler` | [*ICommunicationHandler*](icommunicationhandler.md) |  Temporary log streams to the console.    |

**Returns:** *MaybePromise*<*void*\>

Defined in: [packages/types/src/csh-connector.ts:21](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/csh-connector.ts#L21)

___

### init

▸ **init**(`id`: *string*): *MaybePromise*<*void*\>

Initializes the client

#### Parameters:

Name | Type |
------ | ------ |
`id` | *string* |

**Returns:** *MaybePromise*<*void*\>

Defined in: [packages/types/src/csh-connector.ts:14](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/csh-connector.ts#L14)
