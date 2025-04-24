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
import asyncio
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor
import threading

# Set up thread pool for CPU-intensive operations
thread_pool = ThreadPoolExecutor(max_workers=4)

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

# Improved cache system with TTL and thread safety
class Cache:
    def __init__(self, ttl_seconds=5):
        self._cache = {}
        self._ttl = ttl_seconds
        self._lock = threading.Lock()
    
    def get(self, key):
        with self._lock:
            if key in self._cache:
                value, timestamp = self._cache[key]
                if time.time() - timestamp <= self._ttl:
                    return value
            return None
    
    def set(self, key, value):
        with self._lock:
            self._cache[key] = (value, time.time())

cache = Cache(ttl_seconds=5)  # Cache data for 5 seconds

# Utility function to run CPU-intensive tasks in thread pool
async def run_in_thread(func, *args, **kwargs):
    return await asyncio.get_event_loop().run_in_executor(
        thread_pool, 
        func,
        *args,
        **kwargs
    )

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
    cache_key = "cpu_info"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data
    
    # Run CPU-intensive operations in thread pool
    cpu_percent = await run_in_thread(psutil.cpu_percent, interval=0.5, percpu=False)
    cpu_percent_per_cpu = await run_in_thread(psutil.cpu_percent, interval=0, percpu=True)
    cpu_freq = await run_in_thread(psutil.cpu_freq)
    
    result = {
        "cpu_percent": cpu_percent,
        "cpu_percent_per_cpu": cpu_percent_per_cpu,
        "cpu_freq": f"{cpu_freq.current:.2f} MHz" if cpu_freq else "N/A",
        "cpu_cores": psutil.cpu_count(logical=False),
        "cpu_threads": psutil.cpu_count(logical=True)
    }
    
    cache.set(cache_key, result)
    return result

@app.get("/api/memory")
async def get_memory_info():
    cache_key = "memory_info"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data
    
    memory = await run_in_thread(psutil.virtual_memory)
    
    # Convert to GB and MB
    total_gb = memory.total / (1024**3)
    used_gb = memory.used / (1024**3)
    available_gb = memory.available / (1024**3)
    
    result = {
        "memory_percent": memory.percent,
        "total_memory_GB": total_gb,
        "used_memory_GB": used_gb,
        "available_memory_GB": available_gb,
        "total_memory_MB": memory.total / (1024**2),
        "used_memory_MB": memory.used / (1024**2),
        "available_memory_MB": memory.available / (1024**2)
    }
    
    cache.set(cache_key, result)
    return result

@app.get("/api/disk")
async def get_disk_info():
    cache_key = "disk_info"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data
    
    disk = await run_in_thread(psutil.disk_usage, '/')
    
    result = {
        "disk_percent": disk.percent,
        "total_disk": disk.total,
        "used_disk": disk.used,
        "free_disk": disk.free,
        "total_disk_formatted": f"{disk.total / (1024**3):.3f} GB",
        "used_disk_formatted": f"{disk.used / (1024**3):.3f} GB",
        "free_disk_formatted": f"{disk.free / (1024**3):.3f} GB"
    }
    
    cache.set(cache_key, result)
    return result

