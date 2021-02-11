[@scramjet/types](../README.md) / [Exports](../modules.md) / App2Context

# Interface: App2Context<AppConfigType\>

## Type parameters

Name | Type |
------ | ------ |
`AppConfigType` | [*AppConfig*](../modules.md#appconfig) |

## Hierarchy

* **App2Context**

## Table of contents

### Properties

- [AppError](app2context.md#apperror)
- [config](app2context.md#config)
- [definition](app2context.md#definition)
- [describe](app2context.md#describe)
- [killHandler](app2context.md#killhandler)
- [monitor](app2context.md#monitor)
- [stopHandler](app2context.md#stophandler)

### Methods

- [destroy](app2context.md#destroy)
- [emit](app2context.md#emit)
- [end](app2context.md#end)
- [keepAlive](app2context.md#keepalive)
- [on](app2context.md#on)

## Properties

### AppError

• `Readonly` **AppError**: AppErrorConstructor

Defined in: [runner.ts:211](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L211)

___

### config

• `Readonly` **config**: AppConfigType

Defined in: [runner.ts:210](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L210)

___

### definition

• `Optional` **definition**: *undefined* \| [*SequenceDefinition*](../modules.md#sequencedefinition)[]

Defined in: [runner.ts:209](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L209)

___

### describe

• `Optional` **describe**: *undefined* \| (`tx`: [*SequenceDefinition*](../modules.md#sequencedefinition)[]) => *void*

Defined in: [runner.ts:194](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L194)

___

### killHandler

• `Optional` **killHandler**: *undefined* \| () => *Promise*<*void*\>

Defined in: [runner.ts:197](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L197)

___

### monitor

• `Optional` **monitor**: *undefined* \| (`resp`: [*MonitoringResponse*](../modules.md#monitoringresponse)) => *MaybePromise*<[*MonitoringResponse*](../modules.md#monitoringresponse)\>

Defined in: [runner.ts:193](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L193)

___

### stopHandler

• `Optional` **stopHandler**: *undefined* \| () => *Promise*<*void*\>

Defined in: [runner.ts:196](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L196)

## Methods

### destroy

▸ **destroy**(): [*App2Context*](app2context.md)<AppConfigType\>

**Returns:** [*App2Context*](app2context.md)<AppConfigType\>

Defined in: [runner.ts:201](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L201)

___

### emit

▸ **emit**(`ev`: *string*, `message?`: *any*): [*App2Context*](app2context.md)<AppConfigType\>

#### Parameters:

Name | Type |
------ | ------ |
`ev` | *string* |
`message?` | *any* |

**Returns:** [*App2Context*](app2context.md)<AppConfigType\>

Defined in: [runner.ts:206](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L206)

▸ **emit**(`ev`: *error*, `message`: [*AppError*](../modules.md#apperror)): [*App2Context*](app2context.md)<AppConfigType\>

#### Parameters:

Name | Type |
------ | ------ |
`ev` | *error* |
`message` | [*AppError*](../modules.md#apperror) |

**Returns:** [*App2Context*](app2context.md)<AppConfigType\>

Defined in: [runner.ts:207](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L207)

___

### end

▸ **end**(): [*App2Context*](app2context.md)<AppConfigType\>

**Returns:** [*App2Context*](app2context.md)<AppConfigType\>

Defined in: [runner.ts:200](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L200)

___

### keepAlive

▸ **keepAlive**(`milliseconds?`: *number*): [*App2Context*](app2context.md)<AppConfigType\>

#### Parameters:

Name | Type |
------ | ------ |
`milliseconds?` | *number* |

**Returns:** [*App2Context*](app2context.md)<AppConfigType\>

Defined in: [runner.ts:199](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L199)

___

### on

▸ **on**(`ev`: *string*, `handler`: (`message?`: *any*) => *void*): [*App2Context*](app2context.md)<AppConfigType\>

#### Parameters:

Name | Type |
------ | ------ |
`ev` | *string* |
`handler` | (`message?`: *any*) => *void* |

**Returns:** [*App2Context*](app2context.md)<AppConfigType\>

Defined in: [runner.ts:203](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L203)

▸ **on**(`ev`: *error*, `handler`: (`message`: Error) => *void*): [*App2Context*](app2context.md)<AppConfigType\>

#### Parameters:

Name | Type |
------ | ------ |
`ev` | *error* |
`handler` | (`message`: Error) => *void* |

**Returns:** [*App2Context*](app2context.md)<AppConfigType\>

Defined in: [runner.ts:204](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L204)
