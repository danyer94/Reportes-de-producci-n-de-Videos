(function () {
  // Resolve data.json relative to the current page URL so the same script works from any folder
  const dataPath = new URL("../data/data.json", location.href).href;

  function initDashboard(productionData) {
    productionData = productionData.map((item) => ({
      ...item,
      missing: item.required - (item.revision || 0),
    }));

    // Populate urgent accounts (missing >= 3)
    const urgentContainer = document.getElementById("urgent-accounts");
    if (urgentContainer) {
      const urgent = productionData
        .filter((a) => a.missing >= 3)
        .sort(
          (a, b) => b.missing - a.missing || a.account.localeCompare(b.account)
        );

      console.log(
        "urgent accounts found:",
        urgent.length,
        urgent.map((a) => `${a.account} (${a.missing})`)
      );

      urgentContainer.innerHTML = "";
      urgent.forEach((account) => {
        const card = document.createElement("div");
        card.className = "stat-card";
        card.style.cssText =
          "text-align: left; background: rgba(244, 67, 54, 0.1); border: 1px solid #f44336;";
        card.innerHTML = `
          <h3>${account.account}</h3>
          <p>${account.required} required | ${account.revision} under revision | <span class="missing">${account.missing} missing</span></p>
          <p><i class="fas fa-user"></i> Editor: ${account.editor}</p>
          <p><i class="fas fa-tag"></i> Category: ${account.category}</p>
        `;
        urgentContainer.appendChild(card);
      });
    }

    // Calculate totals
    const totals = productionData.reduce(
      (acc, item) => {
        acc.required += item.required || 0;
        acc.revision += item.revision || 0;
        return acc;
      },
      { required: 0, revision: 0 }
    );

    totals.missing = totals.required - totals.revision;
    const editors = [...new Set(productionData.map((item) => item.editor))];

    // Update stats
    const elTotalRequired = document.getElementById("total-required");
    const elTotalRevision = document.getElementById("total-revision");
    const elTotalMissing = document.getElementById("total-missing");
    const elActiveEditors = document.getElementById("active-editors");
    if (elTotalRequired) elTotalRequired.textContent = totals.required;
    if (elTotalRevision) elTotalRevision.textContent = totals.revision;
    if (elTotalMissing) elTotalMissing.textContent = totals.missing;
    if (elActiveEditors) elActiveEditors.textContent = editors.length;

    // Table and filters logic
    const tableBody = document.getElementById("production-table");
    const tableFooter = document.getElementById("production-table-footer");
    const editorFilter = document.getElementById("editor-filter");
    const categoryFilter = document.getElementById("category-filter");

    function renderTable() {
      const selectedEditor = editorFilter ? editorFilter.value : "all";
      const selectedCategory = categoryFilter ? categoryFilter.value : "all";

      const filteredData = productionData.filter((item) => {
        const editorMatch =
          selectedEditor === "all" || item.editor === selectedEditor;
        const categoryMatch =
          selectedCategory === "all" || item.category === selectedCategory;
        return editorMatch && categoryMatch;
      });

      // Clear existing table content
      if (tableBody) tableBody.innerHTML = "";
      if (tableFooter) tableFooter.innerHTML = "";

      let totalRequired = 0;
      let totalRevision = 0;
      let totalMissing = 0;

      // Populate table rows
      filteredData.forEach((item) => {
        const missing = item.missing;
        totalRequired += item.required;
        totalRevision += item.revision;
        totalMissing += missing;

        const progress =
          item.required > 0
            ? Math.round((item.revision / item.required) * 100)
            : 0;
        const row = document.createElement("tr");
        row.innerHTML = `
          <td class="account">${item.account}</td>
          <td class="required">${item.required}</td>
          <td class="revision">${item.revision}</td>
          <td class="missing">${missing}</td>
          <td class="editor">${item.editor}</td>
          <td class="category">${item.category}</td>
          <td>
            <div class="progress-container">
              <div class="progress-bar" style="width: ${progress}%"></div>
            </div>
            <div class="progress-label">${progress}%</div>
          </td>
        `;
        if (tableBody) tableBody.appendChild(row);
      });

      // Populate table footer with totals
      if (tableFooter) {
        const footerRow = document.createElement("tr");
        footerRow.style.fontWeight = "bold";
        footerRow.innerHTML = `
          <td>Total</td>
          <td class="required">${totalRequired}</td>
          <td class="revision">${totalRevision}</td>
          <td class="missing">${totalMissing}</td>
          <td colspan="3"></td>
        `;
        tableFooter.appendChild(footerRow);
      }
    }

    if (editorFilter) editorFilter.addEventListener("change", renderTable);
    if (categoryFilter) categoryFilter.addEventListener("change", renderTable);

    // Initial render
    renderTable();

    // Set current date
    const now = new Date();
    const currentDateEl = document.getElementById("current-date");
    if (currentDateEl)
      currentDateEl.textContent = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    // Charts
    try {
      const editorsList = [
        "Ramon",
        "Duno",
        "Freddy",
        "Chris",
        "Thais/Maddison",
      ];
      const editorTotals = editorsList.map((name) =>
        productionData
          .filter((item) => item.editor === name)
          .reduce((s, it) => s + (it.required || 0), 0)
      );
      const editorMissing = editorsList.map((name) =>
        productionData
          .filter((item) => item.editor === name)
          .reduce((s, it) => s + (it.missing || 0), 0)
      );

      const editorData = {
        labels: editorsList,
        datasets: [
          {
            data: editorTotals,
            backgroundColor: [
              "#4fc3f7",
              "#ff9800",
              "#9c27b0",
              "#4caf50",
              "#e91e63",
            ],
          },
        ],
      };
      new Chart(document.getElementById("editor-distribution"), {
        type: "pie",
        data: editorData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "right",
              labels: { color: "#fff", font: { size: 12 } },
            },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const v = ctx.parsed;
                  const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                  return `${ctx.label}: ${v} (${Math.round(
                    (v / total) * 100
                  )}%)`;
                },
              },
            },
          },
        },
      });

      const workloadData = {
        labels: editorsList,
        datasets: [
          {
            label: "Required Videos",
            data: editorTotals,
            backgroundColor: "#4fc3f7",
          },
          {
            label: "Missing Videos",
            data: editorMissing,
            backgroundColor: "#f44336",
          },
        ],
      };
      new Chart(document.getElementById("editor-workload"), {
        type: "bar",
        data: workloadData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Number of Videos" },
            },
          },
          plugins: {
            legend: { position: "top", labels: { color: "#fff" } },
            tooltip: {
              mode: "index",
              intersect: false,
              callbacks: {
                label: function (context) {
                  return `${context.dataset.label}: ${context.parsed.y}`;
                },
              },
            },
          },
        },
      });
    } catch (e) {
      console.error("Chart rendering failed", e);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (window.productionData) {
      initDashboard(window.productionData);
    } else {
      console.error("Production data not found. Make sure data.js is loaded.");
      const urgentAccountsContainer =
        document.getElementById("urgent-accounts");
      if (urgentAccountsContainer) {
        urgentAccountsContainer.innerHTML =
          '<p class="error-message">Could not load production data. Please check the data file.</p>';
      }
    }
  });
})();
