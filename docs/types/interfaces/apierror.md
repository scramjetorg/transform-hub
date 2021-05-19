[@scramjet/types](../README.md) / APIError

# Interface: APIError

## Hierarchy

* *Error*

  ↳ **APIError**

## Table of contents

### Properties

- [cause](apierror.md#cause)
- [code](apierror.md#code)
- [httpMessage](apierror.md#httpmessage)
- [message](apierror.md#message)
- [name](apierror.md#name)
- [stack](apierror.md#stack)

## Properties

### cause

• `Optional` **cause**: *undefined* \| Error

Defined in: [packages/types/src/api-expose.ts:50](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/api-expose.ts#L50)

___

### code

• **code**: *number*

Http status code to be outputted

Defined in: [packages/types/src/api-expose.ts:42](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/api-expose.ts#L42)

___

### httpMessage

• **httpMessage**: *string*

The message that will be sent in reason line

Defined in: [packages/types/src/api-expose.ts:46](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/api-expose.ts#L46)

___

### message

• **message**: *string*

Defined in: node_modules/typedoc/node_modules/typescript/lib/lib.es5.d.ts:974

___

### name

• **name**: *string*

Defined in: node_modules/typedoc/node_modules/typescript/lib/lib.es5.d.ts:973

___

### stack

• `Optional` **stack**: *undefined* \| *string*

Defined in: node_modules/typedoc/node_modules/typescript/lib/lib.es5.d.ts:975
