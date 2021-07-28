[@scramjet/supervisor](../README.md) / [csh-client](../modules/csh_client.md) / CSHClient

# Class: CSHClient

[csh-client](../modules/csh_client.md).CSHClient

## Implements

- `ICSHClient`

## Table of contents

### Constructors

- [constructor](csh_client.CSHClient.md#constructor)

### Properties

- [logger](csh_client.CSHClient.md#logger)

### Methods

- [disconnect](csh_client.CSHClient.md#disconnect)
- [getPackage](csh_client.CSHClient.md#getpackage)
- [hookCommunicationHandler](csh_client.CSHClient.md#hookcommunicationhandler)
- [init](csh_client.CSHClient.md#init)

## Constructors

### constructor

• **new CSHClient**(`socketPath`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `socketPath` | `string` |

#### Defined in

[csh-client.ts:25](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/supervisor/src/lib/csh-client.ts#L25)

## Properties

### logger

• **logger**: `Console`

#### Implementation of

ICSHClient.logger

#### Defined in

[csh-client.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/supervisor/src/lib/csh-client.ts#L23)

## Methods

### disconnect

▸ **disconnect**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ICSHClient.disconnect

#### Defined in

[csh-client.ts:89](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/supervisor/src/lib/csh-client.ts#L89)

___

### getPackage

▸ **getPackage**(): `ReadableStream`<`Buffer`\>

#### Returns

`ReadableStream`<`Buffer`\>

#### Defined in

[csh-client.ts:111](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/supervisor/src/lib/csh-client.ts#L111)

___

### hookCommunicationHandler

▸ **hookCommunicationHandler**(`communicationHandler`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `communicationHandler` | `ICommunicationHandler` |

#### Returns

`void`

#### Implementation of

ICSHClient.hookCommunicationHandler

#### Defined in

[csh-client.ts:119](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/supervisor/src/lib/csh-client.ts#L119)

___

### init

▸ **init**(`id`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`Promise`<`void`\>

#### Implementation of

ICSHClient.init

#### Defined in

[csh-client.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/supervisor/src/lib/csh-client.ts#L31)
