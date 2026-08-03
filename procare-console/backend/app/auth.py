import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from app.config import settings

# Initialize Supabase clients
# We initialize one with the service role key for administrative operations (backend-only)
# and one with the anon key for normal client operations.
supabase_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
supabase_admin_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    
    # 1. Try local JWT verification if JWT secret is available
    if settings.SUPABASE_JWT_SECRET:
        try:
            # Supabase JWTs are typically HS256 and signed with the database JWT Secret
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.InvalidTokenError as e:
            # If JWT secret decoding fails, we proceed to try API verification
            pass
            
    # 2. Fallback or direct check with Supabase Auth API
    try:
        response = supabase_client.auth.get_user(token)
        if response and response.user:
            # Format the user data as a standard claims payload
            user_data = {
                "sub": response.user.id,
                "email": response.user.email,
                "role": response.user.role,
                "user_metadata": response.user.user_metadata or {}
            }
            return user_data
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials with Supabase",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
