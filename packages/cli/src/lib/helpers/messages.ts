import { displayError } from "../output";

export const displayProdOnlyMsg = (command: string) => {
    displayError(`'${command}' command is only available in production environment
to change environment please use following command: 'si config set env production'
or check out our documentation for more details: 'https://docs.scramjet.org/platform/get-started/'`);
};

