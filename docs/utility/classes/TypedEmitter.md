[@scramjet/utility](../README.md) / [Exports](../modules.md) / TypedEmitter

# Class: TypedEmitter<Events\>

Native Node.JS EventEmitter typed properly.

## Type parameters

| Name |
| :------ |
| `Events` |

## Hierarchy

- `TypedEventEmitter`<`Events`, `this`\>

  ↳ **`TypedEmitter`**

## Table of contents

### Methods

- [addListener](TypedEmitter.md#addlistener)
- [emit](TypedEmitter.md#emit)
- [eventNames](TypedEmitter.md#eventnames)
- [getMaxListeners](TypedEmitter.md#getmaxlisteners)
- [listenerCount](TypedEmitter.md#listenercount)
- [listeners](TypedEmitter.md#listeners)
- [off](TypedEmitter.md#off)
- [on](TypedEmitter.md#on)
- [once](TypedEmitter.md#once)
- [prependListener](TypedEmitter.md#prependlistener)
- [prependOnceListener](TypedEmitter.md#prependoncelistener)
- [rawListeners](TypedEmitter.md#rawlisteners)
- [removeAllListeners](TypedEmitter.md#removealllisteners)
- [removeListener](TypedEmitter.md#removelistener)
- [setMaxListeners](TypedEmitter.md#setmaxlisteners)

### Constructors

- [constructor](TypedEmitter.md#constructor)

## Methods

### addListener

▸ **addListener**<`E`\>(`event`, `listener`): [`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends `string` \| `number` \| `symbol` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Inherited from

(EventEmitter as { new<Events\>(): \_\_TypedEmitter<Events\> }).addListener

#### Defined in

node_modules/typed-emitter/index.d.ts:24

___

### emit

▸ **emit**<`E`\>(`event`, ...`args`): `boolean`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends `string` \| `number` \| `symbol` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `...args` | `Arguments`<`Events`[`E`]\> |

#### Returns

`boolean`

#### Inherited from

(EventEmitter as { new<Events\>(): \_\_TypedEmitter<Events\> }).emit

#### Defined in

node_modules/typed-emitter/index.d.ts:34

___

### eventNames

▸ **eventNames**(): (`string` \| `symbol` \| keyof `Events`)[]

#### Returns

(`string` \| `symbol` \| keyof `Events`)[]

#### Inherited from

(EventEmitter as { new<Events\>(): \_\_TypedEmitter<Events\> }).eventNames

#### Defined in

node_modules/typed-emitter/index.d.ts:35

___

### getMaxListeners

▸ **getMaxListeners**(): `number`

#### Returns

`number`

#### Inherited from

(EventEmitter as { new<Events\>(): \_\_TypedEmitter<Events\> }).getMaxListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:40

___

### listenerCount

▸ **listenerCount**<`E`\>(`event`): `number`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends `string` \| `number` \| `symbol` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |

#### Returns

`number`

#### Inherited from

(EventEmitter as { new<Events\>(): \_\_TypedEmitter<Events\> }).listenerCount

#### Defined in

node_modules/typed-emitter/index.d.ts:38

___

### listeners

▸ **listeners**<`E`\>(`event`): `Function`[]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends `string` \| `number` \| `symbol` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |

#### Returns

`Function`[]

#### Inherited from

(EventEmitter as { new<Events\>(): \_\_TypedEmitter<Events\> }).listeners

#### Defined in

node_modules/typed-emitter/index.d.ts:37

___

### off

▸ **off**<`E`\>(`event`, `listener`): [`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends `string` \| `number` \| `symbol` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Inherited from

(EventEmitter as { new<Events\>(): \_\_TypedEmitter<Events\> }).off

#### Defined in

node_modules/typed-emitter/index.d.ts:30

___

### on

▸ **on**<`E`\>(`event`, `listener`): [`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends `string` \| `number` \| `symbol` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Inherited from

(EventEmitter as { new<Events\>(): \_\_TypedEmitter<Events\> }).on

#### Defined in

node_modules/typed-emitter/index.d.ts:25

___

### once

▸ **once**<`E`\>(`event`, `listener`): [`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends `string` \| `number` \| `symbol` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Inherited from

(EventEmitter as { new<Events\>(): \_\_TypedEmitter<Events\> }).once

#### Defined in

node_modules/typed-emitter/index.d.ts:26

___

### prependListener

▸ **prependListener**<`E`\>(`event`, `listener`): [`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends `string` \| `number` \| `symbol` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Inherited from

(EventEmitter as { new<Events\>(): \_\_TypedEmitter<Events\> }).prependListener

#### Defined in

node_modules/typed-emitter/index.d.ts:27

___

### prependOnceListener

▸ **prependOnceListener**<`E`\>(`event`, `listener`): [`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends `string` \| `number` \| `symbol` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Inherited from

(EventEmitter as { new<Events\>(): \_\_TypedEmitter<Events\> }).prependOnceListener

#### Defined in

node_modules/typed-emitter/index.d.ts:28

___

### rawListeners

▸ **rawListeners**<`E`\>(`event`): `Function`[]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends `string` \| `number` \| `symbol` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |

#### Returns

`Function`[]

#### Inherited from

(EventEmitter as { new<Events\>(): \_\_TypedEmitter<Events\> }).rawListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:36

___

### removeAllListeners

▸ **removeAllListeners**<`E`\>(`event?`): [`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends `string` \| `number` \| `symbol` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `E` |

#### Returns

[`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Inherited from

(EventEmitter as { new<Events\>(): \_\_TypedEmitter<Events\> }).removeAllListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:31

___

### removeListener

▸ **removeListener**<`E`\>(`event`, `listener`): [`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends `string` \| `number` \| `symbol` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | `Events`[`E`] |

#### Returns

[`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Inherited from

(EventEmitter as { new<Events\>(): \_\_TypedEmitter<Events\> }).removeListener

#### Defined in

node_modules/typed-emitter/index.d.ts:32

___

### setMaxListeners

▸ **setMaxListeners**(`maxListeners`): [`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `maxListeners` | `number` |

#### Returns

[`TypedEmitter`](TypedEmitter.md)<`Events`\>

#### Inherited from

(EventEmitter as { new<Events\>(): \_\_TypedEmitter<Events\> }).setMaxListeners

#### Defined in

node_modules/typed-emitter/index.d.ts:41

## Constructors

### constructor

• **new TypedEmitter**<`Events`\>()

#### Type parameters

| Name |
| :------ |
| `Events` |

#### Inherited from

(EventEmitter as { new<Events\>(): \_\_TypedEmitter<Events\> })<Events\>.constructor

#### Defined in

[packages/utility/src/typed-emitter.ts:8](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/utility/src/typed-emitter.ts#L8)
