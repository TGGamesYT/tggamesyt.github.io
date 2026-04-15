<?php

$manifestUrl = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";

$version = $_GET['ver'] ?? null;
$path = $_GET['path'] ?? null;

if (!$version || !$path) {
    http_response_code(400);
    echo "Missing ver or path";
    exit;
}

// Cache folder
$cacheDir = __DIR__ . "/cache";
if (!is_dir($cacheDir)) mkdir($cacheDir);

// Step 1: get manifest
$manifest = json_decode(file_get_contents($manifestUrl), true);

// Step 2: find version
$versionMetaUrl = null;
foreach ($manifest['versions'] as $v) {
    if ($v['id'] === $version) {
        $versionMetaUrl = $v['url'];
        break;
    }
}

if (!$versionMetaUrl) {
    http_response_code(404);
    echo "Version not found";
    exit;
}

// Step 3: get version meta
$meta = json_decode(file_get_contents($versionMetaUrl), true);
$jarUrl = $meta['downloads']['client']['url'];

// Step 4: cache jar
$jarPath = "$cacheDir/$version.jar";

if (!file_exists($jarPath)) {
    file_put_contents($jarPath, fopen($jarUrl, 'r'));
}

// Step 5: open zip
$zip = new ZipArchive();
if ($zip->open($jarPath) !== TRUE) {
    http_response_code(500);
    echo "Failed to open jar";
    exit;
}

// Normalize path
$path = ltrim($path, "/");

// Step 6: check if file exists
$index = $zip->locateName($path, ZipArchive::FL_NOCASE);

if ($index !== false) {
    // FILE
    $content = $zip->getFromIndex($index);

    // Detect type
    if (str_ends_with($path, ".png")) {
        header("Content-Type: image/png");
        echo $content;
    } elseif (str_ends_with($path, ".json")) {
        header("Content-Type: application/json");
        echo $content;
    } else {
        header("Content-Type: text/plain");
        echo $content;
    }

    exit;
}

// Step 7: directory listing
$children = [];

for ($i = 0; $i < $zip->numFiles; $i++) {
    $name = $zip->getNameIndex($i);

    if (str_starts_with($name, $path)) {
        $relative = substr($name, strlen($path));
        $parts = explode("/", trim($relative, "/"));

        if (count($parts) > 0 && $parts[0] !== "") {
            $children[$parts[0]] = true;
        }
    }
}

$zip->close();

// Output JSON
header("Content-Type: application/json");
echo json_encode([
    "type" => "directory",
    "children" => array_values(array_keys($children))
]);
