import test from "ava";
import * as config from "../";

// const has: (o: object, k: string) => boolean =
//     Object.prototype.hasOwnProperty.call.bind(Object.prototype.hasOwnProperty);

test("Check the imageConfig test", async t => {
    t.is(typeof config.imageConfig, "function", "Has image config method");

    const imageConfig = await config.imageConfig();

    t.is(typeof imageConfig, "object", "Imageconfig is an object");
    t.is(typeof imageConfig.prerunner, "string", "Exposes prerunner");
    t.is(typeof imageConfig.runner, "string", "Exposes runner");
});
