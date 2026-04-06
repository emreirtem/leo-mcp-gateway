import sys
import logging
from tfs_wiki import read_tfs_wiki_page, list_tfs_projects, list_tfs_wikis, list_tfs_wiki_paths

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_skill():
    """
    Test script to verify the TFS Wiki Reader functionality locally.
    Usage: run `python main.py {Command} [Args...]`
    Commands:
      projects
      wikis <ProjectName>
      tree <ProjectName> <WikiIdentifier>
      read <ProjectName> <WikiIdentifier> <PagePath>
    """
    args = sys.argv[1:]
    
    if len(args) < 1:
        logging.warning("Not enough arguments to run a real test.")
        logging.info("Commands: projects | wikis <Proj> | tree <Proj> <WikiId> | read <Proj> <WikiId> <Path>")
        return

    command = args[0]

    if command == "projects":
        logging.info("Fetching projects...")
        print(list_tfs_projects())

    elif command == "wikis":
        if len(args) < 2:
            logging.error("Requires <ProjectName>")
            return
        logging.info(f"Fetching wikis for project '{args[1]}'...")
        print(list_tfs_wikis(args[1]))

    elif command == "tree":
        if len(args) < 3:
            logging.error("Requires <ProjectName> <WikiIdentifier>")
            return
        logging.info(f"Fetching path tree for wiki '{args[2]}' in project '{args[1]}'...")
        paths = list_tfs_wiki_paths(args[1], args[2])
        print("----- FOUND PATHS -----")
        for p in paths:
             print(p)
        print(f"Total paths: {len(paths)}")

    elif command == "read":
        if len(args) < 4:
            logging.error("Requires <ProjectName> <WikiIdentifier> <PagePath>")
            return
        project_name = args[1]
        wiki_id = args[2]
        page_path = args[3]
        
        logging.info(f"Attempting to read path '{page_path}' from wiki '{wiki_id}' in project '{project_name}'...")
        content = read_tfs_wiki_page(project=project_name, wiki_identifier=wiki_id, page_path=page_path)
        
        # Print out a preview of the content
        print("----- WIKI CONTENT PREVIEW -----")
        print(content[:500] + ("..." if len(content) > 500 else ""))
        print("--------------------------------")
        
    else:
        logging.error(f"Unknown command: {command}")

if __name__ == "__main__":
    test_skill()
