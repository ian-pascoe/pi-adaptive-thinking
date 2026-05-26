---
title: RLM Curation Single-Pass Flow
summary: 'Single-pass RLM curation workflow for small contexts: recon recommends single-pass, then extract, dedupe, group, curate, and verify results.'
tags: []
related: [project_management/curation_workflow/rlm_curation_process.md, project_management/curation_workflow/rlm_curation_single_pass_flow.md]
keywords: []
createdAt: '2026-05-26T17:57:09.138Z'
updatedAt: '2026-05-26T18:09:00.742Z'
---
## Reason
Curate the single-pass RLM workflow described in the provided context

## Raw Concept
**Task:**
Document the RLM single-pass curation workflow for small contexts.

**Changes:**
- Proceed directly to extraction without running recon again
- Use tools.curation.groupBySubject() and tools.curation.dedup() to organize extractions
- Verify curated results through result.applied[].filePath
- Captured the single-pass decision path from recon output
- Recorded the extraction, deduplication, grouping, curation, and verification steps
- Preserved the operational constraints for mapExtract and verification

**Flow:**
recon already computed -> single-pass decision -> extract context -> dedup facts -> group by subject -> curate knowledge -> verify applied file paths

**Timestamp:** 2026-05-26T18:08:52.737Z

**Author:** ByteRover context engineer

## Narrative
### Structure
This topic describes the operational RLM curation sequence for small, single-pass contexts. It emphasizes using the precomputed recon result, then proceeding directly to extraction and curation without chunking.

### Dependencies
Depends on the precomputed recon output, the curation history metadata, and the taskId variable when mapExtract is used.

### Highlights
The workflow is optimized for compact inputs and explicitly avoids unnecessary recon calls. Verification relies on the curate result object rather than rereading files.

## Facts
- **context_size**: The context size is 1104 characters across 38 lines with 0 messages. [project]
- **recon_mode**: Recon has already been computed and suggested single-pass mode with 1 chunk. [project]
- **mapextract_task_id_usage**: For chunked extraction, taskId must be passed as a bare variable to mapExtract. [convention]
- **mapextract_timeout**: Any code_exec call containing mapExtract must use timeout 300000 on the code_exec tool call itself. [convention]
- **verification_method**: Verification should use result.applied[].filePath and must not call readFile for verification. [convention]
