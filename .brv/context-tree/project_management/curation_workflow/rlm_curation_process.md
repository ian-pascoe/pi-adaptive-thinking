---
title: RLM Curation Process
summary: RLM curation workflow covering recon, extraction, UPSERT curation, verification, and status reporting requirements.
tags: []
related: [project_management/curation_workflow/rlm_curation_process.md, docs/superpowers/context.md]
keywords: []
createdAt: '2026-05-26T17:26:58.779Z'
updatedAt: '2026-05-26T17:53:35.790Z'
---
## Reason
Curate the provided RLM approach instructions and workflow details into the context tree.

## Raw Concept
**Task:**
Document the RLM curation approach for this project

**Changes:**
- Captured precomputed recon guidance for single-pass processing
- Recorded required timeout handling for mapExtract calls
- Recorded verification rule using curate result paths
- Use recon before processing
- Use single-pass for small contexts
- Use mapExtract and dedup/grouping for chunked contexts
- Verify applied file paths after curation
- Use precomputed recon and proceed directly to extraction when suggestedMode is single-pass
- Use tools.curation.mapExtract for chunked contexts only when needed
- Organize extracted facts with tools.curation.dedup and tools.curation.groupBySubject
- Verify curation via result.applied[].filePath instead of readFile
- Captured the prescribed curation workflow and verification rules
- Recorded the single-pass recommendation and chunked extraction fallback
- Preserved the requirement to verify curation via applied file paths

**Flow:**
recon -> single-pass extraction or mapExtract -> dedup/groupBySubject -> UPSERT curate -> verify applied file paths -> status report

**Timestamp:** 2026-05-26T17:53:25.292Z

**Author:** ByteRover context engineer

## Narrative
### Structure
The process begins with precomputed recon, then proceeds directly to extraction and curation without rereading raw context. The workflow emphasizes using UPSERT for curation, organizing extracted facts with deduplication and grouping, and verifying outcomes from applied file paths.

### Dependencies
Relies on tools.curation.recon, mapExtract, dedup, groupBySubject, tools.curate, and the history recorder helpers for progress tracking.

### Highlights
The instructions explicitly require no raw context printing, no recon rerun, and no readFile-based verification. The stated goal is a resource-efficient curation pass that reports final status after applying updates.

### Rules
IMPORTANT: Do NOT print raw context. Do NOT call tools.curation.recon — it has been pre-computed. Proceed directly to extraction. For chunked extraction use tools.curation.mapExtract(). Pass taskId as a bare variable, not a string. Use tools.curation.groupBySubject() and tools.curation.dedup() to organize extractions. Verify via result.applied[].filePath — do NOT call readFile for verification.

### Examples
If mapExtract is used, the code_exec call containing it must use timeout: 300000 on the tool call itself.

## Facts
- **curation_approach**: The curation workflow uses the RLM approach. [project]
- **recon_step**: Recon is already computed before curating in this flow. [project]
- **suggested_mode**: Single-pass mode is used when recon suggests it. [project]
- **extraction_method**: Chunked extraction uses tools.curation.mapExtract when needed. [project]
- **verification_method**: Verification must use result.applied[].filePath and not readFile. [convention]
