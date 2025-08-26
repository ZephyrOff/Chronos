let loadedScripts = {};

function loadScript(scriptId, src, callback) {
    if (loadedScripts[scriptId]) {
        if (callback) callback();
        return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = src;
    script.onload = () => {
        loadedScripts[scriptId] = true;
        if (callback) callback();
    };
    document.head.appendChild(script);
}

function unloadScript(scriptId) {
    const script = document.getElementById(scriptId);
    if (script) {
        script.remove();
        delete loadedScripts[scriptId];
    }
}

async function chargerContenu(nomPage) {
    try {
        const response = await fetch(`/api/container/${nomPage}`);
        if (!response.ok) throw new Error('Erreur réseau');
        const html = await response.text();
        document.getElementById('content').innerHTML = html;

        unloadScript('task-manager-script');
        unloadScript('daily-script');
        // Gérer le chargement/déchargement de task_manager.js
        if (nomPage === 'content_task') {
            loadScript('task-manager-script', '/static/task_manager.js', () => {
                if (typeof window.initializePage === 'function') window.initializePage();
                if (typeof window.initializeSidebar === 'function') window.initializeSidebar();
            });
        } else if (nomPage === 'daily') {
            loadScript('daily-script', '/static/daily.js', () => {
                if (typeof window.initializeDailyPage === 'function') window.initializeDailyPage();
            });
        } else if (nomPage === 'dashboard') {
            loadScript('dashboard-script', '/static/dashboard.js', () => {
                // Debounce the chart initialization to prevent rapid re-rendering
                if (typeof window.initializeDashboardCharts === 'function') {
                    if (window.dashboardChartInitTimeout) {
                        clearTimeout(window.dashboardChartInitTimeout);
                    }
                    window.initializeDashboardCharts();
                }
            });
        } else {
            unloadScript('task-manager-script');
            unloadScript('daily-script');
            unloadScript('dashboard-script');
        }

    } catch (err) {
        console.error('Erreur :', err);
    }
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications-container');
    const notification = document.createElement('div');
    notification.classList.add('notification', type);
    notification.textContent = message;
    container.appendChild(notification);

    // Trigger reflow to enable transition
    void notification.offsetWidth;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => notification.remove());
    }, 5000); // Notification disappears after 5 seconds
}


