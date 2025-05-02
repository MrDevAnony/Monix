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
import threading

# Set up colorful console output
console = Console()

app = FastAPI(title="Monix System Monitor")

# CORS middleware to allow frontend to connect (only localhost for security)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Improved per-key cache with thread safety
class PerKeyCache:
    def __init__(self, duration=1):
        self.duration = duration
        self.data = {}
        self.lock = threading.Lock()

    def get(self, key, func, *args, **kwargs):
        now = time.time()
        with self.lock:
            entry = self.data.get(key, None)
            if not entry or now - entry['time'] > self.duration:
                value = func(*args, **kwargs)
                self.data[key] = {'value': value, 'time': now}
                return value
            return entry['value']

cache = PerKeyCache(duration=1)

# State for network and IOPS
state = {
    'network': {'last_bytes_sent': 0, 'last_bytes_recv': 0, 'last_time': 0},
    'iops': {'last_read_count': 0, 'last_write_count': 0, 'last_time': 0, 'last_read_iops': 0, 'last_write_iops': 0},
    'processes': {}
}

@app.get("/")
async def root():
    if hasattr(app, "frontend_mounted"):
        return RedirectResponse(url="/ui/")
    return {"message": "Monix Backend API is running"}

@app.get("/api")
async def api_info():
    return {"message": "Monix API is running", "version": "1.0.0"}

@app.get("/api/cpu")
async def get_cpu_info():
    def cpu_data():
        cpu_percent = psutil.cpu_percent(interval=0.5, percpu=False)
        cpu_percent_per_cpu = psutil.cpu_percent(interval=0, percpu=True)
        cpu_freq = psutil.cpu_freq()
        cpu_freq_str = f"{cpu_freq.current:.2f} MHz" if cpu_freq else "N/A"
        return {
            "cpu_percent": cpu_percent,
            "cpu_percent_per_cpu": cpu_percent_per_cpu,
            "cpu_freq": cpu_freq_str,
            "cpu_cores": psutil.cpu_count(logical=False),
            "cpu_threads": psutil.cpu_count(logical=True)
        }
    return cache.get('cpu', cpu_data)

@app.get("/api/memory")
async def get_memory_info():
    def memory_data():
        memory = psutil.virtual_memory()
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
    return cache.get('memory', memory_data)

@app.get("/api/disk")
async def get_disk_info():
    def disk_data():
        disk = psutil.disk_usage('/')
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
    return cache.get('disk', disk_data)

@app.get("/api/network")
async def get_network_info():
    try:
        net_io = psutil.net_io_counters()
        now = time.time()
        if state['network']['last_time'] == 0:
            upload_speed = 0
            download_speed = 0
        else:
            time_elapsed = now - state['network']['last_time']
            upload_speed = (net_io.bytes_sent - state['network']['last_bytes_sent']) / time_elapsed if time_elapsed > 0 else 0
            download_speed = (net_io.bytes_recv - state['network']['last_bytes_recv']) / time_elapsed if time_elapsed > 0 else 0
        state['network']['last_bytes_sent'] = net_io.bytes_sent
        state['network']['last_bytes_recv'] = net_io.bytes_recv
        state['network']['last_time'] = now
        upload_speed_MB = upload_speed / (1024**2)
        download_speed_MB = download_speed / (1024**2)
        def format_bytes(val):
            if val < 1024:
                return f"{val:.2f} B"
            elif val < 1024**2:
                return f"{val/1024:.2f} KB"
            elif val < 1024**3:
                return f"{val/(1024**2):.2f} MB"
            else:
                return f"{val/(1024**3):.2f} GB"
        upload_speed_formatted = format_bytes(upload_speed) + "/s"
        download_speed_formatted = format_bytes(download_speed) + "/s"
        total_sent_formatted = format_bytes(net_io.bytes_sent)
        total_recv_formatted = format_bytes(net_io.bytes_recv)
        return {
            "upload_speed": upload_speed,
            "download_speed": download_speed,
            "upload_speed_MB": upload_speed_MB,
            "download_speed_MB": download_speed_MB,
            "upload_speed_formatted": upload_speed_formatted,
            "download_speed_formatted": download_speed_formatted,
            "total_sent": net_io.bytes_sent,
            "total_recv": net_io.bytes_recv,
            "total_sent_formatted": total_sent_formatted,
            "total_recv_formatted": total_recv_formatted
        }
    except Exception as e:
        console.print(f"[red]Error in /api/network: {e}[/red]")
        return {"error": str(e)}

