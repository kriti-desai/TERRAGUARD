import pytest
from datetime import datetime
from app.models import Location, Observation, RiskAssessment, Alert, Dataset, DatasetStatus, UserRole

def test_health_and_root(client):
    """Verify health and metadata endpoints."""
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert res_root.json()["platform"] == "TERRAGUARD"

    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"


def test_dashboard_endpoints(client, analyst_headers, db_session):
    """Verify dashboard summary, risk-distribution and recent-activity endpoints."""
    # Seed a location with assessment
    loc = Location(name="Test Mine Central", latitude=23.75, longitude=86.40, mining_area=True)
    db_session.add(loc)
    db_session.commit()

    ra = RiskAssessment(location_id=loc.id, risk_level="HIGH", risk_score=85.0)
    db_session.add(ra)
    db_session.commit()

    # 1. Summary
    res_sum = client.get("/dashboard/summary", headers=analyst_headers)
    assert res_sum.status_code == 200
    data_sum = res_sum.json()
    assert data_sum["total_locations"] >= 1
    assert data_sum["high_risk"] >= 1

    # 2. Risk distribution
    res_dist = client.get("/dashboard/risk-distribution", headers=analyst_headers)
    assert res_dist.status_code == 200
    dist = res_dist.json()
    assert isinstance(dist, list)
    assert any(d["risk_level"] == "HIGH" for d in dist)

    # 3. Recent activity
    res_act = client.get("/dashboard/recent-activity", headers=analyst_headers)
    assert res_act.status_code == 200
    assert isinstance(res_act.json(), list)


def test_risk_and_observations_endpoints(client, analyst_headers, db_session, test_analyst_user):
    """Verify risk locations, terrain, history and observations endpoints."""
    loc = Location(
        name="Telemetry Node 101",
        latitude=23.7120,
        longitude=86.3540,
        elevation_m=230.0,
        region="Dhanbad",
    )
    db_session.add(loc)
    db_session.commit()

    dataset = Dataset(
        filename="batch1.csv",
        original_filename="batch1.csv",
        file_type="csv",
        status=DatasetStatus.PROCESSED.value,
        uploaded_by=test_analyst_user.id,
    )
    db_session.add(dataset)
    db_session.commit()

    obs1 = Observation(
        location_id=loc.id,
        dataset_id=dataset.id,
        observation_date=datetime(2023, 5, 1),
        latitude=loc.latitude,
        longitude=loc.longitude,
        displacement_mm=-15.2,
    )
    obs2 = Observation(
        location_id=loc.id,
        dataset_id=dataset.id,
        observation_date=datetime(2023, 8, 1),
        latitude=loc.latitude,
        longitude=loc.longitude,
        displacement_mm=-22.4,
    )
    db_session.add_all([obs1, obs2])
    db_session.commit()

    # /risk/locations
    res_locs = client.get("/risk/locations", headers=analyst_headers)
    assert res_locs.status_code == 200
    assert len(res_locs.json()) >= 1

    # /risk/terrain
    res_terrain = client.get("/risk/terrain", headers=analyst_headers)
    assert res_terrain.status_code == 200
    t_data = res_terrain.json()
    assert "x" in t_data
    assert "y" in t_data
    assert "z" in t_data
    assert "disclaimer" in t_data

    # /risk/{loc_id}/observations
    res_obs = client.get(f"/risk/{loc.id}/observations", headers=analyst_headers)
    assert res_obs.status_code == 200
    obs_list = res_obs.json()
    assert len(obs_list) == 2
    assert obs_list[0]["displacement_mm"] == -15.2
    assert obs_list[1]["displacement_mm"] == -22.4


def test_alerts_lifecycle(client, analyst_headers, db_session):
    """Test creating a manual alert, listing it, and updating its status."""
    loc = Location(name="Alert Test Pit", latitude=23.70, longitude=86.30)
    db_session.add(loc)
    db_session.commit()

    # Create alert
    payload = {
        "location_id": loc.id,
        "risk_level": "ELEVATED",
        "title": "Unusual subsidence acceleration",
        "description": "Velocity jumped from -5mm/yr to -25mm/yr in 30 days.",
        "displacement_mm": -25.0,
    }
    create_res = client.post("/alerts", json=payload, headers=analyst_headers)
    assert create_res.status_code == 201
    alert_id = create_res.json()["id"]

    # List alerts
    list_res = client.get("/alerts?status=NEW", headers=analyst_headers)
    assert list_res.status_code == 200
    assert any(a["id"] == alert_id for a in list_res.json())

    # Update alert status to UNDER_REVIEW
    patch_res = client.patch(
        f"/alerts/{alert_id}",
        json={"status": "UNDER_REVIEW", "assigned_analyst": "Dr. Sarah Rao"},
        headers=analyst_headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "UNDER_REVIEW"
    assert patch_res.json()["assigned_analyst"] == "Dr. Sarah Rao"


def test_reports_generation_and_download(client, analyst_headers, db_session):
    """Test generating a formal PDF report and downloading it."""
    loc = Location(
        name="Jharia Sector 8 Mining Lease",
        latitude=23.7420,
        longitude=86.4150,
        elevation_m=220.0,
        region="Jharia",
        state="Jharkhand",
    )
    db_session.add(loc)
    db_session.commit()

    ra = RiskAssessment(location_id=loc.id, risk_level="HIGH", risk_score=88.5)
    db_session.add(ra)
    db_session.commit()

    # Generate report
    gen_res = client.post("/reports/generate", json={"location_id": loc.id}, headers=analyst_headers)
    assert gen_res.status_code == 201
    report_id = gen_res.json()["id"]

    # List reports
    list_res = client.get("/reports", headers=analyst_headers)
    assert list_res.status_code == 200
    assert any(r["id"] == report_id for r in list_res.json())

    # Download report PDF
    down_res = client.get(f"/reports/{report_id}/download", headers=analyst_headers)
    assert down_res.status_code == 200
    assert down_res.headers.get("content-type") == "application/pdf"
    assert len(down_res.content) > 1000  # PDF binary content
