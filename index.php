<?php
$appTitle = 'GNSS Atmospheric Weather Detection';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($appTitle, ENT_QUOTES, 'UTF-8'); ?></title>
    <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>GNSS Atmospheric Weather Detection</h1>
            <p>Real-time browser GPS with PHP weather-backed atmospheric estimates</p>
        </div>

        <div class="status-panel">
            <h3>System Status</h3>
            <div id="location-prompt" class="alert" style="margin-bottom: 15px;">
                <strong>Location Access Required</strong><br>
                This app needs your browser location to calculate atmospheric estimates.<br>
                <em>Latitude, longitude, and accuracy are sent only to your local PHP backend.</em>
            </div>
            <div id="backend-status">Backend: ready</div>
            <div id="gps-status">GPS: Ready to request permission</div>
            <div id="location-info">Location: Click "Request Location Access" to start</div>
            <div id="system-time">System Time: <span id="current-time"></span></div>
            <div id="satellite-count">Satellites in view: <span id="sat-count">0</span></div>
        </div>

        <div class="control-buttons">
            <button class="btn btn-primary" id="request-location">Request Location Access</button>
            <button class="btn btn-primary" id="start-monitoring">Start GNSS Monitoring</button>
            <button class="btn btn-secondary" id="simulate-weather">Simulate Weather Event</button>
            <button class="btn btn-secondary" id="reset-system">Reset System</button>
        </div>

        <div class="data-grid">
            <div class="data-card">
                <h3>GNSS Signal Analysis</h3>
                <div>Tropospheric Delay: <span id="tropo-delay">0.0 ns</span></div>
                <div>Ionospheric Delay: <span id="iono-delay">0.0 ns</span></div>
                <div>Water Vapor Content: <span id="water-vapor">0.0 mm</span></div>
                <div>Signal Quality: <span id="signal-quality">Excellent</span></div>
                <div class="satellite-grid" id="satellite-grid"></div>
            </div>

            <div class="data-card">
                <h3>Weather Interpretation</h3>
                <div>Precipitation Probability: <span id="precip-prob">0%</span></div>
                <div>Atmospheric Pressure: <span id="pressure">1013.25 hPa</span></div>
                <div>Humidity Estimate: <span id="humidity">45%</span></div>
                <div>Weather Condition: <span id="weather-condition">Clear</span></div>
                <div>Weather Source: <span id="weather-source">local model</span></div>
                <div id="weather-alerts"></div>
            </div>

            <div class="data-card">
                <h3>Network Triangulation</h3>
                <div>Active Nodes: <span id="network-nodes">1</span></div>
                <div>Coverage Radius: <span id="coverage-radius">5.2 km</span></div>
                <div>Data Accuracy: <span id="data-accuracy">+/-2.3 mm</span></div>
                <div>Network Latency: <span id="network-latency">45 ms</span></div>
            </div>
        </div>

        <div class="weather-visualization" id="weather-viz">
            <h3>Atmospheric Visualization</h3>
            <div id="visualization-content">
                <p>Real-time atmospheric conditions will be displayed here...</p>
            </div>
        </div>
    </div>

    <script src="assets/app.js"></script>
</body>
</html>
