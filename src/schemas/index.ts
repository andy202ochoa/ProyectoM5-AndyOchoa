import { z } from "zod";

export const listRepositoriesSchema = {
    per_page: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(30)
        .describe("Cantidad de repositorios a listar (entre 1 y 100). Por defecto 30."),
};