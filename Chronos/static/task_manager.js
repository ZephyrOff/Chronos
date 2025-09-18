if (typeof dragged !== 'undefined') {
    dragged = null;
}else{
    let dragged = null;
}

if (typeof draggedChildren !== 'undefined') {
    draggedChildren = [];
}else{
    let draggedChildren = [];
}

if (typeof tableBody !== 'undefined') {
    tableBody = document.querySelector('#task-table tbody');
}else{
    const tableBody = document.querySelector('#task-table tbody');
}


// Toggle handlers
function attachToggleHandlers() {
  document.querySelectorAll('.project-line, .task-toggle-area').forEach(toggleArea => {
    if (toggleArea.dataset.listenerAttached) return;
    toggleArea.dataset.listenerAttached = 'true';

    const toggleBtn = toggleArea.querySelector('.toggle-btn');
    if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'false');
    }

    toggleArea.addEventListener('click', (event) => {
        // Empêcher le basculement si le clic est sur un lien d'édition ou un bouton de dropdown
        if (event.target.closest('.edit-link') || event.target.closest('.toggle-dropdown') || event.target.closest('.dropdown-option')) {
            return;
        }

        const actualToggleBtn = toggleArea.querySelector('.toggle-btn');
        if (!actualToggleBtn) {
            return; // Pas de bouton de bascule, donc pas d'enfants à basculer
        }

        const taskId = actualToggleBtn.dataset.taskId;
        const projectId = actualToggleBtn.dataset.projectId;
        const isOpen = actualToggleBtn.getAttribute('aria-expanded') === 'true';
        actualToggleBtn.setAttribute('aria-expanded', String(!isOpen));

        if (taskId) {
            document.querySelectorAll('.child-of-' + taskId).forEach(row => {
                row.classList.toggle('hidden');
            });
            saveToggleState('task-' + taskId, !isOpen);
        } else if (projectId) {
            const projectTasks = document.querySelectorAll('.child-of-project-' + projectId);

            // Toggle visibility of direct child tasks
            projectTasks.forEach(taskRow => {
                taskRow.classList.toggle('hidden');
            });

            if (isOpen) { // Project is CLOSING
                // Hide all sub-tasks of tasks within this project
                projectTasks.forEach(taskRow => {
                    const taskId = taskRow.dataset.taskId;
                    if (taskId) {
                        document.querySelectorAll('.child-of-' + taskId).forEach(subTaskRow => {
                            subTaskRow.classList.add('hidden');
                        });
                    }
                });
            } else { // Project is OPENING
                // Restore the state of sub-tasks based on localStorage
                const toggles = JSON.parse(localStorage.getItem('toggles') || '{}');
                projectTasks.forEach(taskRow => {
                    const taskId = taskRow.dataset.taskId;
                    // If the task was saved as open, show its children
                    if (taskId && toggles['task-' + taskId]) {
                        document.querySelectorAll('.child-of-' + taskId).forEach(subTaskRow => {
                            subTaskRow.classList.remove('hidden');
                        });
                    }
                });
            }

            saveToggleState('project-' + projectId, !isOpen);
        }

        const icon = actualToggleBtn.querySelector('.toggle-icon');
        if (icon) {
            icon.classList.toggle('rotate-90');
        }
    });
  });
}

