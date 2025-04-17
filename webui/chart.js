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
                    borderWidth: 2
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
                    pointBorderColor: "#fff",
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
                    pointBorderColor: "#fff",
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
    if (!cpuChart) return;
    
    // Update timestamps
    cpuChart.data.labels = timestamps;
    
    // If perCpuData is provided and has data
    if (perCpuData && perCpuData.length > 0) {
        // Check if we need to create datasets for per-CPU data
        if (cpuChart.data.datasets.length !== perCpuData[0].length) {
            // Generate colors for each CPU thread
            const cpuColors = generateCpuColors(perCpuData[0].length);
            
            // Clear existing datasets
            cpuChart.data.datasets = [];
            
            // Create a dataset for each CPU thread
            for (let i = 0; i < perCpuData[0].length; i++) {
                cpuChart.data.datasets.push({
                    label: `CPU ${i}`,
                    data: [],
                    borderColor: cpuColors[i],
                    backgroundColor: hexToRGBA(cpuColors[i], 0.05),
                    borderWidth: 2,
                    pointBackgroundColor: cpuColors[i],
                    pointBorderColor: "#fff",
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    fill: false,
                    tension: 0.4
                });
            }
        }
        
        // Update data for each CPU thread
        for (let i = 0; i < cpuChart.data.datasets.length; i++) {
            // Extract data for this CPU thread from all data points
            cpuChart.data.datasets[i].data = perCpuData.map(dataPoint => dataPoint[i]);
        }
    } else if (avgCpuData && (cpuChart.data.datasets.length === 0 || cpuChart.data.datasets[0].label === "Average CPU Usage (%)")) {
        // Get context to create gradient
        const ctx = document.getElementById("cpuChart").getContext("2d");
        const cpuColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        
        // Create gradient
        const gradientFill = ctx.createLinearGradient(0, 0, 0, 400);
        gradientFill.addColorStop(0, hexToRGBA(cpuColor, 0.5));
        gradientFill.addColorStop(1, hexToRGBA(cpuColor, 0.05));
        
        cpuChart.data.datasets = [{
            label: "CPU Usage (%)",
            data: avgCpuData,
            borderColor: cpuColor,
            backgroundColor: gradientFill,
            borderWidth: 2.5,
            pointBackgroundColor: cpuColor,
            pointBorderColor: "#fff",
            pointRadius: 3,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.4
        }];
    }
    
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
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === "class") {
                // Get updated colors
                const chartColors = {
                    cpu: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim(),
                    upload: getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim(),
                    download: getComputedStyle(document.documentElement).getPropertyValue('--danger-color').trim(),
                    textColor: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim()
                };
                
                const isLightMode = document.body.classList.contains('light-mode');
                
                // Set text color to black when in light mode
                const textColor = isLightMode ? '#000000' : chartColors.textColor;
                
                // Update global defaults
                Chart.defaults.color = textColor;
                Chart.defaults.borderColor = chartColors.borderColor;
                
                // Update specific chart colors
                if (cpuChart) {
                    // Update all CPU datasets
                    for (let i = 0; i < cpuChart.data.datasets.length; i++) {
                        const dataset = cpuChart.data.datasets[i];
                        
                        // First dataset or if there's only one, use primary color
                        // Otherwise, regenerate colors
                        if (i === 0 && cpuChart.data.datasets.length === 1) {
                            dataset.borderColor = chartColors.cpu;
                            dataset.backgroundColor = hexToRGBA(chartColors.cpu, 0.1);
                            dataset.pointBackgroundColor = chartColors.cpu;
                        } else if (cpuChart.data.datasets.length > 1) {
                            // Use new colors based on current theme
                            const cpuColors = generateCpuColors(cpuChart.data.datasets.length);
                            dataset.borderColor = cpuColors[i];
                            dataset.backgroundColor = hexToRGBA(cpuColors[i], 0.05);
                            dataset.pointBackgroundColor = cpuColors[i];
                        }
                    }
                    
                    // Update scales and legend colors to black in light mode
                    cpuChart.options.scales.y.ticks.color = textColor;
                    cpuChart.options.scales.x.ticks.color = textColor;
                    cpuChart.options.scales.y.grid.color = chartColors.borderColor;
                    cpuChart.options.plugins.legend.labels.color = textColor;
                    
                    // Update tooltip colors
                    cpuChart.options.plugins.tooltip.backgroundColor = isLightMode ? 
                        'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.7)';
                    
                    cpuChart.update();
                }
                
                if (networkChart) {
                    networkChart.data.datasets[0].borderColor = chartColors.upload;
                    networkChart.data.datasets[0].backgroundColor = hexToRGBA(chartColors.upload, 0.1);
                    networkChart.data.datasets[0].pointBackgroundColor = chartColors.upload;
                    
                    networkChart.data.datasets[1].borderColor = chartColors.download;
                    networkChart.data.datasets[1].backgroundColor = hexToRGBA(chartColors.download, 0.1);
                    networkChart.data.datasets[1].pointBackgroundColor = chartColors.download;
                    
                    // Update scales and legend colors to black in light mode
                    networkChart.options.scales.y.ticks.color = textColor;
                    networkChart.options.scales.x.ticks.color = textColor;
                    networkChart.options.scales.y.grid.color = chartColors.borderColor;
                    networkChart.options.plugins.legend.labels.color = textColor;
                    
                    // Update tooltip colors
                    networkChart.options.plugins.tooltip.backgroundColor = isLightMode ? 
                        'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.7)';
                    
                    networkChart.update();
                }
            }
        });
    });
    
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