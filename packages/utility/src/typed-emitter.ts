import __TypedEmitter from "typed-emitter";
import { EventEmitter } from "events";

/**
 * Native Node.JS EventEmitter typed properly.
*/
export class TypedEmitter<Events> extends (EventEmitter as { new<Events>(): __TypedEmitter<Events> })<Events> {}
