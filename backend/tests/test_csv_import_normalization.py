import pandas as pd
import pytest

from app.services.data_generation.dataset import normalize_customer_csv


def test_normalizes_common_customer_csv_headers():
    frame = pd.DataFrame({
        "Customer ID": [f"cust-{i:03d}" for i in range(100)],
        "Customer Name": [f"Customer {i}" for i in range(100)],
        "Email Address": [f"customer{i}@example.com" for i in range(100)],
        "Company Name": ["Example Co"] * 100,
        "Plan": ["Pro"] * 100,
        "Signup Date": ["2024-01-01"] * 100,
        "Churned": ["no"] * 99 + ["yes"],
    })
    result = normalize_customer_csv(frame)
    assert len(result) == 100
    assert list(result.columns) == [
        "customer_id", "name", "email", "company", "industry", "company_size",
        "plan_tier", "signup_date", "region", "acquisition_channel", "is_churned", "churned_date",
    ]
    assert result.iloc[0]["plan_tier"] == "growth"
    assert int(result["is_churned"].sum()) == 1


def test_rejects_too_few_customer_rows():
    with pytest.raises(ValueError, match="at least 100"):
        normalize_customer_csv(pd.DataFrame({"name": ["One customer"]}))


def test_rejects_duplicate_customer_ids():
    frame = pd.DataFrame({
        "customer_id": ["duplicate"] * 100,
        "name": [f"Customer {i}" for i in range(100)],
    })
    with pytest.raises(ValueError, match="must be unique"):
        normalize_customer_csv(frame)
