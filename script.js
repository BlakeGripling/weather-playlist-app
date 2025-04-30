// script.js

document.addEventListener("DOMContentLoaded", () => {
  const apiKey        = "8144ab61a10047434698520f2a3b24d2";
  const searchBtn     = document.getElementById("search-btn");
  const searchInput   = document.getElementById("search-input");
  const weatherScroll = document.getElementById("weather-scroll");

  // ─── Helpers ───────────────────────────────────────────────────────────────

  // Turn wind degrees (0–360) into N, NE, E, etc.
  function degToCardinal(deg) {
    const dirs = ["N","NE","E","SE","S","SW","W","NW"];
    return dirs[Math.round((deg % 360) / 45) % 8];
  }

  // Remove a card by ID
  function removeCard(cardId) {
    const el = document.getElementById(cardId);
    if (el) el.remove();
  }

  // Check if city is already shown
  function isCityLoaded(city) {
    return !!weatherScroll.querySelector(`[data-city="${city.toLowerCase()}"]`);
  }

  // ─── Search Handlers ────────────────────────────────────────────────────────

  function handleSearch() {
    const city = searchInput.value.trim();
    if (!city || isCityLoaded(city)) return;
    saveCity(city);
    createWeatherCard(city);
    searchInput.value = "";
  }
  searchBtn.addEventListener("click", handleSearch);
  searchInput.addEventListener("keyup", e => {
    if (e.key === "Enter") handleSearch();
  });

  // ─── Card Creation & Fetch ─────────────────────────────────────────────────

  function createWeatherCard(city) {
    const cardId = `weather-card-${Date.now()}`;
    const card   = document.createElement("div");
    card.className    = "weather-card";
    card.id           = cardId;
    card.dataset.city = city.toLowerCase();

    // add delete button with tooltip
    card.innerHTML = `
      <button
        class="delete-btn"
        data-card="${cardId}"
        data-tooltip="Remove this city"
      >🗑️</button>
      <div id="content-${cardId}"></div>
    `;
    weatherScroll.appendChild(card);
    getWeather(city, cardId);
  }

  async function getWeather(city, cardId) {
    try {
      const res  = await fetch(
        `https://api.openweathermap.org/data/2.5/weather` +
        `?q=${city}&appid=${apiKey}&units=metric`
      );
      const data = await res.json();
      if (!res.ok || data.cod !== 200) {
        alert("❌ Failed to fetch weather");
        removeCard(cardId);
        return;
      }

      // prepare tooltip values
      const feels = Math.round(data.main.feels_like);
      const dir   = degToCardinal(data.wind.deg);
      const sunrise = new Date(data.sys.sunrise * 1000)
                        .toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
      const sunset  = new Date(data.sys.sunset  * 1000)
                        .toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});

      // inject card content with tooltips
      document.getElementById(`content-${cardId}`).innerHTML = `
        <h2>📍 ${data.name}, ${data.sys.country}</h2>
        <p data-tooltip="Sunrise: ${sunrise} · Sunset: ${sunset}">
          ${new Date().toDateString()}
        </p>
        <div
          class="temp"
          data-tooltip="Feels like ${feels}°C"
        >${Math.round(data.main.temp)}°C</div>
        <p>${data.weather[0].main}, ${data.weather[0].description}</p>
        <div id="lottie-${cardId}" class="lottie-icon"></div>
        <p
          class="wind"
          data-tooltip="Wind direction: ${dir}"
        >🌬️ Wind: ${data.wind.speed} m/s</p>
        <p
          class="humidity"
          data-tooltip="Amount of water vapor in the air"
        >💧 Humidity: ${data.main.humidity}%</p>
      `;

      applyBackground(data.weather[0].main);
      updateSpotifyEmbed(data.weather[0].main);
      loadLottieAnimation(cardId, data.weather[0].main);
    } catch (err) {
      console.error(err);
      alert("❌ Error loading weather");
      removeCard(cardId);
    }
  }

  // ─── Delete Button Handler ──────────────────────────────────────────────────

  weatherScroll.addEventListener("click", e => {
    if (!e.target.classList.contains("delete-btn")) return;
    const cardId = e.target.dataset.card;
    const city   = document.getElementById(cardId).dataset.city;
    deleteCity(city, cardId);
  });

  // ─── LocalStorage ───────────────────────────────────────────────────────────

  function saveCity(city) {
    const key   = city.toLowerCase();
    const list  = JSON.parse(localStorage.getItem("cities") || "[]");
    if (!list.includes(key)) {
      list.push(key);
      localStorage.setItem("cities", JSON.stringify(list));
    }
  }
  function deleteCity(city, cardId) {
    let list = JSON.parse(localStorage.getItem("cities") || "[]");
    list     = list.filter(c => c !== city.toLowerCase());
    localStorage.setItem("cities", JSON.stringify(list));
    removeCard(cardId);
  }
  function loadSavedCities() {
    JSON.parse(localStorage.getItem("cities") || "[]")
      .forEach(c => createWeatherCard(c));
  }

  // ─── Background & Spotify Logic ────────────────────────────────────────────

  function applyBackground(condition) {
    document.body.className = "";
    const h     = new Date().getHours();
    const isDay = h >= 6 && h < 18;
    if (condition === "Clear") {
      document.body.classList.add(isDay ? "clear-day" : "clear-night");
    } else if (["Clouds","Mist","Fog","Smoke","Haze"].includes(condition)) {
      document.body.classList.add("cloudy-bg");
    } else if (["Rain","Drizzle"].includes(condition)) {
      document.body.classList.add("rainy-bg");
    } else if (condition === "Thunderstorm") {
      document.body.classList.add("stormy-bg");
    } else if (condition === "Snow") {
      document.body.classList.add("snowy-bg");
    } else {
      document.body.classList.add("clear-day");
    }
  }

  function updateSpotifyEmbed(condition) {
    const map = {
      Clear:        "37i9dQZF1DX0UrRvztWcAU",
      Clouds:       "37i9dQZF1DX2TRYkJECvfC",
      Rain:         "37i9dQZF1DXbvABJXBIyiY",
      Drizzle:      "37i9dQZF1DXbvABJXBIyiY",
      Thunderstorm: "37i9dQZF1DX8ymr6UES7vc",
      Snow:         "37i9dQZF1DWXJfnUiYjUKT",
      Default:      "37i9dQZF1DX889U0CL85jj"
    };
    const id = map[condition] || map.Default;
    document.getElementById("spotify-frame").src =
      `https://open.spotify.com/embed/playlist/${id}`;
  }

  // ─── Lottie Loader ─────────────────────────────────────────────────────────

  function loadLottieAnimation(cardId, condition) {
    if (!window.lottie) return;
    const map = {
      Clear:        "sun.json",
      Clouds:       "cloud.json",
      Rain:         "rain.json",
      Drizzle:      "rain.json",
      Thunderstorm: "thunder.json",
      Snow:         "snow.json",
      Mist:         "mist.json",
      Haze:         "mist.json",
      Fog:          "mist.json"
    };
    const file = map[condition] || "sun.json";
    window.lottie.loadAnimation({
      container: document.getElementById(`lottie-${cardId}`),
      renderer:  "svg",
      loop:      true,
      autoplay:  true,
      path:      `animations/${file}`
    });
  }

  // ─── Kickoff ────────────────────────────────────────────────────────────────

  loadSavedCities();
});
