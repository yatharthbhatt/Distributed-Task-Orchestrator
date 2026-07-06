// K6 load test — validates the orchestrator sustains 100+ requests/sec on the
// job-submission endpoint.
//
//   k6 run loadtest/submit_jobs.js
//   k6 run -e BASE_URL=http://localhost:8000 loadtest/submit_jobs.js
//
// Uses a ramping arrival rate so the target is an actual requests/sec figure
// (independent of per-request latency), peaking above 100 rps.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const submitErrors = new Rate("submit_errors");

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

export const options = {
  scenarios: {
    submit_jobs: {
      executor: "ramping-arrival-rate",
      startRate: 20,
      timeUnit: "1s",
      preAllocatedVUs: 50,
      maxVUs: 300,
      stages: [
        { target: 50, duration: "15s" },   // warm up
        { target: 120, duration: "30s" },  // push past 100 rps
        { target: 120, duration: "30s" },  // hold
        { target: 0, duration: "10s" },    // ramp down
      ],
    },
  },
  thresholds: {
    // Fault tolerance target: <2% submission errors (mirrors the 98% completion goal).
    submit_errors: ["rate<0.02"],
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<800"],
  },
};

// A mix of task types so workers exercise every queue.
const TASKS = [
  { task_type: "cpu", payload: { n: 20000 } },
  { task_type: "io", payload: { seconds: 0.2 } },
  { task_type: "aggregate", payload: { count: 20000 } },
  { task_type: "flaky", payload: {} },
];

export default function () {
  const job = TASKS[Math.floor(Math.random() * TASKS.length)];
  const res = http.post(`${BASE_URL}/jobs`, JSON.stringify(job), {
    headers: { "Content-Type": "application/json" },
  });

  const ok = check(res, {
    "status is 201": (r) => r.status === 201,
    "has job id": (r) => {
      try {
        return typeof r.json("id") === "number";
      } catch {
        return false;
      }
    },
  });
  submitErrors.add(!ok);
}
