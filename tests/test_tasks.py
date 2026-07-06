"""Task-level tests: correctness + fault-tolerant retry/backoff behavior."""

from app.tasks.heavy_tasks import RETRY_POLICY, TransientError, aggregate, cpu_bound, flaky, io_bound


def test_cpu_bound_counts_primes():
    result = cpu_bound.apply(kwargs={"n": 100}).get()
    # primes below 100: 2,3,5,...,97 => 25 of them
    assert result["primes_below_n"] == 25
    assert result["n"] == 100


def test_io_bound_sleeps_and_reports():
    result = io_bound.apply(kwargs={"seconds": 0.01}).get()
    assert result["slept_seconds"] == 0.01


def test_aggregate_is_deterministic_with_seed():
    a = aggregate.apply(kwargs={"count": 500, "seed": 7}).get()
    b = aggregate.apply(kwargs={"count": 500, "seed": 7}).get()
    assert a["checksum"] == b["checksum"]
    assert a["count"] == 500


def test_flaky_succeeds_when_failure_rate_zero():
    result = flaky.apply(kwargs={"failure_rate": 0.0}).get()
    assert result["succeeded_on_attempt"] == 1


def test_flaky_exhausts_retries_then_fails():
    """A permanently failing task retries up to max_retries, then FAILS."""
    res = flaky.apply(kwargs={"failure_rate": 1.0})
    assert res.state == "FAILURE"
    assert isinstance(res.result, TransientError)


def test_retry_policy_configures_exponential_backoff():
    assert RETRY_POLICY["retry_backoff"] >= 1
    assert RETRY_POLICY["retry_jitter"] is True
    assert RETRY_POLICY["max_retries"] == 3  # from conftest env
    assert RETRY_POLICY["autoretry_for"] == (TransientError,)
