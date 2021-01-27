const { setWorldConstructor } = require("cucumber");

class CustomWorld {
}

setWorldConstructor(CustomWorld);