// Drag & drop handlers
function attachDragHandlers() {
  document.querySelectorAll('tr[data-task-id]').forEach(row => {
    row.draggable = true;

    row.addEventListener('dragstart', () => {
      dragged = row;
      const id = row.dataset.taskId;
      // On sélectionne toutes les sous-tâches directes (child-of-id)
      draggedChildren = Array.from(document.querySelectorAll('.child-of-' + id));
      row.classList.add('ring-2', 'ring-blue-400');
      tableBody.classList.add('drag-target-highlight');
    });

    row.addEventListener('dragend', () => {
      dragged = null;
      draggedChildren = [];
      tableBody.classList.remove('drag-target-highlight');
      document.querySelectorAll('.task-drop-hover').forEach(el => el.classList.remove('task-drop-hover'));
      document.querySelectorAll('tr[data-task-id]').forEach(tr => tr.classList.remove('ring-2', 'ring-blue-400'));
    });

    row.addEventListener('dragover', e => {
      e.preventDefault();
      // Highlight uniquement la ligne d'arrivée possible
      if (row !== dragged) {
        document.querySelectorAll('.task-drop-hover').forEach(el => el.classList.remove('task-drop-hover'));
        row.classList.add('task-drop-hover');
      }
    });

    row.addEventListener('dragleave', () => {
      row.classList.remove('task-drop-hover');
    });

    row.addEventListener('drop', e => {
      e.preventDefault();
      if (!dragged || dragged === row) return;

      document.querySelectorAll('.task-drop-hover').forEach(el => el.classList.remove('task-drop-hover'));
      tableBody.classList.remove('drag-target-highlight');

      // On insère dragged (et ses enfants) avant la ligne dropTarget (row)
      tableBody.insertBefore(dragged, row);
      draggedChildren.forEach(child => tableBody.insertBefore(child, row));

      // Construire la nouvelle liste avec id et parent_id d'origine
      const allRows = Array.from(tableBody.querySelectorAll('tr[data-task-id]'))
        .filter(tr => tr.offsetParent !== null);

      const result = allRows.map(tr => {
        const id = parseInt(tr.dataset.taskId);
        // parent_id reste inchangé
        // On récupère parent_id depuis la classe
        const match = tr.className.match(/child-of-(\d+)/);
        const parentId = match ? parseInt(match[1]) : null;
        return { id, parent_id: parentId };
      });

      // Envoi au serveur
      fetch('/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reordered: result })
      })
      .then(res => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json(); // Expect JSON response
      })
      .then(data => {
        if (data.success) {
          refreshTasksTable(); // Refresh the table
        }
      })
      .catch(e => console.error("Erreur reorder:", e));
    });
  });
}

// Toggle state persistence
function saveToggleState(id, open) {
  const toggles = JSON.parse(localStorage.getItem('toggles') || '{}');
  toggles[id] = open;
  localStorage.setItem('toggles', JSON.stringify(toggles));
}

function loadToggleStates() {
  const toggles = JSON.parse(localStorage.getItem('toggles') || '{}');
  Object.entries(toggles).forEach(([id, open]) => {
    const [type, entityId] = id.split('-');
    let selector;
    if (type === 'task') {
        selector = `.toggle-btn[data-task-id="${entityId}"]`;
    } else if (type === 'project') {
        selector = `.toggle-btn[data-project-id="${entityId}"]`;
    }

    const toggleBtn = document.querySelector(selector);
    if (toggleBtn) {
        if (open) {
            if (type === 'task') {
                document.querySelectorAll('.child-of-' + entityId).forEach(row => {
                    row.classList.remove('hidden');
                });
            } else if (type === 'project') {
                document.querySelectorAll('.child-of-project-' + entityId).forEach(row => {
                    row.classList.remove('hidden');
                });
            }
        }
        toggleBtn.setAttribute('aria-expanded', String(open));
        const icon = toggleBtn.querySelector('.toggle-icon');
        if (icon && open) {
            icon.classList.add('rotate-90');
        }
    }
  });
}




