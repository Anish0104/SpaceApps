# Evaluation

Owner: Juvana. Questions: Navneet (`data/eval/questions.json`, frozen before tuning search).

Systems compared on the same questions:

1. Keyword: MiniSearch BM25
2. Embeddings: bge-small-en-v1.5 cosine
3. Plain RAG: top-k chunks + LLM, no rules or validator (Anish provides)
4. FlameAtlas: hybrid search + rules engine + citation validator

Report Top-1 / Top-3, citation precision, unsupported-claim count, correct abstentions, Referee
accuracy, adversarial catches, skeptic catches. Always with sample size, denominator and failures.
