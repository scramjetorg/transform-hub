[@scramjet/utility](../README.md) / FreePortsFinder

# Class: FreePortsFinder

## Table of contents

### Constructors

- [constructor](freeportsfinder.md#constructor)

### Methods

- [checkTCPPort](freeportsfinder.md#checktcpport)
- [checkUDPPort](freeportsfinder.md#checkudpport)
- [getPorts](freeportsfinder.md#getports)

## Constructors

### constructor

• **new FreePortsFinder**()

## Methods

### checkTCPPort

▸ `Static` **checkTCPPort**(`port`): `Promise`<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `port` | `number` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[free-ports-finder.ts:5](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/free-ports-finder.ts#L5)

___

### checkUDPPort

▸ `Static` **checkUDPPort**(`port`): `Promise`<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `port` | `number` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[free-ports-finder.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/free-ports-finder.ts#L25)

___

### getPorts

▸ `Static` **getPorts**(`portsCount`, `min`, `max`): `Promise`<`number`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `portsCount` | `number` |
| `min` | `number` |
| `max` | `number` |

#### Returns

`Promise`<`number`[]\>

#### Defined in

[free-ports-finder.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/free-ports-finder.ts#L45)
