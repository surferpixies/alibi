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

showScreen("home");


const splashScreen =
  document.getElementById("splash-screen");

window.addEventListener(
  "load",
  () => {
    window.setTimeout(
      () => {
        splashScreen.classList.add(
          "is-hidden"
        );
      },
      1500
    );
  }
);