function applyRowLevels() {
  const rows = document.querySelectorAll('#task-table tbody tr');
  
  // First, clear any existing level classes to handle refreshes
  rows.forEach(row => {
      row.className = row.className.replace(/level-\d+/g, '').trim();
  });

  // Function to recursively set levels
  function setLevel(element, level) {
      // Add the level class to the current element
      element.classList.add(`level-${level}`);

      // Find children of this element and recurse
      let elementId;
      if (element.classList.contains('project-line')) {
          elementId = element.dataset.projectId;
          if (elementId) {
              const children = document.querySelectorAll(`#task-table tbody tr.child-of-project-${elementId}`);
              children.forEach(child => setLevel(child, level + 1));
          }
      } else if (element.classList.contains('task-line')) {
          elementId = element.dataset.taskId;
          if (elementId) {
              const children = document.querySelectorAll(`#task-table tbody tr.child-of-${elementId}`);
              children.forEach(child => setLevel(child, level + 1));
          }
      }
  }

  // Start the process for all top-level rows (level 0)
  rows.forEach(row => {
      // A row is top-level if it's not a child of anything.
      const isChild = /child-of-/.test(row.className);
      if (!isChild) {
          setLevel(row, 0);
      }
  });
}

function refreshTasksTable() {
  fetch('/get_tasks_tbody_html')
      .then(response => response.text())
      .then(html => {
          document.querySelector('#task-table tbody').innerHTML = html;
          initializePage(); // Re-initialize all handlers
          applyAllFilters(); // Re-apply filters
          applyRowLevels(); // Re-apply levels
      })
      .catch(error => console.error('Error refreshing tasks table:', error));
}

function applyAllFilters() {
    const statuses = Array.from(document.querySelectorAll(".filter-status-check:checked")).map(cb => cb.value);
    const priorities = Array.from(document.querySelectorAll(".filter-priority-check:checked")).map(cb => cb.value);
    const tags = Array.from(document.querySelectorAll(".filter-tag-check:checked")).map(cb => cb.value);

    localStorage.setItem('selectedStatuses', JSON.stringify(statuses));
    localStorage.setItem('selectedPriorities', JSON.stringify(priorities));
    localStorage.setItem('selectedTags', JSON.stringify(tags));

    const allRows = document.querySelectorAll("#task-table tbody tr[data-task-id], #task-table tbody tr[data-project-id]");
    const visibleItemIds = new Set();

    // First pass: Identify all items that directly match the filters
    allRows.forEach(row => {
        const statusBtn = row.querySelector(".toggle-dropdown[data-field='status']");
        const priorityBtn = row.querySelector(".toggle-dropdown[data-field='priority']");
        const itemStatus = statusBtn ? statusBtn.dataset.value : null;
        const itemPriority = priorityBtn ? priorityBtn.dataset.value : null;

        const statusMatch = statuses.length === 0 || (itemStatus !== null && statuses.includes(itemStatus));
        const priorityMatch = priorities.length === 0 || (itemPriority !== null && priorities.includes(itemPriority));

                const rowTags = Array.from(row.querySelectorAll('.flex.flex-wrap.gap-1 .text-xs')).map(span => span.textContent.trim().substring(1)); // Remove '#' prefix
        const tagMatch = tags.length === 0 || tags.some(tag => rowTags.includes(tag));

        if (statusMatch && priorityMatch && tagMatch) {
            const itemId = row.dataset.taskId || row.dataset.projectId;
            visibleItemIds.add(itemId);
        }
    });

    // Second pass: Propagate visibility upwards to all parents
    allRows.forEach(row => {
        const itemId = row.dataset.taskId;
        if (itemId && visibleItemIds.has(itemId)) {
            // Check for parent task
            const parentTaskMatch = row.className.match(/child-of-(\d+)/);
            if (parentTaskMatch) {
                const parentTaskId = parentTaskMatch[1];
                visibleItemIds.add(parentTaskId);
                // Check for project associated with the parent task
                const parentTaskRow = document.querySelector(`tr[data-task-id="${parentTaskId}"]`);
                const projectMatch = parentTaskRow.className.match(/child-of-project-(\d+)/);
                if (projectMatch) {
                    visibleItemIds.add(projectMatch[1]);
                }
            }

            // Check for parent project
            const projectMatch = row.className.match(/child-of-project-(\d+)/);
            if (projectMatch) {
                visibleItemIds.add(projectMatch[1]);
            }
        }
    });

    // Final pass: Apply/remove filter-hidden class
    allRows.forEach(row => {
        const itemId = row.dataset.taskId || row.dataset.projectId;
        if (visibleItemIds.has(itemId)) {
            row.classList.remove('filter-hidden');
        } else {
            row.classList.add('filter-hidden');
        }
    });
}

