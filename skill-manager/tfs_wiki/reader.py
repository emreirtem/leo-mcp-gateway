import requests
from requests.auth import HTTPBasicAuth
import logging
from typing import Optional, Dict, Any, Union

from .config import TFSConfig

logger = logging.getLogger(__name__)

class TFSWikiReader:
    """
    Skill to read wiki pages and metadata from a self-hosted TFS / Azure DevOps Server.
    It can read from different projects and wikis (team wikis or general wikis).
    """

    def __init__(self):
        TFSConfig.validate()
        self.base_url = TFSConfig.TFS_BASE_URL
        self.collection = TFSConfig.TFS_COLLECTION
        self.pat = TFSConfig.TFS_PAT
        
        # In TFS REST API, Basic Auth username can be empty, password is the PAT
        self.auth = HTTPBasicAuth('', self.pat)

    def get_projects(self, api_version: str = "6.0") -> Dict[str, Any]:
        """
        Fetch all projects in the TFS collection.
        Returns a dictionary with success status and a list of project data.
        """
        endpoint = f"{self.base_url}/{self.collection}/_apis/projects"
        
        try:
            response = requests.get(
                url=endpoint,
                params={"api-version": api_version},
                auth=self.auth,
                headers={"Accept": "application/json"}
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "success": True,
                "projects": data.get("value", [])
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch projects - {str(e)}")
            error_details = str(e)
            if isinstance(e, requests.exceptions.HTTPError) and e.response is not None:
                 error_details = f"HTTP {e.response.status_code}: {e.response.text}"
            return {"success": False, "error": error_details}

    def get_wikis(self, project: str, api_version: str = "6.0") -> Dict[str, Any]:
        """
        Fetch all wikis under a specific project.
        """
        endpoint = f"{self.base_url}/{self.collection}/{project}/_apis/wiki/wikis"
        
        try:
            response = requests.get(
                url=endpoint,
                params={"api-version": api_version},
                auth=self.auth,
                headers={"Accept": "application/json"}
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "success": True,
                "project": project,
                "wikis": data.get("value", [])
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch wikis for project '{project}' - {str(e)}")
            error_details = str(e)
            if isinstance(e, requests.exceptions.HTTPError) and e.response is not None:
                 error_details = f"HTTP {e.response.status_code}: {e.response.text}"
            return {"success": False, "error": error_details}

    def get_wiki_pages_tree(self, project: str, wiki_identifier: str, api_version: str = "6.0") -> Dict[str, Any]:
        """
        Fetch the full page tree/hierarchy for a given wiki.
        """
        endpoint = f"{self.base_url}/{self.collection}/{project}/_apis/wiki/wikis/{wiki_identifier}/pages"
        
        try:
            # recursionLevel > 0 fetches the tree instead of just the root/single path
            # 120 is generally high enough to get the entire wiki tree
            response = requests.get(
                url=endpoint,
                params={"recursionLevel": 120, "api-version": api_version},
                auth=self.auth,
                headers={"Accept": "application/json"}
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "success": True,
                "project": project,
                "wiki": wiki_identifier,
                "pages_tree": data
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch wiki pages tree for '{wiki_identifier}' - {str(e)}")
            error_details = str(e)
            if isinstance(e, requests.exceptions.HTTPError) and e.response is not None:
                 error_details = f"HTTP {e.response.status_code}: {e.response.text}"
            return {"success": False, "error": error_details}

    def get_page(self, project: str, wiki_identifier: str, page_path: str, api_version: str = "6.0") -> Dict[str, Any]:
        """
        Reads the content of a specific file in a TFS Wiki.
        """
        if not page_path.startswith('/'):
            page_path = '/' + page_path
            
        endpoint = f"{self.base_url}/{self.collection}/{project}/_apis/wiki/wikis/{wiki_identifier}/pages"
        
        params = {
            "path": page_path,
            "includeContent": "True",
            "api-version": api_version
        }
        
        try:
            response = requests.get(
                url=endpoint,
                params=params,
                auth=self.auth,
                headers={"Accept": "application/json"}
            )
            
            response.raise_for_status()
            data = response.json()
            
            return {
                "success": True,
                "project": project,
                "wiki": wiki_identifier,
                "path": data.get("path", page_path),
                "content": data.get("content", ""),
                "url": data.get("remoteUrl", endpoint)
            }

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch TFS wiki page '{page_path}' - {str(e)}")
            error_details = str(e)
            if isinstance(e, requests.exceptions.HTTPError) and e.response is not None:
                 error_details = f"HTTP {e.response.status_code}: {e.response.text}"
            return {"success": False, "error": error_details}

# Instantiate a default reader for straightforward usage
default_reader = TFSWikiReader()

def read_tfs_wiki_page(project: str, wiki_identifier: str, page_path: str) -> str:
    result = default_reader.get_page(project, wiki_identifier, page_path)
    if result.get("success"):
        return result.get("content", "")
    return f"Error reading page: {result.get('error')}"

def list_tfs_projects() -> list:
    """Helper functional interface to get list of project names"""
    result = default_reader.get_projects()
    if result.get("success"):
        # Just return project names for simplicity, or you could return the raw dict
        return [proj.get("name") for proj in result.get("projects", [])]
    return [f"Error: {result.get('error')}"]

def list_tfs_wikis(project: str) -> list:
    """Helper functional interface to get wikis under a project"""
    result = default_reader.get_wikis(project)
    if result.get("success"):
        # Return wiki names/identifiers
        return [wiki.get("name") for wiki in result.get("wikis", [])]
    return [f"Error: {result.get('error')}"]

def extract_paths_from_tree(node: dict) -> list:
    """Recursively extract all paths from a wiki tree node."""
    paths = []
    if "path" in node:
        paths.append(node["path"])
    
    for sub_page in node.get("subPages", []):
        paths.extend(extract_paths_from_tree(sub_page))
        
    return paths

def list_tfs_wiki_paths(project: str, wiki_identifier: str) -> list:
    """Helper functional interface to get all available page paths in a wiki"""
    result = default_reader.get_wiki_pages_tree(project, wiki_identifier)
    if result.get("success"):
        tree = result.get("pages_tree", {})
        # Tree response typically contains a top level node that has subPages
        return extract_paths_from_tree(tree)
    return [f"Error: {result.get('error')}"]
