try {
    Write-Output "Running node tests/test12-push.js..."
    node tests/test12-push.js
    $testExitCode = $LASTEXITCODE
    Write-Output "test12 exit code: $testExitCode"
    if ($testExitCode -ne 0) {
        throw "test12 failed with exit code $testExitCode"
    }
} catch {
    Write-Error $_
    exit 1
}
