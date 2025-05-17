var startDate;
var prevRows = [];

const assets = {
  note_32 : "https://cdn.glitch.global/d15ce2c5-2b8a-4899-b0e1-16834e5d651a/note_32.png?v=1747487274555",
  check_32 : "https://cdn.glitch.global/d15ce2c5-2b8a-4899-b0e1-16834e5d651a/check_32.png?v=1747487604890"
};

const instruments = ["piano", "cello", "trumpet"];

// wird beim Start aufgerufen, stellt die aktuelle Woche ein,
// und lädt die Daten
function initApp() {
  let now = new Date();
  const currentDay = now.getDay();
  const offsetToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + offsetToMonday);
  startDate = monday;
  
  loadStatus();
}

// blättert eine Woche zurück
function prevWeek() {
  changeStartDate(-7);
}

// blättert eine Woche vor
function nextWeek() {
  changeStartDate(+7);
}

// blättert das Datum vor (+7) oder zurück (-7)
function changeStartDate(offset) {
  startDate.setDate(startDate.getDate() + offset);
  fillTable([]) // Haken erst entfernen
  loadStatus();
}

// lädt die Tabelle und trägt den Titel ein
function loadStatus() {
  let endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6);
  
  displayTitle(startDate, endDate);
  highlightWeekday(startDate, endDate);
    
  const url = "/api/practice?start=" 
        + formatIsoDate(startDate) 
        + "&end="
        + formatIsoDate(endDate);
  fetch(url)
    .then((r) => r.json())
    .then((s) => {
      fillTable(s);
    });
}

// füllt die Tabelle mit den Icons
function fillTable(rows) {
  prevRows = rows;
  const table = document.getElementById('heroe-table');
  for (let i = 1; i <= 7; i++) {
    const row = table.rows[i];
    
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i - 1);
    const iso = formatIsoDate(date);
    
    for (let j = 1; j <= 3; j++) {
      const instrument = instruments[j-1];
      const cell = row.cells[j];
      if (checkPracticeAtDay(instrument, iso, rows)) {
        cell.innerHTML = `<img src="${assets.check_32}" alt="Übung">`;
      } else if (isInstrumentLessonDay(instrument, i)) {
        cell.innerHTML = `<img src="${assets.note_32}" alt="Übung">`;
      } else {
        cell.innerHTML = "";
      }
    }
  }
}

// prüft, ob für das Instrument an dem Datum geübt wurde;
// bekommt eine Liste mit Tagen, an denen geübt wurde
function checkPracticeAtDay(instrument, iso, rows) {
  const matchingRows = rows.filter(r => r.date === iso && r.name == instrument);
  return matchingRows.length > 0;
}

// prüft, ob für das Instrument an dem Wochentag (1=Montag) Unterricht ist
function isInstrumentLessonDay(instrument, weekday) {
  switch (instrument) {
    case "piano": return weekday === 1;
    case "cello": return weekday === 2;
    case "trumpet": return weekday === 4;
  }
}

// zeigt den Titel
function displayTitle(startDate, endDate) {
  const title = "Heldenwoche " + formatGermanDate(startDate) 
      + "-" + formatGermanDate(endDate);
  document.getElementById('title').textContent = title;
}

// den aktuellen Tag gelb machen
function highlightWeekday(startDate, endDate) {
  const table = document.getElementById('heroe-table');
  const now = new Date();
  if (startDate <= now && now <= endDate) {
    const day = (now.getDay() + 6) % 7; // 0 = Montag, 6 = Sonntag
    for (let i = 1; i <= 7; i++) {
      table.rows[i].classList.toggle("today", i === day + 1);
    }
  } else {
    for (let i = 1; i <= 7; i++) {
      table.rows[i].classList.toggle("today", false);
    }
  }
}

// trägt ein, das geübt wurde
function recordPracticed(instrument) {
  // gleich eintragen
  fillTable([...prevRows, 
             { name: instrument, date: formatIsoDate(new Date()) }
            ]);

  // parallel speichern
  postToServer(instrument);
}

// speichert im Server, das geübt wurde
function postToServer(instrument) {
  fetch('/api/practice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: instrument })
  })
  .then(response => {
    if (response.status == 409) {
      alert("Du hast für heute bereits eingetragen, dass Du geübt hast!");
    } else if (!response.ok) {
      alert("Fehler: " + response.status);
    } else {
      // neuen Stand laden
      loadStatus();
      celebrate(instrument);      
    }
  });
}

// feiert Üben (nach erfolgreichem Speichern)
function celebrate(instrument) {
  // TODO sound?
  
  // Konfetti
  fireConfetti();
}

// formatiert ein Datum als yyyy-MM-dd
function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Monate sind 0-basiert
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// formatiert ein Datum als dd.MM.yyyy
function formatGermanDate(date) {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Konfetti!
function fireConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });
}
