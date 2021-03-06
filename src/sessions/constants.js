const INTERACTION_LIFECYCLE_EVENTS = {
  BEFORE_CREATED: 'BEFORE_CREATED',
  CREATED: 'CREATED',
  AFTER_CREATED: 'AFTER_CREATED',
  BEFORE_PROCESS: 'BEFORE_PROCESS',
  PROCESS: 'PROCESS',
  AFTER_PROCESS: 'AFTER_PROCESS',
  BEFORE_DESTROY: 'BEFORE_DESTROY',
  DESTROY: 'DESTROY',
  AFTER_DESTROY: 'AFTER_DESTROY'
};

const EVENTS_SESSION_MANAGER = {
  NEW_SESSION: 'new-session',
  DELETE_SESSION: 'delete-session',
  START_SESSION: 'start-session',
  STOP_SESSION: 'stop-session'
};

module.exports = {
  INTERACTION_LIFECYCLE_EVENTS: INTERACTION_LIFECYCLE_EVENTS,
  EVENTS_SESSION_MANAGER: EVENTS_SESSION_MANAGER
};
