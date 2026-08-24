try {
    Write-Output "Running node tests/test14-monetization.js..."
    node tests/test14-monetization.js
    $testExitCode = $LASTEXITCODE
    Write-Output "test14 exit code: $testExitCode"
    if ($testExitCode -ne 0) {
        throw "test14 failed with exit code $testExitCode"
    }
} catch {
    Write-Error $_
    exit 1
}
