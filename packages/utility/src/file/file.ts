export interface File {
    path: string;
    write(value: any): void;
    read(): string | any;

    isReadable(): boolean
    isReadWritable(): boolean
    create(): boolean
    remove(): void
    exists(): boolean
    /**
     * @returns filename with extension
     */
    fullname(): string
    /**
     * @returns extension name
     */
    extname(): string
    /**
     * @returns filename without extension
     */
    name(): string
}

