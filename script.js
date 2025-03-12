// Helper Functions
function generateUniqueId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
}

// Configuration
const startHour = 8, endHour = 18, hourHeight = 100;
const defaultEventDuration = 80, minDuration = 30;
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const restrictedDays = ["Wednesday", "Thursday", "Friday"];
const repetitionDays = ["Monday", "Tuesday"];
const restrictionStart = 9 * 60;

function minutesToPx(minutes) { return (minutes / 60) * hourHeight; }
function pxToMinutes(px) { return (px / hourHeight) * 60; }
function formatTime(totalMinutes) {
  let total = startHour * 60 + totalMinutes;
  let hour = Math.floor(total / 60), minute = total % 60;
  let period = hour < 12 ? 'AM' : 'PM';
  let displayHour = hour % 12; if(displayHour === 0) displayHour = 12;
  let minuteStr = minute < 10 ? '0' + minute : minute;
  return displayHour + ':' + minuteStr + ' ' + period;
}
function snapTime(totalMinutes) { return Math.round(totalMinutes / 30) * 30; }
function approxEqual(a, b, tol = 2) { return Math.abs(a - b) <= tol; }

// Build Calendar Structure
const headerDays = document.getElementById("headerDays");
const timeGutter = document.getElementById("timeGutter");
const dayColumnsContainer = document.getElementById("dayColumns");

function buildDayHeaders() {
  days.forEach(day => {
    let header = document.createElement("div");
    header.className = "day-header";
    header.innerText = day;
    headerDays.appendChild(header);
  });
}
buildDayHeaders();

function drawTimeGutter() {
  for (let hour = startHour; hour <= endHour; hour++) {
    let y = (hour - startHour) * hourHeight;
    let line = document.createElement("div");
    line.className = "hour-line";
    line.style.top = y + "px";
    timeGutter.appendChild(line);
    let label = document.createElement("div");
    label.style.position = "absolute";
    label.style.top = (y - 7) + "px";
    label.style.right = "5px";
    label.style.fontSize = "12px";
    label.innerText = formatTime((hour - startHour) * 60);
    timeGutter.appendChild(label);
  }
}
drawTimeGutter();

function drawDayGrid(container) {
  for (let hour = startHour; hour <= endHour; hour++) {
    let y = (hour - startHour) * hourHeight;
    let line = document.createElement("div");
    line.className = "hour-line";
    line.style.top = y + "px";
    container.appendChild(line);
    let halfY = minutesToPx((hour - startHour) * 60 + 30);
    if (halfY <= container.clientHeight) {
      let snapLine = document.createElement("div");
      snapLine.className = "snap-line";
      snapLine.style.top = halfY + "px";
      container.appendChild(snapLine);
    }
  }
}

days.forEach(day => {
  let col = document.createElement("div");
  col.className = "day-column";
  col.dataset.day = day;
  drawDayGrid(col);
  col.addEventListener("click", function(e) {
    if (e.target.closest(".event")) return;
    let rect = col.getBoundingClientRect();
    let clickY = e.clientY - rect.top;
    let clickMinutes = pxToMinutes(clickY);
    if (restrictedDays.includes(day) && clickMinutes < restrictionStart) {
      alert(`Events on ${day} must be 5PM or later.`);
      return;
    }
    let snappedMinutes = snapTime(clickMinutes);
    if (restrictedDays.includes(day) && snappedMinutes < restrictionStart) snappedMinutes = restrictionStart;
    let snappedY = minutesToPx(snappedMinutes);
    let newEvent = createEvent(col, snappedY, minutesToPx(defaultEventDuration), day);
    checkAndCreateRepeats(newEvent);
  });
  dayColumnsContainer.appendChild(col);
});

// Event Functionality
const repeatMap = new Map();

function updateLabel(eventEl) {
  let top = parseFloat(eventEl.style.top);
  let height = parseFloat(eventEl.style.height);
  let startMins = Math.round(pxToMinutes(top));
  let endMins = Math.round(pxToMinutes(top + height));
  let label = eventEl.querySelector(".label");
  label.innerText = formatTime(startMins) + " - " + formatTime(endMins);
  updateEventTable();
}

function syncRepeatedEvents(masterEvent) {
  const groupId = masterEvent.dataset.repeatGroup;
  if (!groupId || !repeatMap.has(groupId)) return;
  const repeats = repeatMap.get(groupId);
  console.log(`Syncing ${repeats.length} repeats for group ${groupId}`);
  repeats.forEach(repeatEvent => {
    repeatEvent.style.top = masterEvent.style.top;
    repeatEvent.style.height = masterEvent.style.height;
    updateLabel(repeatEvent);
    const masterProf = masterEvent.querySelector(".assign-professor").innerText;
    const masterClass = masterEvent.querySelector(".assign-class").innerText;
    repeatEvent.querySelector(".assign-professor").innerText = masterProf;
    repeatEvent.querySelector(".assign-class").innerText = masterClass;
  });
}

