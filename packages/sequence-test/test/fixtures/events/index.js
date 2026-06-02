module.exports = async function eventsSequence(input) {
    for (const item of input) {
        this.emit("item.received", { id: item.id });
        this.emitToSpace("item.received", { id: item.id, scope: "space" });
    }

    return input.map((item) => ({ id: item.id, emitted: true }));
};
