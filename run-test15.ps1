try {
    Write-Output "Running node tests/test15-i18n.js..."
    node tests/test15-i18n.js
    $testExitCode = $LASTEXITCODE
    Write-Output "test15 exit code: $testExitCode"
    if ($testExitCode -ne 0) {
        throw "test15 failed with exit code $testExitCode"
    }
} catch {
    Write-Error $_
    exit 1
}
