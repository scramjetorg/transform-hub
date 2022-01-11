import __TypedEmitter from "typed-emitter";
import { EventEmitter } from "events";

/**
 * Native Node.JS EventEmitter typed properly.
*/
// eslint-disable-next-line @typescript-eslint/no-extra-parens,  @typescript-eslint/no-shadow
export class TypedEmitter<Events> extends (EventEmitter as { new<Events>(): __TypedEmitter<Events> })<Events> {}
