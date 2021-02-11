[@scramjet/types](README.md) / Exports

# @scramjet/types

## Table of contents

### Enumerations

- [RunnerMessageCode](enums/runnermessagecode.md)

### Interfaces

- [App2Context](interfaces/app2context.md)
- [ReadableStream](interfaces/readablestream.md)
- [WritableStream](interfaces/writablestream.md)

### Type aliases

- [AppConfig](modules.md#appconfig)
- [AppError](modules.md#apperror)
- [AppErrorCode](modules.md#apperrorcode)
- [Application](modules.md#application)
- [ApplicationExpose](modules.md#applicationexpose)
- [InertApp](modules.md#inertapp)
- [InertSequence](modules.md#inertsequence)
- [MonitoringResponse](modules.md#monitoringresponse)
- [RFunction](modules.md#rfunction)
- [ReadFunction](modules.md#readfunction)
- [ReadSequence](modules.md#readsequence)
- [ReadableApp](modules.md#readableapp)
- [RunnerMessage](modules.md#runnermessage)
- [RunnerOptions](modules.md#runneroptions)
- [SequenceDefinition](modules.md#sequencedefinition)
- [SequenceStatus](modules.md#sequencestatus)
- [Streamable](modules.md#streamable)
- [TFunction](modules.md#tfunction)
- [TranformFunction](modules.md#tranformfunction)
- [TransformApp](modules.md#transformapp)
- [TransformSeqence](modules.md#transformseqence)
- [WFunction](modules.md#wfunction)
- [WritableApp](modules.md#writableapp)
- [WriteFunction](modules.md#writefunction)
- [WriteSequence](modules.md#writesequence)

## Type aliases

### AppConfig

Ƭ **AppConfig**: { [key: string]: *null* \| *string* \| *number* \| *boolean* \| [*AppConfig*](modules.md#appconfig);  }

Defined in: [runner.ts:171](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L171)

___

### AppError

Ƭ **AppError**: Error & { `code`: [*AppErrorCode*](modules.md#apperrorcode) ; `exitcode?`: *number*  }

Defined in: [runner.ts:179](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L179)

___

### AppErrorCode

Ƭ **AppErrorCode**: *GENERAL_ERROR* \| *COMPILE_ERROR* \| *SEQUENCE_MISCONFIGURED*

Defined in: [runner.ts:173](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L173)

___

### Application

Ƭ **Application**<Consumes, Produces, Z, AppConfigType\>: [*TransformApp*](modules.md#transformapp)<Consumes, Produces, Z, AppConfigType\> \| [*ReadableApp*](modules.md#readableapp)<Produces, Z, AppConfigType\> \| [*WritableApp*](modules.md#writableapp)<Consumes, Z, AppConfigType\> \| [*InertApp*](modules.md#inertapp)<Z\> \| [*ApplicationExpose*](modules.md#applicationexpose)<Consumes, Produces, Z, AppConfigType\>

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | *any* |
`Produces` | - | *any* |
`Z` | *any*[] | *any*[] |
`AppConfigType` | [*AppConfig*](modules.md#appconfig) | [*AppConfig*](modules.md#appconfig) |

Defined in: [runner.ts:266](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L266)

___

### ApplicationExpose

Ƭ **ApplicationExpose**<Consumes, Produces, Z, AppConfigType\>: { `__@exposeSequenceSymbol@3650`: [*Application*](modules.md#application)<Consumes, Produces, Z, AppConfigType\>  }

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | *any* |
`Produces` | - | *any* |
`Z` | *any*[] | *any*[] |
`AppConfigType` | [*AppConfig*](modules.md#appconfig) | [*AppConfig*](modules.md#appconfig) |

#### Type declaration:

Name | Type |
------ | ------ |
`__@exposeSequenceSymbol@3650` | [*Application*](modules.md#application)<Consumes, Produces, Z, AppConfigType\> |

Defined in: [runner.ts:257](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L257)

___

### InertApp

Ƭ **InertApp**<Z, AppConfigType\>: (`this`: [*App2Context*](interfaces/app2context.md)<AppConfigType\>, `source`: [*ReadableStream*](interfaces/readablestream.md)<*void*\>, ...`args`: Z) => *MaybePromise*<[*WFunction*](modules.md#wfunction)<*void*\> \| [*WriteSequence*](modules.md#writesequence)<*void*\> \| *void*\>

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Z` | *any*[] | *any*[] |
`AppConfigType` | [*AppConfig*](modules.md#appconfig) | [*AppConfig*](modules.md#appconfig) |

Defined in: [runner.ts:249](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L249)

___

### InertSequence

Ƭ **InertSequence**<Z, Y, X\>: *TFunctionChain*<Y, Z, X\>

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Z` | - | *any* |
`Y` | - | *any* |
`X` | *any*[] | *any*[] |

Defined in: [runner.ts:132](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L132)

___

### MonitoringResponse

Ƭ **MonitoringResponse**: { `healthy?`: *boolean* ; `sequences?`: [*SequenceStatus*](modules.md#sequencestatus)[]  }

#### Type declaration:

Name | Type |
------ | ------ |
`healthy?` | *boolean* |
`sequences?` | [*SequenceStatus*](modules.md#sequencestatus)[] |

Defined in: [runner.ts:166](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L166)

___

### RFunction

Ƭ **RFunction**<Produces\>: [*Streamable*](modules.md#streamable)<Produces\> \| [*ReadFunction*](modules.md#readfunction)<Produces\>

#### Type parameters:

Name |
------ |
`Produces` |

Defined in: [runner.ts:99](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L99)

___

### ReadFunction

Ƭ **ReadFunction**<Produces\>: (...`parameters`: *any*[]) => *StreambleMaybeFunction*<Produces\>

#### Type parameters:

Name |
------ |
`Produces` |

Defined in: [runner.ts:94](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L94)

___

### ReadSequence

Ƭ **ReadSequence**<Produces, Y, Z\>: [[*RFunction*](modules.md#rfunction)<Produces\>] \| [[*RFunction*](modules.md#rfunction)<Z\>, ...TFunctionChain<Z, Produces, Y\>]

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Produces` | - | - |
`Y` | *any*[] | *any*[] |
`Z` | - | *any* |

Defined in: [runner.ts:140](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L140)

___

### ReadableApp

Ƭ **ReadableApp**<Produces, Z, AppConfigType\>: (`this`: [*App2Context*](interfaces/app2context.md)<AppConfigType\>, `source`: [*ReadableStream*](interfaces/readablestream.md)<*never*\>, ...`args`: Z) => *MaybePromise*<[*RFunction*](modules.md#rfunction)<Produces\> \| [*ReadSequence*](modules.md#readsequence)<Produces\>\>

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Produces` | - | *any* |
`Z` | *any*[] | *any*[] |
`AppConfigType` | [*AppConfig*](modules.md#appconfig) | [*AppConfig*](modules.md#appconfig) |

Defined in: [runner.ts:233](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L233)

___

### RunnerMessage

Ƭ **RunnerMessage**: [[*RunnerMessageCode*](enums/runnermessagecode.md), *object*]

Defined in: [runner.ts:289](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L289)

___

### RunnerOptions

Ƭ **RunnerOptions**: { `monitoringInterval?`: *number*  }

#### Type declaration:

Name | Type |
------ | ------ |
`monitoringInterval?` | *number* |

Defined in: [runner.ts:294](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L294)

___

### SequenceDefinition

Ƭ **SequenceDefinition**: { `description?`: *string* ; `mode`: *buffer* \| *object* ; `name?`: *string* ; `scalability?`: { `head?`: ScalabilityOptions ; `tail?`: ScalabilityOptions  }  }

#### Type declaration:

Name | Type |
------ | ------ |
`description?` | *string* |
`mode` | *buffer* \| *object* |
`name?` | *string* |
`scalability?` | { `head?`: ScalabilityOptions ; `tail?`: ScalabilityOptions  } |

Defined in: [runner.ts:151](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L151)

___

### SequenceStatus

Ƭ **SequenceStatus**: { `pressure`: *number* ; `throughput`: *number*  }

#### Type declaration:

Name | Type |
------ | ------ |
`pressure` | *number* |
`throughput` | *number* |

Defined in: [runner.ts:161](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L161)

___

### Streamable

Ƭ **Streamable**<Produces\>: *PipeableStream*<Produces\> \| *AsyncGen*<Produces, *void*\> \| *Gen*<Produces, *void*\> \| *Iterable*<Produces\> \| *AsyncIterable*<Produces\>

Represents all readable stream types that will be accepted as return values from {@see TFunction}

#### Type parameters:

Name |
------ |
`Produces` |

Defined in: [runner.ts:70](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L70)

___

### TFunction

Ƭ **TFunction**<Consumes, Produces\>: *AsyncGen*<Produces, Consumes\> \| *Gen*<Produces, Consumes\> \| [*TranformFunction*](modules.md#tranformfunction)<Consumes, Produces\>

#### Type parameters:

Name |
------ |
`Consumes` |
`Produces` |

Defined in: [runner.ts:100](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L100)

___

### TranformFunction

Ƭ **TranformFunction**<Consumes, Produces\>: (`stream`: [*ReadableStream*](interfaces/readablestream.md)<Consumes\>, ...`parameters`: *any*[]) => *StreambleMaybeFunction*<Produces\>

#### Type parameters:

Name |
------ |
`Consumes` |
`Produces` |

Defined in: [runner.ts:96](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L96)

___

### TransformApp

Ƭ **TransformApp**<Consumes, Produces, Z, AppConfigType\>: (`this`: [*App2Context*](interfaces/app2context.md)<AppConfigType\>, `source`: [*ReadableStream*](interfaces/readablestream.md)<Consumes\>, ...`args`: Z) => *MaybePromise*<*TransformAppAcceptableSequence*<Consumes, Produces\>\>

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | *any* |
`Produces` | - | *any* |
`Z` | *any*[] | *any*[] |
`AppConfigType` | [*AppConfig*](modules.md#appconfig) | [*AppConfig*](modules.md#appconfig) |

Defined in: [runner.ts:220](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L220)

___

### TransformSeqence

Ƭ **TransformSeqence**<Consumes, Produces, Z, X\>: [[*TFunction*](modules.md#tfunction)<Consumes, Produces\>] \| [...TFunctionChain<Consumes, Z, X\>, [*TFunction*](modules.md#tfunction)<Z, Produces\>]

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | - |
`Produces` | - | - |
`Z` | - | *any* |
`X` | *any*[] | *any*[] |

Defined in: [runner.ts:144](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L144)

___

### WFunction

Ƭ **WFunction**<Consumes\>: [*TFunction*](modules.md#tfunction)<Consumes, *never*\>

#### Type parameters:

Name |
------ |
`Consumes` |

Defined in: [runner.ts:105](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L105)

___

### WritableApp

Ƭ **WritableApp**<Consumes, Z, AppConfigType\>: (`this`: [*App2Context*](interfaces/app2context.md)<AppConfigType\>, `source`: [*ReadableStream*](interfaces/readablestream.md)<Consumes\>, ...`args`: Z) => *MaybePromise*<[*WFunction*](modules.md#wfunction)<Consumes\> \| [*WriteSequence*](modules.md#writesequence)<Consumes\> \| *void*\>

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | *any* |
`Z` | *any*[] | *any*[] |
`AppConfigType` | [*AppConfig*](modules.md#appconfig) | [*AppConfig*](modules.md#appconfig) |

Defined in: [runner.ts:241](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L241)

___

### WriteFunction

Ƭ **WriteFunction**<Consumes\>: (`stream`: [*ReadableStream*](interfaces/readablestream.md)<Consumes\>, ...`parameters`: *any*[]) => *MaybePromise*<*void*\>

#### Type parameters:

Name |
------ |
`Consumes` |

Defined in: [runner.ts:95](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L95)

___

### WriteSequence

Ƭ **WriteSequence**<Consumes, Y, Z\>: [[*WFunction*](modules.md#wfunction)<Consumes\>] \| [...TFunctionChain<Consumes, Z, Y\>, [*WFunction*](modules.md#wfunction)<Z\>] \| [[*RFunction*](modules.md#rfunction)<Consumes\>, [*WFunction*](modules.md#wfunction)<Consumes\>] \| [[*RFunction*](modules.md#rfunction)<Consumes\>, ...TFunctionChain<Consumes, Z, Y\>, [*WFunction*](modules.md#wfunction)<Z\>]

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | - |
`Y` | *any*[] | *any*[] |
`Z` | - | *any* |

Defined in: [runner.ts:134](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/42b038e/src/types/runner.ts#L134)
