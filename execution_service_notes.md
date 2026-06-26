# Execution Service — Pre-Built Repo Analysis

**Repo:** https://github.com/klsharsha/execution-service
**Analysed on:** 2026-06-19
**Relevant when:** Sprint — Execution Service Integration

---

## What's Already Built (Reuse As-Is)

- `ExecutionConsumer.java` — RabbitMQ consumer, runs Docker sandbox per language, compile → execute loop, sends Kafka result
- `ExecutionProducer.java` — RabbitMQ publisher (queues submission IDs)
- `KafkaProducerService.java` — Publishes result events to Kafka
- `SubmissionController.java` — REST intake, saves to DB, enqueues to RabbitMQ
- `Submission.java` + `SubmissionRepository.java` — JPA entity and repo
- `TestCase.java` + `TestCaseRepository.java` — test case model (needs rework, see gaps)
- `KafkaConfig.java`, `RabbitMQConfig.java` — messaging configuration
- **Docker images** for: `java-runner`, `python-runner`, `cpp-runner`, `c-runner`, `javascript-runner`
- Eureka client already configured
- PostgreSQL (`execution_db`) already configured

---

## Gaps to Fix During Integration (1–2 days)

| # | Issue | Fix |
|---|---|---|
| 1 | `server.port=8084` — conflicts with AI Service | Change to `8083` |
| 2 | `Submission.id` is `Long` (IDENTITY) | Migrate to `UUID` |
| 3 | Kafka topic is `submission-result` | Change to `submission.completed` to match LLD |
| 4 | `ExecutionConsumer` fetches test cases from its own DB (`TestCaseRepository`) | Test cases live in `contest_db`. Pass them inside the RabbitMQ message (`SubmissionMessage`) instead — remove `TestCaseRepository` dependency from consumer |
| 5 | No `submission_test_results` table | Add `SubmissionTestResult` entity + insert per test case after execution |
| 6 | No `@Valid` on `SubmissionRequest` | Add Bean Validation annotations |
| 7 | `@CrossOrigin("http://localhost:5173")` hardcoded | Remove — CORS handled at API Gateway |
| 8 | DB password hardcoded in `application.properties` | Move to environment variables |
| 9 | Kafka event payload doesn't match LLD `SubmissionCompletedEvent` schema | Update payload to include `submissionId, userId, contestId, problemId, verdict, score, executionTime` (`problemsSolved` removed — computed by leaderboard consumer) |
| 10 | No Dead Letter Queue for failed executions | Add `submission.dlq` with 3-retry policy + `StaleSubmissionSweeper` for PENDING submissions older than 5 min |
| 11 | No source code size limit | Add `@Size(max=50000)` to `sourceCode` in `CreateSubmissionRequest` |

---

## LLD Reference

- `SubmissionMessage` (what goes into RabbitMQ queue) — LLD Section 2.3
- `SubmissionCompletedEvent` (what goes to Kafka) — LLD Section 2.3
- `SubmissionTestResult` entity — LLD Section 2.3 + ER Diagram Section 1.3
- `LanguageExecutor` Strategy interface — can wrap `ExecutionConsumer` logic behind it
- Port assignment: Execution Service = **8083**, AI Service = **8084**

---

## Notes

- The Docker sandbox core (compile, run, TLE, memory limit) is solid. Do NOT rewrite it.
- Main rework is the message contract (pass test cases in message, not fetched from DB) and the result schema.
- `ExecutionConsumer` already calls `kafkaProducer.send(resultTopic, event)` — just update the topic name and event payload shape.
