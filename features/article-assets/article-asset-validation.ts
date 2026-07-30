import { z } from "zod";

export const articleIdParamSchema = z.string().uuid();
export const assetIdParamSchema = z.string().uuid();
