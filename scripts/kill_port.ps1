$port = 3000
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Select-Object -Unique

if ($process) {
    echo "Killing process ID $process on port $port..."
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    echo "Port $port freed."
} else {
    echo "No process found on port $port."
}
