/* ==========================================================================
   ADS International Auditors LLC — Registration Dashboard Logic
   ========================================================================== */

import { isSupabaseConfigured, getSupabaseClient } from "./supabaseClient.js";

(function () {
  "use strict";

  const XLSX_CDN_URL = "https://esm.sh/xlsx@0.18.5";

  const loginScreen = document.getElementById("login-screen");
  const loginForm = document.getElementById("login-form");
  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  const loginError = document.getElementById("login-error");
  const loginBtn = document.getElementById("login-btn");

  const dashboardScreen = document.getElementById("dashboard-screen");
  const dashError = document.getElementById("dash-error");
  const dashLoading = document.getElementById("dash-loading");
  const dashMain = document.getElementById("dash-main");

  const btnLogout = document.getElementById("btn-logout");
  const btnRefresh = document.getElementById("btn-refresh");
  const btnExport = document.getElementById("btn-export");
  const tableSearch = document.getElementById("table-search");

  let allResponses = [];
  let supabaseClient = null;

  const FIELD_LABELS = {
    full_name: "Full Name",
    mobile: "Mobile / WhatsApp Number",
    email: "Email ID",
    company_name: "Company Name",
    designation: "Designation",
    turnover: "Approximate Annual Turnover",
    erp: "Current Accounting / ERP Software Used",
    erp_other_specify: "ERP Software — Other (Specify)",
    attendees: "Number of Attendees",
    hear_about: "How Did You Hear About This Event?",
    hear_about_other_specify: "Heard About — Other (Specify)",
    question: "Specific Question Regarding UAE E-Invoicing",
    created_at: "Submitted At",
  };

  function showLogin() {
    loginScreen.hidden = false;
    dashboardScreen.hidden = true;
  }

  function showDashboard() {
    loginScreen.hidden = true;
    dashboardScreen.hidden = false;
  }

  /* ------------------------------------------------------------------ */
  /* Auth                                                                 */
  /* ------------------------------------------------------------------ */
  async function init() {
    if (!isSupabaseConfigured()) {
      loginError.textContent = "Supabase is not configured for this site yet.";
      loginError.classList.add("is-visible");
      loginBtn.disabled = true;
      return;
    }

    supabaseClient = await getSupabaseClient();

    const { data } = await supabaseClient.auth.getSession();
    if (data && data.session) {
      showDashboard();
      loadData();
    } else {
      showLogin();
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session) {
        showDashboard();
        loadData();
      } else {
        showLogin();
      }
    });
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    loginError.classList.remove("is-visible");
    loginBtn.disabled = true;
    loginBtn.classList.add("is-loading");

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: loginEmail.value.trim(),
        password: loginPassword.value,
      });
      if (error) throw error;
      loginPassword.value = "";
    } catch (err) {
      loginError.textContent = "Incorrect email or password. Please try again.";
      loginError.classList.add("is-visible");
    } finally {
      loginBtn.disabled = false;
      loginBtn.classList.remove("is-loading");
    }
  });

  btnLogout.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
  });

  /* ------------------------------------------------------------------ */
  /* Data loading                                                         */
  /* ------------------------------------------------------------------ */
  async function loadData() {
    dashMain.hidden = true;
    dashError.hidden = true;
    dashLoading.hidden = false;

    try {
      const [{ data: responses, error: responsesError }, { data: events, error: eventsError }] = await Promise.all([
        supabaseClient.from("responses").select("*").order("created_at", { ascending: false }),
        supabaseClient.from("page_events").select("event_type, created_at"),
      ]);

      if (responsesError) throw responsesError;
      if (eventsError) throw eventsError;

      allResponses = responses || [];
      renderKpisAndFunnel(allResponses, events || []);
      renderBreakdownCharts(allResponses);
      renderDailyChart(allResponses);
      renderTable(allResponses);

      dashLoading.hidden = true;
      dashMain.hidden = false;
    } catch (err) {
      console.error("Dashboard data load failed:", err);
      dashLoading.hidden = true;
      dashError.hidden = false;
      dashError.textContent =
        "Could not load registration data. This usually means the page_events table or its " +
        "read policy hasn't been created yet in Supabase, or your session doesn't have access.";
    }
  }

  btnRefresh.addEventListener("click", loadData);

  /* ------------------------------------------------------------------ */
  /* KPIs + funnel                                                        */
  /* ------------------------------------------------------------------ */
  function renderKpisAndFunnel(responses, events) {
    const visits = events.filter((e) => e.event_type === "page_view").length;
    const started = events.filter((e) => e.event_type === "registration_started").length;
    const completed = responses.length;
    const conversion = visits > 0 ? Math.round((completed / visits) * 100) : 0;

    document.getElementById("kpi-visits").textContent = visits.toLocaleString();
    document.getElementById("kpi-started").textContent = started.toLocaleString();
    document.getElementById("kpi-completed").textContent = completed.toLocaleString();
    document.getElementById("kpi-conversion").textContent = conversion + "%";

    const scale = Math.max(visits, started, completed, 1);
    const stages = [
      { name: "Visited the Link", count: visits },
      { name: "Started Registration", count: started },
      { name: "Completed Registration", count: completed },
    ];

    const funnelEl = document.getElementById("funnel-chart");
    funnelEl.innerHTML = "";
    stages.forEach((stage) => {
      const pctOfTop = visits > 0 ? Math.round((stage.count / visits) * 100) : 0;
      const row = document.createElement("div");
      row.className = "funnel-row";

      const top = document.createElement("div");
      top.className = "funnel-row-top";
      const name = document.createElement("span");
      name.className = "funnel-name";
      name.textContent = stage.name;
      const count = document.createElement("span");
      count.className = "funnel-count";
      count.textContent = stage.count.toLocaleString();
      const pct = document.createElement("span");
      pct.className = "funnel-pct";
      pct.textContent = "(" + pctOfTop + "% of visits)";
      count.appendChild(pct);
      top.appendChild(name);
      top.appendChild(count);

      const track = document.createElement("div");
      track.className = "funnel-track";
      const fill = document.createElement("div");
      fill.className = "funnel-fill";
      track.appendChild(fill);

      row.appendChild(top);
      row.appendChild(track);
      funnelEl.appendChild(row);

      requestAnimationFrame(() => {
        fill.style.width = Math.min(100, (stage.count / scale) * 100) + "%";
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Breakdown bar charts                                                 */
  /* ------------------------------------------------------------------ */
  function countBy(responses, getKey) {
    const counts = new Map();
    responses.forEach((r) => {
      const key = getKey(r);
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  function renderBarChart(containerId, rows) {
    const el = document.getElementById(containerId);
    el.innerHTML = "";
    if (rows.length === 0) {
      const empty = document.createElement("p");
      empty.className = "bar-chart-empty";
      empty.textContent = "No data yet.";
      el.appendChild(empty);
      return;
    }
    const max = Math.max(...rows.map((r) => r.count), 1);
    rows.forEach((row) => {
      const rowEl = document.createElement("div");
      rowEl.className = "bar-row";
      rowEl.tabIndex = 0;
      rowEl.setAttribute("role", "img");
      rowEl.setAttribute("aria-label", row.label + ": " + row.count + " registrations");

      const label = document.createElement("span");
      label.className = "bar-row-label";
      label.textContent = row.label;
      label.title = row.label;

      const track = document.createElement("div");
      track.className = "bar-track";
      const fill = document.createElement("div");
      fill.className = "bar-fill";
      track.appendChild(fill);

      const value = document.createElement("span");
      value.className = "bar-row-value";
      value.textContent = String(row.count);

      rowEl.appendChild(label);
      rowEl.appendChild(track);
      rowEl.appendChild(value);
      el.appendChild(rowEl);

      requestAnimationFrame(() => {
        fill.style.width = (row.count / max) * 100 + "%";
      });
    });
  }

  function renderBreakdownCharts(responses) {
    renderBarChart("chart-turnover", countBy(responses, (r) => r.turnover));
    renderBarChart(
      "chart-erp",
      countBy(responses, (r) => (r.erp === "Other" && r.erp_other_specify ? r.erp_other_specify : r.erp))
    );
    renderBarChart(
      "chart-hearabout",
      countBy(responses, (r) => (r.hear_about === "Other" && r.hear_about_other_specify ? r.hear_about_other_specify : r.hear_about))
    );
  }

  /* ------------------------------------------------------------------ */
  /* Registrations per day (vertical bars)                               */
  /* ------------------------------------------------------------------ */
  function renderDailyChart(responses) {
    const el = document.getElementById("chart-daily");
    el.innerHTML = "";
    if (responses.length === 0) {
      const empty = document.createElement("p");
      empty.className = "bar-chart-empty";
      empty.textContent = "No registrations yet.";
      el.appendChild(empty);
      return;
    }

    const counts = new Map();
    responses.forEach((r) => {
      const day = new Date(r.created_at).toISOString().slice(0, 10);
      counts.set(day, (counts.get(day) || 0) + 1);
    });
    const days = Array.from(counts.keys()).sort();
    const max = Math.max(...Array.from(counts.values()), 1);

    days.forEach((day) => {
      const count = counts.get(day);
      const col = document.createElement("div");
      col.className = "vbar-col";
      col.tabIndex = 0;
      const dateLabel = new Date(day + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
      col.setAttribute("role", "img");
      col.setAttribute("aria-label", dateLabel + ": " + count + " registrations");

      const value = document.createElement("span");
      value.className = "vbar-value";
      value.textContent = String(count);

      const track = document.createElement("div");
      track.className = "vbar-track";
      const fill = document.createElement("div");
      fill.className = "vbar-fill";
      track.appendChild(fill);

      const date = document.createElement("span");
      date.className = "vbar-date";
      date.textContent = dateLabel;

      col.appendChild(value);
      col.appendChild(track);
      col.appendChild(date);
      el.appendChild(col);

      requestAnimationFrame(() => {
        fill.style.height = (count / max) * 100 + "%";
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Data table + search                                                  */
  /* ------------------------------------------------------------------ */
  function formatDate(iso) {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  function renderTable(responses) {
    const tbody = document.getElementById("responses-tbody");
    const emptyMsg = document.getElementById("table-empty");
    tbody.innerHTML = "";

    if (responses.length === 0) {
      emptyMsg.hidden = false;
      return;
    }
    emptyMsg.hidden = true;

    responses.forEach((r) => {
      const tr = document.createElement("tr");
      const erpDisplay = r.erp === "Other" && r.erp_other_specify ? r.erp_other_specify : r.erp;
      const hearDisplay = r.hear_about === "Other" && r.hear_about_other_specify ? r.hear_about_other_specify : r.hear_about;

      const cells = [
        formatDate(r.created_at),
        r.full_name, r.company_name, r.designation, r.mobile, r.email,
        r.turnover, erpDisplay, String(r.attendees), hearDisplay, r.question || "—",
      ];
      cells.forEach((text) => {
        const td = document.createElement("td");
        td.textContent = text;
        td.title = text;
        tr.appendChild(td);
      });
      tr.dataset.searchText = [r.full_name, r.company_name, r.email].join(" ").toLowerCase();
      tbody.appendChild(tr);
    });
  }

  tableSearch.addEventListener("input", () => {
    const query = tableSearch.value.trim().toLowerCase();
    document.querySelectorAll("#responses-tbody tr").forEach((tr) => {
      tr.hidden = query.length > 0 && !tr.dataset.searchText.includes(query);
    });
  });

  /* ------------------------------------------------------------------ */
  /* Excel export                                                         */
  /* ------------------------------------------------------------------ */
  btnExport.addEventListener("click", async () => {
    btnExport.disabled = true;
    const originalLabel = btnExport.querySelector("span:last-child").textContent;
    btnExport.querySelector("span:last-child").textContent = "Preparing file…";

    try {
      const XLSX = await import(XLSX_CDN_URL);

      const rows = allResponses.map((r) => ({
        [FIELD_LABELS.created_at]: formatDate(r.created_at),
        [FIELD_LABELS.full_name]: r.full_name,
        [FIELD_LABELS.mobile]: r.mobile,
        [FIELD_LABELS.email]: r.email,
        [FIELD_LABELS.company_name]: r.company_name,
        [FIELD_LABELS.designation]: r.designation,
        [FIELD_LABELS.turnover]: r.turnover,
        [FIELD_LABELS.erp]: r.erp,
        [FIELD_LABELS.erp_other_specify]: r.erp_other_specify || "",
        [FIELD_LABELS.attendees]: r.attendees,
        [FIELD_LABELS.hear_about]: r.hear_about,
        [FIELD_LABELS.hear_about_other_specify]: r.hear_about_other_specify || "",
        [FIELD_LABELS.question]: r.question || "",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 18 }, { wch: 22 }, { wch: 16 }, { wch: 24 }, { wch: 22 }, { wch: 18 },
        { wch: 20 }, { wch: 24 }, { wch: 20 }, { wch: 10 }, { wch: 24 }, { wch: 24 }, { wch: 40 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Registrations");

      const visits = Number(document.getElementById("kpi-visits").textContent.replace(/,/g, ""));
      const started = Number(document.getElementById("kpi-started").textContent.replace(/,/g, ""));
      const completed = allResponses.length;
      const summaryRows = [
        { Metric: "Link Visits", Value: visits },
        { Metric: "Started Registration", Value: started },
        { Metric: "Completed Registration", Value: completed },
        { Metric: "Conversion Rate", Value: document.getElementById("kpi-conversion").textContent },
        { Metric: "Exported On", Value: formatDate(new Date().toISOString()) },
      ];
      const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
      summaryWs["!cols"] = [{ wch: 26 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

      const dateStamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, "ADS-EInvoicing-Registrations-" + dateStamp + ".xlsx");
    } catch (err) {
      console.error("Excel export failed:", err);
      window.alert("Could not generate the Excel file. Please check your internet connection and try again.");
    } finally {
      btnExport.disabled = false;
      btnExport.querySelector("span:last-child").textContent = originalLabel;
    }
  });

  init();
})();