function createRepeatedEvent(masterEvent, targetDay, pattern) {
  const targetCol = Array.from(document.querySelectorAll(".day-column")).find(col => col.dataset.day === targetDay);
  if (!targetCol) return;
  let eventEl = document.createElement("div");
  eventEl.className = "event repeat-event";
  eventEl.dataset.repeat = "true";
  eventEl.dataset.repeatPattern = pattern;
  eventEl.dataset.repeatGroup = masterEvent.dataset.repeatGroup;
  eventEl.style.top = masterEvent.style.top;
  eventEl.style.height = masterEvent.style.height;
  eventEl.innerHTML = `
    <div class="label"></div>
    <button class="assign-professor">${masterEvent.querySelector(".assign-professor").innerText}</button>
    <button class="assign-class">${masterEvent.querySelector(".assign-class").innerText}</button>
  `;
  targetCol.appendChild(eventEl);
  updateLabel(eventEl);
  if (!repeatMap.has(masterEvent.dataset.repeatGroup)) repeatMap.set(masterEvent.dataset.repeatGroup, []);
  repeatMap.get(masterEvent.dataset.repeatGroup).push(eventEl);
  console.log(`Created repeat on ${targetDay} for group ${masterEvent.dataset.repeatGroup}`);
}

function createEvent(parent, topPx, heightPx, day, isRepeat = false, groupId = null, pattern = null) {
  let eventEl = document.createElement("div");
  eventEl.style.position = 'relative';
  eventEl.className = "event" + (isRepeat ? " repeat-event" : "");
  eventEl.style.top = topPx + "px";
  eventEl.style.height = heightPx + "px";
  eventEl.dataset.day = day;
  if (isRepeat) {
    eventEl.dataset.repeat = "true";
    eventEl.dataset.repeatPattern = pattern;
    if (groupId) eventEl.dataset.repeatGroup = groupId;
  } else {
    eventEl.dataset.master = "true";
    eventEl.dataset.repeatGroup = generateUniqueId();
  }
  if (!isRepeat) {
    eventEl.innerHTML = `
      <div class="resize-handle top"></div>
      <div class="event-header" style="position: relative;">
        <div class="assign-professor-icon" style="position: absolute; top: 0; left: 0;">
          <button class="assign-professor"><i class="fas fa-chalkboard-teacher" title="Assign Professor"></i></button>
        </div>
        <div class="assign-class-icon" style="position: absolute; top: 0; right: 0;">
          <button class="assign-class"><i class="fas fa-book" title="Assign Class"></i></button>
        </div>
      </div>
      <div class="label"></div>
      <div class="resize-handle bottom"></div>
      <div class="preset-buttons">
        ${day === "Tuesday" ? '' : '<button class="preset-button" data-duration="50">50</button>'}
        <button class="preset-button" data-duration="80">80</button>
        <button class="preset-button" data-duration="160">160</button>
      </div>
      <button class="delete-button"><i class="fas fa-trash-alt" title="Delete Event"></i></button>
    `;
  } else {
    eventEl.innerHTML = `
      <div class="event-header" style="position: relative;">
        <div class="assign-professor-icon" style="position: absolute; top: 0; left: 0;">
          <button class="assign-professor"><i class="fas fa-chalkboard-teacher" title="Assign Professor"></i></button>
        </div>
        <div class="assign-class-icon" style="position: absolute; top: 0; right: 0;">
          <button class="assign-class"><i class="fas fa-book" title="Assign Class"></i></button>
        </div>
      </div>
      <div class="label"></div>
    `;
  }
  parent.appendChild(eventEl);
  updateLabel(eventEl);
  if (!isRepeat) attachEventListeners(eventEl);
  return eventEl;
}

let currentEvent = null, dragType = null, dragStartY = 0, initialTop = 0, initialHeight = 0;

