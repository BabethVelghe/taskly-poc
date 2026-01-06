namespace taskly;

using { managed, cuid } from '@sap/cds/common';

/**
 * Projects represent work initiatives with budget tracking and status management
 */
entity Projects : managed, cuid {
  name        : String(100) @mandatory;
  description : String(500);
  status      : String(20) @assert.range enum {
    Planning    = 'PLANNING';
    Active      = 'ACTIVE';
    OnHold      = 'ON_HOLD';
    Completed   = 'COMPLETED';
    Cancelled   = 'CANCELLED';
  } default 'PLANNING';
  
  budget         : Decimal(10, 2);
  actualCost     : Decimal(10, 2) default 0;
  startDate      : Date;
  endDate        : Date;
  
  // Composition: tasks are part of the project lifecycle
  tasks          : Composition of many Tasks on tasks.project = $self;
  
  // Calculated field
  virtual completionRate : Integer;
  virtual remainingBudget : Decimal(10, 2);
}

/**
 * Tasks represent individual work items within a project
 */
entity Tasks : managed, cuid {
  title          : String(200) @mandatory;
  description    : String(1000);
  
  priority       : String(10) @assert.range enum {
    Low       = 'LOW';
    Medium    = 'MEDIUM';
    High      = 'HIGH';
    Critical  = 'CRITICAL';
  } default 'MEDIUM';
  
  status         : String(20) @assert.range enum {
    ToDo        = 'TODO';
    InProgress  = 'IN_PROGRESS';
    InReview    = 'IN_REVIEW';
    Done        = 'DONE';
    Blocked     = 'BLOCKED';
  } default 'TODO';
  
  estimatedHours : Decimal(5, 2);
  actualHours    : Decimal(5, 2) default 0;
  dueDate        : Date;
  completedAt    : DateTime;
  
  assignedTo     : String(100);  // User who is assigned this task
  
  // Association back to project
  project        : Association to Projects;
  
  // Calculated field
  virtual isOverdue : Boolean;
}
