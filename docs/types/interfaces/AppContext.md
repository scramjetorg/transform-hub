[@scramjet/types](../README.md) / [Exports](../modules.md) / AppContext

# Interface: AppContext<AppConfigType, State\>

Object of this interface is passed to Application context and allows it to communicate
with the Platform to ensure that it's in operation and should be kept alive without
interruption.

## Type parameters

| Name | Type |
| :------ | :------ |
| `AppConfigType` | extends [`AppConfig`](../modules.md#appconfig) |
| `State` | extends `any` |

## Table of contents

### Properties

- [AppError](AppContext.md#apperror)
- [config](AppContext.md#config)
- [definition](AppContext.md#definition)
- [exitTimeout](AppContext.md#exittimeout)
- [hub](AppContext.md#hub)
- [initialState](AppContext.md#initialstate)
- [instanceId](AppContext.md#instanceid)
- [logger](AppContext.md#logger)
- [space](AppContext.md#space)

### Methods

- [addKillHandler](AppContext.md#addkillhandler)
- [addMonitoringHandler](AppContext.md#addmonitoringhandler)
- [addStopHandler](AppContext.md#addstophandler)
- [describe](AppContext.md#describe)
- [destroy](AppContext.md#destroy)
- [emit](AppContext.md#emit)
- [end](AppContext.md#end)
- [keepAlive](AppContext.md#keepalive)
- [on](AppContext.md#on)
- [save](AppContext.md#save)

## Properties

### AppError

• `Readonly` **AppError**: [`AppErrorConstructor`](../modules.md#apperrorconstructor)

#### Defined in

[packages/types/src/app-context.ts:178](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L178)

___

### config

• `Readonly` **config**: `AppConfigType`

#### Defined in

[packages/types/src/app-context.ts:177](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L177)

___

### definition

• **definition**: [`FunctionDefinition`](../modules.md#functiondefinition)

Provides automated definition as understood by the system

#### Defined in

[packages/types/src/app-context.ts:168](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L168)

___

### exitTimeout

• **exitTimeout**: `number`

Allows setting timeout in millis to exit the sequence after exit called (default 10000)

#### Defined in

[packages/types/src/app-context.ts:181](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L181)

___

### hub

• **hub**: [`HostClient`](../classes/HostClient.md)

Allows to access Hub, for datails please refer to @scramjet/api-client

#### Defined in

[packages/types/src/app-context.ts:184](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L184)

___

### initialState

• `Optional` **initialState**: `State`

Holds the previous state if there was a previous process in existence and it called the
this#save.

#### Defined in

[packages/types/src/app-context.ts:144](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L144)

___

### instanceId

• **instanceId**: `string`

Instance Id

#### Defined in

[packages/types/src/app-context.ts:190](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L190)

___

### logger

• **logger**: [`IObjectLogger`](IObjectLogger.md)

#### Defined in

[packages/types/src/app-context.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L37)

___

### space

• **space**: `ManagerClient`

Allows to access Space, for datails please refer to @scramjet/manager-api-client

#### Defined in

[packages/types/src/app-context.ts:187](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L187)

## Methods

### addKillHandler

▸ **addKillHandler**(`handler`): [`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

This method can be overridden to handle the kill signal from the Runner and perform
the final cleanup. This method is synchronous and once it's exits the process will be
synchronously terminated.

The method can call @{see this.state} as many times as it likes, the value from the
last call will be made sure to be saved before the process will be terminated.

If this methods fails to exit within `100 ms` the process will be forcefully terminated
and the data will be lost.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `handler` | [`KillHandler`](../modules.md#killhandler) | the handler callback |

#### Returns

[`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

#### Defined in

[packages/types/src/app-context.ts:80](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L80)

___

### addMonitoringHandler

▸ **addMonitoringHandler**(`handler`): [`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

This method should be overridden by the Sequence if auto detection of the Sequence
state is not precise enough.

The Runner will call this message periodically to obtain information on the
condition of the Sequence.

If not provided, a monitoring function will be determined based on the
return value from the Sequence.

#### Parameters

| Name | Type |
| :------ | :------ |
| `handler` | [`MonitoringHandler`](../modules.md#monitoringhandler) |

#### Returns

[`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

#### Defined in

[packages/types/src/app-context.ts:49](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L49)

___

### addStopHandler

▸ **addStopHandler**(`item`): [`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

This method can be overridden to handle the stop signal from the Runner and perform
a graceful shutdown. The platform will provide a grace period in order to save current
work and provide.

This method can be called under two conditions:
* the Instance will be terminated for extraneous reasons
* the Instance was not able to confirm if the Sequence is alive

The method can call @{see this.state} as many times as it likes, the value from the
last call will be made sure to be saved before the process will be terminated.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `item` | [`StopHandler`](../modules.md#stophandler) | the handler callback |

#### Returns

[`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

#### Defined in

[packages/types/src/app-context.ts:65](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L65)

___

### describe

▸ **describe**(`definition`): [`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

Allows overriding the function definition from within the code

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `definition` | [`FunctionDefinition`](../modules.md#functiondefinition) | the actual definition |

#### Returns

[`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

#### Defined in

[packages/types/src/app-context.ts:175](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L175)

___

### destroy

▸ **destroy**(`error?`): [`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

Calling this method will inform the Instance that the Sequence has encountered a fatal
exception and should not be kept alive.

If the Sequence is Writable or Inert then it will call the stopHandler immediately.
If the Sequence is Readable of Transform then it will call the stopHandler when any
error occurs on the readable side or it reaches end and all the data is passed to the
neighbors.

This method will be called automatically when the readable side of the Sequence errors
out.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `error?` | [`AppError`](../modules.md#apperror) | optional error object for inspection |

#### Returns

[`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

#### Defined in

[packages/types/src/app-context.ts:127](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L127)

___

### emit

▸ **emit**(`ev`, `message?`): [`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

Sends event from the Instance that can be received by CLI and configured actions

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `ev` | `string` | event name |
| `message?` | `any` | any serializable object |

#### Returns

[`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

#### Defined in

[packages/types/src/app-context.ts:162](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L162)

▸ **emit**(`ev`, `message`): [`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `ev` | ``"error"`` |
| `message` | [`AppError`](../modules.md#apperror) |

#### Returns

[`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

#### Defined in

[packages/types/src/app-context.ts:163](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L163)

___

### end

▸ **end**(): [`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

Calling this method will inform the Instance that the Sequence has completed the
operation and can be gracefully terminated.

If the Sequence is Writable or Inert then it will call the stopHandler immediately.
If the Sequence is Readable of Transform then it will call the stopHandler when all the
data is passed to the neighbors.

This method will be called automatically when the readable side of the Sequence ends.

#### Returns

[`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

#### Defined in

[packages/types/src/app-context.ts:111](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L111)

___

### keepAlive

▸ **keepAlive**(`milliseconds?`): [`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

The Sequence may call this process in order to confirm continued operation and provide
an information on how long the Sequence should not be considered stale.

Sequences that expose read or write functions do not need to call this when the data
is flowing.

If the platform finds no indication that the Sequence is still alive it will attempt to
stop it.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `milliseconds?` | `number` | provides information on how long the process should wait before assuming that the Sequence is stale and attempt to kill it. If the method is called after AutoAppContext.addStopHandler \| stop has been issued this parameter value should not exceed the given timeout and another stop command will be called again when the lower |

#### Returns

[`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

#### Defined in

[packages/types/src/app-context.ts:99](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L99)

___

### on

▸ **on**(`ev`, `handler`): [`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

Adds event handler for events that can be sent by CLI and configured
actions.

#### Parameters

| Name | Type |
| :------ | :------ |
| `ev` | `string` |
| `handler` | (`message?`: `any`) => `void` |

#### Returns

[`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

#### Defined in

[packages/types/src/app-context.ts:153](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L153)

▸ **on**(`ev`, `handler`): [`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `ev` | ``"error"`` |
| `handler` | (`message`: `Error`) => `void` |

#### Returns

[`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

#### Defined in

[packages/types/src/app-context.ts:154](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L154)

___

### save

▸ **save**(`state`): [`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

This method can be used to ensure that the data is passed here will be stored for
another process. The operation is synchronous and blocking.

You can call the method as many times as you want, the last state will be safely
passed to the process that will take over after this one is terminated.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `state` | `State` | any serializable value |

#### Returns

[`AppContext`](AppContext.md)<`AppConfigType`, `State`\>

#### Defined in

[packages/types/src/app-context.ts:138](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/app-context.ts#L138)