function attachEventListeners(eventEl) {
  eventEl.addEventListener("mousedown", function(e) {
    if (e.target.classList.contains("assign-professor") || e.target.classList.contains("assign-class") ||
        e.target.classList.contains("preset-button") || e.target.classList.contains("delete-button")) return;
    dragType = e.target.classList.contains("resize-handle") ? 
      (e.target.classList.contains("top") ? "resize-top" : "resize-bottom") : "move";
    currentEvent = eventEl;
    dragStartY = e.clientY;
    initialTop = parseFloat(eventEl.style.top);
    initialHeight = parseFloat(eventEl.style.height);
    eventEl.style.opacity = 0.7;
    e.stopPropagation();
  });

  eventEl.querySelectorAll(".preset-button").forEach(btn => {
    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      let duration = parseInt(btn.getAttribute("data-duration"));
      eventEl.style.height = minutesToPx(duration) + "px";
      updateLabel(eventEl);
      syncRepeatedEvents(eventEl);
      checkAndCreateRepeats(eventEl, true); // Force pattern check on preset
    });
  });

  eventEl.querySelector(".delete-button").addEventListener("click", function(e) {
    e.stopPropagation();
    if (confirm("Delete this event and its repeats?")) {
      const groupId = eventEl.dataset.repeatGroup;
      if (repeatMap.has(groupId)) {
        repeatMap.get(groupId).forEach(repeat => repeat.remove());
        repeatMap.delete(groupId);
      }
      eventEl.remove();
      updateEventTable();
    }
  });

  eventEl.querySelector(".assign-professor").addEventListener("click", function(e) {
    e.stopPropagation();
    currentAssignmentEvent = eventEl;
    currentAssignmentType = "professor";
    document.getElementById("modalProfessor").style.display = "block";
    document.getElementById("professorSearch").value = "";
    populateSelect(document.getElementById("professorSelect"), professors);
  });

  eventEl.querySelector(".assign-class").addEventListener("click", function(e) {
    e.stopPropagation();
    currentAssignmentEvent = eventEl;
    currentAssignmentType = "class";
    document.getElementById("modalClass").style.display = "block";
    document.getElementById("classSearch").value = "";
    populateSelect(document.getElementById("classSelect"), classes);
  });
}

function checkAndCreateRepeats(eventEl, forceRecreate = false) {
  const groupId = eventEl.dataset.repeatGroup;
  const duration = Math.round(pxToMinutes(parseFloat(eventEl.style.height)));
  let expectedRepeats = [];

  if (eventEl.dataset.day === "Monday") {
    if (approxEqual(duration, 50)) {
      expectedRepeats = [{ day: "Wednesday", pattern: "MWF" }, { day: "Friday", pattern: "MWF" }];
    } else if (approxEqual(duration, 80)) {
      expectedRepeats = [{ day: "Wednesday", pattern: "MWF" }];
    }
  } else if (eventEl.dataset.day === "Tuesday" && approxEqual(duration, 80)) {
    expectedRepeats = [{ day: "Thursday", pattern: "TR" }];
  }

  console.log(`Checking repeats for ${eventEl.dataset.day}, duration: ${duration}, expected: ${expectedRepeats.length}`);

  if (repeatMap.has(groupId)) {
    const currentRepeats = repeatMap.get(groupId);
    const currentRepeatDays = currentRepeats.map(repeat => repeat.parentElement.dataset.day);

    // If no change in pattern and not forced, just sync
    if (!forceRecreate && expectedRepeats.length === currentRepeats.length && 
        expectedRepeats.every(exp => currentRepeatDays.includes(exp.day))) {
      console.log("Pattern unchanged, syncing existing repeats");
      syncRepeatedEvents(eventEl);
      return;
    }

    // Remove existing repeats if pattern has changed or forced
    console.log("Pattern changed or forced, removing old repeats");
    currentRepeats.forEach(repeat => repeat.remove());
    repeatMap.delete(groupId);
  }

  // Create new repeats if expected
  if (expectedRepeats.length > 0) {
    console.log(`Creating ${expectedRepeats.length} new repeats`);
    expectedRepeats.forEach(({ day, pattern }) => createRepeatedEvent(eventEl, day, pattern));
  } else {
    console.log("No repeats expected");
  }
}

document.addEventListener("mousemove", function(e) {
  if (!currentEvent || !dragType) return;
  let parent = currentEvent.parentElement;
  if (dragType === "move") {
    let newTop = initialTop + (e.clientY - dragStartY);
    newTop = Math.max(0, Math.min(newTop, parent.clientHeight - currentEvent.clientHeight));
    currentEvent.style.top = newTop + "px";
  } else if (dragType === "resize-top") {
    let newTop = initialTop + (e.clientY - dragStartY);
    let currentBottom = initialTop + initialHeight;
    newTop = Math.max(0, Math.min(newTop, currentBottom - minutesToPx(minDuration)));
    currentEvent.style.top = newTop + "px";
    currentEvent.style.height = (currentBottom - newTop) + "px";
  } else if (dragType === "resize-bottom") {
    let newHeight = initialHeight + (e.clientY - dragStartY);
    newHeight = Math.max(minutesToPx(minDuration), Math.min(newHeight, parent.clientHeight - parseFloat(currentEvent.style.top)));
    currentEvent.style.height = newHeight + "px";
  }
  updateLabel(currentEvent);
  syncRepeatedEvents(currentEvent);
});

