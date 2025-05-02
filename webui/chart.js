let cpuChart, networkChart;
const MAX_DATA_POINTS = 30;

// Create charts when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
    createCharts();
});

function createCharts() {
    // Get chart colors from CSS variables
    const chartColors = {
        cpu: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(),
        upload: getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim(),
        download: getComputedStyle(document.documentElement).getPropertyValue('--danger-color').trim(),
        textColor: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim()
    };
    
    // Check if light mode is active
    const isLightMode = document.body.classList.contains('light-mode');
    
    // Set text color to black when in light mode
    const textColor = isLightMode ? '#000000' : chartColors.textColor;
    
    // Set Chart.js global defaults
    Chart.defaults.color = textColor;
    Chart.defaults.borderColor = chartColors.borderColor;
    
    // Create charts
    createCpuChart(chartColors, textColor);
    createNetworkChart(chartColors, textColor);
    
    // Watch for theme changes
    watchThemeChanges();
}

function createCpuChart(colors, textColor) {
    const ctx = document.getElementById("cpuChart").getContext("2d");
    const isLightMode = document.body.classList.contains('light-mode');
    
    // Create gradient
    const gradientFill = ctx.createLinearGradient(0, 0, 0, 400);
    gradientFill.addColorStop(0, hexToRGBA(colors.cpu, 0.5));
    gradientFill.addColorStop(1, hexToRGBA(colors.cpu, 0.05));
    
    // Set point border color based on theme
    const pointBorderColor = isLightMode ? "#000000" : "#ffffff";
    
    cpuChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [] // Datasets will be added later
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animations: {
                tension: {
                    duration: 1000,
                    easing: 'linear'
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: textColor,
                        font: {
                            size: 13,
                            weight: 'bold'
                        },
                        usePointStyle: true,
                        boxWidth: 8,
                        padding: 15
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    displayColors: true,
                    backgroundColor: isLightMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.7)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw.toFixed(1)}%`;
                        }
                    },
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            return value + '%';
                        },
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        stepSize: 20,
                        padding: 10
                    },
                    grid: {
                        drawBorder: false,
                        color: hexToRGBA(colors.borderColor, 0.7),
                        lineWidth: 0.5
                    },
                    border: {
                        display: false
                    }
                },
                x: {
                    ticks: {
                        color: textColor,
                        maxRotation: 0,
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        padding: 10
                    },
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.4,
                    borderWidth: 2
                },
                point: {
                    radius: 3,
                    hoverRadius: 6,
                    borderWidth: 2,
                    borderColor: pointBorderColor
                }
            }
        }
    });
}

function createNetworkChart(colors, textColor) {
    const ctx = document.getElementById("networkChart").getContext("2d");
    const isLightMode = document.body.classList.contains('light-mode');
    
    // Create gradients
    const uploadGradient = ctx.createLinearGradient(0, 0, 0, 400);
    uploadGradient.addColorStop(0, hexToRGBA(colors.upload, 0.5));
    uploadGradient.addColorStop(1, hexToRGBA(colors.upload, 0.05));
    
    const downloadGradient = ctx.createLinearGradient(0, 0, 0, 400);
    downloadGradient.addColorStop(0, hexToRGBA(colors.download, 0.5));
    downloadGradient.addColorStop(1, hexToRGBA(colors.download, 0.05));
    
    // Set point border color based on theme
    const pointBorderColor = isLightMode ? "#000000" : "#ffffff";
    
    networkChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                { 
                    label: "Upload (MB/s)", 
                    data: [], 
                    borderColor: colors.upload,
                    backgroundColor: uploadGradient,
                    borderWidth: 2,
                    pointBackgroundColor: colors.upload,
                    pointBorderColor: pointBorderColor,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                },
                { 
                    label: "Download (MB/s)", 
                    data: [], 
                    borderColor: colors.download,
                    backgroundColor: downloadGradient,
                    borderWidth: 2,
                    pointBackgroundColor: colors.download,
                    pointBorderColor: pointBorderColor,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animations: {
                tension: {
                    duration: 1000,
                    easing: 'linear'
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: textColor,
                        font: {
                            size: 13,
                            weight: 'bold'
                        },
                        usePointStyle: true,
                        boxWidth: 8,
                        padding: 15
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    displayColors: true,
                    backgroundColor: isLightMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.7)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw.toFixed(3)} MB/s`;
                        }
                    },
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            return value.toFixed(3) + ' MB/s';
                        },
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        padding: 10
                    },
                    grid: {
                        drawBorder: false,
                        color: hexToRGBA(colors.borderColor, 0.7),
                        lineWidth: 0.5
                    },
                    border: {
                        display: false
                    }
                },
                x: {
                    ticks: {
                        color: textColor,
                        maxRotation: 0,
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        padding: 10
                    },
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.4,
                    borderWidth: 2,
                    borderJoinStyle: 'round'
                },
                point: {
                    radius: 3,
                    hoverRadius: 6,
                    borderWidth: 2
                }
            }
        }
    });
}

