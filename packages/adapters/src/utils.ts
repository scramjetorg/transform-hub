/**
 * Determines Sequence language by checking file extension in `main` field.
 * When failed, checks `engines` field for `node`.
 * Returns "unknown" when language can't be determined with this methods.
 *
 * @param {any} packageJson package.json contents
 * @returns {string} Detected language or "unknown"
 */
export const detectLanguage = (packageJson: {[key: string]: any}) => {
    if (packageJson.engines) {
        if ("python3" in packageJson.engines) return "py";
        if ("node" in packageJson.engines) return "js";
    }

    return (packageJson.main?.match(/(?:\.)([^.\\/:*?"<>|\r\n]+$)/) || { 1: undefined })[1] || "unknown";
};
