const screens = {
  home: document.getElementById("home-screen"),
  intro: document.getElementById("intro-screen"),
  case: document.getElementById("case-screen")
};

const startCaseButton =
  document.getElementById("start-case-btn");

const introBackButton =
  document.getElementById("intro-back-btn");

const openCaseButton =
  document.getElementById("open-case-btn");

const caseHomeButton =
  document.getElementById("case-home-btn");

const navButtons =
  document.querySelectorAll(".nav-btn");

const casePanels =
  document.querySelectorAll(".case-panel");

const notesArea =
  document.getElementById("detective-notes");

const evidenceList =
  document.getElementById("evidence-list");

const evidenceEmpty =
  document.getElementById("evidence-empty");

const peopleGrid =
  document.getElementById("people-grid");

const characterDialogue =
  document.getElementById("character-dialogue");

const dialoguePortrait =
  document.getElementById("dialogue-portrait");

const dialogueName =
  document.getElementById("dialogue-name");

const dialogueRole =
  document.getElementById("dialogue-role");

const dialogueThread =
  document.getElementById("dialogue-thread");

const dialogueTopics =
  document.getElementById("dialogue-topics");

const timelineList =
  document.getElementById("timeline-list");

const sceneHotspots =
  document.getElementById("scene-hotspots");

const sceneImage =
  document.getElementById("scene-image");

const sceneIntro =
  document.getElementById("scene-intro");

const sceneDiscovery =
  document.getElementById("scene-discovery");

const discoveryTitle =
  document.getElementById("discovery-title");

const discoveryText =
  document.getElementById("discovery-text");

const discoveryVisual =
  document.getElementById("discovery-visual");

const discoveryZoomLayer =
  document.getElementById("discovery-zoom-layer");

const discoveryKicker =
  document.getElementById("discovery-kicker");

const discoveryAdded =
  document.getElementById("discovery-added");

const closeDiscoveryButton =
  document.getElementById("close-discovery-btn");

const objectiveProgress =
  document.getElementById("objective-progress");

const talkToPeopleButton =
  document.getElementById("talk-to-people-btn");

const splashScreen =
  document.getElementById("splash-screen");

const CASE_BASE =
  "cases/case-001-chalet";

const state = {
  caseData: null,
  characters: [],
  evidence: [],
  timeline: [],
  events: [],
  dialogue: {},
  scene: null,
  activeHotspot: null,
  observedHotspots: new Set(
    JSON.parse(
      localStorage.getItem(
        "alibi-case-001-observed-hotspots"
      ) || "[]"
    )
  ),
  foundEvidence: new Set(
    JSON.parse(
      localStorage.getItem(
        "alibi-case-001-found-evidence"
      ) || "[]"
    )
  )
};

function saveProgress() {
  localStorage.setItem(
    "alibi-case-001-found-evidence",
    JSON.stringify(
      [...state.foundEvidence]
    )
  );

  localStorage.setItem(
    "alibi-case-001-observed-hotspots",
    JSON.stringify(
      [...state.observedHotspots]
    )
  );
}

async function loadJson(fileName) {
  const response =
    await fetch(
      `${CASE_BASE}/${fileName}`
    );

  if (!response.ok) {
    throw new Error(
      `Impossible de charger ${fileName}`
    );
  }

  return response.json();
}

async function loadCaseData() {
  try {
    const [
      caseData,
      characters,
      evidence,
      timeline,
      events,
      scene,
      dialogue
    ] = await Promise.all([
      loadJson("case.json"),
      loadJson("characters.json"),
      loadJson("evidence.json"),
      loadJson("timeline.json"),
      loadJson("events.json"),
      loadJson("scene.json"),
      loadJson("dialogue.json")
    ]);

    state.caseData =
      caseData;

    state.characters =
      characters;

    state.evidence =
      evidence;

    state.timeline =
      timeline;

    state.events =
      events;

    state.scene =
      scene;

    state.dialogue =
      dialogue;

    renderCase();
  } catch (error) {
    console.error(error);

    if (sceneIntro) {
      sceneIntro.textContent =
        "Le dossier n’a pas pu être chargé. Vérifie que les fichiers JSON sont bien dans cases/case-001-chalet/.";
    }
  }
}

