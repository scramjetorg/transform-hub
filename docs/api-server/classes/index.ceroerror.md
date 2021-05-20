[@scramjet/api-server](../README.md) / [index](../modules/index.md) / CeroError

# Class: CeroError

[index](../modules/index.md).CeroError

## Hierarchy

* *Error*

  ↳ **CeroError**

## Implements

* *APIError*

## Table of contents

### Constructors

- [constructor](index.ceroerror.md#constructor)

### Properties

- [cause](index.ceroerror.md#cause)
- [code](index.ceroerror.md#code)
- [httpMessage](index.ceroerror.md#httpmessage)
- [message](index.ceroerror.md#message)
- [name](index.ceroerror.md#name)
- [prepareStackTrace](index.ceroerror.md#preparestacktrace)
- [stackTraceLimit](index.ceroerror.md#stacktracelimit)
- [type](index.ceroerror.md#type)

### Accessors

- [stack](index.ceroerror.md#stack)

### Methods

- [captureStackTrace](index.ceroerror.md#capturestacktrace)

## Constructors

### constructor

\+ **new CeroError**(`errCode`: *ERR_NOT_FOUND* \| *ERR_NOT_CURRENTLY_AVAILABLE* \| *ERR_FAILED_FETCH_DATA* \| *ERR_FAILED_TO_SERIALIZE* \| *ERR_INTERNAL_ERROR* \| *ERR_INVALID_CONTENT_TYPE* \| *ERR_CANNOT_PARSE_CONTENT* \| *ERR_UNSUPPORTED_ENCODING*, `cause?`: Error, `extraMessage?`: *string*): [*CeroError*](lib_definitions.ceroerror.md)

#### Parameters:

Name | Type |
------ | ------ |
`errCode` | *ERR_NOT_FOUND* \| *ERR_NOT_CURRENTLY_AVAILABLE* \| *ERR_FAILED_FETCH_DATA* \| *ERR_FAILED_TO_SERIALIZE* \| *ERR_INTERNAL_ERROR* \| *ERR_INVALID_CONTENT_TYPE* \| *ERR_CANNOT_PARSE_CONTENT* \| *ERR_UNSUPPORTED_ENCODING* |
`cause?` | Error |
`extraMessage?` | *string* |

**Returns:** [*CeroError*](lib_definitions.ceroerror.md)

Defined in: [packages/api-server/src/lib/definitions.ts:42](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/api-server/src/lib/definitions.ts#L42)

## Properties

### cause

• `Optional` **cause**: *undefined* \| Error

Defined in: [packages/api-server/src/lib/definitions.ts:40](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/api-server/src/lib/definitions.ts#L40)

___

### code

• **code**: *number*

Defined in: [packages/api-server/src/lib/definitions.ts:38](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/api-server/src/lib/definitions.ts#L38)

___

### httpMessage

• **httpMessage**: *string*

Defined in: [packages/api-server/src/lib/definitions.ts:39](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/api-server/src/lib/definitions.ts#L39)

___

### message

• **message**: *string*

Defined in: node_modules/typedoc/node_modules/typescript/lib/lib.es5.d.ts:974

___

### name

• **name**: *string*

Defined in: node_modules/typedoc/node_modules/typescript/lib/lib.es5.d.ts:973

___

### prepareStackTrace

• `Optional` **prepareStackTrace**: *undefined* \| (`err`: Error, `stackTraces`: CallSite[]) => *any*

Optional override for formatting stack traces

**`see`** https://v8.dev/docs/stack-trace-api#customizing-stack-traces

Defined in: packages/api-server/node_modules/@types/node/globals.d.ts:11

___

### stackTraceLimit

• **stackTraceLimit**: *number*

Defined in: packages/api-server/node_modules/@types/node/globals.d.ts:13

___

### type

• **type**: *ERR_NOT_FOUND* \| *ERR_NOT_CURRENTLY_AVAILABLE* \| *ERR_FAILED_FETCH_DATA* \| *ERR_FAILED_TO_SERIALIZE* \| *ERR_INTERNAL_ERROR* \| *ERR_INVALID_CONTENT_TYPE* \| *ERR_CANNOT_PARSE_CONTENT* \| *ERR_UNSUPPORTED_ENCODING*

Defined in: [packages/api-server/src/lib/definitions.ts:41](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/api-server/src/lib/definitions.ts#L41)

## Accessors

### stack

• **stack**(): *string*

**Returns:** *string*

Defined in: [packages/api-server/src/lib/definitions.ts:60](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/api-server/src/lib/definitions.ts#L60)

## Methods

### captureStackTrace

▸ **captureStackTrace**(`targetObject`: *object*, `constructorOpt?`: Function): *void*

Create .stack property on a target object

#### Parameters:

Name | Type |
------ | ------ |
`targetObject` | *object* |
`constructorOpt?` | Function |

**Returns:** *void*

Defined in: packages/api-server/node_modules/@types/node/globals.d.ts:4
