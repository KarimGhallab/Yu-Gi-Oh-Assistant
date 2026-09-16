// Types exports
export type { OneTypePair, Pair } from './types/Pair.js';

// File-system exports
export { existsAsync, readDirectoryAsync } from './utils/fsUtils.js';

// Path exports
export {
  adjustDriveLetterCase,
  convertToSystem,
  convertToUnix,
  isSubPath,
  sortPaths
} from './utils/pathUtils.js';

export type { PathPair } from './utils/pathUtils.js';

// Functions exports
export { debounce, debounceAsync } from './utils/functions/debounce.js';
export type {
  AsyncDebouncedFunction,
  DebouncedFunction
} from './utils/functions/debounce.js';
export type { Function } from './utils/functions/Function.js';
export { throttle, throttleAsync } from './utils/functions/throttle.js';
export type {
  AsyncThrottledFunction,
  ThrottledFunction
} from './utils/functions/throttle.js';

// Collections exports
export {
  arrayOfPrimitivesAreSimilar,
  groupBy,
  setIntersection,
  shuffle
} from './utils/collectionsUtils.js';

// Other exports
export { delay } from './utils/other/delay.js';
export { exhaust } from './utils/other/exhaust.js';
export { hasErrorMessage } from './utils/other/hasErrorMessage.js';

// Error exports
export {
  DomainError,
  NotFoundError,
  UnavailableError,
  ValidationError
} from './errors/DomainError.js';
export { HttpStatus } from './errors/types.js';
