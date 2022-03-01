import { NextCallback, ParsedMessage } from "@scramjet/types";
import { ServerResponse } from "http";

export const corsMiddleware = (req: ParsedMessage, res: ServerResponse, next: NextCallback) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    return next();
};
