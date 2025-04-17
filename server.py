from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import psutil
import socket
import time
import uvicorn
from pathlib import Path
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich import prompt

# Set up colorful console output
console = Console()

app = FastAPI(title="Monix System Monitor")

# CORS middleware to allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache some data to avoid frequent readings
cache = {
    "last_update": 0,
    "data": {}
}

CACHE_DURATION = 1  # seconds

def get_cached_data(key, func, *args, **kwargs):
    current_time = time.time()
    if current_time - cache["last_update"] > CACHE_DURATION or key not in cache["data"]:
        cache["data"][key] = func(*args, **kwargs)
        cache["last_update"] = current_time
    return cache["data"][key]

# Try to find the frontend directory
def find_frontend_dir():
    # Check common frontend directories relative to this file
    current_dir = Path(__file__).parent.absolute()
    
    # Common frontend directories
    frontend_dirs = [
        current_dir / "webui"
    ]
    
    for frontend_dir in frontend_dirs:
        if frontend_dir.exists() and frontend_dir.is_dir():
            console.print(f"[green]Found frontend at: {frontend_dir}[/green]")
            return str(frontend_dir)
    
    console.print("[yellow]Frontend directory not found. Only API will be available.[/yellow]")
    return None

@app.get("/")
async def root():
    # Redirect to frontend if we're serving static files
    if hasattr(app, "frontend_mounted"):
        return RedirectResponse(url="/ui/")
    return {"message": "Monix Backend API is running"}

@app.get("/api")
async def api_info():
    return {"message": "Monix API is running", "version": "1.0.0"}

@app.get("/api/cpu")
async def get_cpu_info():
    # Get overall CPU utilization (not per-core)
    # Use interval=0.5 for more accurate reading but faster response
    cpu_percent = psutil.cpu_percent(interval=0.5, percpu=False)
    
    # Also get per-CPU utilization for additional info if needed
    cpu_percent_per_cpu = psutil.cpu_percent(interval=0, percpu=True)
    
    # Get CPU frequency
    cpu_freq = psutil.cpu_freq()
    cpu_freq_str = f"{cpu_freq.current:.2f} MHz" if cpu_freq else "N/A"
    
    return {
        "cpu_percent": cpu_percent,
        "cpu_percent_per_cpu": cpu_percent_per_cpu,
        "cpu_freq": cpu_freq_str,
        "cpu_cores": psutil.cpu_count(logical=False),
        "cpu_threads": psutil.cpu_count(logical=True)
    }

@app.get("/api/memory")
async def get_memory_info():
    memory = psutil.virtual_memory()
    
    # Convert to GB and MB
    total_gb = memory.total / (1024**3)
    used_gb = memory.used / (1024**3)
    available_gb = memory.available / (1024**3)
    
    total_mb = memory.total / (1024**2)
    used_mb = memory.used / (1024**2)
    available_mb = memory.available / (1024**2)
    
    return {
        "memory_percent": memory.percent,
        "total_memory_GB": total_gb,
        "used_memory_GB": used_gb,
        "available_memory_GB": available_gb,
        "total_memory_MB": total_mb,
        "used_memory_MB": used_mb,
        "available_memory_MB": available_mb
    }

@app.get("/api/disk")
async def get_disk_info():
    disk = psutil.disk_usage('/')
    
    # Format as strings with units
    total_formatted = f"{disk.total / (1024**3):.3f} GB"
    used_formatted = f"{disk.used / (1024**3):.3f} GB"
    free_formatted = f"{disk.free / (1024**3):.3f} GB"
    
    return {
        "disk_percent": disk.percent,
        "total_disk": disk.total,
        "used_disk": disk.used,
        "free_disk": disk.free,
        "total_disk_formatted": total_formatted,
        "used_disk_formatted": used_formatted,
        "free_disk_formatted": free_formatted
    }

