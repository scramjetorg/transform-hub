[@scramjet/types](../README.md) / ICSHClient

# Interface: ICSHClient

## Hierarchy

- [*IComponent*](icomponent.md)

  ↳ **ICSHClient**

## Table of contents

### Properties

- [logger](icshclient.md#logger)

### Methods

- [disconnect](icshclient.md#disconnect)
- [hookCommunicationHandler](icshclient.md#hookcommunicationhandler)
- [init](icshclient.md#init)

## Properties

### logger

• **logger**: Console

Inherited from: [IComponent](icomponent.md).[logger](icomponent.md#logger)

Defined in: [packages/types/src/component.ts:2](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/types/src/component.ts#L2)

## Methods

### disconnect

▸ **disconnect**(): *Promise*<void\>

Disconnects from a host server.

**Returns:** *Promise*<void\>

Defined in: [packages/types/src/csh-connector.ts:26](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/types/src/csh-connector.ts#L26)

___

### hookCommunicationHandler

▸ **hookCommunicationHandler**(`communicationHandler`: [*ICommunicationHandler*](icommunicationhandler.md)): *MaybePromise*<void\>

Create array of streams on LCC demand than hook streams.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `communicationHandler` | [*ICommunicationHandler*](icommunicationhandler.md) | Temporary log streams to the console. |

**Returns:** *MaybePromise*<void\>

Defined in: [packages/types/src/csh-connector.ts:21](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/types/src/csh-connector.ts#L21)

___

### init

▸ **init**(`id`: *string*): *MaybePromise*<void\>

Initializes the client

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | *string* |

**Returns:** *MaybePromise*<void\>

Defined in: [packages/types/src/csh-connector.ts:14](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/types/src/csh-connector.ts#L14)
