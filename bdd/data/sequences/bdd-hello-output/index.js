"use strict";

module.exports = async function () {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return "Hello";
};
