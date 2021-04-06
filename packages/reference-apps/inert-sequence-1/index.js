/* eslint-disable no-loop-func */
/**
 * @typedef {import("@scramjet/types").InertApp<[], {x: number}>} InertApp
 * @typedef {import("@scramjet/types").AppContext} AppContext
 */

/**
 * An inert app that is just a function (not wrapped)
 *
 * @type {[InertApp]}
 * @param _stream - dummy input stream
 */
module.exports = [require("@scramjet/reference-inert-function")];
