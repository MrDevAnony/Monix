document.addEventListener("DOMContentLoaded", function () {
    // Data fetching state
    let isDataFetchingActive = true;
    let dataFetchInterval = null; // Single interval for all data
    let refreshRate = 5000; // Default 5 second refresh rate
    
    // Theme toggle functionality
    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = themeToggle.querySelector("i");
    const themeText = themeToggle.querySelector("span");
    
    themeToggle.addEventListener("click", function () {
        document.body.classList.toggle("light-mode");
        if (document.body.classList.contains("light-mode")) {
            themeIcon.classList.remove("fa-moon");
            themeIcon.classList.add("fa-sun");
            themeText.textContent = "Light Mode";
        } else {
            themeIcon.classList.remove("fa-sun");
            themeIcon.classList.add("fa-moon");
            themeText.textContent = "Dark Mode";
        }
    });

    // Current time update
    function updateTime() {
        const now = new Date();
        document.getElementById("current-time").textContent = now.toLocaleTimeString();
    }
    updateTime();
    setInterval(updateTime, 5000);

    // Data fetching toggle
    const dataToggle = document.getElementById("data-toggle");
    const dataIcon = dataToggle.querySelector("i");
    const dataText = dataToggle.querySelector("span");
    
    dataToggle.addEventListener("click", function() {
        isDataFetchingActive = !isDataFetchingActive;
        
        if (isDataFetchingActive) {
            // Resume data fetching
            dataIcon.classList.remove("fa-play");
            dataIcon.classList.add("fa-pause");
            dataText.textContent = "Pause Updates";
            dataToggle.classList.remove("paused");
            
            // Fetch immediately and then set interval
            fetchAllData();
            dataFetchInterval = setInterval(fetchAllData, refreshRate);
        } else {
            // Pause data fetching
            dataIcon.classList.remove("fa-pause");
            dataIcon.classList.add("fa-play");
            dataText.textContent = "Resume Updates";
            dataToggle.classList.add("paused");
            
            // Clear the interval
            clearInterval(dataFetchInterval);
        }
    });

    // Custom dropdown for refresh rate
    const refreshSelector = document.getElementById("refresh-selector");
    const refreshSelectedValue = refreshSelector.querySelector(".selected-value");
    const refreshDropdown = refreshSelector.querySelector(".custom-dropdown");
    const refreshItems = refreshSelector.querySelectorAll(".dropdown-item");
    const refreshIcon = refreshSelector.querySelector(".fa-sync-alt");
    
    // Toggle refresh dropdown
    refreshSelector.addEventListener("click", function(e) {
        e.stopPropagation();
        refreshSelector.classList.toggle("active");
        refreshDropdown.classList.toggle("active");
        
        // Close other dropdowns
        sortSelector.classList.remove("active");
        sortDropdown.classList.remove("active");
    });
    
    // Handle refresh rate selection
    refreshItems.forEach(item => {
        // Mark the default selected item (5s)
        if (item.getAttribute("data-value") === "5") {
            item.classList.add("active");
        }
        
        item.addEventListener("click", function(e) {
            e.stopPropagation();
            
            // Add ripple effect
            const ripple = document.createElement("span");
            ripple.classList.add("ripple");
            const rect = item.getBoundingClientRect();
            ripple.style.left = `${e.clientX - rect.left}px`;
            ripple.style.top = `${e.clientY - rect.top}px`;
            item.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
            
            // Get the selected refresh rate in seconds
            const selectedRate = parseInt(this.getAttribute("data-value"));
            
            // Update selected value display
            refreshSelectedValue.textContent = this.textContent;
            
            // Update active state
            refreshItems.forEach(i => i.classList.remove("active"));
            this.classList.add("active");
            
            // Convert to milliseconds
            refreshRate = selectedRate * 1000;
            
            // If data fetching is active, restart the interval with the new rate
            if (isDataFetchingActive) {
                clearInterval(dataFetchInterval);
                dataFetchInterval = setInterval(fetchAllData, refreshRate);
                
                // Add rotating animation to refresh icon
                refreshIcon.classList.add("rotating");
                
                // Remove the class after animation completes
                setTimeout(() => {
                    refreshIcon.classList.remove("rotating");
                }, 1000);
                
                // Create a tooltip to show the new refresh rate
                const tooltip = document.createElement('div');
                tooltip.className = 'refresh-tooltip';
                tooltip.textContent = `Refresh rate: ${selectedRate}s`;
                document.body.appendChild(tooltip);
                
                // Show tooltip for 2 seconds
                setTimeout(() => {
                    tooltip.remove();
                }, 2000);
            }
            
            // Close the dropdown
            refreshSelector.classList.remove("active");
            refreshDropdown.classList.remove("active");
        });
    });
    
    // Custom dropdown for sort control
    const sortSelector = document.getElementById("sort-selector");
    const sortSelectedValue = sortSelector.querySelector(".selected-value");
    const sortDropdown = sortSelector.querySelector(".custom-dropdown");
    const sortItems = sortSelector.querySelectorAll(".dropdown-item");
    
    // Toggle sort dropdown
    sortSelector.addEventListener("click", function(e) {
        e.stopPropagation();
        sortSelector.classList.toggle("active");
        sortDropdown.classList.toggle("active");
        
        // Close other dropdowns
        refreshSelector.classList.remove("active");
        refreshDropdown.classList.remove("active");
    });
    
    // Handle sort selection
    sortItems.forEach(item => {
        // Mark the default selected item (CPU)
        if (item.getAttribute("data-value") === "cpu") {
            item.classList.add("active");
        }
        
        item.addEventListener("click", function(e) {
            e.stopPropagation();
            
            // Add ripple effect
            const ripple = document.createElement("span");
            ripple.classList.add("ripple");
            const rect = item.getBoundingClientRect();
            ripple.style.left = `${e.clientX - rect.left}px`;
            ripple.style.top = `${e.clientY - rect.top}px`;
            item.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
            
            // Get the selected sort value
            const sortValue = this.getAttribute("data-value");
            
            // Update selected value display
            sortSelectedValue.textContent = this.textContent;
            
            // Update active state
            sortItems.forEach(i => i.classList.remove("active"));
            this.classList.add("active");
            
            // Sort the processes
            sortProcesses(sortValue);
            
            // Close the dropdown
            sortSelector.classList.remove("active");
            sortDropdown.classList.remove("active");
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener("click", function() {
        refreshSelector.classList.remove("active");
        refreshDropdown.classList.remove("active");
        sortSelector.classList.remove("active");
        sortDropdown.classList.remove("active");
    });

    // Store historical data for charts
    const historyData = {
        cpu: [],
        upload: [],
        download: [],
        timestamps: []
    };

    // Cache for data
    const dataCache = {
        processes: [],
        lastProcessUpdate: 0
    };

    // Get the base URL from the current window location instead of hardcoding
    function getApiBaseUrl() {
        const currentLocation = window.location;
        
        // Use the same host and port that the user is accessing the UI through
        // This ensures we're using the IP and port they configured
        const host = currentLocation.hostname;
        const port = currentLocation.port;
        const protocol = currentLocation.protocol;
        
        // Return the API base URL with the same host and port as the current window
        return `${protocol}//${host}:${port}/api`;
    }

    // --- UX/Accessibility/Loading/Error Enhancements ---
    const statusBar = document.getElementById("global-status-bar");
    let isOffline = false;

    function showStatusBar(message, type = "error", timeout = 0) {
        statusBar.textContent = message;
        statusBar.className = `status-bar ${type}`;
        statusBar.style.display = "block";
        if (timeout > 0) {
            setTimeout(() => {
                statusBar.style.display = "none";
            }, timeout);
        }
    }
    function hideStatusBar() {
        statusBar.style.display = "none";
    }

    // Accessibility: keyboard navigation for dropdowns
    document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
        dropdown.setAttribute('tabindex', '0');
        dropdown.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                this.classList.remove('active');
            }
        });
    });

    // Handle offline/online events
    window.addEventListener('offline', () => {
        isOffline = true;
        showStatusBar('You are offline. Trying to reconnect...', 'offline');
    });
    window.addEventListener('online', () => {
        isOffline = false;
        showStatusBar('Back online! Reconnecting...', 'success', 2000);
        fetchAllData();
    });

    // Clean up intervals and listeners on page unload
    window.addEventListener('beforeunload', () => {
        if (dataFetchInterval) clearInterval(dataFetchInterval);
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && dataFetchInterval) {
            clearInterval(dataFetchInterval);
        } else if (!document.hidden && isDataFetchingActive) {
            fetchAllData();
            dataFetchInterval = setInterval(fetchAllData, refreshRate);
        }
    });

    // --- END ENHANCEMENTS ---

    // Combined function to fetch all data in a single interval
    async function fetchAllData() {
        if (isOffline) {
            showStatusBar('You are offline. Waiting for connection...', 'offline');
            return;
        }
        try {
            const baseUrl = getApiBaseUrl();
            
            // Fetch all data in parallel
            const [cpuData, memoryData, diskData, networkData, ipData, connectionsData, uptimeData, iopsData, processesData] = await Promise.all([
                fetch(`${baseUrl}/cpu`).then(res => res.json()),
                fetch(`${baseUrl}/memory`).then(res => res.json()),
                fetch(`${baseUrl}/disk`).then(res => res.json()),
                fetch(`${baseUrl}/network`).then(res => res.json()),
                fetch(`${baseUrl}/ip`).then(res => res.json()),
                fetch(`${baseUrl}/connections`).then(res => res.json()),
                fetch(`${baseUrl}/uptime`).then(res => res.json()),
                fetch(`${baseUrl}/iops`).then(res => res.json()).catch(() => ({ read_iops: 0, write_iops: 0, total_iops: 0 })),
                fetch(`${baseUrl}/processes?limit=3`).then(res => res.json()).catch(() => ({ processes: [] }))
            ]);

            // Update CPU data
            document.getElementById("cpu-usage").textContent = cpuData.cpu_percent.toFixed(1);
            document.getElementById("cpu-freq").textContent = formatCpuFreq(cpuData.cpu_freq);
            document.getElementById("cpu-cores").textContent = cpuData.cpu_cores;
            document.getElementById("cpu-threads").textContent = cpuData.cpu_threads;
            
            // Update RAM data
            document.getElementById("ram-usage").textContent = memoryData.memory_percent.toFixed(1);
            
            // Format memory values with appropriate units and 3 decimal places
            if (memoryData.total_memory_GB >= 1) {
                document.getElementById("ram-total").textContent = formatSize(memoryData.total_memory_GB, "GB");
            } else {
                document.getElementById("ram-total").textContent = formatSize(memoryData.total_memory_MB, "MB");
            }
            
            if (memoryData.used_memory_GB >= 1) {
                document.getElementById("ram-used").textContent = formatSize(memoryData.used_memory_GB, "GB");
            } else {
                document.getElementById("ram-used").textContent = formatSize(memoryData.used_memory_MB, "MB");
            }
            
            if (memoryData.available_memory_GB >= 1) {
                document.getElementById("ram-free").textContent = formatSize(memoryData.available_memory_GB, "GB");
            } else {
                document.getElementById("ram-free").textContent = formatSize(memoryData.available_memory_MB, "MB");
            }
            
            // Update Disk data
            document.getElementById("disk-usage").textContent = diskData.disk_percent.toFixed(1);
            
            // Format disk values without parentheses and with 3 decimal places
            if (diskData.total_disk) {
                const totalSize = parseFloat(diskData.total_disk);
                const usedSize = parseFloat(diskData.used_disk);
                const freeSize = parseFloat(diskData.free_disk);
                
                // Check if the values include units
                if (diskData.total_disk_formatted) {
                    // Extract value and unit from formatted string
                    const totalMatch = diskData.total_disk_formatted.match(/(\d+\.?\d*)\s*([A-Za-z]+)/);
                    const usedMatch = diskData.used_disk_formatted.match(/(\d+\.?\d*)\s*([A-Za-z]+)/);
                    const freeMatch = diskData.free_disk_formatted.match(/(\d+\.?\d*)\s*([A-Za-z]+)/);
                    
                    if (totalMatch) {
                        document.getElementById("disk-total").textContent = parseFloat(totalMatch[1]).toFixed(3) + " " + totalMatch[2];
                    } else {
                        document.getElementById("disk-total").textContent = formatSize(totalSize, "GB");
                    }
                    
                    if (usedMatch) {
                        document.getElementById("disk-used").textContent = parseFloat(usedMatch[1]).toFixed(3) + " " + usedMatch[2];
                    } else {
                        document.getElementById("disk-used").textContent = formatSize(usedSize, "GB");
                    }
                    
                    if (freeMatch) {
                        document.getElementById("disk-free").textContent = parseFloat(freeMatch[1]).toFixed(3) + " " + freeMatch[2];
                    } else {
                        document.getElementById("disk-free").textContent = formatSize(freeSize, "GB");
                    }
                } else {
                    // If no formatted values, use our own formatting
                    document.getElementById("disk-total").textContent = formatSize(totalSize, "GB");
                    document.getElementById("disk-used").textContent = formatSize(usedSize, "GB");
                    document.getElementById("disk-free").textContent = formatSize(freeSize, "GB");
                }
            }
            
            // Update Network data
            document.getElementById("upload-speed").textContent = networkData.upload_speed_formatted;
            document.getElementById("download-speed").textContent = networkData.download_speed_formatted;
            document.getElementById("total-upload").textContent = networkData.total_sent_formatted;
            document.getElementById("total-download").textContent = networkData.total_recv_formatted;
            
            // Update Connections
            if (connectionsData) {
                const tcpConnections = connectionsData.tcp_connections;
                const udpConnections = connectionsData.udp_connections;
                
                document.getElementById("tcp-count").textContent = tcpConnections || "0";
                document.getElementById("udp-count").textContent = udpConnections || "0";
            }
            
            // Update IOPS data to show as bytes per second in appropriate units
            const readIops = formatByteRate(iopsData.read_iops || 0);
            const writeIops = formatByteRate(iopsData.write_iops || 0);
            const totalIops = formatByteRate(iopsData.total_iops || 0);
            
            document.getElementById("read-iops").textContent = readIops;
            document.getElementById("write-iops").textContent = writeIops;
            document.getElementById("total-iops").textContent = totalIops;
            
            // Update IP data
            document.getElementById("hostname").textContent = ipData.hostname;
            document.getElementById("ipv4").textContent = ipData.ipv4;
            document.getElementById("ipv6").textContent = ipData.ipv6;
            
            // Update Uptime
            document.getElementById("uptime-formatted").textContent = uptimeData.uptime_formatted;
            document.getElementById("uptime-days").textContent = uptimeData.uptime_days;
            document.getElementById("uptime-hours").textContent = uptimeData.uptime_hours;
            document.getElementById("uptime-minutes").textContent = uptimeData.uptime_minutes;
            
            // Add data to history for charts
            const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            historyData.timestamps.push(currentTime);
            historyData.cpu.push(cpuData.cpu_percent);
            historyData.upload.push(networkData.upload_speed_MB);
            historyData.download.push(networkData.download_speed_MB);
            
            // Limit history length to avoid memory issues
            const MAX_HISTORY = 30;
            if (historyData.timestamps.length > MAX_HISTORY) {
                historyData.timestamps.shift();
                historyData.cpu.shift();
                historyData.upload.shift();
                historyData.download.shift();
            }
            
            // Update processes data if available
            if (processesData && processesData.processes) {
                // Completely replace previous data with only the top 3 from API
                dataCache.processes = []; // Clear previous data
                dataCache.processes = processesData.processes.slice(0, 3); // Ensure only 3 processes max
                updateProcessesList(dataCache.processes);
            } else {
                // If no processes data and process list exists, show empty state
                dataCache.processes = []; // Clear any cached data
                const processesList = document.getElementById("processes-list");
                if (processesList) {
                    processesList.innerHTML = '<tr><td colspan="6" class="empty-message">No processes data available</td></tr>';
                }
            }
            
            // Update charts with new data
            updateCharts();
            hideStatusBar();
        } catch (error) {
            showStatusBar('Error fetching data from server. Please check your connection.', 'error');
            console.error("Error fetching data:", error);
            
            // Clear any cached data on error
            dataCache.processes = [];
            
            // Show error in processes list if it exists
            const processesList = document.getElementById("processes-list");
            if (processesList) {
                processesList.innerHTML = '<tr><td colspan="6" class="empty-message">Error fetching process data</td></tr>';
            }
        }
    }
    
    // Function to update all charts
    function updateCharts() {
        // Call chart update functions defined in chart.js
        if (typeof updateCpuChart === 'function') {
            updateCpuChart(historyData.timestamps, historyData.cpu);
        }
        
        if (typeof updateNetworkChart === 'function') {
            updateNetworkChart(historyData.timestamps, historyData.upload, historyData.download);
        }
    }

    // Format CPU frequency to GHz if needed with 3 decimal places
    function formatCpuFreq(freq) {
        if (!freq) return "N/A";
        
        // If it's already in MHz format
        if (typeof freq === 'string' && freq.includes("MHz")) {
            const mhzValue = parseFloat(freq);
            if (isNaN(mhzValue)) return freq;
            
            // Convert to GHz if over 1000 MHz
            if (mhzValue >= 1000) {
                return (mhzValue / 1000).toFixed(3) + " GHz";
            }
            
            return mhzValue.toFixed(3) + " MHz";
        }
        
        // If it's a numeric value (not already formatted), convert directly
        if (!isNaN(parseFloat(freq))) {
            const freqValue = parseFloat(freq);
            if (freqValue >= 1000) {
                return (freqValue / 1000).toFixed(3) + " GHz";
            }
            return freqValue.toFixed(3) + " MHz";
        }
        
        return freq;
    }

    // Format size with 3 decimal places
    function formatSize(size, unit) {
        if (typeof size !== 'number') {
            // Try to parse it as a number if it's a string
            const parsedSize = parseFloat(size);
            if (!isNaN(parsedSize)) {
                return parsedSize.toFixed(3) + " " + unit;
            }
            return size;
        }
        return size.toFixed(3) + " " + unit;
    }

    // Function to update the processes list
    function updateProcessesList(processList) {
        dataCache.processes = processList;
        // Get the current sort option from the active dropdown item
        const activeSort = document.querySelector('#sort-selector .dropdown-item.active');
        const currentSortBy = activeSort ? activeSort.getAttribute('data-value') : 'cpu';
        sortProcesses(currentSortBy);
    }

    // Function to sort processes by different metrics
    function sortProcesses(sortBy) {
        const processesList = document.getElementById("processes-list");
        
        // Use the cached processes data
        let sortedProcesses = [...dataCache.processes];
        
        switch(sortBy) {
            case 'cpu':
                sortedProcesses.sort((a, b) => b.cpu_percent - a.cpu_percent);
                break;
            case 'ram':
                sortedProcesses.sort((a, b) => b.memory_percent - a.memory_percent);
                break;
            case 'network':
                sortedProcesses.sort((a, b) => (b.network_upload + b.network_download) - (a.network_upload + a.network_download));
                break;
            case 'iops':
                sortedProcesses.sort((a, b) => b.iops - a.iops);
                break;
        }
        
        // Clear the current list
        processesList.innerHTML = '';
        
        // If no processes, show a message
        if (sortedProcesses.length === 0) {
            processesList.innerHTML = '<tr><td colspan="6" class="empty-message">No processes found</td></tr>';
            return;
        }
        
        // Display the processes (already limited to 3 by the API call with limit=3)
        sortedProcesses.forEach(process => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${process.name}</td>
                <td>${process.pid}</td>
                <td>${process.cpu_percent.toFixed(1)}%</td>
                <td>${formatMemoryForProcess(process.memory_mb)}</td>
                <td>${formatNetworkForProcess(process.network_upload, process.network_download)}</td>
                <td>${process.iops || 0}</td>
            `;
            
            processesList.appendChild(row);
        });
    }

    // Helper function to format memory value for display
    function formatMemoryForProcess(memoryMB) {
        if (memoryMB >= 1024) {
            return (memoryMB / 1024).toFixed(2) + ' GB';
        }
        return memoryMB.toFixed(2) + ' MB';
    }

    // Helper function to format network values for display
    function formatNetworkForProcess(upload, download) {
        const total = upload + download;
        if (total >= 1024 * 1024) {
            return (total / (1024 * 1024)).toFixed(2) + ' GB/s';
        } else if (total >= 1024) {
            return (total / 1024).toFixed(2) + ' MB/s';
        }
        return total.toFixed(2) + ' KB/s';
    }

    // Format byte rate to appropriate units
    function formatByteRate(bytes) {
        if (bytes === 0) return '0 B/s';
        const units = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
    }

    // Initialize data
    fetchAllData();
    
    // Setup data fetch interval with the default refresh rate
    dataFetchInterval = setInterval(fetchAllData, refreshRate);

    // Add CSS for rotating animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes rotating {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .rotating {
            animation: rotating 1s linear;
        }
    `;
    document.head.appendChild(style);
});