// Dropdown logic for status/priority within the task table
document.querySelector('#task-table').addEventListener('click', e => {
  const isDropdownButton = e.target.matches(".toggle-dropdown");
  // Hide all dropdowns if clicking outside
  if (!isDropdownButton && !e.target.closest('.dropdown-menu')) {
    document.querySelectorAll('#task-table .dropdown-menu').forEach(menu => menu.classList.add('hidden'));
  }

  // Toggle current dropdown
  if (isDropdownButton) {
    const menu = e.target.nextElementSibling;
    menu.classList.toggle('hidden');
  }

  // Handle option selection
  const option = e.target.closest(".dropdown-option");
  if (option) {
      const menu = option.closest('.dropdown-menu');
      const button = menu.previousElementSibling;
      const field = button.dataset.field;
      const value = option.dataset.value;

      const taskId = button.dataset.taskId;
      const projectId = button.dataset.projectId;

      let url = '';
      let id = null;

      if (taskId) {
          url = `/update_field/${taskId}`;
          id = taskId;
      } else if (projectId) {
          url = `/update_project_field/${projectId}`;
          id = projectId;
      }

      if (url && id) {
          fetch(url, {
              method: "POST",
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ field, value })
          })
          .then(response => response.json())
          .then(data => {
              if(data.success) {
                  refreshTasksTable(); // Call the new refresh function
                  attachToggleHandlers();
                  attachFilterEventListeners();
                  initializeSidebar();
              } else {
                  console.error("Update failed:", data.error);
              }
          })
          .catch(err => console.error("Update failed:", err));
      }
  }
});

document.getElementById('show-future-toggle').addEventListener('change', function() {
    const isChecked = this.checked;
    localStorage.setItem('showFutureToggle', isChecked); // Save state
    fetch('/toggle_future_tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_future: isChecked })
    })
    .then(response => response.text()) // Expect HTML text
    .then(html => {
        document.querySelector('#task-table tbody').innerHTML = html;
        refreshTasksTable();
    })
    .catch(error => console.error('Error toggling future tasks:', error));
});

function attachFilterEventListeners() {
  document.getElementById("filter-status-btn").addEventListener("click", () => {
    document.getElementById("filter-status-dropdown").classList.toggle("hidden");
  });
  document.getElementById("filter-priority-btn").addEventListener("click", () => {
    document.getElementById("filter-priority-dropdown").classList.toggle("hidden");
  });
  document.getElementById("filter-tag-btn").addEventListener("click", () => {
    document.getElementById("filter-tag-dropdown").classList.toggle("hidden");
  });

  // Fermer les dropdowns si on clique ailleurs
  document.addEventListener("click", e => {
    const statusDropdown = document.getElementById("filter-status-dropdown");
    const statusButton = document.getElementById("filter-status-btn");
    const priorityDropdown = document.getElementById("filter-priority-dropdown");
    const priorityButton = document.getElementById("filter-priority-btn");
    const tagDropdown = document.getElementById("filter-tag-dropdown");
    const tagButton = document.getElementById("filter-tag-btn");

    // If click is outside status button AND outside status dropdown, hide status dropdown
    if (statusDropdown && statusButton && !statusButton.contains(e.target) && !statusDropdown.contains(e.target)) {
      statusDropdown.classList.add("hidden");
    }

    // If click is outside priority button AND outside priority dropdown, hide priority dropdown
    if (priorityDropdown && priorityButton && !priorityButton.contains(e.target) && !priorityDropdown.contains(e.target)) {
      priorityDropdown.classList.add("hidden");
    }

    // If click is outside tag button AND outside tag dropdown, hide tag dropdown
    if (tagDropdown && tagButton && !tagButton.contains(e.target) && !tagDropdown.contains(e.target)) {
      tagDropdown.classList.add("hidden");
    }
  });

  // Load filter states from localStorage
  const savedStatuses = JSON.parse(localStorage.getItem('selectedStatuses') || '[]');
  const savedPriorities = JSON.parse(localStorage.getItem('selectedPriorities') || '[]');
  const savedTags = JSON.parse(localStorage.getItem('selectedTags') || '[]');
  const savedShowFuture = localStorage.getItem('showFutureToggle') === 'true';

  // Apply saved status filters
  savedStatuses.forEach(status => {
      const checkbox = document.querySelector(`.filter-status-check[value="${status}"]`);
      if (checkbox) checkbox.checked = true;
  });

  // Apply saved priority filters
  savedPriorities.forEach(priority => {
      const checkbox = document.querySelector(`.filter-priority-check[value="${priority}"]`);
      if (checkbox) checkbox.checked = true;
  });

  // Apply saved tag filters
  savedTags.forEach(tag => {
      const checkbox = document.querySelector(`.filter-tag-check[value="${tag}"]`);
      if (checkbox) checkbox.checked = true;
  });

  // Apply saved show future toggle state
  const showFutureToggle = document.getElementById('show-future-toggle');
  if (showFutureToggle) {
      showFutureToggle.checked = savedShowFuture;
  }

  // Attach event listeners to all filter controls
  document.querySelectorAll(".filter-status-check, .filter-priority-check, .filter-tag-check").forEach(el => {
      el.addEventListener("change", applyAllFilters);
  });
}

