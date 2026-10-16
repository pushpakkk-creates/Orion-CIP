"""Generate source tables atomically, retaining only customers between stages."""

from collections.abc import Callable
from pathlib import Path
import pandas as pd

import numpy as np
from faker import Faker

from app.db.database import Base
from app.services.data_generation.activity import generate_campaigns, generate_events, generate_orders
from app.services.data_generation.customers import generate_customers, generate_subscriptions
from app.services.data_generation.feedback import generate_feedback, generate_tickets
from app.services.data_generation.definitions import CHURN_RATE, NUM_CUSTOMERS


def normalize_customer_csv(frame: pd.DataFrame) -> pd.DataFrame:
    """Normalize common customer CSV headers to Orion's canonical customer schema.

    Imported profiles are used as the customer source; supporting subscriptions,
    events, orders, tickets and feedback are generated synthetically so the full
    existing analytics pipeline remains usable. Missing optional profile fields
    receive conservative defaults rather than fabricated personal attributes.
    """
    if frame.empty:
        raise ValueError("The uploaded CSV contains no customer rows.")
    if len(frame) < 100:
        raise ValueError("Upload at least 100 customer rows so Orion's segmentation and churn analytics have enough data.")
    if len(frame) > 10000:
        raise ValueError("CSV uploads are limited to 10,000 customers.")

    def key(value: object) -> str:
        return "".join(ch for ch in str(value).strip().lower() if ch.isalnum())

    aliases = {
        "customer_id": {"customerid", "customer_id", "id", "userid", "user_id", "accountid"},
        "name": {"name", "customername", "full_name", "fullname", "contactname"},
        "email": {"email", "emailaddress", "customeremail"},
        "company": {"company", "companyname", "organization", "organisation", "accountname"},
        "industry": {"industry", "sector", "vertical"},
        "company_size": {"companysize", "company_size", "size", "employees", "employeesize"},
        "plan_tier": {"plantier", "plan_tier", "plan", "subscriptionplan", "tier"},
        "signup_date": {"signupdate", "signup_date", "createdat", "created_at", "startdate", "registrationdate"},
        "region": {"region", "country", "market", "geography", "location"},
        "acquisition_channel": {"acquisitionchannel", "acquisition_channel", "channel", "source", "marketingchannel"},
        "is_churned": {"ischurned", "is_churned", "churned", "churnstatus", "cancelled", "canceled"},
        "churned_date": {"churneddate", "churned_date", "cancellationdate", "cancelleddate", "canceleddate"},
    }
    normalized_headers = {key(col): col for col in frame.columns}
    meaningful_aliases = aliases["customer_id"] | aliases["name"] | aliases["email"] | aliases["company"]
    if not any(key(alias) in normalized_headers for alias in meaningful_aliases):
        raise ValueError("CSV must include a recognizable customer ID, name, email, or company column.")
    result = pd.DataFrame(index=frame.index)
    for target, names in aliases.items():
        match = next((normalized_headers[key(alias)] for alias in names if key(alias) in normalized_headers), None)
        if match is not None:
            result[target] = frame[match]

    n = len(frame)
    result["customer_id"] = result.get("customer_id", pd.Series([f"orion-{i+1:06d}" for i in range(n)], index=frame.index)).fillna("").astype(str).str.strip()
    blank_ids = result["customer_id"].eq("")
    result.loc[blank_ids, "customer_id"] = [f"orion-{i+1:06d}" for i in range(n) if blank_ids.iloc[i]]
    if result["customer_id"].duplicated().any():
        raise ValueError("CSV customer IDs must be unique. Rename or remove duplicate IDs and retry.")
    result["name"] = result.get("name", pd.Series([f"Customer {i+1}" for i in range(n)], index=frame.index)).fillna("").astype(str).str.strip()
    result.loc[result["name"].eq(""), "name"] = [f"Customer {i+1}" for i in range(n) if result["name"].iloc[i] == ""]
    result["email"] = result.get("email", pd.Series([f"customer{i+1}@example.invalid" for i in range(n)], index=frame.index)).fillna("").astype(str).str.strip()
    result.loc[result["email"].eq(""), "email"] = [f"customer{i+1}@example.invalid" for i in range(n) if result["email"].iloc[i] == ""]
    defaults = {"company":"Unknown Company", "industry":"Technology", "company_size":"smb", "plan_tier":"starter", "signup_date":"2024-01-01", "region":"Unknown", "acquisition_channel":"other"}
    for col, default in defaults.items():
        result[col] = result.get(col, pd.Series([default] * n, index=frame.index)).fillna(default).astype(str).str.strip().replace("", default)
    size_map = {"small":"smb", "small business":"smb", "smb":"smb", "startup":"startup", "medium":"mid_market", "mid market":"mid_market", "mid_market":"mid_market", "large":"enterprise", "enterprise":"enterprise"}
    result["company_size"] = result["company_size"].str.lower().map(lambda v: size_map.get(v, v if v in {"startup","smb","mid_market","enterprise"} else "smb"))
    tier_map = {
    "free": "free",
    "starter": "starter",
    "basic": "starter",
    "standard": "professional",
    "pro": "professional",
    "growth": "professional",
    "professional": "professional",
    "business": "enterprise",
    "premium": "enterprise",
    "enterprise": "enterprise",
}
    result["plan_tier"] = result["plan_tier"].str.lower().map(lambda v: tier_map.get(v, "starter"))
    parsed_dates = pd.to_datetime(result["signup_date"], errors="coerce", utc=True)
    result["signup_date"] = parsed_dates.dt.strftime("%Y-%m-%d").fillna("2024-01-01")
    if "is_churned" not in result:
        result["is_churned"] = 0
    else:
        result["is_churned"] = result["is_churned"].astype(str).str.lower().map({"1":1,"true":1,"yes":1,"churned":1,"cancelled":1,"canceled":1,"0":0,"false":0,"no":0,"active":0}).fillna(0).astype(int)
    if "churned_date" not in result:
        result["churned_date"] = None
    result["churned_date"] = pd.to_datetime(result["churned_date"], errors="coerce", utc=True).dt.strftime("%Y-%m-%d")
    return result[["customer_id","name","email","company","industry","company_size","plan_tier","signup_date","region","acquisition_channel","is_churned","churned_date"]].reset_index(drop=True)


