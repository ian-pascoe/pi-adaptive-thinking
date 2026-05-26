---
title: Superpowers Specs Curation Approach
summary: 'Pi thinking-level API research: get/set thinking level, clamping behavior, supported levels, event payload, and model capability lookup.'
tags: []
related: [project_management/curation_workflow/rlm_curation_process.md]
keywords: []
createdAt: '2026-05-26T17:31:18.124Z'
updatedAt: '2026-05-26T17:33:54.266Z'
---
## Reason
Record the research findings and implementation-relevant API details from the spec update

## Raw Concept
**Task:**
Curate research findings about the Pi adaptive thinking API and its model-aware level selection behavior.

**Changes:**
- Recorded the use of precomputed recon output.
- Captured the single-pass extraction and curate-upsert workflow.
- Included verification guidance based on applied file paths.
- Documented the public API for reading and setting thinking levels
- Captured clamping and event emission behavior
- Recorded supported level values and capability lookup details
- Noted the committed spec file and commit hash

**Files:**
- docs/superpowers/specs/2026-05-26-pi-adaptive-thinking-design.md

**Flow:**
research -> update spec -> commit -> record durable findings

**Timestamp:** 2026-05-26T17:33:30.707Z

**Author:** assistant

**Patterns:**
- `^off|minimal|low|medium|high|xhigh$` - Allowed Pi thinking levels

## Narrative
### Structure
This knowledge captures the research-backed API surface, the supported thinking levels, the event payload contract, and the recommended public route for extension handlers.

### Dependencies
Depends on active model metadata via ctx.model and on the pi-ai helper exports for capability lookup and clamping.

### Highlights
The lower-level AgentSession method exists but should not be used directly from ExtensionAPI; getSupportedThinkingLevels(ctx.model) is the public path.

### Rules
Only the public helper route should be used from ExtensionAPI.
setThinkingLevel must respect model capability limits.
thinking_level_select includes both level and previousLevel.

### Examples
Example supported-level lookup: getSupportedThinkingLevels(ctx.model).

## Facts
- **pi_thinking_api**: Pi extension API has pi.getThinkingLevel() and pi.setThinkingLevel(level). [project]
- **thinking_level_set_behavior**: setThinkingLevel clamps to model capabilities and emits thinking_level_select. [project]
- **thinking_level_select_event**: thinking_level_select provides level and previousLevel. [project]
- **pi_thinking_levels**: Valid Pi levels are off, minimal, low, medium, high, xhigh. [project]
- **thinking_level_map**: Model metadata uses thinkingLevelMap; null means unsupported. [project]
- **pi_ai_exports**: @earendil-works/pi-ai exports getSupportedThinkingLevels(model) and clampThinkingLevel(model, level). [project]
- **extension_ctx_model**: Extension handlers have ctx.model, so valid levels can be derived from the active model. [project]
- **agent_session_thinking_levels**: AgentSession.getAvailableThinkingLevels() exists but is not exposed directly on ExtensionAPI. [project]
- **public_thinking_level_route**: getSupportedThinkingLevels(ctx.model) is the right public route for extension handlers. [project]
- **spec_commit**: The spec update was committed as 2f8f1c2 with message docs: record pi thinking api research. [project]
- **updated_spec_file**: The updated file is docs/superpowers/specs/2026-05-26-pi-adaptive-thinking-design.md. [project]
- **brv_state**: Only untracked item noted was .brv/, which is local ByteRover state and should not be committed. [project]
