# Monix System Monitor

A beautiful and efficient system monitoring tool with both backend API and frontend UI.

## Features

- Real-time CPU, memory, disk, and network monitoring
- Process monitoring with resource usage details
- Beautiful console output with colored text
- Cross-platform compatibility (Windows, macOS, Linux)
- Web-based user interface
- RESTful API for integration with other tools

## Requirements

- Python 3.7+
- FastAPI - python library
- Uvicorn - python library
- psutil - python library
- rich - python library
## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/Monix.git
   cd Monix
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
   
   If the requirements.txt file doesn't exist, it will be automatically created when you run the server.

## Usage

Simply run the server:
```
python server.py
```

You'll be prompted to enter:
- Host IP (default: 127.0.0.1)
- Port (default: 7678)

Just press Enter to use the defaults or input your preferred values.

## Accessing the Monitor

- **API**: `http://<host>:<port>/api`
- **API DOC**: `http://<host>:<port>/docs`
- **Web UI**: `http://<host>:<port>/ui`

## API Endpoints

- `/api` - API information
- `/api/cpu` - CPU information
- `/api/memory` - Memory usage information
- `/api/disk` - Disk usage information
- `/api/network` - Network usage information
- `/api/ip` - IP and hostname information
- `/api/connections` - Network connection information
- `/api/uptime` - System uptime information
- `/api/iops` - Disk I/O operations per second
- `/api/processes` - Running processes with resource usage
