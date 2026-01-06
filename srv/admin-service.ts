import cds from '@sap/cds';
import type { Request } from '@sap/cds';

/**
 * AdminService implementation with event handlers
 * Following CAP best practices: service-centric design with before/on/after handlers
 */
export default class AdminService extends cds.ApplicationService {
  
  async init() {
    const { Projects, Tasks } = this.entities;
    
    // ============================================================
    // BEFORE Handlers - Validation & Preprocessing
    // ============================================================
    
    /**
     * Validate project data before creation/update
     */
    this.before(['CREATE', 'UPDATE'], Projects, async (req) => {
      const project = req.data;
      
      // Validate dates
      if (project.startDate && project.endDate) {
        const start = new Date(project.startDate);
        const end = new Date(project.endDate);
        
        if (end < start) {
          req.error(400, 'End date must be after start date');
        }
      }
      
      // Validate budget
      if (project.budget !== undefined && project.budget < 0) {
        req.error(400, 'Budget cannot be negative');
      }
      
      if (project.actualCost !== undefined && project.actualCost < 0) {
        req.error(400, 'Actual cost cannot be negative');
      }
      
      // Ensure actualCost doesn't exceed budget (with warning)
      if (project.budget && project.actualCost && project.actualCost > project.budget) {
        req.warn('Actual cost exceeds budget');
      }
    });
    
    /**
     * Validate task data before creation/update
     */
    this.before(['CREATE', 'UPDATE'], Tasks, async (req) => {
      const task = req.data;
      
      // Validate hours
      if (task.estimatedHours !== undefined && task.estimatedHours < 0) {
        req.error(400, 'Estimated hours cannot be negative');
      }
      
      if (task.actualHours !== undefined && task.actualHours < 0) {
        req.error(400, 'Actual hours cannot be negative');
      }
      
      // Validate project association exists
      if (task.project_ID) {
        const project = await SELECT.one.from(Projects).where({ ID: task.project_ID });
        if (!project) {
          req.error(404, `Project with ID ${task.project_ID} not found`);
        }
      }
    });
    
    /**
     * Prevent deletion of projects with active tasks
     */
    this.before('DELETE', Projects, async (req) => {
      const projectID = req.data.ID;
      
      const activeTasks = await SELECT.from(Tasks).where({
        project_ID: projectID,
        status: { '!=': 'DONE' }
      });
      
      if (activeTasks.length > 0) {
        req.error(400, `Cannot delete project with ${activeTasks.length} active task(s). Complete or reassign them first.`);
      }
    });
    
    // ============================================================
    // AFTER Handlers - Calculated Fields
    // ============================================================
    
    /**
     * Calculate virtual fields for Projects after READ
     */
    this.after('READ', Projects, async (projects) => {
      // Handle both array and single object responses
      const projectList = Array.isArray(projects) ? projects : [projects];
      
      for (const project of projectList) {
        if (!project) continue;
        
        // Calculate completion rate based on tasks
        const tasks = await SELECT.from(Tasks).where({ project_ID: project.ID });
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t: any) => t.status === 'DONE').length;
        
        project.completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        // Calculate remaining budget
        project.remainingBudget = project.budget ? project.budget - (project.actualCost || 0) : null;
      }
    });
    
    /**
     * Calculate virtual fields for Tasks after READ
     */
    this.after('READ', Tasks, (tasks) => {
      const taskList = Array.isArray(tasks) ? tasks : [tasks];
      
      for (const task of taskList) {
        if (!task) continue;
        
        // Calculate if task is overdue
        if (task.dueDate && task.status !== 'DONE') {
          const dueDate = new Date(task.dueDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          task.isOverdue = dueDate < today;
        } else {
          task.isOverdue = false;
        }
      }
    });
    
    // ============================================================
    // ON Handlers - Custom Actions
    // ============================================================
    
    /**
     * Complete a task
     */
    this.on('completeTask', async (req) => {
      const { taskID } = req.data;
      
      const task = await SELECT.one.from(Tasks).where({ ID: taskID });
      
      if (!task) {
        return { success: false, message: `Task with ID ${taskID} not found` };
      }
      
      if (task.status === 'DONE') {
        return { success: false, message: 'Task is already completed' };
      }
      
      await UPDATE(Tasks).set({
        status: 'DONE',
        completedAt: new Date().toISOString()
      }).where({ ID: taskID });
      
      return { 
        success: true, 
        message: `Task "${task.title}" marked as completed` 
      };
    });
    
    /**
     * Assign a task to a user
     */
    this.on('assignTask', async (req) => {
      const { taskID, assignedTo } = req.data;
      
      if (!assignedTo || assignedTo.trim() === '') {
        return { success: false, message: 'Assignee name cannot be empty' };
      }
      
      const task = await SELECT.one.from(Tasks).where({ ID: taskID });
      
      if (!task) {
        return { success: false, message: `Task with ID ${taskID} not found` };
      }
      
      await UPDATE(Tasks).set({
        assignedTo: assignedTo,
        status: task.status === 'TODO' ? 'IN_PROGRESS' : task.status
      }).where({ ID: taskID });
      
      return { 
        success: true, 
        message: `Task "${task.title}" assigned to ${assignedTo}` 
      };
    });
    
    /**
     * Update project budget
     */
    this.on('updateProjectBudget', async (req) => {
      const { projectID, newBudget, additionalCost } = req.data;
      
      const project = await SELECT.one.from(Projects).where({ ID: projectID });
      
      if (!project) {
        return { 
          success: false, 
          message: `Project with ID ${projectID} not found`,
          remainingBudget: 0
        };
      }
      
      if (newBudget !== undefined && newBudget < 0) {
        return { 
          success: false, 
          message: 'Budget cannot be negative',
          remainingBudget: project.budget - project.actualCost
        };
      }
      
      const updatedBudget = newBudget !== undefined ? newBudget : project.budget;
      const updatedCost = project.actualCost + (additionalCost || 0);
      const remaining = updatedBudget - updatedCost;
      
      await UPDATE(Projects).set({
        budget: updatedBudget,
        actualCost: updatedCost
      }).where({ ID: projectID });
      
      return { 
        success: true, 
        message: `Budget updated for project "${project.name}"`,
        remainingBudget: remaining
      };
    });
    
    /**
     * Get project statistics
     */
    this.on('getProjectStats', async (req) => {
      const { projectID } = req.data;
      
      const project = await SELECT.one.from(Projects).where({ ID: projectID });
      
      if (!project) {
        req.error(404, `Project with ID ${projectID} not found`);
      }
      
      const tasks = await SELECT.from(Tasks).where({ project_ID: projectID });
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t: any) => t.status === 'DONE').length;
      
      // Count overdue tasks
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const overdueTasks = tasks.filter((t: any) => {
        if (t.status === 'DONE' || !t.dueDate) return false;
        const dueDate = new Date(t.dueDate);
        return dueDate < today;
      }).length;
      
      return {
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        overdueTasks
      };
    });
    
    // Call parent init
    await super.init();
  }
}
