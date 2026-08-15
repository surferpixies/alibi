const startCaseButton =
  document.getElementById("start-case-btn");

const caseModal =
  document.getElementById("case-modal");

const closeModalElements =
  document.querySelectorAll("[data-close-modal]");

function openCaseModal() {
  caseModal.classList.add("is-open");

  caseModal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";
}

function closeCaseModal() {
  caseModal.classList.remove("is-open");

  caseModal.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.style.overflow =
    "";
}

startCaseButton.addEventListener(
  "click",
  openCaseModal
);

closeModalElements.forEach(
  (element) => {
    element.addEventListener(
      "click",
      closeCaseModal
    );
  }
);

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape" &&
      caseModal.classList.contains(
        "is-open"
      )
    ) {
      closeCaseModal();
    }
  }
);
