"use strict";

function getDepTypes(opts) {
    if (opts.a) {
        opts.d = opts.D = opts.p = opts.o = true;
    }

    const {
        d: dependencies, D: devDependencies, p: peerDependencies, o: optionalDependencies
    } = opts;

    const depTypes = Object
        .entries({ dependencies, devDependencies, peerDependencies, optionalDependencies })
        .filter(([, val]) => val)
        .map(([key]) => key);

    return depTypes;
}

module.exports = { getDepTypes };
