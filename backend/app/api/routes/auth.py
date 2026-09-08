import os
from fastapi import APIRouter
from backend.app.services.ytmusic_service import ytmusic_service
from backend.app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.get("/status")
def get_auth_status():
    """Check YouTube Music OAuth / authentication status."""
    has_oauth_file = os.path.exists(settings.YTMUSIC_OAUTH_TOKEN_PATH)
    has_client_secrets = bool(settings.YTMUSIC_CLIENT_ID and settings.YTMUSIC_CLIENT_SECRET)

    return {
        "isAuthenticated": ytmusic_service.is_authenticated,
        "mode": "OAuth / Authenticated" if ytmusic_service.is_authenticated else "Public / Guest Mode",
        "hasOauthFile": has_oauth_file,
        "hasClientSecrets": has_client_secrets,
        "features": {
            "search": True,
            "charts": True,
            "home": True,
            "lyrics": True,
            "explore": True,
            "localPlaylists": True,
            "localHistory": True,
            "localLikedSongs": True,
            "youtubeAccountSync": ytmusic_service.is_authenticated,
        }
    }


@router.get("/instructions")
def get_setup_instructions():
    """Retrieve setup guide for Google Cloud / YouTube Music OAuth."""
    return {
        "title": "Connecting Your YouTube Music Account",
        "steps": [
            {
                "step": 1,
                "title": "Create a Google Cloud Project",
                "description": "Visit https://console.cloud.google.com and create a new project called 'Aurora Music'."
            },
            {
                "step": 2,
                "title": "Enable YouTube Data API v3",
                "description": "Under 'APIs & Services' > 'Library', search for 'YouTube Data API v3' and enable it."
            },
            {
                "step": 3,
                "title": "Configure OAuth Consent Screen & Credentials",
                "description": "Create an OAuth 2.0 Client ID (type: Desktop or Web) and obtain Client ID and Client Secret."
            },
            {
                "step": 4,
                "title": "Run Setup Helper",
                "description": "Run `python -m backend.auth.setup` in your terminal to authenticate and generate oauth.json."
            },
            {
                "step": 5,
                "title": "Restart Server",
                "description": "Restart your Aurora Music server to synchronize your personal playlists, liked songs, and subscriptions!"
            }
        ]
    }


@router.post("/reload")
def reload_auth():
    """Attempt to reload credentials without server restart."""
    ytmusic_service._init_client()
    return {
        "status": "success",
        "isAuthenticated": ytmusic_service.is_authenticated
    }
