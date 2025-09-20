# PowerShell script to update all @shared imports to @kelseyabreu/shared

$serverPath = "packages/server/src"

# Get all TypeScript files
$files = Get-ChildItem -Recurse $serverPath -Include "*.ts"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw

    # Replace specific subpath imports with main package import
    $updatedContent = $content -replace "@kelseyabreu/shared/[^'`"]*", "@kelseyabreu/shared"
    $updatedContent = $updatedContent -replace "@shared/[^'`"]*", "@kelseyabreu/shared"

    # Also fix any remaining @biomasters/shared references
    $updatedContent = $updatedContent -replace "@biomasters/shared", "@kelseyabreu/shared"

    # Only write if content changed
    if ($content -ne $updatedContent) {
        Set-Content $file.FullName $updatedContent -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}

Write-Host "Import update complete!"
