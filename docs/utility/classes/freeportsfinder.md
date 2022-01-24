[@scramjet/utility](../README.md) / [Exports](../modules.md) / FreePortsFinder

# Class: FreePortsFinder

Provides methods to find free tcp/udp ports.

## Table of contents

### Methods

- [checkTCPPort](freeportsfinder.md#checktcpport)
- [checkUDPPort](freeportsfinder.md#checkudpport)
- [getPorts](freeportsfinder.md#getports)

### Constructors

- [constructor](freeportsfinder.md#constructor)

## Methods

### checkTCPPort

▸ `Static` **checkTCPPort**(`port`): `Promise`<`boolean`\>

Check if port is available for tcp.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `port` | `number` | Port number. |

#### Returns

`Promise`<`boolean`\>

Promise resolving to true if port is available, false otherwise.

#### Defined in

[packages/utility/src/free-ports-finder.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/free-ports-finder.ts#L14)

___

### checkUDPPort

▸ `Static` **checkUDPPort**(`port`): `Promise`<`boolean`\>

Check if port is available for udp.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `port` | `number` | Port number. |

#### Returns

`Promise`<`boolean`\>

Promise resolving to true if port is available, false otherwise.

#### Defined in

[packages/utility/src/free-ports-finder.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/free-ports-finder.ts#L40)

___

### getPorts

▸ `Static` **getPorts**(`portsCount`, `min`, `max`): `Promise`<`number`[]\>

Finds desired amount of free ports in the given range. If there are not enough free ports, error is thrown.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `portsCount` | `number` | How many ports to find. |
| `min` | `number` | Starting port number. |
| `max` | `number` | Ending port number. |

#### Returns

`Promise`<`number`[]\>

Promise resolving to array of free ports.

#### Defined in

[packages/utility/src/free-ports-finder.ts:68](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/free-ports-finder.ts#L68)

## Constructors

### constructor

• **new FreePortsFinder**()
