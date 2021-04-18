const { setWorldConstructor } = require("@cucumber/cucumber");

class CustomWorld {
    // child;
}

setWorldConstructor(CustomWorld);
