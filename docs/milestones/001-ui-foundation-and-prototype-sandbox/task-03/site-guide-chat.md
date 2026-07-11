# Prototype a static site-guide interaction

## Prototype Question

Can a restrained, chat-shaped site guide help visitors understand and navigate the representative Landing, Lab, and Me content more effectively than ordinary orientation links, without pretending to be a general-purpose technical assistant?

## Intended Outcome

Produce a static sandbox interaction study with deterministic prompts and responses. It should test the guide's role, language, visual prominence, and fallback to normal navigation while making the absence of AI behavior explicit.

## Experiment Shape and Placeholder Content

- Add a `site-guide-static-study` experiment to the existing `/sandbox` registry after the other surface prototypes establish representative destinations and labels.
- Provide three or four preset visitor questions, such as where to start, how to find papers, how to find experiments, and who maintains the site.
- Map every preset question to a fixed response containing concise guidance and sandbox-local destination suggestions.
- Allow reviewers to change the visible preset response using native buttons or another accessible native control; do not include free-form text input or simulated typing.
- Include an always-visible conventional link list so the guide supplements rather than replaces navigation.
- Label the specimen as a static prototype and do not suggest that responses are generated or personalized.

## Foundation and Sandbox Constraints

- Reuse global tokens and existing sandbox primitives; keep transcript, prompt, and destination styling local to the experiment.
- Prefer native interactive elements with clear selected, hover, focus, and disabled states where applicable.
- If state is needed, keep it local and deterministic. Add no network request, persistence, streaming, model SDK, or dependency.
- Preserve responsive layout, semantic status labeling, keyboard operation, and supported color schemes.

## Review Evidence

- Wide and narrow viewport captures in light and dark modes, showing at least two selected prompts.
- Keyboard-only review of prompt selection and destination actions.
- A short note comparing guide-assisted discovery with the visible conventional links and identifying any confusing assistant-like expectations.

## Decisions This Prototype Should Enable

- Whether a chat-shaped guide provides value beyond ordinary Landing navigation.
- Which visitor intents and destinations are appropriate for a future guide.
- The guide's appropriate prominence, disclosure language, and fallback behavior.
- Whether a later milestone should explore a limited functional guide or reject the chat direction.

## Exclusions

- Free-form input, AI or model calls, retrieval, embeddings, streaming, persistence, authentication, analytics, moderation systems, backend routes, or a general-purpose technical assistant.
- Production chat placement, final navigation, or claims of intelligent behavior.

## Acceptance Criteria

- The experiment uses only preset prompts and deterministic responses and is visibly labeled as static.
- Every suggested destination corresponds to representative content established by the other prototype briefs.
- Conventional navigation remains visible and usable without the guide.
- Prompt selection and destination actions are keyboard accessible and reviewable across target widths and color schemes.
- Review notes state whether the guide adds discovery value and what, if anything, a later functional study should test.
- No AI capability, backend, free-form input, persistence, unnecessary dependency, or production-facing behavior is introduced.

