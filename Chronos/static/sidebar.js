


async function updateUrgentTasksList() {
  try {
    const response = await fetch('/get_urgent_tasks_html');

    if (!response.ok) {
      throw new Error('Erreur lors du chargement des tâches urgentes');
    }

    const html = await response.text();

    // Injecte le HTML dans la liste
    const list = document.getElementById('urgent-tasks-list');
    list.innerHTML = html;

  } catch (error) {
    console.error('Erreur:', error);
  }
}


async function fetchAndRenderCalendar() {
  try {
    const response = await fetch('/api/calendar_dates');
    const datesWithTasks = await response.json();
    renderCalendar(datesWithTasks, currentMonth, currentYear);
  } catch (error) {
    console.error('Erreur lors du chargement des dates du calendrier:', error);
  }
}


function initializeSidebar() {
    updateUrgentTasksList();
    fetchAndRenderCalendar();
}