document.addEventListener("mouseup", function(e) {
  if (!currentEvent || !dragType) return;
  let snappedTop = minutesToPx(snapTime(pxToMinutes(parseFloat(currentEvent.style.top))));
  if (restrictedDays.includes(currentEvent.dataset.day) && snappedTop < minutesToPx(restrictionStart)) {
    snappedTop = minutesToPx(restrictionStart);
  }
  currentEvent.style.top = snappedTop + "px";
  
  if (dragType !== "move") {
    let snappedHeight = minutesToPx(snapTime(pxToMinutes(parseFloat(currentEvent.style.height))));
    currentEvent.style.height = snappedHeight + "px";
  }
  updateLabel(currentEvent);
  syncRepeatedEvents(currentEvent);
  
  // Only check repeats if resizing, not moving
  if (dragType !== "move") {
    console.log("Resize detected, checking repeat pattern");
    checkAndCreateRepeats(currentEvent, true);
  } else {
    console.log("Move detected, only syncing repeats");
  }
  
  currentEvent.style.opacity = 1;
  dragType = null;
  currentEvent = null;
});

function updateEventTable() {
  let events = document.querySelectorAll(".day-column .event");
  let tbody = document.getElementById("eventTable").querySelector("tbody");
  let html = "";
  events.forEach(eventEl => {
    let top = parseFloat(eventEl.style.top);
    let height = parseFloat(eventEl.style.height);
    let startMins = Math.round(pxToMinutes(top));
    let endMins = Math.round(pxToMinutes(top + height));
    let duration = endMins - startMins;
    let dayLabel = eventEl.dataset.repeatPattern || eventEl.dataset.day || "";
    let profBtn = eventEl.querySelector(".assign-professor");
    let classBtn = eventEl.querySelector(".assign-class");
    let professor = profBtn.innerText.includes("Assign") ? "" : profBtn.innerText;
    let classAssigned = classBtn.innerText.includes("Assign") ? "" : classBtn.innerText;
    html += `<tr><td>${dayLabel}</td><td>${formatTime(startMins)}</td><td>${formatTime(endMins)}</td><td>${duration}</td><td>${professor}</td><td>${classAssigned}</td></tr>`;
  });
  tbody.innerHTML = html;
}

// Assignment Modals
const professors = ["Dr. Smith", "Prof. Johnson", "Dr. Williams", "Prof. Brown"];
const classes = ["Math 101", "History 202", "Biology 303", "Chemistry 404"];
let currentAssignmentEvent = null, currentAssignmentType = null;

function populateSelect(selectEl, items) {
  selectEl.innerHTML = "";
  items.forEach(item => {
    let option = document.createElement("option");
    option.value = item;
    option.innerText = item;
    selectEl.appendChild(option);
  });
}

const modalProfessor = document.getElementById("modalProfessor");
const professorSearch = document.getElementById("professorSearch");
const professorSelect = document.getElementById("professorSelect");
const confirmProfessorBtn = document.getElementById("confirmProfessorBtn");
const cancelProfessorBtn = document.getElementById("cancelProfessorBtn");

professorSearch.addEventListener("input", function() {
  let filter = professorSearch.value.toLowerCase();
  let filtered = professors.filter(p => p.toLowerCase().includes(filter));
  populateSelect(professorSelect, filtered);
});

confirmProfessorBtn.addEventListener("click", function() {
  let selected = professorSelect.value;
  if (selected && currentAssignmentEvent) {
    let assignProfBtn = currentAssignmentEvent.querySelector(".assign-professor");
    assignProfBtn.innerText = "Prof: " + selected;
    syncRepeatedEvents(currentAssignmentEvent);
  }
  modalProfessor.style.display = "none";
  currentAssignmentEvent = null;
});

cancelProfessorBtn.addEventListener("click", function() {
  modalProfessor.style.display = "none";
  currentAssignmentEvent = null;
});

const modalClass = document.getElementById("modalClass");
const classSearch = document.getElementById("classSearch");
const classSelect = document.getElementById("classSelect");
const confirmClassBtn = document.getElementById("confirmClassBtn");
const cancelClassBtn = document.getElementById("cancelClassBtn");

classSearch.addEventListener("input", function() {
  let filter = classSearch.value.toLowerCase();
  let filtered = classes.filter(c => c.toLowerCase().includes(filter));
  populateSelect(classSelect, filtered);
});

confirmClassBtn.addEventListener("click", function() {
  let selected = classSelect.value;
  if (selected && currentAssignmentEvent) {
    let assignClassBtn = currentAssignmentEvent.querySelector(".assign-class");
    assignClassBtn.innerText = "Class: " + selected;
    syncRepeatedEvents(currentAssignmentEvent);
  }
  modalClass.style.display = "none";
  currentAssignmentEvent = null;
});

cancelClassBtn.addEventListener("click", function() {
  modalClass.style.display = "none";
  currentAssignmentEvent = null;
});