import { DecoratorWithLogger } from "./decorator-with-logger";

export type HybridAPIArgs = {
    jwtCheckDecorator: DecoratorWithLogger;
    contextDecorator: DecoratorWithLogger;
}