@app.get("/api/ip")
async def get_ip_info():
    try:
        hostname = socket.gethostname()
        try:
            ipv4 = socket.gethostbyname(hostname)
        except:
            ipv4 = "Not available"
        ipv6 = "Not available"
        try:
            addrinfo = socket.getaddrinfo(hostname, None)
            for addr in addrinfo:
                if addr[0] == socket.AF_INET6:
                    ipv6 = addr[4][0]
                    break
        except:
            pass
        return {"hostname": hostname, "ipv4": ipv4, "ipv6": ipv6}
    except Exception as e:
        console.print(f"[red]Error in /api/ip: {e}[/red]")
        return {"error": str(e)}

@app.get("/api/connections")
async def get_connections():
    try:
        connections = psutil.net_connections()
        tcp_count = sum(1 for conn in connections if conn.type == socket.SOCK_STREAM)
        udp_count = sum(1 for conn in connections if conn.type == socket.SOCK_DGRAM)
        return {
            "total_connections": len(connections),
            "tcp_connections": tcp_count,
            "udp_connections": udp_count
        }
    except Exception as e:
        console.print(f"[red]Error in /api/connections: {e}[/red]")
        return {"error": str(e)}

@app.get("/api/uptime")
async def get_uptime():
    try:
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
    except Exception as e:
        console.print(f"[red]Error in /api/uptime: {e}[/red]")
        return {"error": str(e)}

@app.get("/api/iops")
async def get_iops():
    try:
        disk_io = psutil.disk_io_counters()
        now = time.time()
        if state['iops']['last_time'] == 0:
            read_iops = 0
            write_iops = 0
        else:
            time_elapsed = now - state['iops']['last_time']
            read_iops = int((disk_io.read_count - state['iops']['last_read_count']) / time_elapsed) if time_elapsed > 0 else 0
            write_iops = int((disk_io.write_count - state['iops']['last_write_count']) / time_elapsed) if time_elapsed > 0 else 0
        state['iops']['last_read_count'] = disk_io.read_count
        state['iops']['last_write_count'] = disk_io.write_count
        state['iops']['last_time'] = now
        state['iops']['last_read_iops'] = read_iops
        state['iops']['last_write_iops'] = write_iops
        return {
            "read_iops": read_iops,
            "write_iops": write_iops,
            "total_iops": read_iops + write_iops
        }
    except Exception as e:
        console.print(f"[red]Error in /api/iops: {e}[/red]")
        return {"read_iops": 0, "write_iops": 0, "total_iops": 0, "error": str(e)}

