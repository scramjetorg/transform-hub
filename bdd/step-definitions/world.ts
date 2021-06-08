const { setWorldConstructor } = require("@cucumber/cucumber");

class CustomWorld {
    resources: { [key: string]: any }
}

setWorldConstructor(CustomWorld);
