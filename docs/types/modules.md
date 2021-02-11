[@scramjet/types](README.md) / Exports

# @scramjet/types

## Table of contents

### Namespaces

- [MessageCodes](modules/messagecodes.md)

### Enumerations

- [RunnerMessageCode](enums/runnermessagecode.md)

### Type aliases

- [AppConfig](modules.md#appconfig)
- [AppContext](modules.md#appcontext)
- [Application](modules.md#application)
- [ApplicationExpose](modules.md#applicationexpose)
- [FunctionDefinition](modules.md#functiondefinition)
- [FunctionStatus](modules.md#functionstatus)
- [InertApp](modules.md#inertapp)
- [InertSequence](modules.md#inertsequence)
- [MessageCode](modules.md#messagecode)
- [MonitoringMessage](modules.md#monitoringmessage)
- [RFunction](modules.md#rfunction)
- [ReadFunction](modules.md#readfunction)
- [ReadSequence](modules.md#readsequence)
- [ReadableApp](modules.md#readableapp)
- [RunnerMessage](modules.md#runnermessage)
- [RunnerOptions](modules.md#runneroptions)
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

App configuration primitive.

Defined in: [runner.ts:190](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L190)

___

### AppContext

Ƭ **AppContext**<AppConfigType, State\>: *AutoAppContext*<AppConfigType, State\> \| *FullAppContext*<AppConfigType, State\>

Application context

**`interface`** 

#### Type parameters:

Name | Type |
------ | ------ |
`AppConfigType` | [*AppConfig*](modules.md#appconfig) |
`State` | *any* |

Defined in: [runner.ts:376](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L376)

___

### Application

Ƭ **Application**<Consumes, Produces, Z, S, AppConfigType\>: [*TransformApp*](modules.md#transformapp)<Consumes, Produces, Z, S, AppConfigType\> \| [*ReadableApp*](modules.md#readableapp)<Produces, Z, S, AppConfigType\> \| [*WritableApp*](modules.md#writableapp)<Consumes, Z, S, AppConfigType\> \| [*InertApp*](modules.md#inertapp)<Z, S\> \| [*ApplicationExpose*](modules.md#applicationexpose)<Consumes, Produces, Z, S, AppConfigType\>

Application is an acceptable input for the runner.

**`interface`** 

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | *any* |
`Produces` | - | *any* |
`Z` | *any*[] | *any*[] |
`S` | *any* | *any* |
`AppConfigType` | [*AppConfig*](modules.md#appconfig) | [*AppConfig*](modules.md#appconfig) |

Defined in: [runner.ts:476](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L476)

___

### ApplicationExpose

Ƭ **ApplicationExpose**<Consumes, Produces, Z, S, AppConfigType\>: { `__@exposeSequenceSymbol@3655`: [*Application*](modules.md#application)<Consumes, Produces, Z, S, AppConfigType\>  }

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | *any* |
`Produces` | - | *any* |
`Z` | *any*[] | *any*[] |
`S` | *any* | *any* |
`AppConfigType` | [*AppConfig*](modules.md#appconfig) | [*AppConfig*](modules.md#appconfig) |

#### Type declaration:

Name | Type |
------ | ------ |
`__@exposeSequenceSymbol@3655` | [*Application*](modules.md#application)<Consumes, Produces, Z, S, AppConfigType\> |

Defined in: [runner.ts:459](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L459)

___

### FunctionDefinition

Ƭ **FunctionDefinition**: { `description?`: *string* ; `mode`: *buffer* \| *object* \| *reference* ; `name?`: *string* ; `scalability?`: { `head?`: ScalabilityOptions ; `tail?`: ScalabilityOptions  }  }

Definition that informs the platform of the details of a single function.

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`description?` | *string* | Addtional description of the function   |
`mode` | *buffer* \| *object* \| *reference* | Stream mode:  * buffer - carries binary/string chunks that have no fixed size chunks and can be passed through sockets * object - carries any type of object, that is serializable via JSON or analogue * reference - carries non-serializable object references that should not be passed outside of a single process    |
`name?` | *string* | Optional name for the function (which will be shown in UI/CLI)   |
`scalability?` | { `head?`: ScalabilityOptions ; `tail?`: ScalabilityOptions  } | Describes how head (readable side) and tail (writable side) of this Function can be scaled to other machines.   |

Defined in: [runner.ts:119](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L119)

___

### FunctionStatus

Ƭ **FunctionStatus**: { `buffer`: *number* ; `pressure`: *number* ; `processing`: *number* ; `throughput`: *number*  }

Provides basic function status information

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`buffer` | *number* | The amount of stream entries that this function will accept in queue for processing before `pause` is called (i.e. highWaterMark - processing)   |
`pressure` | *number* | Calculated backpressure: processing * throughput / buffer   |
`processing` | *number* | The number of stream entries currently being processed.   |
`throughput` | *number* | Average number of stream entries passing that specific function over the duration of 1 second during the last 10 seconds.   |

Defined in: [runner.ts:155](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L155)

___

### InertApp

Ƭ **InertApp**<Z, S, AppConfigType\>: (`this`: *FullAppContext*<AppConfigType, S\>, `source`: *ReadableStream*<*void*\>, ...`args`: Z) => *MaybePromise*<[*WFunction*](modules.md#wfunction)<*void*\> \| [*WriteSequence*](modules.md#writesequence)<*void*\> \| *void*\>

An Inert App is an app that doesn't accept data from the platform and doesn't output it.

**`interface`** 

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Z` | *any*[] | *any*[] |
`S` | *any* | *any* |
`AppConfigType` | [*AppConfig*](modules.md#appconfig) | [*AppConfig*](modules.md#appconfig) |

Defined in: [runner.ts:448](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L448)

___

### InertSequence

Ƭ **InertSequence**<Z, Y, X\>: *TFunctionChain*<Y, Z, X\>

Minimal type of Sequence that doesn't read anything from the outside, doesn't
write anything to outside. It may be doing anything, but it's not able to report
the progress via streaming.

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Z` | - | *any* |
`Y` | - | *any* |
`X` | *any*[] | *any*[] |

Defined in: [runner.ts:75](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L75)

___

### MessageCode

Ƭ **MessageCode**: [*ANY*](modules/messagecodes.md#any)

Defined in: [runner.ts:506](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L506)

___

### MonitoringMessage

Ƭ **MonitoringMessage**: { `healthy?`: *boolean* ; `sequences?`: [*FunctionStatus*](modules.md#functionstatus)[]  }

The response an Sequence sends as monitoring responses

#### Type declaration:

Name | Type |
------ | ------ |
`healthy?` | *boolean* |
`sequences?` | [*FunctionStatus*](modules.md#functionstatus)[] |

Defined in: [runner.ts:179](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L179)

___

### RFunction

Ƭ **RFunction**<Produces\>: [*Streamable*](modules.md#streamable)<Produces\> \| [*ReadFunction*](modules.md#readfunction)<Produces\>

#### Type parameters:

Name |
------ |
`Produces` |

Defined in: [runner.ts:37](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L37)

___

### ReadFunction

Ƭ **ReadFunction**<Produces\>: (...`parameters`: *any*[]) => *StreambleMaybeFunction*<Produces\>

#### Type parameters:

Name |
------ |
`Produces` |

Defined in: [runner.ts:32](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L32)

___

### ReadSequence

Ƭ **ReadSequence**<Produces, Y, Z\>: [[*RFunction*](modules.md#rfunction)<Produces\>] \| [[*RFunction*](modules.md#rfunction)<Z\>, ...TFunctionChain<Z, Produces, Y\>]

A sequence of functions reads input from a source and outputs it after
a chain of transforms.

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Produces` | - | - |
`Y` | *any*[] | *any*[] |
`Z` | - | *any* |

Defined in: [runner.ts:92](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L92)

___

### ReadableApp

Ƭ **ReadableApp**<Produces, Z, S, AppConfigType\>: (`this`: [*AppContext*](modules.md#appcontext)<AppConfigType, S\>, `source`: *ReadableStream*<*never*\>, ...`args`: Z) => *MaybePromise*<[*RFunction*](modules.md#rfunction)<Produces\> \| [*ReadSequence*](modules.md#readsequence)<Produces\>\>

A Readable App is an app that obtains the data by it's own means and preforms
0 to any number of transforms on that data before returning it.

**`interface`** 

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Produces` | - | *any* |
`Z` | *any*[] | *any*[] |
`S` | *any* | *any* |
`AppConfigType` | [*AppConfig*](modules.md#appconfig) | [*AppConfig*](modules.md#appconfig) |

Defined in: [runner.ts:413](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L413)

___

### RunnerMessage

Ƭ **RunnerMessage**: [[*RunnerMessageCode*](enums/runnermessagecode.md), *object*]

Defined in: [runner.ts:522](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L522)

___

### RunnerOptions

Ƭ **RunnerOptions**: { `monitoringInterval?`: *number*  }

#### Type declaration:

Name | Type |
------ | ------ |
`monitoringInterval?` | *number* |

Defined in: [runner.ts:527](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L527)

___

### Streamable

Ƭ **Streamable**<Produces\>: *PipeableStream*<Produces\> \| *AsyncGen*<Produces, *void*\> \| *Gen*<Produces, *void*\> \| *Iterable*<Produces\> \| *AsyncIterable*<Produces\>

Represents all readable stream types that will be accepted as return values from {@see TFunction}

#### Type parameters:

Name |
------ |
`Produces` |

Defined in: [runner.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L8)

___

### TFunction

Ƭ **TFunction**<Consumes, Produces\>: *AsyncGen*<Produces, Consumes\> \| *Gen*<Produces, Consumes\> \| [*TranformFunction*](modules.md#tranformfunction)<Consumes, Produces\>

#### Type parameters:

Name |
------ |
`Consumes` |
`Produces` |

Defined in: [runner.ts:38](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L38)

___

### TranformFunction

Ƭ **TranformFunction**<Consumes, Produces\>: (`stream`: *ReadableStream*<Consumes\>, ...`parameters`: *any*[]) => *StreambleMaybeFunction*<Produces\>

#### Type parameters:

Name |
------ |
`Consumes` |
`Produces` |

Defined in: [runner.ts:34](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L34)

___

### TransformApp

Ƭ **TransformApp**<Consumes, Produces, Z, S, AppConfigType\>: (`this`: [*AppContext*](modules.md#appcontext)<AppConfigType, S\>, `source`: *ReadableStream*<Consumes\>, ...`args`: Z) => *MaybePromise*<*TransformAppAcceptableSequence*<Consumes, Produces\>\>

A Transformation App that accepts data from the platform, performs operations on the data,
and returns the data to the platforms for further use.

Has both active readable and writable sides.

**`interface`** 

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | *any* |
`Produces` | - | *any* |
`Z` | *any*[] | *any*[] |
`S` | *any* | *any* |
`AppConfigType` | [*AppConfig*](modules.md#appconfig) | [*AppConfig*](modules.md#appconfig) |

Defined in: [runner.ts:393](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L393)

___

### TransformSeqence

Ƭ **TransformSeqence**<Consumes, Produces, Z, X\>: [[*TFunction*](modules.md#tfunction)<Consumes, Produces\>] \| [...TFunctionChain<Consumes, Z, X\>, [*TFunction*](modules.md#tfunction)<Z, Produces\>]

A Transform Sequence is a sequence that accept input, perform operations on it, and
outputs the result.

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | - |
`Produces` | - | - |
`Z` | - | *any* |
`X` | *any*[] | *any*[] |

Defined in: [runner.ts:101](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L101)

___

### WFunction

Ƭ **WFunction**<Consumes\>: [*TFunction*](modules.md#tfunction)<Consumes, *never*\>

#### Type parameters:

Name |
------ |
`Consumes` |

Defined in: [runner.ts:43](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L43)

___

### WritableApp

Ƭ **WritableApp**<Consumes, Z, S, AppConfigType\>: (`this`: [*AppContext*](modules.md#appcontext)<AppConfigType, S\>, `source`: *ReadableStream*<Consumes\>, ...`args`: Z) => *MaybePromise*<[*WFunction*](modules.md#wfunction)<Consumes\> \| [*WriteSequence*](modules.md#writesequence)<Consumes\> \| *void*\>

A Writable App is an app that accepts the data from the platform, performs any number
of transforms and then saves it to the data destination by it's own means.

**`interface`** 

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | *any* |
`Z` | *any*[] | *any*[] |
`S` | *any* | *any* |
`AppConfigType` | [*AppConfig*](modules.md#appconfig) | [*AppConfig*](modules.md#appconfig) |

Defined in: [runner.ts:431](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L431)

___

### WriteFunction

Ƭ **WriteFunction**<Consumes\>: (`stream`: *ReadableStream*<Consumes\>, ...`parameters`: *any*[]) => *MaybePromise*<*void*\>

#### Type parameters:

Name |
------ |
`Consumes` |

Defined in: [runner.ts:33](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L33)

___

### WriteSequence

Ƭ **WriteSequence**<Consumes, Y, Z\>: [[*WFunction*](modules.md#wfunction)<Consumes\>] \| [...TFunctionChain<Consumes, Z, Y\>, [*WFunction*](modules.md#wfunction)<Z\>] \| [[*RFunction*](modules.md#rfunction)<Consumes\>, [*WFunction*](modules.md#wfunction)<Consumes\>] \| [[*RFunction*](modules.md#rfunction)<Consumes\>, ...TFunctionChain<Consumes, Z, Y\>, [*WFunction*](modules.md#wfunction)<Z\>]

A Sequence of functions that accept some input, transforms it through
a number of functions and writes to some destination.

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`Consumes` | - | - |
`Y` | *any*[] | *any*[] |
`Z` | - | *any* |

Defined in: [runner.ts:81](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/93ba7a9/src/types/runner.ts#L81)
