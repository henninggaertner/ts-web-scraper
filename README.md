# A simple SAP job scraper - to learn TypeScript

## M1 

### type vs interface
Use interfaces for extensible object shapes and type for unions, intersections and aliases of interfaces. Interfaces are required for those object operations. 

EnrichedJob is a type, as we first scrape the job listing, then want to store each job listing structured, and in the second phase scrape each jobs details which we can easily append to the EnrichedJob type via the detail property created by the union / intersection with the inline object.
*A note on composition:* One important design pattern is composition of objects. Instead of extending interface a with interface b, just create a new type c which unions their objects together. This is cleaner.