(() => {
  "use strict";
  const CFG = window.ENERGIE_CONFIG || {};
  const APP_KEY = "energieRepasDB";
  const BACKUP_KEY = "energieRepasBackups";
  const OUTBOX_KEY = "energieRepasOutboxV16";
  const BARCODE_CACHE_KEY = "energieBarcodeProductsV2";
  const CURRENT_VERSION = 55;
  const APP_RELEASE = "3.46.1";
  const FEELING_ALIASES = {
    energy: "stable_energy",
    stable_energy: "feeling_good",
    good_mood: "feeling_good",
    calm: "feeling_good",
    light_after_meal: "easy_digestion",
    satisfied: "feeling_good",
    easy_digestion: "feeling_good",
    focus: "feeling_good",
    cramps: "stomachache",
    slow_digestion: "heaviness",
    energy_drop: "fatigue",
    sleepiness: "fatigue",
    dizziness: "weakness",
    trembling: "weakness",
    poor_focus: "brain_fog",
    migraine: "headache",
    sound_sensitivity: "light_sensitivity",
    smell_sensitivity: "light_sensitivity",
    sneezing: "congestion",
    redness: "itching",
    anxiety: "stress",
    low_mood: "irritability",
    sugar_craving: "craving",
    chills: "hot_flash",
    vomiting: "nausea",
    urgent_stool: "diarrhea",
    frequent_urination: "unusual_thirst",
  };
  function canonicalFeelingId(id) {
    let current = id, guard = 0;
    while (FEELING_ALIASES[current] && guard < 10) {
      current = FEELING_ALIASES[current];
      guard += 1;
    }
    return current;
  }
  function normalizeFeelingIds(ids = []) {
    return [...new Set((Array.isArray(ids) ? ids : []).map(canonicalFeelingId).filter(Boolean))];
  }
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const uid = () =>
    crypto.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const todayKey = () => new Date().toLocaleDateString("en-CA");
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const clamp = (n, a, b) => Math.max(a, Math.min(b, Number(n) || 0));
  function activityIcon(t) {
    return (
      {
        Marche: "🚶",
        Course: "🏃",
        Vélo: "🚴",
        Musculation: "🏋️",
        Yoga: "🧘",
        Natation: "🏊",
        Autre: "✨",
      }[t] || "✨"
    );
  }
  function dateSeed(key = "") {
    return [...String(key)].reduce(
      (sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0,
      2166136261,
    );
  }
  function easterDate(year) {
    const a = year % 19,
      b = Math.floor(year / 100),
      c = year % 100,
      d = Math.floor(b / 4),
      e = b % 4,
      f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30,
      i = Math.floor(c / 4),
      k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7,
      m = Math.floor((a + 11 * h + 22 * l) / 451),
      month = Math.floor((h + l - 7 * m + 114) / 31),
      day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day, 12);
  }
  function seasonalDecoration(dateKey) {
    if (db?.settings?.seasonalIcons === false) return null;
    const date = localDate(dateKey),
      year = date.getFullYear(),
      month = date.getMonth() + 1,
      day = date.getDate(),
      pick = (icons, label) => ({
        icon: icons[dateSeed(dateKey) % icons.length],
        label,
      });
    const easter = easterDate(year),
      diff = Math.round((date - easter) / 86400000);
    if (month === 1 && day === 1)
      return pick(["🎉", "✨", "🥳"], "Jour de l’An");
    if (month === 2 && day === 14)
      return pick(["❤️", "💕", "💗"], "Saint-Valentin");
    if (Math.abs(diff) <= 3) return pick(["🐰", "🥚", "🐣", "🌷"], "Pâques");
    if (month === 4 && day === 22)
      return pick(["🌎", "🌱", "🌿"], "Jour de la Terre");
    if (month === 6 && day === 24)
      return pick(["⚜️", "🎆", "💙"], "Fête nationale du Québec");
    if (month === 7 && day === 1)
      return pick(["🍁", "🇨🇦", "🎆"], "Fête du Canada");
    if (month === 10)
      return pick(["🎃", "👻", "🦇", "🕸️", "🍬"], "Ambiance d’Halloween");
    if (month === 12 && day === 31)
      return pick(["🎉", "🥂", "✨"], "Veille du Jour de l’An");
    if (month === 12)
      return pick(["🎄", "⭐", "🎁", "🔔", "🕯️", "❄️"], "Ambiance de Noël");
    if (month >= 3 && month <= 5)
      return pick(["🌸", "🌷", "🌼", "🪻", "🌱"], "Printemps");
    if (month >= 6 && month <= 8)
      return pick(["☀️", "🌻", "🍉", "🍦", "🌊", "🏖️"], "Été");
    if (month >= 9 && month <= 11)
      return pick(["🍂", "🍁", "🌰", "☕", "🌾"], "Automne");
    return pick(["❄️", "☃️", "🧣", "🧤", "🌨️"], "Hiver");
  }
  function seasonalDecorationHtml(dateKey) {
    const item = seasonalDecoration(dateKey);
    return item
      ? `<span class="seasonal-day-icon" role="img" aria-label="${esc(item.label)}" title="${esc(item.label)}">${item.icon}</span>`
      : "";
  }
  const ACTIVITY_KCAL_PER_MIN = {
    Marche: { low: 3.2, moderate: 4.5, high: 6.2 },
    Course: { low: 7.5, moderate: 10.0, high: 13.0 },
    Vélo: { low: 4.5, moderate: 7.5, high: 11.0 },
    Musculation: { low: 3.5, moderate: 5.5, high: 8.0 },
    Yoga: { low: 2.2, moderate: 3.2, high: 4.5 },
    Natation: { low: 5.0, moderate: 8.0, high: 11.0 },
    Autre: { low: 3.0, moderate: 5.0, high: 7.0 },
  };
  const ACTIVITY_INTENSITY_LABELS = {
    low: "Faible",
    moderate: "Modérée",
    high: "Élevée",
  };
  function normalizeActivity(a = {}) {
    const type = a.type || a.activity_type || "Autre",
      minutes = Math.max(0, Number(a.minutes ?? a.duration_minutes) || 0),
      intensity = ["low", "moderate", "high"].includes(a.intensity)
        ? a.intensity
        : "moderate";
    const estimatedRaw = a.estimatedCalories ?? a.estimated_calories;
    const estimatedCalories = Number.isFinite(Number(estimatedRaw))
      ? Math.max(0, Math.round(Number(estimatedRaw)))
      : estimateActivityCalories(type, minutes, intensity);
    const actualRaw =
      a.actualCalories ?? a.actual_calories ?? a.caloriesActual ?? null;
    const actualCalories =
      actualRaw === "" || actualRaw == null
        ? null
        : Math.max(0, Math.round(Number(actualRaw) || 0));
    return {
      id: a.id || uid(),
      type,
      minutes,
      intensity,
      estimatedCalories,
      actualCalories,
      at: a.at || a.recorded_at || new Date().toISOString(),
    };
  }
  function activityToCloud(a = {}) {
    const x = normalizeActivity(a);
    return {
      id: x.id,
      type: x.type,
      minutes: x.minutes,
      intensity: x.intensity,
      estimatedCalories: x.estimatedCalories,
      actualCalories: x.actualCalories,
      at: x.at,
    };
  }
  function estimateActivityCalories(type, minutes, intensity = "moderate") {
    const rates = ACTIVITY_KCAL_PER_MIN[type] || ACTIVITY_KCAL_PER_MIN.Autre;
    return Math.max(
      0,
      Math.round((Number(minutes) || 0) * (rates[intensity] || rates.moderate)),
    );
  }
  function activityCalories(a) {
    return a.actualCalories != null
      ? Number(a.actualCalories) || 0
      : Number(a.estimatedCalories) || 0;
  }
  function activitySummary(day) {
    const items = (day.activities || []).map(normalizeActivity),
      minutes = items.reduce((sum, a) => sum + (Number(a.minutes) || 0), 0),
      calories = items.reduce((sum, a) => sum + activityCalories(a), 0);
    return {
      minutes,
      calories,
      label: minutes ? `${minutes} min` : "À noter",
      count: items.length,
    };
  }
  const SLEEP_MARKERS = [
    { id: "frequent-wakings", icon: "🔄", label: "Réveils fréquents" },
    { id: "bathroom", icon: "🚽", label: "Levé pour uriner" },
    { id: "apnea", icon: "😮‍💨", label: "Ronflements / apnée" },
    { id: "falling-asleep", icon: "😴", label: "Difficulté à s’endormir" },
    { id: "early-waking", icon: "⏰", label: "Réveil très tôt" },
    { id: "nightmares", icon: "😰", label: "Cauchemars" },
    { id: "discomfort", icon: "🥵", label: "Trop chaud / inconfort" },
    { id: "none", icon: "✅", label: "Rien de particulier" },
  ];
  function sleepMarker(id) {
    return SLEEP_MARKERS.find((x) => x.id === id);
  }
  const client =
    window.supabase && CFG.supabaseUrl && CFG.supabasePublishableKey
      ? window.supabase.createClient(
          CFG.supabaseUrl,
          CFG.supabasePublishableKey,
          {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
            },
          },
        )
      : null;
  let session = null,
    currentView = "today",
    selectedDate = todayKey(),
    syncState = "local",
    syncBusy = false,
    syncQueued = false,
    photoData = null,
    photoRemoved = false,
    mealAiSuggestionText = "",
    mealNutritionPreviewTimer = null,
    mealNutritionManuallyEdited = false,
    mealFoodReview = null,
    authMode = "login",
    feelingMealId = null,
    notificationTimer = null;
  let hasDemoAccess = false;
  let professionalDemoMode = false;
  const EATING_REASON_IDS = new Set(["hunger", "routine", "boredom", "pleasure", "other"]);
  const LEGACY_EATING_REASON_LABELS = {
    social: "pour partager un moment",
    emotion: "à cause d’une émotion",
    energy: "pour avoir de l’énergie",
    activity: "avant ou après une activité",
  };
  function normalizedEatingReasonState(value, existing = "") {
    const raw = [...new Set(Array.isArray(value) ? value : [])], out = [],
      currentParts = String(existing || "").split(";").map((part) => part.trim()).filter(Boolean),
      recoveredRoutine = raw.includes("routine") || currentParts.some((part) => /^c[’']était l’heure de manger$/i.test(part)),
      current = currentParts.filter((part) => !/^c[’']était l’heure de manger$/i.test(part)).join("; "),
      legacy = raw.map((id) => LEGACY_EATING_REASON_LABELS[id]).filter(Boolean),
      otherText = [current, ...legacy.filter((label) => !current.toLocaleLowerCase("fr-CA").includes(label.toLocaleLowerCase("fr-CA")))]
        .filter(Boolean).join("; ").slice(0, 160);
    if (raw.includes("hunger")) out.push("hunger");
    if (recoveredRoutine) out.push("routine");
    if (raw.includes("boredom")) out.push("boredom");
    if (raw.includes("pleasure") || raw.includes("craving")) out.push("pleasure");
    if (otherText || (raw.includes("other") && !recoveredRoutine)) out.push("other");
    return { reasons: out, other: otherText };
  }
  function normalizeEatingReasons(value) {
    return normalizedEatingReasonState(value).reasons;
  }
  function legacyEatingReasonOther(value, existing = "") {
    return normalizedEatingReasonState(value, existing).other;
  }
  function nutritionVisibleToViewer() {
    return !!professionalDemoMode;
  }
  let barcodeReader = null,
    barcodeControls = null,
    barcodeBusy = false,
    barcodeLastCode = "",
    barcodeLastProduct = null,
    barcodeTargetInputId = "mealDescription";
  let selectedRecentSnackId = null;
  let quickSnackPhotoData = null;

  function normalizeSupplements(value) {
    return [
      ...new Set(
        (Array.isArray(value) ? value : [value])
          .flatMap((v) => String(v || "").split(","))
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    ];
  }
  function supplementIcon(name) {
    const value = String(name || "")
      .toLocaleLowerCase("fr-CA")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (/omega|huile de poisson|fish oil|dha|epa/.test(value)) return "🐟";
    if (/vitamine?\s*d\b|vitamin\s*d\b/.test(value)) return "☀️";
    if (/vitamine?\s*c\b|vitamin\s*c\b/.test(value)) return "🍊";
    if (/vitamine?\s*b|vitamin\s*b|b12|complexe?\s*b/.test(value)) return "⚡";
    if (/calcium/.test(value)) return "🦴";
    if (/fer\b|iron\b/.test(value)) return "🩸";
    if (/magnesium/.test(value)) return "⚡";
    if (/zinc|selenium|mineral/.test(value)) return "🪨";
    if (/probiot|prebiot/.test(value)) return "🦠";
    if (/collagene|collagen/.test(value)) return "🧬";
    if (/melatonine|melatonin/.test(value)) return "🌙";
    if (/creatine/.test(value)) return "💪";
    if (/fibre|psyllium/.test(value)) return "🌾";
    if (/multi|vitamine|vitamin/.test(value)) return "🌈";
    return "💊";
  }
  function decorateSupplementIcons() {
    $$(".supplement-chip").forEach((chip) => {
      if (chip.querySelector(".supplement-chip-icon")) return;
      const name = chip.textContent.replace(/×\s*$/, "").trim();
      const icon = document.createElement("span");
      icon.className = "supplement-chip-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = supplementIcon(name);
      chip.prepend(icon);
    });
  }
  const OBSERVATION_DURATIONS = {
    ongoing: "Toujours présente",
    under_hour: "Moins d’une heure",
    few_hours: "Quelques heures",
    day: "Environ une journée",
    several_days: "Plusieurs jours",
    unknown: "Durée inconnue",
  };
  const OBSERVATION_CONTEXTS = {
    food: "Alimentation",
    sleep: "Sommeil",
    stress: "Stress",
    activity: "Activité",
    environment: "Environnement",
    unknown: "Inconnu",
  };
  function normalObservation(o = {}, date = todayKey()) {
    return {
      id: o.id || uid(),
      date: o.date || date,
      time: (
        o.time ||
        o.startedAt ||
        new Date().toTimeString().slice(0, 5)
      ).slice(0, 5),
      intensity: Math.min(5, Math.max(1, Number(o.intensity) || 3)),
      duration: OBSERVATION_DURATIONS[o.duration] ? o.duration : "unknown",
      tags: normalizeFeelingIds(o.tags),
      contexts: Array.isArray(o.contexts) ? o.contexts : [],
      mealIds: Array.isArray(o.mealIds) ? o.mealIds : [],
      notes: typeof o.notes === "string" ? o.notes : "",
      photoLocal: o.photoLocal || null,
      createdAt: o.createdAt || new Date().toISOString(),
      updatedAt: o.updatedAt || new Date().toISOString(),
    };
  }
  function observationForCloud(o) {
    const clean = normalObservation(o, o.date);
    delete clean.photoLocal;
    return clean;
  }
  function freshDB() {
    return {
      version: CURRENT_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        waterGoal: 8,
        theme: "system",
        showWelcome: true,
        insightsEnabled: true,
        nutritionObservations: true,
        macroTracking: true,
        autoNutritionEstimates: true,
        generalRecommendations: true,
        showSources: true,
        professionalSupport: false,
        feelingReminders: true,
        feelingDelayHours: 0.5,
        feelingDelayPreferenceSet: false,
        feelingMealTypes: ["Déjeuner", "Dîner", "Souper"],
        trackedFeelingIds: [],
        trackedFeelingsConfigured: false,
        supplements: [],
        supplementsUpdatedAt: "",
        demoMode: false,
        demoTourSeen: false,
        demoName: "Marie",
        demoProfileId: "marie",
        demoReadOnly: true,
        seasonalIcons: true,
        physiologicalContext: "none",
        menstrualLastStart: "",
        pregnancyDueDate: "",
      },
      favorites: [],
      days: {},
    };
  }
  function ensureDay(store, key = todayKey()) {
    const defaultSupplements = normalizeSupplements(
      store.settings?.supplements || [],
    );
    if (!store.days[key])
      store.days[key] = {
        date: key,
        sleepHours: null,
        sleepTags: [],
        sleepComment: "",
        water: 0,
        activities: [],
        meals: [],
        observations: [],
        supplementsTaken: [...defaultSupplements],
        updatedAt: new Date().toISOString(),
      };
    const d = store.days[key];
    d.activities = (Array.isArray(d.activities) ? d.activities : []).map(
      normalizeActivity,
    );
    d.meals = Array.isArray(d.meals) ? d.meals : [];
    d.observations = (Array.isArray(d.observations) ? d.observations : []).map(
      (o) => normalObservation(o, key),
    );
    d.sleepTags = Array.isArray(d.sleepTags) ? d.sleepTags : [];
    d.sleepComment = typeof d.sleepComment === "string" ? d.sleepComment : "";
    d.water = Number(d.water) || 0;
    d.supplementsTaken = normalizeSupplements(
      d.supplementsTaken || d.supplements || [],
    );
    return d;
  }
  function normalNutrition(n) {
    if (!n || typeof n !== "object") return null;
    const val = (k) => {
      const x = Number(n[k]);
      return Number.isFinite(x) && x >= 0 ? Math.round(x * 10) / 10 : null;
    };
    const out = {
      calories: val("calories"),
      protein: val("protein"),
      carbs: val("carbs"),
      fat: val("fat"),
      fiber: val("fiber"),
      sugars: val("sugars"),
      sodium: val("sodium"),
      source: n.source || "manual",
      confidence: n.confidence || "low",
      basis: n.basis || "portion courante",
      estimated: n.estimated !== false,
    };
    return [
      out.calories,
      out.protein,
      out.carbs,
      out.fat,
      out.fiber,
      out.sugars,
      out.sodium,
    ].some((v) => v !== null)
      ? out
      : null;
  }
  function normalizeFeelingScores(value = {}) {
    const out = {};
    if (value && typeof value === "object" && !Array.isArray(value))
      Object.entries(value).forEach(([id, score]) => {
        const n = Number(score);
        const canonicalId = canonicalFeelingId(id);
        const confirmedNone = ["feeling_good", "no_tracked_symptoms"].includes(canonicalId);
        if (canonicalId && confirmedNone && n >= 0 && n <= 5)
          out[canonicalId] = 0;
        else if (canonicalId && n >= 1 && n <= 5)
          out[canonicalId] = Math.max(out[canonicalId] || 0, Math.round(n));
      });
    return out;
  }
  function normalMeal(m = {}, date = todayKey()) {
    const rawFeeling =
        m.feeling && typeof m.feeling === "object" ? m.feeling : null,
      beforeScores = normalizeFeelingScores(
        m.feelingsBefore || m.feelings_before || rawFeeling?.beforeScores,
      ),
      hasAfter = !!(
        rawFeeling &&
        (rawFeeling.recordedAt ||
          rawFeeling.recorded_at ||
          rawFeeling.rating ||
          (rawFeeling.tags || []).length ||
          Object.keys(normalizeFeelingScores(rawFeeling.scores)).length ||
          rawFeeling.notes)
      );
    const legacyAfterScores =
      rawFeeling && !Object.keys(normalizeFeelingScores(rawFeeling.scores)).length
        ? normalizeFeelingScores(Object.fromEntries(
            (rawFeeling.tags || []).map((id) => [
              id,
              Math.min(5, Math.max(1, Number(rawFeeling.rating) || 3)),
            ]),
          ))
        : normalizeFeelingScores(rawFeeling?.scores);
    const feeling = hasAfter
      ? {
          ...rawFeeling,
          tags: Object.keys(legacyAfterScores),
          scores: legacyAfterScores,
          beforeScores,
        }
      : null,
      eatingReasonState = normalizedEatingReasonState(
        m.eatingReasons || m.eating_reasons || rawFeeling?.eatingReasons,
        m.eatingReasonOther || m.eating_reason_other || rawFeeling?.eatingReasonOther || "",
      );
    return {
      id: m.id || uid(),
      date: m.date || date,
      time: m.time || "12:00",
      type: m.type || m.mealType || m.typeRepas || "Repas",
      description:
        m.description || m.food || m.aliments || m.repas || m.details || "",
      fatigueBefore: clamp(m.fatigueBefore ?? m.fatigueAvant ?? m.before, 0, 5),
      fatigueAfter: clamp(
        m.fatigueAfter ?? m.fatigueApres ?? m.after ?? m.fatigue1h ?? m.after1h,
        0,
        5,
      ),
      feelingsBefore: beforeScores,
      feelingsBeforeQuality:
        m.feelingsBeforeQuality || rawFeeling?.beforeQuality || null,
      eatingReasons: eatingReasonState.reasons,
      eatingReasonOther: eatingReasonState.other,
      notes: m.notes || "",
      nutrition: normalNutrition(m.nutrition || m.macros),
      foodReview:
        m.foodReview || m.food_review || rawFeeling?.foodReview || null,
      photoUrl: m.photoUrl || null,
      photoPath: m.photoPath || null,
      photoLocal: m.photoLocal || m.photo || m.image || null,
      createdAt: m.createdAt || new Date().toISOString(),
      updatedAt: m.updatedAt || new Date().toISOString(),
      feeling,
      feelingNotifiedAt: m.feelingNotifiedAt || null,
      recommendation:
        m.recommendation && typeof m.recommendation === "object"
          ? {
              category: m.recommendation.category || "",
              message: m.recommendation.message || "",
            }
          : null,
    };
  }
  function normalFavorite(f = {}) {
    return {
      id: f.id || uid(),
      name: f.name || f.description || "Mon repas",
      type: f.type || "Repas",
      description: f.description || "",
      notes: f.notes || "",
      usageCount: Number(f.usageCount ?? f.usage_count ?? 0) || 0,
      createdAt: f.createdAt || f.created_at || new Date().toISOString(),
      updatedAt: f.updatedAt || f.updated_at || new Date().toISOString(),
    };
  }
  function migrate(raw) {
    const out = freshDB();
    if (!raw || typeof raw !== "object") return out;
    out.settings = { ...out.settings, ...(raw.settings || {}) };
    out.settings.supplements = normalizeSupplements(
      out.settings.supplements || raw.settings?.supplements || [],
    );
    if (Number(raw.version || 0) < 19 && raw.settings?.macroTracking === false)
      out.settings.macroTracking = true;
    if (Number(raw.version || 0) < 30) {
      const legacyFeelingDelay = Number(raw.settings?.feelingDelayHours);
      if (raw.settings?.feelingDelayPreferenceSet !== true) {
        if (!Number.isFinite(legacyFeelingDelay) || legacyFeelingDelay === 2)
          out.settings.feelingDelayHours = 0.5;
        else if (legacyFeelingDelay >= 3)
          out.settings.feelingDelayHours = 2;
      }
    }
    if (![0.5, 1, 2].includes(Number(out.settings.feelingDelayHours)))
      out.settings.feelingDelayHours = 0.5;
    out.favorites = (raw.favorites || raw.favoriteMeals || []).map(
      normalFavorite,
    );
    if (raw.days && typeof raw.days === "object") {
      Object.entries(raw.days).forEach(([k, d]) => {
        const day = ensureDay(out, k);
        day.sleepHours = d.sleepHours ?? d.sleep ?? d.sommeil ?? null;
        day.sleepTags = Array.isArray(d.sleepTags)
          ? d.sleepTags
          : Array.isArray(d.sleep_tags)
            ? d.sleep_tags
            : [];
        day.sleepComment = d.sleepComment ?? d.sleep_comment ?? "";
        day.water = Number(d.water ?? d.waterGlasses ?? d.eau ?? 0) || 0;
        day.activities = (Array.isArray(d.activities) ? d.activities : []).map(
          normalizeActivity,
        );
        day.meals = (d.meals || d.repas || []).map((m) => normalMeal(m, k));
        day.observations = (d.observations || []).map((o) =>
          normalObservation(o, k),
        );
        const savedSupplements = d.supplementsTaken ?? d.supplements;
        if (savedSupplements != null)
          day.supplementsTaken = normalizeSupplements(savedSupplements);
        day.updatedAt = d.updatedAt || new Date().toISOString();
      });
      if (!Array.isArray(raw.settings?.trackedFeelingIds)) {
        const used = new Set();
        Object.values(out.days).forEach((day) => {
          (day.meals || []).forEach((meal) => {
            Object.keys(normalizeFeelingScores(meal.feelingsBefore)).forEach((id) => used.add(id));
            Object.keys(normalizeFeelingScores(meal.feeling?.scores)).forEach((id) => used.add(id));
            (meal.feeling?.tags || []).forEach((id) => used.add(id));
          });
          (day.observations || []).forEach((observation) =>
            (observation.tags || []).forEach((id) => used.add(id)),
          );
        });
        out.settings.trackedFeelingIds = normalizeFeelingIds([...used]).filter(
          (id) => !["feeling_good", "no_tracked_symptoms", "other_report"].includes(id),
        );
        out.settings.trackedFeelingsConfigured = out.settings.trackedFeelingIds.length > 0;
      } else {
        out.settings.trackedFeelingIds = normalizeFeelingIds(raw.settings.trackedFeelingIds);
        out.settings.trackedFeelingsConfigured = raw.settings.trackedFeelingsConfigured !== false;
      }
      return out;
    }
    const arr = [
      raw.meals,
      raw.repas,
      raw.entries,
      raw.history,
      raw.logs,
      Array.isArray(raw) ? raw : null,
    ].find(Array.isArray);
    if (arr)
      arr.forEach((x) => {
        const m = normalMeal(x, x.date || x.day || todayKey());
        ensureDay(out, m.date).meals.push(m);
      });
    out.settings.trackedFeelingIds = normalizeFeelingIds(raw.settings?.trackedFeelingIds || []);
    out.settings.trackedFeelingsConfigured = raw.settings?.trackedFeelingsConfigured === true;
    return out;
  }
  function backup(payload, reason) {
    try {
      const b = JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]");
      b.unshift({ at: new Date().toISOString(), reason, payload });
      localStorage.setItem(BACKUP_KEY, JSON.stringify(b.slice(0, 20)));
    } catch (e) {
      console.warn(e);
    }
  }
  function load() {
    const raw = localStorage.getItem(APP_KEY);
    if (!raw) return freshDB();
    try {
      const parsed = JSON.parse(raw);
      backup(parsed, "ouverture-v1.5");
      return migrate(parsed);
    } catch (e) {
      backup(raw, "copie-illisible-v1.5");
      return freshDB();
    }
  }
  let db = load();
  function isStorageQuotaError(error) {
    return (
      error?.name === "QuotaExceededError" ||
      error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error?.code === 22 ||
      error?.code === 1014
    );
  }
  function freeLocalStorageForJournal() {
    try {
      localStorage.removeItem(`${APP_KEY}_shadow`);
      localStorage.removeItem(BACKUP_KEY);
    } catch (_) {}
  }
  function saveLocal(reason = "local") {
    const demoPersistenceAllowed = /demo|visite/i.test(String(reason));
    if (
      db.settings?.demoMode &&
      db.settings?.demoReadOnly &&
      !demoPersistenceAllowed
    )
      return;
    db.version = CURRENT_VERSION;
    db.updatedAt = new Date().toISOString();
    const txt = JSON.stringify(db);
    let saved = false;
    try {
      localStorage.setItem(APP_KEY, txt);
      saved = true;
    } catch (error) {
      if (!isStorageQuotaError(error)) throw error;
      freeLocalStorageForJournal();
      try {
        localStorage.setItem(APP_KEY, txt);
        saved = true;
      } catch (retryError) {
        console.error("Sauvegarde locale principale impossible", retryError);
      }
    }
    if (!saved) return false;
    try {
      localStorage.setItem(`${APP_KEY}_shadow`, txt);
    } catch (error) {
      // La copie secondaire ne doit jamais empêcher l'interface de terminer
      // une action lorsque la sauvegarde principale a bien réussi.
      try { localStorage.removeItem(`${APP_KEY}_shadow`); } catch (_) {}
      console.warn("Copie locale secondaire ignorée", error);
    }
    return true;
  }
  function clearLocalJournalAfterSignOut() {
    try {
      [
        APP_KEY,
        `${APP_KEY}_shadow`,
        BACKUP_KEY,
        OUTBOX_KEY,
        DEMO_BACKUP_KEY,
        DEMO_MEMORY_BACKUP_KEY,
      ].forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn("Nettoyage local après déconnexion incomplet", error);
    }
    db = freshDB();
    db.settings.showWelcome = false;
    professionalDemoMode = false;
    currentView = "today";
    selectedDate = todayKey();
    try {
      window.Brain?.replaceMemoryState?.({
        version: 1,
        settings: {},
        memories: [],
        updatedAt: new Date().toISOString(),
      });
    } catch (_) {}
  }
  const MEMORY_CLOUD_TABLE = "user_food_memory";
  let memorySyncTimer = null,
    memorySyncBusy = false;
  function brainMemoryState() {
    try {
      return window.Brain?.memory?.exportState?.() || null;
    } catch (_) {
      return null;
    }
  }
  function maxObjectCounts(a = {}, b = {}) {
    const out = { ...a };
    Object.entries(b || {}).forEach(([key, value]) => {
      out[key] = Math.max(Number(out[key]) || 0, Number(value) || 0);
    });
    return out;
  }
  function mergeMemoryRecord(local = null, remote = null) {
    if (!local) return remote;
    if (!remote) return local;
    const localTime = new Date(local.lastSeenAt || 0).getTime(),
      remoteTime = new Date(remote.lastSeenAt || 0).getTime(),
      latest = remoteTime > localTime ? remote : local;
    return {
      ...local,
      ...latest,
      id: local.id || remote.id,
      label: latest.label || local.label || remote.label,
      normalizedLabel:
        latest.normalizedLabel ||
        local.normalizedLabel ||
        remote.normalizedLabel,
      aliases: [
        ...new Set([...(local.aliases || []), ...(remote.aliases || [])]),
      ].slice(0, 20),
      mealTypes: maxObjectCounts(local.mealTypes, remote.mealTypes),
      ingredients: maxObjectCounts(local.ingredients, remote.ingredients),
      occurrences: Math.max(
        Number(local.occurrences) || 0,
        Number(remote.occurrences) || 0,
      ),
      confidence: Math.max(
        Number(local.confidence) || 0,
        Number(remote.confidence) || 0,
      ),
      firstSeenAt:
        [local.firstSeenAt, remote.firstSeenAt].filter(Boolean).sort()[0] ||
        new Date().toISOString(),
      lastSeenAt:
        [local.lastSeenAt, remote.lastSeenAt]
          .filter(Boolean)
          .sort()
          .slice(-1)[0] || new Date().toISOString(),
      sourceMealIds: [
        ...new Set([
          ...(local.sourceMealIds || []),
          ...(remote.sourceMealIds || []),
        ]),
      ].slice(-50),
      isForgotten: Boolean(latest.isForgotten),
      metadata: { ...(local.metadata || {}), ...(remote.metadata || {}) },
    };
  }
  function cloudRowToMemory(row = {}) {
    return {
      id: row.id,
      label: row.label,
      normalizedLabel: row.normalized_label,
      aliases: row.aliases || [],
      mealTypes: row.meal_types || {},
      ingredients: row.ingredients || {},
      occurrences: Number(row.occurrences) || 0,
      confidence: Number(row.confidence) || 0,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      sourceMealIds: row.source_meal_ids || [],
      isForgotten: Boolean(row.is_forgotten),
      metadata: { ...(row.metadata || {}), cloudUpdatedAt: row.updated_at },
    };
  }
  function memoryToCloudRow(memory = {}) {
    return {
      id: memory.id,
      user_id: session.user.id,
      label: memory.label,
      normalized_label: memory.normalizedLabel,
      aliases: memory.aliases || [],
      meal_types: memory.mealTypes || {},
      ingredients: memory.ingredients || {},
      occurrences: Number(memory.occurrences) || 0,
      confidence: Number(memory.confidence) || 0,
      first_seen_at: memory.firstSeenAt,
      last_seen_at: memory.lastSeenAt,
      source_meal_ids: memory.sourceMealIds || [],
      is_forgotten: Boolean(memory.isForgotten),
      memory_version: Number(window.EnergieBrainModules?.memory?.version) || 1,
      metadata: memory.metadata || {},
      updated_at: new Date().toISOString(),
    };
  }
  function mergeMemoryStates(localState, remoteRows = []) {
    const base =
      localState && typeof localState === "object"
        ? localState
        : { version: 1, settings: {}, memories: [] };
    const merged = new Map();
    (base.memories || []).forEach((memory) =>
      merged.set(memory.id || memory.normalizedLabel, memory),
    );
    remoteRows.map(cloudRowToMemory).forEach((remote) => {
      let key = remote.id;
      let local = merged.get(key);
      if (!local) {
        const entry = [...merged.entries()].find(
          ([, memory]) =>
            memory.normalizedLabel &&
            memory.normalizedLabel === remote.normalizedLabel,
        );
        if (entry) {
          key = entry[0];
          local = entry[1];
        }
      }
      merged.set(key, mergeMemoryRecord(local, remote));
    });
    return {
      ...base,
      memories: [...merged.values()],
      updatedAt: new Date().toISOString(),
    };
  }
  async function syncMemoryCloud() {
    if (
      memorySyncBusy ||
      !client ||
      !session ||
      !navigator.onLine ||
      !window.Brain?.memory
    )
      return true;
    memorySyncBusy = true;
    try {
      const state = brainMemoryState();
      const rows = (state?.memories || []).map(memoryToCloudRow);
      if (!rows.length) return true;
      const { error } = await client
        .from(MEMORY_CLOUD_TABLE)
        .upsert(rows, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (error) {
      console.warn("Synchronisation de la mémoire alimentaire", error);
      return false;
    } finally {
      memorySyncBusy = false;
    }
  }
  function rebuildBrainMemoryFromJournal() {
    if (!window.Brain?.replaceMemoryState || !window.Brain?.learnMeals)
      return null;
    window.Brain.replaceMemoryState({
      version: 1,
      settings: {},
      memories: [],
      updatedAt: new Date().toISOString(),
    });
    const meals = allMealsFromDB(db).filter(
      (meal) => !String(meal.id || "").startsWith("demo-"),
    );
    if (meals.length) window.Brain.learnMeals(meals);
    return brainMemoryState();
  }
  async function replaceMemoryCloudFromJournal() {
    if (!client || !session || !navigator.onLine || !window.Brain?.memory)
      return true;
    try {
      const state = rebuildBrainMemoryFromJournal();
      const { error: deleteError } = await client
        .from(MEMORY_CLOUD_TABLE)
        .delete()
        .eq("user_id", session.user.id);
      if (deleteError) throw deleteError;
      const rows = (state?.memories || []).map(memoryToCloudRow);
      if (rows.length) {
        const { error: upsertError } = await client
          .from(MEMORY_CLOUD_TABLE)
          .upsert(rows, { onConflict: "id" });
        if (upsertError) throw upsertError;
      }
      return true;
    } catch (error) {
      console.warn("Réparation de la mémoire alimentaire", error);
      return false;
    }
  }
  async function pullMemoryCloud() {
    if (!client || !session || !navigator.onLine || !window.Brain?.memory)
      return true;
    // La mémoire est une donnée dérivée : le journal du compte est la seule source de vérité.
    // On la reconstruit afin qu'une ancienne démo ou un autre compte ne puisse jamais s'y mélanger.
    return replaceMemoryCloudFromJournal();
  }
  function scheduleMemoryCloudSync() {
    clearTimeout(memorySyncTimer);
    memorySyncTimer = setTimeout(() => {
      if (session && navigator.onLine) syncMemoryCloud();
    }, 700);
  }
  window.addEventListener("energie:memory-changed", scheduleMemoryCloudSync);

  function outbox() {
    try {
      return JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }
  function setOutbox(items) {
    try {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
    } catch (error) {
      if (!isStorageQuotaError(error)) throw error;
      freeLocalStorageForJournal();
      try {
        localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
      } catch (retryError) {
        syncState = "error";
        console.error("File de synchronisation locale impossible", retryError);
        updateSyncBadge();
        return false;
      }
    }
    updateSyncBadge();
    return true;
  }
  function enqueue(op) {
    if (db.settings.demoMode) return;
    const items = outbox();
    op = { ...op, _queuedAt: `${Date.now()}-${uid()}` };
    const key = `${op.kind}:${op.id || op.date}`;
    const idx = items.findIndex((x) => `${x.kind}:${x.id || x.date}` === key);
    if (idx >= 0) items[idx] = op;
    else items.push(op);
    if (!setOutbox(items)) return;
    syncState = "pending";
    updateSyncBadge();
    if (session && navigator.onLine) syncNow();
  }
  function updateSyncBadge() {
    const el = $("#syncBadge");
    if (!el) return;
    if (db.settings.demoMode) {
      el.textContent = "Mode démo";
      el.className = "sync-badge demo";
      return;
    }
    const pending = outbox().length;
    el.className = "sync-badge";
    if (!session) {
      el.textContent = navigator.onLine ? "Non connecté" : "Hors ligne";
      if (!navigator.onLine) el.classList.add("pending");
      return;
    }
    if (syncState === "error") {
      el.textContent = "Erreur synchro";
      el.classList.add("error");
    } else if (pending) {
      el.textContent = `${pending} à synchroniser`;
      el.classList.add("pending");
    } else {
      el.textContent = "Sauvegardé ☁️";
      el.classList.add("online");
    }
  }
  function setDayChanged(date) {
    const d = ensureDay(db, date);
    d.updatedAt = new Date().toISOString();
    saveLocal("jour");
    enqueue({ kind: "day", date });
  }
  function setMealChanged(meal) {
    saveLocal("repas");
    enqueue({ kind: "meal", id: meal.id, date: meal.date });
    scheduleFeelingChecks();
  }
  function setFavoriteChanged(f) {
    saveLocal("favori");
    enqueue({ kind: "favorite", id: f.id });
  }
  function deleteMealLocal(meal) {
    const d = ensureDay(db, meal.date);
    d.meals = d.meals.filter((x) => x.id !== meal.id);
    saveLocal("suppression-repas");
    enqueue({
      kind: "deleteMeal",
      id: meal.id,
      date: meal.date,
      photoPath: meal.photoPath,
    });
    scheduleFeelingChecks();
  }
  function deleteFavoriteLocal(f) {
    db.favorites = db.favorites.filter((x) => x.id !== f.id);
    saveLocal("suppression-favori");
    enqueue({ kind: "deleteFavorite", id: f.id });
  }

  async function uploadPhoto(meal) {
    if (
      !client ||
      !session ||
      !meal.photoLocal ||
      meal.photoLocal === meal.photoUrl
    )
      return meal;
    const blob = await (await fetch(meal.photoLocal)).blob();
    const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const path = `${session.user.id}/${meal.id}.${ext}`;
    const { error } = await client.storage
      .from("meal-photos")
      .upload(path, blob, {
        upsert: true,
        contentType: blob.type || "image/jpeg",
      });
    if (error) throw error;
    meal.photoPath = path;
    meal.photoLocal = null;
    return meal;
  }
  async function signedPhoto(path) {
    if (!path || !client) return null;
    const { data, error } = await client.storage
      .from("meal-photos")
      .createSignedUrl(path, 3600);
    return error ? null : data.signedUrl;
  }
  function syncOperationKey(op) {
    return `${op.kind}:${op.id || op.date}`;
  }
  function syncOperationRevision(op) {
    return op?._queuedAt || "legacy";
  }
  async function syncNow() {
    if (db.settings.demoMode || !client || !session || !navigator.onLine)
      return;
    if (syncBusy) {
      syncQueued = true;
      return;
    }
    syncBusy = true;
    try {
      await syncNowPass();
    } finally {
      syncBusy = false;
      if (syncQueued) {
        syncQueued = false;
        queueMicrotask(() => syncNow());
      }
    }
  }
  async function syncNowPass() {
    syncState = "syncing";
    updateSyncBadge();
    const operations = outbox(),
      failed = [];
    for (const op of operations) {
      try {
        if (op.kind === "day") {
          const d = ensureDay(db, op.date);
          const dayPayload = {
            user_id: session.user.id,
            log_date: op.date,
            sleep_hours: d.sleepHours,
            sleep_tags: d.sleepTags || [],
            sleep_comment: d.sleepComment || null,
            water: d.water,
            activities: (d.activities || []).map(activityToCloud),
            supplements: {
              taken: d.supplementsTaken || [],
              defaults: db.settings.supplements || [],
              defaultsUpdatedAt: db.settings.supplementsUpdatedAt || db.updatedAt,
            },
            updated_at: d.updatedAt,
          };
          let { error } = await client
            .from("daily_logs")
            .upsert(dayPayload, { onConflict: "user_id,log_date" });
          if (
            error &&
            /(sleep_tags|sleep_comment|supplements|schema cache|column)/i.test(
              error.message || "",
            )
          ) {
            delete dayPayload.sleep_tags;
            delete dayPayload.sleep_comment;
            delete dayPayload.supplements;
            ({ error } = await client
              .from("daily_logs")
              .upsert(dayPayload, { onConflict: "user_id,log_date" }));
          }
          if (error) throw error;
        } else if (op.kind === "meal") {
          const meal = ensureDay(db, op.date).meals.find((m) => m.id === op.id);
          if (!meal) continue;
          await uploadPhoto(meal);
          const payload = {
            id: meal.id,
            user_id: session.user.id,
            meal_date: meal.date,
            meal_time: meal.time,
            meal_type: meal.type,
            description: meal.description,
            // Colonne historique conservée pour les anciennes installations
            // Supabase qui exigent encore une valeur de 1 à 5. Cette valeur
            // technique n'est plus affichée ni utilisée dans les analyses.
            fatigue_before:
              Number(meal.fatigueBefore) >= 1 &&
              Number(meal.fatigueBefore) <= 5
                ? Number(meal.fatigueBefore)
                : 3,
            fatigue_after: meal.fatigueAfter,
            notes: meal.notes || null,
            photo_path: meal.photoPath || null,
            feeling:
              Object.keys(normalizeFeelingScores(meal.feelingsBefore)).length ||
              meal.feeling || meal.foodReview || meal.eatingReasons?.length || meal.eatingReasonOther
                ? {
                    ...(meal.feeling || {}),
                    beforeScores: normalizeFeelingScores(meal.feelingsBefore),
                    beforeQuality: meal.feelingsBeforeQuality || null,
                    foodReview: meal.foodReview || null,
                    eatingReasons: normalizeEatingReasons(meal.eatingReasons),
                    eatingReasonOther: meal.eatingReasonOther || "",
                  }
                : null,
            feeling_notified_at: meal.feelingNotifiedAt || null,
            nutrition: meal.nutrition || null,
            recommendation: meal.recommendation || null,
            created_at: meal.createdAt,
            updated_at: meal.updatedAt,
          };
          let { error } = await client.from("meals").upsert(payload);
          if (
            error &&
            /nutrition|recommendation|schema cache|column/i.test(
              error.message || "",
            )
          ) {
            delete payload.nutrition;
            delete payload.recommendation;
            ({ error } = await client.from("meals").upsert(payload));
          }
          if (error) throw error;
        } else if (op.kind === "favorite") {
          const f = db.favorites.find((x) => x.id === op.id);
          if (!f) continue;
          const { error } = await client
            .from("favorite_meals")
            .upsert({
              id: f.id,
              user_id: session.user.id,
              name: f.name,
              meal_type: f.type,
              description: f.description,
              notes: f.notes || null,
              usage_count: f.usageCount || 0,
              created_at: f.createdAt,
              updated_at: f.updatedAt,
            });
          if (error) throw error;
        } else if (op.kind === "deleteMeal") {
          const { error } = await client
            .from("meals")
            .delete()
            .eq("id", op.id)
            .eq("user_id", session.user.id);
          if (error) throw error;
          if (op.photoPath)
            await client.storage.from("meal-photos").remove([op.photoPath]);
        } else if (op.kind === "deleteFavorite") {
          const { error } = await client
            .from("favorite_meals")
            .delete()
            .eq("id", op.id)
            .eq("user_id", session.user.id);
          if (error) throw error;
        }
      } catch (e) {
        console.error("sync", e);
        failed.push(op);
      }
    }
    const failedRevisions = new Set(
        failed.map(
          (op) => `${syncOperationKey(op)}:${syncOperationRevision(op)}`,
        ),
      ),
      processed = new Map(
        operations.map((op) => [syncOperationKey(op), syncOperationRevision(op)]),
      );
    setOutbox(
      outbox().filter((current) => {
        const key = syncOperationKey(current),
          processedRevision = processed.get(key),
          currentRevision = syncOperationRevision(current);
        if (processedRevision == null || currentRevision !== processedRevision)
          return true;
        return failedRevisions.has(`${key}:${currentRevision}`);
      }),
    );
    const memoryOk = await syncMemoryCloud();
    const pending = outbox().length;
    syncState = failed.length || !memoryOk
      ? "error"
      : pending
        ? "pending"
        : "online";
    updateSyncBadge();
    if (!failed.length && !pending) await pullCloud(false);
  }
  async function pullCloud(show = true) {
    if (db.settings.demoMode || !client || !session || !navigator.onLine)
      return;
    if (show) {
      syncState = "syncing";
      updateSyncBadge();
    }
    const [dr, mr, fr] = await Promise.all([
      client
        .from("daily_logs")
        .select("*")
        .eq("user_id", session.user.id)
        .order("log_date"),
      client
        .from("meals")
        .select("*")
        .eq("user_id", session.user.id)
        .order("meal_date")
        .order("meal_time"),
      client
        .from("favorite_meals")
        .select("*")
        .eq("user_id", session.user.id)
        .order("usage_count", { ascending: false }),
    ]);
    if (dr.error || mr.error || fr.error) {
      console.error(dr.error || mr.error || fr.error);
      syncState = "error";
      updateSyncBadge();
      return;
    }
    // La configuration des suppléments voyage avec le journal quotidien.
    // Les anciennes versions n'avaient pas d'horodatage de configuration :
    // dans ce cas seulement, une dernière liste non vide peut réparer une
    // disparition locale accidentelle.
    const remoteSupplementCandidates = (dr.data || [])
      .filter((row) => Array.isArray(row.supplements?.defaults))
      .map((row) => ({
        values: normalizeSupplements(row.supplements.defaults),
        versioned: !!(
          row.supplements.defaultsUpdatedAt ||
          row.supplements.defaults_updated_at
        ),
        updatedAt:
          row.supplements.defaultsUpdatedAt ||
          row.supplements.defaults_updated_at ||
          row.updated_at ||
          `${row.log_date}T00:00:00.000Z`,
      }))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    let recoveredLegacySupplements = false;
    const localSupplements = normalizeSupplements(
        db.settings.supplements || [],
      ),
      localUpdatedAt = db.settings.supplementsUpdatedAt || "",
      hasVersionedRemote = remoteSupplementCandidates.some(
        (item) => item.versioned,
      ),
      remoteSupplementSettings =
        !localUpdatedAt && !localSupplements.length && !hasVersionedRemote
          ? remoteSupplementCandidates.find((item) => item.values.length) ||
            remoteSupplementCandidates[0]
          : remoteSupplementCandidates[0];
    if (remoteSupplementSettings) {
      if (!localUpdatedAt && localSupplements.length) {
        // Une liste locale héritée et non vide ne doit jamais être effacée
        // par une ancienne journée distante.
        db.settings.supplementsUpdatedAt = new Date().toISOString();
      } else if (
        !localUpdatedAt ||
        new Date(remoteSupplementSettings.updatedAt) >= new Date(localUpdatedAt)
      ) {
        db.settings.supplements = remoteSupplementSettings.values;
        recoveredLegacySupplements =
          !localUpdatedAt &&
          !localSupplements.length &&
          !hasVersionedRemote &&
          remoteSupplementSettings.values.length > 0;
        db.settings.supplementsUpdatedAt = recoveredLegacySupplements
          ? new Date().toISOString()
          : remoteSupplementSettings.updatedAt;
      }
    }
    for (const r of dr.data || []) {
      const d = ensureDay(db, r.log_date);
      const remoteIsNewer = !d.updatedAt || new Date(r.updated_at) >= new Date(d.updatedAt);
      if (remoteIsNewer) {
        d.sleepHours = r.sleep_hours;
        d.sleepTags = Array.isArray(r.sleep_tags) ? r.sleep_tags : [];
        d.sleepComment = r.sleep_comment || "";
        d.water = r.water || 0;
        d.activities = (r.activities || []).map(normalizeActivity);
        if (Array.isArray(r.supplements?.taken))
          d.supplementsTaken = normalizeSupplements(r.supplements.taken);
        d.updatedAt = r.updated_at;
      } else {
        // Un repas local peut rendre la journée artificiellement "plus récente"
        // que son journal quotidien. On récupère quand même les champs absents
        // au lieu de masquer sommeil, eau et activité déjà sauvegardés au nuage.
        if (d.sleepHours == null && r.sleep_hours != null) d.sleepHours = r.sleep_hours;
        if (!(d.sleepTags || []).length && Array.isArray(r.sleep_tags)) d.sleepTags = r.sleep_tags;
        if (!d.sleepComment && r.sleep_comment) d.sleepComment = r.sleep_comment;
        if (!(Number(d.water) > 0) && Number(r.water) > 0) d.water = Number(r.water);
        if (!(d.activities || []).length && Array.isArray(r.activities))
          d.activities = r.activities.map(normalizeActivity);
        if (!(d.supplementsTaken || []).length && Array.isArray(r.supplements?.taken))
          d.supplementsTaken = normalizeSupplements(r.supplements.taken);
      }
    }
    for (const r of mr.data || []) {
      const d = ensureDay(db, r.meal_date);
      const remote = normalMeal(
        {
          id: r.id,
          date: r.meal_date,
          time: (r.meal_time || "").slice(0, 5),
          type: r.meal_type,
          description: r.description,
          fatigueBefore: r.fatigue_before,
          fatigueAfter: r.fatigue_after,
          notes: r.notes,
          photoPath: r.photo_path,
          feeling: r.feeling || null,
          feelingNotifiedAt: r.feeling_notified_at || null,
          nutrition: r.nutrition || null,
          recommendation: r.recommendation || null,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        },
        r.meal_date,
      );
      const i = d.meals.findIndex((x) => x.id === remote.id);
      if (i < 0) d.meals.push(remote);
      else if (
        new Date(remote.updatedAt) >= new Date(d.meals[i].updatedAt || 0)
      )
        d.meals[i] = { ...d.meals[i], ...remote };
    }
    for (const r of fr.data || []) {
      const remote = normalFavorite({
        id: r.id,
        name: r.name,
        type: r.meal_type,
        description: r.description,
        notes: r.notes,
        usageCount: r.usage_count,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      });
      const i = db.favorites.findIndex((x) => x.id === remote.id);
      if (i < 0) db.favorites.push(remote);
      else if (
        new Date(remote.updatedAt) >= new Date(db.favorites[i].updatedAt || 0)
      )
        db.favorites[i] = remote;
    }
    saveLocal("retour-cloud");
    if (recoveredLegacySupplements) {
      const recoveryDay = ensureDay(db, todayKey());
      recoveryDay.updatedAt = db.settings.supplementsUpdatedAt;
      saveLocal("recuperation-supplements");
      enqueue({ kind: "day", date: todayKey() });
    }
    const memoryOk = await pullMemoryCloud();
    syncState = memoryOk ? "online" : "error";
    updateSyncBadge();
    render();
  }
  async function seedCloudFromLocal() {
    if (!session) return;
    const ops = [];
    Object.entries(db.days).forEach(([date, d]) => {
      ops.push({ kind: "day", date });
      d.meals.forEach((m) => ops.push({ kind: "meal", id: m.id, date }));
    });
    db.favorites.forEach((f) => ops.push({ kind: "favorite", id: f.id }));
    setOutbox(ops);
    await syncNow();
    await syncMemoryCloud();
  }

  function normalizeSnackText(value) {
    return String(value || "")
      .toLocaleLowerCase("fr-CA")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’']/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function snackIconForText(text) {
    const value = normalizeSnackText(text);
    const icons = [];
    const add = (regex, icon) => {
      if (regex.test(value)) icons.push(icon);
    };
    add(/\b(pomme|pommes|apple|apples)\b/, "🍎");
    add(/\b(kiwi|kiwis)\b/, "🥝");
    add(/\b(banane|bananes|banana|bananas)\b/, "🍌");
    add(
      /\b(orange|oranges|mandarine|mandarines|clementine|clementines)\b/,
      "🍊",
    );
    add(/\b(fraise|fraises|strawberry|strawberries)\b/, "🍓");
    add(/\b(raisin|raisins|grape|grapes)\b/, "🍇");
    add(/\b(poire|poires|pear|pears)\b/, "🍐");
    add(
      /\b(peche|peches|peach|peaches|melon|melons|mangue|mango|ananas|pineapple|pastèque|pasteque)\b/,
      "🍑",
    );
    add(
      /\b(fromage|fromages|cheese|cheeses|feta|mozzarella|cheddar|gruyere|gouda|parmesan)\b/,
      "🧀",
    );
    add(/\b(chips|croustilles|croustille|tortilla|nachos|crisps)\b/, "🍟");
    add(
      /\b(barre|barres|barre tendre|barres tendres|granola|protein bar|cereal bar|snack bar)\b/,
      "🍫",
    );
    add(/\b(yogourt|yogourts|yaourt|yaourts|yogurt|yogurts)\b/, "🥣");
    add(
      /\b(gateau|gateaux|cake|cakes|brownie|brownies|muffin|muffins|cookie|cookies|biscuit|biscuits|donut|donuts|beigne|beignes|pain d epices|pain depices|tarte|tartes|pie|pies)\b/,
      "🍰",
    );
    add(/\b(hummus|houmous|dip|tahini)\b/, "🫙");
    add(/\b(popcorn|pop corn|maïs éclaté|mais eclate)\b/, "🍿");
    add(
      /\b(pita|pain pita|wrap|tortilla|tortillas|naan|lavash|burrito|quesadilla)\b/,
      "🌯",
    );
    add(/\b(soupe|soupes|soup|soups)\b/, "🥣");
    add(
      /\b(salami|saucisson|pepperoni|prosciutto|jambon|ham|charcuterie|rillettes|rillette|bresaola|coppa)\b/,
      "🥩",
    );
    add(/\b(cafe|café|coffee|espresso|latte|cappuccino|thé|the|tea)\b/, "☕");
    add(
      /\b(pancake|pancakes|crepe|crepes|crêpe|crêpes|waffle|waffles|blinis)\b/,
      "🥞",
    );
    add(
      /\b(taco|tacos|burrito|burritos|quesadilla|quesadillas|enchilada|enchiladas)\b/,
      "🌯",
    );
    add(/\b(sushi|sashimi|maki|nori|onigiri|ramen|udon|pho)\b/, "🍣");
    add(
      /\b(noix|noisette|amande|amandes|cacahuete|cacahuetes|peanut|peanuts|almond|almonds)\b/,
      "🥜",
    );
    add(
      /\b(carotte|carottes|carrot|carrots|concombre|concombres|cucumber|cucumbers|celeri|celeris|celery|brocoli|brocolis|broccoli|tomate|tomates|tomato|tomatoes|salade|salads|legume|legumes|vegetable|vegetables|poivron|poivrons|pepper|peppers|radis|radish|radishes|haricot|haricots|beans|bean)\b/,
      "🥕",
    );
    add(/\b(legume|legumes|vegetable|vegetables)\b/, "🥗");
    return icons.length ? icons.join("") : "🧺";
  }
  function mealIcon(t, description = "") {
    if (t === "Collation") return snackIconForText(description);
    return (
      { Déjeuner: "🍳", Dîner: "🥗", Souper: "🍲", Boisson: "🥤" }[t] || "🍽️"
    );
  }
  function formatDate(k) {
    return new Intl.DateTimeFormat("fr-CA", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(`${k}T12:00:00`));
  }
  function formatCalendarDate(k) {
    return new Intl.DateTimeFormat("fr-CA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${k}T12:00:00`));
  }
  function average(arr) {
    const x = arr
      .filter((n) => Number.isFinite(Number(n)) && Number(n) > 0)
      .map(Number);
    return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null;
  }
  function allMeals() {
    return Object.values(db.days).flatMap((d) => d.meals);
  }
  function nutritionText(n) {
    if (!n) return "";
    const pieces = [];
    if (n.calories != null) pieces.push(`${Math.round(n.calories)} kcal`);
    if (n.protein != null)
      pieces.push(
        `${Number(n.protein).toFixed(n.protein % 1 ? 1 : 0)} g prot.`,
      );
    if (n.carbs != null)
      pieces.push(`${Number(n.carbs).toFixed(n.carbs % 1 ? 1 : 0)} g gluc.`);
    if (n.fat != null)
      pieces.push(`${Number(n.fat).toFixed(n.fat % 1 ? 1 : 0)} g lip.`);
    if (n.fiber != null)
      pieces.push(`${Number(n.fiber).toFixed(n.fiber % 1 ? 1 : 0)} g fibres`);
    if (n.sugars != null)
      pieces.push(`${Number(n.sugars).toFixed(n.sugars % 1 ? 1 : 0)} g sucres`);
    if (n.sodium != null) pieces.push(`${Math.round(n.sodium)} mg sodium`);
    return pieces.join(" · ");
  }
  const FOOD_MACROS_SOURCE = Array.isArray(window.EnergieBrain?.legacyFoods)
    ? window.EnergieBrain.legacyFoods
    : Array.isArray(window.ENERGIE_FOODS)
      ? window.ENERGIE_FOODS
      : [];
  const FOOD_MACROS = [
    ...FOOD_MACROS_SOURCE,
    {
      keys: ["prosciutto", "proscuitto", "jambon prosciutto"],
      calories: 120,
      protein: 18,
      carbs: 0.5,
      fat: 5,
      portion: "60 g",
      tags: ["protéine", "charcuterie"],
    },
  ];
  const FOOD_NUTRIENT_OVERRIDES = {
    thon: { fiber: 0, sugars: 0, sodium: 320 },
    "thon en conserve": { fiber: 0, sugars: 0, sodium: 320 },
    concombre: { fiber: 0.5, sugars: 1.7, sodium: 2 },
    tomate: { fiber: 1.5, sugars: 3.2, sodium: 8 },
    feta: { fiber: 0, sugars: 1.2, sodium: 430 },
    "huile d olive": { fiber: 0, sugars: 0, sodium: 0 },
    mayonnaise: { fiber: 0, sugars: 0.1, sodium: 90 },
    pomme: { fiber: 4.4, sugars: 19, sodium: 2 },
    banane: { fiber: 3.1, sugars: 14, sodium: 1 },
    orange: { fiber: 3.1, sugars: 12, sodium: 0 },
    fraise: { fiber: 3, sugars: 7, sodium: 2 },
    bleuet: { fiber: 3.6, sugars: 15, sodium: 2 },
    framboise: { fiber: 8, sugars: 5.5, sodium: 1 },
    avocat: { fiber: 10, sugars: 1, sodium: 10 },
    avoine: { fiber: 4, sugars: 1, sodium: 2 },
    gruau: { fiber: 4, sugars: 1, sodium: 2 },
    pain: { fiber: 1.2, sugars: 1.5, sodium: 170 },
    riz: { fiber: 0.6, sugars: 0.1, sodium: 2 },
    "riz brun": { fiber: 3.5, sugars: 0.7, sodium: 10 },
    pâtes: { fiber: 2.5, sugars: 1.2, sodium: 1 },
    quinoa: { fiber: 5.2, sugars: 1.6, sodium: 13 },
    oeuf: { fiber: 0, sugars: 0.4, sodium: 70 },
    œuf: { fiber: 0, sugars: 0.4, sodium: 70 },
    poulet: { fiber: 0, sugars: 0, sodium: 120 },
    saumon: { fiber: 0, sugars: 0, sodium: 80 },
    tofu: { fiber: 2, sugars: 1, sodium: 15 },
    lentille: { fiber: 15.6, sugars: 3.6, sodium: 4 },
    "pois chiche": { fiber: 12.5, sugars: 8, sodium: 20 },
    yogourt: { fiber: 0, sugars: 12, sodium: 95 },
    yaourt: { fiber: 0, sugars: 12, sodium: 95 },
    "yogourt grec": { fiber: 0, sugars: 6, sodium: 65 },
    lait: { fiber: 0, sugars: 12, sodium: 105 },
    fromage: { fiber: 0, sugars: 0.2, sodium: 180 },
    brocoli: { fiber: 5, sugars: 2.2, sodium: 50 },
    carotte: { fiber: 3.6, sugars: 6, sodium: 88 },
    épinard: { fiber: 4.3, sugars: 0.7, sodium: 126 },
    poivron: { fiber: 2.5, sugars: 5, sodium: 5 },
    salade: { fiber: 2, sugars: 3, sodium: 60 },
    "beurre d arachide": { fiber: 2, sugars: 3, sodium: 150 },
    amande: { fiber: 3.5, sugars: 1.2, sodium: 0 },
    noix: { fiber: 2, sugars: 1, sodium: 1 },
    chia: { fiber: 10, sugars: 0, sodium: 5 },
    pizza: { fiber: 4, sugars: 7, sodium: 1200 },
    hamburger: { fiber: 2, sugars: 7, sodium: 950 },
    poutine: { fiber: 7, sugars: 3, sodium: 1600 },
    "soupe aux légumes": { fiber: 5, sugars: 8, sodium: 700 },
    "salade de pâtes": { fiber: 4, sugars: 5, sodium: 550 },
    prosciutto: { fiber: 0, sugars: 0, sodium: 1050 },
  };
  function foodNutrients(food) {
    const key = normalizeFoodText(food?.keys?.[0] || "");
    const extra = FOOD_NUTRIENT_OVERRIDES[key] || {};
    const categories = new Set(
      window.ENERGIE_FOOD_CATEGORIES?.categoryIdsForText?.(
        (food?.keys || []).join(" "),
      ) || [],
    );
    let inferredFiber = 0;
    if (categories.has("legumes")) inferredFiber = 8;
    else if (categories.has("whole_grains")) inferredFiber = 4;
    else if (categories.has("nuts") || categories.has("seeds"))
      inferredFiber = 3;
    else if (categories.has("fruits")) inferredFiber = 3;
    else if (categories.has("vegetables")) inferredFiber = 2.5;
    else if (categories.has("refined_grains")) inferredFiber = 1;
    return {
      ...food,
      fiber: extra.fiber ?? inferredFiber,
      ...extra,
    };
  }

  function normalizeFoodText(value) {
    return String(value || "")
      .toLocaleLowerCase("fr-CA")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’']/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function comparableFoodText(value) {
    return normalizeFoodText(value)
      .split(" ")
      .map((word) => (word.length > 4 ? word.replace(/[sx]$/i, "") : word))
      .join(" ");
  }
  const FOOD_CANDIDATES = FOOD_MACROS.flatMap((food, foodIndex) =>
    (food.keys || [])
      .map((key) => ({
        food,
        foodIndex,
        key: normalizeFoodText(key),
        compareKey: comparableFoodText(key),
      }))
      .filter((item) => item.key),
  ).sort((a, b) => b.compareKey.length - a.compareKey.length);
  function foodMatchForSegment(segment) {
    const clean = normalizeFoodText(segment),
      comparable = comparableFoodText(segment);
    if (!clean) return null;
    const padded = ` ${comparable} `;
    let best = null;
    for (const candidate of FOOD_CANDIDATES) {
      const key = candidate.compareKey;
      if (!padded.includes(` ${key} `)) continue;
      const keyWords = key.split(" ").length,
        cleanWords = comparable.split(" ").length;
      const exact = comparable === key ? 10000 : 0;
      const coverage = (keyWords / Math.max(cleanWords, 1)) * 1000;
      const score = exact + coverage + keyWords * 100 + key.length;
      if (!best || score > best.score) best = { ...candidate, score };
    }
    return best?.food || null;
  }
  function splitMealIngredients(text) {
    const explicit = String(text || "")
      .split(/\s*(?:\+|,|;|\n|\r|\u2022|\|)\s*/)
      .map((x) => x.trim())
      .filter(Boolean);
    const initial = explicit.length
      ? explicit
      : [String(text || "").trim()].filter(Boolean);
    const output = [];
    for (const segment of initial) {
      const whole = foodMatchForSegment(segment);
      const connectorParts = segment
        .split(/\s+(?:et|and|avec|with)\s+/i)
        .map((x) => x.trim())
        .filter(Boolean);
      if (connectorParts.length > 1) {
        const partMatches = connectorParts.map(foodMatchForSegment);
        if (partMatches.every(Boolean)) {
          output.push(...connectorParts);
          continue;
        }
      }
      if (whole) output.push(segment);
    }
    return output;
  }
  function mealCompositionAnalysis(text) {
    const knownDish = window.ENERGIE_DISH_KNOWLEDGE?.findDish?.(text),
      hasExplicitIngredientList = /[+,;\n\r|]|\b(avec|with)\b/i.test(String(text || "")),
      categoryIds = new Set(
        knownDish && !hasExplicitIngredientList
          ? []
          : window.ENERGIE_FOOD_CATEGORIES?.categoryIdsForText?.(text) || [],
      );
    // Réconcilie automatiquement l'ancien catalogue de macros avec la
    // taxonomie d'observation. Ainsi, un aliment connu comme « céleri » ne
    // devient pas invisible simplement parce qu'il manque dans une autre liste.
    (knownDish && !hasExplicitIngredientList ? [] : splitMealIngredients(text)).forEach((segment) => {
      const food = foodMatchForSegment(segment);
      if (!food) return;
      const tags = (food.tags || []).map(normalizeFoodText),
        nutrients = foodNutrients(food),
        foodText = normalizeFoodText((food.keys || []).join(" "));
      if (tags.some((tag) => ["legume", "vegetable"].includes(tag))) {
        categoryIds.add("vegetables");
        categoryIds.add("direct_fiber");
      }
      if (tags.some((tag) => ["fruit", "fruits"].includes(tag))) {
        categoryIds.add("fruits");
        categoryIds.add("direct_fiber");
      }
      if (tags.some((tag) => ["proteine", "protein"].includes(tag)))
        categoryIds.add("direct_protein");
      const isPlantMilk = /\b(lait de soya|soy milk|lait de soja|lait d amande|almond milk|lait d avoine|oat milk|lait de coco|coconut milk)\b/.test(foodText);
      if (/\b(lait de soya|lait de soja|soy milk)\b/.test(foodText)) {
        categoryIds.add("soy");
        categoryIds.add("direct_protein");
      }
      if (/\b(lait d amande|almond milk)\b/.test(foodText))
        categoryIds.add("nuts");
      if (tags.some((tag) => ["produit laitier", "dairy"].includes(tag)) && !isPlantMilk)
        categoryIds.add("dairy");
      if ((Number(nutrients?.fiber) || 0) >= 1)
        categoryIds.add("direct_fiber");
      if ((Number(nutrients?.carbs) || 0) >= 10)
        categoryIds.add("direct_carbs");
      else if ((Number(nutrients?.carbs) || 0) > 0)
        categoryIds.add("direct_carbs_low");
    });
    return (
      window.ENERGIE_DISH_KNOWLEDGE?.analyze?.(text, [...categoryIds]) || null
    );
  }
  function mealCompositionUi() {
    const packs = {
      "fr-CA": {
        labels: { protein: "Protéines", fiber: "Fibres", carbs: "Glucides", carbs_low: "Peu de glucides", dairy: "Laitiers", soy: "Soya", gluten: "Gluten", eggs: "Œufs", nuts: "Noix" },
        status: { confirmed: "confirmé", probable: "probable", possible: "possible", missing: "non détecté" },
        hint: "Plus ta description est précise — ingrédients, sauces et accompagnements — plus les observations d’Énergie seront pertinentes.", recognized: "Éléments reconnus", written: "Selon les ingrédients écrits", usual: "Composition habituelle — la recette peut varier", recognizedSuffix: "reconnu", usually: "Habituellement", kept: "Description conservée telle quelle", complete: "Préciser le repas", continue: "Continuer ainsi",
      },
      "fr-FR": {
        labels: { protein: "Protéines", fiber: "Fibres", carbs: "Glucides", carbs_low: "Peu de glucides", dairy: "Laitiers", soy: "Soja", gluten: "Gluten", eggs: "Œufs", nuts: "Noix" },
        status: { confirmed: "confirmé", probable: "probable", possible: "possible", missing: "non détecté" },
        hint: "Plus ta description est précise — ingrédients, sauces et accompagnements — plus les observations d’Énergie seront pertinentes.", recognized: "Éléments reconnus", written: "Selon les ingrédients indiqués", usual: "Composition habituelle — la recette peut varier", recognizedSuffix: "reconnu", usually: "Habituellement", kept: "Description conservée telle quelle", complete: "Préciser le repas", continue: "Continuer ainsi",
      },
      en: {
        labels: { protein: "Protein", fiber: "Fiber", carbs: "Carbs", carbs_low: "Low carbs", dairy: "Dairy", soy: "Soy", gluten: "Gluten", eggs: "Eggs", nuts: "Nuts" },
        status: { confirmed: "confirmed", probable: "probable", possible: "possible", missing: "not detected" },
        hint: "The more precise your description — ingredients, sauces and sides — the more relevant Énergie’s observations will be.", recognized: "Recognized elements", written: "Based on the ingredients entered", usual: "Typical composition — recipes may vary", recognizedSuffix: "recognized", usually: "Usually", kept: "Description kept as entered", complete: "Add meal details", continue: "Continue as is",
      },
    };
    return packs[window.ENERGIE_LOCALE || "fr-CA"] || packs["fr-CA"];
  }
  function applyMealCompositionLocale() {
    const ui = mealCompositionUi(), hint = $("#mealPrecisionHintText"), complete = $("#completeMealDescription"), keep = $("#keepMealDescription");
    if (hint) hint.textContent = ui.hint;
    if (complete) complete.textContent = ui.complete;
    if (keep) keep.textContent = ui.continue;
  }
  function compositionTraitChip(trait, certainty) {
    const ui = mealCompositionUi(),
      fallbackLabels = window.ENERGIE_DISH_KNOWLEDGE?.labels || {},
      label = ui.labels[trait] || fallbackLabels[trait] || trait.replaceAll("_", " "),
      icons = {
        protein: "🥩",
        fiber: "🌿",
        carbs: "🍞",
        carbs_low: "🍞",
        dairy: "🥛",
        soy: "🫘",
        gluten: "🌾",
        eggs: "🥚",
        nuts: "🥜",
      },
      certaintyLabel = ui.status[certainty],
      statusIcon = certainty === "confirmed" ? "✓" : certainty === "missing" ? "×" : "?",
      compactLabel = label;
    return `<span class="composition-trait composition-${certainty}" title="${esc(label)} · ${esc(certaintyLabel)}" aria-label="${esc(label)}, ${esc(certaintyLabel)}"><span class="composition-trait-top" aria-hidden="true"><strong>${icons[trait] || "•"}</strong><small>${statusIcon}</small></span><em aria-hidden="true">${esc(compactLabel)}</em></span>`;
  }
  function updateMealCompositionReview() {
    const ui = mealCompositionUi(), section = $("#mealCompositionReview"),
      summary = $("#mealCompositionSummary"),
      actions = $("#mealCompositionActions"),
      description = $("#mealDescription")?.value.trim() || "";
    if (!section || !summary || !actions) return;
    if (description.length < 3) {
      section.hidden = true;
      return;
    }
    if (mealFoodReview?.description !== description)
      mealFoodReview = { description, acknowledgedGaps: false };
    const analysis = mealCompositionAnalysis(description);
    if (!analysis) {
      section.hidden = true;
      return;
    }
    const lowCarbs = analysis.status("carbs") === "unknown" && analysis.status("carbs_low") !== "unknown"
      ? compositionTraitChip("carbs_low", analysis.status("carbs_low"))
      : "";
    const missing = ["protein", "fiber", "carbs"].filter(
      (trait) => analysis.status(trait) === "unknown",
    ).filter((trait) => trait !== "carbs" || !lowCarbs);
    const coreTraits = new Set(["protein", "fiber", "carbs"]),
      visibleTraits = ["protein", "fiber", "carbs", "dairy", "soy", "gluten", "eggs", "nuts"],
      chips = visibleTraits
        .map((trait) => {
          const certainty = analysis.status(trait);
          if (trait === "carbs" && certainty === "unknown" && lowCarbs)
            return lowCarbs;
          if (certainty === "unknown")
            return coreTraits.has(trait)
              ? compositionTraitChip(trait, "missing")
              : "";
          return compositionTraitChip(trait, certainty);
        })
        .filter(Boolean)
        .join("");
    const title = analysis.dish
      ? `<strong>🍽️ ${esc(analysis.dish.name)} ${esc(ui.recognizedSuffix)}</strong><small>${esc(ui.usual)}</small>`
      : `<strong>🔎 ${esc(ui.recognized)}</strong><small>${esc(ui.written)}</small>`;
    const ingredients = analysis.dish?.ingredients?.length
      ? `<p class="composition-basis">${esc(ui.usually)} : ${analysis.dish.ingredients.map(esc).join(", ")}.</p>`
      : "";
    const acknowledged = mealFoodReview?.acknowledgedGaps && missing.length;
    summary.innerHTML = `<div class="composition-heading">${title}</div>${chips ? `<div class="composition-traits">${chips}</div><div class="composition-legend"><span class="is-confirmed"><b>✓</b> ${esc(ui.status.confirmed)}</span><span class="is-probable"><b>?</b> ${esc(ui.status.probable)}</span><span class="is-missing"><b>×</b> ${esc(ui.status.missing)}</span></div>` : ""}${ingredients}${acknowledged ? `<p class="composition-kept">✓ ${esc(ui.kept)}</p>` : ""}`;
    actions.hidden = !missing.length || !!acknowledged;
    section.hidden = false;
  }
  function estimateNutritionFromText(text) {
    const recognizedDish = mealCompositionAnalysis(text)?.dish;
    if (recognizedDish?.nutrition && !/[+,;\n\r|]/.test(String(text || "")))
      return normalNutrition({
        ...recognizedDish.nutrition,
        source: "energie-dish-knowledge",
        confidence: "low",
        basis: `${recognizedDish.name} · recette habituelle`,
        estimated: true,
      });
    const segments = splitMealIngredients(text);
    if (!segments.length) {
      if (!recognizedDish?.nutrition) return null;
      return normalNutrition({
        ...recognizedDish.nutrition,
        source: "energie-dish-knowledge",
        confidence: "low",
        basis: `${recognizedDish.name} · recette habituelle`,
        estimated: true,
      });
    }
    const matched = segments
      .map((segment) => ({ segment, food: foodMatchForSegment(segment) }))
      .filter((x) => x.food);
    if (!matched.length) return null;
    const enriched = matched.map((x) => ({
      ...x,
      food: foodNutrients(x.food),
    }));
    const sum = (k) =>
      enriched.every((x) => x.food[k] != null)
        ? Math.round(
            enriched.reduce((a, x) => a + (Number(x.food[k]) || 0), 0) * 10,
          ) / 10
        : null;
    const total = {
      calories: sum("calories"),
      protein: sum("protein"),
      carbs: sum("carbs"),
      fat: sum("fat"),
      fiber: sum("fiber"),
      sugars: sum("sugars"),
      sodium: sum("sodium"),
    };
    const portions = [
      ...new Set(enriched.map((x) => x.food.portion).filter(Boolean)),
    ];
    const basis =
      matched.length === 1
        ? portions[0] || "portion courante"
        : `${matched.length} ingrédients estimés`;
    return normalNutrition({
      ...total,
      source: "energie-foods",
      confidence: matched.length >= 2 ? "medium" : "low",
      basis,
      estimated: true,
    });
  }
  function mergeNutrition(a, b) {
    a = normalNutrition(a);
    b = normalNutrition(b);
    if (!a) return b;
    if (!b) return a;
    const add = (k) =>
      a[k] != null && b[k] != null ? a[k] + b[k] : (a[k] ?? b[k] ?? null);
    return normalNutrition({
      calories: add("calories"),
      protein: add("protein"),
      carbs: add("carbs"),
      fat: add("fat"),
      fiber: add("fiber"),
      sugars: add("sugars"),
      sodium: add("sodium"),
      source: a.source === b.source ? a.source : "mixed",
      confidence:
        a.confidence === "low" || b.confidence === "low" ? "low" : "medium",
      basis: "éléments additionnés",
      estimated: a.estimated || b.estimated,
    });
  }
  function nutritionFromInputs() {
    const get = (id) => {
      const value = $(id)?.value;
      if (value === "" || value == null) return null;
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
    return normalNutrition({
      calories: get("#nutritionCalories"),
      protein: get("#nutritionProtein"),
      carbs: get("#nutritionCarbs"),
      fat: get("#nutritionFat"),
      fiber: get("#nutritionFiber"),
      sugars: get("#nutritionSugars"),
      sodium: get("#nutritionSodium"),
      source: $("#mealNutritionSection")?.dataset.source || "manual",
      confidence: $("#mealNutritionSection")?.dataset.confidence || "low",
      basis: $("#mealNutritionSection")?.dataset.basis || "portion courante",
      estimated: $("#mealNutritionSection")?.dataset.estimated !== "false",
    });
  }
  function fillNutritionInputs(n, note = "") {
    n = normalNutrition(n);
    [
      ["#nutritionCalories", "calories"],
      ["#nutritionProtein", "protein"],
      ["#nutritionCarbs", "carbs"],
      ["#nutritionFat", "fat"],
      ["#nutritionFiber", "fiber"],
      ["#nutritionSugars", "sugars"],
      ["#nutritionSodium", "sodium"],
    ].forEach(([id, key]) => {
      $(id).value = n?.[key] ?? "";
    });
    const section = $("#mealNutritionSection");
    if (section) {
      section.dataset.source = n?.source || "manual";
      section.dataset.confidence = n?.confidence || "low";
      section.dataset.basis = n?.basis || "portion courante";
      section.dataset.estimated = String(n?.estimated !== false);
    }
    $("#nutritionEstimateNote").textContent =
      note ||
      (n?.source === "barcode"
        ? `Valeurs ${n.basis || "du produit"} provenant de l’étiquette Open Food Facts. Vérifie-les au besoin.`
        : "Estimation approximative basée sur une portion courante. Les recettes et portions réelles peuvent varier.");
  }
  function estimateCurrentMealNutrition() {
    const n = estimateNutritionFromText($("#mealDescription").value);
    if (!n) {
      fillNutritionInputs(
        null,
        "Aucune estimation fiable trouvée. Tu peux entrer ou modifier les valeurs manuellement.",
      );
      return;
    }
    fillNutritionInputs(n);
    const optionalDetails = $("#mealOptionalDetails");
    if (optionalDetails && nutritionVisibleToViewer()) optionalDetails.open = true;
    mealNutritionManuallyEdited = false;
  }
  function scheduleAutomaticNutritionPreview() {
    clearTimeout(mealNutritionPreviewTimer);
    updateMealCompositionReview();
    if (
      db.settings.autoNutritionEstimates === false ||
      mealNutritionManuallyEdited
    )
      return;
    mealNutritionPreviewTimer = setTimeout(() => {
      const description = $("#mealDescription")?.value.trim();
      if (!description) {
        fillNutritionInputs(null, "Décris le repas pour obtenir une estimation modifiable.");
        return;
      }
      const nutrition = estimateNutritionFromText(description);
      if (nutrition) {
        fillNutritionInputs(nutrition);
        const optionalDetails = $("#mealOptionalDetails");
        if (optionalDetails && nutritionVisibleToViewer()) optionalDetails.open = true;
      }
      else
        fillNutritionInputs(
          null,
          "Aucune estimation fiable trouvée. Tu peux entrer les valeurs manuellement.",
        );
    }, 450);
  }

  // --- V3.0.3 : recommandations adaptées au prochain repas --------------------
  const RECOMMENDATION_HISTORY_KEY = "energieMealRecommendationsV303";
  const RECOMMENDATION_WORDS = {
    protein: [
      "oeuf",
      "œuf",
      "poulet",
      "dinde",
      "poisson",
      "saumon",
      "thon",
      "boeuf",
      "bœuf",
      "porc",
      "prosciutto",
      "proscuitto",
      "tofu",
      "tempeh",
      "lentille",
      "pois chiche",
      "haricot",
      "légumineuse",
      "yogourt grec",
      "yaourt grec",
      "fromage cottage",
      "cottage",
      "protéine",
      "protein",
      "noix",
      "amande",
      "beurre d'arachide",
      "beurre de pinotte",
    ],
    vegetables: [
      "brocoli",
      "salade",
      "légume",
      "legume",
      "carotte",
      "concombre",
      "tomate",
      "poivron",
      "épinard",
      "epinard",
      "chou",
      "courgette",
      "asperge",
      "champignon",
      "avocat",
      "aubergine",
      "céleri",
      "celeri",
      "haricot vert",
      "betterave",
    ],
    fruit: [
      "fruit",
      "pomme",
      "banane",
      "orange",
      "fraise",
      "framboise",
      "bleuet",
      "mangue",
      "poire",
      "kiwi",
      "raisin",
      "ananas",
      "pêche",
      "peche",
      "melon",
    ],
    fiber: [
      "avoine",
      "gruau",
      "pain entier",
      "blé entier",
      "ble entier",
      "multigrain",
      "riz brun",
      "quinoa",
      "lentille",
      "pois chiche",
      "haricot",
      "légumineuse",
      "legumineuse",
      "pomme",
      "poire",
      "framboise",
      "amande",
      "noix",
      "graine",
      "chia",
      "lin",
    ],
    sugary: [
      "beigne",
      "donut",
      "muffin",
      "croissant",
      "biscuit",
      "gâteau",
      "gateau",
      "bonbon",
      "chocolat",
      "céréale sucrée",
      "cereale sucree",
      "boisson gazeuse",
      "liqueur",
      "cola",
      "jus sucré",
      "jus sucre",
      "frappuccino",
      "sirop",
    ],
    refined: [
      "pain blanc",
      "toast",
      "rôtie",
      "rotie",
      "bagel",
      "croissant",
      "beigne",
      "donut",
      "frites",
      "chips",
      "croustille",
      "poutine",
    ],
    coffee: ["café", "cafe", "espresso", "latte", "cappuccino", "americano"],
  };
  function recommendationNormalize(value) {
    return String(value || "")
      .toLocaleLowerCase("fr-CA")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }
  function recommendationHas(text, words) {
    const clean = recommendationNormalize(text);
    return words.some((word) => clean.includes(recommendationNormalize(word)));
  }
  function recommendationHits(text, words) {
    const clean = recommendationNormalize(text);
    return words.reduce(
      (n, word) => n + (clean.includes(recommendationNormalize(word)) ? 1 : 0),
      0,
    );
  }
  function nutritionForRecommendation(meal) {
    return (
      normalNutrition(meal.nutrition) ||
      estimateNutritionFromText(meal.description) ||
      null
    );
  }
  function recommendationHistory() {
    try {
      const value = JSON.parse(
        localStorage.getItem(RECOMMENDATION_HISTORY_KEY) || "{}",
      );
      return value && typeof value === "object" ? value : {};
    } catch (_) {
      return {};
    }
  }
  function recommendationWasShown(date, category) {
    return (recommendationHistory()[date] || []).includes(category);
  }
  function rememberRecommendation(date, category) {
    const history = recommendationHistory();
    history[date] = [...new Set([...(history[date] || []), category])];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const cutoffKey = cutoff.toLocaleDateString("en-CA");
    Object.keys(history)
      .filter((key) => key < cutoffKey)
      .forEach((key) => delete history[key]);
    localStorage.setItem(RECOMMENDATION_HISTORY_KEY, JSON.stringify(history));
  }
  function recommendationMealProfile(meal) {
    const text = meal.description || "";
    const nutrition = nutritionForRecommendation(meal);
    const tags = foodTagsInText(text);
    const tagSet = [...tags].map(normalizeFoodText);
    const hasTag = (...wanted) =>
      wanted.some((tag) => tagSet.includes(normalizeFoodText(tag)));
    const normalizedText = recommendationNormalize(text);
    const categoryIds = new Set(
      window.ENERGIE_FOOD_CATEGORIES?.categoryIdsForText?.(text) || [],
    );
    const composition = mealCompositionAnalysis(text);
    const compositionHas = (trait) =>
      ["confirmed", "probable"].includes(composition?.status?.(trait));
    const hasCategory = (...wanted) =>
      wanted.some((category) => categoryIds.has(category));
    const hasBeefProtein =
      /(boeuf|bœuf|viande hach|steak|hamburger|bifteck|sausage|saucisse)/i.test(
        normalizedText,
      );
    const flags = {
      protein:
        compositionHas("protein") ||
        hasCategory(
          "high_protein",
          "plant_protein",
          "eggs",
          "poultry",
          "red_meat",
          "fish",
          "seafood",
          "legumes",
        ) ||
        hasTag("proteine", "protein") ||
        recommendationHas(text, RECOMMENDATION_WORDS.protein) ||
        (Number(nutrition?.protein) || 0) >= 12 ||
        hasBeefProtein,
      vegetables:
        compositionHas("vegetables") ||
        hasCategory("vegetables") ||
        hasTag("legume", "legumes", "vegetable", "vegetables") ||
        recommendationHas(text, RECOMMENDATION_WORDS.vegetables) ||
        /\b(legumes?|vegetables?|brocolis?|concombres?|tomates?|celeris?|carottes?|poivrons?|epinards?|courgettes?|choux|asperges?|champignons?|avocats?|aubergines?|betteraves?|haricots? verts?)\b/i.test(
          normalizedText,
        ),
      fruit:
        hasCategory("fruits") ||
        hasTag("fruit") ||
        recommendationHas(text, RECOMMENDATION_WORDS.fruit),
      fiber:
        compositionHas("fiber") ||
        hasCategory(
          "fruits",
          "vegetables",
          "legumes",
          "whole_grains",
          "nuts",
          "seeds",
          "high_fiber",
        ) ||
        hasTag(
          "fibre",
          "fiber",
          "grain",
          "grains",
          "cereal",
          "cereales",
          "cereale",
        ) || recommendationHas(text, RECOMMENDATION_WORDS.fiber),
      sugary:
        hasTag("sucre", "sugar", "sucree", "sucrée", "sugary") ||
        recommendationHas(text, RECOMMENDATION_WORDS.sugary),
      refined: recommendationHas(text, RECOMMENDATION_WORDS.refined),
      coffee: recommendationHas(text, RECOMMENDATION_WORDS.coffee),
    };
    const wordHits = Object.entries(RECOMMENDATION_WORDS).reduce(
      (total, [, words]) => total + recommendationHits(text, words),
      0,
    );
    const nutritionConfidence =
      nutrition?.confidence === "high"
        ? 2
        : nutrition?.confidence === "medium"
          ? 1
          : 0;
    const dishConfidence = composition?.dish ? 1 : 0;
    return {
      meal,
      flags,
      nutrition,
      confidence: Math.min(3, wordHits + nutritionConfidence + dishConfidence),
    };
  }
  function recommendationMealMoment(type) {
    const clean = recommendationNormalize(type);
    if (clean.includes("dejeuner") || clean.includes("breakfast"))
      return "breakfast";
    if (clean.includes("diner") || clean.includes("lunch")) return "lunch";
    if (
      clean.includes("souper") ||
      clean.includes("dinner") ||
      clean.includes("supper")
    )
      return "dinner";
    if (clean.includes("collation") || clean.includes("snack")) return "snack";
    return "other";
  }
  function recommendationIsStillRelevant(recommendation, meal) {
    if (!recommendation || !meal) return false;
    const category = recommendation.category;
    if (!["protein", "vegetables", "fruit", "fiber"].includes(category))
      return true;
    return !recommendationMealProfile(meal).flags[category];
  }
  function chooseMealRecommendation(date, justSavedMeal) {
    if (
      !db.settings.generalRecommendations ||
      date !== todayKey() ||
      !justSavedMeal
    )
      return null;
    const moment = recommendationMealMoment(justSavedMeal.type);
    // Les suggestions concernent uniquement les repas principaux.
    if (!["breakfast", "lunch", "dinner"].includes(moment)) return null;
    const meals = [...ensureDay(db, date).meals]
      .filter(
        (m) =>
          m.type !== "Boisson" &&
          m.description?.trim() &&
          m.time <= justSavedMeal.time,
      )
      .sort((a, b) => a.time.localeCompare(b.time));
    if (!meals.length) return null;
    const profiles = meals.map(recommendationMealProfile);
    const saved =
      profiles.find((p) => p.meal.id === justSavedMeal.id) || profiles.at(-1);
    if (!saved || saved.confidence < 1) return null;
    const known = profiles.filter((p) => p.confidence > 0);
    const confidencePoints = known.reduce((sum, p) => sum + p.confidence, 0);
    if (!known.length || confidencePoints < 1) return null;
    const has = (key) => profiles.some((p) => p.flags[key]);
    const english = window.ENERGIE_LOCALE === "en";
    const candidates = [];
    const add = (category, message) => candidates.push({ category, message });

    if (moment === "breakfast") {
      // Après le déjeuner, on agit tout de suite, mais avec des idées naturelles pour le prochain repas.
      if (!has("protein"))
        add(
          "protein",
          english
            ? "For your next meal, a protein source such as eggs, Greek yogurt, tofu or legumes could be a nice addition."
            : "Pour ton prochain repas, une source de protéines comme des œufs, du yogourt grec, du tofu ou des légumineuses pourrait être un bel ajout.",
        );
      if (!has("fiber"))
        add(
          "fiber",
          english
            ? "Whole grains, fruit or legumes could be a simple way to add a little more fibre to your next meal."
            : "Des grains entiers, un fruit ou des légumineuses pourraient être une façon simple d’ajouter un peu plus de fibres à ton prochain repas.",
        );
      if (!has("fruit"))
        add(
          "fruit",
          english
            ? "A fruit could be an easy addition to your next meal or snack."
            : "Un fruit pourrait être un ajout facile à ton prochain repas ou à une collation.",
        );
    }

    if (moment === "lunch") {
      // Après le dîner, l'analyse cumulative prépare surtout le souper.
      if (!has("protein"))
        add(
          "protein",
          english
            ? "Your next meal could be a good opportunity to add a protein source such as fish, chicken, tofu or legumes."
            : "Ton prochain repas pourrait être une bonne occasion d’ajouter une source de protéines comme du poisson, du poulet, du tofu ou des légumineuses.",
        );
      if (!has("vegetables"))
        add(
          "vegetables",
          english
            ? "A few vegetables could add some variety to your next meal."
            : "Quelques légumes pourraient ajouter un peu de variété à ton prochain repas.",
        );
      if (!has("fiber"))
        add(
          "fiber",
          english
            ? "Whole grains or legumes could add a little more fibre to your next meal."
            : "Des grains entiers ou des légumineuses pourraient ajouter un peu plus de fibres à ton prochain repas.",
        );
      if (!has("fruit"))
        add(
          "fruit",
          english
            ? "A fruit later today could be a simple way to add a little more variety."
            : "Un fruit plus tard aujourd’hui pourrait être une façon simple d’ajouter un peu plus de variété.",
        );
    }

    if (moment === "dinner") {
      if (!saved.flags.protein)
        add(
          "protein",
          english
            ? "A protein source such as fish, eggs, tofu or legumes could help round out this meal."
            : "Une source de protéines comme du poisson, des œufs, du tofu ou des légumineuses pourrait compléter ce repas.",
        );
      if (!saved.flags.vegetables)
        add(
          "vegetables",
          english
            ? "A few vegetables could add some variety to this meal."
            : "Quelques légumes pourraient ajouter un peu de variété à ce repas.",
        );
      if (!saved.flags.fiber)
        add(
          "fiber",
          english
            ? "Whole grains or legumes could add a little more fibre to this meal."
            : "Des grains entiers ou des légumineuses pourraient ajouter un peu plus de fibres à ce repas.",
        );
    }
    const fresh = candidates.find(
      (item) => !recommendationWasShown(date, item.category),
    );
    return fresh || candidates[0] || null;
  }
  let recommendationTimer = null;
  function showMealRecommendation(recommendation, date = todayKey()) {
    if (!recommendation) return;
    rememberRecommendation(date, recommendation.category);
    document.querySelector(".meal-recommendation-toast")?.remove();
    const card = document.createElement("aside");
    card.className = "meal-recommendation-toast";
    card.setAttribute("role", "status");
    const english = window.ENERGIE_LOCALE === "en";
    card.innerHTML = `<button class="meal-recommendation-close" type="button" aria-label="${english ? "Close" : "Fermer"}">×</button><div class="meal-recommendation-icon">💡</div><div><strong>${english ? "A small suggestion" : "Petite suggestion"}</strong><p>${esc(recommendation.message)}</p></div>`;
    document.body.appendChild(card);
    requestAnimationFrame(() => card.classList.add("is-visible"));
    const close = () => {
      clearTimeout(recommendationTimer);
      card.classList.remove("is-visible");
      setTimeout(() => card.remove(), 260);
    };
    card.querySelector(".meal-recommendation-close").onclick = close;
    recommendationTimer = setTimeout(close, 9000);
  }

  const WEATHER_CACHE_KEY = "energieRepasWeatherV179";
  const WEATHER_CACHE_MS = 30 * 60 * 1000;
  let weatherRefreshPromise = null;

  const WEATHER_SVGS = {
    morning: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2.1 2.1M22.4 22.4l2.1 2.1M24.5 7.5l-2.1 2.1M9.6 22.4l-2.1 2.1"/><circle cx="16" cy="16" r="6"/></svg>`,
    afternoon: `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="7"/><path d="M16 2.5v4M16 25.5v4M2.5 16h4M25.5 16h4M6.4 6.4l2.8 2.8M22.8 22.8l2.8 2.8M25.6 6.4l-2.8 2.8M9.2 22.8l-2.8 2.8"/></svg>`,
    cloud: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8.5 23h15a5.5 5.5 0 0 0 .7-11A8.5 8.5 0 0 0 8 10.2 6.5 6.5 0 0 0 8.5 23Z"/></svg>`,
    rain: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 21h14a5 5 0 0 0 .6-10A8 8 0 0 0 8.4 9.3 6 6 0 0 0 9 21Z"/><path d="M11 24l-1 3M17 24l-1 3M23 24l-1 3"/></svg>`,
    snow: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4v24M5.6 10l20.8 12M5.6 22l20.8-12M16 4l-3 3M16 4l3 3M16 28l-3-3M16 28l3-3M5.6 10l4.1.5M5.6 10l1.6 3.8M26.4 22l-4.1-.5M26.4 22l-1.6-3.8M5.6 22l4.1-.5M5.6 22l1.6-3.8M26.4 10l-4.1.5M26.4 10l-1.6 3.8"/></svg>`,
    night: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M24.5 21.4A10.5 10.5 0 0 1 10.6 7.5 10.5 10.5 0 1 0 24.5 21.4Z"/></svg>`,
  };
  function fallbackWeatherKind(date = new Date()) {
    const h = date.getHours();
    return h >= 20 || h < 6 ? "night" : h < 12 ? "morning" : "afternoon";
  }
  function weatherKindFromCode(code, date = new Date()) {
    const h = date.getHours(),
      isNight = h >= 20 || h < 6;
    const snowCodes = [71, 73, 75, 77, 85, 86];
    const rainCodes = [
      51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
    ];
    const cloudCodes = [2, 3, 45, 48];
    if (snowCodes.includes(Number(code))) return "snow";
    if (isNight) return "night";
    if (rainCodes.includes(Number(code))) return "rain";
    if (cloudCodes.includes(Number(code))) return "cloud";
    return h < 12 ? "morning" : "afternoon";
  }
  function weatherTitleFromKind(kind) {
    return (
      {
        morning: "Beau temps ce matin",
        afternoon: "Beau temps cet après-midi",
        cloud: "Temps nuageux",
        rain: "Pluie aujourd’hui",
        snow: "Neige aujourd’hui",
        night: "Soirée",
      }[kind] || "Ambiance du jour"
    );
  }
  function normalizeWeatherTemperature(rawValue) {
    if (rawValue === null || rawValue === undefined || rawValue === "")
      return null;
    const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
    return Number.isFinite(value) ? value : null;
  }
  function setLivingHeaderIcon(kind, title = weatherTitleFromKind(kind)) {
    const svg = WEATHER_SVGS[kind] || WEATHER_SVGS.afternoon;
    const header = $("#livingHeaderIcon"),
      nav = $("#todayNavIcon");
    if (header) {
      const temperature = normalizeWeatherTemperature(window.lastWeatherTemp);
      const temp =
        temperature === null
          ? ""
          : `<span class="weather-temp">${Math.round(temperature)}°C</span>`;
      header.innerHTML = svg + temp;
      header.dataset.weatherKind = kind;
      header.title = title;
      header.setAttribute(
        "aria-label",
        temperature === null
          ? title
          : `${title}, ${Math.round(temperature)} degrés Celsius`,
      );
    }
    if (nav) {
      if (nav.dataset.weatherKind !== kind || !nav.firstElementChild)
        nav.innerHTML = svg;
      nav.dataset.weatherKind = kind;
      nav.title = title;
      nav.setAttribute("aria-label", title);
    }
  }
  function readWeatherCache() {
    try {
      return JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || "null");
    } catch (_) {
      return null;
    }
  }
  function writeWeatherCache(value) {
    try {
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(value));
    } catch (_) {}
  }
  function currentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation)
        return reject(new Error("Géolocalisation indisponible"));
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 6 * 60 * 60 * 1000,
      });
    });
  }
  async function fetchCurrentWeather() {
    const cached = readWeatherCache();
    if (
      cached &&
      Date.now() - cached.savedAt < WEATHER_CACHE_MS &&
      Number.isFinite(Number(cached.code))
    )
      return cached;
    if (!navigator.onLine) throw new Error("Hors ligne");
    const pos = await currentPosition();
    const latitude = pos.coords.latitude.toFixed(4),
      longitude = pos.coords.longitude.toFixed(4);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&current=weather_code,temperature_2m&timezone=auto&forecast_days=1`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Météo ${response.status}`);
    const data = await response.json();
    const code = Number(data?.current?.weather_code);
    const temperature = normalizeWeatherTemperature(
      data?.current?.temperature_2m,
    );
    if (!Number.isFinite(code)) throw new Error("Code météo absent");
    const value = { code, temperature, savedAt: Date.now() };
    writeWeatherCache(value);
    return value;
  }
  async function updateLivingHeader(force = false) {
    if (force) localStorage.removeItem(WEATHER_CACHE_KEY);
    const cached = readWeatherCache();
    const cacheIsFresh =
      cached &&
      Date.now() - cached.savedAt < WEATHER_CACHE_MS &&
      Number.isFinite(Number(cached.code));
    const initialKind = cacheIsFresh
      ? weatherKindFromCode(cached.code)
      : fallbackWeatherKind();
    window.lastWeatherTemp = cacheIsFresh
      ? normalizeWeatherTemperature(cached.temperature)
      : null;
    setLivingHeaderIcon(initialKind);
    if (weatherRefreshPromise && !force) return weatherRefreshPromise;
    weatherRefreshPromise = (async () => {
      try {
        const weather = await fetchCurrentWeather();
        const kind = weatherKindFromCode(weather.code);
        window.lastWeatherTemp = normalizeWeatherTemperature(
          weather.temperature,
        );
        setLivingHeaderIcon(kind);
      } catch (error) {
        console.info("Icône météo en mode horaire:", error?.message || error);
      } finally {
        weatherRefreshPromise = null;
      }
    })();
    return weatherRefreshPromise;
  }

  const DEMO_BACKUP_KEY = "energieBeforeDemoV250";
  const DEMO_MEMORY_BACKUP_KEY = "energieBeforeDemoMemoryV1";
  let demoTourIndex = 0;

  function demoDateKey(offset) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString("en-CA");
  }
  function demoRand(seed) {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }
  function demoMeal(
    date,
    time,
    type,
    description,
    energy,
    tags = [],
    rating = 3,
    notes = "",
  ) {
    return normalMeal(
      {
        id: `demo-${date}-${time.replace(":", "")}-${type}`,
        date,
        time,
        type,
        description,
        fatigueBefore: energy,
        fatigueAfter: 0,
        notes,
        feeling: { rating, tags, notes: "", recordedAt: `${date}T${time}:00` },
        createdAt: `${date}T${time}:00`,
        updatedAt: `${date}T${time}:00`,
      },
      date,
    );
  }
  function createDemoDB(profileId = "marie") {
    const raw = window.EnergieDemoProfiles?.create?.(profileId);
    if (!raw)
      throw new Error("Les profils de démonstration ne sont pas chargés.");
    return migrate(raw);
  }
  function allMealsFromDB(source = db) {
    return Object.values(source?.days || {})
      .flatMap((day) => (Array.isArray(day?.meals) ? day.meals : []))
      .filter((meal) => meal?.description);
  }
  function backupRealBrainMemory() {
    try {
      if (!localStorage.getItem(DEMO_MEMORY_BACKUP_KEY))
        localStorage.setItem(
          DEMO_MEMORY_BACKUP_KEY,
          JSON.stringify(brainMemoryState() || { version: 1, memories: [] }),
        );
    } catch (error) {
      console.warn("Copie de la mémoire avant démo impossible", error);
    }
  }
  function buildDemoBrainMemory(source = db) {
    if (!window.Brain?.replaceMemoryState || !window.Brain?.learnMeals) return;
    window.Brain.replaceMemoryState({
      version: 1,
      settings: {},
      memories: [],
      updatedAt: new Date().toISOString(),
    });
    window.Brain.learnMeals(allMealsFromDB(source));
  }
  function restoreRealBrainMemory() {
    try {
      const raw = localStorage.getItem(DEMO_MEMORY_BACKUP_KEY);
      if (raw && window.Brain?.replaceMemoryState)
        window.Brain.replaceMemoryState(JSON.parse(raw));
      localStorage.removeItem(DEMO_MEMORY_BACKUP_KEY);
    } catch (error) {
      console.warn("Restauration de la mémoire impossible", error);
    }
  }
  function activeDemoProfile() {
    const id = db.settings?.demoProfileId || "marie";
    return (
      window.EnergieDemoProfiles?.profiles?.[id] ||
      window.EnergieDemoProfiles?.profiles?.marie || {
        id,
        name: db.settings?.demoName || "Démo",
        icon: "🧪",
        scenario: "Démonstration",
        summary: "Profil fictif",
      }
    );
  }
  function demoAnalysisContext() {
    if (!db.settings?.demoMode) return null;
    const dates = Object.keys(db.days || {}).sort();
    if (!dates.length) return null;
    const first = dates[0],
      last = dates[dates.length - 1],
      cutoff =
        selectedDate < first
          ? first
          : selectedDate > last
            ? last
            : selectedDate,
      elapsed = Math.max(1, dates.filter((d) => d <= cutoff).length),
      total = Math.max(1, dates.length);
    return {
      first,
      last,
      cutoff,
      elapsed,
      total,
      progress: Math.max(0, Math.min(1, elapsed / total)),
    };
  }
  function demoReferenceStory(profileId, progress, base) {
    const stage =
      progress < 0.2 ? 0 : progress < 0.45 ? 1 : progress < 0.72 ? 2 : 3;
    const stories = {
      marie: [
        {
          strength:
            "Tu documentes régulièrement tes repas malgré tes horaires variables.",
          habit:
            "Les produits laitiers apparaissent encore dans plusieurs déjeuners, cafés et collations.",
          suggestion:
            "Continue à noter les maux de tête et le contexte des repas afin de voir si une répétition apparaît.",
        },
        {
          strength: "Tu commences à préparer davantage de repas maison.",
          habit:
            "Les maux de tête reviennent plus souvent durant les périodes où les produits laitiers sont très présents.",
          suggestion:
            "Observe quelques semaines en réduisant graduellement certains produits laitiers, sans tout changer à la fois.",
        },
        {
          strength:
            "Les alternatives sans lactose deviennent plus fréquentes et tes repas maison gagnent du terrain.",
          habit:
            "Les semaines avec moins de produits laitiers contiennent déjà moins de mentions de maux de tête.",
          suggestion:
            "Poursuis la transition actuelle pour vérifier si cette amélioration se répète.",
        },
        base,
      ],
      alex: [
        {
          strength: "Tu tiens un journal assez régulier.",
          habit: "Tes repas sont déjà variés et structurés.",
          suggestion:
            "Continue à documenter les changements inhabituels afin de créer un bon point de comparaison.",
        },
        {
          strength: "Tes routines d’activité et d’hydratation sont constantes.",
          habit:
            "Aucune association négative répétée ne se distingue jusqu’ici.",
          suggestion:
            "Continue normalement; le Cerveau vérifie surtout la stabilité de tes habitudes.",
        },
        {
          strength: "Ton alimentation demeure variée et régulière.",
          habit:
            "Les journées actives sont souvent accompagnées d’un ressenti positif.",
          suggestion:
            "Aucune priorité particulière ne ressort; poursuis simplement ton suivi.",
        },
        base,
      ],
      sophie: [
        {
          strength: "Tu as commencé à documenter tes inconforts digestifs.",
          habit:
            "L’hydratation et les aliments riches en fibres sont encore peu réguliers.",
          suggestion:
            "Augmente progressivement l’eau et les fibres afin d’observer comment ton confort évolue.",
        },
        {
          strength:
            "Le gruau, les fruits et les légumes apparaissent plus souvent.",
          habit:
            "Les ballonnements demeurent présents, mais certaines journées mieux hydratées semblent plus confortables.",
          suggestion:
            "Continue les changements graduellement et garde une hydratation régulière.",
        },
        {
          strength: "Ta nouvelle routine de fibres devient plus constante.",
          habit:
            "Les épisodes digestifs commencent à diminuer durant les semaines les mieux hydratées.",
          suggestion:
            "Maintiens cette progression afin de confirmer la tendance.",
        },
        base,
      ],
    };
    return (stories[profileId] || [base, base, base, base])[stage] || base;
  }
  function activeReferenceBrain() {
    if (!db.settings?.demoMode) return null;
    const base =
        activeDemoProfile()?.brain ||
        window.EnergieDemoProfiles?.referenceBrains?.[
          db.settings.demoProfileId
        ] ||
        null,
      ctx = demoAnalysisContext();
    if (!base || !ctx) return base;
    const progress = ctx.progress,
      clone = JSON.parse(JSON.stringify(base));
    clone.story = demoReferenceStory(
      db.settings.demoProfileId || "marie",
      progress,
      clone.story,
    );
    const scale = (i) => ({
      ...i,
      count: Math.max(0, Math.round((Number(i.count) || 0) * progress)),
    });
    clone.feelings = {
      negative: (clone.feelings?.negative || [])
        .map(scale)
        .filter((x) => x.count),
      positive: (clone.feelings?.positive || [])
        .map(scale)
        .filter((x) => x.count),
    };
    clone.observations =
      progress < 0.25
        ? []
        : clone.observations.slice(
            0,
            progress < 0.58 ? 1 : clone.observations.length,
          );
    clone.insights =
      progress < 0.38
        ? []
        : clone.insights.slice(0, progress < 0.75 ? 1 : clone.insights.length);
    clone.timeline = ctx;
    return clone;
  }
  const defaultDemoReferenceStory = demoReferenceStory;
  demoReferenceStory = function (profileId, progress, base) {
    if (profileId === "elodie") {
      const stage = progress < 0.34 ? 0 : progress < 0.68 ? 1 : 2;
      return (
        [
          {
            strength:
              "Tu commences à noter les réactions hors repas dans les observations globales.",
            habit:
              "Le tofu, l’edamame, le miso ou les boissons de soya apparaissent encore régulièrement.",
            suggestion:
              "Documente le moment, la durée et l’intensité des rougeurs, démangeaisons ou symptômes digestifs, sans conclure trop vite à leur cause.",
          },
          {
            strength:
              "Les observations globales permettent de voir les réactions qui apparaissent le soir ou le lendemain.",
            habit:
              "Les réactions cutanées semblent revenir davantage dans les 24 à 48 heures suivant une exposition possible au soya.",
            suggestion:
              "Montre cette chronologie à un professionnel de la santé avant d’éliminer davantage d’aliments.",
          },
          base,
        ][stage] || base
      );
    }
    if (profileId !== "marie")
      return defaultDemoReferenceStory(profileId, progress, base);
    const stage =
      progress < 0.2 ? 0 : progress < 0.45 ? 1 : progress < 0.72 ? 2 : 3;
    return (
      [
        {
          strength:
            "Tu documentes régulièrement tes repas malgré tes horaires variables.",
          habit:
            "Les produits laitiers apparaissent encore dans plusieurs déjeuners, cafés et collations.",
          suggestion:
            "Continue à noter les ballonnements, gaz, crampes et autres signes digestifs ainsi que le contexte des repas.",
        },
        {
          strength: "Tu commences à préparer davantage de repas maison.",
          habit:
            "Les inconforts digestifs reviennent plus souvent durant les périodes où les produits laitiers sont très présents.",
          suggestion:
            "Observe quelques semaines en réduisant graduellement certains produits laitiers, sans tout changer à la fois.",
        },
        {
          strength:
            "Les alternatives sans lactose deviennent plus fréquentes et tes repas maison gagnent du terrain.",
          habit:
            "Les semaines avec moins de produits laitiers contiennent déjà moins de ballonnements, gaz et crampes.",
          suggestion:
            "Poursuis la transition actuelle pour vérifier si cette amélioration se répète.",
        },
        base,
      ][stage] || base
    );
  };
  function referenceFeelingStats(brain) {
    if (!brain?.feelings) return null;
    const meals = allMealsFromDB(db)
      .slice()
      .sort((a, b) =>
        `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`),
      );
    const decorate = (item) => {
      const occurrences = meals
        .filter((meal) => (meal.feeling?.tags || []).includes(item.id))
        .slice(0, 12)
        .map((meal) => ({
          date: meal.date,
          mealDescription: meal.description || "Repas",
          mealTime: meal.time || "12:00",
          mealType: t(meal.type),
          rating: meal.feeling?.rating || 3,
          notes: meal.notes || meal.feeling?.notes || "",
          priorMeals: [],
        }));
      return {
        ...item,
        occurrences: item.occurrences?.length ? item.occurrences : occurrences,
      };
    };
    const negative = (brain.feelings.negative || []).map(decorate),
      positive = (brain.feelings.positive || []).map(decorate);
    return {
      negative,
      positive,
      negativeCount: negative.reduce((sum, item) => sum + (item.count || 0), 0),
      positiveCount: positive.reduce((sum, item) => sum + (item.count || 0), 0),
    };
  }
  const PROFESSIONAL_NOTES_KEY = "energieProfessionalDemoNotesV1";
  function readProfessionalNotes() {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFESSIONAL_NOTES_KEY) || "null");
      if (Array.isArray(saved)) return saved;
    } catch (_) {}
    const now = Date.now();
    const defaults = [
      ["marie", "shared", "Poursuivre la consignation des repas contenant des produits laitiers et noter précisément le délai des inconforts digestifs."],
      ["marie", "private", "Revoir avec Marie la précision des portions lors de la prochaine rencontre."],
      ["alex", "shared", "Observer si la régularité des repas les journées actives influence les ressentis de fin de journée."],
      ["alex", "private", "Valider les objectifs du suivi avant de proposer de nouveaux changements."],
      ["sophie", "shared", "Continuer à documenter le sommeil et l’hydratation afin de comparer les journées semblables."],
      ["sophie", "private", "Vérifier si certaines journées de travail expliquent une partie des variations observées."],
      ["elodie", "shared", "Noter les réactions globales avec leur heure d’apparition, même lorsqu’elles surviennent le lendemain."],
      ["elodie", "private", "Aborder la possibilité d’une évaluation médicale si les réactions se répètent."],
    ].map(([clientId, visibility, content], index) => ({
      id: `demo-note-${clientId}-${visibility}`,
      clientId,
      visibility,
      contextType: "global",
      contextId: "",
      contextDate: "",
      contextLabel: "Suivi général",
      content,
      createdAt: new Date(now - (index + 1) * 86400000).toISOString(),
      updatedAt: new Date(now - (index + 1) * 86400000).toISOString(),
    }));
    try {
      localStorage.setItem(PROFESSIONAL_NOTES_KEY, JSON.stringify(defaults));
    } catch (_) {}
    return defaults;
  }
  function writeProfessionalNotes(notes) {
    try {
      localStorage.setItem(PROFESSIONAL_NOTES_KEY, JSON.stringify(notes));
    } catch (_) {}
  }
  const PROFESSIONAL_TRACKING_PLANS_KEY = "energieProfessionalTrackingPlansV1";
  function defaultProfessionalTrackingPlans() {
    return {
      marie: ["bloating", "gas", "stomachache", "cramps", "reflux", "nausea", "diarrhea", "constipation", "urgent_stool", "heaviness", "slow_digestion"],
      sophie: ["bloating", "gas", "stomachache", "cramps", "constipation", "urgent_stool", "heaviness", "slow_digestion", "fatigue"],
      elodie: ["itching", "redness", "hives", "swelling", "congestion", "sneezing", "throat_irritation", "nausea", "stomachache", "diarrhea"],
      alex: ["feeling_good", "stable_energy", "energy", "focus", "good_mood", "fatigue", "sleepiness", "energy_drop", "brain_fog", "poor_focus"],
    };
  }
  function readProfessionalTrackingPlans() {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFESSIONAL_TRACKING_PLANS_KEY) || "null");
      if (saved && typeof saved === "object") {
        Object.values(saved).forEach((plan) => {
          if (plan) plan.feelingIds = normalizeFeelingIds(plan.feelingIds);
        });
        return saved;
      }
    } catch (_) {}
    const defaults = Object.fromEntries(
      Object.entries(defaultProfessionalTrackingPlans()).map(([clientId, feelingIds]) => [clientId, {
        clientId,
        feelingIds: normalizeFeelingIds(feelingIds),
        updatedAt: new Date().toISOString(),
      }]),
    );
    try { localStorage.setItem(PROFESSIONAL_TRACKING_PLANS_KEY, JSON.stringify(defaults)); } catch (_) {}
    return defaults;
  }
  function writeProfessionalTrackingPlans(plans) {
    try { localStorage.setItem(PROFESSIONAL_TRACKING_PLANS_KEY, JSON.stringify(plans)); } catch (_) {}
  }
  function activeProfessionalTrackingPlan() {
    if (!db.settings?.demoMode || !db.settings?.demoProfileId) return null;
    return readProfessionalTrackingPlans()[db.settings.demoProfileId] || null;
  }
  function professionalTrackingPlanHtml() {
    const profile = activeDemoProfile(),
      plan = activeProfessionalTrackingPlan(),
      chosen = new Set(plan?.feelingIds || []),
      groups = FEELING_CATEGORIES.map((category) => {
        const tags = FEELING_TAGS.filter((tag) => tag.category === category.id && tag.id !== "feeling_good" && !tag.scopedOnly && !tag.deprecated);
        if (!tags.length) return "";
        return `<details class="tracking-plan-group" ${tags.some((tag) => chosen.has(tag.id)) ? "open" : ""}><summary><span>${category.emoji} ${esc(t(category.label))}</span><small>${tags.filter((tag) => chosen.has(tag.id)).length}/${tags.length}</small></summary><div class="tracking-plan-options">${tags.map((tag) => `<label><input type="checkbox" data-tracking-feeling="${tag.id}" ${chosen.has(tag.id) ? "checked" : ""}><span>${tag.emoji} ${esc(t(tag.label))}</span></label>`).join("")}</div></details>`;
      }).join("");
    return `<form id="professionalTrackingPlanForm" class="card professional-tracking-plan"><div class="professional-tracking-plan-head"><div><p class="eyebrow">Plan de suivi personnalisé</p><h2>🎯 Ressentis suivis avec ${esc(profile.name)}</h2></div><strong id="trackingPlanCount">${chosen.size} sélectionnés</strong></div><p class="muted small">Le client ne verra que ces ressentis avant et après les repas ainsi que dans les observations globales. Les anciennes données demeurent conservées.</p><div class="tracking-plan-actions"><button type="button" class="text-button" id="selectAllTrackingFeelings">Tout sélectionner</button><button type="button" class="text-button" id="clearTrackingFeelings">Tout retirer</button></div><div class="tracking-plan-groups">${groups}</div><p class="tracking-plan-permanent">✅ « Aucun des ressentis suivis » et ✍️ « Autre chose à signaler » demeurent toujours disponibles.</p><button type="submit" class="primary">Enregistrer le plan de suivi</button></form>`;
  }
  function clientTrackingPlanSummaryHtml() {
    const plan = activeProfessionalTrackingPlan();
    if (!plan) return "";
    const tags = (plan.feelingIds || []).filter((id) => id !== "feeling_good").map((id) => FEELING_TAGS.find((tag) => tag.id === id)).filter(Boolean);
    return `<section class="card client-tracking-summary"><p class="eyebrow">Plan convenu avec le professionnel</p><h3>🎯 Mes ressentis à observer</h3><div>${tags.map((tag) => `<span>${tag.emoji} ${esc(t(tag.label))}</span>`).join("")}</div><p class="muted tiny">Cette sélection simplifie la saisie. Tes anciennes observations demeurent dans ton historique.</p></section>`;
  }
  function professionalDemoEntryHtml() {
    if (!hasDemoAccess || db.settings.demoMode) return "";
    return `<section class="card professional-demo-entry"><div><p class="eyebrow">Prototype local</p><h3>👩‍⚕️ Mode professionnel — Démo</h3><p class="muted small">Consulte les quatre dossiers fictifs en lecture seule et expérimente le suivi professionnel.</p></div><button type="button" class="primary" id="openProfessionalDemo">Ouvrir l’espace professionnel</button></section>`;
  }
  function professionalClientPickerHtml() {
    const profiles = Object.values(window.EnergieDemoProfiles?.profiles || {});
    return profiles
      .map((profile) => `<button type="button" class="professional-client-option ${db.settings.demoProfileId === profile.id ? "is-active" : ""}" data-professional-client="${profile.id}"><span>${profile.icon}</span><span><strong>${esc(profile.name)}</strong><small>${esc(profile.scenario)}</small></span><b>›</b></button>`)
      .join("");
  }
  function openProfessionalClientPicker() {
    const dialog = $("#professionalClientDialog"),
      list = $("#professionalClientList");
    if (!dialog || !list) {
      alert("La liste des clients n’a pas pu être ouverte. Recharge l’application puis réessaie.");
      return;
    }
    list.innerHTML = professionalClientPickerHtml();
    $$('[data-professional-client]').forEach((button) =>
      button.addEventListener("click", () => {
        professionalDemoMode = true;
        dialog.close();
        switchDemoProfile(button.dataset.professionalClient);
      }),
    );
    try {
      if (!dialog.open) dialog.showModal();
    } catch (_) {
      dialog.setAttribute("open", "");
    }
  }
  function startProfessionalDemo() {
    professionalDemoMode = true;
    openProfessionalClientPicker();
  }
  function professionalContextOptionsHtml() {
    const options = [`<option value="global|||Suivi général">Suivi général</option>`];
    const dates = Object.keys(db.days || {}).sort().reverse().slice(0, 30);
    dates.forEach((date) => {
      const day = db.days[date] || {};
      options.push(`<option value="day||${date}|Journée du ${esc(formatDate(date))}">📅 Journée · ${esc(formatDate(date))}</option>`);
      if (day.water != null)
        options.push(`<option value="hydration||${date}|Hydratation du ${esc(formatDate(date))}">💧 Hydratation · ${esc(formatDate(date))}</option>`);
      if (day.sleepHours != null)
        options.push(`<option value="sleep||${date}|Sommeil du ${esc(formatDate(date))}">😴 Sommeil · ${esc(formatDate(date))}</option>`);
      if ((day.activities || []).length)
        options.push(`<option value="activity||${date}|Activité du ${esc(formatDate(date))}">🚶 Activité · ${esc(formatDate(date))}</option>`);
      (day.observations || []).forEach((observation) =>
        options.push(`<option value="observation|${observation.id}|${date}|Observation globale du ${esc(formatDate(date))}">🌿 Observation globale · ${esc(formatDate(date))}</option>`),
      );
      (day.meals || []).forEach((meal) =>
        options.push(`<option value="meal|${meal.id}|${date}|${esc(meal.type)} — ${esc(meal.description)}">${mealIcon(meal.type, meal.description)} ${esc(meal.type)} · ${esc(meal.description)}</option>`),
      );
    });
    return options.join("");
  }
  function professionalNoteTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ""
      : new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }
  let professionalTrendWeekDetails = [];
  function professionalTrendHtml() {
    const profile = activeDemoProfile();
    if (!db.settings.demoMode) return "";
    const configs = {
      elodie: {
        pattern: /(soya|tofu|edamame|miso)/i,
        delayed: true,
        title: "🌿 Soya et évolution des réactions",
        description: "Comparaison hebdomadaire des observations globales dans les 24 à 48 heures suivant du soya repéré et pendant les périodes sans soya repéré.",
        primaryLabel: "Après soya repéré",
        primaryHelp: "Inconfort moyen observé dans les 24 à 48 h suivant un repas où du soya a été repéré.",
        comparisonLabel: "Sans soya repéré",
        comparisonHelp: "Inconfort moyen durant les journées sans exposition récente au soya repérée.",
        metricLabel: "jours avec soya",
        metricHelp: "Nombre total de journées où au moins un repas mentionne du soya pendant la période.",
        disclaimer: "Association tirée des repas et observations globales. Elle ne confirme pas une allergie et ne constitue pas un diagnostic.",
        milestoneWeek: 5,
        milestoneLines: ["Tendance remarquée", "réduction du soya"],
        summarySubject: "les réactions observées après du soya repéré",
        summaryAction: "la réduction du soya",
        symptomIds: ["itching", "hives", "nausea", "stomachache"],
        intensity: (day) => {
          const observations = day.observations || [];
          return observations.length
            ? observations.reduce((sum, item) => sum + (Number(item.intensity) || 0), 0) / observations.length
            : 0;
        },
      },
      marie: {
        pattern: /(lait|lactose|fromage|yogourt|cr[eè]me|cr[eé]meuse|cappuccino|latte|pizza au fromage|sauce cr[eè]meuse)/i,
        delayed: false,
        title: "🥛 Produits laitiers et inconfort digestif",
        description: "Comparaison hebdomadaire de l’inconfort digestif les journées contenant des produits laitiers repérés et les journées sans produits laitiers repérés.",
        primaryLabel: "Avec produits laitiers",
        primaryHelp: "Inconfort digestif moyen les journées où des produits laitiers ont été repérés.",
        comparisonLabel: "Sans produits laitiers",
        comparisonHelp: "Inconfort digestif moyen les journées sans produit laitier repéré.",
        metricLabel: "jours avec produits laitiers",
        metricHelp: "Nombre total de journées comprenant au moins un produit laitier pendant la période.",
        disclaimer: "Association tirée des descriptions de repas et des ressentis digestifs. Elle ne confirme pas une intolérance et ne constitue pas un diagnostic.",
        milestoneWeek: 10,
        milestoneLines: ["Observation du journal", "réduction des produits laitiers"],
        summarySubject: "les inconforts digestifs associés aux produits laitiers repérés",
        summaryAction: "la réduction graduelle des produits laitiers",
        symptomIds: ["bloating", "gas", "cramps", "diarrhea", "nausea", "stomachache"],
        intensity: (day) => {
          const digestive = new Set(["bloating", "gas", "cramps", "diarrhea", "nausea", "stomachache"]);
          const scores = (day.meals || []).flatMap((meal) =>
            (meal.feeling?.tags || []).filter((tag) => digestive.has(tag)).map((tag) => Number(meal.feeling?.scores?.[tag] ?? meal.feeling?.rating ?? 3)),
          );
          return scores.length ? scores.reduce((sum, score) => sum + (6 - score), 0) / scores.length : 0;
        },
      },
      sophie: {
        pattern: /(gruau|pomme|chia|quinoa|pois chiches|chili|haricots|riz brun|l[eé]gumes|lentilles|amandes)/i,
        delayed: false,
        title: "🌾 Fibres et confort digestif",
        description: "Comparaison hebdomadaire de l’inconfort digestif durant les journées où des aliments riches en fibres sont repérés et celles où ils sont moins présents.",
        primaryLabel: "Fibres bien présentes",
        primaryHelp: "Inconfort digestif moyen les journées où plusieurs sources de fibres ont été repérées.",
        comparisonLabel: "Fibres moins présentes",
        comparisonHelp: "Inconfort digestif moyen les journées où peu de sources de fibres ont été repérées.",
        metricLabel: "jours riches en fibres",
        metricHelp: "Nombre total de journées où des sources de fibres étaient clairement présentes pendant la période.",
        disclaimer: "Association tirée des descriptions de repas et des ressentis digestifs. La présence réelle de fibres demeure une estimation et non une mesure nutritionnelle précise.",
        milestoneWeek: 15,
        milestoneLines: ["Observation du journal", "augmentation progressive des fibres"],
        summarySubject: "les inconforts digestifs",
        summaryAction: "l’augmentation progressive des fibres et de l’hydratation",
        symptomIds: ["bloating", "gas", "cramps", "stomachache", "nausea"],
        intensity: (day) => {
          const digestive = new Set(["bloating", "gas", "cramps", "diarrhea", "nausea", "stomachache"]);
          const scores = (day.meals || []).flatMap((meal) =>
            (meal.feeling?.tags || []).filter((tag) => digestive.has(tag)).map((tag) => Number(meal.feeling?.scores?.[tag] ?? meal.feeling?.rating ?? 3)),
          );
          return scores.length ? scores.reduce((sum, score) => sum + (6 - score), 0) / scores.length : 0;
        },
      },
    };
    const config = configs[profile.id];
    if (!config) return "";
    const dates = Object.keys(db.days || {}).sort();
    if (!dates.length) return "";
    const primaryDates = new Set(dates.filter((date) =>
      (db.days[date]?.meals || []).some((meal) => config.pattern.test(meal.description || "")),
    ));
    const previousDate = (date) => {
      const value = new Date(`${date}T12:00:00`);
      value.setDate(value.getDate() - 1);
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    };
    const rows = dates.map((date) => {
      return {
        date,
        exposed: primaryDates.has(date) || (config.delayed && primaryDates.has(previousDate(date))),
        direct: primaryDates.has(date),
        intensity: config.intensity(db.days[date] || {}),
      };
    });
    const weekStart = (date) => {
      const value = new Date(`${date}T12:00:00`);
      value.setDate(value.getDate() - value.getDay());
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    };
    const weekMap = new Map();
    rows.forEach((row) => {
      const key = weekStart(row.date);
      if (!weekMap.has(key)) weekMap.set(key, { start: key, dates: [], exposed: [], clear: [], exposures: 0, mealCount: 0, symptoms: {} });
      const week = weekMap.get(key);
      week.dates.push(row.date);
      week[row.exposed ? "exposed" : "clear"].push(row.intensity);
      if (row.direct) week.exposures += 1;
      const day = db.days[row.date] || {};
      week.mealCount += (day.meals || []).length;
      const tags = [
        ...(day.observations || []).flatMap((item) => item.tags || []),
        ...(day.meals || []).flatMap((meal) => meal.feeling?.tags || []),
      ];
      tags.filter((id) => config.symptomIds.includes(id)).forEach((id) => {
        week.symptoms[id] = (week.symptoms[id] || 0) + 1;
      });
    });
    const weeks = [...weekMap.values()].sort((a, b) => a.start.localeCompare(b.start));
    const avg = (values) => values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
    const points = weeks.filter((week) => week.dates.length >= 4).map((week) => ({
      start: week.start,
      label: `Dim. ${new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short" }).format(new Date(`${week.start}T12:00:00`))}`,
      discomfort: avg([...week.exposed, ...week.clear]),
      exposures: week.exposures,
      mealCount: week.mealCount,
      symptoms: week.symptoms,
    }));
    const allExposed = rows.filter((row) => row.exposed).map((row) => row.intensity);
    const allClear = rows.filter((row) => !row.exposed).map((row) => row.intensity);
    const width = Math.max(680, points.length * 78 + 57), height = 270, left = 43, right = 14, top = 15, bottom = 63;
    const x = (index) => left + index * (width - left - right) / Math.max(1, points.length - 1);
    const y = (value) => top + (height - top - bottom) * (1 - Math.max(0, Math.min(5, value)) / 5);
    const linePath = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.discomfort || 0).toFixed(1)}`).join(" ");
    const dots = points.map((point, index) => `<circle class="discomfort" cx="${x(index)}" cy="${y(point.discomfort || 0)}" r="5"><title>${esc(point.label)} · Inconfort moyen : ${(point.discomfort || 0).toFixed(1)}/5 · ${point.exposures} jour(s) repéré(s)</title></circle>`).join("");
    const pointValues = points.map((point, index) => {
      const value = point.discomfort || 0;
      return `<text x="${x(index)}" y="${Math.max(top + 9, y(value) - 9)}" text-anchor="middle">${value.toFixed(1)}</text>`;
    }).join("");
    const grid = [0,1,2,3,4,5].map((value) => `<line x1="${left}" y1="${y(value)}" x2="${width-right}" y2="${y(value)}"/><text x="${left-8}" y="${y(value)+3}" text-anchor="end">${value}</text>`).join("");
    const labels = points.map((point, index) => `<text x="${x(index)}" y="${height-15}" text-anchor="middle">${esc(point.label)}</text>`).join("");
    const exposureBars = points.map((point, index) => {
      const barHeight = Math.max(2, point.exposures * 3);
      return `<g class="trend-exposure"><rect x="${x(index)-5}" y="${height-bottom+10-barHeight}" width="10" height="${barHeight}" rx="3"/><text x="${x(index)}" y="${height-bottom+22}" text-anchor="middle">${point.exposures}</text></g>`;
    }).join("");
    const milestoneIndex = Math.min(points.length - 1, Number(config.milestoneWeek ?? -1));
    const milestone = milestoneIndex >= 0 ? `<g class="trend-milestone"><line x1="${x(milestoneIndex)}" y1="${top}" x2="${x(milestoneIndex)}" y2="${height-bottom}"/><text x="${x(milestoneIndex)+7}" y="${top+12}">${esc(config.milestoneLines[0])}</text><text x="${x(milestoneIndex)+7}" y="${top+24}">${esc(config.milestoneLines[1])}</text></g>` : "";
    const hitAreas = points.map((point, index) => `<g class="trend-week-hit" data-trend-week-detail="${index}" role="button" tabindex="0" aria-label="Voir le détail de ${esc(point.label)}"><rect x="${Math.max(left, x(index)-28)}" y="${top}" width="56" height="${height-top-10}" rx="8"/></g>`).join("");
    const chart = `<div class="professional-trend-legend"><span class="discomfort">Valeur au-dessus : inconfort moyen /5</span><span class="exposure-count">Nombre en dessous : journées repérées</span></div><div class="professional-trend-scroll chart-scroll"><svg style="--trend-width:${width}px" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(config.title.replace(/^[^ ]+ /, ""))}"><text class="trend-y-title" x="14" y="${top + (height-top-bottom)/2}" text-anchor="middle" transform="rotate(-90 14 ${top + (height-top-bottom)/2})">Inconfort /5</text><g class="trend-grid">${grid}</g>${milestone}<path class="trend-path discomfort" d="${linePath}"/><g class="trend-dots">${dots}</g><g class="trend-point-values">${pointValues}</g><g class="trend-exposures">${exposureBars}</g><g class="trend-labels">${labels}</g><g class="trend-week-hits">${hitAreas}</g></svg></div>`;
    const endOfWeek = (start) => { const date = new Date(`${start}T12:00:00`); date.setDate(date.getDate() + 6); return date; };
    professionalTrendWeekDetails = points.map((point) => ({
      period: `${new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "long" }).format(new Date(`${point.start}T12:00:00`))} au ${new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "long" }).format(endOfWeek(point.start))}`,
      discomfort: `${(point.discomfort || 0).toFixed(1)}/5`,
      exposures: point.exposures,
      exposureLabel: config.metricLabel,
      meals: point.mealCount,
      symptoms: Object.entries(point.symptoms || {}).sort((a,b) => b[1]-a[1]).slice(0,3).map(([id]) => FEELING_TAGS.find((tag) => tag.id === id)).filter(Boolean).map((tag) => `${tag.emoji} ${t(tag.label)}`),
    }));
    const baseline = avg(points.slice(0, Math.max(1, milestoneIndex)).map((point) => point.discomfort || 0)) || 0;
    const recent = avg(points.slice(-Math.min(4, points.length)).map((point) => point.discomfort || 0)) || 0;
    const improvement = baseline - recent;
    const confidenceHigh = points.length >= 10 && Math.abs(improvement) >= .7;
    const confidenceLabel = confidenceHigh ? "Élevée" : "Modérée";
    const directionText = improvement >= .35 ? `diminuent de ${Math.abs(improvement).toFixed(1)} point en moyenne` : improvement <= -.35 ? `augmentent de ${Math.abs(improvement).toFixed(1)} point en moyenne` : "demeurent relativement stables";
    const summary = `<section class="card professional-case-summary"><div class="professional-case-summary-head"><span>🧠</span><div><p class="eyebrow">Résumé professionnel du dossier</p><h2>Tendance principale détectée</h2></div><span class="confidence-pill ${confidenceHigh ? "high" : "medium"}">Confiance ${confidenceLabel.toLowerCase()}</span></div><p class="professional-case-summary-text">Sur la période observée, ${esc(config.summarySubject)} ${directionText} depuis ${esc(config.summaryAction)}. Cette évolution constitue une piste à explorer avec ${esc(profile.name)}, sans établir de lien de cause à effet.</p><div class="professional-case-summary-metrics"><div><small>Au début</small><strong>${baseline.toFixed(1)}/5</strong><span>inconfort moyen</span></div><div><small>Dernières semaines</small><strong>${recent.toFixed(1)}/5</strong><span>inconfort moyen</span></div><div><small>Qualité de lecture</small><strong>${confidenceLabel}</strong><span>${points.length} semaines analysées</span></div></div><p class="professional-case-summary-caution">⚕️ Résumé d’aide à la consultation — il ne constitue pas un diagnostic.</p></section>`;
    const weekDialog = `<dialog class="professional-week-dialog" id="professionalTrendWeekDialog"><div class="professional-week-dialog-card"><div class="professional-week-dialog-head"><div><p class="eyebrow">Détail de la semaine</p><h3 id="professionalWeekPeriod"></h3></div><button type="button" class="icon-button" data-close-trend-week aria-label="Fermer">✕</button></div><div class="professional-week-detail-grid"><div><span>📈</span><small>Inconfort moyen</small><strong id="professionalWeekDiscomfort">—</strong></div><div><span>🔎</span><small id="professionalWeekExposureLabel">Journées repérées</small><strong id="professionalWeekExposures">—</strong></div><div><span>🍽️</span><small>Repas et collations</small><strong id="professionalWeekMeals">—</strong></div></div><div class="professional-week-symptoms"><small>Symptômes dominants consignés</small><div id="professionalWeekSymptoms"></div></div><p class="muted tiny">Touchez une autre semaine du graphique pour comparer son portrait.</p></div></dialog>`;
    return `${summary}<section class="card professional-client-trend"><div class="professional-trend-heading"><div><p class="eyebrow">Évolution dans le temps</p><h2>${config.title}</h2><p>${config.description}</p></div><span class="confidence-pill high">Tendance observée</span></div><div class="professional-trend-week-note"><strong>Touchez une semaine pour voir son détail.</strong><span>Chaque semaine commence le dimanche. La valeur au-dessus de chaque point indique l’inconfort moyen sur 5; le nombre sous la courbe indique combien de journées contenaient l’élément suivi.</span></div><div class="professional-trend-metrics"><div><strong>${(avg(allExposed) || 0).toFixed(1)}/5</strong><small>${esc(config.primaryLabel)}</small><p>${esc(config.primaryHelp)}</p></div><div><strong>${(avg(allClear) || 0).toFixed(1)}/5</strong><small>${esc(config.comparisonLabel)}</small><p>${esc(config.comparisonHelp)}</p></div><div><strong>${primaryDates.size}</strong><small>${esc(config.metricLabel)}</small><p>${esc(config.metricHelp)}</p></div></div>${chart}<button type="button" class="secondary professional-trend-expand" data-open-trend-fullscreen><span>↗ Agrandir le graphique</span><small>Tournez votre téléphone horizontalement pour une meilleure vue</small></button><p class="muted tiny">${config.disclaimer}</p></section><dialog class="professional-trend-dialog" id="professionalTrendDialog"><div class="professional-trend-dialog-head"><div><small>Graphique agrandi · Touchez une semaine pour l’explorer</small><strong>${config.title}</strong></div><button type="button" class="secondary" data-close-trend-fullscreen>Revenir au suivi ✕</button></div><div class="professional-trend-fullscreen-frame">${chart}</div><p class="muted tiny">Axe vertical : inconfort moyen sur 5 · Axe horizontal : semaines du dimanche au samedi.</p></dialog>${weekDialog}`;
  }
  function renderFollowup() {
    if (!db.settings.demoMode) {
      currentView = "profile";
      render();
      return;
    }
    const profile = activeDemoProfile();
    const allNotes = readProfessionalNotes()
      .filter((note) => note.clientId === profile.id)
      .filter((note) => professionalDemoMode || note.visibility === "shared")
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const form = professionalDemoMode
      ? `<form id="professionalNoteForm" class="card professional-followup professional-note-form"><div><p class="eyebrow">Nouvelle note</p><h3>Ajouter au suivi de ${esc(profile.name)}</h3></div><label>Visibilité<select id="professionalNoteVisibility"><option value="shared">Partagée avec le client</option><option value="private">Privée — professionnel seulement</option></select></label><label>Contexte<select id="professionalNoteContext">${professionalContextOptionsHtml()}</select></label><label>Note<textarea id="professionalNoteContent" rows="4" required placeholder="Écrire une observation ou une piste de suivi…"></textarea></label><button type="submit" class="primary">Enregistrer la note</button></form>`
      : "";
    const cards = allNotes.length
      ? allNotes.map((note) => `<article class="card professional-note-card ${note.visibility === "private" ? "is-private" : "is-shared"}"><div class="professional-note-head"><span>${note.visibility === "private" ? "🔒 Note privée" : "👁️ Partagée avec le client"}</span><time>${esc(professionalNoteTime(note.createdAt))}</time></div><strong>${esc(note.contextLabel || "Suivi général")}</strong><p>${esc(note.content)}</p>${professionalDemoMode ? `<button type="button" class="text-button professional-note-delete" data-delete-professional-note="${note.id}">Supprimer</button>` : ""}</article>`).join("")
      : `<section class="card empty"><span>📝</span><p>Aucune note partagée n’est disponible pour ce suivi.</p></section>`;
    const trackingPlanPanel = professionalDemoMode
      ? professionalTrackingPlanHtml()
      : clientTrackingPlanSummaryHtml();
    $("#app").innerHTML = `<section class="hero professional-followup-hero"><p class="eyebrow">${professionalDemoMode ? "Espace professionnel · Démo" : "Suivi professionnel"}</p><h2>📝 Suivi de ${esc(profile.name)}</h2><p>${professionalDemoMode ? "Les notes privées et partagées sont visibles dans cet espace professionnel fictif." : "Les notes partagées par le professionnel apparaissent ici en lecture seule."}</p>${professionalDemoMode ? `<div class="dialog-actions"><button type="button" class="secondary" id="switchProfessionalClient">Changer de client</button><button type="button" class="text-button" id="leaveProfessionalDemo">Quitter le mode professionnel</button></div>` : ""}</section>${professionalTrendHtml()}${trackingPlanPanel}${form}<section class="professional-followup"><div class="section-title"><h2>Chronologie</h2><span class="muted small">${allNotes.length} note${allNotes.length > 1 ? "s" : ""}</span></div><div class="stack">${cards}</div></section>`;
    $("#switchProfessionalClient")?.addEventListener("click", openProfessionalClientPicker);
    $("#leaveProfessionalDemo")?.addEventListener("click", leaveDemoMode);
    $("[data-open-trend-fullscreen]")?.addEventListener("click", async () => {
      const dialog = $("#professionalTrendDialog");
      if (!dialog) return;
      dialog.showModal();
    });
    $("[data-close-trend-fullscreen]")?.addEventListener("click", async () => {
      const dialog = $("#professionalTrendDialog");
      dialog?.classList.remove("is-css-landscape");
      try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (_) {}
      dialog?.close();
    });
    const openTrendWeekDetail = (index) => {
      const detail = professionalTrendWeekDetails[Number(index)];
      const dialog = $("#professionalTrendWeekDialog");
      if (!detail || !dialog) return;
      $("#professionalWeekPeriod").textContent = detail.period;
      $("#professionalWeekDiscomfort").textContent = detail.discomfort;
      $("#professionalWeekExposureLabel").textContent = detail.exposureLabel;
      $("#professionalWeekExposures").textContent = String(detail.exposures);
      $("#professionalWeekMeals").textContent = String(detail.meals);
      const symptoms = $("#professionalWeekSymptoms");
      symptoms.innerHTML = "";
      (detail.symptoms.length ? detail.symptoms : ["Aucun symptôme dominant"]).forEach((label) => {
        const chip = document.createElement("span");
        chip.textContent = label;
        symptoms.appendChild(chip);
      });
      dialog.showModal();
    };
    $$('[data-trend-week-detail]').forEach((target) => {
      target.addEventListener("click", () => openTrendWeekDetail(target.dataset.trendWeekDetail));
      target.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openTrendWeekDetail(target.dataset.trendWeekDetail);
      });
    });
    $("[data-close-trend-week]")?.addEventListener("click", () => $("#professionalTrendWeekDialog")?.close());
    const updateTrackingPlanCount = () => {
      const count = $$("[data-tracking-feeling]:checked").length,
        target = $("#trackingPlanCount");
      if (target) target.textContent = `${count} sélectionné${count > 1 ? "s" : ""}`;
      $$(".tracking-plan-group").forEach((group) => {
        const small = group.querySelector("summary small"),
          inputs = [...group.querySelectorAll("[data-tracking-feeling]")];
        if (small) small.textContent = `${inputs.filter((input) => input.checked).length}/${inputs.length}`;
      });
    };
    $$("[data-tracking-feeling]").forEach((input) => input.addEventListener("change", updateTrackingPlanCount));
    $("#selectAllTrackingFeelings")?.addEventListener("click", () => {
      $$("[data-tracking-feeling]").forEach((input) => { input.checked = true; });
      updateTrackingPlanCount();
    });
    $("#clearTrackingFeelings")?.addEventListener("click", () => {
      $$("[data-tracking-feeling]").forEach((input) => { input.checked = false; });
      updateTrackingPlanCount();
    });
    $("#professionalTrackingPlanForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const feelingIds = $$("[data-tracking-feeling]:checked").map((input) => input.dataset.trackingFeeling);
      if (!feelingIds.length) return alert("Sélectionne au moins un ressenti à suivre.");
      const plans = readProfessionalTrackingPlans();
      plans[profile.id] = { clientId: profile.id, feelingIds, updatedAt: new Date().toISOString() };
      writeProfessionalTrackingPlans(plans);
      renderFollowup();
    });
    $("#professionalNoteForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const rawContext = $("#professionalNoteContext").value.split("|");
      const content = $("#professionalNoteContent").value.trim();
      if (!content) return;
      const now = new Date().toISOString();
      const notes = readProfessionalNotes();
      notes.push({
        id: uid(),
        clientId: profile.id,
        visibility: $("#professionalNoteVisibility").value === "private" ? "private" : "shared",
        contextType: rawContext[0] || "global",
        contextId: rawContext[1] || "",
        contextDate: rawContext[2] || "",
        contextLabel: rawContext[3] || "Suivi général",
        content,
        createdAt: now,
        updatedAt: now,
      });
      writeProfessionalNotes(notes);
      renderFollowup();
    });
    $$('[data-delete-professional-note]').forEach((button) =>
      button.addEventListener("click", () => {
        if (!confirm("Supprimer cette note de suivi?")) return;
        writeProfessionalNotes(readProfessionalNotes().filter((note) => note.id !== button.dataset.deleteProfessionalNote));
        renderFollowup();
      }),
    );
  }
  function demoProfileCardsHtml() {
    const profiles = Object.values(window.EnergieDemoProfiles?.profiles || {});
    return `<details class="card demo-selector-card demo-selector-panel"><summary><span><small class="eyebrow">Accès privé</small><strong>Profils de démonstration</strong><small>Quatre parcours fictifs, toujours en lecture seule</small></span><span class="demo-selector-meta"><b>${profiles.length} profils</b><i aria-hidden="true">›</i></span></summary><div class="demo-selector-content"><div class="demo-profile-grid">${profiles.map((profile) => `<article class="demo-person-card ${db.settings.demoMode && db.settings.demoProfileId === profile.id ? "is-active" : ""}"><div class="demo-person-head"><span class="demo-person-avatar">${profile.icon}</span><div><h4>${esc(profile.name)}</h4><small>${esc(profile.scenario)}</small></div></div><p>${esc(profile.summary)}</p><button class="${db.settings.demoMode && db.settings.demoProfileId === profile.id ? "secondary" : "primary"} small" type="button" data-open-demo-profile="${profile.id}">${db.settings.demoMode && db.settings.demoProfileId === profile.id ? "Profil ouvert" : "Explorer"}</button></article>`).join("")}</div></div></details>`;
  }
  function demoLandingDate(profileId) {
    const dates = Object.keys(db.days || {}).sort();
    if (profileId === "elodie")
      return (
        dates
          .slice()
          .reverse()
          .find((date) => (db.days[date]?.observations || []).length) ||
        dates.at(-1) ||
        todayKey()
      );
    return dates.at(-1) || todayKey();
  }
  function switchDemoProfile(profileId) {
    if (!hasDemoAccess)
      return alert(
        "Cet accès de démonstration n’est pas activé pour ce compte.",
      );
    if (!db.settings.demoMode) {
      try {
        // Toujours remplacer une ancienne copie : elle peut provenir d'une
        // session démo interrompue et ne plus représenter le journal actuel.
        localStorage.setItem(DEMO_BACKUP_KEY, JSON.stringify(db));
      } catch (error) {
        console.warn("Copie avant démo non enregistrée", error);
      }
      backupRealBrainMemory();
    }
    db = createDemoDB(profileId);
    buildDemoBrainMemory(db);
    selectedDate = demoLandingDate(profileId);
    currentView = "today";
    try {
      saveLocal("profil-demo");
    } catch (error) {
      console.warn(error);
    }
    render();
  }

  function demoDiscoveryHtml() {
    if (db.settings.demoMode && db.settings.demoProfileId === "elodie")
      return `<section class="demo-discoveries" id="demoDiscoveries">
    <div class="demo-discoveries-heading">
      <div class="demo-heading-mascot"><img src="assets/icon.svg" alt=""></div>
      <div><p class="eyebrow">Ce que les observations globales racontent</p><h2>Des réactions parfois retardées ressortent après 90 jours</h2><p>Ces associations proviennent surtout des observations faites hors repas. Elles ne confirment pas une allergie au soya.</p></div>
    </div>
    <div class="demo-insight-grid">
      <article class="card demo-insight-card demo-insight-strong">
        <div class="demo-insight-top"><span class="demo-signal">Tendance forte</span><strong>84 %</strong></div>
        <div class="demo-insight-icon">🌿</div><h3>Soya et réactions cutanées retardées</h3>
        <p>Les démangeaisons, rougeurs, plaques d’urticaire ou poussées d’eczéma sont plus fréquentes dans les 48 heures suivant une exposition possible.</p>
        <div class="demo-comparison"><span><b>46 %</b><small>après exposition possible</small></span><i>contre</i><span><b>13 %</b><small>sans exposition repérée</small></span></div>
        <div class="demo-inline-proof"><b>Point d’ancrage</b><span>Les réactions ont été consignées dans Observations globales, puis rapprochées de la chronologie des repas précédents.</span></div>
      </article>
      <article class="card demo-insight-card">
        <div class="demo-insight-top"><span class="demo-signal moderate">Tendance modérée</span><strong>71 %</strong></div>
        <div class="demo-insight-icon">⏳</div><h3>Un délai de plusieurs heures</h3>
        <p>Plusieurs réactions sont remarquées le soir ou le lendemain plutôt qu’immédiatement après le repas.</p>
        <div class="demo-inline-proof"><b>Pourquoi c’est utile?</b><span>Le ressenti après repas seul aurait manqué une partie importante de ces manifestations.</span></div>
      </article>
      <article class="card demo-insight-card">
        <div class="demo-insight-top"><span class="demo-signal moderate">À surveiller</span><strong>6</strong></div>
        <div class="demo-insight-icon">🤢</div><h3>Quelques symptômes digestifs</h3>
        <p>Nausées ou douleurs abdominales apparaissent parfois, mais beaucoup moins souvent que les réactions cutanées.</p>
        <div class="demo-inline-proof"><b>Interprétation prudente</b><span>Le nombre d’épisodes reste trop faible pour tirer une conclusion clinique.</span></div>
      </article>
      <article class="card demo-insight-card">
        <div class="demo-insight-top"><span class="demo-signal emerging">Sécurité</span><strong>⚠️</strong></div>
        <div class="demo-insight-icon">😮‍💨</div><h3>Les signes graves ne sont pas banalisés</h3>
        <p>Une difficulté à respirer, un gonflement de la langue ou de la gorge, ou une réaction sévère exige une aide médicale urgente.</p>
        <div class="demo-inline-proof"><b>Dans cette démo</b><span>Aucune anaphylaxie ni obstruction respiratoire n’est simulée comme une observation ordinaire.</span></div>
      </article>
    </div>
    <p class="demo-legal-note">🍏⚡ Énergie aide à documenter une chronologie personnelle; l’application ne diagnostique pas une allergie.</p>
  </section>`;
    if (!db.settings.demoMode || db.settings.demoProfileId !== "marie")
      return "";
    return `<section class="demo-discoveries" id="demoDiscoveries">
    <div class="demo-discoveries-heading">
      <div class="demo-heading-mascot"><img src="assets/icon.svg" alt=""></div>
      <div><p class="eyebrow">Ce que tes données racontent</p><h2>4 tendances ressortent après 180 jours</h2><p>Ces observations décrivent des associations dans ce journal fictif. Elles ne prouvent pas qu’un aliment cause un symptôme.</p></div>
    </div>
    <div class="demo-insight-grid">
      <article class="card demo-insight-card demo-insight-strong">
        <div class="demo-insight-top"><span class="demo-signal">Tendance forte</span><strong>82 %</strong></div>
        <div class="demo-insight-icon">🥛</div>
        <h3>Produits laitiers et inconfort digestif</h3>
        <p>Les repas contenant du lait, du yogourt ou du fromage sont plus souvent suivis de ballonnements, gaz ou crampes dans ce journal.</p>
        <div class="demo-comparison"><span><b>38 %</b><small>avec produits laitiers</small></span><i>contre</i><span><b>11 %</b><small>sans produits laitiers</small></span></div>
        <div class="demo-inline-proof"><b>Pourquoi cette tendance?</b><span>20 épisodes digestifs après 52 repas avec produits laitiers, contre une fréquence nettement plus faible sans eux.</span></div><button class="why-demo-insight" type="button" data-demo-detail="lactose">Voir tous les détails →</button>
      </article>
      <article class="card demo-insight-card">
        <div class="demo-insight-top"><span class="demo-signal moderate">Tendance modérée</span><strong>74 %</strong></div>
        <div class="demo-insight-icon">☕</div>
        <h3>Café tardif et sommeil plus court</h3>
        <p>Les journées où un café est noté après 16 h sont associées à une nuit plus courte.</p>
        <div class="demo-comparison"><span><b>6 h 08</b><small>avec café tardif</small></span><i>contre</i><span><b>7 h 46</b><small>sans café tardif</small></span></div>
        <div class="demo-inline-proof"><b>Pourquoi cette tendance?</b><span>La nuit moyenne est plus courte après les journées comprenant un café après 16 h.</span></div><button class="why-demo-insight" type="button" data-demo-detail="coffee">Voir tous les détails →</button>
      </article>
      <article class="card demo-insight-card">
        <div class="demo-insight-top"><span class="demo-signal moderate">Tendance modérée</span><strong>69 %</strong></div>
        <div class="demo-insight-icon">💧</div>
        <h3>Hydratation et fatigue d’après-midi</h3>
        <p>Les journées avec moins de quatre verres sont plus souvent accompagnées d’une énergie faible.</p>
        <div class="demo-comparison"><span><b>46 %</b><small>faible hydratation</small></span><i>contre</i><span><b>17 %</b><small>bonne hydratation</small></span></div>
        <div class="demo-inline-proof"><b>Pourquoi cette tendance?</b><span>Les journées sous quatre verres contiennent plus souvent une note d’énergie faible.</span></div><button class="why-demo-insight" type="button" data-demo-detail="water">Voir tous les détails →</button>
      </article>
      <article class="card demo-insight-card">
        <div class="demo-insight-top"><span class="demo-signal emerging">Observation émergente</span><strong>61 %</strong></div>
        <div class="demo-insight-icon">🚶</div>
        <h3>Activité et humeur plus détendue</h3>
        <p>Après au moins 30 minutes d’activité, le ressenti « détendu » apparaît plus souvent en soirée.</p>
        <div class="demo-comparison"><span><b>2,4×</b><small>plus fréquent</small></span><i>sur</i><span><b>48</b><small>journées actives</small></span></div>
        <div class="demo-inline-proof"><b>Pourquoi cette tendance?</b><span>Le ressenti « détendu » apparaît 2,4 fois plus souvent après au moins 30 minutes d’activité.</span></div><button class="why-demo-insight" type="button" data-demo-detail="activity">Voir tous les détails →</button>
      </article>
    </div>
    <p class="demo-legal-note">🍏⚡ Énergie observe des tendances personnelles. Pour toute préoccupation médicale, consulte un professionnel de la santé.</p>
  </section>`;
  }
  function demoBannerHtml() {
    if (!db.settings.demoMode) return "";
    if (professionalDemoMode)
      return `<section class="demo-mode-banner professional-mode-banner" id="demoModeBanner"><div class="professional-banner-identity"><span class="professional-banner-avatar" aria-hidden="true">🧑‍⚕️</span><span class="professional-banner-copy"><small>Mode professionnel · Démo</small><strong>Client : ${esc(activeDemoProfile().name)}</strong></span></div><div class="professional-banner-actions"><button type="button" id="switchProfessionalClientBanner">Changer</button><button type="button" id="leaveDemoQuick">Quitter</button></div></section>`;
    return `<section class="demo-mode-banner" id="demoModeBanner">
    <span><img src="assets/icon.svg" alt=""> <b>Mode démo · lecture seule</b></span>
    <p>${activeDemoProfile().icon} ${esc(activeDemoProfile().name)} — ${esc(activeDemoProfile().scenario)}</p>
    <button type="button" id="leaveDemoQuick">Commencer mon journal</button>
  </section>`;
  }
  function bindDemoChrome() {
    $("#leaveDemoQuick")?.addEventListener("click", leaveDemoMode);
    $("#switchProfessionalClientBanner")?.addEventListener("click", openProfessionalClientPicker);
    $$(".why-demo-insight").forEach((button) =>
      button.addEventListener("click", () => {
        const details = {
          lactose: [
            "Produits laitiers et inconfort digestif",
            "Sur 52 repas contenant des produits laitiers, 20 sont suivis de ballonnements, gaz, crampes, gargouillis, nausées ou selles molles. Sur les autres repas, ces signes apparaissent beaucoup moins souvent. L’application présente donc une association à surveiller, pas une intolérance confirmée.",
          ],
          coffee: [
            "Café tardif et sommeil",
            "La durée de sommeil moyenne est plus faible après les 20 journées où un café a été inscrit après 16 h. D’autres facteurs peuvent aussi expliquer cette différence.",
          ],
          water: [
            "Hydratation et énergie",
            "Les notes d’énergie faible sont plus fréquentes lors des journées comptant moins de quatre verres. Les données ne permettent pas d’affirmer que le manque d’eau en est la cause.",
          ],
          activity: [
            "Activité et détente",
            "Le mot « détendu » est noté plus souvent après les journées comprenant au moins 30 minutes d’activité. Cette observation pourrait devenir plus fiable avec davantage de données.",
          ],
        };
        const [title, body] = details[button.dataset.demoDetail] || [
          "Observation",
          "",
        ];
        $("#sourceTitle").textContent = title;
        $("#sourceContent").innerHTML =
          `<div class="demo-detail-mascot"><img src="assets/icon.svg" alt=""></div><p>${body}</p><div class="notice info-notice"><strong>À retenir</strong><p>Une association n’est pas une preuve de cause à effet et ne constitue pas un diagnostic.</p></div>`;
        $("#sourceDialog").showModal();
      }),
    );
  }
  let demoReadOnlyGuardInstalled = false;
  function installDemoReadOnlyGuard() {
    if (demoReadOnlyGuardInstalled) return;
    demoReadOnlyGuardInstalled = true;
    document.addEventListener(
      "click",
      (event) => {
        if (!db.settings?.demoMode || !db.settings?.demoReadOnly) return;
        const control = event.target.closest(
          "button,input,select,textarea,label",
        );
        if (!control || !control.closest("#app")) return;
        if (
          control.closest(
            "[data-open-demo-profile],#leaveDemoProfile,#leaveDemoQuick,#switchProfessionalClientBanner,#replayDemoTour,.nav-item,.brain-proof,.why-demo-insight,#previousDay,#nextDay,#goToday,#analysisPreviousDay,#analysisNextDay,#analysisGoLatest,[data-global-observation],[data-quick-meal][data-edit-meal],.professional-followup,[data-open-trend-fullscreen],[data-close-trend-fullscreen],[data-trend-week-detail],[data-close-trend-week]",
          )
        )
          return;
        if (control.matches("details,summary") || control.closest("details"))
          return;
        event.preventDefault();
        event.stopImmediatePropagation();
        alert("Ce profil de démonstration est en lecture seule.");
      },
      true,
    );
    document.addEventListener(
      "submit",
      (event) => {
        if (!db.settings?.demoMode || !db.settings?.demoReadOnly) return;
        if (event.target.matches("#professionalNoteForm")) return;
        if (
          event.target.closest("#app") ||
          event.target.matches(
            "#mealForm,#sleepForm,#activityForm,#feelingForm,#globalObservationForm",
          )
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
          alert("Ce profil de démonstration est en lecture seule.");
        }
      },
      true,
    );
  }
  function renderDemoChrome() {
    installDemoReadOnlyGuard();
    document.body.classList.toggle("is-demo-mode", !!db.settings.demoMode);
    const appRoot = $("#app");
    if (db.settings.demoMode && appRoot && !$("#demoModeBanner")) {
      appRoot.insertAdjacentHTML("afterbegin", demoBannerHtml());
    }
    bindDemoChrome();
  }
  const EXPERIENCE_KEY = "energieExperienceV260";
  // Temporairement désactivé pendant les essais avec la nutritionniste.
  // Les profils fictifs demeurent accessibles manuellement dans Profil.
  const FIRST_LAUNCH_DEMO_ENABLED = false;
  // Accès temporairement ouvert à tous les comptes connectés pour les essais
  // avec les professionnels. Remettre à false pour réactiver has_demo_access.
  const DEMO_ACCESS_FOR_ALL_ACCOUNTS = true;
  const demoTourSteps = [
    {
      view: "today",
      target: ".meal-quick-grid",
      title: "Une journée, en un coup d’œil",
      text: "Phil voit immédiatement ses repas et peut compléter son journal en quelques secondes.",
      proof:
        "Les repas principaux et les collations restent accessibles sans transformer le journal en questionnaire.",
    },
    {
      view: "today",
      target: ".meal-quick-grid",
      title: "Noter un repas reste rapide",
      text: "Chaque repas conserve seulement le contexte utile : ce qui a été mangé, l’heure et l’évolution des ressentis avant et après.",
      proof:
        "La démo contient plus de 640 repas fictifs répartis sur six mois.",
    },
    {
      view: "today",
      target: ".wellbeing-detail-grid",
      title: "Le contexte change l’interprétation",
      text: "Le sommeil, l’eau et l’activité aident à éviter d’attribuer trop vite une mauvaise journée à un seul aliment.",
      proof:
        "Énergie observe plusieurs facteurs ensemble, sans prétendre identifier une cause.",
    },
    {
      view: "history",
      target: ".timeline",
      title: "Les journées deviennent une histoire",
      text: "L’historique regroupe les entrées par mois, semaine et journée pour rendre les répétitions faciles à retrouver.",
      proof:
        "Les résumés restent consultables; rien n’est caché derrière une conclusion automatique.",
    },
    {
      view: "insights",
      target: ".dashboard-overview, .grid",
      title: "Les graphiques donnent du recul",
      text: "Avec suffisamment de données, les moyennes et les variations deviennent visibles sans devoir relire chaque journée.",
      proof:
        "Les graphiques décrivent l’historique. Ils ne jugent pas les choix et ne fixent aucun objectif médical.",
    },
    {
      view: "insights",
      target: "#demoDiscoveries",
      title: "Énergie fait ressortir des associations",
      text: "Dans le journal fictif de Phil, certains contextes apparaissent plus souvent avant certains ressentis.",
      proof:
        "Une association est un signal à observer, jamais une preuve qu’un aliment cause un symptôme.",
    },
    {
      view: "insights",
      target: ".demo-insight-card",
      title: "Chaque tendance montre ses preuves",
      text: "Le niveau de confiance, les groupes comparés et l’explication sont visibles directement dans la carte.",
      proof:
        "Par exemple : 38 % d’inconforts digestifs avec produits laitiers, contre 11 % sans eux dans cette démo.",
    },
    {
      view: "profile",
      target: ".demo-profile-card",
      title: "Tu gardes toujours le contrôle",
      text: "Le profil permet de revoir la visite, de quitter la démo, de gérer les observations et de choisir la sauvegarde.",
      proof:
        "Les données fictives sont isolées. En quittant la démo, le vrai journal est restauré.",
    },
  ];

  function markExperienceSeen() {
    try {
      localStorage.setItem(EXPERIENCE_KEY, "1");
    } catch (_) {}
  }
  function showExperienceLaunchIfNeeded(force = false) {
    if (db.settings.demoMode) return;
    if (!FIRST_LAUNCH_DEMO_ENABLED) {
      markExperienceSeen();
      const launch = $("#experienceLaunch");
      if (launch) launch.hidden = true;
      return;
    }
    let seen = false;
    try {
      seen = localStorage.getItem(EXPERIENCE_KEY) === "1";
    } catch (_) {}
    const launch = $("#experienceLaunch");
    if (launch) launch.hidden = !force && seen;
  }
  function closeExperienceLaunch() {
    const launch = $("#experienceLaunch");
    if (launch) launch.hidden = true;
  }
  function startEmptyExperience() {
    markExperienceSeen();
    closeExperienceLaunch();
    db.settings.showWelcome = false;
    db.settings.demoMode = false;
    db.settings.demoTourSeen = true;
    saveLocal("premiere-ouverture-journal");
    currentView = "today";
    selectedDate = todayKey();
    render();
    setTimeout(() => openTrackedFeelingsDialog(true), 180);
  }
  function startDemoMode(profileId = "marie") {
    try {
      localStorage.setItem(DEMO_BACKUP_KEY, JSON.stringify(db));
    } catch (error) {
      console.warn("Copie avant démo non enregistrée", error);
    }
    backupRealBrainMemory();
    markExperienceSeen();
    closeExperienceLaunch();
    db = createDemoDB(profileId);
    buildDemoBrainMemory(db);
    selectedDate = todayKey();
    currentView = "today";
    try {
      saveLocal("demarrage-demo");
    } catch (error) {
      console.warn("Démo locale temporaire", error);
    }
    render();
    requestAnimationFrame(() => requestAnimationFrame(startDemoTour));
  }
  function leaveDemoMode() {
    if (
      !confirm(
        "Quitter la démo et revenir à ton journal? Les données fictives seront retirées.",
      )
    )
      return;
    let restored = null;
    try {
      const backup = localStorage.getItem(DEMO_BACKUP_KEY);
      if (backup) restored = migrate(JSON.parse(backup));
    } catch (error) {
      console.warn("Restauration impossible", error);
    }
    db = restored || freshDB();
    professionalDemoMode = false;
    db.settings.showWelcome = false;
    db.settings.demoMode = false;
    db.settings.demoTourSeen = true;
    restoreRealBrainMemory();
    try {
      localStorage.removeItem(DEMO_BACKUP_KEY);
    } catch (_) {}
    selectedDate = todayKey();
    currentView = "today";
    saveLocal("fin-demo");
    closeDemoGuide();
    render();
    if (session && navigator.onLine) {
      if (outbox().length) syncNow();
      else pullCloud(true);
    }
  }
  function clearDemoTourTarget() {
    $$(".demo-focus").forEach((el) => el.classList.remove("demo-focus"));
  }
  function findDemoTourTarget(selector) {
    for (const part of String(selector || "").split(",")) {
      const target = $(part.trim());
      if (target) return target;
    }
    return null;
  }
  function closeDemoGuide() {
    clearDemoTourTarget();
    const guide = $("#demoGuide");
    if (guide) guide.hidden = true;
    document.body.classList.remove("demo-guide-open");
  }
  function revealDemoTarget(target) {
    if (!target) return;
    target.classList.add("demo-focus");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function showDemoTourStep() {
    const step = demoTourSteps[demoTourIndex];
    if (!step) {
      finishDemoTour();
      return;
    }
    if (currentView !== step.view) {
      currentView = step.view;
      if (step.view === "today") selectedDate = todayKey();
      render();
    }
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const guide = $("#demoGuide");
        if (!guide || guide.hidden) return;
        clearDemoTourTarget();
        const target = findDemoTourTarget(step.target);
        $("#demoTourProgress").textContent =
          `Étape ${demoTourIndex + 1} sur ${demoTourSteps.length}`;
        $("#demoTourProgressBar").style.width =
          `${Math.round(((demoTourIndex + 1) / demoTourSteps.length) * 100)}%`;
        $("#demoTourTitle").textContent = step.title;
        $("#demoTourText").textContent = step.text;
        $("#demoTourProof").textContent = step.proof;
        $("#previousDemoTour").disabled = demoTourIndex === 0;
        $("#nextDemoTour").textContent =
          demoTourIndex === demoTourSteps.length - 1
            ? "Voir la conclusion"
            : "Continuer";
        revealDemoTarget(target);
      }),
    );
  }
  function startDemoTour() {
    if (!db.settings.demoMode) return;
    demoTourIndex = 0;
    const guide = $("#demoGuide");
    if (!guide) return;
    guide.hidden = false;
    document.body.classList.add("demo-guide-open");
    showDemoTourStep();
  }
  function finishDemoTour() {
    closeDemoGuide();
    db.settings.demoTourSeen = true;
    try {
      saveLocal("visite-demo");
    } catch (_) {}
    const dialog = $("#demoFinalDialog");
    if (dialog && !dialog.open) dialog.showModal();
  }
  function leaveDemoTourEarly() {
    closeDemoGuide();
    db.settings.demoTourSeen = true;
    try {
      saveLocal("visite-demo-ignoree");
    } catch (_) {}
  }
  function continueExploringDemo() {
    $("#demoFinalDialog")?.close();
    currentView = "insights";
    render();
    setTimeout(
      () =>
        $("#demoDiscoveries")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      100,
    );
  }

  function journalBrainStage(days) {
    const value = Math.max(0, Number(days) || 0);
    if (value < 25) return { plant: "🌱", label: "Jeune pousse", next: 25 };
    if (value < 50) return { plant: "🌿", label: "En croissance", next: 50 };
    if (value < 100) return { plant: "🌿", label: "Bien enraciné", next: 100 };
    return { plant: "🌳", label: "Arbre mature", next: null };
  }
  function journalBrainDailyMessage(dateKey) {
    const entries = Object.entries(db.days || {}).filter(
      ([date, day]) => date <= dateKey && (day?.meals || []).length,
    );
    const days = entries.length,
      meals = entries.reduce(
        (sum, [, day]) => sum + (day.meals || []).length,
        0,
      );
    const stage = journalBrainStage(days),
      previousDate = addDaysKey(dateKey, -1),
      previousMeals = [...(db.days?.[previousDate]?.meals || [])].sort((a, b) =>
        (b.time || "").localeCompare(a.time || ""),
      );
    const tagged = previousMeals.filter((meal) => meal.feeling?.tags?.length);
    const negative = tagged
      .map((meal) => ({
        meal,
        tag: (meal.feeling.tags || [])
          .map((id) => FEELING_TAGS.find((item) => item.id === id))
          .find((item) => item?.group === "symptom"),
      }))
      .find((item) => item.tag);
    const positive = tagged
      .map((meal) => ({
        meal,
        tag: (meal.feeling.tags || [])
          .map((id) => FEELING_TAGS.find((item) => item.id === id))
          .find((item) => item?.group === "positive"),
      }))
      .find((item) => item.tag);
    let eyebrow = "Le cerveau apprend",
      title = "Chaque journée nourrit ton arbre",
      text =
        "Continue simplement à noter tes repas et ton ressenti. Je compare progressivement les journées qui se ressemblent.";
    if (negative) {
      eyebrow = "Nouvelle observation mémorisée";
      title = `Hier, tu as noté ${negative.tag.label.toLowerCase()} après ${negative.meal.type.toLowerCase()}`;
      text =
        "Le cerveau en prend note et vérifiera si cette situation se répète avant de te présenter une tendance.";
    } else if (positive) {
      eyebrow = "Une information utile de plus";
      title = `Hier, tu as noté « ${positive.tag.label} » après ${positive.meal.type.toLowerCase()}`;
      text =
        "Cette observation positive nourrit aussi l’analyse et aide le cerveau à reconnaître les journées où tu te sens mieux.";
    } else if (days === 0) {
      eyebrow = "Le cerveau commence avec toi";
      title = "Ta première journée fera naître la pousse";
      text =
        "Un repas, un niveau d’énergie ou un ressenti suffit pour commencer à construire ta mémoire personnelle.";
    } else {
      const messages = [
        [
          "Analyse en cours",
          "Je compare maintenant tes repas avec ton énergie, ton sommeil et ton hydratation.",
        ],
        [
          "Ta mémoire grandit",
          "Chaque nouvelle journée m’aide à distinguer une vraie répétition d’une simple coïncidence.",
        ],
        [
          "Le cerveau reste prudent",
          "Je préfère attendre suffisamment de données plutôt que de te montrer une conclusion fragile.",
        ],
        [
          "Une journée de plus compte",
          "Même une journée sans symptôme aide à créer un meilleur point de comparaison.",
        ],
      ];
      const seed =
        [...dateKey].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
        messages.length;
      eyebrow = messages[seed][0];
      title = messages[seed][1];
      text = `${meals} repas et ${days} journée${days !== 1 ? "s" : ""} alimentent maintenant ton arbre de connaissances.`;
    }
    const previous = days < 25 ? 0 : days < 50 ? 25 : days < 100 ? 50 : 100;
    const progress = stage.next
      ? Math.max(
          4,
          Math.min(
            100,
            Math.round(((days - previous) / (stage.next - previous)) * 100),
          ),
        )
      : 100;
    return { ...stage, eyebrow, title, text, days, meals, progress };
  }
  function journalBrainCardHtml(dateKey) {
    const state = journalBrainDailyMessage(dateKey);
    return `<button type="button" class="card journal-brain-card" id="openJournalBrain" aria-label="Ouvrir le Cerveau"><span class="journal-brain-visual" aria-hidden="true"><span class="journal-brain-plant">${state.plant}</span><span class="journal-brain-icon">🧠</span></span><span class="journal-brain-copy"><span class="journal-brain-top"><span><small>${esc(state.eyebrow)}</small><strong>${esc(state.title)}</strong></span><b>›</b></span><span class="journal-brain-message">${esc(state.text)}</span><span class="journal-brain-progress"><i><em style="width:${state.progress}%"></em></i><small>${state.plant} ${esc(state.label)} · ${state.days} journée${state.days !== 1 ? "s" : ""}</small></span></span></button>`;
  }
  function render() {
    const demoDataVersions = { marie: "marie-dairy-v3", sophie: "sophie-fiber-v2", elodie: "elodie-soya-v2" };
    const activeDemoId = db.settings?.demoProfileId;
    if (
      db.settings?.demoMode &&
      demoDataVersions[activeDemoId] &&
      db.settings?.demoDataVersion !== demoDataVersions[activeDemoId]
    ) {
      db = createDemoDB(activeDemoId);
      selectedDate = demoLandingDate(activeDemoId);
      buildDemoBrainMemory(db);
      try { saveLocal("demo-data-refresh"); } catch (_) {}
    }
    if (selectedDate > todayKey()) selectedDate = todayKey();
    document.documentElement.dataset.theme =
      db.settings.theme === "dark" ? "dark" : "";
    updateLivingHeader();
    $("#todayLabel").textContent =
      currentView === "today"
        ? formatDate(selectedDate)
        : formatDate(todayKey());
    const showFollowup = !!db.settings.demoMode;
    const followupNav = $('[data-view="followup"]');
    if (followupNav) followupNav.hidden = !showFollowup;
    $(".bottom-nav")?.classList.toggle("has-followup", showFollowup);
    if (!showFollowup && currentView === "followup") currentView = "today";
    $$(".nav-item").forEach((b) =>
      b.classList.toggle("active", b.dataset.view === currentView),
    );
    updateSyncBadge();
    (
      ({
        today: renderToday,
        history: renderHistory,
        insights: renderInsights,
        brain: renderBrain,
        followup: renderFollowup,
        profile: renderProfile,
      })[currentView] || renderToday
    )();
    decorateSupplementIcons();
    renderDemoChrome();
    bindViewSwipe();
  }
  function mealCard(m, opts = {}) {
    const feeling = m.feeling;
    const favorite = favoriteForMeal(m);
    const feelingEligible = isFeelingEligible(m);
    const beforeCount = Object.keys(feelingScoresFor(m, "before")).length;
    const afterCount = Object.keys(feelingScoresFor(m, "after")).length;
    const feelingPreview = feelingEligible
      ? `<div class="meal-feeling-preview ${feeling ? "is-set" : "is-empty"}">${feeling ? `<span>Après · ${afterCount} ressenti${afterCount > 1 ? "s" : ""}</span>` : `<span>Ressenti après</span><small>À noter</small>`}</div>`
      : "";
    const visibleChanges = feelingChangesHtml(
      feelingScoresFor(m, "before"),
      feelingScoresFor(m, "after"),
      !!m.feeling,
      true,
    );
    return `<article class="card meal-card" data-meal="${m.id}" data-date="${m.date}"><div class="meal-thumb">${m.photoUrl || m.photoLocal ? `<img src="${esc(m.photoUrl || m.photoLocal)}" alt="">` : mealIcon(m.type, m.description)}</div><div class="meal-card-body"><h3>${esc(m.description)}</h3><div class="meal-meta">${esc(m.time)} · ${esc(t(m.type))}${opts.showDate ? ` · ${esc(formatDate(m.date))}` : ""}</div>${nutritionVisibleToViewer() && m.nutrition ? `<div class="meal-macros">≈ ${esc(nutritionText(m.nutrition))}</div>` : ""}${feelingPreview}<div class="meal-footer">${beforeCount ? `<span class="chip">Avant · ${beforeCount}</span>` : ""}${feelingEligible ? `<button class="meal-feeling-inline ${feeling ? "is-set" : "is-empty"}" data-feeling="${m.id}" title="${feeling ? "Modifier les ressentis après" : "Ajouter les ressentis après"}">${feeling ? `Après · ${afterCount}` : "Ressenti après"}</button>` : ""}</div>${visibleChanges ? `<div class="meal-card-feeling-changes">${visibleChanges}</div>` : ""}</div><div class="meal-actions">${feelingEligible ? `<button class="feeling-meal" data-feeling="${m.id}" title="${feeling ? "Modifier les ressentis après" : "Ajouter les ressentis après"}">${feeling ? "😊" : "＋😊"}</button>` : ""}<button class="favorite-meal ${favorite ? "is-favorite" : ""}" data-favorite="${m.id}" title="${favorite ? "Retirer des favoris" : "Ajouter aux favoris"}">${favorite ? "★" : "☆"}</button><button class="delete-meal" data-delete="${m.id}" title="Supprimer">×</button></div></article>`;
  }
  function bindMealCards() {
    $$("[data-meal]").forEach(
      (c) =>
        (c.onclick = (e) => {
          if (e.target.closest("button")) return;
          selectedDate = c.dataset.date || selectedDate;
          openMeal(c.dataset.meal);
        }),
    );
    $$("[data-delete]").forEach(
      (b) =>
        (b.onclick = (e) => {
          e.stopPropagation();
          const card = b.closest("[data-meal]"),
            d = ensureDay(db, card.dataset.date),
            m = d.meals.find((x) => x.id === b.dataset.delete);
          if (m && confirm("Supprimer ce repas?")) {
            deleteMealLocal(m);
            render();
          }
        }),
    );
    $$("[data-favorite]").forEach(
      (b) =>
        (b.onclick = (e) => {
          e.stopPropagation();
          const card = b.closest("[data-meal]"),
            m = ensureDay(db, card.dataset.date).meals.find(
              (x) => x.id === b.dataset.favorite,
            );
          if (!m) return;
          const favorite = favoriteForMeal(m);
          if (favorite) {
            if (confirm(`Retirer « ${favorite.name} » des favoris?`)) {
              deleteFavoriteLocal(favorite);
              render();
            }
          } else createFavoriteFromMeal(m);
        }),
    );
    $$("[data-feeling]").forEach(
      (b) =>
        (b.onclick = (e) => {
          e.stopPropagation();
          const card = b.closest("[data-meal]");
          selectedDate = card.dataset.date;
          openFeeling(b.dataset.feeling);
        }),
    );
    hydratePhotoUrls();
  }
  function mealTypeSummary(meals, type) {
    const list = meals
      .filter((m) => m.type === type)
      .sort((a, b) => a.time.localeCompare(b.time));
    return type === "Collation" ? list : list.slice(0, 1);
  }
  function recentUniqueSnacks(limit = 10) {
    const seen = new Set();
    return allMeals()
      .filter((meal) => meal.type === "Collation" && meal.description?.trim())
      .sort((a, b) =>
        `${b.date}T${b.time || "00:00"}`.localeCompare(
          `${a.date}T${a.time || "00:00"}`,
        ),
      )
      .filter((meal) => {
        const key = normalizeFoodText(meal.description);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);
  }
  function addRecentSnack(source) {
    if (!source) return;
    const now = new Date(),
      meal = normalMeal(
        {
          date: selectedDate,
          type: "Collation",
          time: now.toTimeString().slice(0, 5),
          description: source.description,
          // Les notes peuvent contenir un ancien contexte digestif ou émotionnel;
          // elles ne sont donc jamais recopiées lors d'un ajout rapide.
          notes: "",
          nutrition: source.nutrition ? { ...source.nutrition } : null,
          feelingsBefore: {},
          feelingsBeforeQuality: null,
          feeling: null,
          photoLocal: null,
          photoUrl: null,
          photoPath: null,
          foodReview: null,
          recommendation: null,
          feelingNotifiedAt: null,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
        selectedDate,
      );
    ensureDay(db, selectedDate).meals.push(meal);
    setMealChanged(meal);
    try {
      window.Brain?.learnMeal?.(meal);
    } catch (memoryError) {
      console.warn("Mémoire alimentaire", memoryError);
    }
    $("#snackManagerDialog").close();
    render();
  }
  function setQuickSnackAiStatus(message, state = "") {
    const el = $("#quickSnackAiStatus");
    if (!el) return;
    el.textContent = message;
    el.className = state ? `is-${state}` : "";
  }
  function updateQuickSnackUi() {
    const description = $("#quickSnackDescription")?.value.trim() || "";
    $("#saveQuickSnack").disabled = !description;
    const preview = $("#quickSnackPhotoPreview");
    preview.hidden = !quickSnackPhotoData;
    if (quickSnackPhotoData) $("#quickSnackPhotoImage").src = quickSnackPhotoData;
  }
  async function analyzeQuickSnackPhoto(imageData) {
    if (!client || !session) {
      setQuickSnackAiStatus("Connecte-toi pour utiliser l’analyse IA.", "error");
      return;
    }
    setQuickSnackAiStatus("Analyse de la photo en cours…", "loading");
    try {
      const comma = imageData.indexOf(",");
      const { data, error } = await client.functions.invoke("analyze-meal-photo", {
        body: {
          imageBase64: comma >= 0 ? imageData.slice(comma + 1) : imageData,
          mimeType: "image/jpeg",
          locale: "fr-CA",
        },
      });
      if (error) throw error;
      const description = String(data?.description || "").trim();
      if (!description) throw new Error("Réponse vide");
      const field = $("#quickSnackDescription");
      if (!field.value.trim()) field.value = description;
      else if (!field.value.toLocaleLowerCase("fr-CA").includes(description.toLocaleLowerCase("fr-CA")))
        field.value = `${field.value.trim().replace(/[\s,;]+$/, "")}, ${description}`;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      setQuickSnackAiStatus("Description ajoutée — corrige-la au besoin.", "success");
    } catch (error) {
      console.warn("Analyse IA de la collation impossible", error);
      setQuickSnackAiStatus("Analyse indisponible. La photo est quand même conservée.", "error");
    }
  }
  function saveQuickSnack() {
    const description = $("#quickSnackDescription").value.trim();
    if (!description) return;
    const now = new Date(),
      meal = normalMeal({
        date: selectedDate,
        type: "Collation",
        time: now.toTimeString().slice(0, 5),
        description,
        notes: "",
        nutrition: null,
        feelingsBefore: {},
        feelingsBeforeQuality: null,
        feeling: null,
        photoLocal: quickSnackPhotoData,
        photoUrl: null,
        photoPath: null,
        foodReview: null,
        recommendation: null,
        feelingNotifiedAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }, selectedDate);
    ensureDay(db, selectedDate).meals.push(meal);
    setMealChanged(meal);
    try {
      window.Brain?.learnMeal?.(meal);
    } catch (error) {
      console.warn("Mémoire alimentaire", error);
    }
    $("#snackManagerDialog").close();
    render();
  }
  function openSnackManager() {
    const d = ensureDay(db, selectedDate),
      snacks = d.meals
        .filter((m) => m.type === "Collation")
        .sort((a, b) => a.time.localeCompare(b.time)),
      list = $("#snackManagerList"),
      recentList = $("#recentSnackList"),
      addSelected = $("#addSelectedSnack"),
      recentSnacks = recentUniqueSnacks();
    selectedRecentSnackId = null;
    quickSnackPhotoData = null;
    $("#quickSnackDescription").value = "";
    $("#quickSnackPhoto").value = "";
    setQuickSnackAiStatus("Vérifie toujours la description proposée.");
    updateQuickSnackUi();
    list.innerHTML = snacks.length
      ? snacks
          .map(
            (m) =>
              `<article class="snack-manager-item"><button type="button" class="snack-manager-main" data-edit-snack="${m.id}"><span>${mealIcon(m.type, m.description)}</span><span><strong>${esc(m.description)}</strong><small>${esc(m.time)}</small></span></button><button type="button" class="snack-manager-delete" data-delete-snack="${m.id}" aria-label="Supprimer ${esc(m.description)}">🗑️</button></article>`,
          )
          .join("")
      : '<p class="muted small">Aucune collation enregistrée.</p>';
    recentList.innerHTML = recentSnacks.length
      ? recentSnacks
          .map((meal) => {
            const dateLabel =
              meal.date === todayKey()
                ? "Aujourd’hui"
                : localDate(meal.date).toLocaleDateString("fr-CA", {
                    day: "numeric",
                    month: "short",
                  });
            return `<button type="button" class="recent-snack-choice" data-recent-snack="${meal.id}" aria-pressed="false"><span class="recent-snack-radio" aria-hidden="true"></span><span class="recent-snack-icon">${mealIcon("Collation", meal.description)}</span><span class="recent-snack-copy"><strong>${esc(meal.description)}</strong><small>Dernière fois · ${esc(dateLabel)} à ${esc(meal.time || "")}</small></span></button>`;
          })
          .join("")
      : '<p class="muted small recent-snack-empty">Tes collations récentes apparaîtront ici.</p>';
    addSelected.disabled = true;
    $$('[data-recent-snack]').forEach((button) => {
      button.onclick = () => {
        selectedRecentSnackId = button.dataset.recentSnack;
        $$('[data-recent-snack]').forEach((item) => {
          const selected = item === button;
          item.classList.toggle("is-selected", selected);
          item.setAttribute("aria-pressed", String(selected));
        });
        addSelected.disabled = false;
      };
    });
    addSelected.onclick = () => {
      const source = recentSnacks.find(
        (meal) => meal.id === selectedRecentSnackId,
      );
      addRecentSnack(source);
    };
    $("#quickSnackDescription").oninput = updateQuickSnackUi;
    $("#quickSnackPhoto").onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        quickSnackPhotoData = await fileToDataUrl(file);
        updateQuickSnackUi();
        await analyzeQuickSnackPhoto(quickSnackPhotoData);
      } catch (error) {
        console.warn("Photo de collation illisible", error);
        setQuickSnackAiStatus("Cette photo n’a pas pu être lue.", "error");
      }
    };
    $("#removeQuickSnackPhoto").onclick = () => {
      quickSnackPhotoData = null;
      $("#quickSnackPhoto").value = "";
      setQuickSnackAiStatus("Vérifie toujours la description proposée.");
      updateQuickSnackUi();
    };
    $("#quickSnackBarcode").onclick = () => openBarcodeScanner("quickSnackDescription");
    $("#saveQuickSnack").onclick = saveQuickSnack;
    $$("[data-edit-snack]").forEach(
      (b) =>
        (b.onclick = () => {
          $("#snackManagerDialog").close();
          openMeal(b.dataset.editSnack);
        }),
    );
    $$("[data-delete-snack]").forEach(
      (b) =>
        (b.onclick = () => {
          const m = d.meals.find((x) => x.id === b.dataset.deleteSnack);
          if (m && confirm(`Supprimer « ${m.description} »?`)) {
            deleteMealLocal(m);
            openSnackManager();
            render();
          }
        }),
    );
    $("#addAnotherSnack").onclick = () => {
      $("#snackManagerDialog").close();
      openMeal(null, "Collation");
    };
    $("#snackManagerDialog").showModal();
  }
  function mealQuickCard(type, icon, meals) {
    const found = mealTypeSummary(meals, type),
      main = found[0],
      count = found.length;
    const done = type === "Collation" ? count > 0 : !!main;
    const subtitle =
      type === "Collation"
        ? count
          ? `${count} collation${count > 1 ? "s" : ""} notée${count > 1 ? "s" : ""}`
          : "Plusieurs possibles"
        : main
          ? `${esc(main.description)} · ${esc(main.time)}`
          : "À ajouter";
    const actionIcon =
      main && type !== "Collation"
        ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4.2L19 9.2a2 2 0 0 0 0-2.8L17.6 5a2 2 0 0 0-2.8 0L4 15.8V20Zm2-3.4 10.2-10.2 1.4 1.4L7.4 18H6v-1.4Z"/></svg>`
        : "+";
    const actionLabel =
      main && type !== "Collation" ? `Modifier ${type}` : `Ajouter ${type}`;
    const visibleChanges = main
      ? feelingChangesHtml(feelingScoresFor(main, "before"), feelingScoresFor(main, "after"), !!main.feeling, true)
      : "";
    return `<button class="meal-quick-card ${done ? "is-complete" : ""} ${visibleChanges ? "has-feeling-changes" : ""}" data-quick-meal="${esc(type)}" ${main && type !== "Collation" ? `data-edit-meal="${main.id}"` : ""} aria-label="${esc(actionLabel)}"><span class="meal-quick-icon">${done && type !== "Collation" ? "✓" : icon}</span><span><strong>${esc(t(type))}</strong><small>${subtitle}</small></span><span class="meal-quick-action">${actionIcon}</span>${visibleChanges ? `<span class="meal-quick-feeling-changes">${visibleChanges}</span>` : ""}</button>`;
  }
  function changeJournalDay(offset) {
    const nextDate = addDaysKey(selectedDate, offset);
    if (db.settings?.demoMode) {
      const c = demoAnalysisContext();
      if (c && (nextDate < c.first || nextDate > c.last)) return;
    } else if (nextDate > todayKey()) return;
    selectedDate = nextDate;
    render();
  }
  function bindJournalSwipe() {
    const target = $(".journal-date-nav");
    if (!target) return;
    let startX = 0,
      startY = 0;
    target.addEventListener(
      "touchstart",
      (e) => {
        const t = e.changedTouches[0];
        startX = t.clientX;
        startY = t.clientY;
      },
      { passive: true },
    );
    target.addEventListener(
      "touchend",
      (e) => {
        const t = e.changedTouches[0],
          dx = t.clientX - startX,
          dy = t.clientY - startY;
        if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.4)
          changeJournalDay(dx > 0 ? -1 : 1);
      },
      { passive: true },
    );
  }
  function viewSwipeOrder() {
    return db.settings.demoMode
      ? ["today", "history", "insights", "brain", "followup", "profile"]
      : ["today", "history", "insights", "brain", "profile"];
  }
  function bindViewSwipe() {
    const target = $("#app");
    if (!target || target.dataset.viewSwipeBound === "1") return;
    target.dataset.viewSwipeBound = "1";
    let startX = 0,
      startY = 0,
      startTarget = null;
    target.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        startTarget = e.target;
      },
      { passive: true },
    );
    target.addEventListener(
      "touchend",
      (e) => {
        if (!startTarget || document.querySelector("dialog[open]")) return;
        const touch = e.changedTouches[0],
          dx = touch.clientX - startX,
          dy = touch.clientY - startY;
        const isHorizontal =
          Math.abs(dx) >= 75 && Math.abs(dx) > Math.abs(dy) * 1.45;
        if (!isHorizontal) return;
        if (
          startTarget.closest(
            'input,textarea,select,[contenteditable="true"],.journal-date-nav,.horizontal-scroll,.chart-scroll',
          )
        )
          return;
        const order = viewSwipeOrder();
        const index = order.indexOf(currentView);
        if (index < 0) return;
        const nextIndex = dx < 0 ? index + 1 : index - 1;
        if (nextIndex < 0 || nextIndex >= order.length) return;
        const was = currentView;
        currentView = order[nextIndex];
        if (currentView === "today" && was !== "today")
          selectedDate = todayKey();
        render();
      },
      { passive: true },
    );
  }
  const FEELING_CATEGORIES = [
    { id: "positive", emoji: "👌", label: "Ressenti général" },
    { id: "digestion", emoji: "🍽️", label: "Digestion" },
    { id: "energy_state", emoji: "⚡", label: "Énergie" },
    { id: "head_senses", emoji: "🧠", label: "Tête et sens" },
    {
      id: "reactions",
      emoji: "🌿",
      label: "Peau et respiration",
    },
    { id: "mood", emoji: "❤️", label: "Humeur et envies" },
    { id: "other_physical", emoji: "🩺", label: "Autres signes" },
  ];
  const FEELING_TAGS = [
    {
      id: "no_tracked_symptoms",
      emoji: "✅",
      label: "Aucun des ressentis suivis",
      group: "neutral",
      category: "positive",
      fixedScore: 0,
      scopedOnly: true,
    },
    {
      id: "feeling_good",
      emoji: "👌",
      label: "Rien de particulier",
      group: "neutral",
      category: "positive",
      fixedScore: 0,
    },
    {
      id: "stable_energy",
      emoji: "🔋",
      label: "Bonne énergie",
      group: "positive",
      category: "positive",
      deprecated: true,
    },
    {
      id: "energy",
      emoji: "⚡",
      label: "Plus énergique",
      group: "positive",
      category: "positive",
      deprecated: true,
    },
    {
      id: "satisfied",
      emoji: "🥗",
      label: "Rassasié",
      group: "positive",
      category: "positive",
      afterOnly: true,
      deprecated: true,
    },
    {
      id: "easy_digestion",
      emoji: "😌",
      label: "Digestion confortable ou sensation de légèreté",
      group: "positive",
      category: "positive",
      deprecated: true,
    },
    {
      id: "light_after_meal",
      emoji: "🪶",
      label: "Léger après le repas",
      group: "positive",
      category: "positive",
      afterOnly: true,
      deprecated: true,
    },
    {
      id: "focus",
      emoji: "🧠",
      label: "Bonne concentration",
      group: "positive",
      category: "positive",
      deprecated: true,
    },
    {
      id: "good_mood",
      emoji: "😊",
      label: "Bonne humeur",
      group: "positive",
      category: "positive",
      deprecated: true,
    },
    {
      id: "calm",
      emoji: "🧘",
      label: "Calme ou détendu",
      group: "positive",
      category: "positive",
      deprecated: true,
    },

    {
      id: "bloating",
      emoji: "🎈",
      label: "Ballonnements",
      group: "symptom",
      category: "digestion",
    },
    {
      id: "gas",
      emoji: "💨",
      label: "Gaz",
      group: "symptom",
      category: "digestion",
    },
    {
      id: "stomachache",
      emoji: "🤢",
      label: "Douleurs ou crampes abdominales",
      group: "symptom",
      category: "digestion",
    },
    {
      id: "cramps",
      emoji: "🫄",
      label: "Crampes abdominales",
      group: "symptom",
      category: "digestion",
      deprecated: true,
    },
    {
      id: "reflux",
      emoji: "🔥",
      label: "Reflux ou brûlures d’estomac",
      group: "symptom",
      category: "digestion",
    },
    {
      id: "nausea",
      emoji: "🤮",
      label: "Nausées ou vomissements",
      group: "symptom",
      category: "digestion",
    },
    {
      id: "vomiting",
      emoji: "🤮",
      label: "Vomissements",
      group: "symptom",
      category: "digestion",
      deprecated: true,
    },
    {
      id: "diarrhea",
      emoji: "🚻",
      label: "Diarrhée ou selles urgentes",
      group: "symptom",
      category: "digestion",
    },
    {
      id: "constipation",
      emoji: "🧱",
      label: "Constipation",
      group: "symptom",
      category: "digestion",
    },
    {
      id: "urgent_stool",
      emoji: "⏱️",
      label: "Selles urgentes",
      group: "symptom",
      category: "digestion",
      deprecated: true,
    },
    {
      id: "heaviness",
      emoji: "🪨",
      label: "Lourdeur ou digestion lente",
      group: "symptom",
      category: "digestion",
    },
    {
      id: "slow_digestion",
      emoji: "🐢",
      label: "Digestion lente",
      group: "symptom",
      category: "digestion",
      deprecated: true,
    },
    {
      id: "hungry_soon",
      emoji: "🍽️",
      label: "Faim rapidement après le repas",
      group: "symptom",
      category: "digestion",
      afterOnly: true,
    },
    {
      id: "low_appetite",
      emoji: "🥄",
      label: "Perte d’appétit",
      group: "symptom",
      category: "digestion",
    },

    {
      id: "fatigue",
      emoji: "😴",
      label: "Fatigue, manque d’énergie ou envie de dormir",
      group: "symptom",
      category: "energy_state",
    },
    {
      id: "sleepiness",
      emoji: "🥱",
      label: "Somnolence ou envie de dormir",
      group: "symptom",
      category: "energy_state",
      deprecated: true,
    },
    {
      id: "energy_drop",
      emoji: "📉",
      label: "Baisse d’énergie",
      group: "symptom",
      category: "energy_state",
      deprecated: true,
    },
    {
      id: "weakness",
      emoji: "🫠",
      label: "Faiblesse, étourdissements ou tremblements",
      group: "symptom",
      category: "energy_state",
    },
    {
      id: "dizziness",
      emoji: "😵",
      label: "Étourdissements",
      group: "symptom",
      category: "energy_state",
      deprecated: true,
    },
    {
      id: "trembling",
      emoji: "🫨",
      label: "Tremblements",
      group: "symptom",
      category: "energy_state",
      deprecated: true,
    },
    {
      id: "brain_fog",
      emoji: "🌫️",
      label: "Brouillard mental ou concentration difficile",
      group: "symptom",
      category: "energy_state",
    },
    {
      id: "poor_focus",
      emoji: "🌀",
      label: "Difficulté à se concentrer",
      group: "symptom",
      category: "energy_state",
      deprecated: true,
    },

    {
      id: "headache",
      emoji: "🤕",
      label: "Mal de tête ou migraine",
      group: "symptom",
      category: "head_senses",
    },
    {
      id: "migraine",
      emoji: "🧠",
      label: "Migraine",
      group: "symptom",
      category: "head_senses",
      deprecated: true,
    },
    {
      id: "light_sensitivity",
      emoji: "☀️",
      label: "Sensibilité à la lumière, au bruit ou aux odeurs",
      group: "symptom",
      category: "head_senses",
    },
    {
      id: "sound_sensitivity",
      emoji: "🔊",
      label: "Sensibilité au bruit",
      group: "symptom",
      category: "head_senses",
      deprecated: true,
    },
    {
      id: "smell_sensitivity",
      emoji: "👃",
      label: "Sensibilité aux odeurs",
      group: "symptom",
      category: "head_senses",
      deprecated: true,
    },
    {
      id: "blurred_vision",
      emoji: "👁️",
      label: "Vision trouble",
      group: "symptom",
      category: "head_senses",
    },

    {
      id: "itching",
      emoji: "🫳",
      label: "Démangeaisons ou rougeurs",
      group: "symptom",
      category: "reactions",
    },
    {
      id: "redness",
      emoji: "🔴",
      label: "Rougeurs",
      group: "symptom",
      category: "reactions",
      deprecated: true,
    },
    {
      id: "hives",
      emoji: "🌡️",
      label: "Urticaire",
      group: "symptom",
      category: "reactions",
    },
    {
      id: "swelling",
      emoji: "🫧",
      label: "Gonflement",
      group: "symptom",
      category: "reactions",
    },
    {
      id: "congestion",
      emoji: "🤧",
      label: "Congestion ou éternuements",
      group: "symptom",
      category: "reactions",
    },
    {
      id: "sneezing",
      emoji: "🤧",
      label: "Éternuements",
      group: "symptom",
      category: "reactions",
      deprecated: true,
    },
    {
      id: "throat_irritation",
      emoji: "🗣️",
      label: "Gorge irritée",
      group: "symptom",
      category: "reactions",
    },

    {
      id: "irritability",
      emoji: "😠",
      label: "Irritabilité ou humeur basse",
      group: "symptom",
      category: "mood",
    },
    {
      id: "stress",
      emoji: "😥",
      label: "Stress ou anxiété",
      group: "symptom",
      category: "mood",
    },
    {
      id: "anxiety",
      emoji: "😟",
      label: "Anxiété",
      group: "symptom",
      category: "mood",
      deprecated: true,
    },
    {
      id: "low_mood",
      emoji: "😔",
      label: "Humeur basse",
      group: "symptom",
      category: "mood",
      deprecated: true,
    },
    {
      id: "sugar_craving",
      emoji: "🍬",
      label: "Envie intense de sucre",
      group: "symptom",
      category: "mood",
      deprecated: true,
    },
    {
      id: "craving",
      emoji: "🍪",
      label: "Fringale ou envie de sucre",
      group: "symptom",
      category: "mood",
    },

    {
      id: "palpitations",
      emoji: "💓",
      label: "Palpitations",
      group: "symptom",
      category: "other_physical",
    },
    {
      id: "hot_flash",
      emoji: "🥵",
      label: "Variation inhabituelle de température",
      group: "symptom",
      category: "other_physical",
    },
    {
      id: "chills",
      emoji: "🥶",
      label: "Frissons",
      group: "symptom",
      category: "other_physical",
      deprecated: true,
    },
    {
      id: "unusual_thirst",
      emoji: "💧",
      label: "Soif ou urines inhabituelles",
      group: "symptom",
      category: "other_physical",
    },
    {
      id: "frequent_urination",
      emoji: "🚻",
      label: "Envie fréquente d’uriner",
      group: "symptom",
      category: "other_physical",
      deprecated: true,
    },
    {
      id: "muscle_pain",
      emoji: "💪",
      label: "Douleur musculaire",
      group: "symptom",
      category: "other_physical",
    },
    {
      id: "other_report",
      emoji: "✍️",
      label: "Autre chose à signaler",
      group: "neutral",
      category: "other_physical",
      scopedOnly: true,
    },
  ];
  window.ENERGIE_FEELING_TAGS = FEELING_TAGS.map((tag) => ({ ...tag }));
  function trackedFeelingIds() {
    const valid = new Set(
      FEELING_TAGS.filter((tag) => tag.group === "symptom" && !tag.deprecated).map((tag) => tag.id),
    );
    return normalizeFeelingIds(db.settings?.trackedFeelingIds || []).filter((id) => valid.has(id));
  }
  function trackedFeelingsProfileHtml() {
    const ids = trackedFeelingIds(),
      tags = ids.map((id) => FEELING_TAGS.find((tag) => tag.id === id)).filter(Boolean);
    return `<div class="tracked-feelings-profile"><div class="tracked-feelings-profile-head"><div><p class="eyebrow">Ce que tu veux observer</p><h4>Mes ressentis suivis</h4></div><strong>${tags.length}</strong></div><p class="muted small">Seuls les ressentis qui comptent pour toi apparaissent avant et après les repas.</p>${tags.length ? `<div class="tracked-feelings-summary">${tags.map((tag) => `<span>${tag.emoji} ${esc(t(tag.label))}</span>`).join("")}</div>` : `<p class="tracked-feelings-empty">Choisis ce que tu souhaites observer pour simplifier tes saisies.</p>`}<button type="button" class="secondary" id="editTrackedFeelings">${tags.length ? "Modifier mes ressentis" : "Choisir mes ressentis"}</button></div>`;
  }
  function trackedFeelingsChooserHtml(selectedIds = []) {
    const selected = new Set(selectedIds);
    return FEELING_CATEGORIES.filter((category) => category.id !== "positive").map((category) => {
      const tags = FEELING_TAGS.filter((tag) => tag.category === category.id && tag.group === "symptom" && !tag.deprecated);
      if (!tags.length) return "";
      return `<details class="tracked-feelings-group" ${tags.some((tag) => selected.has(tag.id)) ? "open" : ""}><summary><span>${category.emoji} ${esc(t(category.label))}</span><small>${tags.filter((tag) => selected.has(tag.id)).length}/${tags.length}</small></summary><div>${tags.map((tag) => `<label><input type="checkbox" data-tracked-feeling="${tag.id}" ${selected.has(tag.id) ? "checked" : ""}><span>${tag.emoji} ${esc(t(tag.label))}</span></label>`).join("")}</div></details>`;
    }).join("");
  }
  function updateTrackedFeelingsDialogCount() {
    const count = $$('[data-tracked-feeling]:checked').length,
      label = $("#trackedFeelingsCount");
    if (label) label.textContent = `${count} sélectionné${count === 1 ? "" : "s"}`;
    $("#trackedFeelingsError").hidden = true;
    $$(".tracked-feelings-group").forEach((group) => {
      const small = group.querySelector("summary small"),
        total = group.querySelectorAll("[data-tracked-feeling]").length,
        chosen = group.querySelectorAll("[data-tracked-feeling]:checked").length;
      if (small) small.textContent = `${chosen}/${total}`;
    });
  }
  function openTrackedFeelingsDialog(firstRun = false) {
    const dialog = $("#trackedFeelingsDialog");
    if (!dialog) return;
    dialog.dataset.firstRun = firstRun ? "true" : "false";
    $("#closeTrackedFeelings").hidden = firstRun;
    $("#trackedFeelingsChoices").innerHTML = trackedFeelingsChooserHtml(trackedFeelingIds());
    $$('[data-tracked-feeling]').forEach((input) => input.addEventListener("change", updateTrackedFeelingsDialogCount));
    $("#clearTrackedFeelings").onclick = () => {
      $$('[data-tracked-feeling]').forEach((input) => { input.checked = false; });
      updateTrackedFeelingsDialogCount();
    };
    updateTrackedFeelingsDialogCount();
    dialog.showModal();
  }
  $("#closeTrackedFeelings").onclick = () => $("#trackedFeelingsDialog").close();
  $("#trackedFeelingsDialog").addEventListener("cancel", (event) => {
    if (event.currentTarget.dataset.firstRun === "true") event.preventDefault();
  });
  $("#trackedFeelingsForm").onsubmit = (event) => {
    event.preventDefault();
    const ids = $$('[data-tracked-feeling]:checked').map((input) => input.dataset.trackedFeeling);
    if (!ids.length) {
      $("#trackedFeelingsError").hidden = false;
      return;
    }
    db.settings.trackedFeelingIds = normalizeFeelingIds(ids);
    db.settings.trackedFeelingsConfigured = true;
    saveLocal("ressentis-suivis");
    $("#trackedFeelingsDialog").close();
    render();
  };
  function feelingEmoji(r) {
    return ["", "😞", "😐", "🙂", "😄", "😁"][Number(r) || 0] || "🙂";
  }
  function averageFeelingScore(scores = {}) {
    const values = Object.entries(normalizeFeelingScores(scores))
      .filter(([id]) => !["feeling_good", "no_tracked_symptoms"].includes(id))
      .map(([, score]) => score);
    return values.length
      ? Math.round(values.reduce((sum, n) => sum + n, 0) / values.length)
      : null;
  }
  function feelingScoresFor(meal, period = "after") {
    if (period === "before")
      return normalizeFeelingScores(meal?.feelingsBefore);
    const saved = normalizeFeelingScores(meal?.feeling?.scores);
    if (Object.keys(saved).length) return saved;
    const fallback = Number(meal?.feeling?.rating) || 3;
    return Object.fromEntries(
      (meal?.feeling?.tags || []).map((id) => [id, fallback]),
    );
  }
  function feelingTagsForMode(mode, selectedIds = []) {
    const plan = activeProfessionalTrackingPlan(),
      selected = new Set(selectedIds || []);
    return FEELING_TAGS.filter((tag) => {
      if (mode === "before" && tag.afterOnly) return false;
      if (tag.deprecated && !selected.has(tag.id)) return false;
      if (!plan && db.settings?.trackedFeelingsConfigured) {
        const tracked = new Set(trackedFeelingIds());
        return tag.scopedOnly || tracked.has(tag.id) || selected.has(tag.id);
      }
      if (!plan) return !tag.scopedOnly;
      if (tag.id === "feeling_good" && !selected.has(tag.id)) return false;
      return tag.scopedOnly || plan.feelingIds.includes(tag.id) || selected.has(tag.id);
    });
  }
  function scoredFeelingPickerHtml(mode, scores = {}) {
    const selected = normalizeFeelingScores(scores),
      availableTags = feelingTagsForMode(mode, Object.keys(selected));
    const tagHtml = (tag) => {
      const active = Object.prototype.hasOwnProperty.call(selected, tag.id),
        score = active ? selected[tag.id] : null,
        fixed = tag.fixedScore != null;
      return `<div class="scored-feeling-item ${active ? "active" : ""}" data-scored-item="${mode}:${tag.id}" ${fixed ? `data-fixed-score="${tag.fixedScore}"` : ""} data-feeling-search-label="${esc(t(tag.label))}"><button type="button" class="feeling-tag ${active ? "active" : ""}" data-scored-toggle="${mode}" data-scored-tag="${tag.id}" aria-pressed="${active}"><span class="feeling-tag-icon">${tag.emoji}</span><span class="feeling-tag-label">${esc(t(tag.label))}</span></button><div class="feeling-score-prompt" ${fixed || !active || score ? "hidden" : ""}>Choisis l’intensité</div><div class="feeling-score-buttons" ${active && !fixed ? "" : "hidden"} aria-label="Intensité de ${esc(t(tag.label))}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="${n === score ? "active" : ""}" data-scored-value="${mode}" data-scored-tag="${tag.id}" data-score="${n}" aria-label="${n} sur 5">${n}</button>`).join("")}</div></div>`;
    };
    const standaloneTags = availableTags.filter((tag) => tag.category === "positive"),
      standalone = standaloneTags.length
        ? `<div class="standalone-feeling-choice">${standaloneTags.map(tagHtml).join("")}</div>`
        : "";
    const categories = FEELING_CATEGORIES.filter((category) => category.id !== "positive").map((category) => {
      const tags = availableTags.filter((tag) => tag.category === category.id),
        hasSelected = tags.some((tag) => Object.prototype.hasOwnProperty.call(selected, tag.id)),
        selectedCount = tags.filter((tag) => Object.prototype.hasOwnProperty.call(selected, tag.id)).length,
        alwaysClosed = category.id === "digestion",
        open = !alwaysClosed && (category.open || hasSelected);
      if (!tags.length) return "";
      return `<details class="feeling-tag-group feeling-tag-group-${category.id}" ${open ? "open" : ""}><summary><span><b>${category.emoji}</b><strong>${esc(t(category.label))}</strong></span><small class="feeling-category-count"><em data-scored-selected-count="${mode}">${selectedCount}</em>/${tags.length}</small><i aria-hidden="true">›</i></summary><div class="feeling-tag-group-body scored-feeling-group">${tags.map(tagHtml).join("")}</div></details>`;
    }).join("");
    return `${standalone}${categories}`;
  }
  function bindScoredFeelingPicker(container, mode) {
    if (!container) return;
    bindCompactFeelingGroups(container);
    container.querySelectorAll(`[data-scored-toggle="${mode}"]`).forEach(
      (button) =>
        (button.onclick = () => {
          const item = button.closest(".scored-feeling-item"),
            active = !item.classList.contains("active");
          if (active) {
            const selectedId = button.dataset.scoredTag,
              neutralIds = new Set(["feeling_good", "no_tracked_symptoms"]),
              selectingNone = neutralIds.has(selectedId);
            container.querySelectorAll(".scored-feeling-item.active").forEach((other) => {
              const otherId = other.querySelector(`[data-scored-toggle="${mode}"]`)?.dataset.scoredTag;
              if ((selectingNone && other !== item) || (!selectingNone && neutralIds.has(otherId))) {
                other.classList.remove("active");
                const otherToggle = other.querySelector(`[data-scored-toggle="${mode}"]`);
                otherToggle?.classList.remove("active");
                otherToggle?.setAttribute("aria-pressed", "false");
                const otherButtons = other.querySelector(".feeling-score-buttons");
                if (otherButtons) otherButtons.hidden = true;
              }
            });
          }
          item.classList.toggle("active", active);
          button.classList.toggle("active", active);
          button.setAttribute("aria-pressed", String(active));
          item.querySelector(".feeling-score-buttons").hidden =
            !active || !!item.dataset.fixedScore;
          const prompt = item.querySelector(".feeling-score-prompt");
          if (prompt)
            prompt.hidden =
              !active ||
              !!item.dataset.fixedScore ||
              !!item.querySelector("[data-scored-value].active");
          const group = item.closest(".feeling-tag-group"),
            count = group?.querySelector(
              `[data-scored-selected-count="${mode}"]`,
            );
          if (count)
            count.textContent = String(
              group.querySelectorAll(".scored-feeling-item.active").length,
            );
          updateFeelingQualityNotice(container, mode);
          applyFeelingSearch(mode);
          if (mode === "before") updateMealFeelingsOverview();
        }),
    );
    container.querySelectorAll(`[data-scored-value="${mode}"]`).forEach(
      (button) =>
        (button.onclick = () => {
          const row = button.closest(".feeling-score-buttons");
          row
            .querySelectorAll("[data-score]")
            .forEach((x) => x.classList.toggle("active", x === button));
          const prompt = button
            .closest(".scored-feeling-item")
            ?.querySelector(".feeling-score-prompt");
          if (prompt) prompt.hidden = true;
          updateFeelingQualityNotice(container, mode);
          if (mode === "before") updateMealFeelingsOverview();
        }),
    );
  }
  function bindCompactFeelingGroups(container) {
    if (!container) return;
    container.classList.add("compact-feeling-categories");
    const groups = [...container.querySelectorAll(".feeling-tag-group")],
      initiallyOpen = groups.filter((group) => group.open);
    initiallyOpen.slice(1).forEach((group) => { group.open = false; });
    groups.forEach((group) => {
      group.addEventListener("toggle", () => {
        if (!group.open) return;
        container.querySelectorAll(".feeling-tag-group[open]").forEach((other) => {
          if (other !== group) other.open = false;
        });
      });
    });
  }
  function collectScoredFeelingScores(container, mode) {
    const scores = {};
    container
      ?.querySelectorAll(".scored-feeling-item.active")
      .forEach((item) => {
        const toggle = item.querySelector(`[data-scored-toggle="${mode}"]`),
          selected = item.querySelector(`[data-scored-value="${mode}"].active`);
        if (toggle && (selected || item.dataset.fixedScore))
          scores[toggle.dataset.scoredTag] = Number(
            selected?.dataset.score || item.dataset.fixedScore,
          );
      });
    return scores;
  }
  function normalizeFeelingSearch(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr-CA")
      .trim();
  }
  function feelingSearchConfig(mode) {
    return mode === "before"
      ? {
          input: $("#beforeFeelingSearch"),
          clear: $("#clearBeforeFeelingSearch"),
          empty: $("#beforeFeelingSearchEmpty"),
          container: $("#beforeFeelingTags"),
        }
      : {
          input: $("#afterFeelingSearch"),
          clear: $("#clearAfterFeelingSearch"),
          empty: $("#afterFeelingSearchEmpty"),
          container: $("#feelingTags"),
        };
  }
  function applyFeelingSearch(mode) {
    const { input, clear, empty, container } = feelingSearchConfig(mode);
    if (!input || !container) return;
    const query = normalizeFeelingSearch(input.value);
    let matches = 0;
    container.querySelectorAll(".scored-feeling-item").forEach((item) => {
      const matchesQuery =
        !query ||
        normalizeFeelingSearch(item.dataset.feelingSearchLabel).includes(query);
      if (query && matchesQuery) matches += 1;
      item.hidden = !!query && !matchesQuery;
    });
    container.querySelectorAll(".feeling-tag-group").forEach((group) => {
      if (query && group.dataset.searchWasOpen == null)
        group.dataset.searchWasOpen = group.open ? "1" : "0";
      const hasVisibleItem = [...group.querySelectorAll(".scored-feeling-item")].some(
        (item) => !item.hidden,
      );
      group.hidden = !!query && !hasVisibleItem;
      if (query && hasVisibleItem) group.open = true;
      if (!query && group.dataset.searchWasOpen != null) {
        group.open = group.dataset.searchWasOpen === "1";
        delete group.dataset.searchWasOpen;
        group.hidden = false;
      }
    });
    if (clear) clear.hidden = !query;
    if (empty) empty.hidden = !query || matches > 0;
  }
  function bindFeelingSearch(mode) {
    const { input, clear } = feelingSearchConfig(mode);
    if (!input) return;
    input.value = "";
    input.oninput = () => applyFeelingSearch(mode);
    if (clear)
      clear.onclick = () => {
        input.value = "";
        applyFeelingSearch(mode);
        input.focus();
      };
    applyFeelingSearch(mode);
  }
  function hasUnscoredFeelings(container, mode) {
    return [...(container?.querySelectorAll(".scored-feeling-item.active") || [])].some(
      (item) => !item.dataset.fixedScore && !item.querySelector(`[data-scored-value="${mode}"].active`),
    );
  }
  function feelingQualityAssessment(container, mode) {
    const activeCount = container?.querySelectorAll(
        ".scored-feeling-item.active",
      ).length || 0,
      scores = collectScoredFeelingScores(container, mode),
      values = Object.values(scores),
      total = feelingTagsForMode(mode).length,
      many = activeCount >= 8,
      halfOrMore = activeCount >= Math.ceil(total / 2),
      uniform =
        activeCount >= 8 &&
        values.length === activeCount &&
        new Set(values).size === 1;
    let extremeCount = 0;
    if (mode === "after") {
      const before = normalizeFeelingScores(
        allMeals().find((meal) => meal.id === feelingMealId)?.feelingsBefore,
      );
      extremeCount = Object.entries(scores).filter(
        ([id, score]) => score - (before[id] || 0) >= 4,
      ).length;
    }
    const extreme = extremeCount >= 8;
    return {
      activeCount,
      total,
      many,
      halfOrMore,
      uniform,
      extreme,
      stronglyAtypical: halfOrMore || uniform || extreme,
    };
  }
  function updateFeelingQualityNotice(container, mode) {
    const notice = $(
      mode === "before"
        ? "#beforeFeelingQualityNotice"
        : "#afterFeelingQualityNotice",
    );
    if (!notice) return;
    const quality = feelingQualityAssessment(container, mode);
    notice.hidden = !quality.many;
    notice.classList.toggle("strong", quality.stronglyAtypical);
    notice.innerHTML = quality.stronglyAtypical
      ? `<strong>Vérification recommandée</strong><span>Cette combinaison est inhabituelle. L’app te demandera de la confirmer avant de l’utiliser dans les observations.</span>`
      : `<strong>${quality.activeCount} ressentis sélectionnés</strong><span>Prends un instant pour vérifier que chacun correspond bien à ce que tu ressens.</span>`;
  }
  function reviewFeelingQuality(quality) {
    if (!quality.stronglyAtypical)
      return { confirmed: false, excludedFromAnalysis: false, reasons: [] };
    const reasons = [
      quality.halfOrMore ? "half-or-more" : null,
      quality.uniform ? "uniform-scores" : null,
      quality.extreme ? "extreme-change" : null,
    ].filter(Boolean);
    const confirmed = confirm(
      `Cette saisie contient une combinaison inhabituelle de ressentis.\n\nAppuie sur OK si elle est exacte et doit être incluse dans les observations. Appuie sur Annuler si tu n’es pas certain.`,
    );
    if (confirmed)
      return { confirmed: true, excludedFromAnalysis: false, reasons };
    const keepExcluded = confirm(
      `Souhaites-tu quand même conserver cette saisie?\n\nElle restera dans ton journal, mais sera temporairement exclue des observations automatiques.`,
    );
    return keepExcluded
      ? { confirmed: false, excludedFromAnalysis: true, reasons }
      : null;
  }
  function renderBeforeFeelingPicker(meal = null) {
    const container = $("#beforeFeelingTags");
    if (!container) return;
    container.innerHTML = scoredFeelingPickerHtml(
      "before",
      feelingScoresFor(meal, "before"),
    );
    bindScoredFeelingPicker(container, "before");
    bindFeelingSearch("before");
    updateFeelingQualityNotice(container, "before");
  }
  function isFeelingEligible(m) {
    return ["Déjeuner", "Dîner", "Souper", "Collation"].includes(m.type);
  }
  function mealDateTime(m) {
    return new Date(`${m.date}T${m.time || "12:00"}:00`);
  }
  function feelingDueAt(m) {
    return new Date(
      mealDateTime(m).getTime() +
        (Number(db.settings.feelingDelayHours) || 0.5) * 3600000,
    );
  }
  function pendingFeelings() {
    const enabled = db.settings.feelingReminders !== false,
      types = db.settings.feelingMealTypes || ["Déjeuner", "Dîner", "Souper"];
    return allMeals()
      .filter(
        (m) =>
          enabled &&
          types.includes(m.type) &&
          !m.feeling &&
          feelingDueAt(m) <= new Date(),
      )
      .sort((a, b) => feelingDueAt(b) - feelingDueAt(a));
  }
  function feelingCardHtml() {
    const pending = pendingFeelings(),
      todayMeals = ensureDay(db, selectedDate).meals.filter(isFeelingEligible),
      answered = todayMeals.filter((m) => m.feeling);
    if (pending.length) {
      const m = pending[0];
      return `<section class="card feeling-overview is-pending"><div class="feeling-overview-icon">😊</div><div><p class="eyebrow">${t("Ressenti")}</p><h3>${pending.length} réponse${pending.length > 1 ? "s" : ""} en attente</h3><p class="muted small">Après ${m.type.toLowerCase()} · ${formatDate(m.date)}</p></div><button class="secondary small" id="answerFeeling" data-id="${m.id}" data-date="${m.date}">Répondre</button></section>`;
    }
    const last = [...answered].sort((a, b) =>
      `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`),
    )[0];
    const lastCount=last?Object.keys(feelingScoresFor(last,"after")).length:0;
    const lastLabel = last ? `${lastCount} ressenti${lastCount>1?"s":""} après` : "Aucun ressenti";
    const lastHint = last
      ? `Modifiable depuis le repas${last.feeling.tags?.length ? ` · ${last.feeling.tags.length} étiquette${last.feeling.tags.length > 1 ? "s" : ""}` : ""}`
      : "Les rappels apparaîtront après tes repas principaux.";
    return `<section class="card feeling-overview"><div class="feeling-overview-icon">😊</div><div><p class="eyebrow">${t("Ressenti")}</p><h3>${last?`Dernier repas · ${lastLabel}`:lastLabel}</h3><p class="muted small">${lastHint}</p></div>${last ? `<button class="secondary small" id="answerFeeling" data-id="${last.id}" data-date="${last.date}">Modifier</button>` : ""}</section>`;
  }
  function openFeeling(id) {
    const m = allMeals().find((x) => x.id === id);
    if (!m) return;
    feelingMealId = id;
    $("#feelingMealContext").textContent =
      `Après ${m.type.toLowerCase()} · ${m.time}`;
    const hasAfter = !!m.feeling,
      afterScores = hasAfter
        ? feelingScoresFor(m, "after")
        : feelingScoresFor(m, "before");
    $("#feelingTags").innerHTML = scoredFeelingPickerHtml("after", afterScores);
    bindScoredFeelingPicker($("#feelingTags"), "after");
    bindFeelingSearch("after");
    updateFeelingQualityNotice($("#feelingTags"), "after");
    $("#feelingCarryNotice").hidden =
      hasAfter || !Object.keys(afterScores).length;
    $("#feelingNotes").value = m.feeling?.notes || "";
    $("#feelingDialog").showModal();
  }
  async function requestFeelingNotifications() {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    return (await Notification.requestPermission()) === "granted";
  }
  function notifyDueFeelings() {
    if (
      db.settings.feelingReminders === false ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    )
      return;
    for (const m of pendingFeelings()) {
      if (m.feelingNotifiedAt) continue;
      try {
        new Notification(`🍏⚡ ${t("Ressenti")}`, {
          body: t(`Comment te sens-tu après ton ${m.type.toLowerCase()} ?`),
          icon: "assets/icon-192.png",
          tag: `feeling-${m.id}`,
        });
        m.feelingNotifiedAt = new Date().toISOString();
        setMealChanged(m);
      } catch (_) {}
    }
  }
  function scheduleFeelingChecks() {
    clearTimeout(notificationTimer);
    notifyDueFeelings();
    if (db.settings.feelingReminders === false) return;
    const upcoming = allMeals()
      .filter(
        (m) =>
          (db.settings.feelingMealTypes || []).includes(m.type) &&
          !m.feeling &&
          feelingDueAt(m) > new Date(),
      )
      .sort((a, b) => feelingDueAt(a) - feelingDueAt(b))[0];
    if (upcoming) {
      notificationTimer = setTimeout(
        () => {
          notifyDueFeelings();
          render();
        },
        Math.min(
          2147483647,
          Math.max(1000, feelingDueAt(upcoming) - new Date()),
        ),
      );
    }
  }

  function dailyMacroSummaryHtml(meals) {
    if (!nutritionVisibleToViewer()) return "";
    if (!Array.isArray(meals) || !meals.length) return "";
    const known = [];
    meals.forEach((meal) => {
      const saved = normalNutrition(meal.nutrition),
        estimated = db.settings.autoNutritionEstimates !== false
          ? estimateNutritionFromText(meal.description || "")
          : null;
      const nutrition = saved
        ? normalNutrition({
            ...estimated,
            ...saved,
            fiber: saved.fiber ?? estimated?.fiber,
            sugars: saved.sugars ?? estimated?.sugars,
            sodium: saved.sodium ?? estimated?.sodium,
          })
        : estimated;
      if (nutrition) known.push(nutrition);
    });
    if (!known.length) return "";
    const sum = (key) =>
      Math.round(
        known.reduce((total, n) => total + (Number(n[key]) || 0), 0) * 10,
      ) / 10;
    const calories = Math.round(sum("calories"));
    const protein = sum("protein");
    const carbs = sum("carbs");
    const fat = sum("fat");
    const coverage =
      known.length === meals.length
        ? "Tous les repas enregistrés ont été inclus."
        : `${known.length} entrée${known.length > 1 ? "s" : ""} sur ${meals.length} ${known.length > 1 ? "ont" : "a"} pu être estimée${known.length > 1 ? "s" : ""}.`;
    const extra = [
      { key: "fiber", icon: "🌾", label: "Fibres", unit: "g" },
      { key: "sugars", icon: "🍬", label: "Sucres", unit: "g" },
      { key: "sodium", icon: "🧂", label: "Sodium", unit: "mg" },
    ]
      .filter((x) => known.every((m) => m[x.key] != null))
      .map((x) => {
        const value = Math.round(sum(x.key) * 10) / 10;
        return `<span><b>${x.icon} ${value.toLocaleString("fr-CA")} ${x.unit}</b><small>${x.label}</small></span>`;
      })
      .join("");
    return `<details class="daily-macros-card" aria-label="Estimation nutritionnelle de la journée"><summary class="daily-macros-head"><span class="daily-macros-title"><b aria-hidden="true">⚡</b><span>Estimation nutritionnelle</span></span><span class="daily-macros-head-right"><strong>≈ ${calories.toLocaleString("fr-CA")} kcal</strong><b class="weekly-trends-chevron" aria-hidden="true">›</b></span></summary><div class="daily-macros-details"><div class="daily-macros-grid"><span><b>🥩 ${protein.toLocaleString("fr-CA")} g</b><small>Protéines</small></span><span><b>🍞 ${carbs.toLocaleString("fr-CA")} g</b><small>Glucides</small></span><span><b>🥑 ${fat.toLocaleString("fr-CA")} g</b><small>Lipides</small></span>${extra}</div><p>Valeurs approximatives, calculées à partir des aliments reconnus. ${coverage}</p></div></details>`;
  }
  function observationSectionHtml(day) {
    const observations = [...(day?.observations || [])].sort((a, b) =>
      b.time.localeCompare(a.time),
    );
    const cards = observations
      .map((o) => {
        const tags = (o.tags || [])
            .map((id) => FEELING_TAGS.find((x) => x.id === id))
            .filter(Boolean),
          lead = tags[0],
          more = Math.max(0, tags.length - 1),
          contexts = (o.contexts || [])
            .map((id) => OBSERVATION_CONTEXTS[id])
            .filter(Boolean);
        return `<button type="button" class="global-observation-item" data-global-observation="${o.id}"><span class="global-observation-item-icon">${lead?.emoji || "🔎"}</span><span><strong>${lead ? esc(t(lead.label)) : "Observation"}${more ? ` +${more}` : ""}</strong><small>${esc(o.time)} · Intensité ${o.intensity}/5 · ${esc(OBSERVATION_DURATIONS[o.duration] || "Durée inconnue")}</small>${contexts.length ? `<em>${esc(contexts.join(" · "))}</em>` : ""}</span><b>›</b></button>`;
      })
      .join("");
    return `<section class="card global-observations-card"><div class="row observation-section-head"><div><p class="eyebrow">Ressenti hors repas</p><h3>🔎 Observations globales</h3></div><button type="button" class="secondary small" id="addGlobalObservation">+ Ajouter</button></div><p class="muted small">Pour noter un symptôme qui peut apparaître plus tard ou durer plusieurs jours, sans l’attribuer automatiquement au dernier repas.</p><div class="observation-list">${cards || '<div class="observation-empty"><span>🌿</span><small>Aucune observation globale cette journée.</small></div>'}</div></section>`;
  }
  function supplementsTodayHtml(day) {
    const observationHtml = observationSectionHtml(day),
      defaults = normalizeSupplements(db.settings?.supplements || []);
    if (!defaults.length) return observationHtml;
    const taken = normalizeSupplements(day?.supplementsTaken || []);
    const items = defaults
      .map(
        (name) =>
          `<label class="supplement-toggle"><input type="checkbox" data-supplement-name="${esc(name)}" ${taken.includes(name) ? "checked" : ""}><span class="supplement-toggle-name"><i aria-hidden="true">${supplementIcon(name)}</i>${esc(name)}</span></label>`,
      )
      .join("");
    return `${observationHtml}<section class="card supplement-card"><div class="row"><div class="hydration-heading"><span>💊</span><h3>Suppléments</h3></div><strong>${taken.length}/${defaults.length}</strong></div><p class="muted small">Coche ce que tu as pris aujourd’hui. Les éléments restants restent décochés.</p><div class="supplement-list">${items}</div></section>`;
  }

  function trendDateKeys(endDate, days = 7, offset = 0) {
    const end = new Date(`${endDate}T12:00:00`);
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(end);
      date.setDate(end.getDate() - offset - (days - 1 - i));
      return date.toLocaleDateString("en-CA");
    });
  }
  function existingTrendDays(keys) {
    return keys.map((key) => db.days[key]).filter(Boolean);
  }
  function trendAverage(values) {
    const clean = values.map(Number).filter(Number.isFinite);
    return clean.length
      ? clean.reduce((sum, value) => sum + value, 0) / clean.length
      : null;
  }
  function principalMealsForTrend(day) {
    return (day?.meals || []).filter((meal) =>
      ["Déjeuner", "Dîner", "Souper"].includes(meal.type),
    );
  }
  function isCompleteMealForTrend(meal) {
    const profile = recommendationMealProfile(meal);
    const supportive =
      profile.flags.vegetables || profile.flags.fruit || profile.flags.fiber;
    return !!(profile.flags.protein && supportive);
  }
  function feelingScoreForTrend(meal) {
    const feeling = meal?.feeling;
    if (!feeling) return null;
    const tags = Array.isArray(feeling.tags) ? feeling.tags : [];
    const positiveTags = tags.filter(
      (id) => FEELING_TAGS.find((tag) => tag.id === id)?.group === "positive",
    ).length;
    const symptomTags = tags.filter(
      (id) => FEELING_TAGS.find((tag) => tag.id === id)?.group === "symptom",
    ).length;
    const rating = (Number(feeling.rating) - 1) / 4;
    const tagAdjustment = Math.max(
      -0.25,
      Math.min(0.25, (positiveTags - symptomTags) * 0.08),
    );
    return Math.max(0, Math.min(1, rating + tagAdjustment));
  }
  function weeklyTrendPeriod(endDate, offset = 0) {
    const keys = trendDateKeys(endDate, 7, offset),
      days = existingTrendDays(keys);
    const sleep = trendAverage(
      days.map((day) => day.sleepHours).filter((value) => value != null),
    );
    const water = trendAverage(
      days.map((day) => (Number(day.water) || 0) * 0.5),
    );
    const meals = days.flatMap(principalMealsForTrend);
    const complete = meals.length
      ? meals.filter(isCompleteMealForTrend).length / meals.length
      : null;
    const feelings = days.flatMap((day) =>
      (day.meals || [])
        .map(feelingScoreForTrend)
        .filter((value) => value != null),
    );
    const feeling = trendAverage(feelings);
    return {
      keys,
      daysCount: days.length,
      sleep,
      water,
      complete,
      feeling,
      counts: {
        sleep: days.filter((day) => day.sleepHours != null).length,
        water: days.filter((day) => Number(day.water) > 0).length,
        complete: meals.length,
        feeling: feelings.length,
      },
    };
  }
  function trendMetric({
    key,
    icon,
    label,
    current,
    previous,
    minCurrent,
    minPrevious,
    threshold,
    format,
    unit = "",
  }) {
    const enough =
      current.count >= minCurrent &&
      previous.count >= minPrevious &&
      current.value != null &&
      previous.value != null;
    if (!enough)
      return {
        key,
        icon,
        label,
        state: "unknown",
        arrow: "—",
        short: "Données à venir",
        detail:
          "Continue à remplir ton journal pour faire ressortir cette tendance.",
      };
    const delta = current.value - previous.value;
    const direction = Math.abs(delta) < threshold ? 0 : delta > 0 ? 1 : -1;
    const state = direction > 0 ? "up" : direction < 0 ? "down" : "stable";
    const arrow = direction > 0 ? "↗" : direction < 0 ? "↘" : "→";
    const signed = direction > 0 ? "+" : "";
    return {
      key,
      icon,
      label,
      state,
      arrow,
      short: direction === 0 ? "Stable" : `${signed}${format(delta)}${unit}`,
      detail: `${format(previous.value)}${unit} → ${format(current.value)}${unit}`,
    };
  }
  function weeklyTrendSummaryHtml(endDate) {
    return "";
    /* Conservé temporairement dans le code pour faciliter une éventuelle
       réactivation, mais retiré de l'interface du Journal depuis la v3.41.5. */
    const current = weeklyTrendPeriod(endDate, 0),
      previous = weeklyTrendPeriod(endDate, 7);
    const decimal = (value) =>
      Number(value).toLocaleString("fr-CA", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
    const integer = (value) => Math.round(value).toLocaleString("fr-CA");
    const metrics = [
      trendMetric({
        key: "sleep",
        icon: "😴",
        label: "Sommeil",
        current: { value: current.sleep, count: current.counts.sleep },
        previous: { value: previous.sleep, count: previous.counts.sleep },
        minCurrent: 3,
        minPrevious: 3,
        threshold: 0.25,
        format: decimal,
        unit: " h",
      }),
      trendMetric({
        key: "water",
        icon: "💧",
        label: "Hydratation",
        current: { value: current.water, count: current.counts.water },
        previous: { value: previous.water, count: previous.counts.water },
        minCurrent: 3,
        minPrevious: 3,
        threshold: 0.2,
        format: decimal,
        unit: " L",
      }),
      trendMetric({
        key: "complete",
        icon: "🥗",
        label: "Repas complets",
        current: {
          value: current.complete * 100,
          count: current.counts.complete,
        },
        previous: {
          value: previous.complete * 100,
          count: previous.counts.complete,
        },
        minCurrent: 3,
        minPrevious: 3,
        threshold: 5,
        format: integer,
        unit: " %",
      }),
      trendMetric({
        key: "feeling",
        icon: "😊",
        label: "Ressenti",
        current: {
          value: current.feeling * 100,
          count: current.counts.feeling,
        },
        previous: {
          value: previous.feeling * 100,
          count: previous.counts.feeling,
        },
        minCurrent: 3,
        minPrevious: 3,
        threshold: 5,
        format: integer,
        unit: " %",
      }),
    ];
    const known = metrics.filter((metric) => metric.state !== "unknown");
    const improvements = known.filter((metric) => metric.state === "up");
    const declines = known.filter((metric) => metric.state === "down");
    let headline =
      "Les tendances se préciseront avec quelques jours de données.";
    let tone = "neutral";
    if (known.length >= 2) {
      if (improvements.length > declines.length) {
        headline = `La semaine va dans une direction positive${
          improvements.length
            ? `, surtout pour ${improvements
                .slice(0, 2)
                .map((item) => item.label.toLowerCase())
                .join(" et ")}`
            : ""
        }.`;
        tone = "positive";
      } else if (declines.length > improvements.length) {
        headline = `Quelques éléments sont en baisse${
          declines.length
            ? `, notamment ${declines
                .slice(0, 2)
                .map((item) => item.label.toLowerCase())
                .join(" et ")}`
            : ""
        }.`;
        tone = "watch";
      } else
        headline =
          "La semaine est plutôt stable par rapport aux 7 jours précédents.";
    }
    const rows = metrics
      .map(
        (metric) =>
          `<div class="weekly-trend-row ${metric.state}"><span class="weekly-trend-icon">${metric.icon}</span><span class="weekly-trend-label">${esc(metric.label)}</span><strong class="weekly-trend-change">${metric.arrow} ${esc(metric.short)}</strong><small>${esc(metric.detail)}</small></div>`,
      )
      .join("");
    return `<details class="weekly-trends card"><summary><span class="weekly-trends-title"><b>📈</b><span><small>Tendances</small><strong>Les 7 derniers jours</strong></span></span><span class="weekly-trends-glance">${
      metrics
        .filter((metric) => metric.state !== "unknown")
        .slice(0, 3)
        .map(
          (metric) =>
            `<i class="${metric.state}" title="${esc(metric.label)}">${metric.arrow}</i>`,
        )
        .join("") || "<em>À venir</em>"
    }</span><span class="weekly-trends-chevron">›</span></summary><div class="weekly-trends-body"><p class="weekly-trends-headline ${tone}">${esc(headline)}</p><div class="weekly-trends-grid">${rows}</div><p class="weekly-trends-note">Comparaison avec les 7 jours précédents. Ces variations montrent des associations dans ton journal, pas des liens de cause à effet.</p></div></details>`;
  }

  function renderToday() {
    const d = ensureDay(db, selectedDate),
      goal = db.settings.waterGoal || 8,
      meals = [...d.meals].sort((a, b) => a.time.localeCompare(b.time)),
      activity = activitySummary(d);
    const hasDocumentedFeelings = meals.some(
        (meal) =>
          Object.keys(feelingScoresFor(meal, "before")).length || meal.feeling,
      ),
      feelingImportanceNudge =
        meals.length && !hasDocumentedFeelings
          ? `<aside class="feeling-importance-nudge"><span aria-hidden="true">😊</span><div><strong>Les ressentis donnent un sens à ton journal</strong><p>Noter ce qui est présent avant ou après un repas permet à Énergie de comparer les changements et de faire ressortir des tendances plus pertinentes.</p></div></aside>`
          : "";
    const water = Array.from(
      { length: goal },
      (_, i) =>
        `<button class="drop ${i < d.water ? "filled" : ""}" data-water="${i + 1}">💧</button>`,
    ).join("");
    const dayLabel = relativeDayLabel(selectedDate);
    const demoRange = demoAnalysisContext();
    const latestDate = demoRange?.last || todayKey();
    const isToday = selectedDate === latestDate;
    const sleepPct =
      d.sleepHours == null
        ? 0
        : Math.min(100, Math.max(0, (Number(d.sleepHours) / 8) * 100));
    const activityChips = (d.activities || [])
      .slice(0, 3)
      .map(
        (a) =>
          `<span class="activity-chip">${activityIcon(a.type)} ${esc(a.type)}</span>`,
      )
      .join("");
    const sleepChips = (d.sleepTags || [])
      .filter((x) => x !== "none")
      .slice(0, 2)
      .map((id) => {
        const marker = sleepMarker(id);
        return marker
          ? `<span class="sleep-chip">${marker.icon} ${esc(marker.label)}</span>`
          : "";
      })
      .join("");
    const sleepExtra = Math.max(
      0,
      (d.sleepTags || []).filter((x) => x !== "none").length - 2,
    );
    $("#app").innerHTML =
      `${!navigator.onLine ? '<div class="offline-banner">Tu es hors ligne. Les changements seront synchronisés plus tard.</div>' : ""}<div id="journalView"><section class="journal-date-nav"><button class="journal-arrow" id="previousDay" aria-label="Jour précédent">‹</button><button class="journal-date-main ${isToday ? "is-today" : ""}" id="goToday"><span>${esc(dayLabel)}</span><strong class="journal-date-value"><span class="seasonal-day-icon-wrap">${seasonalDecorationHtml(selectedDate)}</span><span>${esc(formatCalendarDate(selectedDate))}</span></strong></button><button class="journal-arrow ${selectedDate >= latestDate ? "is-disabled" : ""}" id="nextDay" aria-label="Jour suivant" ${selectedDate >= latestDate ? 'disabled aria-disabled="true"' : ""}>›</button></section>${journalBrainCardHtml(selectedDate)}${weeklyTrendSummaryHtml(selectedDate)}${dailyMacroSummaryHtml(meals)}<section class="meal-quick-grid">${mealQuickCard("Déjeuner", "🍳", meals)}${mealQuickCard("Dîner", "🥪", meals)}${mealQuickCard("Souper", "🍝", meals)}${mealQuickCard("Collation", mealIcon("Collation", meals.find((m) => m.type === "Collation")?.description || ""), meals)}</section>${feelingImportanceNudge}<section class="wellbeing-detail-grid"><button class="card sleep-card edit-sleep"><div class="wellness-head"><span class="wellness-icon">😴</span><div><small>Sommeil</small><strong>${d.sleepHours != null ? `${d.sleepHours} h` : "À noter"}</strong></div><b>›</b></div><div class="sleep-bar"><i style="width:${sleepPct}%"></i></div>${sleepChips || d.sleepComment ? `<div class="sleep-chip-row">${sleepChips}${sleepExtra ? `<span class="sleep-chip">+${sleepExtra}</span>` : ""}${d.sleepComment ? `<span class="sleep-comment-preview">📝 ${esc(d.sleepComment)}</span>` : ""}</div>` : ""}</button><button class="card activity-card edit-activity"><div class="wellness-head"><span class="wellness-icon">${(d.activities || [])[0] ? activityIcon(d.activities[0].type) : "🚶"}</span><div><small>Activité</small><strong>${activity.label}</strong></div><b>›</b></div><div class="activity-chip-row">${activityChips || '<span class="muted small">Choisir une activité</span>'}</div></button></section><section class="card hydration-card"><div class="row"><div class="hydration-heading"><span>💧 <small>(500 ml)</small></span><h3>Hydratation</h3></div><strong>${d.water}/${goal}</strong></div><div class="water-row">${water}</div></section>${supplementsTodayHtml(d)}</div>`;
    $("#previousDay").onclick = () => changeJournalDay(-1);
    if (!$("#nextDay").disabled)
      $("#nextDay").onclick = () => changeJournalDay(1);
    $("#goToday").onclick = () => {
      selectedDate = latestDate;
      render();
    };
    $("#openJournalBrain")?.addEventListener("click", () => {
      currentView = "brain";
      render();
    });
    $(".edit-sleep")?.addEventListener("click", openSleep);
    $(".edit-activity")?.addEventListener("click", openActivity);
    $$("[data-quick-meal]").forEach(
      (b) =>
        (b.onclick = () => {
          const type = b.dataset.quickMeal,
            edit = b.dataset.editMeal;
          if (type === "Collation") openSnackManager();
          else if (edit) openMeal(edit);
          else openMeal(null, type);
        }),
    );
    $$("[data-water]").forEach(
      (b) =>
        (b.onclick = () => {
          d.water =
            Number(b.dataset.water) === d.water
              ? d.water - 1
              : Number(b.dataset.water);
          setDayChanged(selectedDate);
          render();
        }),
    );
    $$("[data-supplement-name]").forEach(
      (input) =>
        (input.onchange = () => {
          const day = ensureDay(db, selectedDate);
          const name = input.dataset.supplementName;
          const taken = normalizeSupplements(day.supplementsTaken || []);
          day.supplementsTaken = input.checked
            ? [...new Set([...taken, name])].filter(Boolean)
            : taken.filter((x) => x !== name);
          setDayChanged(selectedDate);
          render();
        }),
    );
    $("#answerFeeling")?.addEventListener("click", (e) => {
      selectedDate = e.currentTarget.dataset.date;
      openFeeling(e.currentTarget.dataset.id);
    });
    bindJournalSwipe();
  }

  async function hydratePhotoUrls() {
    if (!session) return;
    let changed = false;
    for (const d of Object.values(db.days))
      for (const m of d.meals)
        if (m.photoPath && !m.photoUrl) {
          m.photoUrl = await signedPhoto(m.photoPath);
          changed = changed || !!m.photoUrl;
        }
    if (changed) {
      saveLocal("liens-photo");
      render();
    }
  }
  function localDate(date) {
    return new Date(`${date}T12:00:00`);
  }
  function monthKey(date) {
    return date.slice(0, 7);
  }
  function monthLabel(key) {
    return localDate(`${key}-15`)
      .toLocaleDateString("fr-CA", { month: "long", year: "numeric" })
      .replace(/^./, (c) => c.toUpperCase());
  }
  function mondayKey(date) {
    const d = localDate(date),
      day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return d.toLocaleDateString("en-CA");
  }
  function addDaysKey(date, days) {
    const d = localDate(date);
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-CA");
  }
  function weekLabel(key) {
    return `Semaine du ${localDate(key).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })} au ${localDate(addDaysKey(key, 6)).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" })}`;
  }
  function relativeDayLabel(date) {
    if (date === todayKey()) return "Aujourd’hui";
    if (date === addDaysKey(todayKey(), -1)) return "Hier";
    return localDate(date)
      .toLocaleDateString("fr-CA", { weekday: "long" })
      .replace(/^./, (c) => c.toUpperCase());
  }
  function isFavoriteMeal(m) {
    const norm = (x) =>
      String(x || "")
        .trim()
        .toLowerCase();
    return db.favorites.some(
      (f) =>
        norm(f.description) === norm(m.description) &&
        norm(f.type) === norm(m.type),
    );
  }
  function historyStats(meals) {
    const fav = meals.filter(isFavoriteMeal).length,
      feelings = meals.filter((m) => m.feeling).length,
      times = meals
        .map((m) => m.time)
        .filter(Boolean)
        .sort();
    return {
      count: meals.length,
      fav,
      feelings,
      first: times[0] || null,
      last: times.at(-1) || null,
    };
  }
  function dayMealCounts(meals) {
    const main = meals.filter((m) =>
        ["Déjeuner", "Dîner", "Souper"].includes(m.type),
      ).length,
      snacks = meals.filter((m) => m.type === "Collation").length,
      extras = Math.max(0, meals.length - main - snacks);
    return { main: Math.min(3, main), snacks, extras };
  }
  function miniStatsHtml(stats, scope = "day", meals = []) {
    const mealLabel =
      scope === "day"
        ? (() => {
            const c = dayMealCounts(meals);
            return `🍽️ ${c.main}/3${c.snacks ? ` · 🍎 ${c.snacks} collation${c.snacks > 1 ? "s" : ""}` : ""}${c.extras ? ` · ＋${c.extras}` : ""}`;
          })()
        : `🍽️ ${stats.count} entrées`;
    return `<div class="timeline-stats"><span>${mealLabel}</span>${stats.feelings ? `<span>😊 ${stats.feelings} après</span>` : ""}${stats.fav ? `<span>⭐ ${stats.fav}</span>` : ""}${scope === "day" && stats.first ? `<span>🕒 ${stats.first}${stats.last !== stats.first ? "–" + stats.last : ""}</span>` : ""}</div>`;
  }
  function dayInsight(meals) {
    if (!meals.length) return "";
    const c = dayMealCounts(meals);
    if (c.main === 3)
      return `Les trois repas principaux sont documentés${c.snacks ? `, avec ${c.snacks} collation${c.snacks > 1 ? "s" : ""} en complément` : ""}. Ce suivi régulier donnera davantage de contexte aux tendances futures.`;
    const compared=meals.filter(meal=>Object.keys(feelingScoresFor(meal,"before")).length&&meal.feeling).length;
    if(compared)return `${compared} repas possède${compared>1?"nt":""} une comparaison entre les ressentis avant et après.`;
    return `Cette journée contribue progressivement à mieux décrire tes habitudes.`;
  }
  function dayContext(date) {
    const d = ensureDay(db, date);
    return {
      sleep: d.sleepHours,
      water: d.water || 0,
      activities: (d.activities || []).length,
    };
  }
  function periodStats(meals) {
    const base = historyStats(meals),
      dates = [...new Set(meals.map((m) => m.date))],
      contexts = dates.map(dayContext),
      sleepVals = contexts.map((x) => Number(x.sleep)).filter(Number.isFinite),
      water = contexts.reduce((sum, x) => sum + x.water, 0),
      activeDays = contexts.filter((x) => x.activities > 0).length,
      types = {};
    meals.forEach((m) => (types[m.type] = (types[m.type] || 0) + 1));
    const topType = Object.entries(types).sort((a, b) => b[1] - a[1])[0];
    return {
      ...base,
      days: dates.length,
      avgSleep: sleepVals.length
        ? sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length
        : null,
      water,
      activeDays,
      topType: topType?.[0] || null,
    };
  }
  function summaryTiles(stats, scope = "day", meals = []) {
    const dayCounts = scope === "day" ? dayMealCounts(meals) : null;
    const tiles = [
      scope === "day"
        ? `<div><span>🍽️</span><strong>${dayCounts.main}/3</strong><small>repas principaux</small></div>`
        : `<div><span>🍽️</span><strong>${stats.count}</strong><small>repas et collations</small></div>`,
      `<div><span>⚡</span><strong>${stats.avg == null ? "—" : stats.avg.toFixed(1) + "/5"}</strong><small>fatigue moyenne</small></div>`,
    ];
    if (scope === "day" && dayCounts.snacks)
      tiles.push(
        `<div><span>🍎</span><strong>${dayCounts.snacks}</strong><small>collation${dayCounts.snacks > 1 ? "s" : ""}</small></div>`,
      );
    if (scope !== "day")
      tiles.push(
        `<div><span>📅</span><strong>${stats.days || 0}</strong><small>jours suivis</small></div>`,
      );
    if (stats.fav)
      tiles.push(
        `<div><span>⭐</span><strong>${stats.fav}</strong><small>favoris</small></div>`,
      );
    if (stats.avgSleep != null)
      tiles.push(
        `<div><span>😴</span><strong>${stats.avgSleep.toFixed(1)} h</strong><small>sommeil moyen</small></div>`,
      );
    if (stats.water)
      tiles.push(
        `<div><span>💧</span><strong>${stats.water}</strong><small>verres notés</small></div>`,
      );
    return `<div class="period-summary-grid">${tiles.join("")}</div>`;
  }
  function periodObservation(stats, scope) {
    if (!stats.count) return "";
    if (scope === "month" && stats.days >= 14)
      return `Tu as documenté ${stats.days} journées ce mois-ci. Ce volume permet de dégager des tendances plus représentatives, sans établir de lien de cause à effet.`;
    if (scope === "week" && stats.days >= 5)
      return `Cette semaine contient ${stats.count} repas répartis sur ${stats.days} jours. La régularité du suivi améliore le contexte des observations.`;
    return `Ce résumé repose uniquement sur les données que tu as enregistrées.`;
  }
  function historyNegativeFeelingStats(meals, days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days + 1);
    cutoff.setHours(0, 0, 0, 0);
    const tagMeta = Object.fromEntries(
      FEELING_TAGS.map((tag) => [tag.id, tag]),
    );
    const byDate = {};
    meals.forEach((meal) => {
      if (!meal?.date) return;
      (byDate[meal.date] ??= []).push(meal);
    });
    const groups = { negative: {}, positive: {} };
    meals
      .filter(
        (meal) =>
          meal.feeling &&
          Array.isArray(meal.feeling.tags) &&
          meal.feeling.tags.length,
      )
      .forEach((meal) => {
        const occurrenceDate = new Date(`${meal.date}T12:00:00`);
        if (occurrenceDate < cutoff) return;
        const dayMeals = (byDate[meal.date] || [])
          .slice()
          .sort((a, b) => a.time.localeCompare(b.time));
        const mealIndex = dayMeals.findIndex((x) => x.id === meal.id);
        const priorMeals =
          mealIndex >= 0
            ? dayMeals.slice(Math.max(0, mealIndex - 3), mealIndex)
            : [];
        meal.feeling.tags.forEach((tag) => {
          const meta = tagMeta[tag];
          if (!meta || meta.scopedOnly || !["symptom", "positive"].includes(meta.group)) return;
          const bucket =
            meta.group === "symptom" ? groups.negative : groups.positive;
          const entry = bucket[tag] || {
            id: tag,
            group: meta.group,
            label: meta.label,
            emoji: meta.emoji,
            count: 0,
            occurrences: [],
          };
          entry.count += 1;
          entry.occurrences.push({
            date: meal.date,
            mealDescription: meal.description || "Repas",
            mealTime: meal.time || "12:00",
            mealType: t(meal.type),
            rating: feelingScoresFor(meal,"after")[tag]||meal.feeling.rating||3,
            notes: meal.feeling.notes || "",
            priorMeals: priorMeals.map(({ description, time, type }) => ({
              description,
              time,
              type,
            })),
          });
          bucket[tag] = entry;
        });
      });
    const sortEntries = (items) =>
      Object.values(items).sort((a, b) => b.count - a.count);
    const negative = sortEntries(groups.negative),
      positive = sortEntries(groups.positive);
    return {
      negative,
      positive,
      negativeCount: negative.reduce((sum, item) => sum + item.count, 0),
      positiveCount: positive.reduce((sum, item) => sum + item.count, 0),
    };
  }
  function feelingContextAverages() {
    const days = Object.values(db.days || {});
    const values = {
      sleep: [],
      water: [],
      activity: [],
      supplements: [],
    };
    const defaults = normalizeSupplements(db.settings?.supplements || []);
    days.forEach((day) => {
      if (day.sleepHours != null && Number.isFinite(Number(day.sleepHours)))
        values.sleep.push(Number(day.sleepHours));
      if (Number(day.water) > 0) values.water.push(Number(day.water) * 0.5);
      const minutes = (day.activities || []).reduce(
        (sum, item) => sum + (Number(item.minutes) || 0),
        0,
      );
      if (minutes > 0) values.activity.push(minutes);
      if (defaults.length) {
        const taken = normalizeSupplements(day.supplementsTaken || []).filter(
          (name) => defaults.includes(name),
        ).length;
        values.supplements.push(taken / defaults.length);
      }
    });
    const result = {};
    Object.entries(values).forEach(([key, list]) => {
      result[key] = { value: trendAverage(list), count: list.length };
    });
    return result;
  }
  function feelingContextComparison(key, value, averageInfo) {
    const averageValue = averageInfo?.value,
      samples = averageInfo?.count || 0;
    if (value == null || !Number.isFinite(Number(value)))
      return {
        state: "unknown",
        label: "Non noté",
        detail: "Aucune donnée pour cette journée.",
      };
    if (samples < 5 || averageValue == null)
      return {
        state: "limited",
        label: "Données limitées",
        detail: "Encore quelques journées pour établir ton habitude.",
      };
    const difference = Math.abs(Number(value) - averageValue);
    const thresholds = {
      sleep: [0.55, 1.35],
      water: [0.45, 1],
      activity: [20, 55],
      supplements: [0.2, 0.5],
    };
    const [usual, very] = thresholds[key] || [
      Math.abs(averageValue) * 0.15,
      Math.abs(averageValue) * 0.35,
    ];
    const state =
      difference <= usual
        ? "usual"
        : difference <= very
          ? "unusual"
          : "very-unusual";
    return {
      state,
      label:
        state === "usual"
          ? "Habituel"
          : state === "unusual"
            ? "Peu habituel"
            : "Très inhabituel",
      detail: "",
    };
  }
  function feelingContextTile({ icon, label, value, key, detail }, averages) {
    const comparison = feelingContextComparison(key, value, averages[key]);
    return `<div class="feeling-context-tile ${comparison.state}"><div class="feeling-context-tile-head"><span>${icon}</span><small>${esc(label)}</small></div><strong>${esc(detail || "—")}</strong><span class="feeling-context-badge">${esc(comparison.label)}</span></div>`;
  }
  function feelingOccurrenceContextHtml(occ, averages) {
    const day = db.days?.[occ.date];
    const meals = day?.meals || [];
    const activityMinutes = (day?.activities || []).reduce(
      (sum, item) => sum + (Number(item.minutes) || 0),
      0,
    );
    const defaults = normalizeSupplements(db.settings?.supplements || []);
    const taken = normalizeSupplements(day?.supplementsTaken || []).filter(
      (name) => defaults.includes(name),
    );
    const missing = defaults.filter((name) => !taken.includes(name));
    const tiles = [
      feelingContextTile(
        {
          icon: "🌙",
          label: "Sommeil",
          value: day?.sleepHours != null ? Number(day.sleepHours) : null,
          key: "sleep",
          detail:
            day?.sleepHours != null
              ? `${Number(day.sleepHours).toLocaleString("fr-CA", { maximumFractionDigits: 1 })} h`
              : "Non noté",
        },
        averages,
      ),
      feelingContextTile(
        {
          icon: "💧",
          label: "Hydratation",
          value: Number(day?.water) > 0 ? Number(day.water) * 0.5 : null,
          key: "water",
          detail:
            Number(day?.water) > 0
              ? `${(Number(day.water) * 0.5).toLocaleString("fr-CA", { maximumFractionDigits: 1 })} L`
              : "Non notée",
        },
        averages,
      ),
      feelingContextTile(
        {
          icon: "🚶",
          label: "Activité",
          value: activityMinutes > 0 ? activityMinutes : null,
          key: "activity",
          detail:
            activityMinutes > 0
              ? `${Math.round(activityMinutes)} min`
              : "Non notée",
        },
        averages,
      ),
    ];
    if (defaults.length)
      tiles.push(
        feelingContextTile(
          {
            icon: "💊",
            label: "Suppléments",
            value: taken.length / defaults.length,
            key: "supplements",
            detail: missing.length
              ? `${missing.length} non pris`
              : `${taken.length}/${defaults.length} pris`,
          },
          averages,
        ),
      );
    const mealsHtml = occ.priorMeals.length
      ? `<div class="feeling-context-meals"><span>🍴 Repas précédents</span>${occ.priorMeals.map((meal) => `<div class="feeling-context-meal"><strong>${esc(meal.description)}</strong><small>${esc(meal.time)} · ${esc(t(meal.type))}</small></div>`).join("")}</div>`
      : `<p class="muted small feeling-context-no-meals">Aucun repas précédent enregistré cette journée.</p>`;
    return `<div class="feeling-day-context"><div class="feeling-context-title"><span>Contexte de cette journée</span><small>Comparé à tes habitudes personnelles</small></div><div class="feeling-context-tiles">${tiles.join("")}</div>${mealsHtml}</div>`;
  }
  function feelingObservationSectionHtml(
    items,
    label,
    emptyTitle,
    emptyText,
    limit = 4,
    occurrenceLimit = 2,
  ) {
    const count = items.reduce((sum, item) => sum + item.count, 0),
      averages = feelingContextAverages();
    if (!items.length)
      return `<div class="dashboard-feelings-section is-empty"><p class="eyebrow">${esc(label)}</p><h4>${esc(emptyTitle)}</h4><p class="muted small">${esc(emptyText)}</p></div>`;
    return `<div class="dashboard-feelings-section"><div class="dashboard-feelings-section-head"><div><p class="eyebrow">${esc(label)}</p><h4>Éléments signalés</h4></div><span class="muted small">${count} fois</span></div><div class="history-feelings-list">${items
      .slice(0, limit)
      .map(
        (item) =>
          `<details class="history-feeling-detail feeling-observation-detail"><summary><span class="history-feeling-detail-title">${item.emoji} ${esc(item.label)}</span><b>${item.count}</b></summary><div class="history-feeling-detail-body">${item.occurrences
            .slice(0, occurrenceLimit)
            .map(
              (occ) =>
                `<article class="history-feeling-occurrence feeling-observation-occurrence"><div class="history-feeling-occurrence-head"><strong>${esc(formatDate(occ.date))}</strong><span>${esc(occ.mealTime)} · ${esc(occ.mealType)}</span></div><div class="feeling-occurrence-summary"><strong>${esc(occ.mealDescription)}</strong><span>Ressenti ${occ.rating}/5${occ.notes ? ` · ${esc(occ.notes)}` : ""}</span></div>${feelingOccurrenceContextHtml(occ, averages)}</article>`,
            )
            .join("")}</div></details>`,
      )
      .join("")}</div></div>`;
  }
  function historyNegativeFeelingHtml(stats) {
    return `<section class="card history-feelings-card">${feelingObservationSectionHtml(stats.negative || [], "Observations négatives", "Aucun signalement", "Les symptômes enregistrés ici apparaîtront automatiquement ici.", 6, 3)}${feelingObservationSectionHtml(stats.positive || [], "Observations positives", "Aucun signalement", "Les états positifs enregistrés ici apparaîtront automatiquement ici.", 6, 3)}</section>`;
  }
  function dashboardNegativeFeelingHtml(stats) {
    return `<section class="card wide dashboard-feelings-card"><div class="dashboard-feelings-sections">${feelingObservationSectionHtml(stats.negative || [], "Observations négatives", "Aucun signalement", "Les symptômes enregistrés ici apparaîtront automatiquement ici.")}${feelingObservationSectionHtml(stats.positive || [], "Observations positives", "Aucun signalement", "Les états positifs enregistrés ici apparaîtront automatiquement ici.")}</div></section>`;
  }
  function journeySummary(meals) {
    if (!meals.length) return "";
    const dates = meals.map((m) => m.date).sort(),
      first = dates[0],
      days = Math.max(
        1,
        Math.round((localDate(todayKey()) - localDate(first)) / 86400000) + 1,
      ),
      months = new Set(dates.map(monthKey)).size;
    return `<section class="journey-card card"><div><p class="eyebrow">Ton parcours</p><h3>${days} jour${days > 1 ? "s" : ""} de suivi</h3><p class="muted small">Depuis le ${esc(localDate(first).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" }))}</p></div><div class="journey-numbers"><span><strong>${meals.length}</strong><small>repas et collations</small></span><span><strong>${new Set(dates).size}</strong><small>journées</small></span><span><strong>${months}</strong><small>mois</small></span></div></section>`;
  }
  function renderHistoryDay(date, meals, open = false) {
    const stats = { ...periodStats(meals), ...dayContext(date) },
      sorted = [...meals].sort((a, b) => a.time.localeCompare(b.time));
    return `<details class="timeline-day" ${open ? "open" : ""}><summary><div class="timeline-marker"></div><div class="timeline-summary"><strong>${esc(relativeDayLabel(date))}</strong>${miniStatsHtml(stats, "day", meals)}</div><span class="timeline-chevron">›</span></summary><div class="timeline-day-body"><section class="daily-summary"><div><span class="eyebrow">Résumé de la journée</span><p>${esc(dayInsight(meals))}</p></div>${summaryTiles(stats, "day", meals)}</section><div class="stack timeline-meals">${sorted.map((m) => mealCard(m)).join("")}</div></div></details>`;
  }
  function renderHistoryWeek(key, meals, open = false) {
    const byDay = {};
    meals.forEach((m) => (byDay[m.date] ??= []).push(m));
    const dates = Object.keys(byDay).sort().reverse(),
      stats = periodStats(meals);
    return `<details class="timeline-week" ${open ? "open" : ""}><summary><div><strong>${esc(weekLabel(key))}</strong>${miniStatsHtml(stats, "week")}</div><span class="timeline-chevron">›</span></summary><div class="timeline-week-body"><section class="period-summary"><p>${esc(periodObservation(stats, "week"))}</p>${summaryTiles(stats, "week")}</section>${dates.map((date, i) => renderHistoryDay(date, byDay[date], open && i < 2)).join("")}</div></details>`;
  }
  function renderHistoryGroups(meals) {
    if (!meals.length)
      return `<section class="card empty"><div class="food-art">🔎</div><p>Aucun résultat.</p></section>`;
    const byMonth = {};
    meals.forEach((m) => {
      const mk = monthKey(m.date);
      ((byMonth[mk] ??= {})[mondayKey(m.date)] ??= []).push(m);
    });
    const months = Object.keys(byMonth).sort().reverse();
    return `<div class="smart-timeline">${months
      .map((mk, mi) => {
        const weeks = byMonth[mk],
          weekKeys = Object.keys(weeks).sort().reverse(),
          monthMeals = weekKeys.flatMap((k) => weeks[k]),
          stats = periodStats(monthMeals);
        return `<details class="timeline-month"><summary><div><span class="timeline-month-label">${esc(monthLabel(mk))}</span>${miniStatsHtml(stats, "month")}</div><span class="timeline-chevron">›</span></summary><div class="timeline-month-body"><section class="period-summary month-summary"><p>${esc(periodObservation(stats, "month"))}</p>${summaryTiles(stats, "month")}</section>${weekKeys.map((wk) => renderHistoryWeek(wk, weeks[wk], false)).join("")}</div></details>`;
      })
      .join("")}</div>`;
  }
  function historyEntryCountLabel(count) {
    return `${count} entrée${count !== 1 ? "s" : ""} · repas et collations`;
  }
  function renderHistory() {
    const meals = allMeals().sort((a, b) =>
      `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`),
    );
    const types = [
      "Tous",
      "Déjeuner",
      "Dîner",
      "Souper",
      "Collation",
      "Boisson",
    ];
    $("#app").innerHTML =
      `<section class="hero"><p class="eyebrow">Smart Timeline</p><h2>Ton historique, organisé naturellement</h2><p>Les repas sont regroupés par journée, semaine et mois pour rester faciles à consulter avec le temps.</p></section><section class="card search-card"><div class="history-search-row"><input id="mealSearch" type="search" placeholder="Rechercher un aliment, une note ou une date…" autocomplete="off"><button type="button" class="history-filter-toggle" id="historyFilterToggle" aria-expanded="false" aria-controls="historyFilterPanel"><span>Filtres</span><b>⌄</b></button></div><div id="historyFilterPanel" class="history-filter-panel" hidden><div class="filter-label">Période</div><div class="filter-row"><button class="filter-chip active" data-range="all">Tout</button><button class="filter-chip" data-range="7">7 jours</button><button class="filter-chip" data-range="30">Ce mois</button><button class="filter-chip" data-range="365">Cette année</button></div><div class="filter-label">Type de repas</div><div class="filter-row">${types.map((mealType, i) => `<button class="filter-chip ${i === 0 ? "active" : ""}" data-type="${esc(mealType)}">${esc(t(mealType))}</button>`).join("")}</div><div class="filter-row"><button class="filter-chip" data-special="favorite">⭐ Favoris</button></div></div></section><section class="section-title"><h2>Chronologie</h2><span id="resultCount" class="muted small">${meals.length} repas</span></section><div id="historyResults">${renderHistoryGroups(meals)}</div>`;
    $("#resultCount").textContent = historyEntryCountLabel(meals.length);
    const filterToggle = $("#historyFilterToggle"),
      filterPanel = $("#historyFilterPanel");
    filterToggle.onclick = () => {
      const open = filterPanel.hidden;
      filterPanel.hidden = !open;
      filterToggle.setAttribute("aria-expanded", String(open));
      filterToggle.classList.toggle("active", open);
    };
    let range = "all",
      type = "Tous",
      favoriteOnly = false;
    const apply = () => {
      const q = $("#mealSearch").value.trim().toLowerCase();
      const cutoff =
        range === "all"
          ? null
          : new Date(Date.now() - Number(range) * 86400000);
      const filtered = meals.filter(
        (m) =>
          (!cutoff || localDate(m.date) >= cutoff) &&
          (type === "Tous" || m.type === type) &&
          (!favoriteOnly || isFavoriteMeal(m)) &&
          `${m.description} ${m.type} ${m.notes} ${m.date}`
            .toLowerCase()
            .includes(q),
      );
      $("#resultCount").textContent = historyEntryCountLabel(filtered.length);
      $("#historyResults").innerHTML = renderHistoryGroups(filtered);
      bindMealCards();
    };
    $("#mealSearch").oninput = apply;
    $$("[data-range]").forEach(
      (b) =>
        (b.onclick = () => {
          range = b.dataset.range;
          $$("[data-range]").forEach((x) =>
            x.classList.toggle("active", x === b),
          );
          apply();
        }),
    );
    $$("[data-type]").forEach(
      (b) =>
        (b.onclick = () => {
          type = b.dataset.type;
          $$("[data-type]").forEach((x) =>
            x.classList.toggle("active", x === b),
          );
          apply();
        }),
    );
    $('[data-special="favorite"]').onclick = (e) => {
      favoriteOnly = !favoriteOnly;
      e.currentTarget.classList.toggle("active", favoriteOnly);
      apply();
    };
    bindMealCards();
  }
  function renderFavoriteList(list) {
    return list.length
      ? list
          .sort((a, b) => b.usageCount - a.usageCount)
          .map(
            (f) =>
              `<article class="card favorite-card"><div class="favorite-icon">${mealIcon(f.type, f.description)}</div><div><h3>${esc(f.name)}</h3><p>${esc(f.description)}</p><small class="muted">Utilisé ${f.usageCount || 0} fois</small></div><div class="favorite-actions"><button class="primary small" data-use-favorite="${f.id}">Utiliser</button><button class="delete-meal" data-delete-favorite="${f.id}">×</button></div></article>`,
          )
          .join("")
      : `<section class="card empty"><div class="food-art">⭐</div><p>Ajoute un repas existant à tes favoris avec l’étoile.</p></section>`;
  }
  function bindFavoriteActions() {
    $$("[data-use-favorite]").forEach(
      (b) => (b.onclick = () => useFavorite(b.dataset.useFavorite)),
    );
    $$("[data-delete-favorite]").forEach(
      (b) =>
        (b.onclick = () => {
          const f = db.favorites.find((x) => x.id === b.dataset.deleteFavorite);
          if (f && confirm(`Supprimer « ${f.name} » des favoris?`)) {
            deleteFavoriteLocal(f);
            render();
          }
        }),
    );
  }
  function insightConfidence(count) {
    if (count >= 20) return { label: "Élevée", cls: "high" };
    if (count >= 8) return { label: "Moyenne", cls: "medium" };
    return { label: "Préliminaire", cls: "low" };
  }
  function timeToMinutes(t) {
    const [h, m] = String(t || "00:00")
      .split(":")
      .map(Number);
    return h * 60 + m;
  }
  function formatMinutes(n) {
    if (!Number.isFinite(n)) return "—";
    const h = Math.floor(n / 60) % 24,
      m = Math.round(n % 60);
    return `${h} h ${String(m).padStart(2, "0")}`;
  }
  function foodTagsInText(value) {
    const text = ` ${normalizeFoodText(value)} `,
      tags = new Set();
    if (!text.trim()) return tags;
    FOOD_MACROS.forEach((food) => {
      const found = (food.keys || []).some((key) => {
        const normalized = normalizeFoodText(key);
        return normalized && text.includes(` ${normalized} `);
      });
      if (found)
        (food.tags || []).forEach((tag) => tags.add(normalizeFoodText(tag)));
    });
    return tags;
  }
  function learnedHabitInsight(meals) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 27);
    cutoff.setHours(0, 0, 0, 0);
    const recent = meals.filter(
      (m) => new Date(`${m.date}T12:00:00`) >= cutoff,
    );
    if (recent.length < 12) return null;
    const dates = [...new Set(recent.map((m) => m.date))],
      dayCount = dates.length;
    if (dayCount < 8) return null;
    const hasTag = (meal, ...wanted) => {
      const tags = foodTagsInText(
        `${meal.description || ""} ${meal.notes || ""}`,
      );
      return wanted.some((tag) => tags.has(normalizeFoodText(tag)));
    };
    const main = recent.filter((m) =>
      ["Déjeuner", "Dîner", "Souper"].includes(m.type),
    );
    const breakfasts = recent.filter((m) => m.type === "Déjeuner");
    const snacks = recent.filter((m) => m.type === "Collation");
    const dinners = recent.filter((m) => m.type === "Souper");
    const breakfastDays = new Set(breakfasts.map((m) => m.date)).size;
    const fruitSnacks = snacks.filter((m) => hasTag(m, "fruit")).length;
    const vegetableDinners = dinners.filter((m) =>
      hasTag(m, "légume", "legume"),
    ).length;
    const proteinMeals = main.filter((m) =>
      hasTag(m, "protéine", "proteine"),
    ).length;
    const daysWithWater = dates.filter(
      (date) => (ensureDay(db, date).water || 0) > 0,
    );
    const waterGoal = Math.max(1, Number(db.settings.waterGoal) || 8);
    const waterGoalDays = daysWithWater.filter(
      (date) => (ensureDay(db, date).water || 0) >= waterGoal,
    ).length;
    const candidates = [];
    const breakfastRatio = breakfastDays / dayCount;
    if (
      dayCount >= 8 &&
      breakfastRatio >= 0.6 &&
      breakfastRatio < 0.95 &&
      breakfasts.length >= 4
    )
      candidates.push({
        score: breakfastRatio - 0.7,
        icon: "🥣",
        text: "Un déjeuner apparaît souvent dans les 28 derniers jours, ce qui peut refléter une routine du matin plutôt qu’un comportement inhabituel.",
        n: dayCount,
        basis: `Observation basée sur ${dayCount} jours des 28 derniers jours.`,
      });
    if (
      snacks.length >= 6 &&
      fruitSnacks / snacks.length >= 0.5 &&
      fruitSnacks / snacks.length < 0.95
    )
      candidates.push({
        score: fruitSnacks / snacks.length / 10 + 0.05,
        icon: "🍎",
        text: "Des collations fruitées apparaissent assez souvent dans ton historique récent.",
        n: snacks.length,
        basis: `Observation basée sur ${snacks.length} collations des 28 derniers jours.`,
      });
    if (
      dinners.length >= 5 &&
      vegetableDinners / dinners.length >= 0.5 &&
      vegetableDinners / dinners.length < 0.95
    )
      candidates.push({
        score: vegetableDinners / dinners.length / 10 + 0.04,
        icon: "🥦",
        text: "Les légumes apparaissent souvent dans tes soupers récents.",
        n: dinners.length,
        basis: `Observation basée sur ${dinners.length} soupers des 28 derniers jours.`,
      });
    if (
      main.length >= 8 &&
      proteinMeals / main.length >= 0.6 &&
      proteinMeals / main.length < 0.95
    )
      candidates.push({
        score: proteinMeals / main.length / 10 + 0.03,
        icon: "🍗",
        text: "Des sources de protéines apparaissent souvent dans tes repas principaux récents.",
        n: main.length,
        basis: `Observation basée sur ${main.length} repas principaux des 28 derniers jours.`,
      });
    if (
      daysWithWater.length >= 6 &&
      waterGoalDays / daysWithWater.length >= 0.6 &&
      waterGoalDays / daysWithWater.length < 0.95
    )
      candidates.push({
        score: waterGoalDays / daysWithWater.length / 10 + 0.02,
        icon: "💧",
        text: "Ton hydratation reste relativement régulière quand tu la documentes.",
        n: daysWithWater.length,
        basis: `Observation basée sur ${daysWithWater.length} jours d’hydratation des 28 derniers jours.`,
      });
    const best = candidates.sort((a, b) => b.score - a.score)[0];
    if (!best) return null;
    return {
      icon: best.icon,
      title: "Ce que j’apprends sur toi",
      text: best.text,
      confidence: insightConfidence(best.n),
      basis: best.basis,
      kind: "personal",
    };
  }
  const SOURCES = {
    canada: {
      name: "Santé Canada — Guide alimentaire canadien",
      url: "https://www.canada.ca/fr/sante-canada/services/guide-alimentaire.html",
    },
    processed: {
      name: "Santé Canada — Limiter les aliments hautement transformés",
      url: "https://www.canada.ca/fr/sante-canada/services/guide-alimentaire/explorez/recommandations-matiere-alimentation-saine/limitez-hautement-transformes.html",
    },
    labels: {
      name: "Santé Canada — Symbole nutritionnel sur le devant de l’emballage",
      url: "https://www.canada.ca/fr/sante-canada/services/aliments-nutrition/etiquetage-nutritionnel/devant-emballage.html",
    },
    who: {
      name: "Organisation mondiale de la Santé — Alimentation saine",
      url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
    },
  };
  function buildPersonalInsights(meals) {
    const cards = [];
    if (!meals.length) return cards;
    const recent = meals.filter(
      (m) =>
        new Date(`${m.date}T23:59:59`) >= new Date(Date.now() - 28 * 86400000),
    );
    if (recent.length < 8) return cards;
    const learned = learnedHabitInsight(recent);
    if (learned) cards.push(learned);
    const changes={};
    recent.filter(meal=>meal.feeling).forEach(meal=>{const before=feelingScoresFor(meal,"before"),after=feelingScoresFor(meal,"after");new Set([...Object.keys(before),...Object.keys(after)]).forEach(id=>{const delta=(after[id]||0)-(before[id]||0);if(!delta)return;const item=changes[id]||{total:0,count:0};item.total+=delta;item.count++;changes[id]=item})});
    const strongest=Object.entries(changes).filter(([,item])=>item.count>=3).map(([id,item])=>({id,...item,average:item.total/item.count,meta:FEELING_TAGS.find(tag=>tag.id===id)})).filter(item=>item.meta).sort((a,b)=>Math.abs(b.average)*b.count-Math.abs(a.average)*a.count)[0];
    if(strongest){
      const direction=strongest.average>0?"augmente":"diminue";
      cards.push({
        icon: strongest.meta.emoji,
        title: "Une évolution avant-après se répète",
        text: `${strongest.meta.label} ${direction} en moyenne de ${Math.abs(strongest.average).toFixed(1)} point sur 5 autour des repas concernés. Cette évolution décrit le journal sans prouver que le repas en est la cause.`,
        confidence: insightConfidence(strongest.count),
        basis: `Basé sur ${strongest.count} comparaisons avant-après.`,
        kind: "personal",
      });
    }
    return cards.slice(0, 3);
  }
  function countKeywordMeals(meals, words) {
    return meals.filter((m) =>
      words.some((w) =>
        `${m.description} ${m.notes}`.toLowerCase().includes(w),
      ),
    ).length;
  }
  function buildNutritionObservations(meals) {
    if (!db.settings.nutritionObservations || !meals.length) return [];
    const recent = meals.filter(
      (m) =>
        new Date(`${m.date}T23:59:59`) >= new Date(Date.now() - 7 * 86400000),
    );
    if (recent.length < 3) return [];
    const groups = [
      {
        icon: "🍬",
        title: "Aliments possiblement plus sucrés",
        words: [
          "boisson gazeuse",
          "liqueur",
          "bonbon",
          "chocolat",
          "biscuit",
          "gâteau",
          "gateau",
          "beigne",
          "donut",
          "sirop",
          "jus",
          "crème glacée",
          "creme glacee",
          "céréales sucrées",
          "cereales sucrees",
        ],
        min: 3,
        text: "Plusieurs descriptions récentes mentionnent des aliments souvent associés à davantage de sucres. Tu pourrais simplement vérifier les étiquettes ou varier certains choix, si cet objectif est important pour toi.",
        source: [SOURCES.labels, SOURCES.who],
      },
      {
        icon: "🧂",
        title: "Aliments possiblement plus salés",
        words: [
          "chips",
          "croustille",
          "pizza",
          "charcuterie",
          "bacon",
          "saucisse",
          "ramen",
          "soupe en conserve",
          "repas congelé",
          "repas congele",
          "fast food",
          "poutine",
        ],
        min: 3,
        text: "Plusieurs descriptions récentes mentionnent des aliments qui peuvent être plus riches en sodium. Les portions et les recettes font une grande différence; l’étiquette demeure la meilleure référence.",
        source: [SOURCES.labels, SOURCES.processed],
      },
      {
        icon: "🧈",
        title: "Gras saturés à surveiller dans les choix fréquents",
        words: [
          "frit",
          "frite",
          "poutine",
          "bacon",
          "saucisse",
          "crème",
          "creme",
          "beurre",
          "fromage",
          "pizza",
          "croissant",
          "pâtisserie",
          "patisserie",
        ],
        min: 3,
        text: "Certains aliments notés fréquemment peuvent contenir davantage de gras saturés. Il ne s’agit pas d’un jugement sur un repas; la variété au fil du temps est ce qui compte.",
        source: [SOURCES.labels, SOURCES.canada],
      },
      {
        icon: "🥦",
        title: "Peu de végétaux repérés dans les descriptions",
        inverse: true,
        words: [
          "légume",
          "legume",
          "salade",
          "brocoli",
          "carotte",
          "tomate",
          "épinard",
          "epinard",
          "poivron",
          "haricot",
          "lentille",
          "pois chiche",
          "fruit",
          "pomme",
          "banane",
          "bleuet",
          "fraise",
        ],
        min: 2,
        text: "L’application repère peu de fruits, légumes ou légumineuses dans les repas récents. Les descriptions peuvent être incomplètes; tu pourrais préciser les accompagnements pour obtenir une observation plus juste.",
        source: [SOURCES.canada],
      },
    ];
    return groups
      .flatMap((g) => {
        const count = countKeywordMeals(recent, g.words),
          trigger = g.inverse ? count < g.min : count >= g.min;
        if (!trigger) return [];
        return [
          {
            ...g,
            text: db.settings.generalRecommendations
              ? g.text
              : g.text.split(". ")[0] + ".",
            confidence: insightConfidence(recent.length),
            basis: `Estimation par mots-clés dans ${recent.length} repas des 7 derniers jours. Les quantités et valeurs nutritives ne sont pas connues.`,
            kind: "nutrition",
          },
        ];
      })
      .slice(0, 3);
  }
  function insightHtml(x, i) {
    const sourceButton = db.settings.showSources
      ? `<button class="text-button why-insight" data-insight="${i}">Pourquoi je vois ceci?</button>`
      : "";
    return `<article class="card insight-card"><div class="insight-icon">${x.icon}</div><div><div class="insight-heading"><span class="insight-type">${t(x.kind === "nutrition" ? "Observation nutritionnelle estimée" : "Observation personnelle")}</span><h3>${esc(x.title)}</h3></div><p>${esc(x.text)}</p><div class="insight-footer"><span class="confidence ${x.confidence.cls}">Confiance ${x.confidence.label.toLowerCase()}</span>${sourceButton}</div></div></article>`;
  }
  function openInsightWhy(x) {
    $("#sourceTitle").textContent = "Pourquoi je vois ceci?";
    const refs = (x.source || [])
      .map(
        (s) =>
          `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.name)} ↗</a></li>`,
      )
      .join("");
    $("#sourceContent").innerHTML =
      `<p>${esc(x.basis || "Cette observation utilise les données disponibles dans l’application.")}</p><div class="notice"><strong>Limites importantes</strong><p>Cette observation est automatisée et informative. Elle ne constitue ni un diagnostic, ni une preuve de causalité, ni un remplacement d’un avis professionnel.</p></div>${refs ? `<h3>Sources générales</h3><ul class="source-list">${refs}</ul>` : '<p class="muted small">Cette carte repose uniquement sur tes données personnelles.</p>'}`;
    $("#sourceDialog").showModal();
  }
  function dashboardNutritionSignals(meals) {
    const groups = [
      {
        key: "protein",
        label: "des sources de protéines",
        categories: [
          "high_protein",
          "plant_protein",
          "eggs",
          "poultry",
          "red_meat",
          "fish",
          "seafood",
          "legumes",
        ],
        nutrient: "protein",
        nutrientMinimum: 10,
        words: [
          "oeuf",
          "œuf",
          "poulet",
          "dinde",
          "thon",
          "saumon",
          "poisson",
          "tofu",
          "tempeh",
          "lentille",
          "pois chiche",
          "haricot",
          "yogourt grec",
          "fromage cottage",
          "viande",
          "boeuf",
          "bœuf",
          "porc",
          "crevette",
        ],
      },
      {
        key: "fibre",
        label: "des sources de fibres",
        categories: [
          "fruits",
          "vegetables",
          "legumes",
          "whole_grains",
          "nuts",
          "seeds",
          "high_fiber",
        ],
        nutrient: "fiber",
        nutrientMinimum: 2,
        words: [
          "avoine",
          "gruau",
          "pain complet",
          "pain entier",
          "riz brun",
          "quinoa",
          "lentille",
          "pois chiche",
          "haricot",
          "chia",
          "lin",
          "son",
          "céréale entière",
          "cereale entiere",
        ],
      },
      {
        key: "fruit",
        label: "des fruits",
        categories: ["fruits"],
        words: [
          "pomme",
          "banane",
          "orange",
          "clémentine",
          "clementine",
          "bleuet",
          "fraise",
          "framboise",
          "raisin",
          "mangue",
          "ananas",
          "poire",
          "kiwi",
          "melon",
          "fruit",
        ],
      },
      {
        key: "vegetable",
        label: "des légumes",
        categories: ["vegetables"],
        words: [
          "brocoli",
          "salade",
          "épinard",
          "epinard",
          "carotte",
          "concombre",
          "tomate",
          "poivron",
          "courgette",
          "chou",
          "asperge",
          "haricot vert",
          "légume",
          "legume",
        ],
      },
    ];
    const counts = Object.fromEntries(groups.map((g) => [g.key, 0]));
    meals.forEach((meal) => {
      const rawText = `${meal.description || ""} ${meal.notes || ""}`;
      const text = rawText.toLowerCase();
      const categoryIds = new Set(
        window.ENERGIE_FOOD_CATEGORIES?.categoryIdsForText?.(rawText) || [],
      );
      const nutrition = normalNutrition(meal.nutrition) ||
        estimateNutritionFromText(rawText);
      groups.forEach((group) => {
        const categoryMatch = (group.categories || []).some((id) =>
          categoryIds.has(id),
        );
        const nutrientMatch =
          group.nutrient &&
          Number.isFinite(Number(nutrition?.[group.nutrient])) &&
          Number(nutrition[group.nutrient]) >= group.nutrientMinimum;
        const wordMatch = group.words.some((word) => text.includes(word));
        if (categoryMatch || nutrientMatch || wordMatch) counts[group.key]++;
      });
    });
    const total = Math.max(1, meals.length);
    return groups.map((group) => ({
      ...group,
      count: counts[group.key],
      ratio: counts[group.key] / total,
    }));
  }
  function dashboardStory(meals) {
    const mealDates = meals
      .map((m) => m.date)
      .filter(Boolean)
      .sort();
    const firstDate = mealDates[0] || null;
    const signals = dashboardNutritionSignals(meals);
    const ordered = [...signals].sort(
      (a, b) => b.ratio - a.ratio || b.count - a.count,
    );
    const strongest = ordered[0];
    const enough = meals.length >= 3;
    const enoughForPriority = meals.length >= 8;
    const priority = enoughForPriority
      ? [...signals]
          .sort((a, b) => a.ratio - b.ratio || a.count - b.count)
          .find((signal) => signal.ratio < 0.3)
      : null;
    const habitSignal = ordered.find(
      (signal) => signal.key !== strongest?.key && signal.key !== priority?.key,
    );
    const since = firstDate ? formatDate(firstDate) : "Pas encore commencé";
    const strength =
      enough && strongest.count > 0 && strongest.ratio >= 0.4
        ? `Avec les données recueillies, ${strongest.label} sont repérées dans ${strongest.count} repas sur ${meals.length}.`
        : "Chaque repas ajouté aidera Énergie à faire ressortir tes habitudes positives.";
    const habit =
      enough && habitSignal?.count > 0
        ? `${habitSignal.label.charAt(0).toUpperCase() + habitSignal.label.slice(1)} apparaissent dans ${habitSignal.count} repas sur ${meals.length}, selon les aliments reconnus dans tes descriptions.`
        : "Ajoute encore quelques repas pour qu’une habitude claire puisse se dégager.";
    const suggestion = priority
      ? `Une piste possible serait d’intégrer davantage ${priority.label}, lorsqu’il est pertinent pour toi de le faire.`
      : enoughForPriority
        ? "Aucune priorité alimentaire claire ne ressort pour l’instant. Continue à décrire tes repas pour préciser le portrait."
        : "Continue simplement à noter tes repas; une suggestion plus personnalisée apparaîtra avec le temps.";
    return { since, strength, habit, suggestion };
  }
  function professionalDiscussionHtml(meals) {
    if (!db.settings.professionalSupport) return "";
    const subjects = [];
    const text = (m) => (m.description || "").toLowerCase();
    const mains = meals.filter((m) =>
      ["Déjeuner", "Dîner", "Souper"].includes(m.type),
    );
    const breakfasts = meals.filter((m) => m.type === "Déjeuner");
    const fibreWords = [
      "fruit",
      "pomme",
      "poire",
      "banane",
      "baie",
      "bleuet",
      "framboise",
      "légume",
      "brocoli",
      "carotte",
      "salade",
      "haricot",
      "lentille",
      "pois chiche",
      "avoine",
      "gruau",
      "pain complet",
      "blé entier",
      "quinoa",
      "noix",
      "graine",
    ];
    const proteinWords = [
      "oeuf",
      "œuf",
      "yogourt",
      "yaourt",
      "fromage",
      "lait",
      "tofu",
      "poulet",
      "dinde",
      "jambon",
      "thon",
      "saumon",
      "poisson",
      "viande",
      "protéine",
      "noix",
      "beurre d'arachide",
      "pois chiche",
    ];
    const fibreMeals = mains.filter((m) =>
      fibreWords.some((w) => text(m).includes(w)),
    ).length;
    const proteinBreakfasts = breakfasts.filter((m) =>
      proteinWords.some((w) => text(m).includes(w)),
    ).length;
    if (mains.length >= 8 && fibreMeals / mains.length < 0.35)
      subjects.push({
        icon: "🌾",
        title: "La place des fibres dans vos repas",
        text: "Les aliments riches en fibres apparaissent peu souvent dans les repas documentés.",
      });
    if (breakfasts.length >= 3 && proteinBreakfasts / breakfasts.length < 0.5)
      subjects.push({
        icon: "🥚",
        title: "Les protéines au déjeuner",
        text: "Plusieurs déjeuners enregistrés ne mentionnent pas clairement une source de protéines.",
      });
    const byDay = {};
    mains.forEach((m) => {
      (byDay[m.date] ??= new Set()).add(m.type);
    });
    const trackedDays = Object.values(byDay);
    if (
      trackedDays.length >= 5 &&
      trackedDays.filter((x) => x.size < 3).length / trackedDays.length > 0.5
    )
      subjects.push({
        icon: "🕒",
        title: "La régularité des repas",
        text: "Plusieurs journées ne contiennent pas les trois repas principaux dans le journal.",
      });
    if (!subjects.length)
      subjects.push({
        icon: "💬",
        title: "Vos priorités actuelles",
        text: "Votre journal peut servir de point de départ pour préciser ce que vous souhaitez améliorer ou mieux comprendre.",
      });
    return `<section class="card professional-discussion"><div class="professional-heading"><div class="professional-icon">👩‍⚕️</div><div><p class="eyebrow">Accompagnement professionnel</p><h3>À discuter avec votre professionnel</h3></div></div><p class="muted professional-intro">Voici des sujets possibles tirés uniquement de votre journal. Choisissez ceux qui vous semblent pertinents.</p><div class="professional-topics">${subjects
      .slice(0, 3)
      .map(
        (x) =>
          `<article><span>${x.icon}</span><div><strong>${esc(x.title)}</strong><p>${esc(x.text)}</p></div></article>`,
      )
      .join(
        "",
      )}</div><p class="professional-disclaimer">Ces observations servent à préparer une conversation. Elles ne constituent ni un diagnostic ni une recommandation médicale.</p></section>`;
  }

  const OBSERVATION_SEEN_KEY = "energieObservationFirstSeenV1";
  function observationFirstSeenMap() {
    try {
      return (
        JSON.parse(localStorage.getItem(OBSERVATION_SEEN_KEY) || "{}") || {}
      );
    } catch (_) {
      return {};
    }
  }
  function markAndDetectNewObservations(observations) {
    const seen = observationFirstSeenMap(),
      now = Date.now(),
      sevenDays = 7 * 86400000;
    let changed = false;
    const decorated = (observations || []).map((observation) => {
      if (!seen[observation.id]) {
        seen[observation.id] = new Date(now).toISOString();
        changed = true;
      }
      const firstSeen = Date.parse(seen[observation.id]);
      return {
        ...observation,
        isNew: Number.isFinite(firstSeen) && now - firstSeen <= sevenDays,
      };
    });
    if (changed)
      try {
        localStorage.setItem(OBSERVATION_SEEN_KEY, JSON.stringify(seen));
      } catch (_) {}
    return decorated;
  }
  function observationStrengthLabel(strength) {
    return strength === "strong"
      ? "Tendance forte"
      : strength === "moderate"
        ? "Tendance modérée"
        : "Tendance légère";
  }
  function brainGrowthState(maturity) {
    const days = Math.max(0, Number(maturity?.analyzableDays) || 0);
    const phrases = [
      "Chaque journée m’aide à mieux comprendre tes habitudes.",
      "Les tendances les plus fiables prennent du temps à apparaître.",
      "Plus ton historique grandit, plus mes observations deviennent précises.",
      "Aujourd’hui, j’apprends encore un peu grâce à ton journal.",
    ];
    const phrase = phrases[Math.floor(Date.now() / 86400000) % phrases.length];
    if (days < 11)
      return {
        plant: "🌱",
        title: "Je fais connaissance avec toi",
        text:
          "J’analyse progressivement tes repas et ton niveau d’énergie. " +
          phrase,
        next: 25,
        label: "avant les premières tendances",
      };
    if (days < 25)
      return {
        plant: "🌱",
        title: "Le cerveau d’Énergie apprend encore",
        text:
          "Je commence à voir certaines ressemblances, mais j’ai besoin d’un peu plus de données avant d’afficher une tendance. " +
          phrase,
        next: 25,
        label: "avant les premières tendances",
      };
    if (days < 50)
      return {
        plant: "🌿",
        title: "Premières connexions détectées",
        text:
          "J’ai maintenant assez de données pour commencer à repérer certaines associations dans ton journal. " +
          phrase,
        next: 50,
        label: "pour renforcer les observations",
      };
    if (days < 100)
      return {
        plant: "🌿",
        title: "Mes observations gagnent en confiance",
        text:
          "Les nouvelles journées renforcent progressivement certaines tendances et m’aident à écarter les coïncidences. " +
          phrase,
        next: 100,
        label: "vers un journal riche",
      };
    return {
      plant: "🌳",
      title: "Ton journal est riche en données",
      text: "Ton historique permet maintenant de produire des observations beaucoup plus solides qu’au début. Je continue tout de même d’apprendre avec chaque nouvelle journée.",
      next: null,
      label: "",
    };
  }
  function brainGrowthHeaderHtml(maturity) {
    const days = Math.max(0, Number(maturity?.analyzableDays) || 0),
      state = brainGrowthState(maturity);
    const previous = days < 25 ? 0 : days < 50 ? 25 : days < 100 ? 50 : 100;
    const progress = state.next
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(((days - previous) / (state.next - previous)) * 100),
          ),
        )
      : 100;
    const remaining = state.next ? Math.max(0, state.next - days) : 0;
    return `<section class="card energy-brain-card"><div class="energy-brain-visual" aria-hidden="true"><span class="energy-brain-plant">${state.plant}</span><span class="energy-brain-icon">🧠</span></div><div class="energy-brain-content"><p class="eyebrow">Le cerveau d’Énergie</p><h2>${esc(state.title)}</h2><p>${esc(state.text)}</p><div class="energy-brain-progress"><div class="energy-brain-progress-head"><strong>${state.plant} ${days} journée${days !== 1 ? "s" : ""} analysée${days !== 1 ? "s" : ""}</strong>${state.next ? `<span>${remaining} restante${remaining !== 1 ? "s" : ""}</span>` : `<span>Analyse avancée</span>`}</div><div class="energy-brain-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></div>${state.next ? `<small>${esc(state.label)} · ${days} / ${state.next}</small>` : `<small>La croissance continue avec chaque nouvelle journée.</small>`}</div></div></section>`;
  }
  function discoverySectionHtml(report) {
    const maturity = report?.maturity || {
      icon: "🌱",
      label: "Ton journal apprend encore",
      days: 0,
      analyzableDays: 0,
    };
    const observations = markAndDetectNewObservations(
      report?.observations || [],
    );
    const mature = Number(maturity?.analyzableDays || 0) >= 100;
    const cards = observations.length
      ? observations
          .map(
            (x, i) =>
              `<article class="card observation-card discovery-card observation-${x.confidence.cls}">${x.isNew ? `<div class="observation-new-badge">✨ Nouvelle tendance détectée</div>` : ""}<div class="discovery-card-top"><div class="discovery-icon">${x.icon}</div><div class="observation-badges"><span class="observation-strength">${observationStrengthLabel(x.metrics?.strength)}</span><span class="discovery-level ${x.confidence.cls}">${x.confidence.icon} ${esc(x.confidence.label)}</span></div></div><h3>${esc(x.title)}</h3><p class="observation-text">${esc(x.text)}</p>${discoveryComparisonHtml(x)}<div class="discovery-meta"><span>${x.samples.total} ${x.kind === "food-category-feeling-change" ? "repas comparés" : "journées analysées"}</span><button class="text-button why-discovery" data-discovery="${i}">Pourquoi je vois ceci?</button></div></article>`,
          )
          .join("")
      : `<section class="card discovery-empty observation-empty"><div class="food-art">${mature ? "🔎" : "🌱"}</div><h3>${mature ? "Aucune association assez nette pour le moment" : "Les premières tendances se préparent"}</h3><p>${mature ? "Le journal contient beaucoup de données, mais aucune différence suffisamment claire et répétée ne ressort actuellement. Le Cerveau préfère ne pas créer une tendance artificielle." : "Continue simplement à remplir ton journal. Le cerveau d’Énergie compare déjà tes journées, mais préfère attendre avant de montrer une observation trop fragile."}</p></section>`;
    return `${brainGrowthHeaderHtml(maturity)}<section class="discovery-section food-observations-section"><div class="discovery-heading"><div><p class="eyebrow">Observations alimentaires</p><h2>Ce que tes repas semblent révéler</h2></div><span class="discovery-count">${observations.length}/3</span></div><div class="discovery-grid">${cards}</div><p class="discovery-disclaimer">Ces observations comparent uniquement les journées de ton propre historique. Elles décrivent des associations possibles, ne prouvent aucune cause et ne constituent jamais un diagnostic.</p></section>`;
  }
  function discoveryComparisonHtml(x) {
    const scored=x.kind==="food-category-feeling-change",unit=scored?" point":"/5",item=scored?"repas":"journée",labels=Array.isArray(x.comparisonLabels)?x.comparisonLabels:["Avec","Sans"];
    return `<div class="observation-comparison" aria-label="Comparaison"><div><span>${esc(labels[0])}</span><strong>${esc(x.statistic)}${unit}</strong><small>${x.samples.exposed} ${item}${x.samples.exposed!==1?"s":""}</small></div><div class="observation-vs">vs</div><div><span>${esc(labels[1])}</span><strong>${esc(x.comparisonStatistic)}${unit}</strong><small>${x.samples.comparison} ${item}${x.samples.comparison!==1?"s":""}</small></div></div>`;
  }
  function openDiscoveryWhy(x) {
    $("#sourceTitle").textContent = "Pourquoi cette tendance apparaît-elle?";
    $("#sourceContent").innerHTML =
      `<p>${esc(x.basis || "Cette tendance utilise uniquement les données disponibles dans ton journal.")}</p>${discoveryComparisonHtml(x)}<div class="notice"><strong>À interpréter avec prudence</strong><p>Une association ne signifie pas que cet aliment ou cette catégorie est la cause du changement observé. Le sommeil, l’hydratation, les portions, le moment des repas et d’autres facteurs peuvent varier.</p></div><h3>Comment cette observation est calculée</h3><p class="muted small">Énergie classe les descriptions de repas par catégories et compare, pour chaque ressenti, son intensité après le repas à son intensité avant. Seuls les écarts répétés avec assez de repas comparables sont conservés.</p><p class="muted small">Le moteur préfère ne rien afficher lorsque les données sont insuffisantes ou que la différence est trop faible.</p>`;
    $("#sourceDialog").showModal();
  }
  function analysisDateNavigatorHtml() {
    if (!db.settings?.demoMode) return "";
    const c = demoAnalysisContext();
    if (!c) return "";
    const end = c.cutoff >= c.last,
      start = c.cutoff <= c.first;
    return `<section class="journal-date-nav analysis-date-nav"><button class="journal-arrow" id="analysisPreviousDay" ${start ? "disabled" : ""}>‹</button><button class="journal-date-main ${end ? "is-today" : ""}" id="analysisGoLatest"><span>Analyse à cette date</span><strong>${esc(formatDate(c.cutoff))}</strong><small>${c.elapsed} journée${c.elapsed !== 1 ? "s" : ""} de recul</small></button><button class="journal-arrow ${end ? "is-disabled" : ""}" id="analysisNextDay" ${end ? "disabled" : ""}>›</button></section>`;
  }
  function bindAnalysisDateNavigator() {
    $("#analysisPreviousDay")?.addEventListener("click", () => {
      const c = demoAnalysisContext();
      selectedDate = addDaysKey(selectedDate, -1);
      if (c && selectedDate < c.first) selectedDate = c.first;
      render();
    });
    $("#analysisNextDay")?.addEventListener("click", () => {
      const c = demoAnalysisContext();
      selectedDate = addDaysKey(selectedDate, 1);
      if (c && selectedDate > c.last) selectedDate = c.last;
      render();
    });
    $("#analysisGoLatest")?.addEventListener("click", () => {
      const c = demoAnalysisContext();
      if (c) {
        selectedDate = c.last;
        render();
      }
    });
  }
  function mealsThroughSelectedDate() {
    return allMeals().filter(
      (m) => !db.settings?.demoMode || m.date <= selectedDate,
    );
  }
  function demoReferenceObservationsFromJournal(profileId) {
    const digestiveTags = new Set([
        "bloating", "gas", "cramps", "diarrhea", "nausea", "stomachache",
      ]),
      digestiveIntensity = (day) => {
        const scores = (day.meals || []).flatMap((meal) =>
          (meal.feeling?.tags || [])
            .filter((tag) => digestiveTags.has(tag))
            .map((tag) =>
              Number(meal.feeling?.scores?.[tag] ?? meal.feeling?.rating ?? 3),
            ),
        );
        return scores.length
          ? scores.reduce((sum, score) => sum + (6 - score), 0) / scores.length
          : 0;
      },
      configs = {
        marie: {
          pattern: /(lait|lactose|fromage|yogourt|cr[eè]me|cr[eé]meuse|cappuccino|latte|pizza au fromage|sauce cr[eè]meuse)/i,
          delayed: false,
          icon: "🥛",
          title: "Produits laitiers et inconfort digestif",
          intensity: digestiveIntensity,
          text: (withValue, withoutValue) =>
            `L’inconfort digestif moyen est de ${withValue}/5 les journées avec produits laitiers repérés, comparativement à ${withoutValue}/5 durant les autres journées.`,
          basis: (withCount, withoutCount) =>
            `${withCount} journées avec produits laitiers repérés ont été comparées à ${withoutCount} journées sans produit laitier repéré. Les valeurs proviennent directement des ressentis digestifs du dossier fictif.`,
        },
        sophie: {
          pattern: /(gruau|pomme|chia|quinoa|pois chiches|chili|haricots|riz brun|l[eé]gumes|lentilles|amandes)/i,
          delayed: false,
          icon: "🌾",
          title: "Fibres et confort digestif",
          intensity: digestiveIntensity,
          text: (withValue, withoutValue) =>
            `L’inconfort digestif moyen est de ${withValue}/5 lorsque les sources de fibres sont clairement présentes, comparativement à ${withoutValue}/5 lorsqu’elles le sont moins.`,
          basis: (withCount, withoutCount) =>
            `${withCount} journées contenant des sources de fibres clairement repérées ont été comparées à ${withoutCount} autres journées du dossier fictif.`,
        },
        elodie: {
          pattern: /(soya|tofu|edamame|miso)/i,
          delayed: true,
          icon: "🌿",
          title: "Soya et réactions retardées",
          intensity: (day) => {
            const observations = day.observations || [];
            return observations.length
              ? observations.reduce(
                  (sum, item) => sum + (Number(item.intensity) || 0),
                  0,
                ) / observations.length
              : 0;
          },
          text: (withValue, withoutValue) =>
            `L’inconfort global moyen est de ${withValue}/5 durant les journées avec soya repéré ou le lendemain, comparativement à ${withoutValue}/5 sans exposition récente repérée.`,
          basis: (withCount, withoutCount) =>
            `${withCount} journées situées pendant ou après une exposition possible au soya ont été comparées à ${withoutCount} journées sans exposition récente repérée. Les symptômes proviennent surtout des observations globales.`,
        },
      },
      config = configs[profileId];
    if (!config) return [];
    const dates = Object.keys(db.days || {})
        .filter((date) => date <= selectedDate)
        .sort(),
      directDates = new Set(
        dates.filter((date) =>
          (db.days[date]?.meals || []).some((meal) =>
            config.pattern.test(meal.description || ""),
          ),
        ),
      ),
      previousDate = (date) => addDaysKey(date, -1),
      rows = dates.map((date) => ({
        date,
        exposed:
          directDates.has(date) ||
          (config.delayed && directDates.has(previousDate(date))),
        intensity: config.intensity(db.days[date] || {}),
      })),
      average = (values) =>
        values.length
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : 0,
      exposed = rows.filter((row) => row.exposed),
      comparison = rows.filter((row) => !row.exposed),
      exposedValue = average(exposed.map((row) => row.intensity)).toFixed(1),
      comparisonValue = average(
        comparison.map((row) => row.intensity),
      ).toFixed(1),
      confidence = {
        icon: "🌳",
        label: "Très forte tendance",
        cls: "high",
      },
      exposureCard = {
        id: `${profileId}-dynamic-exposure`,
        icon: config.icon,
        title: config.title,
        text: config.text(exposedValue, comparisonValue),
        statistic: exposedValue,
        comparisonStatistic: comparisonValue,
        samples: {
          exposed: exposed.length,
          comparison: comparison.length,
          total: rows.length,
        },
        metrics: { strength: "strong" },
        confidence,
        basis: config.basis(exposed.length, comparison.length),
      };
    const segmentSize = Math.max(1, Math.floor(rows.length / 3)),
      beginning = rows.slice(0, segmentSize),
      recent = rows.slice(-segmentSize),
      beginningValue = average(
        beginning.map((row) => row.intensity),
      ).toFixed(1),
      recentValue = average(recent.map((row) => row.intensity)).toFixed(1),
      progressionCard = {
        id: `${profileId}-dynamic-progression`,
        icon: "📉",
        title: "Évolution de l’inconfort dans le temps",
        text: `L’inconfort moyen passe de ${beginningValue}/5 au début du suivi à ${recentValue}/5 durant la période récente. Cette évolution correspond à celle montrée dans le graphique.`,
        statistic: beginningValue,
        comparisonStatistic: recentValue,
        comparisonLabels: ["Début", "Période récente"],
        samples: {
          exposed: beginning.length,
          comparison: recent.length,
          total: beginning.length + recent.length,
        },
        metrics: { strength: "strong" },
        confidence,
        basis: `Comparaison des ${beginning.length} premières journées et des ${recent.length} journées les plus récentes du dossier fictif.`,
      };
    return rows.length ? [exposureCard, progressionCard] : [];
  }
  function renderInsights() {
    const realMeals = mealsThroughSelectedDate(),
      referenceBrain = activeReferenceBrain(),
      usePreview =
        !db.settings.demoMode &&
        realMeals.length < 8 &&
        sessionStorage.getItem("dashboardPreview") !== "off";
    const demo = [
      {
        date: todayKey(),
        time: "07:30",
        type: "Déjeuner",
        description: "Yogourt grec, bleuets et granola",
        fatigueBefore: 3,
      },
      {
        date: todayKey(),
        time: "12:10",
        type: "Dîner",
        description: "Poulet, riz et brocoli",
        fatigueBefore: 2,
      },
      {
        date: todayKey(),
        time: "18:20",
        type: "Souper",
        description: "Pizza et salade",
        fatigueBefore: 3,
      },
      {
        date: "2026-07-18",
        time: "07:45",
        type: "Déjeuner",
        description: "Céréales sucrées et jus",
        fatigueBefore: 3,
      },
      {
        date: "2026-07-18",
        time: "12:30",
        type: "Dîner",
        description: "Poulet, riz et brocoli",
        fatigueBefore: 2,
      },
      {
        date: "2026-07-17",
        time: "18:00",
        type: "Souper",
        description: "Poutine",
        fatigueBefore: 4,
      },
      {
        date: "2026-07-16",
        time: "07:20",
        type: "Déjeuner",
        description: "Yogourt grec, bleuets et granola",
        fatigueBefore: 2,
      },
      {
        date: "2026-07-15",
        time: "12:05",
        type: "Dîner",
        description: "Poulet, riz et brocoli",
        fatigueBefore: 2,
      },
      {
        date: "2026-07-14",
        time: "18:40",
        type: "Souper",
        description: "Pizza",
        fatigueBefore: 3,
      },
      {
        date: "2026-07-13",
        time: "08:10",
        type: "Déjeuner",
        description: "Œufs et rôties",
        fatigueBefore: 3,
      },
    ];
    const meals = usePreview ? demo : realMeals,
      computedStory = dashboardStory(meals),
      story = referenceBrain
        ? { ...computedStory, ...referenceBrain.story }
        : computedStory;
    const dynamicDemoObservations = referenceBrain
      ? demoReferenceObservationsFromJournal(
          db.settings.demoProfileId || "marie",
        ).slice(0, referenceBrain.observations?.length || 0)
      : null;
    const discoveryReport = referenceBrain
      ? {
          observations: dynamicDemoObservations || [],
          maturity: {
            icon: "🌳",
            label: "Journal riche",
            days: Object.keys(db.days || {}).length,
            analyzableDays: Object.keys(db.days || {}).filter(
              (date) => (db.days[date]?.meals || []).length,
            ).length,
          },
        }
      : db.settings.insightsEnabled && window.EnergieObservationEngine
        ? window.EnergieObservationEngine.analyze(db, {
            meals,
            limit: 3,
            lookbackDays: 180,
            locale: window.ENERGIE_LOCALE || "fr-CA",
          })
        : {
            observations: [],
            maturity: {
              icon: "🌱",
              label: "Ton journal apprend encore",
              days: 0,
              analyzableDays: 0,
            },
          };
    const negativeFeelings =
      referenceFeelingStats(referenceBrain) ||
      historyNegativeFeelingStats(meals);
    const insights = db.settings.insightsEnabled
      ? referenceBrain?.insights || buildPersonalInsights(meals)
      : [];
    const previewBanner =
      realMeals.length < 8
        ? `<section class="preview-banner"><div><strong>${usePreview ? "👀 Mode aperçu activé" : "📊 Tes vraies données"}</strong><p>${usePreview ? "Des données exemples montrent la présentation. Elles ne sont jamais sauvegardées." : "Les observations utilisent seulement tes repas enregistrés."}</p></div><button class="secondary small" id="togglePreview">${usePreview ? "Voir mes données" : "Voir l’aperçu"}</button></section>`
        : "";
    $("#app").innerHTML =
      `${analysisDateNavigatorHtml()}<section class="hero"><p class="eyebrow">Tableau intelligent</p><h2>Ce qu’Énergie apprend sur toi</h2><p>Avec les données recueillies, Énergie fait ressortir des habitudes possibles, sans diagnostic et sans prétendre expliquer leurs causes.</p></section>${previewBanner}${discoverySectionHtml(discoveryReport)}<div class="grid dashboard-overview"><section class="card stat-card compact-stat-card compact-row-card dashboard-hero-card"><div class="stat-card-heading"><span>🍎</span><div><h3>Tu utilises Énergie depuis</h3><p class="muted small">Date de départ du journal</p></div></div><div class="metric metric-small">${esc(story.since)}</div></section><section class="card stat-card dashboard-mini-card"><span>⭐</span><h3>Point fort</h3><p>${esc(story.strength)}</p></section><section class="card stat-card dashboard-mini-card"><span>💡</span><h3>Habitude observée</h3><p>${esc(story.habit)}</p></section><section class="card stat-card dashboard-mini-card"><span>🎯</span><h3>Suggestion principale</h3><p>${esc(story.suggestion)}</p></section></div>${dashboardNegativeFeelingHtml(negativeFeelings)}${professionalDiscussionHtml(meals)}<div class="section-title"><h2>🧠 Autres observations</h2><span class="muted small">${insights.length} carte${insights.length > 1 ? "s" : ""}</span></div><div class="insight-grid">${insights.length ? insights.map(insightHtml).join("") : `<section class="card empty wide"><div class="food-art">🧠</div><p>${db.settings.insightsEnabled ? "Continue d’enregistrer tes repas pour obtenir d’autres observations personnelles." : "Les observations sont désactivées dans les paramètres."}</p></section>`}</div>${demoDiscoveryHtml()}${usePreview && !db.settings.demoMode ? '<p class="preview-footnote">Les valeurs du mode aperçu sont fictives et servent uniquement à prévisualiser la présentation.</p>' : ""}`;
    $("#togglePreview")?.addEventListener("click", () => {
      sessionStorage.setItem("dashboardPreview", usePreview ? "off" : "on");
      renderInsights();
    });
    $$(".why-insight").forEach(
      (b) =>
        (b.onclick = () => openInsightWhy(insights[Number(b.dataset.insight)])),
    );
    $$(".why-discovery").forEach(
      (b) =>
        (b.onclick = () =>
          openDiscoveryWhy(
            discoveryReport.observations[Number(b.dataset.discovery)],
          )),
    );
    bindAnalysisDateNavigator();
  }
  function toggleSetting(id, key) {
    $(id).onchange = (e) => {
      db.settings[key] = e.target.checked;
      saveLocal(`parametre-${key}`);
      render();
    };
  }

  function brainMealIcon(memory) {
    const types = Object.entries(memory.mealTypes || {}).sort(
      (a, b) => b[1] - a[1],
    );
    return mealIcon(types[0]?.[0] || "Collation");
  }
  function brainRelativeDate(value) {
    if (!value) return "Date inconnue";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Date inconnue";
    const anchor = db.settings?.demoMode ? selectedDate : todayKey();
    const days = Math.round((new Date(anchor + "T12:00:00") - d) / 864e5);
    if (days <= 0) return "Aujourd’hui";
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days} jours`;
    return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }
  function brainConfidenceLabel(value, occurrences) {
    const c = Number(value) || 0;
    if (occurrences < 2) return "Je découvre";
    if (c >= 0.78) return "Je sais";
    if (c >= 0.55) return "Je pense";
    return "J’apprends";
  }
  function brainKnowledgeData() {
    let memories = window.Brain?.memory?.list?.() || [];
    if (
      db.settings?.demoMode &&
      window.EnergieBrainModules?.memory?.createStore
    ) {
      const store = window.EnergieBrainModules.memory.createStore(null);
      store.learnMany(mealsThroughSelectedDate(), (text, options) =>
        window.EnergieBrainModules.parser.parseMeal(text, options),
      );
      memories = store.list();
    }
    const active = memories.filter((m) => !m.isForgotten);
    const totalUses = active.reduce(
      (n, m) => n + (Number(m.occurrences) || 0),
      0,
    );
    const avg = active.length
      ? active.reduce((n, m) => n + (Number(m.confidence) || 0), 0) /
        active.length
      : 0;
    const evidence = Math.min(1, totalUses / 60);
    const breadth = Math.min(1, active.length / 18);
    const global = Math.round(
      Math.min(0.96, avg * 0.58 + evidence * 0.27 + breadth * 0.15) * 100,
    );
    const ingredientCounts = {};
    active.forEach((m) =>
      Object.entries(m.ingredients || {}).forEach(
        ([name, count]) =>
          (ingredientCounts[name] =
            (ingredientCounts[name] || 0) + (Number(count) || 0)),
      ),
    );
    const foods = Object.entries(ingredientCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    return { memories: active, totalUses, global, foods };
  }
  function renderBrainIngredientGroup(label, items) {
    if (!items?.length) return "";
    return `<div class="brain-ingredient-row"><strong>${label}</strong><div class="brain-chip-list">${items
      .slice(0, 5)
      .map((x) => `<span class="brain-chip">${esc(x.name)}</span>`)
      .join("")}</div></div>`;
  }
  function renderBrainMealCard(memory) {
    const groups = memory.ingredientGroups || {};
    const confidence = Math.round((Number(memory.confidence) || 0) * 100);
    return `<article class="brain-meal-card"><div class="brain-meal-top"><div class="brain-meal-title"><span>${brainMealIcon(memory)}</span><div><h3>${esc(memory.label)}</h3><p class="muted small">Utilisé ${memory.occurrences} fois · ${brainRelativeDate(memory.lastSeenAt)}</p></div></div><span class="brain-certainty">${brainConfidenceLabel(memory.confidence, memory.occurrences)}</span></div><div class="brain-progress" aria-label="Confiance ${confidence} %"><i style="width:${confidence}%"></i></div><div class="brain-ingredient-groups">${renderBrainIngredientGroup("Toujours", groups.always)}${renderBrainIngredientGroup("Souvent", groups.often)}${renderBrainIngredientGroup("Parfois", groups.sometimes)}${renderBrainIngredientGroup("Rare", groups.rare)}</div>${!Object.keys(memory.ingredients || {}).length ? `<p class="muted small">Je reconnais ce repas, mais j’ai encore besoin de détails pour apprendre ses ingrédients habituels.</p>` : ""}</article>`;
  }

  function brainInsightCard(x) {
    const confidence = Math.round(x.confidence * 100);
    return `<article class="brain-insight-card"><div class="brain-insight-head"><span class="brain-insight-icon">${x.icon}</span><div><p class="eyebrow">${esc(x.category)} · ${esc(x.stage.label)}</p><h3>${esc(x.title)}</h3></div><strong>${confidence}%</strong></div><p>${esc(x.text)}</p><div class="brain-progress"><i style="width:${confidence}%"></i></div><details class="brain-proof"><summary>Pourquoi le Cerveau pense cela?</summary><ul>${x.evidence.map((e) => `<li>${esc(e)}</li>`).join("")}</ul><p class="muted small">${esc(x.disclaimer)}</p></details></article>`;
  }
  function brainInsightsHtml() {
    const analysisDB = db.settings?.demoMode
      ? {
          ...db,
          days: Object.fromEntries(
            Object.entries(db.days || {}).filter(
              ([date]) => date <= selectedDate,
            ),
          ),
        }
      : db;
    const report = window.EnergieInsightEngine?.analyze?.(analysisDB) || {
      insights: [],
      analyzedDays: 0,
    };
    if (!report.insights.length)
      return `<section class="card"><div class="brain-section-head"><div><h2>🔎 Observations personnalisées</h2><p class="muted small">Le moteur compare ton propre historique avec prudence.</p></div></div><div class="brain-insight-empty"><span>🌱</span><h3>Le Cerveau rassemble encore des preuves</h3><p class="muted">Il faut plusieurs journées comparables dans chaque groupe avant qu’une association apparaisse. Aucune conclusion ne sera forcée.</p></div></section>`;
    return `<section><div class="brain-section-head"><div><h2>🔎 Observations personnalisées</h2><p class="muted small">Associations détectées dans ${report.analyzedDays} journées récentes.</p></div><span class="muted small">${report.insights.length}</span></div><div class="brain-insight-grid">${report.insights.map(brainInsightCard).join("")}</div><p class="discovery-disclaimer">Ces observations décrivent des associations dans ton propre journal. Elles ne prouvent aucune cause et ne remplacent jamais un avis médical.</p></section>`;
  }
  function brainCoverageData(windowDays = 60) {
    const anchorKey = db.settings?.demoMode ? selectedDate : todayKey(),
      anchor = new Date(`${anchorKey}T12:00:00`),
      first = new Date(anchor);
    first.setDate(first.getDate() - (windowDays - 1));
    const firstKey = first.toLocaleDateString("en-CA"),
      entries = Object.entries(db.days || {})
        .filter(([date]) => date >= firstKey && date <= anchorKey)
        .sort(([a], [b]) => a.localeCompare(b)),
      documented = entries.filter(([, day]) =>
        (day.meals || []).length || day.sleepHours != null || Number(day.water) > 0 ||
        (day.activities || []).length || (day.observations || []).length,
      ),
      meals = documented.flatMap(([, day]) => day.meals || []),
      percent = (value, total) => total ? Math.round(value / total * 100) : 0;
    const counts = {
      before: meals.filter((meal) => Object.keys(normalizeFeelingScores(meal.feelingsBefore)).length).length,
      after: meals.filter((meal) => meal.feeling && Object.keys(normalizeFeelingScores(meal.feeling.scores)).length).length,
      sleep: documented.filter(([, day]) => day.sleepHours != null).length,
      water: documented.filter(([, day]) => Number(day.water) > 0).length,
      activity: documented.filter(([, day]) => (day.activities || []).length).length,
      precise: 0,
      protein: 0,
      fiber: 0,
      carbs: 0,
      sugars: 0,
      sodium: 0,
    };
    const foodCounts = {};
    meals.forEach((meal) => {
      const composition = mealCompositionAnalysis(meal.description || ""),
        recognized = (trait) => ["confirmed", "probable"].includes(composition?.status?.(trait));
      if (composition && ["protein", "fiber", "carbs"].some(recognized)) counts.precise += 1;
      if (recognized("protein")) counts.protein += 1;
      if (recognized("fiber")) counts.fiber += 1;
      if (recognized("carbs") || recognized("carbs_low")) counts.carbs += 1;
      if (meal.nutrition?.sugars != null) counts.sugars += 1;
      if (meal.nutrition?.sodium != null) counts.sodium += 1;
      const parsedFoods = window.EnergieBrainModules?.parser?.parseMeal?.(meal.description || "", { memory: false })?.foods || [];
      const names = new Set(parsedFoods.map((item) =>
        item.food?.names?.["fr-CA"] || item.matchedAlias || item.id,
      ).filter(Boolean));
      names.forEach((name) => { foodCounts[name] = (foodCounts[name] || 0) + 1; });
    });
    const mealTotal = meals.length, dayTotal = documented.length,
      coverageParts = [
        mealTotal ? percent(counts.before, mealTotal) : null,
        mealTotal ? percent(counts.after, mealTotal) : null,
        dayTotal ? percent(counts.sleep, dayTotal) : null,
        dayTotal ? percent(counts.water, dayTotal) : null,
        mealTotal ? percent(counts.precise, mealTotal) : null,
      ].filter((value) => value != null),
      quality = coverageParts.length ? Math.round(coverageParts.reduce((sum, value) => sum + value, 0) / coverageParts.length) : 0,
      foods = Object.entries(foodCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8),
      configuredSupplements = normalizeSupplements(db.settings?.supplements || []),
      supplements = configuredSupplements.map((name) => {
        const taken = documented.filter(([, day]) => normalizeSupplements(day.supplementsTaken || []).includes(name)).length;
        return { name, taken, total: dayTotal, percent: percent(taken, dayTotal) };
      });
    return { windowDays, dayTotal, mealTotal, counts, percent, quality, foods, supplements };
  }
  function brainCoverageMetric(icon, label, value, total, help) {
    const pct = total ? Math.round(value / total * 100) : 0;
    const preciseHelp = String(help || "").replace(
      /^Repas /,
      "Repas et collations ",
    );
    return `<div class="brain-coverage-row"><span class="brain-coverage-icon">${icon}</span><div><strong>${esc(label)}</strong><small>${esc(preciseHelp)}</small><i><em style="width:${pct}%"></em></i></div><b>${value}/${total}<small>${pct}%</small></b></div>`;
  }
  function brainNutritionCoverage(label, value, total, icon) {
    const pct = total ? Math.round(value / total * 100) : 0;
    return `<div class="brain-nutrition-signal"><span>${icon}</span><strong>${esc(label)}</strong><b>${pct}%</b><small>${value} entrées sur ${total}</small></div>`;
  }
  function renderBrain() {
    const data = brainCoverageData(60), dayTotal = data.dayTotal, mealTotal = data.mealTotal;
    const message = data.quality >= 75
      ? "Ton journal contient une base solide pour produire des observations prudentes."
      : data.quality >= 40
        ? "Plusieurs données sont déjà exploitables, mais certaines périodes restent incomplètes."
        : "Le Cerveau apprend encore : quelques notes régulières rendront les futures observations plus fiables.";
    const supplementsHtml = data.supplements.length
      ? `<div class="brain-supplement-grid">${data.supplements.map((item) => `<div class="brain-supplement-row"><span>${supplementIcon(item.name)}</span><div><strong>${esc(item.name)}</strong><small>${item.taken} journée${item.taken !== 1 ? "s" : ""} cochée${item.taken !== 1 ? "s" : ""} sur ${item.total}</small><i><em style="width:${item.percent}%"></em></i></div><b>${item.percent}%</b></div>`).join("")}</div>`
      : `<p class="muted">Aucun supplément n’est configuré dans Profil.</p>`;
    $("#app").innerHTML =
      `${analysisDateNavigatorHtml()}<section class="hero brain-hero"><p class="eyebrow">🧠 Ce qu’Énergie peut réellement analyser</p><h2>Qualité de ton journal</h2><p>${message}</p><div class="brain-confidence"><div class="brain-ring" style="--p:${data.quality}"><strong>${data.quality}%</strong></div><div><strong>Couverture des données</strong><p class="muted small">Calculée sur les 60 derniers jours. Cette jauge mesure la présence des informations, pas la qualité de tes habitudes.</p></div></div><div class="brain-summary-grid"><div class="brain-stat"><strong>${dayTotal}</strong><small>journées documentées</small></div><div class="brain-stat"><strong>${mealTotal}</strong><small>repas consignés</small></div><div class="brain-stat"><strong>${data.counts.after}</strong><small>ressentis après</small></div></div></section><div class="stack"><section class="card"><div class="brain-section-head"><div><h2>📋 Qualité des données</h2><p class="muted small">Couverture durant les 60 derniers jours documentés.</p></div></div><div class="brain-coverage-list">${brainCoverageMetric("🙂", "Ressentis avant", data.counts.before, mealTotal, "Repas possédant au moins un ressenti avant")}${brainCoverageMetric("🧠", "Ressentis après", data.counts.after, mealTotal, "Repas possédant au moins un ressenti après")}${brainCoverageMetric("😴", "Sommeil", data.counts.sleep, dayTotal, "Journées où le sommeil est documenté")}${brainCoverageMetric("💧", "Hydratation", data.counts.water, dayTotal, "Journées où l’eau est documentée")}${brainCoverageMetric("🚶", "Activité", data.counts.activity, dayTotal, "Journées comprenant une activité")}</div></section><section class="card"><div class="brain-section-head"><div><h2>🥗 Données alimentaires reconnaissables</h2><p class="muted small">Présence détectable dans les descriptions ou estimations — aucune évaluation de quantité.</p></div></div><div class="brain-nutrition-grid">${brainNutritionCoverage("Protéines", data.counts.protein, mealTotal, "🥚")}${brainNutritionCoverage("Fibres", data.counts.fiber, mealTotal, "🌾")}${brainNutritionCoverage("Glucides", data.counts.carbs, mealTotal, "🍞")}${brainNutritionCoverage("Sucres estimables", data.counts.sugars, mealTotal, "🍓")}${brainNutritionCoverage("Sodium estimable", data.counts.sodium, mealTotal, "🧂")}</div><p class="muted tiny brain-coverage-note">Ces pourcentages indiquent seulement dans combien de repas la donnée peut être reconnue ou estimée. Ils ne signifient pas que l’apport est suffisant ou excessif.</p></section><section class="card"><div class="brain-section-head"><div><h2>💊 Suppléments</h2><p class="muted small">Régularité des cases cochées sur les journées documentées.</p></div></div>${supplementsHtml}<p class="muted tiny brain-coverage-note">Une case cochée indique ce qui a été consigné dans Énergie; elle ne confirme pas la prise réelle.</p></section><section class="card"><div class="brain-section-head"><div><h2>🍎 Aliments fréquents</h2><p class="muted small">Aliments explicitement reconnus dans les repas des 60 derniers jours.</p></div></div>${data.foods.length ? `<div class="brain-favorites">${data.foods.map(([name, count]) => `<div class="brain-food"><strong>${esc(name)}</strong><span>${count} apparition${count > 1 ? "s" : ""}</span></div>`).join("")}</div>` : `<p class="muted">J’ai besoin de descriptions un peu plus détaillées pour identifier les aliments fréquents.</p>`}</section><section class="card"><h2>🌱 En apprentissage</h2><p>${mealTotal ? `Énergie dispose de ${mealTotal} repas sur cette période. Continue surtout à préciser les ingrédients et à noter les ressentis après les repas : ce sont les données les plus utiles pour produire des observations fiables.` : "Commence simplement à remplir ton journal. Cette section indiquera progressivement quelles données deviennent suffisamment complètes pour être analysées."}</p><p class="muted small">Les associations et tendances possibles demeurent dans l’onglet Observations afin d’éviter les répétitions.</p></section></div>`;
    const brainMealLabel = $(".brain-summary-grid .brain-stat:nth-child(2) small");
    if (brainMealLabel) brainMealLabel.textContent = "repas et collations consignés";
    const nutritionCoverageNote = $(
      ".brain-nutrition-grid + .brain-coverage-note",
    );
    if (nutritionCoverageNote)
      nutritionCoverageNote.textContent =
        "Ces pourcentages indiquent seulement dans combien d’entrées — repas ou collations — la donnée peut être reconnue ou estimée. Ils ne signifient pas que l’apport est suffisant ou excessif.";
    const learningParagraph = $("#app .stack > section.card:last-child > p:first-of-type");
    if (learningParagraph && mealTotal)
      learningParagraph.textContent = `Énergie dispose de ${mealTotal} repas et collations sur cette période. Continue surtout à préciser les ingrédients et à noter les ressentis après les entrées alimentaires : ce sont les données les plus utiles pour produire des observations fiables.`;
    bindAnalysisDateNavigator();
  }

  let keepPhysiologicalPanelOpen = false;
  function physiologicalContextHtml() {
    const allowed = new Set(["none", "menstrual", "pregnancy"]),
      context = allowed.has(db.settings?.physiologicalContext) ? db.settings.physiologicalContext : "none",
      label = context === "menstrual" ? "Cycle menstruel" : context === "pregnancy" ? "Grossesse" : "Non activé",
      icon = context === "pregnancy" ? "👶" : "🌙";
    const fields = context === "menstrual"
      ? `<label class="physiological-date-field"><span>Début des dernières menstruations</span><input type="date" id="menstrualLastStart" max="${todayKey()}" value="${esc(db.settings?.menstrualLastStart || "")}"></label><p class="muted tiny">Cette date servira éventuellement à comparer des périodes semblables, sans attribuer automatiquement un ressenti au cycle.</p>`
      : context === "pregnancy"
        ? `<label class="physiological-date-field"><span>Date prévue d’accouchement <small>(facultative)</small></span><input type="date" id="pregnancyDueDate" value="${esc(db.settings?.pregnancyDueDate || "")}"></label><p class="muted tiny">Cette information servira éventuellement à situer le contexte. Énergie ne remplace pas le suivi médical.</p>`
        : `<div class="physiological-empty"><span aria-hidden="true">○</span><p>Aucun contexte physiologique n’est utilisé.</p></div>`;
    return `<details class="card physiological-context-card" ${keepPhysiologicalPanelOpen ? "open" : ""}><summary><span class="physiological-context-title"><b aria-hidden="true">${icon}</b><span><strong>Contexte physiologique</strong><small>Cycle menstruel ou grossesse · facultatif</small></span></span><span class="physiological-context-meta"><b>${esc(label)}</b><i aria-hidden="true">›</i></span></summary><div class="physiological-context-content"><p class="muted small">Ces renseignements sensibles restent facultatifs. Ils sont enregistrés avec ton profil, mais ne modifient pas encore les analyses.</p><label class="physiological-context-select"><span>Contexte à prendre en compte</span><select id="physiologicalContext"><option value="none" ${context === "none" ? "selected" : ""}>Aucun</option><option value="menstrual" ${context === "menstrual" ? "selected" : ""}>Cycle menstruel</option><option value="pregnancy" ${context === "pregnancy" ? "selected" : ""}>Grossesse</option></select></label><div class="physiological-context-fields">${fields}</div><p class="physiological-context-privacy">🔒 Énergie ne tente jamais de déduire une grossesse ou un cycle à partir des repas et ressentis.</p></div></details>`;
  }

  function renderProfile() {
    const backups = (() => {
      try {
        return JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]").length;
      } catch (_) {
        return 0;
      }
    })();
    const supplements = normalizeSupplements(db.settings?.supplements || []),
      nutritionSettingsHtml = nutritionVisibleToViewer()
        ? `<div class="notice info-notice"><strong>Estimations nutritionnelles professionnelles</strong><p>Les calories et nutriments sont calculés pour soutenir l’analyse professionnelle, mais demeurent cachés au client.</p></div>`
        : `<div class="notice info-notice"><strong>Une expérience sans chiffres nutritionnels</strong><p>Les calories et nutriments sont volontairement cachés. Ils peuvent être analysés dans l’espace professionnel sans influencer ton rapport à l’alimentation.</p></div>`;
    $("#app").innerHTML =
      `<section class="hero"><p class="eyebrow">Profil et préférences</p><h2>${session ? esc(session.user.email) : "Protège ton historique"}</h2><p>${session ? "La synchronisation Supabase est active." : "La copie locale seule peut disparaître sur iPhone."}</p></section><div class="stack"><section class="card">${session ? `<div class="settings-row"><div><h3>Compte connecté</h3><p class="muted small">${esc(session.user.email)}</p></div><button class="secondary" id="syncNow">Synchroniser</button></div><button class="danger" id="signOut">Se déconnecter</button>` : `<h3>Sauvegarde en ligne</h3><p class="muted">Connecte-toi afin que les repas et favoris soient enregistrés dans Supabase.</p><button class="primary" id="signIn">Se connecter</button>`}</section><section class="card seasonal-setting-card"><h3>🎉 Ambiance saisonnière</h3><p class="muted small">De petites décorations changent selon la date consultée, les saisons et certains moments de l’année.</p><label class="toggle-row"><span><strong>Icônes saisonnières</strong><small>Affiche une petite icône près de la date dans le Journal</small></span><input id="settingSeasonalIcons" type="checkbox" ${db.settings.seasonalIcons !== false ? "checked" : ""}></label></section><section class="card"><h3>Observations et recommandations</h3><p class="muted small">Tu gardes le contrôle sur ce qui apparaît dans les observations.</p><label class="toggle-row"><span><strong>Insights personnels</strong><small>Tendances calculées à partir de ton historique</small></span><input id="settingInsights" type="checkbox" ${db.settings.insightsEnabled ? "checked" : ""}></label><label class="toggle-row"><span><strong>Estimation nutritionnelle</strong><small>Affiche par défaut les calories, protéines, glucides, lipides, fibres, sucres et sodium disponibles. Tout reste modifiable et approximatif.</small></span><input id="settingMacros" type="checkbox" ${db.settings.macroTracking ? "checked" : ""}></label><label class="toggle-row setting-dependent ${db.settings.macroTracking ? "" : "is-disabled"}"><span><strong>Détecter automatiquement les estimations nutritionnelles</strong><small>Préremplit les valeurs reconnues; elles restent toujours modifiables.</small></span><input id="settingAutoNutrition" type="checkbox" ${db.settings.autoNutritionEstimates !== false ? "checked" : ""} ${db.settings.macroTracking ? "" : "disabled"}></label><label class="toggle-row"><span><strong>Observations nutritionnelles</strong><small>Estimations prudentes selon les descriptions saisies</small></span><input id="settingNutrition" type="checkbox" ${db.settings.nutritionObservations ? "checked" : ""}></label><label class="toggle-row"><span><strong>Suggestions générales</strong><small>Conseils facultatifs et non moralisateurs</small></span><input id="settingRecommendations" type="checkbox" ${db.settings.generalRecommendations ? "checked" : ""}></label><label class="toggle-row"><span><strong>Afficher les sources</strong><small>Ajoute « Pourquoi je vois ceci? » aux cartes</small></span><input id="settingSources" type="checkbox" ${db.settings.showSources ? "checked" : ""}></label></section><section class="card"><div class="settings-row"><div><h3>Suppléments</h3><p class="muted small">Ajoute ceux que tu prends et ils apparaîtront cochés par défaut dans le journal.</p></div></div><div class="supplement-input-row"><input id="supplementNameInput" type="text" placeholder="Ex. Vitamine D3" autocomplete="off"><button class="secondary small" id="addSupplement" type="button">Ajouter</button></div>${supplements.length ? `<div class="supplement-chip-row">${supplements.map((name) => `<span class="supplement-chip">${esc(name)} <button type="button" data-delete-supplement="${esc(name)}" aria-label="Supprimer ${esc(name)}">×</button></span>`).join("")}</div>` : `<p class="muted small supplement-empty">Aucun supplément ajouté pour le moment.</p>`}</section><section class="card professional-setting-card"><div class="professional-setting-title"><span>👩‍⚕️</span><div><h3>Accompagnement professionnel</h3><p class="muted small">Prépare des sujets à apporter lors de tes rendez-vous.</p></div></div><label class="toggle-row"><span><strong>Préparer mes rendez-vous</strong><small>Affiche dans le Tableau une section « À discuter avec votre professionnel »</small></span><input id="settingProfessionalSupport" type="checkbox" ${db.settings.professionalSupport ? "checked" : ""}></label><p class="muted tiny professional-privacy">Aucune donnée n’est partagée automatiquement. Tu gardes le contrôle de ton journal en tout temps.</p></section><section class="card"><div class="settings-row"><div><h3>Message d’information</h3><p class="muted small">Revoir les limites et l’utilisation prévue de l’application</p></div><button class="secondary" id="showWelcomeAgain">Afficher</button></div></section><section class="card"><h3>😊 ${t("Ressenti")}</h3><p class="muted small">Choisis si et quand l’application te rappelle de noter ton ressenti après un repas.</p><label class="toggle-row"><span><strong>Rappels de ressenti</strong><small>Désactive ceci pour ne recevoir aucun rappel</small></span><input id="settingFeelingReminders" type="checkbox" ${db.settings.feelingReminders !== false ? "checked" : ""}></label><div id="feelingReminderOptions" class="feeling-settings ${db.settings.feelingReminders === false ? "is-disabled" : ""}"><p class="settings-label">Repas concernés</p><div class="settings-check-grid">${["Déjeuner", "Dîner", "Souper", "Collation"].map((t) => `<label class="setting-option"><input type="checkbox" data-feeling-meal-type="${t}" ${(db.settings.feelingMealTypes || []).includes(t) ? "checked" : ""}><span>${mealIcon(t)} ${window.t(t)}</span></label>`).join("")}</div><label>Délai après le repas<select id="feelingDelay"><option value="0.5" ${Number(db.settings.feelingDelayHours) === 0.5 ? "selected" : ""}>30 minutes</option><option value="1" ${Number(db.settings.feelingDelayHours) === 1 ? "selected" : ""}>1 heure</option><option value="2" ${Number(db.settings.feelingDelayHours) === 2 ? "selected" : ""}>2 heures</option></select></label><p class="muted tiny feeling-importance-note">🧠 Les ressentis sont la base des observations d’Énergie. Les noter après les repas aide à comparer ce qui change réellement dans le temps.</p><button class="secondary small" id="enableNotifications" type="button">Autoriser les notifications</button><p class="muted tiny">Sur le Web, les rappels système dépendent des permissions du navigateur et peuvent nécessiter que l’app soit ouverte. Les ressentis dus restent toujours visibles dans le Journal.</p></div></section><section class="card"><div class="settings-row"><div><h3>Objectif d'eau</h3><p class="muted small">Nombre de gouttes affichées</p></div><input id="waterGoal" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" value="${db.settings.waterGoal || 8}" style="width:80px"></div></section><details class="card profile-favorites-panel"><summary><span class="profile-favorites-title"><b aria-hidden="true">⭐</b><span><strong>${t("Mes favoris")}</strong><small>Repas enregistrés pour une saisie rapide</small></span></span><span class="profile-favorites-meta"><b>${db.favorites.length}</b><i aria-hidden="true">›</i></span></summary><div id="profileFavoritesList" class="stack profile-favorites-list">${renderFavoriteList(db.favorites)}</div></details>${professionalDemoEntryHtml()}${hasDemoAccess ? demoProfileCardsHtml() : ``}${db.settings.demoMode ? `<section class="card demo-profile-card"><div class="settings-row"><div><h3>🧪 Mode démo actif · lecture seule</h3><p class="muted small">Tu explores 180 jours de données fictives de ${esc(activeDemoProfile().name)}.</p></div><span class="demo-pill">${esc(activeDemoProfile().name)}</span></div><div class="dialog-actions"><button class="secondary" id="replayDemoTour">Revoir la visite</button><button class="primary" id="leaveDemoProfile">Revenir à mon journal</button></div></section>` : ``}<section class="card"><h3>Sauvegarde supplémentaire</h3><p class="muted small">${backups} copie(s) locale(s) de sécurité.</p><div class="dialog-actions"><button class="secondary" id="exportData">Exporter JSON</button><button class="secondary" id="importData">Importer JSON</button></div></section></div>`;
    const nutritionAnchor = $("#settingNutrition")?.closest("label");
    $("#app .hero")?.insertAdjacentHTML("beforeend", `<small class="profile-build">Version ${APP_RELEASE}</small>`);
    const feelingSettingsSection = $("#settingFeelingReminders")?.closest("section.card"),
      feelingIntro = feelingSettingsSection?.querySelector(":scope > p");
    if (feelingIntro) feelingIntro.insertAdjacentHTML("afterend", trackedFeelingsProfileHtml());
    if (nutritionAnchor) nutritionAnchor.insertAdjacentHTML("beforebegin", nutritionSettingsHtml);
    $("#settingMacros")?.closest("label")?.remove();
    if (!nutritionVisibleToViewer()) $("#settingAutoNutrition")?.closest("label")?.remove();
    $("#app .stack")?.firstElementChild?.insertAdjacentHTML("afterend", physiologicalContextHtml());
    decorateSupplementIcons();
    keepPhysiologicalPanelOpen = false;
    $("#signIn")?.addEventListener("click", () => {
      setAuthMode("login");
      $("#authMessage").textContent = "";
      $("#authDialog").showModal();
    });
    $("#editTrackedFeelings")?.addEventListener("click", () => openTrackedFeelingsDialog(false));
    $("#syncNow")?.addEventListener("click", async () => {
      await syncNow();
      await pullCloud();
    });
    $("#signOut")?.addEventListener("click", async () => {
      if (!confirm("Se déconnecter de ce compte? La copie locale sera retirée de cet appareil après vérification de la synchronisation.")) return;
      if (outbox().length) await syncNow();
      if (outbox().length) {
        alert("La déconnexion est suspendue : certaines données ne sont pas encore sauvegardées. Vérifie ta connexion et réessaie.");
        return;
      }
      const { error } = await client.auth.signOut();
      if (error) {
        alert(`La déconnexion n’a pas abouti : ${error.message || "réessaie dans un moment"}.`);
        return;
      }
      session = null;
      clearLocalJournalAfterSignOut();
      render();
    });
    $("#physiologicalContext")?.addEventListener("change", (event) => {
      const value = ["menstrual", "pregnancy"].includes(event.target.value) ? event.target.value : "none";
      db.settings.physiologicalContext = value;
      if (value !== "menstrual") db.settings.menstrualLastStart = "";
      if (value !== "pregnancy") db.settings.pregnancyDueDate = "";
      saveLocal("contexte-physiologique");
      keepPhysiologicalPanelOpen = true;
      renderProfile();
    });
    $("#menstrualLastStart")?.addEventListener("change", (event) => {
      db.settings.menstrualLastStart = /^\d{4}-\d{2}-\d{2}$/.test(event.target.value) ? event.target.value : "";
      saveLocal("contexte-cycle");
    });
    $("#pregnancyDueDate")?.addEventListener("change", (event) => {
      db.settings.pregnancyDueDate = /^\d{4}-\d{2}-\d{2}$/.test(event.target.value) ? event.target.value : "";
      saveLocal("contexte-grossesse");
    });
    $("#waterGoal").onchange = (e) => {
      db.settings.waterGoal = clamp(e.target.value, 1, 20);
      saveLocal("objectif-eau");
      render();
    };
    $("#addSupplement").onclick = () => {
      const name = $("#supplementNameInput").value.trim();
      if (!name) return;
      db.settings.supplements = normalizeSupplements([
        ...normalizeSupplements(db.settings?.supplements || []),
        name,
      ]);
      db.settings.supplementsUpdatedAt = new Date().toISOString();
      setDayChanged(todayKey());
      renderProfile();
    };
    $$("[data-delete-supplement]").forEach(
      (button) =>
        (button.onclick = () => {
          const name = button.dataset.deleteSupplement;
          db.settings.supplements = normalizeSupplements(
            (db.settings.supplements || []).filter((item) => item !== name),
          );
          const changedDates = [];
          Object.entries(db.days).forEach(([date, day]) => {
            const before = normalizeSupplements(day.supplementsTaken || []);
            day.supplementsTaken = normalizeSupplements(
              before.filter((item) => item !== name),
            );
            if (day.supplementsTaken.length !== before.length) {
              day.updatedAt = new Date().toISOString();
              changedDates.push(date);
            }
          });
          db.settings.supplementsUpdatedAt = new Date().toISOString();
          setDayChanged(todayKey());
          changedDates
            .filter((date) => date !== todayKey())
            .forEach((date) => enqueue({ kind: "day", date }));
          renderProfile();
        }),
    );
    toggleSetting("#settingSeasonalIcons", "seasonalIcons");
    toggleSetting("#settingInsights", "insightsEnabled");
    const macroToggle = $("#settingMacros");
    if (macroToggle)
      macroToggle.onchange = (e) => {
        db.settings.macroTracking = e.target.checked;
        saveLocal("parametre-macroTracking");
        render();
      };
    toggleSetting("#settingAutoNutrition", "autoNutritionEstimates");
    toggleSetting("#settingNutrition", "nutritionObservations");
    toggleSetting("#settingRecommendations", "generalRecommendations");
    toggleSetting("#settingSources", "showSources");
    toggleSetting("#settingProfessionalSupport", "professionalSupport");
    const feelingToggle = $("#settingFeelingReminders");
    if (feelingToggle)
      feelingToggle.onchange = async (e) => {
        db.settings.feelingReminders = e.target.checked;
        saveLocal("rappels-ressenti");
        if (e.target.checked) await requestFeelingNotifications();
        scheduleFeelingChecks();
        renderProfile();
      };
    $$("[data-feeling-meal-type]").forEach(
      (c) =>
        (c.onchange = () => {
          db.settings.feelingMealTypes = $$(
            "[data-feeling-meal-type]:checked",
          ).map((x) => x.dataset.feelingMealType);
          saveLocal("repas-rappels-ressenti");
          scheduleFeelingChecks();
        }),
    );
    $("#feelingDelay")?.addEventListener("change", (e) => {
      db.settings.feelingDelayHours = Number(e.target.value);
      db.settings.feelingDelayPreferenceSet = true;
      saveLocal("delai-ressenti");
      scheduleFeelingChecks();
    });
    $("#enableNotifications")?.addEventListener("click", async () => {
      const ok = await requestFeelingNotifications();
      alert(
        ok
          ? "Notifications autorisées."
          : "Les notifications ne sont pas autorisées dans ce navigateur.",
      );
    });
    $("#showWelcomeAgain").onclick = () => $("#welcomeDialog").showModal();
    $("#launchDemoProfile")?.addEventListener("click", () =>
      showExperienceLaunchIfNeeded(true),
    );
    $$(`[data-open-demo-profile]`).forEach((button) =>
      button.addEventListener("click", () =>
        switchDemoProfile(button.dataset.openDemoProfile),
      ),
    );
    $("#replayDemoTour")?.addEventListener("click", startDemoTour);
    $("#leaveDemoProfile")?.addEventListener("click", leaveDemoMode);
    bindFavoriteActions();
    $("#exportData").onclick = exportData;
    $("#importData").onclick = () => $("#importFile").click();
  }

  // --- Ajout rapide par code-barres -------------------------------------------------
  function barcodeCache() {
    try {
      return JSON.parse(localStorage.getItem(BARCODE_CACHE_KEY) || "{}") || {};
    } catch (_) {
      return {};
    }
  }
  function saveBarcodeCache(code, product) {
    try {
      const cache = barcodeCache();
      cache[code] = { ...product, savedAt: new Date().toISOString() };
      const entries = Object.entries(cache)
        .sort((a, b) =>
          String(b[1].savedAt).localeCompare(String(a[1].savedAt)),
        )
        .slice(0, 150);
      localStorage.setItem(
        BARCODE_CACHE_KEY,
        JSON.stringify(Object.fromEntries(entries)),
      );
    } catch (e) {
      console.warn("cache code-barres", e);
    }
  }
  function cleanBarcode(value) {
    return String(value || "")
      .replace(/\D/g, "")
      .slice(0, 18);
  }
  function stopBarcodeCamera() {
    try {
      barcodeControls?.stop?.();
    } catch (_) {}
    barcodeControls = null;
    const video = $("#barcodeVideo");
    if (video?.srcObject) {
      video.srcObject.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    barcodeReader = null;
    barcodeBusy = false;
  }
  function setBarcodeStatus(text) {
    const el = $("#barcodeCameraStatus");
    if (el) el.textContent = text;
  }
  function resetBarcodeResult() {
    barcodeLastCode = "";
    barcodeLastProduct = null;
    $("#barcodeResult").hidden = true;
    $("#barcodeProductName").value = "";
    $("#barcodeBrand").textContent = "";
    $("#barcodeProductImage").hidden = true;
    $("#barcodeProductImage").removeAttribute("src");
  }
  function appendScannedFood(name) {
    const input = $(`#${barcodeTargetInputId}`),
      clean = String(name || "").trim();
    if (!input || !clean) return;
    const current = input.value.trim();
    if (!current) input.value = clean;
    else if (
      !current
        .toLocaleLowerCase("fr-CA")
        .includes(clean.toLocaleLowerCase("fr-CA"))
    )
      input.value = `${current.replace(/[\s,;]+$/, "")}, ${clean}`;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function parseServingGrams(value) {
    const match = String(value || "")
      .replace(",", ".")
      .match(/([0-9]+(?:\.[0-9]+)?)\s*g\b/i);
    const n = match ? Number(match[1]) : null;
    return Number.isFinite(n) && n > 0 && n <= 2000 ? n : null;
  }
  function scaleNutritionPer100g(n, grams) {
    n = normalNutrition(n);
    grams = Number(grams);
    if (!n || !Number.isFinite(grams) || grams <= 0) return null;
    const f = grams / 100,
      scale = (k) => (n[k] == null ? null : Math.round(n[k] * f * 10) / 10);
    return normalNutrition({
      calories: scale("calories"),
      protein: scale("protein"),
      carbs: scale("carbs"),
      fat: scale("fat"),
      fiber: scale("fiber"),
      sugars: scale("sugars"),
      sodium: scale("sodium"),
      source: "barcode",
      confidence: "high",
      basis: `portion de ${Math.round(grams)} g`,
      estimated: true,
    });
  }
  function updateBarcodePortion() {
    if (!barcodeLastProduct) return;
    const grams = Number($("#barcodePortionGrams")?.value),
      base = barcodeLastProduct.nutritionPer100g;
    if (base && Number.isFinite(grams) && grams > 0)
      barcodeLastProduct.nutrition = scaleNutritionPer100g(base, grams);
    const preview = $("#barcodeNutritionPreview");
    if (preview && nutritionVisibleToViewer() && barcodeLastProduct.nutrition) {
      preview.hidden = false;
      preview.innerHTML = `<strong>≈ ${esc(nutritionText(barcodeLastProduct.nutrition))}</strong><small>${esc(barcodeLastProduct.nutrition.basis || "portion indiquée")} · modifiable après l’ajout</small>`;
    }
  }
  function showBarcodeProduct(product, code, found = true) {
    barcodeLastCode = code;
    barcodeLastProduct = product;
    const portionWrap = $("#barcodePortionWrap"),
      portionInput = $("#barcodePortionGrams");
    if (portionWrap && portionInput) {
      const suggested = product.servingGrams || 100;
      portionInput.value = String(Math.round(suggested));
      portionWrap.hidden = !nutritionVisibleToViewer() || !product.nutritionPer100g;
    }
    const result = $("#barcodeResult"),
      name = $("#barcodeProductName"),
      brand = $("#barcodeBrand"),
      image = $("#barcodeProductImage"),
      badge = $("#barcodeResultBadge"),
      help = $("#barcodeResultHelp"),
      preview = $("#barcodeNutritionPreview");
    result.hidden = false;
    name.value = product.name || "";
    brand.textContent = product.brand || "";
    badge.textContent = found ? "Produit reconnu" : "Produit inconnu";
    help.textContent = found
      ? "Tu peux simplifier ou modifier le nom avant de l’ajouter."
      : "Écris simplement le nom que tu veux ajouter au repas.";
    if (product.image) {
      image.src = product.image;
      image.hidden = false;
    } else {
      image.hidden = true;
      image.removeAttribute("src");
    }
    if (product.nutritionPer100g) updateBarcodePortion();
    if (nutritionVisibleToViewer() && product.nutrition) {
      preview.hidden = false;
      preview.innerHTML = `<strong>≈ ${esc(nutritionText(product.nutrition))}</strong><small>${esc(product.nutrition.basis || "portion indiquée")} · modifiable après l’ajout</small>`;
    } else preview.hidden = true;
    setTimeout(() => name.focus(), 80);
  }
  async function lookupBarcode(code) {
    code = cleanBarcode(code);
    if (code.length < 6) {
      alert("Entre un numéro de code-barres valide.");
      return;
    }
    barcodeBusy = true;
    setBarcodeStatus("Recherche du produit…");
    const cached = barcodeCache()[code];
    if (cached?.name) {
      showBarcodeProduct(cached, code, true);
      setBarcodeStatus("Produit trouvé dans tes scans récents.");
      barcodeBusy = false;
      stopBarcodeCamera();
      return;
    }
    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,product_name_fr,product_name_en,brands,image_front_small_url,image_front_url,serving_size,nutriments`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json(),
        p = data?.product;
      if (data?.status === 1 && p) {
        const perServing = p.nutriments || {},
          hasServing = [
            perServing["energy-kcal_serving"],
            perServing.proteins_serving,
            perServing.carbohydrates_serving,
            perServing.fat_serving,
            perServing.fiber_serving,
            perServing.sugars_serving,
            perServing.sodium_serving,
          ].some((v) => Number.isFinite(Number(v))),
          suffix = hasServing ? "_serving" : "_100g";
        const per100 = normalNutrition({
            calories: perServing["energy-kcal_100g"],
            protein: perServing.proteins_100g,
            carbs: perServing.carbohydrates_100g,
            fat: perServing.fat_100g,
            fiber: perServing.fiber_100g,
            sugars: perServing.sugars_100g,
            sodium: Number(perServing.sodium_100g) * 1000,
            source: "barcode",
            confidence: "high",
            basis: "pour 100 g",
            estimated: true,
          }),
          servingGrams = parseServingGrams(p.serving_size) || 100;
        const product = {
          name: (
            p.product_name_fr ||
            p.product_name ||
            p.product_name_en ||
            ""
          ).trim(),
          brand: (p.brands || "").split(",")[0].trim(),
          image: p.image_front_small_url || p.image_front_url || "",
          servingGrams,
          nutritionPer100g: per100,
          nutrition: per100
            ? scaleNutritionPer100g(per100, servingGrams)
            : normalNutrition({
                calories: perServing[`energy-kcal${suffix}`],
                protein: perServing[`proteins${suffix}`],
                carbs: perServing[`carbohydrates${suffix}`],
                fat: perServing[`fat${suffix}`],
                fiber: perServing[`fiber${suffix}`],
                sugars: perServing[`sugars${suffix}`],
                sodium: Number(perServing[`sodium${suffix}`]) * 1000,
                source: "barcode",
                confidence: hasServing ? "high" : "medium",
                basis: hasServing
                  ? p.serving_size
                    ? `portion ${p.serving_size}`
                    : "portion indiquée"
                  : "pour 100 g",
                estimated: !hasServing,
              }),
        };
        if (product.name) {
          saveBarcodeCache(code, product);
          showBarcodeProduct(product, code, true);
          setBarcodeStatus("Produit reconnu.");
        } else {
          showBarcodeProduct({}, code, false);
          setBarcodeStatus("Le produit existe, mais son nom est manquant.");
        }
      } else {
        showBarcodeProduct({}, code, false);
        setBarcodeStatus("Produit non trouvé. Tu peux entrer son nom.");
      }
      stopBarcodeCamera();
    } catch (e) {
      console.warn("Open Food Facts", e);
      showBarcodeProduct({}, code, false);
      setBarcodeStatus(
        "Recherche impossible pour le moment. Entre le nom manuellement.",
      );
      stopBarcodeCamera();
    } finally {
      barcodeBusy = false;
    }
  }
  async function startBarcodeCamera() {
    stopBarcodeCamera();
    resetBarcodeResult();
    $("#retryBarcodeCamera").hidden = true;
    setBarcodeStatus("Autorise la caméra, puis vise le code-barres.");
    if (!navigator.mediaDevices?.getUserMedia) {
      setBarcodeStatus(
        "La caméra n’est pas disponible ici. Entre le numéro manuellement.",
      );
      $("#retryBarcodeCamera").hidden = false;
      return;
    }
    try {
      const ZXing = await import(
        "https://cdn.jsdelivr.net/npm/@zxing/browser@0.2.1/+esm"
      );
      barcodeReader = new ZXing.BrowserMultiFormatReader();
      barcodeControls = await barcodeReader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        $("#barcodeVideo"),
        (result, error, controls) => {
          if (result && !barcodeBusy) {
            const code = cleanBarcode(result.getText?.() || result.text);
            if (code) {
              barcodeControls = controls;
              lookupBarcode(code);
            }
          }
        },
      );
      setBarcodeStatus("Place le code-barres au centre du cadre.");
    } catch (e) {
      console.warn("scanner", e);
      setBarcodeStatus(
        "Impossible d’ouvrir le scanner. Entre le numéro sous le code-barres.",
      );
      $("#retryBarcodeCamera").hidden = false;
      stopBarcodeCamera();
    }
  }
  function openBarcodeScanner(targetInputId = "mealDescription") {
    barcodeTargetInputId = targetInputId;
    resetBarcodeResult();
    $("#barcodeManualCode").value = "";
    $("#barcodeDialog").showModal();
    startBarcodeCamera();
  }
  function closeBarcodeScanner() {
    stopBarcodeCamera();
    $("#barcodeDialog")?.close();
  }

  function favoriteMealTypesFor(type) {
    if (type === "Dîner" || type === "Souper")
      return new Set(["Dîner", "Souper"]);
    return new Set([type]);
  }
  function favoriteForMeal(meal) {
    if (!meal) return null;
    const description = normalizedMealDescription(meal.description).toLocaleLowerCase("fr-CA"),
      accepted = favoriteMealTypesFor(meal.type);
    return db.favorites.find(
      (f) =>
        accepted.has(f.type) &&
        normalizedMealDescription(f.description).toLocaleLowerCase("fr-CA") === description,
    ) || null;
  }
  function favoritesForType(type) {
    const accepted = favoriteMealTypesFor(type);
    return [...db.favorites]
      .filter((f) => !type || accepted.has(f.type))
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  }
  function populateFavoriteSelect(type) {
    const s = $("#favoriteMealSelect");
    if (!s) return;
    const favorites = favoritesForType(type);
    s.innerHTML = `<option value="">Choisir un favori…</option>${favorites.map((f) => `<option value="${f.id}">${esc(f.name)}</option>`).join("")}`;
    s.closest("label").hidden = !favorites.length;
  }
  function setMealFavoriteToggle(active, favoriteId = "") {
    const button = $("#mealFavoriteToggle");
    if (!button) return;
    button.setAttribute("aria-pressed", String(!!active));
    button.dataset.favoriteId = favoriteId || "";
    button.querySelector(".meal-favorite-toggle-icon").textContent = active ? "★" : "☆";
    const label = active
      ? "Retirer ce repas des favoris"
      : "Ajouter ce repas aux favoris";
    button.setAttribute("aria-label", label);
    button.title = label;
    const feedback = $("#mealFavoriteFeedback");
    clearTimeout(favoriteFeedbackTimer);
    if (feedback) {
      feedback.classList.remove("is-visible");
      feedback.hidden = true;
    }
  }
  let favoriteFeedbackTimer = null;
  function showMealFavoriteFeedback(active) {
    const feedback = $("#mealFavoriteFeedback");
    if (!feedback) return;
    clearTimeout(favoriteFeedbackTimer);
    feedback.textContent = active
      ? "★ Sera ajouté aux favoris à l’enregistrement"
      : "☆ Sera retiré des favoris à l’enregistrement";
    feedback.hidden = false;
    feedback.classList.add("is-visible");
    favoriteFeedbackTimer = setTimeout(() => {
      feedback.classList.remove("is-visible");
      feedback.hidden = true;
    }, 1800);
  }
  function applyFavoriteToMealForm(favorite) {
    if (!favorite) return;
    $("#mealDescription").value = favorite.description;
    $("#mealDescription").dispatchEvent(new Event("input", { bubbles: true }));
    $("#mealNotes").value = favorite.notes || "";
    $("#favoriteMealSelect").value = favorite.id;
    setMealFavoriteToggle(true, favorite.id);
    favorite.usageCount = (favorite.usageCount || 0) + 1;
    favorite.updatedAt = new Date().toISOString();
    setFavoriteChanged(favorite);
  }
  function populateFavoriteQuickPicks(type) {
    const section = $("#favoriteQuickSection"),
      list = $("#favoriteQuickList"),
      favorites = favoritesForType(type).slice(0, 8);
    if (!section || !list) return;
    section.hidden = !favorites.length;
    list.innerHTML = favorites
      .map((f) => `<button type="button" class="meal-quick-pick" data-quick-favorite="${f.id}" title="${esc(f.description)}"><span>${mealIcon(f.type, f.description)}</span><strong>${esc(f.name)}</strong></button>`)
      .join("");
    $$('[data-quick-favorite]').forEach(
      (button) =>
        (button.onclick = () => {
          const favorite = db.favorites.find((f) => f.id === button.dataset.quickFavorite);
          applyFavoriteToMealForm(favorite);
          $$('[data-quick-favorite]').forEach((x) => x.classList.toggle("active", x === button));
        }),
    );
  }
  function normalizedMealDescription(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\s*([,;])\s*/g, "$1 ")
      .replace(/[.,;]+$/, "")
      .trim();
  }
  function recentMealDescriptions(type, limit = 8) {
    const now = Date.now(),
      groups = new Map();
    allMeals()
      .filter((m) => m.type === type)
      .forEach((m) => {
        const name = normalizedMealDescription(m.description),
          key = name.toLocaleLowerCase("fr-CA");
        if (!name) return;
        const stamp =
            new Date(
              m.updatedAt || m.createdAt || `${m.date}T${m.time || "12:00"}`,
            ).getTime() || 0,
          ageDays = Math.max(0, (now - stamp) / 86400000),
          recency = 1 / (1 + ageDays / 30);
        const item = groups.get(key) || { name, count: 0, last: 0, score: 0 };
        item.count++;
        item.last = Math.max(item.last, stamp);
        item.score += 1 + recency;
        groups.set(key, item);
      });
    return [...groups.values()]
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.last - a.last ||
          a.name.localeCompare(b.name, "fr-CA"),
      )
      .slice(0, limit)
      .map((x) => x.name);
  }
  function recentMealsHeading(type) {
    return (
      {
        Déjeuner: "Derniers déjeuners",
        Dîner: "Derniers dîners",
        Souper: "Derniers soupers",
        Collation: "Dernières collations",
        Boisson: "Dernières boissons",
      }[type] || "Derniers repas"
    );
  }
  function populateRecentFoods(type) {
    const items = recentMealDescriptions(type),
      section = $("#recentFoodsSection"),
      list = $("#recentFoodsList"),
      heading = $("#recentFoodsHeading");
    if (!section || !list) return;
    if (heading) heading.textContent = recentMealsHeading(type);
    section.hidden = !items.length;
    list.innerHTML = items
      .map(
        (name, i) =>
          `<button type="button" class="recent-food-button" data-recent-food="${i}" title="${esc(name)}">${esc(name)}</button>`,
      )
      .join("");
    $$("[data-recent-food]").forEach(
      (button) =>
        (button.onclick = () => {
          const name = items[Number(button.dataset.recentFood)] || "";
          const field = $("#mealDescription");
          field.value = name;
          field.dispatchEvent(new Event("input", { bubbles: true }));
          $("#mealNotes").value = "";
          setMealFavoriteToggle(false);
          $$('[data-quick-favorite]').forEach((x) => x.classList.remove("active"));
          field.focus();
          field.setSelectionRange(field.value.length, field.value.length);
        }),
    );
  }
  function setMealSuggestion(recommendation, type) {
    const wrap = $("#mealSuggestionWrap"),
      toggle = $("#mealSuggestionToggle"),
      body = $("#mealSuggestionBody");
    if (!wrap || !toggle || !body) return;
    const isMain = ["Déjeuner", "Dîner", "Souper"].includes(type);
    const message =
      isMain && recommendation?.message
        ? String(recommendation.message).trim()
        : "";
    wrap.hidden = !message;
    body.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "💡 Voir la suggestion";
    body.textContent = message;
  }
  function toggleMealSuggestion() {
    const toggle = $("#mealSuggestionToggle"),
      body = $("#mealSuggestionBody");
    if (!toggle || !body) return;
    const open = body.hidden;
    body.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open
      ? "💡 Masquer la suggestion"
      : "💡 Voir la suggestion";
  }
  function setDemoDetailReadOnly(formSelector, enabled) {
    const form = $(formSelector);
    if (!form) return;
    form.classList.toggle("demo-detail-readonly", !!enabled);
    form.querySelectorAll("input,select,textarea,button").forEach((control) => {
      if (control.classList.contains("close-dialog")) {
        control.disabled = false;
        return;
      }
      if (enabled) {
        if (!control.dataset.demoPreviousDisabled)
          control.dataset.demoPreviousDisabled = control.disabled ? "1" : "0";
        control.disabled = true;
      } else if (control.dataset.demoPreviousDisabled) {
        control.disabled = control.dataset.demoPreviousDisabled === "1";
        delete control.dataset.demoPreviousDisabled;
      }
    });
  }
  function updateMealDialogType(type) {
    const value = type || "Déjeuner";
    $("#mealType").value = value;
    $("#mealDialogTypeIcon").innerHTML = mealIcon(value);
    $("#mealDialogTypeLabel").textContent = t(value);
    $("#copyYesterdayBreakfast").hidden = value !== "Déjeuner";
    $("#copyYesterdayDinner").hidden = value !== "Dîner";
    populateFavoriteSelect(value);
    $("#favoriteMealSelect").value = "";
    populateFavoriteQuickPicks(value);
    populateRecentFoods(value);
    if (!["Déjeuner", "Dîner", "Souper"].includes(value))
      setMealSuggestion(null, value);
  }
  function updateMealFeelingUi(meal) {
    const button = $("#mealFeelingButton"),
      unavailable = $("#mealFeelingUnavailable");
    if (!button || !unavailable) return;
    const hasMeal = !!meal;
    button.hidden = !hasMeal;
    unavailable.hidden = hasMeal;
    if (hasMeal) {
      button.innerHTML = `<span aria-hidden="true">${meal.feeling ? "✎" : "＋"}</span><strong>${meal.feeling ? "Modifier les ressentis après" : "Ajouter les ressentis après"}</strong><b aria-hidden="true">›</b>`;
      button.classList.toggle("is-set", !!meal.feeling);
      button.classList.toggle("is-empty", !meal.feeling);
      button.onclick = () => openFeeling(meal.id);
    }
    updateMealFeelingsOverview(meal);
  }
  function feelingScorePreviewItems(scores = {}) {
    const normalized = normalizeFeelingScores(scores);
    return FEELING_TAGS.filter((tag) => Object.prototype.hasOwnProperty.call(normalized, tag.id)).map((tag) => ({
      ...tag,
      score: normalized[tag.id],
    }));
  }
  function feelingScorePreviewHtml(scores = {}) {
    const items = feelingScorePreviewItems(scores);
    return items.length
      ? items
          .map(
            (item) =>
              `<span class="meal-feeling-score-chip"><span>${item.emoji}</span>${esc(t(item.label))}${item.score === 0 ? "" : `<b>${item.score}/5</b>`}</span>`,
          )
          .join("")
      : '<span class="meal-feeling-empty">Aucun ressenti</span>';
  }
  function feelingCompactSummaryHtml(label, scores = {}) {
    const items = feelingScorePreviewItems(scores);
    const rows = items.length
      ? items
          .map(
            (item) =>
              `<span class="meal-feelings-mini-item"><i aria-hidden="true">${item.emoji}</i><small>${esc(t(item.label))}</small>${item.score === 0 ? "" : `<b>${item.score}/5</b>`}</span>`,
          )
          .join("")
      : '<span class="meal-feelings-mini-empty">Aucun ressenti</span>';
    return `<span class="meal-feelings-mini-group"><strong>${label}</strong><span class="meal-feelings-mini-list">${rows}</span></span>`;
  }
  function feelingSelectionCountLabel(items = []) {
    if (!items.length) return "Non consigné";
    if (items.length === 1 && items[0].score === 0) return "Rien de particulier";
    return `${items.length} ressenti${items.length > 1 ? "s" : ""}`;
  }
  function compactFeelingLabel(tag) {
    const labels = {
      stomachache: "Douleurs abdominales",
      reflux: "Reflux",
      nausea: "Nausées",
      diarrhea: "Diarrhée",
      heaviness: "Digestion lente",
      fatigue: "Fatigue",
      weakness: "Faiblesse / étourdissements",
      brain_fog: "Concentration difficile",
      headache: "Mal de tête",
      light_sensitivity: "Sensibilité sensorielle",
      itching: "Démangeaisons",
      congestion: "Congestion",
      irritability: "Irritabilité",
      stress: "Stress / anxiété",
      craving: "Fringale",
      hot_flash: "Variation de température",
    };
    return labels[tag.id] || t(tag.label);
  }
  function feelingChangesHtml(beforeScores = {}, afterScores = {}, afterRecorded = false, compact = false) {
    const before = normalizeFeelingScores(beforeScores),
      after = normalizeFeelingScores(afterScores),
      neutralIds = new Set(["feeling_good", "no_tracked_symptoms"]),
      beforeKnown = Object.keys(before).length > 0,
      afterKnown = afterRecorded && Object.keys(after).length > 0;
    if (!beforeKnown || !afterKnown) return "";
    const beforeNone = Object.keys(before).some((id) => neutralIds.has(id) && before[id] === 0),
      afterNone = Object.keys(after).some((id) => neutralIds.has(id) && after[id] === 0),
      ids = new Set([
        ...Object.keys(before).filter((id) => !neutralIds.has(id)),
        ...Object.keys(after).filter((id) => !neutralIds.has(id)),
      ]),
      rows = [];
    ids.forEach((id) => {
      const tag = FEELING_TAGS.find((item) => item.id === id);
      if (!tag) return;
      const hasBefore = Object.prototype.hasOwnProperty.call(before, id),
        hasAfter = Object.prototype.hasOwnProperty.call(after, id),
        start = hasBefore ? before[id] : beforeNone ? 0 : null,
        end = hasAfter ? after[id] : afterNone ? 0 : null;
      if (start == null || end == null) return;
      const delta = end - start;
      let tone = "stable", arrow = "→", label = "Stable";
      if (start === 0 && end > 0) {
        tone = "appeared"; arrow = "●"; label = "Apparu après";
      } else if (start > 0 && end === 0) {
        tone = "improved"; arrow = "✓"; label = "Disparu après";
      } else if (delta > 0) {
        tone = delta === 1 ? "slightly-worse" : "worse";
        arrow = "↗";
        label = delta === 1 ? "Légère aggravation" : delta >= 3 ? "Aggravation marquée" : "Aggravation";
      } else if (delta < 0) {
        tone = "improved"; arrow = "↘";
        label = delta === -1 ? "Légère amélioration" : delta <= -3 ? "Amélioration marquée" : "Amélioration";
      }
      rows.push(compact
        ? `<span class="feeling-change-pill ${tone}" title="${esc(label)}"><i aria-hidden="true">${arrow}</i><span>${tag.emoji} ${esc(compactFeelingLabel(tag))}</span><b>${start}→${end}</b></span>`
        : `<span class="feeling-change ${tone}"><i aria-hidden="true">${arrow}</i><span><strong>${tag.emoji} ${esc(t(tag.label))}</strong><small>${label}</small></span><b>${start} → ${end}</b></span>`);
    });
    if (!rows.length) return "";
    return compact
      ? `<span class="feeling-change-pills"><strong>Évolution</strong><span>${rows.join("")}</span></span>`
      : `<span class="feeling-changes"><strong>Évolution après le repas</strong>${rows.join("")}<small class="feeling-change-caution">Ces changements décrivent une évolution autour du repas, sans établir qu’il en est la cause.</small></span>`;
  }
  function updateMealFeelingsOverview(meal = null) {
    const collapsed = $("#mealFeelingsCollapsedPreview"),
      beforePreview = $("#beforeFeelingSelectedPreview"),
      afterPreview = $("#afterFeelingSelectedPreview"),
      beforeCount = $("#beforeFeelingCount"),
      afterCount = $("#afterFeelingCount"),
      changesPreview = $("#mealFeelingChanges"),
      beforeActionLabel = $("#beforeFeelingActionLabel"),
      beforeActionIcon = $("#beforeFeelingEditor > summary > span");
    if (!collapsed || !beforePreview || !afterPreview) return;
    const mealId = $("#mealId")?.value,
      savedMeal =
        meal ||
        (mealId
          ? ensureDay(db, selectedDate).meals.find((item) => item.id === mealId)
          : null),
      picker = $("#beforeFeelingTags"),
      beforeScores = picker?.children.length
        ? collectScoredFeelingScores(picker, "before")
        : feelingScoresFor(savedMeal, "before"),
      afterScores = feelingScoresFor(savedMeal, "after"),
      beforeItems = feelingScorePreviewItems(beforeScores),
      afterItems = feelingScorePreviewItems(afterScores);
    beforePreview.innerHTML = feelingScorePreviewHtml(beforeScores);
    afterPreview.innerHTML = feelingScorePreviewHtml(afterScores);
    if (beforeCount)
      beforeCount.textContent = feelingSelectionCountLabel(beforeItems);
    if (beforeActionLabel)
      beforeActionLabel.textContent = beforeItems.length
        ? "Modifier les ressentis avant"
        : "Ajouter les ressentis avant";
    if (beforeActionIcon)
      beforeActionIcon.textContent = beforeItems.length ? "✎" : "＋";
    if (afterCount)
      afterCount.textContent = feelingSelectionCountLabel(afterItems);
    const changes = feelingChangesHtml(beforeScores, afterScores, !!savedMeal?.feeling);
    if (changesPreview) {
      changesPreview.innerHTML = changes;
      changesPreview.hidden = !changes;
    }
    collapsed.innerHTML = beforeItems.length || afterItems.length
      ? `${feelingCompactSummaryHtml("Avant", beforeScores)}${feelingCompactSummaryHtml("Après", afterScores)}`
      : "<small>Aucun ressenti</small>";
  }
  function collectEatingReasons() {
    return normalizeEatingReasons(
      $$('#mealForm input[name="eatingReason"]:checked').map((input) => input.value),
    );
  }
  function updateEatingReasonUi() {
    const selected = collectEatingReasons(),
      otherSelected = selected.includes("other"),
      otherWrap = $("#eatingReasonOtherWrap"),
      summary = $("#eatingReasonSummary");
    if (otherWrap) otherWrap.hidden = !otherSelected;
    if (!otherSelected && $("#eatingReasonOther")) $("#eatingReasonOther").value = "";
    if (summary)
      summary.textContent = selected.length
        ? `${selected.length} raison${selected.length > 1 ? "s" : ""} sélectionnée${selected.length > 1 ? "s" : ""}`
        : "Facultatif · plusieurs réponses possibles";
  }
  function openMeal(id = null, presetType = null) {
    applyMealCompositionLocale();
    const d = ensureDay(db, selectedDate),
      m = id ? d.meals.find((x) => x.id === id) : null,
      type = m?.type || presetType || "Déjeuner",
      readOnly = !!(db.settings?.demoMode && db.settings?.demoReadOnly && m);
    setDemoDetailReadOnly("#mealForm", false);
    $("#mealDialogTitle").textContent = readOnly
      ? "Détails du repas"
      : m
        ? "Modifier le repas"
        : "Ajouter un repas";
    $("#mealId").value = m?.id || "";
    const deleteButton = $("#deleteCurrentMeal");
    deleteButton.hidden = !m;
    deleteButton.onclick = m
      ? () => {
          if (confirm(`Supprimer « ${m.description} »?`)) {
            deleteMealLocal(m);
            $("#mealDialog").close();
            render();
          }
        }
      : null;
    updateMealDialogType(type);
    $("#mealTime").value = m?.time || new Date().toTimeString().slice(0, 5);
    $("#mealDescription").value = m?.description || "";
    const selectedReasons = new Set(normalizeEatingReasons(m?.eatingReasons));
    $$('#mealForm input[name="eatingReason"]').forEach((input) => {
      input.checked = selectedReasons.has(input.value);
    });
    $("#eatingReasonOther").value = m?.eatingReasonOther || "";
    updateEatingReasonUi();
    $("#eatingReasonDetails").open = !m || selectedReasons.size > 0 || !!m?.eatingReasonOther;
    mealFoodReview = m?.foodReview
      ? { ...m.foodReview }
      : { description: m?.description || "", acknowledgedGaps: false };
    const editRecommendation =
      m && ["Déjeuner", "Dîner", "Souper"].includes(type)
        ? recommendationIsStillRelevant(m.recommendation, m)
          ? m.recommendation
          : chooseMealRecommendation(selectedDate, m)
        : null;
    setMealSuggestion(editRecommendation, type);
    $("#mealNotes").value = m?.notes || "";
    const favorite = favoriteForMeal(m);
    setMealFavoriteToggle(!!favorite, favorite?.id || "");
    $("#mealOptionalDetails").open = !!(m?.notes || (nutritionVisibleToViewer() && m?.nutrition));
    $("#mealOptionalTitle").textContent = nutritionVisibleToViewer() ? "Notes et nutrition" : "Notes";
    $("#mealNutritionSection").hidden = !nutritionVisibleToViewer();
    const automaticNutrition = db.settings.autoNutritionEstimates !== false;
    fillNutritionInputs(
      m?.nutrition
        ? normalNutrition({
            ...(automaticNutrition
              ? estimateNutritionFromText(m.description || "")
              : {}),
            ...m.nutrition,
            fiber:
              m.nutrition.fiber ??
              (automaticNutrition
                ? estimateNutritionFromText(m.description || "")?.fiber
                : null),
            sugars:
              m.nutrition.sugars ??
              (automaticNutrition
                ? estimateNutritionFromText(m.description || "")?.sugars
                : null),
            sodium:
              m.nutrition.sodium ??
              (automaticNutrition
                ? estimateNutritionFromText(m.description || "")?.sodium
                : null),
          })
        : null,
    );
    mealNutritionManuallyEdited = m?.nutrition?.estimated === false;
    renderBeforeFeelingPicker(m);
    $("#mealFeelingsDetails").open = false;
    $("#beforeFeelingEditor").open = false;
    updateMealFeelingUi(m);
    updateMealCompositionReview();
    photoData = m?.photoLocal || m?.photoUrl || null;
    photoRemoved = false;
    hideMealAiSuggestion();
    setMealAiPhotoStatus("La description IA doit être vérifiée et corrigée au besoin.");
    $("#mealPhoto").value = "";
    showPhotoPreview();
    setDemoDetailReadOnly("#mealForm", readOnly);
    $("#mealDialog").showModal();
  }
  function showPhotoPreview() {
    const wrap = $("#photoPreviewWrap");
    wrap.hidden = !photoData;
    if (photoData) $("#photoPreview").src = photoData;
  }
  function renderDayActivities() {
    const d = ensureDay(db, selectedDate),
      list = $("#dayActivitiesList");
    if (!list) return;
    list.innerHTML = (d.activities || []).length
      ? (d.activities || [])
          .map((raw) => {
            const a = normalizeActivity(raw),
              kcal = activityCalories(a),
              source = a.actualCalories != null ? "mesurées" : "estimées";
            return `<div class="saved-activity"><span>${activityIcon(a.type)}</span><div><strong>${esc(a.type)}</strong><small>${Number(a.minutes) || 0} min · ${esc(ACTIVITY_INTENSITY_LABELS[a.intensity] || "Modérée")} · ${Math.round(kcal)} kcal ${source}</small></div><button type="button" data-delete-activity="${esc(a.id)}" aria-label="Supprimer ${esc(a.type)}">×</button></div>`;
          })
          .join("")
      : '<p class="muted small">Aucune activité enregistrée pour cette journée.</p>';
    $$("[data-delete-activity]").forEach(
      (b) =>
        (b.onclick = () => {
          d.activities = d.activities.filter(
            (a) => a.id !== b.dataset.deleteActivity,
          );
          setDayChanged(selectedDate);
          renderDayActivities();
        }),
    );
  }
  function updateActivityEstimate() {
    const type = $("#activityType")?.value || "Autre",
      minutes = parseAppNumber($("#activityMinutes")?.value) || 0,
      intensity = $("#activityIntensity")?.value || "moderate",
      estimate = estimateActivityCalories(type, minutes, intensity),
      value = $("#activityEstimateValue");
    if (value) value.textContent = minutes > 0 ? `${estimate} kcal` : "— kcal";
  }
  function setActivityIntensity(value = "moderate") {
    $("#activityIntensity").value = value;
    $$("[data-intensity]").forEach((b) =>
      b.classList.toggle("active", b.dataset.intensity === value),
    );
    updateActivityEstimate();
  }
  function openSleep() {
    const d = ensureDay(db, selectedDate);
    $("#sleepHours").value = d.sleepHours ?? "";
    $("#sleepComment").value = d.sleepComment || "";
    $$("[data-sleep-tag]").forEach((input) => {
      input.checked = (d.sleepTags || []).includes(input.value);
    });
    $("#sleepDialog").showModal();
  }
  function openActivity() {
    ensureDay(db, selectedDate);
    $("#activityType").value = "";
    $("#activityMinutes").value = "";
    $("#activityActualCalories").value = "";
    $$("[data-activity]").forEach((b) => b.classList.remove("active"));
    setActivityIntensity("moderate");
    renderDayActivities();
    updateActivityEstimate();
    $("#activityDialog").showModal();
  }
  async function fileToDataUrl(file) {
    if (!file) return null;
    const img = await createImageBitmap(file),
      max = 1280,
      scale = Math.min(1, max / Math.max(img.width, img.height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  }
  function setMealAiPhotoStatus(message, state = "") {
    const el = $("#mealAiPhotoStatus");
    el.textContent = message;
    el.className = `meal-ai-photo-status${state ? ` is-${state}` : ""}`;
  }
  function hideMealAiSuggestion() {
    mealAiSuggestionText = "";
    $("#mealAiSuggestion").hidden = true;
  }
  function useMealAiSuggestion() {
    if (!mealAiSuggestionText) return;
    $("#mealDescription").value = mealAiSuggestionText;
    $("#mealDescription").dispatchEvent(new Event("input", { bubbles: true }));
    hideMealAiSuggestion();
    setMealAiPhotoStatus("Description ajoutée — vérifie-la et corrige-la au besoin.", "success");
    $("#mealDescription").focus();
  }
  async function analyzeMealPhotoWithAI(imageData) {
    if (!client || !session) {
      setMealAiPhotoStatus("Connecte-toi pour utiliser l’analyse de photo par IA.", "error");
      return;
    }
    setMealAiPhotoStatus("Analyse de la photo en cours…", "loading");
    hideMealAiSuggestion();
    try {
      const comma = imageData.indexOf(",");
      const { data, error } = await client.functions.invoke("analyze-meal-photo", {
        body: {
          imageBase64: comma >= 0 ? imageData.slice(comma + 1) : imageData,
          mimeType: "image/jpeg",
          locale: "fr-CA",
        },
      });
      if (error) throw error;
      const description = String(data?.description || "").trim();
      if (!description) throw new Error("Réponse vide");
      mealAiSuggestionText = description;
      if (!$("#mealDescription").value.trim()) {
        useMealAiSuggestion();
      } else {
        $("#mealAiSuggestionText").textContent = description;
        $("#mealAiSuggestion").hidden = false;
        setMealAiPhotoStatus("Une suggestion est prête sans remplacer ton texte.", "success");
      }
    } catch (error) {
      console.warn("Analyse IA de la photo impossible", error);
      setMealAiPhotoStatus("Analyse IA indisponible. Ta photo est quand même conservée.", "error");
    }
  }
  function createFavoriteFromMeal(m) {
    const existing = favoriteForMeal(m);
    if (existing) {
      alert("Ce repas est déjà dans tes favoris.");
      return;
    }
    const name = prompt("Nom du repas favori :", m.description.slice(0, 45));
    if (!name) return;
    const f = normalFavorite({
      name: name.trim(),
      type: m.type,
      description: m.description,
      notes: m.notes,
    });
    db.favorites.push(f);
    setFavoriteChanged(f);
    alert("Repas ajouté aux favoris ⭐");
    render();
  }
  function useFavorite(id) {
    const f = db.favorites.find((x) => x.id === id);
    if (!f) return;
    openMeal(null, f.type);
    $("#mealType").value = f.type;
    applyFavoriteToMealForm(f);
  }

  let globalObservationPhotoData = null;
  function findGlobalObservation(id) {
    for (const [date, day] of Object.entries(db.days || {})) {
      const observation = (day.observations || []).find((o) => o.id === id);
      if (observation) return { date, day, observation };
    }
    return null;
  }
  function observationTagPickerHtml(selected) {
    const chosen = new Set(selected || []),
      availableTags = feelingTagsForMode("global", [...chosen]);
    const standaloneTags = availableTags.filter((tag) => tag.category === "positive"),
      standalone = standaloneTags.length
        ? `<div class="standalone-feeling-choice">${standaloneTags.map((tag) => `<button type="button" class="feeling-tag ${chosen.has(tag.id) ? "active" : ""}" data-observation-tag="${tag.id}"><span class="feeling-tag-icon">${tag.emoji}</span><span class="feeling-tag-label">${esc(t(tag.label))}</span></button>`).join("")}</div>`
        : "";
    const categories = FEELING_CATEGORIES.filter((category) => category.id !== "positive").map((category) => {
      const tags = availableTags.filter((tag) => tag.category === category.id),
        alwaysClosed = category.id === "digestion";
      if (!tags.length) return "";
      const open =
        !alwaysClosed &&
        (category.open || tags.some((tag) => chosen.has(tag.id)));
      return `<details class="feeling-tag-group feeling-tag-group-${category.id}" ${open ? "open" : ""}><summary><span><b>${category.emoji}</b><strong>${esc(t(category.label))}</strong></span><small>${tags.length}</small><i aria-hidden="true">›</i></summary><div class="feeling-tag-group-body">${tags.map((tag) => `<button type="button" class="feeling-tag ${chosen.has(tag.id) ? "active" : ""}" data-observation-tag="${tag.id}"><span class="feeling-tag-icon">${tag.emoji}</span><span class="feeling-tag-label">${esc(t(tag.label))}</span></button>`).join("")}</div></details>`;
    }).join("");
    return `${standalone}${categories}`;
  }
  function recentObservationMeals(date, time, selected = []) {
    const end = new Date(`${date}T${time || "23:59"}:00`).getTime(),
      start = end - 72 * 3600000,
      chosen = new Set(selected);
    return (
      allMeals()
        .filter((m) => {
          const at = mealDateTime(m).getTime();
          return at >= start && at <= end;
        })
        .sort((a, b) => mealDateTime(b) - mealDateTime(a))
        .slice(0, 12)
        .map(
          (m) =>
            `<label class="observation-meal-option"><input type="checkbox" value="${m.id}" ${chosen.has(m.id) ? "checked" : ""}><span><strong>${mealIcon(m.type, m.description)} ${esc(m.type)} · ${esc(m.time)}</strong><small>${esc(formatDate(m.date))} — ${esc(m.description)}</small></span></label>`,
        )
        .join("") ||
      '<p class="muted small">Aucun repas enregistré dans les 72 heures précédentes.</p>'
    );
  }
  function makeObservationIntensity(value = 3) {
    const wrap = $("#globalObservationIntensity");
    wrap.dataset.value = String(value);
    wrap.innerHTML = [1, 2, 3, 4, 5]
      .map(
        (n) =>
          `<button type="button" class="${n === Number(value) ? "active" : ""}" data-observation-intensity="${n}"><span>${["", "Très légère", "Légère", "Modérée", "Forte", "Très forte"][n]}</span><small>${n}</small></button>`,
      )
      .join("");
    $$("[data-observation-intensity]").forEach(
      (b) =>
        (b.onclick = () => {
          wrap.dataset.value = b.dataset.observationIntensity;
          $$("[data-observation-intensity]").forEach((x) =>
            x.classList.toggle("active", x === b),
          );
        }),
    );
  }
  function showGlobalObservationPhoto() {
    const wrap = $("#globalObservationPhotoPreviewWrap");
    wrap.hidden = !globalObservationPhotoData;
    if (globalObservationPhotoData)
      $("#globalObservationPhotoPreview").src = globalObservationPhotoData;
  }
  function refreshObservationMeals(selected = []) {
    $("#globalObservationMeals").innerHTML = recentObservationMeals(
      $("#globalObservationDate").value || selectedDate,
      $("#globalObservationTime").value || "23:59",
      selected,
    );
  }
  function openGlobalObservation(id = null) {
    const found = id ? findGlobalObservation(id) : null,
      o =
        found?.observation ||
        normalObservation(
          {
            date: selectedDate,
            time:
              selectedDate === todayKey()
                ? new Date().toTimeString().slice(0, 5)
                : "12:00",
          },
          selectedDate,
        ),
      readOnly = !!(
        db.settings?.demoMode &&
        db.settings?.demoReadOnly &&
        found
      );
    setDemoDetailReadOnly("#globalObservationForm", false);
    $("#globalObservationId").value = o.id;
    $("#globalObservationDate").value = o.date;
    $("#globalObservationDate").max = todayKey();
    $("#globalObservationTime").value = o.time;
    $("#globalObservationDuration").value = o.duration;
    $("#globalObservationNotes").value = o.notes || "";
    $("#globalObservationTags").innerHTML = observationTagPickerHtml(o.tags);
    bindCompactFeelingGroups($("#globalObservationTags"));
    $$("[data-observation-tag]").forEach(
      (b) => (b.onclick = () => b.classList.toggle("active")),
    );
    $$("#globalObservationForm .observation-contexts input").forEach(
      (input) => (input.checked = (o.contexts || []).includes(input.value)),
    );
    makeObservationIntensity(o.intensity);
    refreshObservationMeals(o.mealIds);
    globalObservationPhotoData = o.photoLocal || null;
    $("#globalObservationPhoto").value = "";
    showGlobalObservationPhoto();
    const remove = $("#deleteGlobalObservation");
    remove.hidden = !found;
    remove.onclick = found
      ? () => {
          if (confirm("Supprimer cette observation globale?")) {
            found.day.observations = found.day.observations.filter(
              (x) => x.id !== o.id,
            );
            setDayChanged(found.date);
            $("#globalObservationDialog").close();
            render();
          }
        }
      : null;
    setDemoDetailReadOnly("#globalObservationForm", readOnly);
    $("#globalObservationDialog").showModal();
  }

  $("#openBarcodeScanner").onclick = () => openBarcodeScanner("mealDescription");
  $("#closeBarcodeScanner").onclick = closeBarcodeScanner;
  $("#retryBarcodeCamera").onclick = startBarcodeCamera;
  $("#lookupBarcodeManual").onclick = () =>
    lookupBarcode($("#barcodeManualCode").value);
  $("#barcodePortionGrams").addEventListener("input", updateBarcodePortion);
  $("#barcodeManualCode").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      lookupBarcode(e.currentTarget.value);
    }
  });
  $("#addBarcodeProduct").onclick = () => {
    const name = $("#barcodeProductName").value.trim();
    if (!name) {
      $("#barcodeProductName").focus();
      return;
    }
    appendScannedFood(name);
    if (barcodeTargetInputId === "mealDescription" && barcodeLastProduct?.nutrition)
      fillNutritionInputs(
        mergeNutrition(nutritionFromInputs(), barcodeLastProduct.nutrition),
      );
    if (barcodeLastCode)
      saveBarcodeCache(barcodeLastCode, {
        name,
        brand: $("#barcodeBrand").textContent.trim(),
        image: $("#barcodeProductImage").hidden
          ? ""
          : $("#barcodeProductImage").src,
        nutrition: barcodeLastProduct?.nutrition || null,
        nutritionPer100g: barcodeLastProduct?.nutritionPer100g || null,
        servingGrams:
          Number($("#barcodePortionGrams")?.value) ||
          barcodeLastProduct?.servingGrams ||
          null,
      });
    closeBarcodeScanner();
    $(`#${barcodeTargetInputId}`)?.focus();
    if (barcodeTargetInputId === "quickSnackDescription") updateQuickSnackUi();
  };
  $("#barcodeDialog").addEventListener("close", stopBarcodeCamera);

  $("#mealSuggestionToggle").onclick = toggleMealSuggestion;
  $("#mealPhoto").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      photoData = await fileToDataUrl(file);
      photoRemoved = false;
      showPhotoPreview();
      await analyzeMealPhotoWithAI(photoData);
    } catch (error) {
      console.warn("Photo illisible", error);
      setMealAiPhotoStatus("Cette photo n’a pas pu être lue. Essaie-en une autre.", "error");
    }
  };
  $("#removePhoto").onclick = () => {
    photoData = null;
    photoRemoved = true;
    hideMealAiSuggestion();
    setMealAiPhotoStatus("La description IA doit être vérifiée et corrigée au besoin.");
    showPhotoPreview();
  };
  $("#useMealAiSuggestion").onclick = useMealAiSuggestion;
  $("#dismissMealAiSuggestion").onclick = () => {
    hideMealAiSuggestion();
    setMealAiPhotoStatus("Suggestion ignorée. Ton texte est conservé.");
  };
  $("#favoriteMealSelect").onchange = (e) => {
    const f = db.favorites.find((x) => x.id === e.target.value);
    applyFavoriteToMealForm(f);
  };
  $("#mealFavoriteToggle").onclick = () => {
    const button = $("#mealFavoriteToggle"),
      active = button.getAttribute("aria-pressed") === "true",
      next = !active;
    setMealFavoriteToggle(next, button.dataset.favoriteId);
    showMealFavoriteFeedback(next);
  };
  $$('#mealForm input[name="eatingReason"]').forEach((input) =>
    input.addEventListener("change", updateEatingReasonUi),
  );
  $("#estimateMealNutrition").onclick = estimateCurrentMealNutrition;
  $("#mealDescription").addEventListener(
    "input",
    scheduleAutomaticNutritionPreview,
  );
  $("#completeMealDescription").onclick = () => {
    $("#mealDescription")?.focus();
    const field = $("#mealDescription");
    if (field) field.setSelectionRange(field.value.length, field.value.length);
  };
  $("#keepMealDescription").onclick = () => {
    const description = $("#mealDescription")?.value.trim() || "";
    mealFoodReview = { description, acknowledgedGaps: true };
    updateMealCompositionReview();
  };
  $$("#mealNutritionSection input").forEach((input) =>
    input.addEventListener("input", () => {
      mealNutritionManuallyEdited = true;
      const section = $("#mealNutritionSection");
      if (section) {
        section.dataset.source = "manual";
        section.dataset.estimated = "false";
      }
    }),
  );
  $("#clearMealNutrition").onclick = () => {
    mealNutritionManuallyEdited = true;
    fillNutritionInputs(
      null,
      "Valeurs effacées. Tu peux les entrer manuellement ou relancer l’estimation.",
    );
    const section = $("#mealNutritionSection");
    if (section) {
      section.dataset.source = "manual";
      section.dataset.estimated = "false";
    }
  };
  $("#mealForm").onsubmit = (e) => {
    e.preventDefault();
    if (hasUnscoredFeelings($("#beforeFeelingTags"), "before"))
      return alert("Choisis une intensité de 1 à 5 pour chaque ressenti sélectionné.");
    const beforeQuality = reviewFeelingQuality(
      feelingQualityAssessment($("#beforeFeelingTags"), "before"),
    );
    if (!beforeQuality) return;
    const d = ensureDay(db, selectedDate),
      id = $("#mealId").value,
      old = d.meals.find((x) => x.id === id),
      feelingsBefore = collectScoredFeelingScores(
        $("#beforeFeelingTags"),
        "before",
      );
    const meal = normalMeal(
      {
        ...old,
        id: id || uid(),
        date: selectedDate,
        type: $("#mealType").value,
        time: $("#mealTime").value,
        description: $("#mealDescription").value.trim(),
        nutrition: nutritionFromInputs() ||
          (db.settings.autoNutritionEstimates !== false && !mealNutritionManuallyEdited
            ? estimateNutritionFromText($("#mealDescription").value.trim())
            : old?.nutrition || null),
        foodReview:
          mealFoodReview?.description === $("#mealDescription").value.trim()
            ? { ...mealFoodReview }
            : null,
        fatigueBefore: old?.fatigueBefore || 0,
        fatigueAfter: old?.fatigueAfter || 0,
        feelingsBefore,
        feelingsBeforeQuality: beforeQuality,
        eatingReasons: collectEatingReasons(),
        eatingReasonOther: collectEatingReasons().includes("other")
          ? $("#eatingReasonOther").value.trim().slice(0, 160)
          : "",
        notes: $("#mealNotes").value.trim(),
        photoLocal:
          photoData && photoData.startsWith("data:")
            ? photoData
            : old?.photoLocal || null,
        photoUrl: photoRemoved ? null : old?.photoUrl || null,
        photoPath: photoRemoved ? null : old?.photoPath || null,
        updatedAt: new Date().toISOString(),
      },
      selectedDate,
    );
    if (old) Object.assign(old, meal);
    else d.meals.push(meal);
    const savedMeal = old || meal;
    const recommendation = ["Déjeuner", "Dîner", "Souper"].includes(savedMeal.type)
      ? chooseMealRecommendation(selectedDate, savedMeal)
      : null;
    savedMeal.recommendation = recommendation || null;
    setMealChanged(savedMeal);
    const favoriteButton = $("#mealFavoriteToggle"),
      wantsFavorite = favoriteButton.getAttribute("aria-pressed") === "true",
      favoriteId = favoriteButton.dataset.favoriteId,
      savedFavorite =
        db.favorites.find((f) => f.id === favoriteId) ||
        (wantsFavorite ? favoriteForMeal(savedMeal) : null);
    if (wantsFavorite) {
      if (savedFavorite) {
        savedFavorite.description = savedMeal.description;
        savedFavorite.notes = savedMeal.notes || "";
        savedFavorite.type = savedMeal.type;
        savedFavorite.updatedAt = new Date().toISOString();
        setFavoriteChanged(savedFavorite);
      } else {
        const favorite = normalFavorite({
          name: savedMeal.description.slice(0, 45),
          type: savedMeal.type,
          description: savedMeal.description,
          notes: savedMeal.notes,
        });
        db.favorites.push(favorite);
        setFavoriteChanged(favorite);
      }
    } else if (savedFavorite) deleteFavoriteLocal(savedFavorite);
    try {
      window.Brain?.learnMeal?.(savedMeal);
    } catch (memoryError) {
      console.warn("Mémoire alimentaire", memoryError);
    }
    $("#mealDialog").close();
    render();
    if (recommendation)
      setTimeout(
        () => showMealRecommendation(recommendation, selectedDate),
        280,
      );
  };
  $("#feelingForm").onsubmit = (e) => {
    e.preventDefault();
    const m = allMeals().find((x) => x.id === feelingMealId);
    if (!m) return;
    if (hasUnscoredFeelings($("#feelingTags"), "after"))
      return alert("Choisis une intensité de 1 à 5 pour chaque ressenti sélectionné.");
    const qualityReview = reviewFeelingQuality(
      feelingQualityAssessment($("#feelingTags"), "after"),
    );
    if (!qualityReview) return;
    const scores = collectScoredFeelingScores($("#feelingTags"), "after"),
      tags = Object.keys(scores),
      notes = $("#feelingNotes").value.trim();
    if (!tags.length && !notes && !Object.keys(normalizeFeelingScores(m.feelingsBefore)).length)
      return alert("Sélectionne au moins un ressenti ou ajoute une note.");
    m.feeling = {
      rating: averageFeelingScore(scores) ?? 0,
      tags,
      scores,
      beforeScores: normalizeFeelingScores(m.feelingsBefore),
      qualityReview,
      notes,
      recordedAt: new Date().toISOString(),
    };
    m.updatedAt = new Date().toISOString();
    m.feelingNotifiedAt = m.feelingNotifiedAt || new Date().toISOString();
    setMealChanged(m);
    $("#feelingDialog").close();
    render();
    if ($("#mealDialog").open && $("#mealId").value === m.id)
      updateMealFeelingUi(m);
  };
  $("#globalObservationDate").onchange = () => refreshObservationMeals();
  $("#globalObservationTime").onchange = () => refreshObservationMeals();
  $("#globalObservationPhoto").onchange = async (e) => {
    globalObservationPhotoData = await fileToDataUrl(e.target.files[0]);
    showGlobalObservationPhoto();
  };
  $("#removeGlobalObservationPhoto").onclick = () => {
    globalObservationPhotoData = null;
    $("#globalObservationPhoto").value = "";
    showGlobalObservationPhoto();
  };
  $("#globalObservationForm").onsubmit = (e) => {
    e.preventDefault();
    const id = $("#globalObservationId").value || uid(),
      date = $("#globalObservationDate").value,
      time = $("#globalObservationTime").value;
    if (!date || !time)
      return alert(
        "Indique la date et le moment où tu as remarqué l’observation.",
      );
    if (date > todayKey())
      return alert("La date de l’observation ne peut pas être dans le futur.");
    const tags = $$("[data-observation-tag].active").map(
      (x) => x.dataset.observationTag,
    );
    if (!tags.length && !$("#globalObservationNotes").value.trim())
      return alert(
        "Sélectionne au moins un élément observé ou ajoute une note.",
      );
    const previous = findGlobalObservation(id),
      target = ensureDay(db, date),
      observation = normalObservation(
        {
          ...previous?.observation,
          id,
          date,
          time,
          intensity:
            Number($("#globalObservationIntensity").dataset.value) || 3,
          duration: $("#globalObservationDuration").value,
          tags,
          contexts: $$(
            "#globalObservationForm .observation-contexts input:checked",
          ).map((x) => x.value),
          mealIds: $$("#globalObservationMeals input:checked").map(
            (x) => x.value,
          ),
          notes: $("#globalObservationNotes").value.trim(),
          photoLocal: globalObservationPhotoData,
          updatedAt: new Date().toISOString(),
        },
        date,
      );
    if (previous && previous.date !== date) {
      previous.day.observations = previous.day.observations.filter(
        (x) => x.id !== id,
      );
      setDayChanged(previous.date);
    }
    const index = target.observations.findIndex((x) => x.id === id);
    if (index >= 0) target.observations[index] = observation;
    else target.observations.push(observation);
    setDayChanged(date);
    selectedDate = date;
    $("#globalObservationDialog").close();
    render();
  };
  $("#sleepForm").onsubmit = (e) => {
    e.preventDefault();
    const d = ensureDay(db, selectedDate),
      hours = parseAppNumber($("#sleepHours").value);
    if (hours !== null && (hours < 0 || hours > 24))
      return alert("Entre une durée de sommeil entre 0 et 24 heures.");
    d.sleepHours = hours;
    d.sleepTags = $$("[data-sleep-tag]:checked").map((input) => input.value);
    d.sleepComment = $("#sleepComment").value.trim();
    setDayChanged(selectedDate);
    $("#sleepDialog").close();
    render();
  };
  $$("[data-sleep-tag]").forEach(
    (input) =>
      (input.onchange = () => {
        if (input.value === "none" && input.checked)
          $$("[data-sleep-tag]").forEach((other) => {
            if (other !== input) other.checked = false;
          });
        else if (input.checked) {
          const none = $('[data-sleep-tag="none"]');
          if (none) none.checked = false;
        }
      }),
  );
  $("#activityForm").onsubmit = (e) => {
    e.preventDefault();
    const d = ensureDay(db, selectedDate),
      type = $("#activityType").value,
      min = parseAppNumber($("#activityMinutes").value) || 0,
      intensity = $("#activityIntensity").value || "moderate",
      actualRaw = $("#activityActualCalories").value.trim(),
      actualCalories = actualRaw === "" ? null : parseAppNumber(actualRaw);
    if (!type) return alert("Choisis un type d’activité.");
    if (min < 1 || min > 1440)
      return alert("Indique une durée valide en minutes.");
    if (
      actualCalories != null &&
      (actualCalories < 0 || actualCalories > 10000)
    )
      return alert("Indique une valeur de calories valide.");
    d.activities.push(
      normalizeActivity({
        id: uid(),
        type,
        minutes: min,
        intensity,
        estimatedCalories: estimateActivityCalories(type, min, intensity),
        actualCalories,
        at: new Date().toISOString(),
      }),
    );
    setDayChanged(selectedDate);
    $("#activityDialog").close();
    render();
  };
  $$("[data-activity]").forEach(
    (b) =>
      (b.onclick = () => {
        $("#activityType").value = b.dataset.activity;
        $$("[data-activity]").forEach((x) =>
          x.classList.toggle("active", x === b),
        );
        updateActivityEstimate();
      }),
  );
  $$("[data-intensity]").forEach(
    (b) => (b.onclick = () => setActivityIntensity(b.dataset.intensity)),
  );
  $("#activityMinutes").addEventListener("input", updateActivityEstimate);
  function previousDayMeal(type) {
    const dt = new Date(`${selectedDate}T12:00:00`);
    dt.setDate(dt.getDate() - 1);
    const key = dt.toLocaleDateString("en-CA");
    return (
      ensureDay(db, key)
        .meals.filter((x) => x.type === type)
        .sort((a, b) => a.time.localeCompare(b.time))[0] || null
    );
  }
  $("#copyYesterdayBreakfast").onclick = () => {
    const m = previousDayMeal("Déjeuner");
    if (!m) return alert("Aucun déjeuner trouvé hier.");
    $("#mealDescription").value = m.description;
    $("#mealDescription").dispatchEvent(new Event("input", { bubbles: true }));
    $("#mealNotes").value = m.notes || "";
    $("#mealDescription").focus();
  };
  $("#copyYesterdayDinner").onclick = () => {
    const m = previousDayMeal("Souper");
    if (!m) return alert("Aucun souper trouvé hier.");
    $("#mealDescription").value = m.description;
    $("#mealDescription").dispatchEvent(new Event("input", { bubbles: true }));
    $("#mealNotes").value = m.notes || "";
    $("#mealDescription").focus();
  };
  $("#welcomeForm").onsubmit = (e) => {
    e.preventDefault();
    $("#welcomeDialog").close();
  };
  $("#experienceStartDemo").onclick = () =>
    hasDemoAccess
      ? startDemoMode("marie")
      : alert(
          "Connecte-toi avec un compte autorisé pour ouvrir les profils de démonstration.",
        );
  $("#experienceStartEmpty").onclick = startEmptyExperience;
  $("#nextDemoTour").onclick = () => {
    demoTourIndex++;
    showDemoTourStep();
  };
  $("#previousDemoTour").onclick = () => {
    if (demoTourIndex > 0) {
      demoTourIndex--;
      showDemoTourStep();
    }
  };
  $("#skipDemoTour").onclick = leaveDemoTourEarly;
  $("#closeDemoTour").onclick = leaveDemoTourEarly;
  $("#finishStartJournal").onclick = () => {
    $("#demoFinalDialog")?.close();
    leaveDemoMode();
  };
  $("#finishExploreDemo").onclick = continueExploringDemo;
  $("#finishReplayTour").onclick = () => {
    $("#demoFinalDialog")?.close();
    startDemoTour();
  };
  $$(".close-dialog").forEach(
    (b) => (b.onclick = () => b.closest("dialog").close()),
  );
  document.addEventListener("click", (event) => {
    const add = event.target.closest("#addGlobalObservation"),
      edit = event.target.closest("[data-global-observation]");
    if (add) openGlobalObservation();
    else if (edit) openGlobalObservation(edit.dataset.globalObservation);
  });
  function setAuthMode(mode) {
    authMode = mode === "signup" ? "signup" : "login";
    const signup = authMode === "signup",
      confirmInput = $("#authPasswordConfirm");
    $("#loginTab").classList.toggle("active", !signup);
    $("#signupTab").classList.toggle("active", signup);
    $("#authTitle").textContent = signup ? "Créer un compte" : "Connexion";
    $("#authSubmit").textContent = signup ? "Créer mon compte" : "Me connecter";
    $("#confirmPasswordLabel").hidden = !signup;
    confirmInput.required = signup;
    if (!signup) confirmInput.value = "";
    $("#authPassword").autocomplete = signup
      ? "new-password"
      : "current-password";
    $("#forgotPassword").hidden = signup;
    $("#authMessage").textContent = signup
      ? "Après l’inscription, confirme le courriel de Supabase."
      : "La connexion se fait directement dans l’application.";
  }
  function friendlyAuthError(error) {
    const text = (error?.message || "").toLowerCase();
    if (text.includes("invalid login credentials"))
      return "Courriel ou mot de passe incorrect.";
    if (text.includes("email not confirmed"))
      return "Confirme d’abord ton adresse courriel.";
    if (text.includes("user already registered"))
      return "Ce courriel possède déjà un compte.";
    if (text.includes("rate limit"))
      return "Trop de tentatives rapprochées. Attends un peu puis réessaie.";
    return error?.message || "Une erreur est survenue.";
  }
  $("#loginTab").onclick = () => setAuthMode("login");
  $("#signupTab").onclick = () => setAuthMode("signup");
  $("#authForm").onsubmit = async (e) => {
    e.preventDefault();
    if (!client) return;
    const email = $("#authEmail").value.trim().toLowerCase(),
      password = $("#authPassword").value,
      confirm = $("#authPasswordConfirm").value,
      msg = $("#authMessage");
    msg.textContent =
      authMode === "signup" ? "Création du compte…" : "Connexion…";
    if (password.length < 8) {
      msg.textContent = "Le mot de passe doit contenir au moins 8 caractères.";
      return;
    }
    if (authMode === "signup" && password !== confirm) {
      msg.textContent = "Les deux mots de passe ne sont pas identiques.";
      return;
    }
    if (authMode === "signup") {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}${location.pathname}` },
      });
      if (error) {
        msg.textContent = friendlyAuthError(error);
        return;
      }
      if (data.session) {
        session = data.session;
        $("#authDialog").close();
        await seedCloudFromLocal();
        render();
      } else {
        msg.textContent =
          "Compte créé. Confirme le courriel, puis connecte-toi.";
        setAuthMode("login");
      }
    } else {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        msg.textContent = friendlyAuthError(error);
        return;
      }
      session = data.session;
      $("#authDialog").close();
      await loadDemoAccess();
      await pullCloud(false);
      await syncNow();
      render();
    }
  };
  $("#forgotPassword").onclick = async () => {
    const email = $("#authEmail").value.trim().toLowerCase(),
      msg = $("#authMessage");
    if (!email) {
      msg.textContent = "Entre d’abord ton adresse courriel.";
      return;
    }
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}${location.pathname}`,
    });
    msg.textContent = error
      ? friendlyAuthError(error)
      : "Courriel de récupération envoyé.";
  };
  $("#passwordForm").onsubmit = async (e) => {
    e.preventDefault();
    const p = $("#newPassword").value,
      c = $("#newPasswordConfirm").value,
      msg = $("#passwordMessage");
    if (p.length < 8 || p !== c) {
      msg.textContent =
        p !== c
          ? "Les mots de passe ne sont pas identiques."
          : "Minimum 8 caractères.";
      return;
    }
    const { error } = await client.auth.updateUser({ password: p });
    msg.textContent = error
      ? friendlyAuthError(error)
      : "Mot de passe enregistré.";
    if (!error) setTimeout(() => $("#passwordDialog").close(), 600);
  };
  function exportData() {
    const blob = new Blob([JSON.stringify(db, null, 2)], {
        type: "application/json",
      }),
      a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `energie-repas-${todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  $("#importFile").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      db = migrate(JSON.parse(await f.text()));
      saveLocal("import");
      if (session && confirm("Importer aussi cette copie dans Supabase?"))
        await seedCloudFromLocal();
      render();
    } catch (_) {
      alert("Ce fichier JSON ne peut pas être importé.");
    }
  };
  $("#themeToggle").onclick = () => {
    db.settings.theme = db.settings.theme === "dark" ? "system" : "dark";
    saveLocal("theme");
    render();
  };
  $("#closeProfessionalPicker").onclick = () => {
    $("#professionalClientDialog")?.close();
    if (!db.settings.demoMode) professionalDemoMode = false;
  };
  $$(".nav-item").forEach(
    (b) =>
      (b.onclick = () => {
        const was = currentView;
        currentView = b.dataset.view;
        if (currentView === "today" && was !== "today")
          selectedDate = todayKey();
        render();
      }),
  );
  window.addEventListener("online", () => {
    updateSyncBadge();
    if (session) syncNow();
  });
  window.addEventListener("offline", updateSyncBadge);
  function splashLocalePack() {
    const locale = window.ENERGIE_LOCALE || "fr-CA";
    const packs = {
      "fr-CA": {
        status: {
          empty: "Le Cerveau est prêt à apprendre avec ton journal.",
          one: "1 journée est maintenant enregistrée.",
          many: (n) => `${n} journées alimentent maintenant tes observations.`,
          growing: (n) =>
            `Ton historique de ${n} journées rend les tendances plus précises.`,
        },
        labels: {
          fact: "Saviez-vous que…",
          tip: "Astuce Énergie",
          appHint: "À découvrir",
        },
        facts: [
          "Les fibres et les protéines contribuent souvent à une satiété plus durable.",
          "La régularité du sommeil compte souvent autant que sa durée.",
          "Une courte marche après un repas peut aider certaines personnes à se sentir plus alertes.",
          "Les besoins en énergie varient selon le sommeil, l’activité et plusieurs autres facteurs.",
          "Un même repas peut être ressenti différemment selon le sommeil, le stress ou l’activité de la journée.",
          "Les tendances deviennent plus utiles lorsqu’on compare plusieurs journées plutôt qu’un seul repas.",
          "Noter le moment d’un ressenti aide à observer les réactions qui apparaissent plus tard.",
        ],
        tips: [
          "Ajoute un repas aux Favoris pour le réutiliser en quelques secondes.",
          "Le Cerveau recherche des habitudes sur plusieurs journées, jamais sur une seule entrée.",
          "Tu peux noter un ressenti après un repas pour enrichir les observations.",
          "Le Tableau intelligent résume rapidement les sept derniers jours.",
          "Une description précise des aliments améliore les estimations et les observations.",
          "Balaye l’écran horizontalement pour passer rapidement d’une section à l’autre.",
        ],
        appHints: [
          "Le Cerveau compare plusieurs journées pour repérer des habitudes; il ne tire jamais de conclusion à partir d’une seule entrée.",
          "Le Profil regroupe tes préférences, tes favoris, la langue, les notifications et les options de confidentialité.",
          "Plus ton journal est complet — repas, sommeil, hydratation, activité et ressentis — plus les tendances deviennent utiles.",
          "Une tendance décrit une évolution répétée dans le temps; ce n’est ni un diagnostic ni une certitude médicale.",
          "Le Tableau intelligent résume les sept derniers jours pour t’aider à voir rapidement ce qui change.",
          "Les Observations permettent de noter un symptôme ou un ressenti, même lorsqu’il n’est pas lié à un repas précis.",
          "Les Favoris servent à réutiliser rapidement les repas que tu manges souvent, sans tout retaper.",
          "Les estimations nutritionnelles sont approximatives et servent surtout à comparer les habitudes dans le temps.",
          "Le Cerveau devient plus pertinent à mesure que ton historique s’allonge et que tes entrées restent régulières.",
          "Tu peux revenir modifier une journée passée afin de garder ton historique aussi fidèle que possible.",
        ],
      },
      "fr-FR": {
        status: {
          empty: "Le Cerveau est prêt à apprendre avec votre journal.",
          one: "1 journée est maintenant enregistrée.",
          many: (n) => `${n} journées alimentent maintenant vos observations.`,
          growing: (n) =>
            `Votre historique de ${n} journées rend les tendances plus précises.`,
        },
        labels: {
          fact: "Le saviez-vous ?",
          tip: "Astuce Énergie",
          appHint: "À découvrir",
        },
        facts: [
          "Les fibres et les protéines contribuent souvent à une satiété plus durable.",
          "La régularité du sommeil compte souvent autant que sa durée.",
          "Une courte marche après un repas peut aider certaines personnes à se sentir plus alerte.",
          "Les besoins en énergie varient selon le sommeil, l’activité et plusieurs autres facteurs.",
          "Un même repas peut être ressenti différemment selon le sommeil, le stress ou l’activité de la journée.",
          "Les tendances deviennent plus utiles lorsque l’on compare plusieurs journées plutôt qu’un seul repas.",
          "Noter le moment d’un ressenti aide à observer les réactions qui apparaissent plus tard.",
        ],
        tips: [
          "Ajoutez un repas aux Favoris pour le réutiliser en quelques secondes.",
          "Le Cerveau recherche des habitudes sur plusieurs journées, jamais sur une seule entrée.",
          "Vous pouvez noter un ressenti après un repas pour enrichir les observations.",
          "Le Tableau intelligent résume rapidement les sept derniers jours.",
          "Une description précise des aliments améliore les estimations et les observations.",
          "Balayez l’écran horizontalement pour passer rapidement d’une section à l’autre.",
        ],
        appHints: [
          "Le Cerveau compare plusieurs journées pour repérer des habitudes ; il ne tire jamais de conclusion à partir d’une seule entrée.",
          "Le Profil regroupe vos préférences, vos favoris, la langue, les notifications et les options de confidentialité.",
          "Plus votre journal est complet — repas, sommeil, hydratation, activité et ressentis — plus les tendances deviennent utiles.",
          "Une tendance décrit une évolution répétée dans le temps ; ce n’est ni un diagnostic ni une certitude médicale.",
          "Le Tableau intelligent résume les sept derniers jours pour vous aider à voir rapidement ce qui change.",
          "Les Observations permettent de noter un symptôme ou un ressenti, même lorsqu’il n’est pas lié à un repas précis.",
          "Les Favoris servent à réutiliser rapidement les repas que vous mangez souvent, sans tout ressaisir.",
          "Les estimations nutritionnelles sont approximatives et servent surtout à comparer les habitudes dans le temps.",
          "Le Cerveau devient plus pertinent à mesure que votre historique s’allonge et que vos entrées restent régulières.",
          "Vous pouvez revenir modifier une journée passée afin de garder votre historique aussi fidèle que possible.",
        ],
      },
      en: {
        status: {
          empty: "The Brain is ready to learn from your journal.",
          one: "1 day is now recorded in your journal.",
          many: (n) => `${n} days now contribute to your observations.`,
          growing: (n) =>
            `Your ${n}-day history is making patterns more precise.`,
        },
        labels: {
          fact: "Did you know?",
          tip: "Energy tip",
          appHint: "Discover",
        },
        facts: [
          "Fiber and protein often contribute to longer-lasting fullness.",
          "A consistent sleep schedule can matter as much as sleep duration.",
          "A short walk after a meal may help some people feel more alert.",
          "Energy needs vary with sleep, activity, and many other factors.",
          "The same meal may feel different depending on sleep, stress, or activity that day.",
          "Patterns become more useful when several days are compared instead of a single meal.",
          "Recording when a symptom begins helps capture reactions that appear later.",
        ],
        tips: [
          "Save a meal as a Favorite to reuse it in seconds.",
          "The Brain looks for patterns across several days, never from a single entry.",
          "Log how you feel after a meal to enrich your observations.",
          "The Smart Dashboard summarizes your last seven days at a glance.",
          "Detailed food descriptions improve estimates and observations.",
          "Swipe horizontally to move quickly between app sections.",
        ],
        appHints: [
          "The Brain compares several days to identify patterns; it never draws a conclusion from a single entry.",
          "Profile brings together your preferences, favorites, language, notifications, and privacy options.",
          "The more complete your journal is — meals, sleep, hydration, activity, and symptoms — the more useful your trends become.",
          "A trend describes a repeated change over time; it is not a diagnosis or a medical certainty.",
          "The Smart Dashboard summarizes your last seven days so you can quickly see what is changing.",
          "Observations let you log a symptom or feeling even when it is not linked to a specific meal.",
          "Favorites help you reuse meals you eat often without typing everything again.",
          "Nutrition estimates are approximate and are mainly intended to compare habits over time.",
          "The Brain becomes more relevant as your history grows and your entries remain consistent.",
          "You can edit a past day to keep your history as accurate as possible.",
        ],
      },
    };
    return packs[locale] || packs["fr-CA"];
  }
  function rotatingSplashIndex(length, kind) {
    if (length < 2) return 0;
    const locale = window.ENERGIE_LOCALE || "fr-CA",
      key = `energieSplashRotation_${todayKey()}_${locale}_${kind}`;
    let shown = [];
    try {
      shown = JSON.parse(localStorage.getItem(key) || "[]").filter(
        (index) => Number.isInteger(index) && index >= 0 && index < length,
      );
    } catch (_) {
      shown = [];
    }
    let available = Array.from({ length }, (_, index) => index).filter(
      (index) => !shown.includes(index),
    );
    if (!available.length) {
      shown = [];
      available = Array.from({ length }, (_, index) => index);
    }
    const randomValue = globalThis.crypto?.getRandomValues
        ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
        : Math.floor(Math.random() * 4294967296),
      index = available[randomValue % available.length];
    shown.push(index);
    try {
      localStorage.setItem(key, JSON.stringify(shown));
    } catch (_) {}
    return index;
  }
  function initDailySplash() {
    const wrap = $("#splashDaily"),
      statusEl = $("#splashStatus"),
      labelEl = $("#splashTipLabel"),
      textEl = $("#splashTipText"),
      appHintIconEl = $("#splashAppHintIcon"),
      appHintLabelEl = $("#splashAppHintLabel"),
      appHintTextEl = $("#splashAppHintText");
    if (
      !wrap ||
      !statusEl ||
      !labelEl ||
      !textEl ||
      !appHintIconEl ||
      !appHintLabelEl ||
      !appHintTextEl
    )
      return;
    const pack = splashLocalePack(),
      days = Object.values(db.days || {}).filter(
        (day) =>
          day &&
          (day.meals?.length ||
            day.sleepHours != null ||
            Number(day.water) > 0 ||
            day.activities?.length),
      ).length;
    statusEl.textContent =
      days === 0
        ? pack.status.empty
        : days === 1
          ? pack.status.one
          : days < 14
            ? pack.status.many(days)
            : pack.status.growing(days);
    const seed = dateSeed(todayKey()),
      showFeatureTip = seed % 3 === 0;
    const pool = showFeatureTip ? pack.tips : pack.facts,
      index = rotatingSplashIndex(pool.length, showFeatureTip ? "tip" : "fact");
    labelEl.textContent = showFeatureTip ? pack.labels.tip : pack.labels.fact;
    textEl.textContent = pool[index];
    const randomValue = globalThis.crypto?.getRandomValues
      ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
      : Math.floor(Math.random() * 4294967296);
    const previousHint = Number(
      sessionStorage.getItem("energieLastSplashAppHint"),
    );
    let appHintIndex = randomValue % pack.appHints.length;
    if (pack.appHints.length > 1 && appHintIndex === previousHint)
      appHintIndex =
        (appHintIndex + 1 + (randomValue % (pack.appHints.length - 1))) %
        pack.appHints.length;
    sessionStorage.setItem("energieLastSplashAppHint", String(appHintIndex));
    const appHintIcons = [
      "🧠",
      "⚙️",
      "📝",
      "📈",
      "📊",
      "😊",
      "⭐",
      "🧮",
      "🧠",
      "🗓️",
    ];
    appHintIconEl.textContent = appHintIcons[appHintIndex] || "✨";
    appHintLabelEl.textContent = pack.labels.appHint;
    appHintTextEl.textContent = pack.appHints[appHintIndex];
    wrap.hidden = false;
  }
  function dismissSplash() {
    const splash = $("#splashScreen");
    if (!splash) return;
    const reduced = matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const readingTime = reduced ? 6300 : 6900;
    setTimeout(() => {
      splash.classList.add("is-hidden");
      setTimeout(() => splash.remove(), 420);
    }, readingTime);
  }
  let dialogScrollY = 0;
  function syncDialogScrollLock() {
    const open = !!document.querySelector("dialog[open]");
    if (open && !document.body.classList.contains("dialog-open")) {
      dialogScrollY = window.scrollY;
      document.body.style.top = `-${dialogScrollY}px`;
      document.body.classList.add("dialog-open");
    } else if (!open && document.body.classList.contains("dialog-open")) {
      document.body.classList.remove("dialog-open");
      document.body.style.top = "";
      window.scrollTo(0, dialogScrollY);
    }
  }
  new MutationObserver(syncDialogScrollLock).observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["open"],
  });
  async function loadDemoAccess() {
    hasDemoAccess = false;
    if (!session) return false;
    if (DEMO_ACCESS_FOR_ALL_ACCOUNTS) {
      hasDemoAccess = true;
      return true;
    }
    if (!client) return false;
    try {
      const { data, error } = await client
        .from("profiles")
        .select("has_demo_access")
        .eq("id", session.user.id)
        .maybeSingle();
      if (error) {
        console.info("Accès démo non configuré:", error.message);
        return false;
      }
      hasDemoAccess = data?.has_demo_access === true;
    } catch (error) {
      console.info("Accès démo indisponible:", error?.message || error);
    }
    return hasDemoAccess;
  }
  async function initAuth() {
    if (!client) {
      render();
      setTimeout(showExperienceLaunchIfNeeded, 120);
      return;
    }
    const { data } = await client.auth.getSession();
    session = data.session;
    client.auth.onAuthStateChange((event, newSession) => {
      session = newSession;
      if (newSession) loadDemoAccess().then(() => render());
      else hasDemoAccess = false;
      updateSyncBadge();
      if (event === "PASSWORD_RECOVERY")
        setTimeout(() => $("#passwordDialog").showModal(), 0);
      if (event === "SIGNED_OUT") render();
    });
    if (session) {
      await loadDemoAccess();
      if (!db.settings.demoMode) {
        await pullCloud(false);
        await syncNow();
      }
    }
    render();
    setTimeout(showExperienceLaunchIfNeeded, 120);
  }
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        const reg = await navigator.serviceWorker.register("./sw.js?v=3.46.1");
        await reg.update();
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          location.reload();
        });
        if (reg.waiting) {
          reg.waiting.postMessage?.({ type: "SKIP_WAITING" });
        }
      } catch (e) {
        console.warn(e);
      }
    });
  }

  // Filet de sécurité pour les boutons recréés lors d'un rendu ou d'une synchro.
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#openProfessionalDemo")) return;
    event.preventDefault();
    startProfessionalDemo();
  });

  initDailySplash();
  dismissSplash();
  initAuth();
  scheduleFeelingChecks();

  setInterval(() => updateLivingHeader(), 30 * 60 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateLivingHeader();
  });
})();
function parseAppNumber(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");
  if (normalized === "") return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}
