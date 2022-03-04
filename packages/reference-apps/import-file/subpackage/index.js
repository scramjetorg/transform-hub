/* eslint-disable no-console */

async function defer() {
    return new Promise(res => setTimeout(res, 1000));
}

/**
 * An inert app that is just a function (not wrapped)
 *
 * @type {InertApp}
 * @param _stream - dummy input stream
 */
module.exports = async function(_stream) {
    while (++x < 5) {
        console.log({ x: x });
        await defer();
    }
};

