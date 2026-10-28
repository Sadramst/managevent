import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { ContentCeremonySchema } from "@managevent/validators";

export function loadCeremonies() {
  const folder = resolve(process.cwd(), "../../content/ceremonies");
  return readdirSync(folder)
    .filter((file) => file.endsWith(".json"))
    .map((file) =>
      ContentCeremonySchema.parse(
        JSON.parse(readFileSync(resolve(folder, file), "utf8")) as unknown,
      ),
    );
}