function initializePage() {
  attachToggleHandlers();  //Attache evenement toggle sur ligne
  loadToggleStates();  //Charge les toggle ouverts
  attachDragHandlers();  //Attache evenement de glisser de ligne
  applyRowLevels();  //Applique les level au ligne
  attachFilterEventListeners(); // Attache la gestion des filtres
  applyAllFilters(); // Applique les filtres des lignes
  //refreshTasksTable();
}



document.querySelector('#task-table tbody').addEventListener('contextmenu', function(e) {
    e.preventDefault();
    closeAllContextMenus();

    const targetRow = e.target.closest('.project-line, .task-line, .subtask-line');
    if (!targetRow) return;

    const contextMenu = document.getElementById('custom-context-menu');
    const contextMenuOptions = document.getElementById('context-menu-options');
    contextMenuOptions.innerHTML = ''; // Clear previous options

    let menuOptions = [];
    const entityId = targetRow.dataset.taskId || targetRow.dataset.projectId;

    const edit_svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" /></svg>'
    const add_svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" /></svg>'
    const delete_svg = '<svg width="64px" height="64px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="none"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M9.1709 4C9.58273 2.83481 10.694 2 12.0002 2C13.3064 2 14.4177 2.83481 14.8295 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path> <path d="M20.5001 6H3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path> <path d="M18.8332 8.5L18.3732 15.3991C18.1962 18.054 18.1077 19.3815 17.2427 20.1907C16.3777 21 15.0473 21 12.3865 21H11.6132C8.95235 21 7.62195 21 6.75694 20.1907C5.89194 19.3815 5.80344 18.054 5.62644 15.3991L5.1665 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path> <path d="M9.5 11L10 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path> <path d="M14.5 11L14 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path> </g></svg>'
    const assing_svg = '<svg width="64px" height="64px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M7 4V20M7 4L11 8M7 4L3 8M15.6 20H19.4C19.9601 20 20.2401 20 20.454 19.891C20.6422 19.7951 20.7951 19.6422 20.891 19.454C21 19.2401 21 19.9601 21 18.4V14.6C21 14.0399 21 13.7599 20.891 13.546C20.7951 13.3578 20.6422 13.2049 20.454 13.109C20.2401 13 19.9601 13 19.4 13H15.6C15.0399 13 14.7599 13 14.546 13.109C14.3578 13.2049 14.2049 13.3578 14.109 13.546C14 13.7599 14 14.0399 14 14.6V18.4C14 18.9601 14 19.2401 14.109 19.454C14.2049 19.6422 14.3578 19.7951 14.546 19.891C14.7599 20 15.0399 20 15.6 20ZM15.6 9H17.4C17.9601 9 18.2401 9 18.454 8.89101C18.6422 8.79513 18.7951 8.64215 18.891 8.45399C19 8.24008 19 7.96005 19 7.4V5.6C19 5.03995 19 4.75992 18.891 4.54601C18.7951 4.35785 18.6422 4.20487 18.454 4.10899C18.2401 4 17.9601 4 17.4 4H15.6C15.0399 4 14.7599 4 14.546 4.10899C14.3578 4.20487 14.2049 4.35785 14.109 4.54601C14 4.75992 14 5.03995 14 5.6V7.4C14 7.96005 14 8.24008 14.109 8.45399C14.2049 8.64215 14.3578 8.79513 14.546 8.89101C14.7599 9 15.0399 9 15.6 9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>'
    const run_svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" /></svg>'

    if (targetRow.classList.contains('project-line')) {
        menuOptions = [
            { text: 'Edit Project', svg: edit_svg, hoverColor: '#4CAF50', action: () => openEditModal(`/project/${entityId}/edit`) },
            { text: 'Add New Task', svg: add_svg, hoverColor: '#4CAF50', action: () => openEditModal(`/add_task_form?project_id=${entityId}`) },
            { text: 'Run Script', svg: run_svg, hoverColor: '#2196F3', action: () => runScript(entityId, true) },
            { text: 'Delete Project', svg: delete_svg, hoverColor: '#EF4444', action: () => handleDeleteProject(entityId) }
        ];
    } else if (targetRow.classList.contains('task-line')) {
        const projects = Array.from(document.querySelectorAll('.project-line'))
            .map(row => ({
                text: row.querySelector('td:nth-child(2)').textContent.trim(),
                hoverColor: '#4CAF50',
                action: () => assignTaskToProject(entityId, row.dataset.projectId)
            }));

        const parentId = targetRow.dataset.taskId;
        const parentName = targetRow.dataset.taskName;
        const projectClass = Array.from(targetRow.classList).find(c => c.startsWith('child-of-project-'));
        const projectId = projectClass ? projectClass.split('-').pop() : null;
        const projectRow = projectId ? document.querySelector(`tr[data-project-id="${projectId}"]`) : null;
        const projectName = projectRow ? projectRow.dataset.projectName : null;

        menuOptions = [
            { text: 'Edit Task', svg: edit_svg, hoverColor: '#4CAF50', action: () => openEditModal(`/task/${entityId}/edit`) },
            { text: 'Add Subtask', svg: add_svg, hoverColor: '#4CAF50', action: () => openEditModal(`/add_task_form?parent_id=${parentId}&parent_name=${encodeURIComponent(parentName)}&project_id=${projectId}&project_name=${encodeURIComponent(projectName)}`) },
            { text: 'Assign to ', svg: assing_svg, hoverColor: '#4CAF50', submenu: projects },
            { text: 'Run Script', svg: run_svg, hoverColor: '#2196F3', action: () => runScript(entityId, false) },
            { text: 'Delete Task', svg: delete_svg, hoverColor: '#EF4444', action: () => handleDeleteTask(entityId) }
        ];
    } else if (targetRow.classList.contains('subtask-line')) {
        const parentTasks = Array.from(document.querySelectorAll('.task-line:not(.subtask-line)'))
            .map(row => ({
                text: row.querySelector('td:nth-child(2)').textContent.trim(),
                hoverColor: '#4CAF50',
                action: () => reassignTask(entityId, row.dataset.taskId)
            }));

        menuOptions = [
            { text: 'Edit Subtask', svg: edit_svg, hoverColor: '#4CAF50', action: () => openEditModal(`/task/${entityId}/edit`) },
            { text: 'Assign to ', svg: assing_svg, hoverColor: '#4CAF50', submenu: parentTasks },
            { text: 'Run Script', svg: run_svg, hoverColor: '#2196F3', action: () => runScript(entityId, false) },
            { text: 'Delete Subtask', svg: delete_svg, hoverColor: '#EF4444', action: () => handleDeleteTask(entityId) }
        ];
    }

    createMenu(menuOptions, contextMenuOptions);

    // Temporarily show the menu to get its dimensions
    contextMenu.classList.remove('hidden');
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;
    contextMenu.classList.add('hidden');

    // Get window dimensions
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    // Calculate position
    let top = e.clientY;
    let left = e.clientX;

    if (left + menuWidth > winWidth) {
        left = winWidth - menuWidth - 5; // 5px buffer
    }

    if (top + menuHeight > winHeight) {
        top = winHeight - menuHeight - 5; // 5px buffer
    }

    contextMenu.style.top = `${top}px`;
    contextMenu.style.left = `${left}px`;
    contextMenu.classList.remove('hidden');
});