def generate_dataset(
    target_engine,
    customer_count: int = NUM_CUSTOMERS,
    churn_rate: float = CHURN_RATE,
    primary_industry: str | None = None,
    seed: int = 42,
    on_stage: Callable[[int, str], None] | None = None,
    include_outage: bool = True,
    customer_csv_path: str | None = None,
) -> dict[str, int]:
    """Append a complete dataset in one transaction; failures leave existing rows intact."""
    import app.models  # noqa: F401 — register table definitions

    rng = np.random.default_rng(seed)
    fake = Faker()
    fake.seed_instance(seed)
    if on_stage:
        on_stage(1, "Creating customer profiles")
    if customer_csv_path:
        customers = normalize_customer_csv(pd.read_csv(customer_csv_path))
        customer_count = len(customers)
    else:
        customers = generate_customers(rng, fake, customer_count, churn_rate, primary_industry)
    stages = (
        ("subscriptions", "Generating subscriptions", lambda: generate_subscriptions(customers, rng)),
        ("orders", "Generating orders & transactions", lambda: generate_orders(customers, rng)),
        ("behavior_events", "Building behavioral events", lambda: generate_events(customers, rng)),
        ("support_tickets", "Generating support tickets", lambda: generate_tickets(customers, rng, include_outage=include_outage)),
        ("feedback", "Generating customer feedback", lambda: generate_feedback(customers, rng, include_outage=include_outage)),
        ("campaigns", "Loading marketing campaigns", lambda: generate_campaigns(rng)),
    )
    Base.metadata.create_all(target_engine)
    counts = {"customers": len(customers)}
    with target_engine.begin() as connection:
        customers.to_sql("customers", connection, if_exists="append", index=False)
        for index, (table, label, generate) in enumerate(stages, start=2):
            if on_stage:
                on_stage(index, label)
            frame = generate()
            frame.to_sql(table, connection, if_exists="append", index=False)
            counts[table] = len(frame)
            del frame
    return counts