function showScreen(name) {
  Object.entries(screens).forEach(
    ([screenName, element]) => {
      const active =
        screenName === name;

      element.classList.toggle(
        "screen-active",
        active
      );

      element.setAttribute(
        "aria-hidden",
        active ? "false" : "true"
      );
    }
  );

  window.scrollTo({
    top: 0,
    behavior: "instant"
  });
}

function showPanel(target) {
  casePanels.forEach(
    (panel) => {
      panel.classList.toggle(
        "panel-active",
        panel.dataset.panel === target
      );
    }
  );

  navButtons.forEach(
    (button) => {
      button.classList.toggle(
        "nav-active",
        button.dataset.target === target
      );
    }
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function getEvidenceById(id) {
  return state.evidence.find(
    (item) => item.id === id
  );
}

function revealEvidence(id) {
  if (state.foundEvidence.has(id)) {
    return false;
  }

  state.foundEvidence.add(id);
  saveProgress();

  renderEvidence();
  renderTimeline();
  renderHotspots();
  updateObjective();

  return true;
}

function renderCase() {
  renderPeople();
  renderEvidence();
  renderTimeline();
  renderScene();
  updateObjective();
}

function renderScene() {
  if (!state.scene) {
    return;
  }

  sceneIntro.textContent =
    state.scene.intro;

  sceneImage.src =
    state.scene.image;

  if (
    Array.isArray(
      state.scene.automaticEvidence
    )
  ) {
    state.scene.automaticEvidence.forEach(
      (id) => {
        state.foundEvidence.add(id);
      }
    );

    saveProgress();
    renderEvidence();
    renderTimeline();
  }

  renderHotspots();
}

function renderHotspots() {
  if (!state.scene) {
    return;
  }

  sceneHotspots.innerHTML =
    "";

  state.scene.hotspots.forEach(
    (hotspot) => {
      const button =
        document.createElement("button");

      const alreadyFound =
        state.observedHotspots.has(
          hotspot.id
        );

      button.type =
        "button";

      button.className =
        "scene-hotspot";

      if (alreadyFound) {
        button.classList.add(
          "is-found"
        );
      }

      button.style.left =
        `${hotspot.x}%`;

      button.style.top =
        `${hotspot.y}%`;

      button.setAttribute(
        "aria-label",
        hotspot.label
      );

      button.title =
        hotspot.label;

      button.addEventListener(
        "click",
        () => inspectHotspot(hotspot)
      );

      sceneHotspots.appendChild(
        button
      );
    }
  );
}


function inspectHotspot(hotspot) {
  state.observedHotspots.add(
    hotspot.id
  );

  let evidence =
    null;

  let newlyAdded =
    false;

  if (
    hotspot.kind === "evidence" &&
    hotspot.evidence
  ) {
    evidence =
      getEvidenceById(
        hotspot.evidence
      );

    newlyAdded =
      revealEvidence(
        hotspot.evidence
      );
  } else {
    saveProgress();
    renderHotspots();
    updateObjective();
  }

  discoveryKicker.textContent =
    hotspot.kind === "evidence"
      ? "INDICE OBSERVÉ"
      : "OBSERVATION";

  discoveryTitle.textContent =
    hotspot.title ||
    hotspot.label;

  discoveryText.textContent =
    hotspot.observation;

  discoveryAdded.hidden =
    !(
      hotspot.kind === "evidence" &&
      (
        newlyAdded ||
        state.foundEvidence.has(
          hotspot.evidence
        )
      )
    );

  discoveryVisual.hidden =
    false;

  discoveryZoomLayer.style.backgroundImage =
    `url("${state.scene.image}")`;

  discoveryZoomLayer.style.backgroundPosition =
    `${hotspot.x}% ${hotspot.y}%`;

  discoveryZoomLayer.setAttribute(
    "aria-label",
    hotspot.title ||
    hotspot.label
  );

  sceneDiscovery.hidden =
    false;

  renderHotspots();
  updateObjective();

  sceneDiscovery.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}

function updateObjective() {
  const hotspotIds =
    state.scene
      ? state.scene.hotspots.map(
          (item) => item.id
        )
      : [];

  const observedCount =
    hotspotIds.filter(
      (id) =>
        state.observedHotspots.has(id)
    ).length;

  objectiveProgress.textContent =
    observedCount === 0
      ? "Aucun élément observé"
      : `${observedCount} élément${observedCount > 1 ? "s" : ""} observé${observedCount > 1 ? "s" : ""}`;

  talkToPeopleButton.hidden =
    observedCount < 3;
}

function renderPeople() {
  peopleGrid.innerHTML =
    "";

  state.characters
    .filter(
      (person) =>
        person.age >= 18
    )
    .forEach(
      (person) => {
        const card =
          document.createElement("article");

        card.className =
          "person-card";

        const statusClass =
          person.status === "introuvable"
            ? "missing"
            : "";

        const canTalk =
          person.interactive === true;

        card.innerHTML = `
          <div class="person-card-main">
            <img
              class="person-portrait"
              src="${person.portrait}"
              alt="${person.portraitAlt || person.name}"
            />

            <div class="person-card-body">
              <div class="person-top">
                <div>
                  <h4>${person.name}</h4>
                  <div class="person-meta">
                    ${person.role} • ${person.age} ans
                  </div>
                </div>

                <span class="person-status ${statusClass}">
                  ${person.status}
                </span>
              </div>

              <p class="person-summary">
                ${person.summary}
              </p>
            </div>
          </div>

          <div class="person-card-actions">
            <button
              class="person-talk-btn"
              type="button"
              data-person-id="${person.id}"
              ${canTalk ? "" : "disabled"}
            >
              ${
                canTalk
                  ? `Parler à ${person.name}`
                  : person.status === "introuvable"
                    ? "Introuvable"
                    : "Pas disponible maintenant"
              }
            </button>
          </div>
        `;

        peopleGrid.appendChild(
          card
        );
      }
    );

  peopleGrid
    .querySelectorAll(
      ".person-talk-btn:not(:disabled)"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            openCharacterDialogue(
              button.dataset.personId
            );
          }
        );
      }
    );
}