@app.get("/api/network")
async def get_network_info():
    net_io = psutil.net_io_counters()
    
    # Calculate upload and download speeds
    if not hasattr(get_network_info, "last_bytes_sent"):
        get_network_info.last_bytes_sent = net_io.bytes_sent
        get_network_info.last_bytes_recv = net_io.bytes_recv
        get_network_info.last_time = time.time()
        upload_speed = 0
        download_speed = 0
    else:
        now = time.time()
        time_elapsed = now - get_network_info.last_time
        
        upload_speed = (net_io.bytes_sent - get_network_info.last_bytes_sent) / time_elapsed
        download_speed = (net_io.bytes_recv - get_network_info.last_bytes_recv) / time_elapsed
        
        get_network_info.last_bytes_sent = net_io.bytes_sent
        get_network_info.last_bytes_recv = net_io.bytes_recv
        get_network_info.last_time = now
    
    # Convert to MB/s
    upload_speed_MB = upload_speed / (1024**2)
    download_speed_MB = download_speed / (1024**2)
    
    # Format total sent/received
    total_sent = net_io.bytes_sent
    total_recv = net_io.bytes_recv
    
    if total_sent < 1024:
        total_sent_formatted = f"{total_sent} B"
    elif total_sent < 1024**2:
        total_sent_formatted = f"{total_sent/1024:.2f} KB"
    elif total_sent < 1024**3:
        total_sent_formatted = f"{total_sent/(1024**2):.2f} MB"
    else:
        total_sent_formatted = f"{total_sent/(1024**3):.2f} GB"
    
    if total_recv < 1024:
        total_recv_formatted = f"{total_recv} B"
    elif total_recv < 1024**2:
        total_recv_formatted = f"{total_recv/1024:.2f} KB"
    elif total_recv < 1024**3:
        total_recv_formatted = f"{total_recv/(1024**2):.2f} MB"
    else:
        total_recv_formatted = f"{total_recv/(1024**3):.2f} GB"
    
    # Format upload/download speeds
    if upload_speed < 1024:
        upload_speed_formatted = f"{upload_speed:.2f} B/s"
    elif upload_speed < 1024**2:
        upload_speed_formatted = f"{upload_speed/1024:.2f} KB/s"
    elif upload_speed < 1024**3:
        upload_speed_formatted = f"{upload_speed/(1024**2):.2f} MB/s"
    else:
        upload_speed_formatted = f"{upload_speed/(1024**3):.2f} GB/s"
    
    if download_speed < 1024:
        download_speed_formatted = f"{download_speed:.2f} B/s"
    elif download_speed < 1024**2:
        download_speed_formatted = f"{download_speed/1024:.2f} KB/s"
    elif download_speed < 1024**3:
        download_speed_formatted = f"{download_speed/(1024**2):.2f} MB/s"
    else:
        download_speed_formatted = f"{download_speed/(1024**3):.2f} GB/s"
    
    return {
        "upload_speed": upload_speed,
        "download_speed": download_speed,
        "upload_speed_MB": upload_speed_MB,
        "download_speed_MB": download_speed_MB,
        "upload_speed_formatted": upload_speed_formatted,
        "download_speed_formatted": download_speed_formatted,
        "total_sent": total_sent,
        "total_recv": total_recv,
        "total_sent_formatted": total_sent_formatted,
        "total_recv_formatted": total_recv_formatted
    }

@app.get("/api/ip")
async def get_ip_info():
    hostname = socket.gethostname()
    
    # Try to get IPv4 address
    try:
        ipv4 = socket.gethostbyname(hostname)
    except:
        ipv4 = "Not available"
    
    # Try to get IPv6 address
    ipv6 = "Not available"
    try:
        addrinfo = socket.getaddrinfo(hostname, None)
        for addr in addrinfo:
            if addr[0] == socket.AF_INET6:
                ipv6 = addr[4][0]
                break
    except:
        pass
    
    return {
        "hostname": hostname,
        "ipv4": ipv4,
        "ipv6": ipv6
    }

