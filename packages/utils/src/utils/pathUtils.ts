import { statSync } from 'fs';
import { type } from 'os';
import { basename, posix, sep, win32 } from 'path';

/**
 * Represents a pair of paths.
 *
 * @property {string} path1 - The first path.
 * @property {string} path2 - The second path.
 */
export type PathPair = { path1: string; path2: string };

/**
 * Adjusts the drive letter case of two paths.
 *
 * @param paths - The paths to adjust the drive letter case for.
 * @returns The paths with adjusted drive letter case, if applicable.
 */
export const adjustDriveLetterCase = ({ path1, path2 }: PathPair): PathPair => {
  const path1FirstChar = path1.charAt(0);
  const path2FirstChar = path2.charAt(0);
  // We may get a different case for windows' path on the first letter (the drive letter)
  // So we convert the first letters of both paths to ignore that case variation
  if (
    type() === 'Windows_RT' &&
    path1FirstChar.toLocaleUpperCase() === path2FirstChar.toLocaleUpperCase() &&
    path1FirstChar !== path2FirstChar
  ) {
    return {
      path1: path1FirstChar.toLocaleUpperCase() + path1.substring(1),
      path2: path2FirstChar.toLocaleUpperCase() + path2.substring(1)
    };
  }
  return { path1, path2 };
};

/**
 * Convert a given unix path to the current OS path.
 *
 * @param path The path to convert.
 * @returns The conversion of the given path to the current OS path
 */
export const convertToSystem = (path: string): string => {
  return path.split(posix.sep).join(sep);
};

/**
 * Convert a given path to an unix path.
 *
 * @param path The path to convert.
 * @returns The unix path version of the given path.
 */
export const convertToUnix = (path: string): string => {
  return path.split(win32.sep).join(posix.sep);
};

/**
 * Checks if a path is a subpath of another path.
 *
 * @param src - The source path.
 * @param dst - The destination path.
 * @returns A boolean indicating whether the destination path is a subpath of the source path.
 */
export const isSubPath = (src: string, dst: string): boolean => {
  return dst.startsWith(src) && dst.length > src.length;
};

/**
 * Sorts an array of file paths.
 *
 * @param paths - The array of file paths to be sorted.
 */
export const sortPaths = (paths: string[]) => {
  paths.sort((a, b) => {
    const nameA = basename(a);
    const nameB = basename(b);
    const statA = statSync(a);
    const statB = statSync(b);
    if (
      (statA.isDirectory() && statB.isDirectory()) ||
      (statA.isFile() && statB.isFile())
    ) {
      return nameA.localeCompare(nameB);
    } else if (statA.isDirectory() && !statB.isDirectory()) {
      return -1;
    } else if (!statA.isDirectory() && statB.isDirectory()) {
      return 1;
    } else {
      return 0;
    }
  });
};
