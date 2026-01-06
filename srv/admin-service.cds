using { taskly } from '../db/schema';

/**
 * Admin service with full CRUD operations and role-based authorization
 * Requires authentication for all operations
 */
@path: '/admin'
service AdminService {
  
  /**
   * Full CRUD access to projects for authenticated users
   * Project managers can perform all operations
   * Users can read and update their own projects via instance-based authorization
   */
  @requires: 'authenticated-user'
  @restrict: [
    { grant: '*', to: 'ProjectManager' },
    { grant: 'READ', to: 'ProjectViewer' },
    { grant: ['READ', 'UPDATE'], where: 'createdBy = $user' }
  ]
  entity Projects as projection on taskly.Projects {
    *,
    tasks : redirected to Tasks
  };
  
  /**
   * Full CRUD access to tasks for authenticated users
   * Users can read and update tasks assigned to them via instance-based authorization
   */
  @requires: 'authenticated-user'
  @restrict: [
    { grant: '*', to: 'ProjectManager' },
    { grant: ['READ', 'UPDATE'], to: 'TaskAssignee', where: 'assignedTo = $user' }
  ]
  entity Tasks as projection on taskly.Tasks {
    *,
    project : redirected to Projects
  };
  
  // Custom Actions
  
  /**
   * Mark a task as completed
   */
  @requires: 'authenticated-user'
  action completeTask(
    taskID: UUID
  ) returns {
    success: Boolean;
    message: String;
  };
  
  /**
   * Assign a task to a user
   */
  @requires: 'authenticated-user'
  @restrict: [
    { grant: '*', to: 'ProjectManager' }
  ]
  action assignTask(
    taskID: UUID,
    assignedTo: String
  ) returns {
    success: Boolean;
    message: String;
  };
  
  /**
   * Update project budget and track actual costs
   */
  @requires: 'authenticated-user'
  @restrict: [
    { grant: '*', to: 'ProjectManager' }
  ]
  action updateProjectBudget(
    projectID: UUID,
    newBudget: Decimal(10, 2),
    additionalCost: Decimal(10, 2)
  ) returns {
    success: Boolean;
    message: String;
    remainingBudget: Decimal(10, 2);
  };
  
  /**
   * Get project statistics
   */
  @requires: 'authenticated-user'
  function getProjectStats(
    projectID: UUID
  ) returns {
    totalTasks: Integer;
    completedTasks: Integer;
    completionRate: Integer;
    overdueTasks: Integer;
  };
}
