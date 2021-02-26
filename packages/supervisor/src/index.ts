import { promisify } from "util";
import { access } from "fs";
import { resolve } from "path";

const supervisor = async () => {
    console.log("aaaa");
    console.log(
        await promisify(access)(resolve(__dirname, "package.json"))
    );
};

export { supervisor };