function runScript(entityId, isProject) {
    const url = isProject ? `/project/${entityId}/run-script` : `/task/${entityId}/run-script`;
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            refreshTasksTable();
        } else {
            showNotification(data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('An error occurred while running the script.', 'error');
    });
}

function assignTaskToProject(taskId, projectId) {
    fetch('/api/assign_task_to_project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, project_id: projectId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            refreshTasksTable();
        } else {
            console.error("Assignment failed:", data.error);
        }
    })
    .catch(err => console.error("Assignment failed:", err));
}

function reassignTask(taskId, newParentId) {
    fetch('/api/reassign_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, new_parent_id: newParentId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            refreshTasksTable();
        } else {
            console.error("Reassignment failed:", data.error);
        }
    })
    .catch(err => console.error("Reassignment failed:", err));
}

// Helper functions for delete actions (reusing existing logic)
function handleDeleteProject(projectId) {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce projet ? Toutes les tâches associées seront également supprimées. Cette action est irréversible.")) {
        fetch(`/project/${projectId}/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification("Projet supprimé avec succès", 'success');
                refreshTasksTable();
                initializeSidebar();
            } else {
                showNotification("Erreur lors de la suppression du projet.", 'error');
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

function handleDeleteTask(taskId) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.")) {
        fetch(`/delete/${taskId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification("Suppression réussie", 'success');
                refreshTasksTable();
                initializeSidebar();
            } else {
                showNotification("Erreur lors de la suppression.", 'error');
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

document.getElementById('add-task-btn').addEventListener('click', () => {
    openEditModal('/add_task_form');
});

document.getElementById('add-project-btn').addEventListener('click', () => {
    openEditModal('/add_project_form');
});

document.getElementById('add-from-template-btn').addEventListener('click', (e) => {
    e.preventDefault();
    openEditModal('/add_from_template_form');
});

document.getElementById('create-template-btn').addEventListener('click', (e) => {
    e.preventDefault();
    openEditModal('/create_template_form');
});

document.getElementById('manage-templates-btn').addEventListener('click', (e) => {
    e.preventDefault();
    openEditModal('/manage_templates_form');
});

document.getElementById('create-script-btn').addEventListener('click', (e) => {
    e.preventDefault();
    openEditModal('/create_script_form');
});

document.getElementById('manage-scripts-btn').addEventListener('click', (e) => {
    e.preventDefault();
    openEditModal('/modal/manage_scripts_form');
});

function loadDynamicTaskFields(content_type, content_Id) {
    fetch(`/get_${content_type}_dynamic_fields/${content_Id}`)
        .then(response => response.text())
        .then(html => {
            const dynamicFieldDiv = document.querySelector('.dynamic_field');
            if (dynamicFieldDiv) {
                dynamicFieldDiv.innerHTML = html;
            }
        })
        .catch(error => console.error('Error loading dynamic task fields:', error));
}