---
title: RLM Curation Single-Pass Flow
summary: 'RLM curation workflow for single-pass contexts: recon already computed, proceed directly to extraction, organize facts with dedup/grouping, curate via UPSERT, and verify results through applied file paths.'
tags: []
related: []
keywords: []
createdAt: '2026-05-26T17:57:09.138Z'
updatedAt: '2026-05-26T17:57:09.138Z'
---
## Reason
Capture the single-pass RLM curation procedure, constraints, and verification guidance from the provided context.

## Raw Concept
**Task:**
Document the RLM curation workflow for contexts where recon is already computed and the mode is single-pass.

**Changes:**
- Proceed directly to extraction without running recon again
- Use tools.curation.groupBySubject() and tools.curation.dedup() to organize extractions
- Verify curated results through result.applied[].filePath

**Flow:**
precomputed recon -> direct extraction -> dedup/group by subject -> curate with UPSERT -> verify applied file paths

**Timestamp:** 2026-05-26T17:56:59.852Z

**Author:** ByteRover context engineer

## Narrative
### Structure
The context is a short operational note describing how to curate a single-pass RLM input. It emphasizes skipping recon, using the taskId variable directly when needed, and keeping verification lightweight.

### Dependencies
Depends on precomputed recon output and the sandbox curation helpers for extraction, grouping, and deduplication.

### Highlights
Single-pass mode is explicitly recommended, with no chunking required for this context size. The workflow also stresses not printing raw context and not using readFile for verification.

## Facts
- **curation_approach**: The provided context uses the RLM curation approach. [project]
- **recon_status**: Recon was already computed before curation started. [project]
- **suggested_mode**: The suggested mode is single-pass. [project]
- **suggested_chunk_count**: The suggested chunk count is 1. [project]
- **map_extract_timeout**: When mapExtract is used, timeout must be set to 300000 on the code_exec tool call itself. [convention]
- **verification_method**: Verification should use result.applied[].filePath instead of readFile. [convention]
