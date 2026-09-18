import { z } from 'zod';

/**
 * What a conversation and a message are known by. An id is a UUID rather than a
 * number, so it is opaque: it says nothing about how many rows came before it,
 * and it is the same id wherever it is read, sent, or put in an address.
 */
export const idSchema = z.uuid();
