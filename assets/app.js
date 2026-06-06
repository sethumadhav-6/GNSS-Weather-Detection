let isMonitoring = false;
let watchId = null;
let weatherData = {
    troposphericDelay: 0,
    ionosphericDelay: 0,
    waterVapor: 0,
    precipitationProb: 0,
    signalQuality: "Excellent",
};
let simulatedSatellites = [];
let lastPosition = null;
let lastWeather = null;

function el(id) {
    return document.getElementById(id);
}

function initializeSystem() {
    updateTime();
    setInterval(updateTime, 1000);
    generateSatellites();
    updateDisplay();
    fetch("api/health.php")
        .then((response) => response.json())
        .then((data) => {
            el("backend-status").textContent = `Backend: ${data.status} (${data.runtime})`;
        })
        .catch(() => {
            el("backend-status").textContent = "Backend: not reachable";
        });
}

function updateTime() {
    el("current-time").textContent = new Date().toLocaleTimeString();
}

function requestLocationPermission() {
    const prompt = el("location-prompt");
    if (prompt) prompt.style.display = "none";

    if (!("geolocation" in navigator)) {
        handleLocationError("Geolocation not supported");
        return;
    }

    el("gps-status").innerHTML = 'GPS: <span class="loading"></span> Please allow location access...';
    getCurrentLocation();
}

function startGNSSMonitoring() {
    if (!("geolocation" in navigator)) {
        handleLocationError("Geolocation not supported");
        return;
    }

    el("gps-status").innerHTML = 'GPS: <span class="loading"></span> Monitoring...';
    getCurrentLocation();
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = navigator.geolocation.watchPosition(handlePosition, handleWatchError, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
    });
}

function getCurrentLocation() {
    navigator.geolocation.getCurrentPosition(handlePosition, (error) => {
        let message = "Unknown error";
        if (error.code === error.PERMISSION_DENIED) message = "Permission denied";
        if (error.code === error.POSITION_UNAVAILABLE) message = "Location unavailable";
        if (error.code === error.TIMEOUT) message = "Request timeout";
        handleLocationError(message);
    }, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
    });
}

function handlePosition(position) {
    lastPosition = position;
    const lat = position.coords.latitude.toFixed(6);
    const lon = position.coords.longitude.toFixed(6);
    const accuracy = position.coords.accuracy.toFixed(1);
    const timestamp = new Date(position.timestamp).toLocaleString();

    el("gps-status").textContent = "GPS: Active (real browser location)";
    el("location-info").innerHTML = `Location:<div class="coordinates">Lat: ${lat}<br>Lon: ${lon}<br>Accuracy: +/-${accuracy} m<br>Time: ${timestamp}</div>`;
    isMonitoring = true;
    analyzeWithPhp(position);
}

function handleWatchError(error) {
    console.log("watchPosition error", error);
}

function handleLocationError(errorMsg) {
    el("gps-status").textContent = `GPS: ${errorMsg}`;
    el("location-info").innerHTML = `
        <div style="color: #ffaa00; margin-bottom: 10px;">
            <strong>Location Error: ${errorMsg}</strong>
        </div>
        <div class="coordinates">
            Browser location needs HTTPS, localhost, and location permission.<br>
            Using simulated location for demo.
        </div>
    `;
    simulateGNSSData();
}

function simulateGNSSData() {
    const simulated = {
        coords: {
            latitude: 13.0827,
            longitude: 80.2707,
            accuracy: 5,
            altitude: 6,
        },
        timestamp: Date.now(),
    };
    lastPosition = simulated;
    el("location-info").innerHTML = `Location:<div class="coordinates">Lat: 13.082700<br>Lon: 80.270700<br>Accuracy: +/-5.0 m</div> (Simulated Chennai demo)`;
    isMonitoring = true;
    analyzeWithPhp(simulated);
}

function analyzeWithPhp(position, weatherOverride = null) {
    const payload = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy_m: position.coords.accuracy || 50,
        altitude_m: position.coords.altitude || 0,
    };
    if (weatherOverride) payload.weather = weatherOverride;

    fetch("api/analyze.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) throw new Error(data.error);
            lastWeather = data.weather;
            weatherData = data.analysis;
            simulatedSatellites = data.analysis.satellites;
            updateDisplay(data);
            updateSatelliteDisplay();
        })
        .catch((error) => {
            el("backend-status").textContent = `Backend: ${error.message}`;
            updateAtmosphericData();
            updateDisplay();
        });
}

function generateSatellites() {
    const constellations = ["GPS", "GLONASS", "Galileo", "BeiDou"];
    simulatedSatellites = [];
    for (let i = 0; i < 12; i++) {
        const constellation = constellations[Math.floor(Math.random() * constellations.length)];
        const prn = Math.floor(Math.random() * 32) + 1;
        simulatedSatellites.push({
            id: `${constellation}-${prn}`,
            signalStrength: 30 + Math.random() * 20,
        });
    }
    updateSatelliteDisplay();
}

function updateSatelliteDisplay() {
    const grid = el("satellite-grid");
    grid.innerHTML = "";
    simulatedSatellites.forEach((sat) => {
        const satDiv = document.createElement("div");
        satDiv.className = "satellite";
        satDiv.innerHTML = `
            <div style="font-size: 0.8em; font-weight: bold;">${sat.id}</div>
            <div class="signal-strength">
                <div class="signal-bar" style="width: ${Math.min(100, sat.signalStrength)}%"></div>
            </div>
            <div style="font-size: 0.7em;">${Number(sat.signalStrength).toFixed(1)}%</div>
        `;
        grid.appendChild(satDiv);
    });
    el("sat-count").textContent = simulatedSatellites.length;
}

