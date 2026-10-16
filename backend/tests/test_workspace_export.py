"""Tests for downloading the datasets behind a workspace dashboard."""

import io
import zipfile

import pytest
from sqlalchemy import text

from app.db.workspace_db import get_workspace_engine
from app.services.workspace_manager import create_workspace, update_workspace_status


@pytest.mark.asyncio
async def test_ready_workspace_export_contains_source_csvs_and_manifest(client):
    ws = create_workspace("Export Test", "random", source="demo")
    engine = get_workspace_engine(ws.id)
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE customers (customer_id TEXT, name TEXT)"))
        connection.execute(text("INSERT INTO customers VALUES ('ORION-IN-00001', 'Aarav Patil')"))
        connection.execute(text("CREATE TABLE support_tickets (ticket_id TEXT, subject TEXT)"))
        connection.execute(text("INSERT INTO support_tickets VALUES ('TCK-0001', 'Delivery delay')"))
    update_workspace_status(ws.id, "ready")

    response = await client.get(
        f"/api/workspaces/{ws.id}/export-data",
        headers={"X-Workspace-Token": ws.access_token},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/zip")
    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        names = set(archive.namelist())
        assert "datasets/customers.csv" in names
        assert "datasets/support_tickets.csv" in names
        assert "manifest.json" in names
        assert "Aarav Patil" in archive.read("datasets/customers.csv").decode("utf-8-sig")


@pytest.mark.asyncio
async def test_workspace_export_rejects_unauthorized_request(client):
    ws = create_workspace("Private Export", "random", source="demo")
    update_workspace_status(ws.id, "ready")
    response = await client.get(f"/api/workspaces/{ws.id}/export-data")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_workspace_export_requires_ready_status(client):
    ws = create_workspace("Pending Export", "random", source="demo")
    response = await client.get(
        f"/api/workspaces/{ws.id}/export-data",
        headers={"X-Workspace-Token": ws.access_token},
    )
    assert response.status_code == 409
