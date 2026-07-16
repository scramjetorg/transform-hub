"use strict";

module.exports = async function () {
    // Keep the sequence alive without starving the runner's control channel.
    // The instance remains non-responsive until the BDD kill step terminates
    // its runner, while the host can continue serving health and cleanup API
    // requests.
    await new Promise(() => undefined);
};
