import axios from 'axios';

// Получаем переменные окружения с префиксом REACT_APP_
const proxyPort = process.env.REACT_APP_PROXY_PORT;
const proxyHost = process.env.REACT_APP_PROXY_HOST;
const jiraUrl = `http://${proxyHost}:${proxyPort}/api`;
const username = process.env.REACT_APP_JIRA_USERNAME;
const password = process.env.REACT_APP_JIRA_PASSWORD;

const auth = {
  auth: { username, password },
};

export const fetchJiraStatuses = async (projectKey) => {
  try {
    const response = await axios.get(
      `${jiraUrl}/rest/api/2/project/${projectKey}/statuses`,
      auth
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching Jira statuses:', error);
    throw error;
  }
};

export const fetchJiraIssues = async (params) => {
  let jql = '';
  
  if (params.issueKey) {
    // Запрос по конкретной задаче и её связям
    jql = `
      (
        issue = ${params.issueKey}
        OR issueFunction in linkedIssuesOfRecursiveLimited("issue = ${params.issueKey}", ${params.depth || 2}, "includes")
      )
      AND project in (${params.projects.map(p => `"${p}"`).join(', ')})
      OR issueFunction in linkedIssuesOf(
        "issue = ${params.issueKey} OR issueFunction in linkedIssuesOfRecursiveLimited('issue = ${params.issueKey}', ${params.depth || 2}, 'includes')",
        "blocked by"
      )
    `;
  } else if (params.jql) {
    // Произвольный JQL запрос
    jql = params.jql;
  } else if (params.project) {
    // Запрос по проекту
    jql = `project = "${params.project}"`;
    
    if (params.filters) {
      jql += ` AND ${params.filters}`;
    }
  }
  
  try {
    const response = await axios.get(
      `${jiraUrl}/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=${params.maxResults || 300}&expand=transitions,changelog,status`,
      auth
    );
    return response.data.issues;
  } catch (error) {
    console.error('Ошибка при получении данных из Jira:', error);
    throw error;
  }
};