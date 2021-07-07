const { DataStream } = require("scramjet");
const fetch = require("node-fetch");

module.exports = function(_stream, apikey, fr, to) {
    const idx = `${fr}_${to}`;
    const get = () => fetch(`https://free.currconv.com/api/v7/convert?q=${idx}&compact=ultra&apiKey=${apikey}`).then(r => r.json());
    const defer = (t = 10000) => new Promise((res) => setTimeout(res, t));

    return DataStream
        .from(async function*() {
            while (true)
                yield await Promise.all([
                    get(), defer()
                ]).then(([data]) => data);
        })
        .do(async x => { console.log(x[idx]); }) // add some logic here
        .run();
};