@app.get("/api/connections")
async def get_connections():
    connections = psutil.net_connections()
    tcp_count = sum(1 for conn in connections if conn.type == socket.SOCK_STREAM)
    udp_count = sum(1 for conn in connections if conn.type == socket.SOCK_DGRAM)
    
    return {
        "total_connections": len(connections),
        "tcp_connections": tcp_count,
        "udp_connections": udp_count
    }

@app.get("/api/uptime")
async def get_uptime():
    uptime_seconds = time.time() - psutil.boot_time()
    
    days = int(uptime_seconds // (24 * 3600))
    uptime_seconds %= (24 * 3600)
    hours = int(uptime_seconds // 3600)
    uptime_seconds %= 3600
    minutes = int(uptime_seconds // 60)
    
    uptime_formatted = f"{days}d {hours}h {minutes}m"
    
    return {
        "uptime_seconds": int(time.time() - psutil.boot_time()),
        "uptime_formatted": uptime_formatted,
        "uptime_days": days,
        "uptime_hours": hours,
        "uptime_minutes": minutes
    }

@app.get("/api/iops")
async def get_iops():
    try:
        # Try to get disk I/O counters with more specific disk targeting if available
        try:
            # Try to get disk I/O counters for all disks
            disk_io_all = psutil.disk_io_counters(perdisk=True)
            # Use the first physical disk (usually the main one), filtering out virtual disks
            # This logic might need adjustments based on system
            physical_disks = [disk for disk in disk_io_all.keys() if not disk.startswith(('loop', 'ram', 'dm-'))]
            if physical_disks:
                disk_io = disk_io_all[physical_disks[0]]
            else:
                disk_io = psutil.disk_io_counters()
        except:
            # Fallback to total disk I/O counters
            disk_io = psutil.disk_io_counters()
        
        # Calculate IOPS based on read/write counts
        if not hasattr(get_iops, "last_read_count"):
            get_iops.last_read_count = disk_io.read_count
            get_iops.last_write_count = disk_io.write_count
            get_iops.last_time = time.time()
            read_iops = 0
            write_iops = 0
        else:
            now = time.time()
            time_elapsed = now - get_iops.last_time
            
            # Ensure we have a reasonable time elapsed to avoid division by very small numbers
            if time_elapsed > 0.1:
                read_iops = int((disk_io.read_count - get_iops.last_read_count) / time_elapsed)
                write_iops = int((disk_io.write_count - get_iops.last_write_count) / time_elapsed)
                
                get_iops.last_read_count = disk_io.read_count
                get_iops.last_write_count = disk_io.write_count
                get_iops.last_time = now
            else:
                # Not enough time has passed, use previous values or zeros
                read_iops = getattr(get_iops, "last_read_iops", 0)
                write_iops = getattr(get_iops, "last_write_iops", 0)
        
        # Store the current IOPS values for potential reuse
        get_iops.last_read_iops = read_iops
        get_iops.last_write_iops = write_iops
        
        return {
            "read_iops": read_iops,
            "write_iops": write_iops,
            "total_iops": read_iops + write_iops
        }
    except Exception as e:
        # Return zeros and log the error if there's any issue
        console.print(f"[red]Error getting IOPS: {e}[/red]")
        return {
            "read_iops": 0,
            "write_iops": 0,
            "total_iops": 0
        }

@app.get("/api/processes")
async def get_processes():
    processes_list = []
    
    # Get total network usage first
    try:
        net_io = psutil.net_io_counters()
        
        # Calculate actual network speed
        if not hasattr(get_processes, "last_io_check"):
            get_processes.last_io_check = time.time()
            get_processes.last_bytes_sent = net_io.bytes_sent
            get_processes.last_bytes_recv = net_io.bytes_recv
            current_upload_speed = 0
            current_download_speed = 0
        else:
            time_diff = time.time() - get_processes.last_io_check
            if time_diff > 0:
                current_upload_speed = (net_io.bytes_sent - get_processes.last_bytes_sent) / time_diff
                current_download_speed = (net_io.bytes_recv - get_processes.last_bytes_recv) / time_diff
                
                get_processes.last_io_check = time.time()
                get_processes.last_bytes_sent = net_io.bytes_sent
                get_processes.last_bytes_recv = net_io.bytes_recv
            else:
                current_upload_speed = 0
                current_download_speed = 0
        
        # Convert to KB/s
        current_upload_speed_kb = current_upload_speed / 1024
        current_download_speed_kb = current_download_speed / 1024
        
        # Set very low thresholds if there's minimal network activity
        # This prevents showing network usage when there isn't any
        if current_upload_speed_kb < 1 and current_download_speed_kb < 1:
            current_upload_speed_kb = 0
            current_download_speed_kb = 0
    except:
        current_upload_speed_kb = 0
        current_download_speed_kb = 0
    
    # Get the total number of CPU cores (logical processors)
    cpu_count = psutil.cpu_count(logical=True)
    if not cpu_count:
        cpu_count = 1  # Fallback if we can't get the count
    
    # Get connections for network usage estimation
    try:
        connections = psutil.net_connections()
        active_connections = [conn for conn in connections if conn.status == 'ESTABLISHED']
        total_active_connections = len(active_connections)
    except:
        total_active_connections = 1
    
    # Get a list of all running processes
    all_processes = list(psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']))
    
    # Force a CPU percent update for all processes
    psutil.cpu_percent(interval=None)
    for proc in all_processes:
        try:
            proc.cpu_percent(interval=None)
        except:
            pass
    
    # Small delay to collect CPU usage data
    time.sleep(0.1)
    
    # Get CPU percent per process again to have more accurate values
    for proc in all_processes:
        try:
            # Get process info
            proc_info = proc.info
            
            # Get CPU percent, normalized to overall system CPU percentage
            # psutil returns per-core percentage, so divide by number of cores
            try:
                raw_cpu_percent = proc.cpu_percent(interval=None)
                # Normalize to total CPU percentage (not per-core)
                cpu_percent = raw_cpu_percent / cpu_count
                # Cap at 100% for display purposes
                cpu_percent = min(100.0, cpu_percent)
            except:
                cpu_percent = 0
            
            # Get memory info
            try:
                memory_info = proc.memory_info()
                memory_mb = memory_info.rss / (1024 * 1024)
                memory_percent = proc_info.get('memory_percent', 0)
            except:
                memory_mb = 0
                memory_percent = 0
            
            # Check actual process connections
            proc_connections = []
            try:
                # Use psutil.net_connections() instead of proc.connections()
                all_connections = psutil.net_connections()
                proc_connections = [conn for conn in all_connections if conn.pid == proc.pid]
            except:
                proc_connections = []
            
            # Only assign network usage if there's actual network activity
            if current_upload_speed_kb > 0 or current_download_speed_kb > 0:
                if proc_connections:
                    # If the process has active connections, it's likely using the network
                    # Scale by process's proportion of active connections
                    conn_ratio = len(proc_connections) / max(1, total_active_connections)
                    
                    # Also factor in CPU usage as a weight
                    cpu_weight = cpu_percent / 100.0
                    
                    # Combined weight - give more importance to connections
                    network_weight = (conn_ratio * 0.7) + (cpu_weight * 0.3)
                    
                    # Assign proportional upload/download based on the total current speeds
                    network_upload = current_upload_speed_kb * network_weight
                    network_download = current_download_speed_kb * network_weight
                    
                    # Apply an upper cap to prevent unreasonable values
                    # and maintain consistency with what's shown in network charts
                    network_upload = max(0, min(current_upload_speed_kb, network_upload))
                    network_download = max(0, min(current_download_speed_kb, network_download))
                else:
                    # No connections, but might still be using network (e.g., DNS lookups)
                    # Use very minimal values if CPU usage is non-negligible
                    if cpu_percent > 2.0:
                        network_upload = current_upload_speed_kb * 0.01 * (cpu_percent / 100.0)
                        network_download = current_download_speed_kb * 0.01 * (cpu_percent / 100.0)
                    else:
                        network_upload = 0
                        network_download = 0
            else:
                # No network activity detected
                network_upload = 0
                network_download = 0
            
            # Estimate IOPS with a more reasonable approach
            try:
                # This is still an estimation since per-process IO stats are OS-dependent
                io_counters = proc.io_counters()
                
                # Use read/write counts as basis for IOPS if available
                if hasattr(get_processes, f"last_proc_io_{proc.pid}"):
                    last_io = getattr(get_processes, f"last_proc_io_{proc.pid}")
                    time_diff = time.time() - last_io["time"]
                    
                    if time_diff > 0:
                        read_count_diff = io_counters.read_count - last_io["read_count"]
                        write_count_diff = io_counters.write_count - last_io["write_count"]
                        
                        iops = int((read_count_diff + write_count_diff) / time_diff)
                    else:
                        iops = 0
                else:
                    iops = 0
                
                # Store current IO counters for next calculation
                setattr(get_processes, f"last_proc_io_{proc.pid}", {
                    "time": time.time(),
                    "read_count": io_counters.read_count,
                    "write_count": io_counters.write_count
                })
            except:
                # If unable to get IO counters, estimate based on CPU and memory
                iops_factor = (cpu_percent / 100.0 + memory_percent / 100.0) / 2
                iops = int(iops_factor * 10)  # Much more conservative estimate
            
            processes_list.append({
                "pid": proc_info['pid'],
                "name": proc_info['name'],
                "cpu_percent": cpu_percent,
                "memory_percent": memory_percent,
                "memory_mb": memory_mb,
                "network_upload": round(network_upload, 2),
                "network_download": round(network_download, 2),
                "iops": iops
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    
    # Sort by CPU percent and get the top processes
    processes_list.sort(key=lambda x: x['cpu_percent'], reverse=True)
    
    return {
        "processes": processes_list
    }

def print_fancy_banner():
    """Print a fancy banner to the console"""
    title = Text("MONIX SYSTEM MONITOR", style="bold blue")
    subtitle = Text("Fast and beautiful system monitoring", style="italic cyan")
    
    # Create the panel with both title and subtitle
    panel_content = Text.assemble(title, "\n", subtitle)
    panel = Panel(panel_content, border_style="green", width=60)
    
    console.print(panel)
    console.print()

def get_user_input_for_server():
    """Ask the user for the host IP and port to run the server on"""
    console.print("[yellow]Please provide server configuration:[/yellow]")
    
    # Ask for host IP
    default_host = "127.0.0.1"
    host = prompt.Prompt.ask(f"Enter host IP [default: {default_host}]", default=default_host)
    
    # Ask for port
    default_port = 7678
    port_str = prompt.Prompt.ask(f"Enter port [default: {default_port}]", default=str(default_port))
    
    # Validate port
    try:
        port = int(port_str)
        if port < 0 or port > 65535:
            console.print("[red]Invalid port number! Using default port 7678.[/red]")
            port = 7678
    except ValueError:
        console.print("[red]Invalid port number! Using default port 7678.[/red]")
        port = 7678
    
    return host, port

def main():
    """Main function to run the server"""
    
    # Print a fancy banner
    print_fancy_banner()
    
    # Get user input for host and port
    host, port = get_user_input_for_server()
    
    # Try to mount frontend
    frontend_dir = find_frontend_dir()
    if frontend_dir:
        # Mount the static files at /ui
        app.mount("/ui", StaticFiles(directory=frontend_dir, html=True), name="ui")
        app.frontend_mounted = True
        console.print(f"[green]Frontend mounted at /ui[/green]")
    
    # Print server information
    console.print(f"[bold green]Starting Monix server on {host}:{port}[/bold green]")
    console.print(f"[blue]API available at: [link=http://{host}:{port}/api]http://{host}:{port}/api[/link][/blue]")
    if hasattr(app, "frontend_mounted"):
        console.print(f"[blue]UI available at: [link=http://{host}:{port}/ui]http://{host}:{port}/ui[/link][/blue]")
    
    # Run the server
    uvicorn.run(app, host=host, port=port, log_level="info")

if __name__ == "__main__":
    main() 