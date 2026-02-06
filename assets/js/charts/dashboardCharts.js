let charts = {};

export function renderDashboardCharts({ pieCtx, lineCtx, barCtx, categoryData, trendData, budgetData }) {
  if (charts.pie) charts.pie.destroy();
  if (charts.line) charts.line.destroy();
  if (charts.bar) charts.bar.destroy();

  charts.pie = new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: categoryData.map(d => d.category),
      datasets: [{
        data: categoryData.map(d => d.total),
        backgroundColor: ["#1f6f54", "#e3a724", "#2b6cb0", "#d0453d", "#6d6a65"]
      }]
    }
  });

  charts.line = new Chart(lineCtx, {
    type: "line",
    data: {
      labels: trendData.map(d => d.month),
      datasets: [{
        label: "Saldo",
        data: trendData.map(d => d.net),
        borderColor: "#1f6f54",
        tension: 0.3
      }]
    }
  });

  charts.bar = new Chart(barCtx, {
    type: "bar",
    data: {
      labels: budgetData.map(d => d.category),
      datasets: [
        { label: "Orçado", data: budgetData.map(d => d.budget), backgroundColor: "#e3a724" },
        { label: "Realizado", data: budgetData.map(d => d.actual), backgroundColor: "#1f6f54" }
      ]
    }
  });
}
