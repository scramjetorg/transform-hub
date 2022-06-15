export const stringToBoolean = (string:string) => {
    switch (string.toLowerCase().trim()) {
        case "true":
        case "yes":
        case "1":
            return true;

        case "false":
        case "no":
        case "0":
        case null:
            return false;

        default:
            return undefined;
    }
};