document.body.addEventListener('submit', function(e) {

    // --- Handle Task Edit Form Submission ---
    if (e.target && e.target.id === 'task-edit-form') {
        e.preventDefault();
        const form = e.target;
        fetch(form.action, {
            method: 'POST',
            body: new FormData(form)
        })
        .then(response => response.json())
        .then(data => {
            if(data.success) {
                if (typeof refreshTasksTable === 'function') refreshTasksTable();
                if (typeof initializeSidebar === 'function') initializeSidebar();
                showNotification("Tâche mise à jour", "success")
                const taskIdInput = form.querySelector('input[name="task_id"]');
                if (!taskIdInput || taskIdInput.value === '') { // Check if it's an add operation
                    closeModal();
                }
            } else {
                showNotification("Erreur lors de la mise à jour de la tâche: " + data.error, 'error');
            }
        })
        .catch(error => console.error('Error:', error));
    } else if (e.target && e.target.id === 'create-template-form') {
        e.preventDefault();
        const form = e.target;
        fetch(form.action, {
            method: 'POST',
            body: new FormData(form)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification("Modèle créé avec succès !", 'success');
                closeModal();
            } else {
                showNotification("Erreur lors de la création du modèle: " + data.error, 'error');
            }
        })
        .catch(error => console.error('Error:', error));
    } else if (e.target && e.target.id === 'add-from-template-form') {
        e.preventDefault();
        const form = e.target;
        fetch(form.action, {
            method: 'POST',
            body: new FormData(form)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification("Tâche(s) créée(s) avec succès !", 'success');
                closeModal();
                if (typeof refreshTasksTable === 'function') refreshTasksTable();
                if (typeof initializeSidebar === 'function') initializeSidebar();
            } else {
                showNotification("Erreur lors de la création de la tâche: " + data.error, 'error');
            }
        })
        .catch(error => console.error('Error:', error));
    } else if (e.target && e.target.id === 'project-add-form') {
        e.preventDefault();
        const form = e.target;
        fetch(form.action, {
            method: 'POST',
            body: new FormData(form)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification("Projet créé avec succès !", 'success');
                closeModal();
                if (typeof refreshTasksTable === 'function') refreshTasksTable();
                if (typeof initializeSidebar === 'function') initializeSidebar();
            } else {
                showNotification("Erreur lors de la création du projet: " + data.error, 'error');
            }
        })
        .catch(error => console.error('Error:', error));
    } else if (e.target && e.target.id === 'project-edit-form') {
        e.preventDefault();
        const form = e.target;
        fetch(form.action, {
            method: 'POST',
            body: new FormData(form)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification("Projet mis à jour avec succès !", 'success');
                //closeModal();
                if (typeof refreshTasksTable === 'function') refreshTasksTable();
                if (typeof initializeSidebar === 'function') initializeSidebar();
            } else {
                showNotification("Erreur lors de la mise à jour du projet: " + data.error, 'error');
            }
        })
        .catch(error => console.error('Error:', error));
    } else if (e.target && e.target.id === 'create-script-form') {
        e.preventDefault();
        const form = e.target;
        fetch(form.action, {
            method: 'POST',
            body: new FormData(form)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification("Script créé avec succès !", 'success');
                closeModal();
            } else {
                showNotification("Erreur lors de la création du script: " + data.error, 'error');
            }
        })
        .catch(error => console.error('Error:', error));
    } else if (e.target && e.target.id === 'edit-script-form') {
        e.preventDefault();
        const form = e.target;
        fetch(form.action, {
            method: 'POST',
            body: new FormData(form)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification("Script mis à jour avec succès !", 'success');
                closeModal();
                openEditModal('/modal/manage_scripts_form'); // Re-open manage scripts modal
            } else {
                showNotification("Erreur lors de la mise à jour du script: " + data.error, 'error');
            }
        })
        .catch(error => console.error('Error:', error));
    }
});

// --- Handle Recurrence Logic ---
// This needs to be re-initialized every time the modal is loaded.
// We listen for the htmx:afterSwap event which is triggered after new content is loaded.
document.body.addEventListener('htmx:afterSwap', function(e) {
    const ruleSelect = document.getElementById('recurrence-rule-select');
    if (ruleSelect) {
        setupRecurrenceLogic(ruleSelect);
    }
    initializeTagsInput();
});

function setupRecurrenceLogic(ruleSelect) {
    const dayContainer = document.getElementById('recurrence-day-container');
    const dayLabel = document.getElementById('recurrence-day-label');
    const daySelect = document.getElementById('recurrence-day-select');
    const taskRecurrenceDay = JSON.parse(daySelect.dataset.taskRecurrenceDay || 'null');

    const weekdays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

    function populateDaySelect(rule) {
        daySelect.innerHTML = ''; // Clear existing options
        let selectedDay = taskRecurrenceDay;

        if (rule === 'weekly') {
            dayLabel.textContent = 'Jour de la semaine';
            for (let i = 0; i < 7; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = weekdays[i];
                if (selectedDay === i) option.selected = true;
                daySelect.appendChild(option);
            }
            dayContainer.style.display = 'block';
        } else if (rule === 'monthly') {
            dayLabel.textContent = 'Jour du mois';
            for (let i = 1; i <= 31; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                if (selectedDay === i) option.selected = true;
                daySelect.appendChild(option);
            }
            dayContainer.style.display = 'block';
        } else {
            dayContainer.style.display = 'none';
        }
    }

    populateDaySelect(ruleSelect.value);

    ruleSelect.addEventListener('change', function() {
        populateDaySelect(this.value);
    });
}

