/**
 * Determines Sequence language by checking file extension in `main` field.
 * When failed, checks `engines` field for `node`.
 * Returns "unknown" when language can't be determined with this methods.
 *
 * @param {any} packageJson package.json contents
 * @returns {string} Detected language or "unknown"
 */
export const detectLanguage = (packageJson: {[key: string]: any}) =>
    (packageJson.main?.match(/(?:\.)([^.\\/:*?"<>|\r\n]+$)/) || { 1: undefined })[1] || packageJson.engines?.node ? "js" : "unknown";
