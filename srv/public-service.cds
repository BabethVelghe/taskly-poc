using { taskly } from '../db/schema';

/**
 * Public read-only service for viewing projects and tasks
 * No authentication required
 */
@path: '/public'
service PublicService {
  
  /**
   * Read-only access to projects with their tasks
   */
  @readonly
  entity Projects as projection on taskly.Projects {
    *,
    tasks : redirected to Tasks
  } excluding { 
    actualCost  // Hide financial details in public view
  };
  
  /**
   * Read-only access to tasks
   */
  @readonly
  entity Tasks as projection on taskly.Tasks {
    *,
    project : redirected to Projects
  };
}
