[@scramjet/host](../README.md) / [cpm-connector](../modules/cpm_connector.md) / CPMConnector

# Class: CPMConnector

[cpm-connector](../modules/cpm_connector.md).CPMConnector

## Hierarchy

- `EventEmitter`

  ↳ **`CPMConnector`**

## Table of contents

### Constructors

- [constructor](cpm_connector.CPMConnector.md#constructor)

### Properties

- [MAX\_CONNECTION\_ATTEMPTS](cpm_connector.CPMConnector.md#max_connection_attempts)
- [MAX\_RECONNECTION\_ATTEMPTS](cpm_connector.CPMConnector.md#max_reconnection_attempts)
- [RECONNECT\_INTERVAL](cpm_connector.CPMConnector.md#reconnect_interval)
- [communicationStream](cpm_connector.CPMConnector.md#communicationstream)
- [connection](cpm_connector.CPMConnector.md#connection)
- [connectionAttempts](cpm_connector.CPMConnector.md#connectionattempts)
- [cpmURL](cpm_connector.CPMConnector.md#cpmurl)
- [duplex](cpm_connector.CPMConnector.md#duplex)
- [info](cpm_connector.CPMConnector.md#info)
- [infoFilePath](cpm_connector.CPMConnector.md#infofilepath)
- [isReconnecting](cpm_connector.CPMConnector.md#isreconnecting)
- [logger](cpm_connector.CPMConnector.md#logger)
- [wasConnected](cpm_connector.CPMConnector.md#wasconnected)
- [captureRejectionSymbol](cpm_connector.CPMConnector.md#capturerejectionsymbol)
- [captureRejections](cpm_connector.CPMConnector.md#capturerejections)
- [defaultMaxListeners](cpm_connector.CPMConnector.md#defaultmaxlisteners)
- [errorMonitor](cpm_connector.CPMConnector.md#errormonitor)

### Methods

- [addListener](cpm_connector.CPMConnector.md#addlistener)
- [connect](cpm_connector.CPMConnector.md#connect)
- [emit](cpm_connector.CPMConnector.md#emit)
- [eventNames](cpm_connector.CPMConnector.md#eventnames)
- [getMaxListeners](cpm_connector.CPMConnector.md#getmaxlisteners)
- [getNetworkInfo](cpm_connector.CPMConnector.md#getnetworkinfo)
- [init](cpm_connector.CPMConnector.md#init)
- [listenerCount](cpm_connector.CPMConnector.md#listenercount)
- [listeners](cpm_connector.CPMConnector.md#listeners)
- [off](cpm_connector.CPMConnector.md#off)
- [on](cpm_connector.CPMConnector.md#on)
- [once](cpm_connector.CPMConnector.md#once)
- [prependListener](cpm_connector.CPMConnector.md#prependlistener)
- [prependOnceListener](cpm_connector.CPMConnector.md#prependoncelistener)
- [rawListeners](cpm_connector.CPMConnector.md#rawlisteners)
- [reconnect](cpm_connector.CPMConnector.md#reconnect)
- [removeAllListeners](cpm_connector.CPMConnector.md#removealllisteners)
- [removeListener](cpm_connector.CPMConnector.md#removelistener)
- [setMaxListeners](cpm_connector.CPMConnector.md#setmaxlisteners)
- [getEventListener](cpm_connector.CPMConnector.md#geteventlistener)
- [listenerCount](cpm_connector.CPMConnector.md#listenercount)
- [on](cpm_connector.CPMConnector.md#on)
- [once](cpm_connector.CPMConnector.md#once)

## Constructors

### constructor

• **new CPMConnector**(`cpmUrl`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `cpmUrl` | `string` |

#### Overrides

EventEmitter.constructor

#### Defined in

[packages/host/src/lib/cpm-connector.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L31)

## Properties

### MAX\_CONNECTION\_ATTEMPTS

• **MAX\_CONNECTION\_ATTEMPTS**: `number` = `5`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:16](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L16)

___

### MAX\_RECONNECTION\_ATTEMPTS

• **MAX\_RECONNECTION\_ATTEMPTS**: `number` = `10`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:17](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L17)

___

### RECONNECT\_INTERVAL

• **RECONNECT\_INTERVAL**: `number` = `5000`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:18](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L18)

___

### communicationStream

• `Optional` **communicationStream**: `StringStream`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:21](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L21)

___

### connection

• `Optional` **connection**: `ClientRequest`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:25](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L25)

___

### connectionAttempts

• **connectionAttempts**: `number` = `0`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:28](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L28)

___

### cpmURL

• **cpmURL**: `string`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:29](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L29)

___

### duplex

• `Optional` **duplex**: `DuplexStream`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L20)

___

### info

• **info**: `STHInformation` = `{}`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:24](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L24)

___

### infoFilePath

• **infoFilePath**: `string`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L23)

___

### isReconnecting

• **isReconnecting**: `boolean` = `false`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:26](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L26)

___

### logger

• **logger**: `Console`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L22)

___

### wasConnected

• **wasConnected**: `boolean` = `false`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:27](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L27)

___

### captureRejectionSymbol

▪ `Static` `Readonly` **captureRejectionSymbol**: typeof [`captureRejectionSymbol`](cpm_connector.CPMConnector.md#capturerejectionsymbol)

#### Inherited from

EventEmitter.captureRejectionSymbol

#### Defined in

node_modules/@types/node/events.d.ts:46

___

### captureRejections

▪ `Static` **captureRejections**: `boolean`

Sets or gets the default captureRejection value for all emitters.

#### Inherited from

EventEmitter.captureRejections

#### Defined in

node_modules/@types/node/events.d.ts:52

___

### defaultMaxListeners

▪ `Static` **defaultMaxListeners**: `number`

#### Inherited from

EventEmitter.defaultMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:53

___

### errorMonitor

▪ `Static` `Readonly` **errorMonitor**: typeof [`errorMonitor`](cpm_connector.CPMConnector.md#errormonitor)

This symbol shall be used to install a listener for only monitoring `'error'`
events. Listeners installed using this symbol are called before the regular
`'error'` listeners are called.

Installing a listener using this symbol does not change the behavior once an
`'error'` event is emitted, therefore the process will still crash if no
regular `'error'` listener is installed.

#### Inherited from

EventEmitter.errorMonitor

#### Defined in

node_modules/@types/node/events.d.ts:45

## Methods

### addListener

▸ **addListener**(`event`, `listener`): [`CPMConnector`](cpm_connector.CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CPMConnector`](cpm_connector.CPMConnector.md)

#### Inherited from

EventEmitter.addListener

#### Defined in

node_modules/@types/node/events.d.ts:72

___

### connect

▸ **connect**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:65](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L65)

___

### emit

▸ **emit**(`event`, ...`args`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `...args` | `any`[] |

#### Returns

`boolean`

#### Inherited from

EventEmitter.emit

#### Defined in

node_modules/@types/node/events.d.ts:82

___

### eventNames

▸ **eventNames**(): (`string` \| `symbol`)[]

#### Returns

(`string` \| `symbol`)[]

#### Inherited from

EventEmitter.eventNames

#### Defined in

node_modules/@types/node/events.d.ts:87

___

### getMaxListeners

▸ **getMaxListeners**(): `number`

#### Returns

`number`

#### Inherited from

EventEmitter.getMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:79

___

### getNetworkInfo

▸ **getNetworkInfo**(): `Promise`<`NetworkInfo`[]\>

#### Returns

`Promise`<`NetworkInfo`[]\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:150](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L150)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/cpm-connector.ts:38](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L38)

___

### listenerCount

▸ **listenerCount**(`event`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |

#### Returns

`number`

#### Inherited from

EventEmitter.listenerCount

#### Defined in

node_modules/@types/node/events.d.ts:83

___

### listeners

▸ **listeners**(`event`): `Function`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |

#### Returns

`Function`[]

#### Inherited from

EventEmitter.listeners

#### Defined in

node_modules/@types/node/events.d.ts:80

___

### off

▸ **off**(`event`, `listener`): [`CPMConnector`](cpm_connector.CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CPMConnector`](cpm_connector.CPMConnector.md)

#### Inherited from

EventEmitter.off

#### Defined in

node_modules/@types/node/events.d.ts:76

___

### on

▸ **on**(`event`, `listener`): [`CPMConnector`](cpm_connector.CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CPMConnector`](cpm_connector.CPMConnector.md)

#### Inherited from

EventEmitter.on

#### Defined in

node_modules/@types/node/events.d.ts:73

___

### once

▸ **once**(`event`, `listener`): [`CPMConnector`](cpm_connector.CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CPMConnector`](cpm_connector.CPMConnector.md)

#### Inherited from

EventEmitter.once

#### Defined in

node_modules/@types/node/events.d.ts:74

___

### prependListener

▸ **prependListener**(`event`, `listener`): [`CPMConnector`](cpm_connector.CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CPMConnector`](cpm_connector.CPMConnector.md)

#### Inherited from

EventEmitter.prependListener

#### Defined in

node_modules/@types/node/events.d.ts:85

___

### prependOnceListener

▸ **prependOnceListener**(`event`, `listener`): [`CPMConnector`](cpm_connector.CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CPMConnector`](cpm_connector.CPMConnector.md)

#### Inherited from

EventEmitter.prependOnceListener

#### Defined in

node_modules/@types/node/events.d.ts:86

___

### rawListeners

▸ **rawListeners**(`event`): `Function`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |

#### Returns

`Function`[]

#### Inherited from

EventEmitter.rawListeners

#### Defined in

node_modules/@types/node/events.d.ts:81

___

### reconnect

▸ **reconnect**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/cpm-connector.ts:123](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/cpm-connector.ts#L123)

___

### removeAllListeners

▸ **removeAllListeners**(`event?`): [`CPMConnector`](cpm_connector.CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `string` \| `symbol` |

#### Returns

[`CPMConnector`](cpm_connector.CPMConnector.md)

#### Inherited from

EventEmitter.removeAllListeners

#### Defined in

node_modules/@types/node/events.d.ts:77

___

### removeListener

▸ **removeListener**(`event`, `listener`): [`CPMConnector`](cpm_connector.CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`CPMConnector`](cpm_connector.CPMConnector.md)

#### Inherited from

EventEmitter.removeListener

#### Defined in

node_modules/@types/node/events.d.ts:75

___

### setMaxListeners

▸ **setMaxListeners**(`n`): [`CPMConnector`](cpm_connector.CPMConnector.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

[`CPMConnector`](cpm_connector.CPMConnector.md)

#### Inherited from

EventEmitter.setMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:78

___

### getEventListener

▸ `Static` **getEventListener**(`emitter`, `name`): `Function`[]

Returns a list listener for a specific emitter event name.

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `DOMEventTarget` \| `EventEmitter` |
| `name` | `string` \| `symbol` |

#### Returns

`Function`[]

#### Inherited from

EventEmitter.getEventListener

#### Defined in

node_modules/@types/node/events.d.ts:34

___

### listenerCount

▸ `Static` **listenerCount**(`emitter`, `event`): `number`

**`deprecated`** since v4.0.0

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `EventEmitter` |
| `event` | `string` \| `symbol` |

#### Returns

`number`

#### Inherited from

EventEmitter.listenerCount

#### Defined in

node_modules/@types/node/events.d.ts:30

___

### on

▸ `Static` **on**(`emitter`, `event`, `options?`): `AsyncIterableIterator`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `EventEmitter` |
| `event` | `string` |
| `options?` | `StaticEventEmitterOptions` |

#### Returns

`AsyncIterableIterator`<`any`\>

#### Inherited from

EventEmitter.on

#### Defined in

node_modules/@types/node/events.d.ts:27

___

### once

▸ `Static` **once**(`emitter`, `event`, `options?`): `Promise`<`any`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `NodeEventTarget` |
| `event` | `string` \| `symbol` |
| `options?` | `StaticEventEmitterOptions` |

#### Returns

`Promise`<`any`[]\>

#### Inherited from

EventEmitter.once

#### Defined in

node_modules/@types/node/events.d.ts:25

▸ `Static` **once**(`emitter`, `event`, `options?`): `Promise`<`any`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `DOMEventTarget` |
| `event` | `string` |
| `options?` | `StaticEventEmitterOptions` |

#### Returns

`Promise`<`any`[]\>

#### Inherited from

EventEmitter.once

#### Defined in

node_modules/@types/node/events.d.ts:26