// Update CPU chart function
function updateCpuChart(timestamps, avgCpuData, perCpuData) {
    // Ensure chart exists
    if (!cpuChart) return;
    
    // Check if we should update per-CPU data
    const usePerCpuData = perCpuData && perCpuData.length > 0 && perCpuData[0].length > 0;
    
    // Get current theme
    const isLightMode = document.body.classList.contains('light-mode');
    const pointBorderColor = isLightMode ? "#000000" : "#ffffff";
    
    // Update labels
    cpuChart.data.labels = timestamps.slice(-MAX_DATA_POINTS);
    
    // --- حفظ وضعیت visibility هسته‌ها ---
    let prevVisibility = {};
    if (usePerCpuData && cpuChart.data.datasets.length > 1) {
        for (let i = 1; i < cpuChart.data.datasets.length; i++) {
            const ds = cpuChart.data.datasets[i];
            prevVisibility[ds.label] = ds.hidden === true;
        }
    }
    // --- پایان حفظ وضعیت ---

    // Handle different dataset counts
    if (usePerCpuData) {
        // If we have per-CPU data, use a dataset for each CPU
        const cpuCount = perCpuData[0].length;
        
        // Only regenerate datasets if the CPU count has changed
        if (cpuChart.data.datasets.length !== cpuCount + 1) {
            const cpuColors = generateCpuColors(cpuCount);
            
            // Create a dataset for each CPU
            cpuChart.data.datasets = Array.from({ length: cpuCount }, (_, i) => ({
                label: `CPU ${i}`,
                data: [],
                borderColor: cpuColors[i],
                backgroundColor: hexToRGBA(cpuColors[i], 0.05),
                borderWidth: 2,
                pointBackgroundColor: cpuColors[i],
                pointBorderColor: pointBorderColor,
                pointRadius: 2,
                pointHoverRadius: 5,
                hidden: false, // Show all CPUs by default
                fill: false
            }));
            
            // Add total CPU usage dataset (always visible)
            cpuChart.data.datasets.unshift({
                label: 'Total CPU',
                data: [],
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(),
                backgroundColor: hexToRGBA(getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(), 0.2),
                borderWidth: 3,
                pointBackgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(),
                pointBorderColor: pointBorderColor,
                pointRadius: 3,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            });
        }
        
        // Update total CPU dataset
        cpuChart.data.datasets[0].data = avgCpuData.slice(-MAX_DATA_POINTS);
        
        // Update per-CPU datasets
        for (let i = 0; i < cpuCount; i++) {
            const cpuData = perCpuData.map(dataPoint => dataPoint[i]);
            cpuChart.data.datasets[i+1].data = cpuData.slice(-MAX_DATA_POINTS);
            // --- بازگردانی وضعیت hidden ---
            const label = `CPU ${i}`;
            if (prevVisibility[label] !== undefined) {
                cpuChart.data.datasets[i+1].hidden = prevVisibility[label];
            }
            // --- پایان بازگردانی ---
        }
    } else {
        // Simple case: just use average CPU usage
        if (cpuChart.data.datasets.length !== 1) {
            cpuChart.data.datasets = [{
                label: 'CPU Usage',
                data: [],
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(),
                backgroundColor: hexToRGBA(getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(), 0.2),
                borderWidth: 3,
                pointBackgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(),
                pointBorderColor: pointBorderColor,
                pointRadius: 3,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }];
        }
        
        cpuChart.data.datasets[0].data = avgCpuData.slice(-MAX_DATA_POINTS);
    }
    
    // Update the chart
    cpuChart.update();
}

