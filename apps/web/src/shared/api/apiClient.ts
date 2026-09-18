import { apiErrorSchema } from '@ygo-assistant/contracts';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(
  /\/+$/,
  ''
);

/**
 * Why a request did not answer with what the client asked for, so a surface can
 * tell a conversation that is not there from a server that is not there.
 */
export enum ApiFailureKind {
  Unreachable = 'unreachable',
  Refused = 'refused',
  Malformed = 'malformed'
}

const UNREACHABLE_MESSAGE = 'Could not reach the server.';
const UNREADABLE_MESSAGE =
  'The server answered with something this app does not understand.';

/**
 * What a failure carries besides its kind: the status when the server answered,
 * and whatever the client caught, so a contract that drifted or a server that is
 * down can be told apart while debugging.
 */
export interface ApiErrorOptions {
  status?: number;
  cause?: unknown;
}

/**
 * A request that failed. A refusal carries the status and whatever the server
 * was willing to say about it; the other two failures are the client's own
 * accounts of what it could not do.
 */
export class ApiError extends Error {
  readonly kind: ApiFailureKind;
  readonly status: number | undefined;

  constructor(
    kind: ApiFailureKind,
    message: string,
    options: ApiErrorOptions = {}
  ) {
    super(message, { cause: options.cause });
    this.name = 'ApiError';
    this.kind = kind;
    this.status = options.status;
  }
}

/**
 * What the client needs of a contract schema: it turns an unknown payload into
 * the typed value, or throws. The contracts package owns the schemas, so the
 * client never restates what the server sends and never depends on how they are
 * built.
 */
export interface ContractSchema<T> {
  parse(value: unknown): T;
}

/**
 * A failure the client reports when it cannot read what the server answered,
 * whether the body was not JSON at all or a frame the contracts do not describe.
 */
export const malformedAnswer = (cause?: unknown): ApiError =>
  new ApiError(ApiFailureKind.Malformed, UNREADABLE_MESSAGE, { cause });

/**
 * The one place the client talks to the server. A path is resolved against the
 * configured base URL, and the answer is validated with the contract schema
 * before it is handed back, so nothing downstream sees a shape the shared
 * contracts do not describe.
 */
export async function apiRequest<T>(
  path: string,
  schema: ContractSchema<T>,
  init?: RequestInit
): Promise<T> {
  const response = await send(path, init);

  if (!response.ok) {
    throw new ApiError(ApiFailureKind.Refused, await refusalMessage(response), {
      status: response.status
    });
  }

  const payload = await readPayload(response);

  try {
    return schema.parse(payload);
  } catch (error) {
    throw malformedAnswer(error);
  }
}

/**
 * A request whose answer is its status and nothing else, which is what a delete
 * answers with. A 204 is a success here rather than a body the client cannot
 * read, so it does not go through the single-body path.
 */
export async function apiSend(path: string, init: RequestInit): Promise<void> {
  const response = await send(path, init);

  if (!response.ok) {
    throw new ApiError(ApiFailureKind.Refused, await refusalMessage(response), {
      status: response.status
    });
  }
}

/**
 * The same request when its answer arrives in pieces rather than as one body.
 * Only reaching the server and being answered is settled here; what the pieces
 * say is the caller's to read, so a turn can be refused exactly like any other
 * request before any of it is read.
 */
export async function apiStream(
  path: string,
  init: RequestInit
): Promise<ReadableStream<Uint8Array>> {
  const response = await send(path, init);

  if (!response.ok) {
    throw new ApiError(ApiFailureKind.Refused, await refusalMessage(response), {
      status: response.status
    });
  }

  if (response.body === null) {
    throw malformedAnswer();
  }

  return response.body;
}

async function send(
  path: string,
  init: RequestInit | undefined
): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, init);
  } catch (error) {
    throw new ApiError(ApiFailureKind.Unreachable, UNREACHABLE_MESSAGE, {
      cause: error
    });
  }
}

/**
 * The message a refusal carries: the server's own when it explained itself, and
 * the client's account of the status when it did not, since a failure body is
 * not something the client can insist on.
 */
async function refusalMessage(response: Response): Promise<string> {
  const refused = `The server refused the request (${response.status}).`;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return refused;
  }

  const failure = apiErrorSchema.safeParse(payload);
  return failure.success ? failure.data.error : refused;
}

async function readPayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ApiError(ApiFailureKind.Malformed, UNREADABLE_MESSAGE);
  }
}
