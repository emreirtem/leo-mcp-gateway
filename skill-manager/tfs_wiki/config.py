import os
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class TFSConfig:
    """TFS Configuration settings loaded from environment."""
    
    TFS_BASE_URL: str = os.getenv("TFS_BASE_URL", "http://tfs-server:8080/tfs")
    TFS_COLLECTION: str = os.getenv("TFS_COLLECTION", "DefaultCollection")
    TFS_PAT: str = os.getenv("TFS_PAT", "")

    # Clean up trailing slashes
    if TFS_BASE_URL.endswith('/'):
        TFS_BASE_URL = TFS_BASE_URL[:-1]

    @classmethod
    def validate(cls):
        """Validate if required configs are set."""
        if not cls.TFS_PAT or cls.TFS_PAT == "your_personal_access_token":
            logger.warning("TFS_PAT is not set or using default value. Authentication might fail.")
