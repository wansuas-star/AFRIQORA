try {
    Write-Output "Running node tests/run-with-server.js tests/creator-dashboard-test.js..."
    node tests/run-with-server.js tests/creator-dashboard-test.js
    $testExitCode = $LASTEXITCODE
    Write-Output "Test 17 (Creator Dashboard) exit code: $testExitCode"
    if ($testExitCode -ne 0) {
        throw "Test 17 failed with exit code $testExitCode"
    }
    Write-Output "Test 17 Passed! Creator Dashboard API verified."
} catch {
    Write-Error $_
    exit 1
}
