const { setWorldConstructor } = require("@cucumber/cucumber");

class CustomWorld {

}

setWorldConstructor(CustomWorld);
