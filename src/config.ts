export type OutputFormat = "json" | "csv" | "ndjson";
export type EngineKind = "static" | "playwright";
export interface Config {
    query: string;
    location: string;
    maxPages: number;
    format: OutputFormat;
    engine: EngineKind;
    out?: string;
}