@app.get("/api/processes")
async def get_processes():
    try:
        processes_list = []
        net_io = psutil.net_io_counters()
        now = time.time()
        if 'last_io_check' not in state['processes']:
            state['processes']['last_io_check'] = now
            state['processes']['last_bytes_sent'] = net_io.bytes_sent
            state['processes']['last_bytes_recv'] = net_io.bytes_recv
            current_upload_speed = 0
            current_download_speed = 0
        else:
            time_diff = now - state['processes']['last_io_check']
            if time_diff > 0:
                current_upload_speed = (net_io.bytes_sent - state['processes']['last_bytes_sent']) / time_diff
                current_download_speed = (net_io.bytes_recv - state['processes']['last_bytes_recv']) / time_diff
                state['processes']['last_io_check'] = now
                state['processes']['last_bytes_sent'] = net_io.bytes_sent
                state['processes']['last_bytes_recv'] = net_io.bytes_recv
            else:
                current_upload_speed = 0
                current_download_speed = 0
        current_upload_speed_kb = current_upload_speed / 1024
        current_download_speed_kb = current_download_speed / 1024
        if current_upload_speed_kb < 1 and current_download_speed_kb < 1:
            current_upload_speed_kb = 0
            current_download_speed_kb = 0
        cpu_count = psutil.cpu_count(logical=True) or 1
        try:
            connections = psutil.net_connections()
            active_connections = [conn for conn in connections if conn.status == 'ESTABLISHED']
            total_active_connections = len(active_connections)
        except:
            total_active_connections = 1
        all_processes = list(psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']))
        psutil.cpu_percent(interval=None)
        for proc in all_processes:
            try:
                proc.cpu_percent(interval=None)
            except:
                pass
        time.sleep(0.1)
        for proc in all_processes:
            try:
                proc_info = proc.info
                try:
                    raw_cpu_percent = proc.cpu_percent(interval=None)
                    cpu_percent = raw_cpu_percent / cpu_count
                    cpu_percent = min(100.0, cpu_percent)
                except:
                    cpu_percent = 0
                try:
                    memory_info = proc.memory_info()
                    memory_mb = memory_info.rss / (1024 * 1024)
                    memory_percent = proc_info.get('memory_percent', 0)
                except:
                    memory_mb = 0
                    memory_percent = 0
                proc_connections = []
                try:
                    all_connections = psutil.net_connections()
                    proc_connections = [conn for conn in all_connections if conn.pid == proc.pid]
                except:
                    proc_connections = []
                if current_upload_speed_kb > 0 or current_download_speed_kb > 0:
                    if proc_connections:
                        conn_ratio = len(proc_connections) / max(1, total_active_connections)
                        cpu_weight = cpu_percent / 100.0
                        network_weight = (conn_ratio * 0.7) + (cpu_weight * 0.3)
                        network_upload = current_upload_speed_kb * network_weight
                        network_download = current_download_speed_kb * network_weight
                        network_upload = max(0, min(current_upload_speed_kb, network_upload))
                        network_download = max(0, min(current_download_speed_kb, network_download))
                    else:
                        if cpu_percent > 2.0:
                            network_upload = current_upload_speed_kb * 0.01 * (cpu_percent / 100.0)
                            network_download = current_download_speed_kb * 0.01 * (cpu_percent / 100.0)
                        else:
                            network_upload = 0
                            network_download = 0
                else:
                    network_upload = 0
                    network_download = 0
                try:
                    io_counters = proc.io_counters()
                    last_io = state['processes'].get(f"last_proc_io_{proc.pid}", None)
                    if last_io:
                        time_diff = now - last_io["time"]
                        if time_diff > 0:
                            read_count_diff = io_counters.read_count - last_io["read_count"]
                            write_count_diff = io_counters.write_count - last_io["write_count"]
                            iops = int((read_count_diff + write_count_diff) / time_diff)
                        else:
                            iops = 0
                    else:
                        iops = 0
                    state['processes'][f"last_proc_io_{proc.pid}"] = {
                        "time": now,
                        "read_count": io_counters.read_count,
                        "write_count": io_counters.write_count
                    }
                except:
                    iops_factor = (cpu_percent / 100.0 + memory_percent / 100.0) / 2
                    iops = int(iops_factor * 10)
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
        processes_list.sort(key=lambda x: x['cpu_percent'], reverse=True)
        return {"processes": processes_list}
    except Exception as e:
        console.print(f"[red]Error in /api/processes: {e}[/red]")
        return {"error": str(e), "processes": []}

def print_fancy_banner():
    title = Text("MONIX SYSTEM MONITOR", style="bold blue")
    subtitle = Text("Fast and beautiful system monitoring", style="italic cyan")
    panel_content = Text.assemble(title, "\n", subtitle)
    panel = Panel(panel_content, border_style="green", width=60)
    console.print(panel)
    console.print()

def get_user_input_for_server():
    console.print("[yellow]Please provide server configuration:[/yellow]")
    default_host = "127.0.0.1"
    host = prompt.Prompt.ask(f"Enter host IP [default: {default_host}]", default=default_host)
    default_port = 7678
    port_str = prompt.Prompt.ask(f"Enter port [default: {default_port}]", default=str(default_port))
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
    print_fancy_banner()
    host, port = get_user_input_for_server()
    # حذف جستجوی دایرکتوری فرانت‌اند و فقط mount کردن webui
    frontend_dir = Path(__file__).parent.absolute() / "webui"
    if frontend_dir.exists() and frontend_dir.is_dir():
        app.mount("/ui", StaticFiles(directory=str(frontend_dir), html=True), name="ui")
        app.frontend_mounted = True
        console.print(f"[green]Frontend mounted at /ui[/green]")
    console.print(f"[bold green]Starting Monix server on {host}:{port}[/bold green]")
    console.print(f"[blue]API available at: [link=http://{host}:{port}/api]http://{host}:{port}/api[/link][/blue]")
    if hasattr(app, "frontend_mounted"):
        console.print(f"[blue]UI available at: [link=http://{host}:{port}/ui]http://{host}:{port}/ui[/link][/blue]")
    uvicorn.run(app, host=host, port=port, log_level="info")

if __name__ == "__main__":
    main() 