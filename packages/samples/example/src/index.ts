const namesArr: Array<string> = ["Alice", "Bob", "Mike"];

const hello = (names:Array<string>) => {
    names.map((name: string) => {
        console.log(`Hello ${name}!`);
    });
};
hello(namesArr);