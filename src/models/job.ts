// src/models/job.ts
// M1 MENTOR DEMO — modeling the data, and meeting STRUCTURAL typing.

/**
 * A single search-result row, scraped from the listing page (.data-row).
 * This is the "shallow" view — only what the search page exposes. The richer
 * per-job fields (Requisition ID, Work Area, ...) live on the detail page and
 * become `JobDetail` — that's your DIY below.
 */
export interface JobListing {
  title: string; // e.g. "Architect (f/m/d) for Foundation Model and Data Platform"
  location: string; // from .jobLocation, e.g. "Potsdam"
  detailUrl: string; // absolute URL to the /job/... page
  jobId: string; // the trailing numeric id in the href, e.g. "1373104333"
}
export interface JobDetail {
  requisitionId?: string; 
  workArea: string;
  employmentType: string;
  careerStatus?: string;
  expectedTravel?: string;
  datePosted: string;
  description: string;
}

export type EnrichedJob = JobListing & {detail: JobDetail | null}; // <- is this a union? an intersection? Why is it needed?

/**
 * Render one listing as a CLI line.
 * Note there's NO type annotation on the local `line` — TS INFERS `string`.
 * Rule of thumb you'll use all course: annotate function *boundaries* (params and
 * return type — they're the contract), but let TS infer *locals*. Over-annotating
 * locals is noise and occasionally fights inference.
 */
export function formatJobLine(job: JobListing): string {
  const line = `${job.title}  —  ${job.location}\n    ${job.detailUrl}`;
  return line;
}
