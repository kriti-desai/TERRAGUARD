"""
Auth Routes – /auth
Register, login and profile endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import User, UserRole
from ..schemas import UserCreate, UserLogin, UserOut, Token
from ..auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user account and return a JWT token.
    Public registration strictly assigns the ANALYST role to prevent unauthorized Admin elevation.
    Returns HTTP 400 if the email is already registered.
    """
    norm_email = payload.email.lower().strip()
    existing = db.query(User).filter(func.lower(User.email) == norm_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered.",
        )

    # Security rule: Public registration CANNOT grant Admin privileges.
    if payload.role and payload.role.strip().lower() == UserRole.ADMIN.value.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public registration as Admin is not permitted. Admin accounts must be provisioned by a system administrator.",
        )
    # All public accounts are created with ANALYST role.
    assigned_role = UserRole.ANALYST.value

    user = User(
        email=norm_email,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role=assigned_role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate with email + password and return a JWT token.
    Returns HTTP 401 on invalid credentials.
    """
    raw_login = payload.email or payload.username
    if not raw_login:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username is required.",
        )
    norm_login = raw_login.lower().strip()
    user = db.query(User).filter(func.lower(User.email) == norm_login).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled.",
        )

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return UserOut.model_validate(current_user)
