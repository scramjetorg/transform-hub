const { setWorldConstructor, setDefaultTimeout } = require("cucumber");

class CustomWorld {
    // child;
}
setDefaultTimeout(20000);
setWorldConstructor(CustomWorld);
