import React, { useState, useCallback, useEffect } from 'react';
import { TextField, Button, Box, Typography, CircularProgress, Paper, FormControlLabel, Switch } from '@mui/material';
import { fetchJiraIssues, fetchJiraStatuses } from '../api/jiraApi';
import { processJiraIssue } from '../utils/jiraDataProcessor';
import { buildIssueHierarchy, determineMainIssue } from '../utils/issueHierarchyBuilder';
import { convertToGanttFormat, filterTasksByStatuses, createTestGanttData } from '../utils/ganttFormatter';
import CollapsibleJSON from '../components/CollapsibleJSON';
import StatusFilter from '../components/StatusFilter';
import GanttChart from '../components/GanttChart';
import OptimizedJiraData from '../components/OptimizedJiraData';

const GanttChartPage = () => {
  // Состояния
  const [inputValue, setInputValue] = useState('PORTFOLIO-36962');
  const [mainIssueKey, setMainIssueKey] = useState('');
  const [processedIssues, setProcessedIssues] = useState([]);
  const [issueHierarchy, setIssueHierarchy] = useState(null);
  const [ganttTasks, setGanttTasks] = useState([]);
  const [projectStatuses, setProjectStatuses] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isStatusesLoading, setIsStatusesLoading] = useState(false);
  const [showHierarchy, setShowHierarchy] = useState(true);

  // Загрузка данных из Jira
  const fetchData = useCallback(async (issueKey) => {
    setIsDataLoading(true);
    try {
      // Получаем данные из Jira
      const issues = await fetchJiraIssues({
        issueKey: issueKey,
        depth: 2,
        projects: ["R&D :: Портфель проектов", "R&D :: Мобильные приложения", 
                  "R&D :: Development (HH)", "Маркетинг :: B2C", "Design", 
                  "R&D :: Blocker", "DATA :: Analytics"]
      });
      
      console.log('Исходные данные из Jira:', issues);
      
      // Обрабатываем каждую задачу
      const processed = issues.map(issue => processJiraIssue(issue, issues));
      setProcessedIssues(processed);
      
      console.log('Обработанные задачи:', processed);
      
      // Определяем основную задачу, если не указана явно
      const mainKey = issueKey; // Всегда используем введенный ключ как главную задачу
      setMainIssueKey(mainKey);
      
      // Строим иерархию задач
      const hierarchy = buildIssueHierarchy(processed);
      setIssueHierarchy(hierarchy);
      
      console.log('Иерархия задач (без циклов):', JSON.parse(JSON.stringify(hierarchy)));
      
      // Преобразуем в формат для диаграммы Ганта
      const ganttData = convertToGanttFormat(processed, hierarchy);
      setGanttTasks(ganttData);
      
      console.log('Данные Гантта обновлены:', ganttData);
      
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
    } finally {
      setIsDataLoading(false);
    }
  }, []);

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
      
      console.log('Тестовые данные:', testData);
      
      if (!testData) {
        console.error('Функция createTestGanttData вернула undefined');
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
        
        console.log('Загружены минимальные тестовые данные');
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
        
        console.log('Тестовые данные загружены');
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Диаграмма Гантта</Typography>
      
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          label="Ключ задачи"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          sx={{ mr: 2, mb: 1 }}
          disabled={isDataLoading || isStatusesLoading}
        />
        
        <Button
          variant="contained"
          onClick={() => fetchData(inputValue.trim())}
          disabled={isDataLoading || isStatusesLoading}
          sx={{ mr: 2, mb: 1 }}
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
        
        <Button
          variant="contained"
          onClick={() => fetchStatuses(inputValue.trim())}
          disabled={isDataLoading || isStatusesLoading}
          sx={{ mr: 2, mb: 1 }}
        >
          {isStatusesLoading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1, color: 'inherit' }} />
              Загрузка...
            </>
          ) : (
            'Получить статусы'
          )}
        </Button>
        
        <Button
          variant="outlined"
          color="secondary"
          onClick={loadTestData}
          disabled={isDataLoading || isStatusesLoading}
          sx={{ mr: 2, mb: 1 }}
        >
          Загрузить тестовые данные
        </Button>
        
        <FormControlLabel
          control={
            <Switch
              checked={showHierarchy}
              onChange={(e) => setShowHierarchy(e.target.checked)}
            />
          }
          label="Показывать иерархию"
        />
      </Box>
      
      {processedIssues.length > 0 && (
        <>
          {/* Отображение диаграммы Гантта */}
          <Box sx={{ mb: 4, mt: 4 }}>
            <GanttChart tasks={tasksToDisplay} />
          </Box>
          
          {/* Фильтр статусов */}
          {projectStatuses.length > 0 && (
            <StatusFilter
              issueTypes={projectStatuses}
              selectedStatuses={selectedStatuses}
              onStatusChange={handleStatusChange}
            />
          )}
          
          {/* Отображение данных в JSON формате */}
          <Paper sx={{ p: 2, mb: 4 }}>
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
          </Paper>

          {/* Оптимизированные данные */}
          <OptimizedJiraData 
            processedIssues={processedIssues}
            hierarchy={issueHierarchy}
          />
        </>
      )}
    </Box>
  );
};

export default GanttChartPage;