function getCharacterById(id) {
  return state.characters.find(
    (person) => person.id === id
  );
}

function addDialogueMessage(
  speaker,
  text,
  character
) {
  const message =
    document.createElement("div");

  message.className =
    `dialogue-message ${speaker}`;

  if (speaker === "player") {
    message.innerHTML = `
      <div class="dialogue-bubble">
        ${text}
      </div>
    `;
  } else {
    message.innerHTML = `
      <img
        class="dialogue-mini-portrait"
        src="${character.portrait}"
        alt=""
      />

      <div class="dialogue-bubble">
        ${text}
      </div>
    `;
  }

  dialogueThread.appendChild(
    message
  );
}

function openCharacterDialogue(personId) {
  const character =
    getCharacterById(personId);

  const conversation =
    state.dialogue[personId];

  if (
    !character ||
    !conversation
  ) {
    return;
  }

  dialoguePortrait.src =
    character.portrait;

  dialoguePortrait.alt =
    character.portraitAlt ||
    character.name;

  dialogueName.textContent =
    character.name;

  dialogueRole.textContent =
    `${character.role} • ${character.age} ans`;

  dialogueThread.innerHTML =
    "";

  dialogueTopics.innerHTML =
    "";

  conversation.opening.forEach(
    (line) => {
      addDialogueMessage(
        line.speaker,
        line.text,
        character
      );
    }
  );

  conversation.topics.forEach(
    (topic) => {
      const button =
        document.createElement("button");

      button.type =
        "button";

      button.className =
        "dialogue-topic-btn";

      button.textContent =
        topic.label;

      button.addEventListener(
        "click",
        () => {
          if (
            button.classList.contains(
              "used"
            )
          ) {
            return;
          }

          button.classList.add(
            "used"
          );

          addDialogueMessage(
            "player",
            topic.label,
            character
          );

          addDialogueMessage(
            personId,
            topic.reply,
            character
          );

          dialogueThread.scrollTo({
            top:
              dialogueThread.scrollHeight,
            behavior: "smooth"
          });
        }
      );

      dialogueTopics.appendChild(
        button
      );
    }
  );

  characterDialogue.hidden =
    false;

  characterDialogue.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";
}

