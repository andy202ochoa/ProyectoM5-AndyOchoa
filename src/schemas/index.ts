import { z } from "zod";
// --- Piezas reutilizables ---

// Nombre para un repositorio NUEVO: reglas de la consigna
const newRepoName = z
    .string()
    .min(3, "El nombre del repositorio debe tener al menos 3 caracteres.")
    .max(100, "El nombre del repositorio no puede superar los 100 caracteres.")
    .regex(
        /^[a-zA-Z0-9-]+$/,
        "El nombre solo puede contener letras, números y guiones (sin espacios ni otros símbolos)."
    )
    .describe("Nombre del nuevo repositorio: de 3 a 100 caracteres, solo letras, números y guiones.");

// Nombre de un repositorio que YA existe: más permisivo
const existingRepoName = z
    .string()
    .min(1, "Debes indicar el nombre del repositorio.")
    .max(100, "El nombre del repositorio no puede superar los 100 caracteres.")
    .regex(
        /^[a-zA-Z0-9._-]+$/,
        "El nombre del repositorio solo puede contener letras, números, puntos, guiones y guiones bajos."
    )
    .describe("Nombre del repositorio, sin el dueño. Ejemplo: 'mi-app'.");

const ownerName = z
    .string()
    .min(1)
    .max(39, "Un usuario u organización de GitHub no puede superar los 39 caracteres.")
    .regex(/^[a-zA-Z0-9-]+$/, "El dueño solo puede contener letras, números y guiones.")
    .optional()
    .describe("Usuario u organización dueña del repositorio. Si se omite, se usa el usuario autenticado.");

// --- Schemas de cada tool ---

export const listRepositoriesSchema = {
    per_page: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(30)
        .describe("Cantidad de repositorios a listar (entre 1 y 100). Por defecto 30."),
};

export const createRepositorySchema = {
    name: newRepoName,
    description: z
        .string()
        .max(350, "La descripción no puede superar los 350 caracteres.")
        .optional()
        .describe("Descripción corta del repositorio (máximo 350 caracteres)."),
    private: z
        .boolean()
        .default(true)
        .describe("true para repositorio privado (por defecto), false para público."),
};

export const createIssueSchema = {
    owner: ownerName,
    repo: existingRepoName,
    title: z
        .string()
        .min(1, "El título del issue no puede estar vacío.")
        .max(256, "El título del issue no puede superar los 256 caracteres.")
        .describe("Título del issue."),
    body: z
        .string()
        .max(65536, "El cuerpo del issue es demasiado largo.")
        .optional()
        .describe("Descripción detallada del issue. Admite Markdown."),
};