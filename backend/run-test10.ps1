$process = $null
try {
    Write-Output "Starting Node backend..."
    $process = Start-Process npx.cmd -ArgumentList "tsx src/index.ts" -PassThru -NoNewWindow
    Write-Output "Started process with ID: $($process.Id)"
    
    # Wait for server to start
    Start-Sleep -Seconds 5
    
    Write-Output "Running node test10.js..."
    node test10.js
    $testExitCode = $LASTEXITCODE
    Write-Output "test10 exit code: $testExitCode"
    if ($testExitCode -ne 0) {
        throw "test10 failed with exit code $testExitCode"
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
