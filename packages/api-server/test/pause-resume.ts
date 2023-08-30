import { PassThrough } from "stream";
import { createServer } from "..";

const srv = createServer({
    verbose: true
});
const pipe = new PassThrough();

srv.downstream("/in", pipe, { text: true });
srv.upstream("/out", pipe, { text: true });

srv.server.listen(7000);
