$process = $null
try {
    Write-Output "Starting Signaling Server..."
    $process = Start-Process node -ArgumentList "server/signaling-server.js" -PassThru -NoNewWindow
    Write-Output "Started process with ID: $($process.Id)"
    
    # Wait for server to start
    Start-Sleep -Seconds 2
    
    Write-Output "Running node tests/test8-calling.js..."
    node tests/test8-calling.js
    $testExitCode = $LASTEXITCODE
    Write-Output "test8 exit code: $testExitCode"
    if ($testExitCode -ne 0) {
        throw "test8 failed with exit code $testExitCode"
    }
} catch {
    Write-Error $_
    exit 1
} finally {
    if ($process) {
        Write-Output "Stopping background process: $($process.Id)"
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
}
