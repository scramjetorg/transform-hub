/* eslint-disable no-loop-func */

/**
 * An inert app that is just a function (not wrapped)
 *
 * @type {InertApp}
 * @param _stream - dummy input stream
 */
 module.exports = async function(_stream) {
    while (++x < 5) {
        console.log({ x: x });
        await new Promise(res => setTimeout(res, 1000));
    }
};