function closeCharacterDialogue() {
  characterDialogue.hidden =
    true;

  characterDialogue.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.style.overflow =
    "";
}


function renderEvidence() {
  const found =
    state.evidence.filter(
      (item) =>
        state.foundEvidence.has(
          item.id
        )
    );

  evidenceList.innerHTML =
    "";

  if (found.length === 0) {
    const empty =
      document.createElement("div");

    empty.className =
      "placeholder-card";

    empty.innerHTML = `
      <span class="placeholder-icon">📁</span>
      <strong>Aucune preuve classée</strong>
      <p>Examine la scène pour commencer à remplir le dossier.</p>
    `;

    evidenceList.appendChild(
      empty
    );

    return;
  }

  found.forEach(
    (item) => {
      const card =
        document.createElement("article");

      card.className =
        "evidence-card";

      card.innerHTML = `
        <div class="evidence-icon">
          ${item.icon || "🔎"}
        </div>

        <div>
          <h4>${item.title}</h4>

          <p>${item.summary}</p>

          <span class="evidence-source">
            ${item.source}
          </span>
        </div>
      `;

      evidenceList.appendChild(
        card
      );
    }
  );
}

function renderTimeline() {
  timelineList.innerHTML =
    "";

  state.timeline.forEach(
    (item) => {
      const unlocked =
        item.status !== "locked" ||
        (
          item.unlockBy &&
          state.foundEvidence.has(
            item.unlockBy
          )
        );

      if (!unlocked) {
        return;
      }

      const row =
        document.createElement("div");

      row.className =
        `timeline-item ${item.status}`;

      row.innerHTML = `
        <span class="timeline-time">
          ${item.time}
        </span>

        <div>
          <strong>${item.title}</strong>
          <p>${item.description}</p>
        </div>
      `;

      timelineList.appendChild(
        row
      );
    }
  );
}

startCaseButton.addEventListener(
  "click",
  () => {
    showScreen("intro");
  }
);

introBackButton.addEventListener(
  "click",
  () => {
    showScreen("home");
  }
);

openCaseButton.addEventListener(
  "click",
  () => {
    showScreen("case");
    showPanel("scene");

    localStorage.setItem(
      "alibi-case-001-started",
      "true"
    );
  }
);

caseHomeButton.addEventListener(
  "click",
  () => {
    showScreen("home");
  }
);

navButtons.forEach(
  (button) => {
    button.addEventListener(
      "click",
      () => {
        showPanel(
          button.dataset.target
        );
      }
    );
  }
);

closeDiscoveryButton.addEventListener(
  "click",
  () => {
    sceneDiscovery.hidden =
      true;
  }
);

talkToPeopleButton.addEventListener(
  "click",
  () => {
    showPanel("people");
  }
);

document
  .querySelectorAll(
    "[data-dialogue-close]"
  )
  .forEach(
    (element) => {
      element.addEventListener(
        "click",
        closeCharacterDialogue
      );
    }
  );

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape" &&
      !characterDialogue.hidden
    ) {
      closeCharacterDialogue();
    }
  }
);

const savedNotes =
  localStorage.getItem(
    "alibi-case-001-notes"
  );

if (savedNotes) {
  notesArea.value =
    savedNotes;
}

notesArea.addEventListener(
  "input",
  () => {
    localStorage.setItem(
      "alibi-case-001-notes",
      notesArea.value
    );
  }
);

window.addEventListener(
  "load",
  () => {
    window.setTimeout(
      () => {
        splashScreen.classList.add(
          "is-hidden"
        );
      },
      2350
    );
  }
);

showScreen("home");
loadCaseData();