// Generate distinct colors for CPU threads
function generateCpuColors(count) {
    const colors = [];
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
    const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim();
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
    const dangerColor = getComputedStyle(document.documentElement).getPropertyValue('--danger-color').trim();
    const purpleColor = getComputedStyle(document.documentElement).getPropertyValue('--purple-color').trim();
    
    // Add base colors
    colors.push(primaryColor);
    colors.push(secondaryColor);
    colors.push(accentColor);
    colors.push(dangerColor);
    colors.push(purpleColor);
    
    // If we need more colors, generate them
    if (count > colors.length) {
        for (let i = colors.length; i < count; i++) {
            // Generate a color based on hue rotation
            const hue = (i * 137.5) % 360; // Golden angle approximation for good distribution
            colors.push(`hsl(${hue}, 70%, 60%)`);
        }
    }
    
    // Return only the number of colors we need
    return colors.slice(0, count);
}

// Update Network chart - New function for script.js
function updateNetworkChart(timestamps, uploadData, downloadData) {
    if (!networkChart) return;
    
    networkChart.data.labels = timestamps;
    networkChart.data.datasets[0].data = uploadData;
    networkChart.data.datasets[1].data = downloadData;
    networkChart.update();
}

// Watch for theme changes and update chart colors
function watchThemeChanges() {
    // Add a MutationObserver to detect when the light-mode class is added or removed
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class') {
                // Get fresh colors based on new theme
                const colors = {
                    cpu: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(),
                    upload: getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim(),
                    download: getComputedStyle(document.documentElement).getPropertyValue('--danger-color').trim(),
                    textColor: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim()
                };
                
                // Check if light mode is active
                const isLightMode = document.body.classList.contains('light-mode');
                
                // Set theme-specific colors
                const textColor = isLightMode ? '#000000' : colors.textColor;
                const pointBorderColor = isLightMode ? '#000000' : '#ffffff';
                
                // Update Chart.js global defaults
                Chart.defaults.color = textColor;
                Chart.defaults.borderColor = colors.borderColor;
                
                // Update CPU chart
                if (cpuChart) {
                    // Update colors
                    cpuChart.options.scales.y.ticks.color = textColor;
                    cpuChart.options.scales.x.ticks.color = textColor;
                    cpuChart.options.plugins.legend.labels.color = textColor;
                    
                    // Update point border colors for all datasets
                    cpuChart.options.elements.point.borderColor = pointBorderColor;
                    cpuChart.data.datasets.forEach(dataset => {
                        dataset.pointBorderColor = pointBorderColor;
                    });
                    
                    // Update background color
                    cpuChart.options.plugins.tooltip.backgroundColor = isLightMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.7)';
                    
                    // Update the chart
                    cpuChart.update();
                }
                
                // Update Network chart
                if (networkChart) {
                    // Update colors
                    networkChart.options.scales.y.ticks.color = textColor;
                    networkChart.options.scales.x.ticks.color = textColor;
                    networkChart.options.plugins.legend.labels.color = textColor;
                    
                    // Update point border colors for all datasets
                    networkChart.data.datasets.forEach(dataset => {
                        dataset.pointBorderColor = pointBorderColor;
                    });
                    
                    // Update background color
                    networkChart.options.plugins.tooltip.backgroundColor = isLightMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.7)';
                    
                    // Update the chart
                    networkChart.update();
                }
            }
        });
    });
    
    // Start observing the body element for class changes
    observer.observe(document.body, { attributes: true });
}

// Helper function to convert hex to rgba for transparency
function hexToRGBA(hex, alpha) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Handle shorthand hex format (e.g., #fff)
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Return rgba value
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}