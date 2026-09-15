import { type PathLike } from 'fs';
import { access, readdir, stat } from 'fs/promises';
import { resolve } from 'path';

/**
 * Async version of fs.exists.
 *
 * @param path The path to test.
 * @returns A promise resolving on true if the path exists, false otherwise.
 */
export const existsAsync = async (path: PathLike): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * Read all the sub-files/folders from a given directory.
 *
 * @param directory The directory to read its sub-files/folders
 * @returns All the sub-files/folders from a given directory.
 */
export const readDirectoryAsync = async (
  directory: string
): Promise<string[]> => {
  const dirStat = await stat(directory);
  return dirStat.isFile()
    ? []
    : readdir(directory).then(files =>
        files.map(file => resolve(directory, file))
      );
};
