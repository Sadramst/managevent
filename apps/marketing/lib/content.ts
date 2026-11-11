import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { ContentCeremonySchema, ContentVenuesSchema } from "@managevent/validators";

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

export function loadPerthVenues() {
  const filePath = resolve(process.cwd(), "../../content/locations/perth/venues.json");
  return ContentVenuesSchema.parse(JSON.parse(readFileSync(filePath, "utf8")) as unknown);
}
