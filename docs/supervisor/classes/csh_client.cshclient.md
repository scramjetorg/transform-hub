[@scramjet/supervisor](../README.md) / [csh-client](../modules/csh_client.md) / CSHClient

# Class: CSHClient

[csh-client](../modules/csh_client.md).CSHClient

## Hierarchy

* **CSHClient**

## Implements

* *ICSHClient*

## Table of contents

### Constructors

- [constructor](csh_client.cshclient.md#constructor)

### Properties

- [logger](csh_client.cshclient.md#logger)

### Methods

- [disconnect](csh_client.cshclient.md#disconnect)
- [getPackage](csh_client.cshclient.md#getpackage)
- [hookCommunicationHandler](csh_client.cshclient.md#hookcommunicationhandler)
- [init](csh_client.cshclient.md#init)

## Constructors

### constructor

\+ **new CSHClient**(`socketPath`: *string*): [*CSHClient*](csh_client.cshclient.md)

#### Parameters:

Name | Type |
------ | ------ |
`socketPath` | *string* |

**Returns:** [*CSHClient*](csh_client.cshclient.md)

Defined in: [csh-client.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/95cfb9f/packages/supervisor/src/lib/csh-client.ts#L23)

## Properties

### logger

• **logger**: Console

Defined in: [csh-client.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/95cfb9f/packages/supervisor/src/lib/csh-client.ts#L23)

## Methods

### disconnect

▸ **disconnect**(): *Promise*<*void*\>

**Returns:** *Promise*<*void*\>

Defined in: [csh-client.ts:84](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/95cfb9f/packages/supervisor/src/lib/csh-client.ts#L84)

___

### getPackage

▸ **getPackage**(): *ReadableStream*<*Buffer*\>

**Returns:** *ReadableStream*<*Buffer*\>

Defined in: [csh-client.ts:107](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/95cfb9f/packages/supervisor/src/lib/csh-client.ts#L107)

___

### hookCommunicationHandler

▸ **hookCommunicationHandler**(`communicationHandler`: *ICommunicationHandler*): *void*

#### Parameters:

Name | Type |
------ | ------ |
`communicationHandler` | *ICommunicationHandler* |

**Returns:** *void*

Defined in: [csh-client.ts:115](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/95cfb9f/packages/supervisor/src/lib/csh-client.ts#L115)

___

### init

▸ **init**(`id`: *string*): *Promise*<*void*\>

#### Parameters:

Name | Type |
------ | ------ |
`id` | *string* |

**Returns:** *Promise*<*void*\>

Defined in: [csh-client.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/95cfb9f/packages/supervisor/src/lib/csh-client.ts#L31)