function initializeTagsInput() {
    const tagsContainer = document.getElementById('tags-container');
    const tagInput = document.getElementById('tag-input');
    const hiddenTagsInput = document.getElementById('hidden-tags-input');

    if (tagsContainer && tagInput && hiddenTagsInput) {
        tagsContainer.addEventListener('click', function(event) {
            if (event.target.classList.contains('remove-tag-btn')) {
                event.target.parentElement.remove();
                updateHiddenInput();
            }
        });

        tagInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                const tagName = tagInput.value.trim();
                if (tagName) {
                    addTag(tagName);
                    tagInput.value = '';
                }
            }
        });

        function addTag(tagName) {
            const tagChip = document.createElement('div');
            tagChip.classList.add('tag-chip', 'bg-gray-200', 'text-gray-700', 'px-2', 'py-1', 'rounded-full', 'flex', 'items-center', 'text-sm');
            tagChip.innerHTML = `
                <span>${tagName}</span>
                <button type="button" class="remove-tag-btn ml-2 text-gray-500 font-bold">x</button>
            `;
            tagsContainer.appendChild(tagChip);
            updateHiddenInput();
        }

        function updateHiddenInput() {
            const tags = Array.from(tagsContainer.querySelectorAll('.tag-chip span')).map(span => span.textContent);
            hiddenTagsInput.value = tags.join(', ');
        }
    }
}

// --- Sidebar Navigation Active State ---
const navLinks = document.querySelectorAll('.nav-link');
const currentPath = window.location.pathname;

navLinks.forEach(link => {
    if (link.dataset.path === currentPath) {
        link.classList.add('active');
    }
});

// Modal logic
const backdrop = document.getElementById('modal-backdrop');
const modal = document.getElementById('task-modal');
const modalContent = document.getElementById('modal-content');

function closeModal() {
  modal.classList.add('hidden');
  backdrop.classList.add('hidden');
  modalContent.innerHTML = ''; // Clean up content
}

async function openEditModal(url) {
    backdrop.classList.remove('hidden');
    modal.classList.remove('hidden');
    
    try {
      const response = await fetch(url);
      modalContent.innerHTML = await response.text();

      // --- Handle pre-filling form fields based on URL parameters ---
      const urlParams = new URLSearchParams(new URL(url, window.location.origin).search);
      const projectId = urlParams.get('project_id');
      const parentId = urlParams.get('parent_id');
      const parentName = urlParams.get('parent_name');
      const projectName = urlParams.get('project_name');

      if (projectId) {
          const projectSelect = modalContent.querySelector('select[name="project_id"]');
          if (projectSelect) {
              projectSelect.value = projectId;
          }
      }

      if (parentId) {
          const parentSelect = modalContent.querySelector('select[name="parent_id"]');
          if (parentSelect) {
              parentSelect.value = parentId;
          }
      }

      if (parentName) {
          const parentNameElement = modalContent.querySelector('#parent-name-display');
          if (parentNameElement) {
              parentNameElement.textContent = "Parent: " + decodeURIComponent(parentName);
          }
      }

      if (projectName) {
          const projectNameElement = modalContent.querySelector('#project-name-display');
          if (projectNameElement) {
              projectNameElement.textContent = "Project: " + decodeURIComponent(projectName);
          }
      }
      
      // --- Attach listeners for modal content ---
      // 1. Slider value display
      const slider = modalContent.querySelector('#progress-slider');
      const valueDisplay = modalContent.querySelector('#progress-value');
      if (slider && valueDisplay) {
          slider.addEventListener('input', (event) => {
              valueDisplay.textContent = event.target.value;
          });
      }

      // 2. Add/Remove attribute logic
      const attributesContainer = modalContent.querySelector('#custom-attributes-container');
      
      // Add
      if (modalContent.querySelector('#add-attribute')) {
          modalContent.querySelector('#add-attribute').addEventListener('click', function() {
              const newIndex = attributesContainer.children.length;
              const newRow = document.createElement('div');
              newRow.classList.add('flex', 'items-center', 'gap-2', 'attribute-row');
              newRow.innerHTML = `
                  <input type="text" name="attr_name_${newIndex}" class="flex-1 border px-3 py-1 rounded bg-gray-700" placeholder="Nom de l'attribut">
                  <input type="text" name="attr_value_${newIndex}" class="flex-1 border px-3 py-1 rounded bg-gray-700" placeholder="Valeur">
                  <button type="button" class="delete-attribute text-red-500 hover:text-red-700 font-bold p-1">X</button>
              `;
              attributesContainer.appendChild(newRow);
          });
      }

      // Remove (delegated event)
      if (attributesContainer) {
          attributesContainer.addEventListener('click', function(e) {
              if (e.target.classList.contains('delete-attribute')) {
                  e.target.closest('.attribute-row').remove();
              }
          });
      }

      initializeTagsInput();

    } catch (error) {
      console.error('Failed to load modal content:', error);
      modalContent.innerHTML = '<p class="p-4">Error loading content.</p>';
    }
}

