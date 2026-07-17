import { lstatSync, realpathSync, promises as fs } from "node:fs";
import path from "node:path";

export interface FileBackedMockCursorOptions {
    directory: string;
    fileName: string;
}

export interface FileBackedMockCursor {
    filePath: string;
    read<T>(): Promise<T>;
    write<T>(value: T): Promise<void>;
    cleanup(): Promise<void>;
}

function resolveCursorPath(directory: string, fileName: string): string {
    const fixtureDirectory = realpathSync(path.resolve(directory));

    if (path.isAbsolute(fileName) || fileName.length === 0) {
        throw new Error(`File-backed mock cursor path must be relative and stay inside fixture directory: ${fileName}`);
    }

    const filePath = path.resolve(fixtureDirectory, fileName);
    const relativePath = path.relative(fixtureDirectory, filePath);

    if (relativePath === "" || relativePath === ".." || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
        throw new Error(`File-backed mock cursor path must be relative and stay inside fixture directory: ${fileName}`);
    }

    let currentPath = fixtureDirectory;
    for (const component of relativePath.split(path.sep)) {
        currentPath = path.join(currentPath, component);

        try {
            const stats = lstatSync(currentPath);
            if (stats.isSymbolicLink()) {
                throw new Error(`File-backed mock cursor path must not contain symlink components: ${fileName}`);
            }

            const realPath = realpathSync(currentPath);
            const realRelativePath = path.relative(fixtureDirectory, realPath);
            if (realRelativePath === ".." || realRelativePath.startsWith(`..${path.sep}`) || path.isAbsolute(realRelativePath)) {
                throw new Error(`File-backed mock cursor path must stay inside fixture directory: ${fileName}`);
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") break;
            throw error;
        }
    }

    return filePath;
}

export function createFileBackedMockCursor(options: FileBackedMockCursorOptions): FileBackedMockCursor {
    const fixtureDirectory = realpathSync(path.resolve(options.directory));
    const filePath = resolveCursorPath(options.directory, options.fileName);

    const assertSafePath = (): void => {
        resolveCursorPath(fixtureDirectory, options.fileName);
    };

    const cleanup = async (): Promise<void> => {
        assertSafePath();
        await fs.rm(filePath, { force: true });

        let parentDirectory = path.dirname(filePath);

        while (parentDirectory !== fixtureDirectory) {
            try {
                await fs.rmdir(parentDirectory);
            } catch (error) {
                const code = (error as NodeJS.ErrnoException).code;

                if (code === "ENOENT" || code === "ENOTEMPTY" || code === "EEXIST") {
                    break;
                }

                throw error;
            }

            parentDirectory = path.dirname(parentDirectory);
        }
    };

    return {
        filePath,
        read: async <T>(): Promise<T> => {
            assertSafePath();
            const contents = await fs.readFile(filePath, "utf8");
            return JSON.parse(contents) as T;
        },
        write: async <T>(value: T): Promise<void> => {
            assertSafePath();
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            assertSafePath();
            await fs.writeFile(filePath, JSON.stringify(value), "utf8");
        },
        cleanup
    };
}
