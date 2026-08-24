try {
    Write-Output "Running node tests/test16-business.js..."
    node tests/test16-business.js
    $testExitCode = $LASTEXITCODE
    Write-Output "test16 exit code: $testExitCode"
    if ($testExitCode -ne 0) {
        throw "test16 failed with exit code $testExitCode"
    }
} catch {
    Write-Error $_
    exit 1
}