// Attach listeners to existing and future edit links
document.body.addEventListener('click', e => {
    const link = e.target.closest('.edit-link');
    if (link) {
        e.preventDefault();
        openEditModal(link.dataset.url);
    }
});


backdrop.addEventListener('click', closeModal);

// Initial load
document.addEventListener('DOMContentLoaded', function() {
    // User menu toggle
    const userMenuButton = document.getElementById('user-menu-button');
    const userMenu = document.getElementById('user-menu');
    if (userMenuButton && userMenu) {
        userMenuButton.addEventListener('click', () => {
            userMenu.classList.toggle('hidden');
        });

        // Close the dropdown if the user clicks outside of it
        document.addEventListener('click', (event) => {
            if (!userMenuButton.contains(event.target) && !userMenu.contains(event.target)) {
                userMenu.classList.add('hidden');
            }
        });
    }

    // Change password modal logic
    const changePasswordLink = document.getElementById('change-password-link');
    const changePasswordModal = document.getElementById('changePasswordModal');
    const closeChangePasswordModalBtn = document.getElementById('closeChangePasswordModal');
    const changePasswordForm = document.getElementById('change-password-form');
    const passwordChangeMessage = document.getElementById('password-change-message');

    if (changePasswordLink && changePasswordModal && closeChangePasswordModalBtn && changePasswordForm) {
        changePasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            changePasswordModal.classList.remove('hidden');
            passwordChangeMessage.classList.add('hidden'); // Hide previous messages
            passwordChangeMessage.textContent = '';
            changePasswordForm.reset(); // Clear form fields
        });

        closeChangePasswordModalBtn.addEventListener('click', () => {
            changePasswordModal.classList.add('hidden');
        });

        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('current_password').value;
            const newPassword = document.getElementById('new_password').value;
            const confirmNewPassword = document.getElementById('confirm_new_password').value;

            if (newPassword !== confirmNewPassword) {
                passwordChangeMessage.textContent = 'Les nouveaux mots de passe ne correspondent pas.';
                passwordChangeMessage.classList.remove('hidden');
                return;
            }

            const response = await fetch('/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
            });

            const data = await response.json();
            if (data.success) {
                showNotification('Mot de passe changé avec succès !', 'success');
                changePasswordModal.classList.add('hidden');
            } else {
                passwordChangeMessage.textContent = data.message || 'Erreur lors du changement de mot de passe.';
                passwordChangeMessage.classList.remove('hidden');
            }
        });
    }

    // Use event delegation for all clicks on the body
    document.body.addEventListener('click', function(e) { 

        // --- Handle Delete Template Button ---
        if (e.target && e.target.classList.contains('delete-template-btn')) {
            if (confirm("Êtes-vous sûr de vouloir supprimer ce modèle ? Cette action est irréversible.")) {
                const templateId = e.target.dataset.templateId;
                fetch(`/template/${templateId}/delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showNotification("Modèle supprimé avec succès !", 'success');
                        openEditModal('/manage_templates_form'); // Re-open manage templates modal
                        if (typeof refreshTasksTable === 'function') refreshTasksTable();
                    } else {
                        showNotification("Erreur lors de la suppression du modèle.", 'error');
                    }
                })
                .catch(error => console.error('Error:', error));
            }
        }

        // --- Handle Edit Script Button ---
        if (e.target && e.target.classList.contains('edit-script-btn')) {
            const scriptId = e.target.dataset.scriptId;
            openEditModal(`/script/${scriptId}/edit`);
        }

        // --- Handle Delete Script Button ---
        if (e.target && e.target.classList.contains('delete-script-btn')) {
            if (confirm("Êtes-vous sûr de vouloir supprimer ce script ? Cette action est irréversible.")) {
                const scriptId = e.target.dataset.scriptId;
                fetch(`/script/${scriptId}/delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Fetch updated modal content
                        fetch('/modal/manage_scripts_form')
                            .then(response => response.text())
                            .then(html => {
                                document.querySelector('#manage-scripts-modal-content').innerHTML = html;
                                showNotification("Script supprimé avec succès.", "success");
                            })
                            .catch(error => {
                                console.error('Error fetching updated modal content:', error);
                                showNotification("Script supprimé, mais impossible de rafraîchir le modal.", "warning");
                            });
                    } else {
                        showNotification(data.error || "Une erreur est survenue lors de la suppression du script.", "error");
                    }
                })
                .catch(error => console.error('Error:', error));
            }
        }

        // --- Handle Delete Project Button ---
        if (e.target && e.target.id === 'delete-project-btn') {
            const form = e.target.closest('form');
            const actionUrl = form.action;
            const projectId = actionUrl.split('/')[4]; // Assumes URL is /project/{id}/update

            handleDeleteProject(projectId);
            closeModal();
        }

        // --- Handle Delete Button ---
        if (e.target && e.target.id === 'delete-task-btn') {
            const form = e.target.closest('form');
            const taskId = form.querySelector('input[name="task_id"]').value;
            handleDeleteTask(taskId);
            closeModal(); // Close the modal
        }

        // --- Handle modal cancel button ---
        if (e.target && e.target.id === 'modal-cancel') {
            if (e.target.dataset.modalType === 'edit-script') {
                openEditModal('/modal/manage_scripts_form');
            } else {
                closeModal();
            }
        }

        // --- Handle Run Script Button ---
        if (e.target && e.target.id === 'run-script-btn') {
            const form = e.target.closest('form');
            const taskId = form.querySelector('input[name="task_id"]').value;
            const scriptOutput = form.querySelector('#script-output');

            if (!taskId) {
                scriptOutput.textContent = 'Veuillez enregistrer la tâche avant d\'exécuter un script.';
                scriptOutput.className = 'mt-2 text-sm p-2 rounded bg-gray-800 h-10 text-yellow-400';
                return;
            }

            // First, save the form to ensure the script is up-to-date on the server
            const formData = new FormData(form);
            fetch(form.action, {
                method: 'POST',
                body: formData
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    scriptOutput.textContent = 'Exécution...';
                    scriptOutput.className = 'mt-2 text-sm p-2 rounded bg-gray-800 h-10 text-gray-400';
                    
                    fetch(`/task/${taskId}/run-script`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    })
                    .then(res => res.json())
                    .then(scriptData => {
                        scriptOutput.textContent = scriptData.message;
                        if (scriptData.success) {
                            scriptOutput.classList.add('text-green-400');
                            loadDynamicTaskFields('task', taskId);

                            if (typeof refreshTasksTable === 'function') refreshTasksTable(); // Still good to refresh main table
                            if (typeof initializeSidebar === 'function') initializeSidebar();
                        } else {
                            scriptOutput.classList.add('text-red-400');
                        }
                    });
                } else {
                    scriptOutput.textContent = 'Erreur lors de la sauvegarde du script.';
                    scriptOutput.className = 'mt-2 text-sm p-2 rounded bg-gray-800 h-10 text-red-400';
                }
            });
        }

        // --- Handle Insert Script Template Button ---
        if (e.target && e.target.id === 'insert-script-template-btn') {
            const scriptTemplateSelect = document.getElementById('script-template-select');
            const scriptTextarea = document.querySelector('textarea[name="script"]');
            if (scriptTemplateSelect && scriptTextarea) {
                const selectedValue = scriptTemplateSelect.value;
                if (selectedValue) {
                    scriptTextarea.value += selectedValue;
                }
            }
        }

        // --- Handle Inject Script Button ---
        if (e.target && e.target.id === 'inject-script-btn') {
            const scriptTemplateSelect = document.getElementById('script-template-select');
            const scriptTextarea = document.querySelector('textarea[name="script"]');
            if (scriptTemplateSelect && scriptTextarea) {
                const selectedOption = scriptTemplateSelect.options[scriptTemplateSelect.selectedIndex];
                const scriptName = selectedOption.textContent;
                if (scriptName && scriptName !== '-- Insérer un modèle de script --') {
                    scriptTextarea.value += `{{ include_template("${scriptName}") }}`;
                }
            }
        }

        // --- Handle Run Project Script Button ---
        if (e.target && e.target.id === 'run-project-script-btn') {
            const form = e.target.closest('form');
            // Extract projectId from the form's action URL
            const actionUrl = form.action;
            const parts = actionUrl.split('/');
            const projectId = parts[parts.length - 2]; // Gets the second-to-last part of the URL
            const scriptOutput = form.querySelector('#script-output-project'); // Corrected ID

            if (!projectId) {
                scriptOutput.textContent = 'Veuillez enregistrer le projet avant d\'exécuter un script.';
                scriptOutput.className = 'mt-2 text-sm p-2 rounded bg-gray-800 h-10 text-yellow-400';
                return;
            }

            // First, save the form to ensure the project is up-to-date on the server
            const formData = new FormData(form);
            fetch(form.action, {
                method: 'POST',
                body: formData
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    scriptOutput.textContent = 'Exécution du script du projet...';
                    scriptOutput.className = 'mt-2 text-sm p-2 rounded bg-gray-800 h-10 text-gray-400';

                    fetch(`/project/${projectId}/run-script`, { // New endpoint for project scripts
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    })
                    .then(res => res.json())
                    .then(scriptData => {
                        scriptOutput.textContent = scriptData.message;
                        if (scriptData.success) {
                            scriptOutput.classList.add('text-green-400');
                            loadDynamicTaskFields('project', projectId);
                            // Removed loadDynamicTaskFields('project', taskId); as it's not relevant for projects
                        } else {
                            scriptOutput.classList.add('text-red-400');
                        }
                        if (typeof refreshTasksTable === 'function') refreshTasksTable(); // Refresh main table if needed
                        if (typeof initializeSidebar === 'function') initializeSidebar(); // Refresh sidebar if needed
                    })
                    .catch(error => {
                        console.error('Error running project script:', error);
                        scriptOutput.textContent = 'Erreur lors de l\'exécution du script du projet.';
                        scriptOutput.classList.add('text-red-400');
                    });
                } else {
                    scriptOutput.textContent = 'Erreur lors de la sauvegarde du projet.';
                    scriptOutput.className = 'mt-2 text-sm p-2 rounded bg-gray-800 h-10 text-red-400';
                }
            });
        }

        // --- Handle Run All Scripts Button ---
        if (e.target && e.target.id === 'run-all-scripts-btn') {
            showNotification("Exécution de tous les scripts de tâches en cours...", "info");
            fetch('/run-all-scripts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification(data.message, "success");
                } else {
                    showNotification(data.message, "error");
                }
                if (typeof refreshTasksTable === 'function') refreshTasksTable();
                if (typeof initializeSidebar === 'function') initializeSidebar();
            })
            .catch(error => {
                console.error('Error running all scripts:', error);
                showNotification("Erreur lors de l\'exécution de tous les scripts.", "error");
            });
        }
        
    });


});
