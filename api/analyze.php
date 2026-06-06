<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function clamp_value(float $value, float $low, float $high): float {
    return max($low, min($high, $value));
}

function weather_label(?int $code): string {
    $labels = [
        0 => 'Clear',
        1 => 'Mainly clear',
        2 => 'Partly cloudy',
        3 => 'Overcast',
        45 => 'Fog',
        51 => 'Light drizzle',
        61 => 'Slight rain',
        63 => 'Moderate rain',
        65 => 'Heavy rain',
        80 => 'Rain showers',
        95 => 'Thunderstorm',
    ];
    return $labels[$code] ?? 'Unknown';
}

function fallback_weather(float $latitude): array {
    $hour = (int) date('G');
    $temperature = 28 - 10 * abs($latitude) / 90;
    $humidity = clamp_value(58 + 16 * sin($hour / 24 * 2 * pi()), 20, 95);

    return [
        'source' => 'local model',
        'temperature_c' => round($temperature, 1),
        'humidity_percent' => round($humidity, 1),
        'pressure_hpa' => 1011.5,
        'precipitation_mm' => 0,
        'condition' => 'Modeled clear',
        'weather_code' => null,
    ];
}

function fetch_weather(float $latitude, float $longitude): array {
    $params = http_build_query([
        'latitude' => $latitude,
        'longitude' => $longitude,
        'current' => 'temperature_2m,relative_humidity_2m,precipitation,pressure_msl,weather_code',
        'timezone' => 'auto',
    ]);
    $url = 'https://api.open-meteo.com/v1/forecast?' . $params;
    $context = stream_context_create(['http' => ['timeout' => 5]]);
    $raw = @file_get_contents($url, false, $context);

    if ($raw === false) {
        return fallback_weather($latitude);
    }

    $decoded = json_decode($raw, true);
    $current = $decoded['current'] ?? null;
    if (!is_array($current)) {
        return fallback_weather($latitude);
    }

    $code = isset($current['weather_code']) ? (int) $current['weather_code'] : null;
    return [
        'source' => 'Open-Meteo',
        'temperature_c' => (float) ($current['temperature_2m'] ?? 25),
        'humidity_percent' => (float) ($current['relative_humidity_2m'] ?? 50),
        'pressure_hpa' => (float) ($current['pressure_msl'] ?? 1013.25),
        'precipitation_mm' => (float) ($current['precipitation'] ?? 0),
        'condition' => weather_label($code),
        'weather_code' => $code,
    ];
}

function saturation_vapor_pressure(float $tempC): float {
    return 6.112 * exp((17.67 * $tempC) / ($tempC + 243.5));
}

$payload = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($payload) || !isset($payload['latitude'], $payload['longitude'])) {
    http_response_code(400);
    echo json_encode(['error' => 'latitude and longitude are required']);
    exit;
}

$latitude = (float) $payload['latitude'];
$longitude = (float) $payload['longitude'];
$browserAccuracy = (float) ($payload['accuracy_m'] ?? 50);
$altitude = (float) ($payload['altitude_m'] ?? 0);
$weather = isset($payload['weather']) && is_array($payload['weather'])
    ? $payload['weather']
    : fetch_weather($latitude, $longitude);

$tempC = (float) ($weather['temperature_c'] ?? 25);
$tempK = $tempC + 273.15;
$humidity = (float) ($weather['humidity_percent'] ?? 50);
$pressure = (float) ($weather['pressure_hpa'] ?? 1013.25);
$precipitation = (float) ($weather['precipitation_mm'] ?? 0);

$e = $humidity / 100 * saturation_vapor_pressure($tempC);
$latRad = deg2rad($latitude);
$hydrostaticM = 0.0022768 * $pressure / (1 - 0.00266 * cos(2 * $latRad) - 0.00028 * $altitude / 1000);
$wetM = 0.002277 * (1255 / $tempK + 0.05) * $e;
$tropoNs = ($hydrostaticM + $wetM) / 0.299792458;
$ionoNs = clamp_value(8 + abs($latitude) / 9 + max(0, 18 - (int) date('G')) * 0.15, 6, 28);
$waterVapor = clamp_value($e * 2.1, 0, 70);
$precipProb = clamp_value($precipitation * 42 + $humidity - 45, 0, 100);
$estimatedSignal = clamp_value(96 - $browserAccuracy * 0.35 - $precipProb * 0.18 - $wetM * 4, 20, 99);
$quality = $estimatedSignal >= 80 ? 'Excellent' : ($estimatedSignal >= 55 ? 'Good' : 'Poor');

$constellations = ['GPS', 'GLONASS', 'Galileo', 'BeiDou'];
$visibleCount = (int) clamp_value(10 + $estimatedSignal / 15, 8, 18);
$satellites = [];
for ($i = 0; $i < $visibleCount; $i++) {
    $constellation = $constellations[$i % count($constellations)];
    $prn = (($i * 7 + (int) abs($longitude)) % 32) + 1;
    $satellites[] = [
        'id' => sprintf('%s-%02d', $constellation, $prn),
        'signalStrength' => round(clamp_value($estimatedSignal - ($i % 5) * 5 + 4, 15, 99), 1),
    ];
}

echo json_encode([
    'location' => [
        'latitude' => $latitude,
        'longitude' => $longitude,
        'accuracy_m' => $browserAccuracy,
        'altitude_m' => $altitude,
    ],
    'weather' => $weather,
    'analysis' => [
        'troposphericDelay' => round($tropoNs, 2),
        'ionosphericDelay' => round($ionoNs, 2),
        'waterVapor' => round($waterVapor, 2),
        'precipitationProb' => round($precipProb, 1),
        'signalQuality' => $quality,
        'estimatedSignal' => round($estimatedSignal, 1),
        'satellites' => $satellites,
    ],
    'note' => 'Browser GPS is live; raw satellite values are modeled because browsers do not expose GNSS measurements.',
    'updated_at' => gmdate('c'),
]);
