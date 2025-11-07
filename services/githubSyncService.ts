import { Task } from '../types';

const GIST_DESCRIPTION = 'Habbit-Nested App Data';
const GIST_FILENAME = 'habbit-nested-data.json';

interface GistFile {
  content: string;
}

interface Gist {
  id: string;
  files: {
    [key: string]: GistFile;
  };
  updated_at: string;
}

interface SyncResult {
  success: boolean;
  data?: Task[];
  error?: string;
  lastSyncTime?: string;
}

/**
 * Save tasks to GitHub Gist
 */
export async function saveToGist(token: string, tasks: Task[], gistId: string | null): Promise<SyncResult> {
  try {
    const content = JSON.stringify({
      tasks,
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    }, null, 2);

    const body = {
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        [GIST_FILENAME]: {
          content
        }
      }
    };

    let response: Response;
    
    if (gistId) {
      // Update existing gist
      response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });
    } else {
      // Create new gist
      response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const gist: Gist = await response.json();
    
    // Store the gist ID for future updates
    localStorage.setItem('github-gist-id', gist.id);

    return {
      success: true,
      lastSyncTime: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error saving to Gist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Load tasks from GitHub Gist
 */
export async function loadFromGist(token: string): Promise<SyncResult> {
  try {
    // First, try to get the stored gist ID
    const storedGistId = localStorage.getItem('github-gist-id');
    
    if (storedGistId) {
      // Try to load from the stored gist ID
      const response = await fetch(`https://api.github.com/gists/${storedGistId}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      });

      if (response.ok) {
        const gist: Gist = await response.json();
        const fileContent = gist.files[GIST_FILENAME]?.content;
        
        if (fileContent) {
          const data = JSON.parse(fileContent);
          return {
            success: true,
            data: data.tasks,
            lastSyncTime: data.lastUpdated
          };
        }
      }
    }

    // If no stored ID or loading failed, search for the gist
    const response = await fetch('https://api.github.com/gists', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const gists: Gist[] = await response.json();
    const targetGist = gists.find(g => 
      g.description === GIST_DESCRIPTION && 
      g.files[GIST_FILENAME]
    );

    if (targetGist) {
      // Store the gist ID for future use
      localStorage.setItem('github-gist-id', targetGist.id);
      
      const fileContent = targetGist.files[GIST_FILENAME].content;
      const data = JSON.parse(fileContent);
      
      return {
        success: true,
        data: data.tasks,
        lastSyncTime: data.lastUpdated
      };
    }

    // No existing gist found
    return {
      success: true,
      data: [],
      lastSyncTime: undefined
    };
  } catch (error) {
    console.error('Error loading from Gist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Verify if the GitHub token is valid
 */
export async function verifyToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
}
