Pattern & task type selection

- Which task type was matched — and was it confident or a fallback?
- Which pattern was chosen — and from how many valid options? If general →
react is the only option, that's a non-decision. If there were 3 valid
patterns and one was picked, why?

Tool selection (most valuable signal)

- The candidates — full list of tools the agent considered at this step, with
their descriptions as the LLM saw them
- The reasoning — the LLM's verbatim rationale for picking the chosen tool.
This is gold — if the agent keeps picking the wrong tool, the description is
the lever you can actually pull
- Argument extraction — the raw LLM output before parsing into structured
arguments. When extraction fails you want to see exactly what the LLM said
- Tools never picked — across many runs, which tools never get used? That's a
red flag for description quality

Tool execution

- Latency per tool invocation
- Success / failure — did the tool error? Return empty? Return useful data?
- Token economics — input/output tokens, model used, estimated cost
- Output truncation — if observations are getting clipped before going back to
 the agent

Iteration / loop dynamics

- Step number vs max_iterations — agents that always run to the limit suggest
the pattern isn't converging
- Did the new observation change the agent's plan? — comparing the thought
before and after each observation tells you if the tool actually helped
- Retries — when the LLM produced malformed output, did the agent
self-correct?

Termination

- Why did the loop stop — got an answer / hit max iterations / gave up / fatal
 error
- Confidence in the final answer — did the agent caveat heavily or commit?

Cross-run aggregates (the real gold for config tuning)

This is the bit that's probably a different system entirely, but worth
flagging:
- Per-tool: pick rate, success rate, average latency, average tokens
- Per-pattern: convergence rate, average iterations, success rate
- Per-prompt: which prompts produced parse errors, which produced useful
output

What's missing from today's events

Looking at what we get now — grounding, exploration, focus, synthesis — these
are RAG-shaped. For agent debugging I'd want event types like:

- tool-candidates — list of tools available at this step
- tool-decision — chosen tool + LLM rationale + raw extracted args
- tool-execution — invocation result, latency, tokens
- iteration-marker — step N of M, with the working memory
- termination — why we stopped

Whether these become new event types in the explain stream, or a sibling
"agent-debug" stream alongside the explain one, is an architecture call. The
event-card pattern we have already would handle them fine — just new event
type cases in ExplainEventCard.

My recommendation: don't build new parsing yet. First, run a real query
through the existing strip and look at what the explain events actually
contain for an agent run. They might already have more agent-specific data
than we know. Then we can identify the gaps and decide if it's a new event
type, an enriched existing one, or a separate stream.

Want to test that — wire a real agent query through and see what events come
back?

