
(function() {

// 🖼️ Met à jour l'affichage
function updateView() {
  reader_icon_svg = '<svg width="64px" height="64px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="fill: currentColor; stroke: currentColor;"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M4 8C4 5.17157 4 3.75736 4.87868 2.87868C5.75736 2 7.17157 2 10 2H14C16.8284 2 18.2426 2 19.1213 2.87868C20 3.75736 20 5.17157 20 8V16C20 18.8284 20 20.2426 19.1213 21.1213C18.2426 22 16.8284 22 14 22H10C7.17157 22 5.75736 22 4.87868 21.1213C4 20.2426 4 18.8284 4 16V8Z" stroke="#1C274D" stroke-width="1.5"></path> <path d="M19.8978 16H7.89778C6.96781 16 6.50282 16 6.12132 16.1022C5.08604 16.3796 4.2774 17.1883 4 18.2235" stroke="#1C274D" stroke-width="1.5"></path> <path opacity="0.5" d="M7 16V2.5" stroke="#1C274D" stroke-width="1.5" stroke-linecap="round"></path> <path opacity="0.5" d="M13 16V19.5309C13 19.8065 13 19.9443 12.9051 20C12.8103 20.0557 12.6806 19.9941 12.4211 19.8708L11.1789 19.2808C11.0911 19.2391 11.0472 19.2182 11 19.2182C10.9528 19.2182 10.9089 19.2391 10.8211 19.2808L9.57889 19.8708C9.31943 19.9941 9.18971 20.0557 9.09485 20C9 19.9443 9 19.8065 9 19.5309V16.45" stroke="#1C274D" stroke-width="1.5" stroke-linecap="round"></path> </g></svg>'
  editor_icon_svg = '<svg width="64px" height="64px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="fill: currentColor; stroke: currentColor;"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M20.1497 7.93997L8.27971 19.81C7.21971 20.88 4.04971 21.3699 3.27971 20.6599C2.50971 19.9499 3.06969 16.78 4.12969 15.71L15.9997 3.84C16.5478 3.31801 17.2783 3.03097 18.0351 3.04019C18.7919 3.04942 19.5151 3.35418 20.0503 3.88938C20.5855 4.42457 20.8903 5.14781 20.8995 5.90463C20.9088 6.66146 20.6217 7.39189 20.0997 7.93997H20.1497Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M21 21H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>'
  
  if (editMode) {
    textarea.style.display = 'block';
    renderDiv.style.display = 'none';
    toggleBtn.innerHTML = `${reader_icon_svg} Mode lecture`;
  } else {
    renderDiv.innerHTML = renderMarkdown(textarea.value);
    renderDiv.style.display = 'block';
    textarea.style.display = 'none';
    toggleBtn.innerHTML = `${editor_icon_svg} Mode édition`;
  }
}

function setReadOnly(){
  editor_icon_svg = '<svg width="64px" height="64px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="fill: currentColor; stroke: currentColor;"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M20.1497 7.93997L8.27971 19.81C7.21971 20.88 4.04971 21.3699 3.27971 20.6599C2.50971 19.9499 3.06969 16.78 4.12969 15.71L15.9997 3.84C16.5478 3.31801 17.2783 3.03097 18.0351 3.04019C18.7919 3.04942 19.5151 3.35418 20.0503 3.88938C20.5855 4.42457 20.8903 5.14781 20.8995 5.90463C20.9088 6.66146 20.6217 7.39189 20.0997 7.93997H20.1497Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M21 21H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>'
  
  renderDiv.innerHTML = renderMarkdown(textarea.value);
  renderDiv.style.display = 'block';
  textarea.style.display = 'none';
  toggleBtn.innerHTML = `${editor_icon_svg} Mode édition`;
}

// 🎯 Rendu Markdown
function renderMarkdown(text) {
  try {
    return marked.parse(text);
  } catch (e) {
    return `<pre>${text}</pre>`;
  }
}

let editMode = true;
let modified = false;

let textarea;
let renderDiv;
let toggleBtn;
let saveStatus;

function showPending() {
  saveStatus.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="animate-pulse text-yellow-500" viewBox="0 0 24 24"><path d="M12 4v1m0 14v1m8-9h1M4 12H3m15.364 6.364l.707.707M5.636 5.636l-.707-.707m12.728 0l.707.707M5.636 18.364l-.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg><span class="text-sm text-yellow-500 ml-1">Modifications en attente</span>`;
}
function showSaved() {
  saveStatus.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="text-green-500" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 111.414-1.414L8.414 12.172l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg><span class="text-sm text-green-500 ml-1">Sauvegardé</span>`;
}

let dateInput;
let keywordInput;
let searchResultsDiv;
let dateDisplay;

async function loadDailyFromServer(dateStr){
  const res = await fetch(`/daily/date?date=${dateStr}`);
  if (res.ok) {
    const text = await res.text();
    textarea.value = text;
    textarea.setAttribute('data-current-date', dateStr);
    setReadOnly();
    // searchResultsDiv.classList.add('hidden'); // Commented out to keep search results visible
    // keywordInput.value = ''; // Commented out to keep search input value

    // Afficher la date en haut
    dateDisplay.textContent = "📅 Rapport du " + dateStr;
  }
}

function initializeDailyPage() {
  textarea = document.getElementById('daily-textarea');
  renderDiv = document.getElementById('daily-render');
  toggleBtn = document.getElementById('toggle-mode');
  saveStatus = document.getElementById('save-status');

  dateInput = document.getElementById('calendar');
  keywordInput = document.getElementById('daily-search');
  searchResultsDiv = document.getElementById('search-results');
  dateDisplay = document.getElementById('daily-date');

  // 🔄 Chargement du contenu depuis le serveur
  fetch('/api/daily-report')
    .then(res => res.json())
    .then(data => {
      textarea.value = data.content || '';
      updateView();
    });

  textarea.addEventListener('input', () => {
    modified = true;
    showPending();
    updateView();
  });

  toggleBtn.addEventListener('click', () => {
    editMode = !editMode;
    updateView();
  });

  // 💾 Auto-sauvegarde toutes les 5 secondes
  setInterval(() => {
    if (modified) {
      const payload = { content: textarea.value };
      
      const date = textarea.getAttribute('data-current-date');
      if (date) {
        payload.date = date; // envoyer uniquement si défini
      }

      fetch('/api/daily-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).then(() => {
        console.log('💾 Rapport journalier sauvegardé');
        modified = false;
        showSaved();
      });
    }
  }, 5000);

  // Recherche par date
  dateInput.addEventListener('change', async () => {
    const date = dateInput.value;
    if (!date) return;

    loadDailyFromServer(date);
  });

  // Recherche par mots-clés
  let searchTimeout = null;
  keywordInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      const query = keywordInput.value.trim();
      if (query.length < 2) {
        searchResultsDiv.innerHTML = '';
        searchResultsDiv.classList.add('hidden');
        return;
      }

      const res = await fetch(`/daily/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return;

      const results = await res.json(); // format : [{date, preview}]
      if (results.length === 0) {
        searchResultsDiv.innerHTML = '<p class="text-gray-500">Aucun résultat.</p>';
        searchResultsDiv.classList.remove('hidden');
        return;
      }

      searchResultsDiv.innerHTML = results.map(entry => `
        <div class="cursor-pointer hover:bg-gray-600 p-2 rounded" data-date="${entry.date}">
          <strong>${entry.date}</strong><br>
          <small class="text-gray-500">${entry.preview}</small>
        </div>
      `).join('');
      searchResultsDiv.classList.remove('hidden');

      document.querySelectorAll('#search-results [data-date]').forEach(el => {
        el.addEventListener('click', async () => {
          const selectedDate = el.dataset.date;
          loadDailyFromServer(selectedDate);
        });
      });
    }, 300);
  });

  fetch('/daily/available-dates')
  .then(res => res.json())
  .then(dates => {
    // Air Datepicker attend un tableau de strings 'yyyy-mm-dd'
    new AirDatepicker('#calendar', {
      locale: {
          days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
          daysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
          months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
          monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          today: "Today",
          clear: "Clear",
          firstDay: 0
      },
      dateFormat: 'yyyy-MM-dd',
      // Pour activer uniquement les dates dispos
      // on utilise onRenderCell pour désactiver les dates non dans la liste
      onRenderCell({date, cellType}) {
        if (cellType === 'day') {
          const dateStr = date.getFullYear() + '-' +
                  String(date.getMonth() + 1).padStart(2, '0') + '-' +
                  String(date.getDate()).padStart(2, '0');
          if (!dates.includes(dateStr)) {
            return {
              disabled: true,
              classes: 'disabled-date'
            };
          }
        }
        return {};
      },
      onSelect({date, formattedDate}) {
        if (formattedDate) {
          loadDailyFromServer(formattedDate);
        }
      },
      // Option pour réduire la taille facilement via CSS (exemple)
      // Tu pourras ajuster selon ton design
      classes: 'small-datepicker'
    });
  });
}

window.initializeDailyPage = initializeDailyPage;

})();
