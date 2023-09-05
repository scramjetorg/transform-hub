[@scramjet/verser](../README.md) / [Exports](../modules.md) / Verser

# Class: Verser

Verser class.

When instanced it sets up a listener for incoming "CONNECT" connections on the provided server.
When a new connection is received it emits "connect" event with VerserConnection instance

## Hierarchy

- `TypedEmitter`<`Events`\>

  ↳ **`Verser`**

## Table of contents

### Methods

- [addListener](Verser.md#addlistener)
- [disconnect](Verser.md#disconnect)
- [emit](Verser.md#emit)
- [eventNames](Verser.md#eventnames)
- [getMaxListeners](Verser.md#getmaxlisteners)
- [listenerCount](Verser.md#listenercount)
- [listeners](Verser.md#listeners)
- [off](Verser.md#off)
- [on](Verser.md#on)
- [once](Verser.md#once)
- [prependListener](Verser.md#prependlistener)
- [prependOnceListener](Verser.md#prependoncelistener)
- [rawListeners](Verser.md#rawlisteners)
- [removeAllListeners](Verser.md#removealllisteners)
- [removeListener](Verser.md#removelistener)
- [setMaxListeners](Verser.md#setmaxlisteners)
- [stop](Verser.md#stop)

### Constructors

- [constructor](Verser.md#constructor)

### Properties

- [logger](Verser.md#logger)

## Methods

### addListener

▸ **addListener**<`E`\>(`event`, `listener`): [`Verser`](Verser.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`Verser`](Verser.md)

#### Inherited from

TypedEmitter.addListener

#### Defined in

node_modules/typed-emitter/index.d.ts:24

___

### disconnect

▸ **disconnect**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/verser/src/lib/verser.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser.ts#L43)

___

### emit

▸ **emit**<`E`\>(`event`, ...`args`): `boolean`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `...args` | `Arguments`<`Events`[`E`]\> |

#### Returns

`boolean`

#### Inherited from

TypedEmitter.emit

#### Defined in

node_modules/typed-emitter/index.d.ts:34

___

### eventNames

▸ **eventNames**(): (`string` \| `symbol`)[]

#### Returns

(`string` \| `symbol`)[]

#### Inherited from

TypedEmitter.eventNames

#### Defined in

node_modules/typed-emitter/index.d.ts:35

___

### getMaxListeners

▸ **getMaxListeners**(): `number`

#### Returns

`number`

#### Inherited from

TypedEmitter.getMaxListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:40

___

### listenerCount

▸ **listenerCount**<`E`\>(`event`): `number`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |

#### Returns

`number`

#### Inherited from

TypedEmitter.listenerCount

#### Defined in

node_modules/typed-emitter/index.d.ts:38

___

### listeners

▸ **listeners**<`E`\>(`event`): `Function`[]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |

#### Returns

`Function`[]

#### Inherited from

TypedEmitter.listeners

#### Defined in

node_modules/typed-emitter/index.d.ts:37

___

### off

▸ **off**<`E`\>(`event`, `listener`): [`Verser`](Verser.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`Verser`](Verser.md)

#### Inherited from

TypedEmitter.off

#### Defined in

node_modules/typed-emitter/index.d.ts:30

___

### on

▸ **on**<`E`\>(`event`, `listener`): [`Verser`](Verser.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`Verser`](Verser.md)

#### Inherited from

TypedEmitter.on

#### Defined in

node_modules/typed-emitter/index.d.ts:25

___

### once

▸ **once**<`E`\>(`event`, `listener`): [`Verser`](Verser.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`Verser`](Verser.md)

#### Inherited from

TypedEmitter.once

#### Defined in

node_modules/typed-emitter/index.d.ts:26

___

### prependListener

▸ **prependListener**<`E`\>(`event`, `listener`): [`Verser`](Verser.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`Verser`](Verser.md)

#### Inherited from

TypedEmitter.prependListener

#### Defined in

node_modules/typed-emitter/index.d.ts:27

___

### prependOnceListener

▸ **prependOnceListener**<`E`\>(`event`, `listener`): [`Verser`](Verser.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`Verser`](Verser.md)

#### Inherited from

TypedEmitter.prependOnceListener

#### Defined in

node_modules/typed-emitter/index.d.ts:28

___

### rawListeners

▸ **rawListeners**<`E`\>(`event`): `Function`[]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |

#### Returns

`Function`[]

#### Inherited from

TypedEmitter.rawListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:36

___

### removeAllListeners

▸ **removeAllListeners**<`E`\>(`event?`): [`Verser`](Verser.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `E` |

#### Returns

[`Verser`](Verser.md)

#### Inherited from

TypedEmitter.removeAllListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:31

___

### removeListener

▸ **removeListener**<`E`\>(`event`, `listener`): [`Verser`](Verser.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends ``"connect"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`Verser`](Verser.md)

#### Inherited from

TypedEmitter.removeListener

#### Defined in

node_modules/typed-emitter/index.d.ts:32

___

### setMaxListeners

▸ **setMaxListeners**(`maxListeners`): [`Verser`](Verser.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `maxListeners` | `number` |

#### Returns

[`Verser`](Verser.md)

#### Inherited from

TypedEmitter.setMaxListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:41

___

### stop

▸ **stop**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/verser/src/lib/verser.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser.ts#L49)

## Constructors

### constructor

• **new Verser**(`server`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `server` | `Server` |

#### Overrides

TypedEmitter&lt;Events\&gt;.constructor

#### Defined in

[packages/verser/src/lib/verser.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser.ts#L23)

## Properties

### logger

• **logger**: `ObjLogger`

#### Defined in

[packages/verser/src/lib/verser.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/verser/src/lib/verser.ts#L21)
