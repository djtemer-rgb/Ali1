export type TaskTemplate = {
  id: string;
  childId: 'ali' | 'said' | 'both';
  title: string;
  stars: number;
  // ... остальные поля из MD-файла
  subtasksMode: 'none' | 'checkboxes' | 'plain-list';
  subtasks: { id: string; title: string; done?: boolean }[];
  // Новое поле для тумблера в настройках родителя:
  requireAllSubtasksDone: boolean; 
};