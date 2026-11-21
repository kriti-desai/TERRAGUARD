import pytest
from app.models import User, UserRole

def test_register_public_user_success(client):
    """Public registration should create an analyst user successfully."""
    payload = {
        "email": "geologist_test@terraguard.in",
        "full_name": "Field Geologist",
        "password": "SecurePassword123!",
        "role": "analyst",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "geologist_test@terraguard.in"
    assert data["user"]["role"] == UserRole.ANALYST.value


def test_register_public_admin_forbidden(client):
    """Public registration must strictly reject any attempt to register with Admin role."""
    payload = {
        "email": "hacker_admin@terraguard.in",
        "full_name": "Attempted Admin",
        "password": "Password123!",
        "role": "admin",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 403
    assert "Public registration as Admin is not permitted" in response.json()["detail"]


def test_register_duplicate_email_rejected(client):
    """Duplicate email registration must be rejected with HTTP 400 (case-insensitive)."""
    payload1 = {
        "email": "unique_analyst@terraguard.in",
        "full_name": "Analyst One",
        "password": "Password123!",
    }
    res1 = client.post("/auth/register", json=payload1)
    assert res1.status_code == 201

    # Try registering again with different case
    payload2 = {
        "email": "UNIQUE_ANALYST@terraguard.in",
        "full_name": "Analyst Duplicate",
        "password": "AnotherPassword123!",
    }
    res2 = client.post("/auth/register", json=payload2)
    assert res2.status_code == 400
    assert "Email already registered" in res2.json()["detail"]


def test_login_success_with_email(client, test_analyst_user):
    """Login with registered email and password returns JWT token."""
    response = client.post("/auth/login", json={
        "email": "test_analyst@terraguard.in",
        "password": "AnalystPass@123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test_analyst@terraguard.in"
    assert data["user"]["role"] == UserRole.ANALYST.value


def test_login_success_with_username_field(client, test_analyst_user):
    """Login accepting 'username' alias for compatibility with OAuth2 clients."""
    response = client.post("/auth/login", json={
        "username": "test_analyst@terraguard.in",
        "password": "AnalystPass@123",
    })
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_invalid_password(client, test_analyst_user):
    """Login with wrong password must return HTTP 401."""
    response = client.post("/auth/login", json={
        "email": "test_analyst@terraguard.in",
        "password": "WrongPassword!",
    })
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_login_nonexistent_user(client):
    """Login with non-existent user must return HTTP 401."""
    response = client.post("/auth/login", json={
        "email": "nobody@terraguard.in",
        "password": "SomePassword123!",
    })
    assert response.status_code == 401


def test_me_endpoint_with_valid_token(client, analyst_headers):
    """GET /auth/me returns current authenticated user profile."""
    response = client.get("/auth/me", headers=analyst_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test_analyst@terraguard.in"
    assert data["role"] == UserRole.ANALYST.value


def test_me_endpoint_unauthorized(client):
    """GET /auth/me without token returns HTTP 401."""
    response = client.get("/auth/me")
    assert response.status_code == 401
