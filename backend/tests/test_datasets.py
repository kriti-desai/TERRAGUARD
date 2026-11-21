import io
import pytest
from pathlib import Path
from app.services.dataset_service import parse_csv, validate_lat_lon

SAMPLE_CSV_PATH = Path(__file__).resolve().parents[1] / "datasets" / "sample_data" / "sample_observations.csv"

def test_parse_sample_csv():
    """Verify that the bundled sample observations CSV parses cleanly without fatal errors."""
    assert SAMPLE_CSV_PATH.exists()
    df, errors = parse_csv(str(SAMPLE_CSV_PATH))
    assert not df.empty
    assert "latitude" in df.columns
    assert "longitude" in df.columns
    assert "displacement_mm" in df.columns
    assert len(df) >= 10


def test_parse_csv_missing_required_column(tmp_path):
    """CSV parser should raise ValueError if required column is absent."""
    bad_csv = tmp_path / "bad.csv"
    bad_csv.write_text("latitude,longitude,elevation_m\n23.7,86.4,220.0\n")

    with pytest.raises(ValueError) as excinfo:
        parse_csv(str(bad_csv))
    assert "missing required columns" in str(excinfo.value)


def test_upload_dataset_endpoint(client, analyst_headers):
    """POST /datasets/upload parses CSV, persists Dataset + Observation + Location records."""
    csv_content = (
        "latitude,longitude,observation_date,displacement_mm,displacement_velocity_mm_year,location_name,region\n"
        "23.7512,86.4189,2023-01-15,-12.4,-18.2,Jharia Test Pit 1,Dhanbad Belt\n"
        "23.7512,86.4189,2023-04-20,-18.7,-24.5,Jharia Test Pit 1,Dhanbad Belt\n"
        "23.7850,85.9620,2023-01-15,-8.2,-12.0,Bokaro Site Alpha,Bokaro Belt\n"
    )

    file_obj = io.BytesIO(csv_content.encode("utf-8"))
    response = client.post(
        "/datasets/upload",
        files={"file": ("test_telemetry.csv", file_obj, "text/csv")},
        headers=analyst_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["dataset"]["total_records"] == 3
    assert data["dataset"]["file_type"] == "csv"
    assert len(data["preview"]) > 0


def test_upload_empty_file_rejected(client, analyst_headers):
    """Uploading an empty file must be rejected with HTTP 400."""
    empty_file = io.BytesIO(b"")
    response = client.post(
        "/datasets/upload",
        files={"file": ("empty.csv", empty_file, "text/csv")},
        headers=analyst_headers,
    )
    assert response.status_code == 400


def test_download_sample_endpoint(client, analyst_headers):
    """GET /datasets/sample/download streams the template CSV."""
    response = client.get("/datasets/sample/download", headers=analyst_headers)
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")
    assert "terraguard_sample_observations.csv" in response.headers.get("content-disposition", "")
