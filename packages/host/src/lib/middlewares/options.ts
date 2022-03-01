import { NextCallback, ParsedMessage } from "@scramjet/types";
import { ServerResponse } from "http";

export const optionsMiddleware = (req: ParsedMessage, res: ServerResponse, next: NextCallback) => {
    if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.setHeader("Access-Control-Allow-Methods", "DELETE, POST, GET, OPTIONS");
        return res.end();
    }

    return next();
};

export const corsMiddleware = (req: ParsedMessage, res: ServerResponse, next: NextCallback) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    return next();
};