function updateAtmosphericData() {
    weatherData.troposphericDelay = 50 + Math.random() * 100;
    weatherData.ionosphericDelay = 10 + Math.random() * 30;
    weatherData.waterVapor = Math.random() * 50;
    const totalDelay = weatherData.troposphericDelay + weatherData.ionosphericDelay;
    weatherData.precipitationProb = Math.min(100, Math.max(0, (totalDelay - 80) * 2));
    weatherData.signalQuality = "Demo";
}

function updateDisplay(data = null) {
    el("tropo-delay").textContent = Number(weatherData.troposphericDelay || 0).toFixed(1) + " ns";
    el("iono-delay").textContent = Number(weatherData.ionosphericDelay || 0).toFixed(1) + " ns";
    el("water-vapor").textContent = Number(weatherData.waterVapor || 0).toFixed(1) + " mm";
    el("precip-prob").textContent = Number(weatherData.precipitationProb || 0).toFixed(0) + "%";
    el("signal-quality").textContent = weatherData.signalQuality || "Excellent";

    if (data && data.weather) {
        el("pressure").textContent = Number(data.weather.pressure_hpa).toFixed(2) + " hPa";
        el("humidity").textContent = Number(data.weather.humidity_percent).toFixed(0) + "%";
        el("weather-condition").textContent = data.weather.condition;
        el("weather-source").textContent = data.weather.source;
    } else {
        const pressure = 1013.25 - (weatherData.precipitationProb / 100) * 20;
        const humidity = 45 + (weatherData.waterVapor / 50) * 55;
        el("pressure").textContent = pressure.toFixed(2) + " hPa";
        el("humidity").textContent = humidity.toFixed(0) + "%";
        el("weather-condition").textContent = "Demo mode";
    }

    updateWeatherAlerts();
    updateNetworkData();
    updateVisualization();
}

function updateWeatherAlerts() {
    const alertDiv = el("weather-alerts");
    alertDiv.innerHTML = "";
    if (weatherData.precipitationProb > 60) {
        const alert = document.createElement("div");
        alert.className = "alert";
        alert.innerHTML = "HIGH PRECIPITATION PROBABILITY DETECTED<br>Atmospheric conditions may degrade positioning.";
        alertDiv.appendChild(alert);
    }
    if (simulatedSatellites.some((sat) => sat.signalStrength < 35)) {
        const alert = document.createElement("div");
        alert.className = "alert";
        alert.innerHTML = "SIGNAL ATTENUATION DETECTED<br>Estimated signal quality is reduced.";
        alertDiv.appendChild(alert);
    }
}

function updateNetworkData() {
    const accuracy = lastPosition ? Number(lastPosition.coords.accuracy || 5) : 5;
    const nodes = accuracy < 20 ? 4 : accuracy < 50 ? 2 : 1;
    const radius = Math.max(3.5, accuracy / 10);
    const latency = 30 + nodes * 8;
    el("network-nodes").textContent = nodes;
    el("coverage-radius").textContent = radius.toFixed(1) + " km";
    el("data-accuracy").textContent = "+/-" + Math.max(2.0, accuracy * 1000).toFixed(0) + " mm";
    el("network-latency").textContent = latency.toFixed(0) + " ms";
}

function updateVisualization() {
    const viz = el("weather-viz");
    viz.querySelectorAll(".rain-particles, .cloud").forEach((node) => node.remove());
    el("visualization-content").innerHTML = `<p>Precipitation probability: ${Number(weatherData.precipitationProb || 0).toFixed(0)}%</p>`;

    if (weatherData.precipitationProb > 30) {
        for (let i = 0; i < 3; i++) {
            const cloud = document.createElement("div");
            cloud.className = "cloud";
            cloud.style.width = 60 + Math.random() * 40 + "px";
            cloud.style.height = 30 + Math.random() * 20 + "px";
            cloud.style.top = 20 + Math.random() * 100 + "px";
            cloud.style.left = "-100px";
            cloud.style.animationDelay = Math.random() * 10 + "s";
            viz.appendChild(cloud);
        }
    }

    if (weatherData.precipitationProb > 50) {
        for (let i = 0; i < 20; i++) {
            const rain = document.createElement("div");
            rain.className = "rain-particles";
            rain.style.left = Math.random() * 100 + "%";
            rain.style.animationDelay = Math.random() + "s";
            rain.style.animationDuration = 0.5 + Math.random() * 0.5 + "s";
            viz.appendChild(rain);
        }
    }
}

function simulateWeatherEvent() {
    const weather = {
        source: "simulation",
        temperature_c: 28,
        humidity_percent: 94,
        pressure_hpa: 1001,
        precipitation_mm: 2.6,
        condition: "Simulated heavy rain",
        weather_code: 65,
    };
    if (lastPosition) {
        analyzeWithPhp(lastPosition, weather);
    } else {
        simulateGNSSData();
    }
}

function resetSystem() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    isMonitoring = false;
    weatherData = {
        troposphericDelay: 50,
        ionosphericDelay: 15,
        waterVapor: 10,
        precipitationProb: 5,
        signalQuality: "Excellent",
    };
    generateSatellites();
    updateDisplay();
    el("gps-status").textContent = "GPS: Ready to request permission";
    el("location-info").textContent = 'Location: Click "Request Location Access" to start';
}

el("request-location").addEventListener("click", requestLocationPermission);
el("start-monitoring").addEventListener("click", startGNSSMonitoring);
el("simulate-weather").addEventListener("click", simulateWeatherEvent);
el("reset-system").addEventListener("click", resetSystem);

initializeSystem();
