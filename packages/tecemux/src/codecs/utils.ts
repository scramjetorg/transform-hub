export const calculateChecksum = (buffer: Buffer) => {
    let tempFrame = Buffer.concat([buffer, Buffer.alloc(0)]);

    if (buffer.length % 2) {
        tempFrame = Buffer.concat([buffer, Buffer.alloc(1, 0)]);
    }

    let checksum = 0;
    let i = 0;

    while (i <= tempFrame.length - 2) {
        if (i !== 28) {
            checksum += tempFrame.readUInt16LE(i);
        }

        i += 2;
    }

    return checksum % 0x10000;
};

export const getChecksum = (buffer: Buffer) => {
    return buffer.readUInt16LE(28);
};