@app.get("/api/network")
async def get_network_info():
    cache_key = "network_info"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data
    
    net_io = await run_in_thread(psutil.net_io_counters)
    
    # Store last values in class variable to persist between requests
    if not hasattr(get_network_info, "_last_values"):
        get_network_info._last_values = {
            "bytes_sent": net_io.bytes_sent,
            "bytes_recv": net_io.bytes_recv,
            "time": time.time()
        }
        upload_speed = 0
        download_speed = 0
    else:
        now = time.time()
        time_elapsed = now - get_network_info._last_values["time"]
        
        upload_speed = (net_io.bytes_sent - get_network_info._last_values["bytes_sent"]) / time_elapsed
        download_speed = (net_io.bytes_recv - get_network_info._last_values["bytes_recv"]) / time_elapsed
        
        get_network_info._last_values = {
            "bytes_sent": net_io.bytes_sent,
            "bytes_recv": net_io.bytes_recv,
            "time": now
        }
    
    def format_bytes(bytes_value):
        for unit in ['B', 'KB', 'MB', 'GB']:
            if bytes_value < 1024:
                return f"{bytes_value:.2f} {unit}"
            bytes_value /= 1024
        return f"{bytes_value:.2f} TB"
    
    def format_speed(speed):
        return format_bytes(speed) + "/s"
    
    result = {
        "upload_speed": upload_speed,
        "download_speed": download_speed,
        "upload_speed_MB": upload_speed / (1024**2),
        "download_speed_MB": download_speed / (1024**2),
        "upload_speed_formatted": format_speed(upload_speed),
        "download_speed_formatted": format_speed(download_speed),
        "total_sent": net_io.bytes_sent,
        "total_recv": net_io.bytes_recv,
        "total_sent_formatted": format_bytes(net_io.bytes_sent),
        "total_recv_formatted": format_bytes(net_io.bytes_recv)
    }
    
    cache.set(cache_key, result)
    return result

@app.get("/api/ip")
async def get_ip_info():
    cache_key = "ip_info"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data
    
    hostname = socket.gethostname()
    
    async def get_ip_addresses():
        try:
            ipv4 = await run_in_thread(socket.gethostbyname, hostname)
        except:
            ipv4 = "Not available"
        
        ipv6 = "Not available"
        try:
            addrinfo = await run_in_thread(socket.getaddrinfo, hostname, None)
            for addr in addrinfo:
                if addr[0] == socket.AF_INET6:
                    ipv6 = addr[4][0]
                    break
        except:
            pass
        
        return ipv4, ipv6
    
    ipv4, ipv6 = await get_ip_addresses()
    
    result = {
        "hostname": hostname,
        "ipv4": ipv4,
        "ipv6": ipv6
    }
    
    cache.set(cache_key, result)
    return result

@app.get("/api/connections")
async def get_connections():
    cache_key = "connections_info"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data
    
    connections = await run_in_thread(psutil.net_connections)
    tcp_count = sum(1 for conn in connections if conn.type == socket.SOCK_STREAM)
    udp_count = sum(1 for conn in connections if conn.type == socket.SOCK_DGRAM)
    
    result = {
        "total_connections": len(connections),
        "tcp_connections": tcp_count,
        "udp_connections": udp_count
    }
    
    cache.set(cache_key, result)
    return result

@app.get("/api/uptime")
async def get_uptime():
    cache_key = "uptime_info"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data
    
    boot_time = await run_in_thread(psutil.boot_time)
    uptime_seconds = time.time() - boot_time
    
    days = int(uptime_seconds // (24 * 3600))
    hours = int((uptime_seconds % (24 * 3600)) // 3600)
    minutes = int((uptime_seconds % 3600) // 60)
    seconds = int(uptime_seconds % 60)
    
    result = {
        "uptime_seconds": uptime_seconds,
        "formatted_uptime": f"{days}d {hours}h {minutes}m {seconds}s",
        "boot_time": boot_time,
        "boot_time_formatted": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(boot_time))
    }
    
    cache.set(cache_key, result)
    return result

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
    cache_key = "processes_info"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data
    
    async def get_process_info():
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status']):
            try:
                pinfo = proc.info
                processes.append({
                    'pid': pinfo['pid'],
                    'name': pinfo['name'],
                    'cpu_percent': pinfo['cpu_percent'] or 0.0,
                    'memory_percent': pinfo['memory_percent'] or 0.0,
                    'status': pinfo['status']
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        
        # Sort by CPU usage
        processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
        return processes[:50]  # Return only top 50 processes
    
    processes = await run_in_thread(get_process_info)
    
    result = {
        "total_processes": len(processes),
        "processes": processes
    }
    
    # Cache for a shorter duration since process info changes frequently
    cache.set(cache_key, result)
    return result

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