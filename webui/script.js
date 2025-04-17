document.addEventListener("DOMContentLoaded", function () {
    // Data fetching state
    let isDataFetchingActive = true;
    let dataFetchInterval = null;
    
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
    setInterval(updateTime, 1000);

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
            fetchData();
            dataFetchInterval = setInterval(fetchData, 3000);
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

    // Store historical data for charts
    const historyData = {
        cpu: [],
        upload: [],
        download: [],
        timestamps: [],
        perCpuData: []
    };

    // Sample data for processes (will be replaced with actual API data)
    let processes = [];

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

    async function fetchData() {
        try {
            // Get the dynamic API base URL based on the current window location
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
                fetch(`${baseUrl}/processes`).then(res => res.json()).catch(() => ({ processes: [] }))
            ]);

            // Update CPU data
            document.getElementById("cpu-usage").textContent = cpuData.cpu_percent.toFixed(1);
            document.getElementById("cpu-freq").textContent = formatCpuFreq(cpuData.cpu_freq);
            document.getElementById("cpu-cores").textContent = cpuData.cpu_cores;
            document.getElementById("cpu-threads").textContent = cpuData.cpu_threads;
            
            // Display per-CPU core data
            const perCpuData = cpuData.cpu_percent_per_cpu;
            if (perCpuData && perCpuData.length > 0) {
                updatePerCpuDisplay(perCpuData);
            }
            
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
            
            // Update IOPS data
            document.getElementById("read-iops").textContent = iopsData.read_iops || 0;
            document.getElementById("write-iops").textContent = iopsData.write_iops || 0;
            document.getElementById("total-iops").textContent = iopsData.total_iops || 0;
            
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
                updateProcessesList(processesData.processes);
            } else {
                // If no process data, use sample data for demonstration
                updateProcessesList(getSampleProcesses());
            }
            
            // Update charts with new data
            updateCharts();

        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }
    
    // Function to update all charts
    function updateCharts() {
        // Call chart update functions defined in chart.js
        if (typeof updateCpuChart === 'function') {
            updateCpuChart(historyData.timestamps, historyData.cpu, historyData.perCpuData);
        }
        
        if (typeof updateNetworkChart === 'function') {
            updateNetworkChart(historyData.timestamps, historyData.upload, historyData.download);
        }
    }

    // Function to update the processes list
    function updateProcessesList(processList) {
        processes = processList;
        const currentSortBy = document.getElementById("sort-processes").value;
        sortProcesses(currentSortBy);
    }

    // Function to sort processes by different metrics
    function sortProcesses(sortBy) {
        const processesList = document.getElementById("processes-list");
        
        // Sort the processes based on the selected metric
        let sortedProcesses = [...processes];
        
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
        
        // Take only top 5 processes
        sortedProcesses = sortedProcesses.slice(0, 5);
        
        // Clear the current list
        processesList.innerHTML = '';
        
        // If no processes, show a message
        if (sortedProcesses.length === 0) {
            processesList.innerHTML = '<tr><td colspan="6" class="empty-message">No processes found</td></tr>';
            return;
        }
        
        // Add the sorted processes to the list
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

    // Function to generate sample process data for demonstration
    function getSampleProcesses() {
        return [
            { name: 'chrome.exe', pid: 1234, cpu_percent: 12.3, memory_mb: 256, network_upload: 125, network_download: 345, iops: 23 },
            { name: 'firefox.exe', pid: 2345, cpu_percent: 8.7, memory_mb: 178, network_upload: 85, network_download: 210, iops: 18 },
            { name: 'code.exe', pid: 3456, cpu_percent: 5.2, memory_mb: 135, network_upload: 12, network_download: 34, iops: 8 },
            { name: 'node.exe', pid: 4567, cpu_percent: 3.8, memory_mb: 76, network_upload: 35, network_download: 15, iops: 12 },
            { name: 'spotify.exe', pid: 5678, cpu_percent: 2.4, memory_mb: 180, network_upload: 220, network_download: 180, iops: 5 },
            { name: 'discord.exe', pid: 6789, cpu_percent: 1.9, memory_mb: 145, network_upload: 45, network_download: 65, iops: 4 },
            { name: 'explorer.exe', pid: 7890, cpu_percent: 1.2, memory_mb: 85, network_upload: 5, network_download: 12, iops: 15 }
        ];
    }

    // Function to update per-CPU display
    function updatePerCpuDisplay(perCpuData) {
        const container = document.getElementById('per-cpu-container');
        if (container) {
            container.innerHTML = ''; // Clear existing content
            
            // Display bars for each CPU thread
            perCpuData.forEach((cpuPercent, index) => {
                const cpuItem = document.createElement('div');
                cpuItem.className = 'per-cpu-item';
                
                // CPU thread label
                const cpuLabel = document.createElement('div');
                cpuLabel.className = 'per-cpu-label';
                cpuLabel.textContent = `CPU ${index}`;
                
                // Bar container
                const barContainer = document.createElement('div');
                barContainer.className = 'per-cpu-bar-container';
                
                // Bar representing CPU usage
                const bar = document.createElement('div');
                bar.className = 'per-cpu-bar';
                bar.style.width = `${cpuPercent}%`;
                
                // Value display
                const valueDisplay = document.createElement('div');
                valueDisplay.className = 'per-cpu-value';
                valueDisplay.textContent = `${cpuPercent.toFixed(1)}%`;
                
                // Assemble elements
                barContainer.appendChild(bar);
                cpuItem.appendChild(cpuLabel);
                cpuItem.appendChild(barContainer);
                cpuItem.appendChild(valueDisplay);
                
                container.appendChild(cpuItem);
            });
        }
        
        // Store per-CPU data for charts
        if (!historyData.perCpuData) {
            historyData.perCpuData = [];
        }
        
        // Add this data point
        historyData.perCpuData.push(perCpuData);
        
        // Limit history length to match other data
        const MAX_HISTORY = 30;
        if (historyData.perCpuData.length > MAX_HISTORY) {
            historyData.perCpuData.shift();
        }
        
        // Calculate and update the average CPU usage for the charts
        if (perCpuData.length > 0) {
            const avgCpuUsage = perCpuData.reduce((sum, value) => sum + value, 0) / perCpuData.length;
            historyData.cpu[historyData.cpu.length - 1] = avgCpuUsage;
        }
    }

    // Initialize data
    fetchData();
    
    // Setup data fetch interval
    dataFetchInterval = setInterval(fetchData, 3000);

    // Set up process sort control
    const sortProcessesSelect = document.getElementById("sort-processes");
    sortProcessesSelect.addEventListener("change", function() {
        sortProcesses(this.value);
    });

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
