import { z } from "zod";

export const mediaIdSchema = z.string().uuid();
