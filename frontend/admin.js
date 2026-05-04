const BACKEND_URL = "https://election-funny-game.onrender.com";

const partyList = [
  { key: "tvk", name: "TVK" },
  { key: "dmk", name: "DMK+" },
  { key: "ntk", name: "NTK" },
  { key: "aiadmk", name: "AIADMK+" }
];

const constituencies = [
  { key: "trichyEast", label: "Trichy East" },
  { key: "perambur", label: "Perambur" }
];

const adminForm = document.getElementById("adminForm");
const constituencySelect = document.getElementById("constituency");
const partySelect = document.getElementById("party");
const countInput = document.getElementById("count");
const adminStatus = document.getElementById("adminStatus");
const adminGrid = document.getElementById("adminGrid");

function populateForm() {
  constituencies.forEach(({ key, label }) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = label;
    constituencySelect.appendChild(option);
  });

  partyList.forEach(({ key, name }) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = name;
    partySelect.appendChild(option);
  });
}

function showStatus(message, error = false) {
  adminStatus.textContent = message;
  adminStatus.style.color = error ? "#ffadad" : "#73ff8c";
}

function renderVotes(votes) {
  adminGrid.innerHTML = "";

  Object.entries(votes).forEach(([constituency, partyTotals]) => {
    const card = document.createElement("div");
    card.className = "admin-card";

    const listItems = Object.entries(partyTotals)
      .map(([party, value]) => {
        const partyName = partyList.find(p => p.key === party)?.name || party;
        return `<li><span>${partyName}</span><strong>${value.toLocaleString()}</strong></li>`;
      })
      .join("");

    card.innerHTML = `
      <div>
        <strong>${constituency.replace(/([A-Z])/g, " $1").trim()}</strong>
        <ul>${listItems}</ul>
      </div>
    `;

    adminGrid.appendChild(card);
  });
}

async function loadVotes() {
  try {
    const response = await fetch(`${BACKEND_URL}/votes`);
    if (!response.ok) throw new Error("Failed to load votes.");

    const votes = await response.json();
    renderVotes(votes);
    showStatus("Current vote totals loaded.");
  } catch (error) {
    showStatus("Could not load vote totals. Check the backend URL.", true);
    console.error(error);
  }
}

async function handleUpdate(event) {
  event.preventDefault();

  const constituency = constituencySelect.value;
  const party = partySelect.value;
  const count = countInput.value.trim();
  const numericCount = Number(count);

  if (count === "" || !Number.isInteger(numericCount) || numericCount < 0) {
    showStatus("Please enter a valid non-negative vote total.", true);
    return;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/admin/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ constituency, party, count: numericCount })
    });

    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "Update failed");
    }

    const votes = await response.json();
    renderVotes(votes);
    showStatus(`Updated ${party.toUpperCase()} in ${constituency} to ${numericCount}.`);
  } catch (error) {
    showStatus(error.message || "Update failed.", true);
    console.error(error);
  }
}

populateForm();
adminForm.addEventListener("submit", handleUpdate);
loadVotes();
