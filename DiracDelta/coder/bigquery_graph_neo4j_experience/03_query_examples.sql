-- Example Queries for the `prompt_execution_graph`

-- Scenario 1: Structural Pattern Matching (The "Neo4j Experience")
-- Find two-step execution chains and return the latency of the second step.
-- This uses GRAPH_TABLE with GQL syntax, similar to Cypher.
SELECT
  p.prompt_name,
  e1.execution_id AS first_step_id,
  e2.execution_id AS second_step_id,
  e2.latency_ms AS second_step_latency
FROM GRAPH_TABLE(
  `prism_prompt_catalog.prompt_execution_graph`
  -- Match a prompt that was used by an execution, which was followed by another execution.
  MATCH (p:prompts) <-[:UsesPrompt]- (e1:executions) -[:Follows]-> (e2:executions)
  COLUMNS (
    p.prompt_name,
    e1.execution_id,
    e2.execution_id,
    e2.latency_ms
  )
);


-- Scenario 2: Safe Metric Aggregation with Measures
-- Calculate the total cost and average latency for each prompt, aggregated across all
-- of its executions. This query is immune to fan-out/double-counting bugs.
-- This uses GRAPH_EXPAND and the AGG() function to safely compute measures.
SELECT
  prompts_prompt_name,
  -- Use AGG() to correctly compute the grain-locked measures.
  AGG(executions_total_cost) AS total_cost_for_prompt,
  AGG(executions_avg_latency) AS average_latency_for_prompt
FROM GRAPH_EXPAND(
    'prism_prompt_catalog.prompt_execution_graph',
    PATTERNS ( (prompts) <-[:UsesPrompt]- (executions) )
)
GROUP BY
  prompts_prompt_name;
