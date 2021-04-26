// /* eslint-disable no-loop-func */
// import { get } from "https";
// import { DataStream, StringStream } from "scramjet";
// import { createGunzip } from "zlib";


// const exp = [
//     /**
//      * @param _stream - dummy input
//      * @returns data
//      */
//     function(_stream: any) {
//         //TODO pass as an argument
//         console.log("--------sequence");
//         return new Promise((resolve) => get("https://repo.int.scp.ovh/repository/scp-store/small-file.json.gz", response => {
//             const stream = response
//                 .pipe(createGunzip())
//                 .pipe(new StringStream("utf-8"))
//                 .lines();
//                 // .do((data) => console.log("data: ", data));
            
//             resolve(stream);
//             stream.on("finish", function() {
//               console.log("done");
//             });
//           }));
//     },
//     async function(stream: any) {
//         for await (const y  of stream) {
//             console.log(y);
//         }
//     }
// ];

// export = exp;

// (exp[0](DataStream.from([]))).then(exp[1]);

