-- Get the current view definition
SELECT pg_get_viewdef('public.food_analysis_slo_metrics'::regclass, true) as view_definition;
