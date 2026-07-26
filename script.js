/* ==========================================================================
   ADS International Auditors LLC — UAE E-Invoicing Awareness Session
   Registration Website — Application Logic
   ========================================================================== */

import { isSupabaseConfigured, getSupabaseClient } from "./supabaseClient.js";

(function () {
  "use strict";

  const STEP_TITLES = {
    1: "Contact Details",
    2: "Company Information",
    3: "Business Systems",
    4: "Final Details",
  };

  const TOTAL_STEPS = 4;

  /** Central application state — preserved across steps and re-submission attempts. */
  const state = {
    currentStep: 1,
    formData: {},
  };

  /* ------------------------------------------------------------------ */
  /* Element references                                                  */
  /* ------------------------------------------------------------------ */
  const screenIntro = document.getElementById("screen-intro");
  const screenRegistration = document.getElementById("screen-registration");
  const screenSuccess = document.getElementById("screen-success");
  const stepAnnouncer = document.getElementById("step-announcer");

  const btnStart = document.getElementById("btn-start-registration");
  const form = document.getElementById("registration-form");

  const progressFill = document.getElementById("progress-fill");
  const stepNumCurrent = document.getElementById("step-num-current");
  const stepNumTitle = document.getElementById("step-num-title");
  const progressNodes = Array.from(document.querySelectorAll(".progress-node"));

  const panels = Array.from(document.querySelectorAll(".form-panel"));

  const mobileInput = document.getElementById("mobile");
  const MOBILE_DEFAULT_PREFIX = "+971 ";

  const erpOtherWrap = document.getElementById("erp-other-wrap");
  const erpOtherInput = document.getElementById("erpOtherSpecify");
  const hearAboutOtherWrap = document.getElementById("hearabout-other-wrap");
  const hearAboutOtherInput = document.getElementById("hearAboutOtherSpecify");

  const summaryGrid = document.getElementById("summary-grid");
  const btnSubmit = document.getElementById("btn-submit");
  const errSubmit = document.getElementById("err-submit");

  let isSubmitting = false;

  /* ------------------------------------------------------------------ */
  /* Lightweight analytics: funnel tracking for the dashboard.           */
  /* Fire-and-forget -- never blocks the UI and never surfaces errors to */
  /* the visitor if it fails (e.g. Supabase not configured yet).         */
  /* ------------------------------------------------------------------ */
  function trackEvent(eventType) {
    if (!isSupabaseConfigured()) return;
    getSupabaseClient()
      .then((supabase) => supabase.from("page_events").insert([{ event_type: eventType }]))
      .catch(() => {});
  }

  trackEvent("page_view");

  /* ------------------------------------------------------------------ */
  /* Screen transition helper (single-page, no reload, no new tabs)      */
  /* ------------------------------------------------------------------ */
  function switchScreen(fromEl, toEl) {
    if (fromEl === toEl) return;
    fromEl.classList.add("transitioning-out");
    fromEl.setAttribute("aria-hidden", "true");

    window.setTimeout(() => {
      fromEl.classList.remove("active", "transitioning-out");
      toEl.classList.add("active", "transitioning-in");
      toEl.setAttribute("aria-hidden", "false");
      window.scrollTo({ top: 0, behavior: "auto" });

      window.setTimeout(() => {
        toEl.classList.remove("transitioning-in");
      }, 450);
    }, 200);
  }

  btnStart.addEventListener("click", () => {
    trackEvent("registration_started");
    switchScreen(screenIntro, screenRegistration);
    goToStep(1, { focusHeading: true });
  });

  /* ------------------------------------------------------------------ */
  /* Step navigation                                                     */
  /* ------------------------------------------------------------------ */
  function goToStep(stepNumber, opts) {
    opts = opts || {};
    state.currentStep = stepNumber;

    panels.forEach((panel) => {
      const isTarget = Number(panel.dataset.panel) === stepNumber;
      panel.classList.toggle("active", isTarget);
    });

    progressFill.style.width = (stepNumber / TOTAL_STEPS) * 100 + "%";
    stepNumCurrent.textContent = String(stepNumber);
    stepNumTitle.textContent = STEP_TITLES[stepNumber];

    progressNodes.forEach((node) => {
      const n = Number(node.dataset.node);
      node.classList.remove("is-active", "is-done");
      if (n < stepNumber) node.classList.add("is-done");
      else if (n === stepNumber) node.classList.add("is-active");
    });

    stepAnnouncer.textContent = "Step " + stepNumber + " of " + TOTAL_STEPS + ": " + STEP_TITLES[stepNumber];

    if (stepNumber === TOTAL_STEPS) {
      renderSummary();
    }

    if (opts.focusHeading) {
      const heading = document.getElementById("panel" + stepNumber + "-heading");
      if (heading) {
        window.setTimeout(() => heading.focus(), 260);
      }
    }

    // Re-validate the freshly shown step so its Continue/Submit button reflects saved state.
    validateStep(stepNumber);
  }

  document.querySelectorAll(".btn-continue").forEach((btn) => {
    btn.addEventListener("click", () => {
      const step = Number(btn.dataset.continueFor);
      if (!validateStep(step, { showErrors: true })) return;
      saveStepData(step);
      goToStep(step + 1, { focusHeading: true });
    });
  });

  document.querySelectorAll(".btn-back").forEach((btn) => {
    btn.addEventListener("click", () => {
      const step = Number(btn.dataset.backFor);
      goToStep(step - 1, { focusHeading: true });
    });
  });

  /* Enter-to-continue (but never inside the textarea, and never while submitting) */
  form.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (e.target.tagName === "TEXTAREA") return;
    if (e.target.closest(".form-panel") === null) return;

    const panel = e.target.closest(".form-panel");
    const step = Number(panel.dataset.panel);

    if (step < TOTAL_STEPS) {
      e.preventDefault();
      const continueBtn = panel.querySelector(".btn-continue");
      if (continueBtn && !continueBtn.disabled) continueBtn.click();
    }
    // On the final step, Enter is allowed to submit the form natively.
  });

  /* ------------------------------------------------------------------ */
  /* Field validators                                                    */
  /* ------------------------------------------------------------------ */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^\+?[0-9\s()-]{7,20}$/;

  function isPhoneValid(value) {
    const digitCount = (value.match(/\d/g) || []).length;
    return PHONE_RE.test(value) && digitCount >= 7;
  }

  function showFieldError(fieldId, message) {
    const errEl = document.getElementById("err-" + fieldId);
    const inputEl = document.getElementById(fieldId);
    if (errEl) {
      errEl.textContent = message;
      errEl.classList.toggle("is-visible", Boolean(message));
    }
    if (inputEl) {
      if (message) inputEl.setAttribute("aria-invalid", "true");
      else inputEl.removeAttribute("aria-invalid");
    }
  }

  function showGroupError(groupName, message) {
    const errEl = document.getElementById("err-" + groupName);
    if (errEl) {
      errEl.textContent = message;
      errEl.classList.toggle("is-visible", Boolean(message));
    }
  }

  function getRadioValue(name) {
    const checked = form.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : "";
  }

  /**
   * Validates the given step. When showErrors is true, inline messages are
   * displayed; otherwise this is a silent check used to toggle the Continue
   * button state as the user types.
   */
  function validateStep(step, options) {
    const showErrors = Boolean(options && options.showErrors);
    let valid = true;

    if (step === 1) {
      const fullName = document.getElementById("fullName").value.trim();
      const mobile = document.getElementById("mobile").value.trim();
      const email = document.getElementById("email").value.trim();

      if (!fullName) {
        valid = false;
        if (showErrors) showFieldError("fullName", "Please enter your full name.");
      } else if (showErrors) showFieldError("fullName", "");

      if (!mobile || !isPhoneValid(mobile)) {
        valid = false;
        if (showErrors) showFieldError("mobile", "Please enter a valid mobile number.");
      } else if (showErrors) showFieldError("mobile", "");

      if (!email || !EMAIL_RE.test(email)) {
        valid = false;
        if (showErrors) showFieldError("email", "Please enter a valid email address.");
      } else if (showErrors) showFieldError("email", "");
    }

    if (step === 2) {
      const companyName = document.getElementById("companyName").value.trim();
      const designation = document.getElementById("designation").value.trim();
      const turnover = getRadioValue("turnover");

      if (!companyName) {
        valid = false;
        if (showErrors) showFieldError("companyName", "Please enter your company name.");
      } else if (showErrors) showFieldError("companyName", "");

      if (!designation) {
        valid = false;
        if (showErrors) showFieldError("designation", "Please enter your designation.");
      } else if (showErrors) showFieldError("designation", "");

      if (!turnover) {
        valid = false;
        if (showErrors) showGroupError("turnover", "Please select your annual turnover.");
      } else if (showErrors) showGroupError("turnover", "");
    }

    if (step === 3) {
      const erp = getRadioValue("erp");
      const erpOther = erpOtherInput.value.trim();
      const attendees = document.getElementById("attendees").value;

      if (!erp) {
        valid = false;
        if (showErrors) showGroupError("erp", "Please select your accounting or ERP software.");
      } else if (erp === "Other" && !erpOther) {
        valid = false;
        if (showErrors) showFieldError("erpOtherSpecify", "Please specify your accounting or ERP software.");
      } else if (showErrors) {
        showGroupError("erp", "");
        showFieldError("erpOtherSpecify", "");
      }

      if (!attendees) {
        valid = false;
        if (showErrors) showFieldError("attendees", "Please select the number of attendees.");
      } else if (showErrors) showFieldError("attendees", "");
    }

    if (step === 4) {
      const hearAbout = getRadioValue("hearAbout");
      const hearAboutOther = hearAboutOtherInput.value.trim();

      if (!hearAbout) {
        valid = false;
        if (showErrors) showGroupError("hearAbout", "Please let us know how you heard about this event.");
      } else if (hearAbout === "Other" && !hearAboutOther) {
        valid = false;
        if (showErrors) showFieldError("hearAboutOtherSpecify", "Please specify how you heard about the event.");
      } else if (showErrors) {
        showGroupError("hearAbout", "");
        showFieldError("hearAboutOtherSpecify", "");
      }
    }

    const btn = document.querySelector(
      step < TOTAL_STEPS ? '.btn-continue[data-continue-for="' + step + '"]' : "#btn-submit"
    );
    if (btn && step < TOTAL_STEPS) btn.disabled = !valid;

    return valid;
  }

  function saveStepData(step) {
    if (step === 1) {
      state.formData.fullName = document.getElementById("fullName").value.trim();
      state.formData.mobile = document.getElementById("mobile").value.trim();
      state.formData.email = document.getElementById("email").value.trim();
    }
    if (step === 2) {
      state.formData.companyName = document.getElementById("companyName").value.trim();
      state.formData.designation = document.getElementById("designation").value.trim();
      state.formData.turnover = getRadioValue("turnover");
    }
    if (step === 3) {
      state.formData.erp = getRadioValue("erp");
      state.formData.erpOtherSpecify = erpOtherInput.value.trim();
      state.formData.attendees = document.getElementById("attendees").value;
    }
    if (step === 4) {
      state.formData.hearAbout = getRadioValue("hearAbout");
      state.formData.hearAboutOtherSpecify = hearAboutOtherInput.value.trim();
      state.formData.question = document.getElementById("question").value.trim();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Live validation listeners (enable Continue once step is complete)   */
  /* ------------------------------------------------------------------ */
  [1, 2, 3, 4].forEach((step) => {
    const panel = document.querySelector('.form-panel[data-panel="' + step + '"]');
    panel.addEventListener("input", () => validateStep(step));
    panel.addEventListener("change", () => validateStep(step));
  });

  /* Mobile number: place the cursor after the +971 default prefix on first
     focus, so users can just type their number without deleting it first.
     Only applies while the field still holds the untouched default. */
  mobileInput.addEventListener("focus", () => {
    if (mobileInput.value === MOBILE_DEFAULT_PREFIX) {
      const len = mobileInput.value.length;
      mobileInput.setSelectionRange(len, len);
    }
  });

  /* Conditional "Other" fields */
  form.querySelectorAll('input[name="erp"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const isOther = radio.value === "Other" && radio.checked;
      erpOtherWrap.hidden = !isOther;
      if (!isOther) erpOtherInput.value = "";
      validateStep(3);
    });
  });

  form.querySelectorAll('input[name="hearAbout"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const isOther = radio.value === "Other" && radio.checked;
      hearAboutOtherWrap.hidden = !isOther;
      if (!isOther) hearAboutOtherInput.value = "";
      validateStep(4);
    });
  });

  /* ------------------------------------------------------------------ */
  /* Review summary (Step 4)                                             */
  /* ------------------------------------------------------------------ */
  function renderSummary() {
    saveStepData(1);
    saveStepData(2);
    saveStepData(3);

    const d = state.formData;
    const erpDisplay = d.erp === "Other" && d.erpOtherSpecify ? d.erpOtherSpecify : d.erp;

    const rows = [
      { label: "Full Name", value: d.fullName, step: 1 },
      { label: "Company Name", value: d.companyName, step: 2 },
      { label: "Mobile Number", value: d.mobile, step: 1 },
      { label: "Email", value: d.email, step: 1 },
      { label: "Designation", value: d.designation, step: 2 },
      { label: "Turnover", value: d.turnover, step: 2 },
      { label: "ERP Software", value: erpDisplay, step: 3 },
      { label: "Number of Attendees", value: d.attendees, step: 3 },
    ];

    summaryGrid.innerHTML = "";
    rows.forEach((row) => {
      if (!row.value) return;
      const dt = document.createElement("dt");
      dt.textContent = row.label;
      const dd = document.createElement("dd");
      dd.textContent = row.value;
      const wrapper = document.createElement("div");
      wrapper.className = "summary-row";
      wrapper.appendChild(dt);
      wrapper.appendChild(dd);
      summaryGrid.appendChild(wrapper);
    });

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "summary-edit-btn";
    editBtn.textContent = "Edit your details";
    editBtn.addEventListener("click", () => goToStep(1, { focusHeading: true }));

    const existingEdit = document.querySelector("#summary-card .summary-edit-btn");
    if (existingEdit) existingEdit.remove();
    document.getElementById("summary-card").appendChild(editBtn);
  }

  /* ------------------------------------------------------------------ */
  /* Final submission                                                    */
  /* ------------------------------------------------------------------ */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateStep(4, { showErrors: true })) return;
    saveStepData(4);

    isSubmitting = true;
    btnSubmit.disabled = true;
    btnSubmit.classList.add("is-loading");
    errSubmit.classList.remove("is-visible");
    errSubmit.textContent = "";

    // Column names match the Supabase "responses" table exactly —
    // see DEPLOYMENT-GUIDE.md for the matching CREATE TABLE statement.
    const row = {
      full_name: state.formData.fullName,
      mobile: state.formData.mobile,
      email: state.formData.email,
      company_name: state.formData.companyName,
      designation: state.formData.designation,
      turnover: state.formData.turnover,
      erp: state.formData.erp,
      erp_other_specify: state.formData.erpOtherSpecify || null,
      attendees: Number(state.formData.attendees),
      hear_about: state.formData.hearAbout,
      hear_about_other_specify: state.formData.hearAboutOtherSpecify || null,
      question: state.formData.question || null,
    };

    try {
      if (!isSupabaseConfigured()) {
        throw new Error(
          "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY " +
          "in your Vercel project settings and redeploy."
        );
      }

      const supabase = await getSupabaseClient();
      const { error } = await supabase.from("responses").insert([row]);
      if (error) throw error;

      switchScreen(screenRegistration, screenSuccess);
      stepAnnouncer.textContent = "Registration submitted successfully.";
    } catch (err) {
      console.error("Registration submission failed:", err);
      errSubmit.textContent = "We could not submit your registration. Please check your internet connection and try again.";
      errSubmit.classList.add("is-visible");
      errSubmit.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally {
      isSubmitting = false;
      btnSubmit.disabled = false;
      btnSubmit.classList.remove("is-loading");
    }
  });

  /* ------------------------------------------------------------------ */
  /* Placeholder-image fallback                                          */
  /* ------------------------------------------------------------------ */
  /* Until ADS_LOGO_PLACEHOLDER and EVENT_BANNER_IMAGE_PLACEHOLDER are
     replaced with real file paths, hide the broken-image icon so the
     layout still looks premium during setup/testing. */
  document.querySelectorAll(".ads-logo, .ads-logo-small, .event-banner-img").forEach((img) => {
    const hideIfBroken = () => {
      if (img.complete && img.naturalWidth === 0) img.style.display = "none";
    };
    // The placeholder src may already have failed to load by the time this
    // script runs (it's loaded at the end of body), so check immediately
    // in addition to listening for a future error event.
    hideIfBroken();
    img.addEventListener("error", hideIfBroken);
  });

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */
  goToStep(1);
})();
