/* eslint-disable quotes */
export const expectedResponses: { [key: string]: any } = {
    HelloWorld: "Hello World!",
    hulkName: "Name is: Hulk\n",
    cities:
        '{ "city": "New York" }\n' +
        '{ "city": "Amsterdam" }\n' +
        '{ "city": "Boston" }\n' +
        '{ "city": "Chicago" }\n' +
        '{ "city": "Denver" }\n' +
        '{ "city": "Edinburgh" }\n' +
        '{ "city": "Geneva" }\n' +
        '{ "city": "Hong Kong" }\n' +
        '{ "city": "Jacksonville" }\n',
    "args-on-output": "Hello\n123\n456\n789\n",
    "endless-names-10":
        `{"name":"Alice"}\n` +
        `{"name":"Ada"}\n` +
        `{"name":"Aga"}\n` +
        `{"name":"Michał"}\n` +
        `{"name":"Patryk"}\n` +
        `{"name":"Rafał"}\n` +
        `{"name":"Aida"}\n` +
        `{"name":"Basia"}\n` +
        `{"name":"Natalia"}\n` +
        `{"name":"Monika"}\n` +
        `{"name":"Wojtek"}\n`,
    "ny-city": `{ \"city\": \"New York\" }\n`,
    "hello-avengers":
        'Name is: Ant-Man\n' +
        'Name is: Iron Man\n' +
        'Name is: Hulk\n' +
        'Name is: Hawkeye\n' +
        'Name is: Black Widow\n' +
        'Name is: Thor\n' +
        'Name is: Captain America\n' +
        'Name is: Spider-Man\n',
    names:
        "Name is: Alice\n" +
        "Name is: Ada\n" +
        "Name is: Aga\n" +
        "Name is: Michał\n" +
        "Name is: Patryk\n" +
        "Name is: Rafał\n" +
        "Name is: Aida\n" +
        "Name is: Basia\n" +
        "Name is: Natalia\n" +
        "Name is: Monika\n" +
        "Name is: Wojtek\n",
    team:
        "Hello Alice!\n" +
        "Hello Ada!\n" +
        "Hello Aga!\n" +
        "Hello Basia!\n" +
        "Hello Natalia!\n" +
        "Hello Wojtek!\n" +
        "Hello Michał!\n" +
        "Hello Patryk!\n" +
        "Hello Rafał!\n",
    "E2E-002-TC-002": `{ "data": "sent-to-cpm" }\n`,
    "E2E-002-TC-003": `{ "data": "sent-to-sth1" }\n`,
    name: `{"name":"Alice"}\n`,
    pets:
        "Bonnie\n" +
        "Rosa\n" +
        "Fahume\n",
    pets2:
        "Yogi\n" +
        "Molly\n" +
        "Sisi\n"
};
