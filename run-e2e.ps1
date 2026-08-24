$process = $null
try {
    Write-Output "Starting Node background process server/index.js..."
    $process = Start-Process node -ArgumentList "server/index.js" -PassThru -NoNewWindow
    Write-Output "Started process with ID: $($process.Id)"
    
    # Wait for health check success
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $timeoutSeconds = 20
    $success = $false
    while ($sw.Elapsed.TotalSeconds -lt $timeoutSeconds) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -TimeoutSec 1
            if ($response.StatusCode -eq 200) {
                Write-Output "Health check succeeded: $($response.Content)"
                $success = $true
                break
            }
        } catch {
            # Catch all connection errors/timeouts
        }
    }
    
    if (-not $success) {
        throw "Server did not become healthy within $timeoutSeconds seconds."
    }
    
    Write-Output "Running npm run test:auth..."
    npm run test:auth
    $testAuthExitCode = $LASTEXITCODE
    Write-Output "npm run test:auth exit code: $testAuthExitCode"
    if ($testAuthExitCode -ne 0) {
        throw "test:auth failed with exit code $testAuthExitCode"
    }
    
    Write-Output "Running npm run test:creator..."
    npm run test:creator
    $testCreatorExitCode = $LASTEXITCODE
    Write-Output "npm run test:creator exit code: $testCreatorExitCode"
    if ($testCreatorExitCode -ne 0) {
        throw "test:creator failed with exit code $testCreatorExitCode"
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
