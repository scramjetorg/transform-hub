import { PassThrough } from "stream";
import { createServer } from "..";
import { observe } from "@scramjet/utility/src/observe-stream";

const srv = createServer({
    verbose: true
});
const pipe = new PassThrough();

observe(pipe);

srv.downstream("/in", pipe, { text: true });
srv.upstream("/out", pipe, { text: true });

srv.server.listen(7000);
