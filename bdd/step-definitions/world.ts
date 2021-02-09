const { setWorldConstructor } = require("cucumber");

class CustomWorld {
    // child;
}

setWorldConstructor(CustomWorld);