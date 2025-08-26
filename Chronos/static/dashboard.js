function initializeDashboardCharts() {
    // Read data from the embedded JSON script tag
    const dashboardDataScript = document.getElementById('dashboard-data');
    let dashboardData = {};
    if (dashboardDataScript) {
        try {
            dashboardData = JSON.parse(dashboardDataScript.textContent);
        } catch (e) {
            console.error("Error parsing dashboard data:", e);
        }
    }

    // Function to open task edit modal
    function openTaskModal(taskId) {
        // Assuming openEditModal is globally available from task_manager.js or base.js
        if (typeof openEditModal === 'function') {
            openEditModal('/task/' + taskId + '/edit');
        } else {
            console.error('openEditModal function not found. Make sure task_manager.js is loaded.');
        }
    }

    // Attach click listeners to task list items
    document.querySelectorAll('#upcomingDeadlinesList li, #overdueTasksList li').forEach(item => {
        item.addEventListener('click', function() {
            const taskId = this.dataset.taskId;
            if (taskId) {
                openTaskModal(taskId);
            }
        });
    });

    // Function to render a pie chart
    function renderPieChart(canvasId, labels, data, totalValue, title) {
        let canvas = document.getElementById(canvasId);
        let ctx;

        // If canvas does not exist, something is wrong, return.
        if (!canvas) {
            console.error(`Canvas element with ID '${canvasId}' not found.`);
            return;
        }

        // If a chart instance already exists on this canvas, destroy it
        if (window.ChartInstances && window.ChartInstances[canvasId]) {
            window.ChartInstances[canvasId].destroy();
            delete window.ChartInstances[canvasId];
        }

        ctx = canvas.getContext('2d');

        // Store the new chart instance globally
        if (!window.ChartInstances) {
            window.ChartInstances = {};
        }

        window.ChartInstances[canvasId] = new Chart(ctx, {
            type: 'doughnut', // Use doughnut for the "circle with total inside" effect
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9900'
                    ],
                    hoverBackgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9900'
                    ],
                    borderColor: 'rgb(32, 41, 56)',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Hide the built-in legend
                    },
                    title: {
                        display: true,
                        text: title,
                        color: 'white' // Adjust title text color for dark background
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += context.parsed;
                                }
                                return label;
                            }
                        }
                    }
                },
                // Add a callback to generate the custom legend after the chart is updated
                // This ensures the chart is fully rendered before we try to get its data for the legend
                animation: {
                    onComplete: function(animation) {
                        const chart = animation.chart;
                        const legendContainerId = chart.canvas.id + 'Legend';
                        generateLegend(chart, legendContainerId);
                    }
                },
                cutout: '75%', // Makes it a doughnut chart
                elements: {
                    arc: {
                        borderWidth: 3 // Remove borders between segments
                    }
                }
            },
            plugins: [{
                // Plugin to display total in the center of the doughnut chart
                id: 'centerText',
                beforeDraw: function(chart) {
                    const width = chart.width,
                        height = chart.height,
                        ctx = chart.ctx;

                    ctx.restore();
                    const fontSize = (height / 114).toFixed(2);
                    ctx.font = "bold " + fontSize + "em sans-serif";
                    ctx.textBaseline = "middle";

                    const text = totalValue; // Use the totalValue passed to the function
                    const textX = Math.round((width - ctx.measureText(text).width) / 2);
                    const textY = height / 2;

                    ctx.fillStyle = 'white'; // Color for the total text
                    ctx.fillText(text, textX, textY);
                    ctx.save();
                }
            }]
        });
    }

    // Function to generate a custom HTML legend
    function generateLegend(chart, legendContainerId) {
        const legendContainer = document.getElementById(legendContainerId);
        if (!legendContainer) {
            console.error(`Legend container with ID '${legendContainerId}' not found.`);
            return;
        }

        // Clear existing legend items
        legendContainer.innerHTML = '';

        const ul = document.createElement('ul');
        ul.className = 'chart-legend-list'; // Add a class for styling

        chart.data.labels.forEach((label, i) => {
            const li = document.createElement('li');
            li.className = 'chart-legend-item flex items-center mb-2'; // Tailwind classes for styling

            const colorBox = document.createElement('span');
            colorBox.className = 'chart-legend-color-box w-4 h-4 rounded-full mr-2';
            colorBox.style.backgroundColor = chart.data.datasets[0].backgroundColor[i];

            const text = document.createElement('span');
            text.className = 'chart-legend-text text-white'; // Tailwind class for text color
            text.textContent = label + ': ' + chart.data.datasets[0].data[i];

            li.appendChild(colorBox);
            li.appendChild(text);
            ul.appendChild(li);
        });

        legendContainer.appendChild(ul);
    }

    // Data from backend (now read from dashboardData object)
    const tasksStartedThisWeek = dashboardData.tasks_started_this_week || 0;

    const tasksInProgressThisWeek = dashboardData.tasks_in_progress_this_week || 0;
    const tasksCompletedThisWeek = dashboardData.tasks_completed_this_week || 0;
    const totalTasks = dashboardData.total_tasks || 0;

    const weeklySummaryData = {
        labels: ['Started', 'In Progress', 'Completed'],
        data: [tasksStartedThisWeek, tasksInProgressThisWeek, tasksCompletedThisWeek],
        total: tasksStartedThisWeek + tasksInProgressThisWeek + tasksCompletedThisWeek
    };

    const tasksByStatusRaw = JSON.parse(dashboardData.tasks_by_status_json || '{}');
    const tasksByStatusLabels = Object.keys(tasksByStatusRaw);
    const tasksByStatusDataValues = Object.values(tasksByStatusRaw);

    const tasksByStatusData = {
        labels: tasksByStatusLabels,
        data: tasksByStatusDataValues,
        total: totalTasks
    };

    const tasksByPriorityRaw = JSON.parse(dashboardData.tasks_by_priority_json || '{}');
    const tasksByPriorityLabels = Object.keys(tasksByPriorityRaw);
    const tasksByPriorityDataValues = Object.values(tasksByPriorityRaw);

    const tasksByPriorityData = {
        labels: tasksByPriorityLabels,
        data: tasksByPriorityDataValues,
        total: totalTasks
    };

    // Render charts
    renderPieChart('weeklySummaryChart', weeklySummaryData.labels, weeklySummaryData.data, weeklySummaryData.total, 'Weekly Summary');
    renderPieChart('tasksByStatusChart', tasksByStatusData.labels, tasksByStatusData.data, tasksByStatusData.total, 'Tâches par statut');
    renderPieChart('tasksByPriorityChart', tasksByPriorityData.labels, tasksByPriorityData.data, tasksByPriorityData.total, 'Tâches par priorité');
}
