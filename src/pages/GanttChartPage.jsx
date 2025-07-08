import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button, Box, Typography, CircularProgress, Paper } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { fetchJiraIssues, fetchJiraStatuses } from '../api/jiraApi';
import { processJiraIssue } from '../utils/jiraDataProcessor';
import { buildIssueHierarchy } from '../utils/issueHierarchyBuilder';
import { convertToGanttFormat, filterTasksByStatuses, createTestGanttData } from '../utils/ganttFormatter';
import CollapsibleJSON from '../components/CollapsibleJSON';
import StatusFilter from '../components/StatusFilter';
import GanttChart from '../components/GanttChart';
import OptimizedJiraData from '../components/OptimizedJiraData';
import JiraKeyInput from '../components/JiraKeyInput';

const GanttChartPage = () => {
  // URL параметры
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Состояния
  const [inputValue, setInputValue] = useState('');
  const [mainIssueKey, setMainIssueKey] = useState('');
  const [processedIssues, setProcessedIssues] = useState([]);
  const [issueHierarchy, setIssueHierarchy] = useState(null);
  const [ganttTasks, setGanttTasks] = useState([]);
  const [projectStatuses, setProjectStatuses] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isStatusesLoading, setIsStatusesLoading] = useState(false);
  const [showHierarchy, setShowHierarchy] = useState(true);
  
  // Ref для доступа к методам JiraKeyInput
  const jiraKeyInputRef = useRef(null);

  // Проверяем URL параметр key при загрузке страницы
  useEffect(() => {
    const keyParam = searchParams.get('key');
    if (keyParam) {
      setInputValue(keyParam);
      // Автоматически загружаем данные
      fetchData(keyParam);
    }
  }, []); // Выполняется только при монтировании

  // Загрузка данных из Jira
  const fetchData = useCallback(async (issueKey) => {
    setIsDataLoading(true);
    try {
      // Получаем настройки из переменных окружения
      const projectsString = process.env.REACT_APP_JIRA_PROJECTS;
      const depth = parseInt(process.env.REACT_APP_JIRA_DEPTH || "2", 10);
      
      // Формируем параметры запроса
      const fetchParams = {
        issueKey: issueKey,
        depth: depth
      };
      
      // Добавляем проекты только если они указаны в переменных окружения
      if (projectsString && projectsString.trim()) {
        fetchParams.projects = projectsString.split(',').map(p => p.trim());
      }
      
      // Получаем данные из Jira
      const issues = await fetchJiraIssues(fetchParams);
      
      // Обрабатываем каждую задачу
      const processed = issues.map(issue => processJiraIssue(issue, issues));
      setProcessedIssues(processed);
      
      // Определяем основную задачу, если не указана явно
      const mainKey = issueKey; // Всегда используем введенный ключ как главную задачу
      setMainIssueKey(mainKey);
      
      // Строим иерархию задач
      const hierarchy = buildIssueHierarchy(processed);
      setIssueHierarchy(hierarchy);
      
      // Преобразуем в формат для диаграммы Ганта
      const ganttData = convertToGanttFormat(processed, hierarchy);
      setGanttTasks(ganttData);
      
      // Обновляем URL параметр при успешной загрузке
      setSearchParams({ key: issueKey });
      
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
    } finally {
      setIsDataLoading(false);
    }
  }, [setSearchParams]);

  // Загрузка статусов из Jira
  const fetchStatuses = useCallback(async (issueKey) => {
    setIsStatusesLoading(true);
    try {
      const projectKey = issueKey.split('-')[0];
      const issueTypes = await fetchJiraStatuses(projectKey);
      setProjectStatuses(issueTypes);
      
      const allStatuses = new Set();
      issueTypes.forEach(issueType => {
        issueType.statuses.forEach(status => {
          allStatuses.add(status.name);
        });
      });
      
      setSelectedStatuses(Array.from(allStatuses));
    } catch (error) {
      console.error('Ошибка при загрузке статусов:', error);
    } finally {
      setIsStatusesLoading(false);
    }
  }, []);

  // Обработчик изменения статуса
  const handleStatusChange = (statusName, isChecked) => {
    setSelectedStatuses(prev => {
      const newStatuses = isChecked 
        ? [...prev, statusName]
        : prev.filter(status => status !== statusName);
      return newStatuses;
    });
  };

  // Загрузка тестовых данных
  const loadTestData = () => {
    try {
      const testData = createTestGanttData();
      
      if (!testData) {
        // Создаем минимальные тестовые данные
        const minimalTestData = {
          ganttTasks: [
            {
              id: 1,
              jiraId: 'TEST-100',
              name: 'Тестовый проект',
              isParent: true,
              isExpanded: true,
              children: [],
              phases: [
                {
                  status: 'backlog',
                  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                  endDate: new Date()
                }
              ]
            }
          ]
        };
        
        setGanttTasks(minimalTestData.ganttTasks);
        setProcessedIssues([{ key: 'TEST-100', summary: 'Тестовый проект' }]);
        setIssueHierarchy({ rootIssues: [{ key: 'TEST-100' }], allIssues: [{ key: 'TEST-100' }] });
        setMainIssueKey('TEST-100');
        
        return;
      }
      
      // Проверяем структуру тестовых данных
      if (testData.ganttTasks) {
        setGanttTasks(testData.ganttTasks);
        
        // Если есть formattedData, используем его
        if (testData.formattedData) {
          // Создаем обработанные задачи из formattedData
          const mainIssue = testData.formattedData.main_issue;
          const linkedIssues = testData.formattedData.linked_issues || [];
          
          const processed = [
            mainIssue,
            ...linkedIssues
          ].filter(Boolean); // Фильтруем undefined значения
          
          setProcessedIssues(processed);
          
          // Создаем простую иерархию для тестовых данных
          const hierarchy = {
            rootIssues: [mainIssue].filter(Boolean),
            allIssues: processed
          };
          
          setIssueHierarchy(hierarchy);
        } else {
          // Создаем минимальные данные, чтобы избежать ошибок
          setProcessedIssues([{ key: 'TEST-100', summary: 'Тестовый проект' }]);
          setIssueHierarchy({ rootIssues: [], allIssues: [] });
        }
        
        // Устанавливаем статусы и выбранные статусы
        if (testData.selectedStatuses) {
          setSelectedStatuses(testData.selectedStatuses);
        }
        
        if (testData.projectStatuses) {
          setProjectStatuses(testData.projectStatuses);
        }
        
        setMainIssueKey('TEST-100');
        
      } else {
        console.error('Некорректный формат тестовых данных:', testData);
      }
    } catch (error) {
      console.error('Ошибка при загрузке тестовых данных:', error);
      // Создаем минимальные данные в случае ошибки
      setGanttTasks([{
        id: 1,
        jiraId: 'TEST-100',
        name: 'Тестовый проект (ошибка загрузки)',
        isParent: false,
        phases: []
      }]);
      setProcessedIssues([{ key: 'TEST-100', summary: 'Тестовый проект (ошибка загрузки)' }]);
      setIssueHierarchy({ rootIssues: [], allIssues: [] });
      setMainIssueKey('TEST-100');
    }
  };

  // Отфильтрованные задачи для отображения
  const filteredGanttTasks = filterTasksByStatuses(ganttTasks, selectedStatuses);

  // Функция для преобразования иерархических задач в плоский список
  const flattenTasks = (tasks) => {
    return tasks.map(task => ({
      ...task,
      isParent: false,
      isExpanded: false,
      parentId: null
    }));
  };

  // Выбираем, какие задачи отображать в зависимости от настройки иерархии
  const tasksToDisplay = showHierarchy 
    ? filteredGanttTasks 
    : flattenTasks(filteredGanttTasks);

  const handleInputChange = (value) => {
    setInputValue(value);
  };

  // Функция для обработки клика на кнопку "Получить данные"
  const handleFetchData = () => {
    const key = inputValue.trim();
    if (!key) return;
    
    // Загружаем данные
    fetchData(key);

    // Явно добавляем ключ в историю
    if (jiraKeyInputRef.current) {
      jiraKeyInputRef.current.addToHistory(key);
    }
  };

  return (
    <Box className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md mb-8">
        <div className="px-8 py-6 flex items-center gap-3">
          <Typography variant="h4" component="h1" className="!font-semibold !text-gray-800 !tracking-tight" style={{fontFamily: 'inherit'}}>Jira Gantt Board</Typography>
        </div>
      </header>
      {/* Main Content */}
      <main className="px-8">
        <Box className="bg-white rounded-xl shadow p-6 mb-8">
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <JiraKeyInput
              ref={jiraKeyInputRef}
              value={inputValue}
              onChange={handleInputChange}
              onSubmit={(key) => fetchData(key)}
              loading={isDataLoading || isStatusesLoading}
              disabled={isDataLoading || isStatusesLoading}
            />
            <Button
              variant="contained"
              onClick={handleFetchData}
              disabled={isDataLoading || isStatusesLoading || !inputValue.trim()}
              sx={{ ml: 2, mb: 1, height: 56 }}
            >
              {isDataLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1, color: 'inherit' }} />
                  Загрузка...
                </>
              ) : (
                'Получить данные'
              )}
            </Button>
          </Box>
        </Box>
        {processedIssues.length > 0 && (
          <>
            {/* Диаграмма Ганта */}
            <Box className="bg-white rounded-xl shadow p-6 mb-8">
              <GanttChart 
                tasks={tasksToDisplay} 
                showHierarchy={showHierarchy}
                onHierarchyChange={setShowHierarchy}
              />
            </Box>
            {/* Фильтр статусов */}
            {projectStatuses.length > 0 && (
              <Box className="bg-white rounded-xl shadow p-6 mb-8">
                <StatusFilter
                  issueTypes={projectStatuses}
                  selectedStatuses={selectedStatuses}
                  onStatusChange={handleStatusChange}
                />
              </Box>
            )}
            {/* JSON и оптимизированные данные */}
            <Box className="bg-white rounded-xl shadow p-6 mb-8">
              <Typography variant="h6" gutterBottom>Данные из Jira</Typography>
              <CollapsibleJSON 
                data={{ 
                  main_issue_key: mainIssueKey,
                  hierarchy: issueHierarchy,
                  processed_issues: processedIssues
                }} 
                title="Структура данных" 
                defaultCollapsed={true} 
              />
              <CollapsibleJSON 
                data={{ 
                  tasksToDisplay
                }} 
                title="Tasks to display" 
                defaultCollapsed={true} 
              />
            </Box>
            <Box className="bg-white rounded-xl shadow p-6 mb-8">
              <OptimizedJiraData 
                processedIssues={processedIssues}
                hierarchy={issueHierarchy}
              />
            </Box>
          </>
        )}
      </main>
    </Box>
  );
};

export default GanttChartPage;