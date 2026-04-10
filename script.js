/* ═══════════════════════════════════════════════════════════════
   CINEVAULT — Radial Wheel JS Logic
═══════════════════════════════════════════════════════════════ */

const API_KEY   = "43de8ff65f6ff177a1547c3f54cc67c7";
const BASE_URL  = "https://api.themoviedb.org/3";
const IMG_W1280 = "https://image.tmdb.org/t/p/w1280";
const IMG_W500  = "https://image.tmdb.org/t/p/w500";
const PLACEHOLDER = "https://placehold.co/500x750/1c1c20/555555?text=No+Poster";

/* DOM Elements */
const els = {
  bgLayer: $("bg-layer"),
  title: $("active-title"),
  rating: $("active-rating"),
  year: $("active-year"),
  desc: $("active-desc"),
  wheel: $("radial-wheel"),
  radialArea: $("radial-area")
};

function $(id) { return document.getElementById(id); }

let movies = [];
let currentIndex = 0;
let targetIndex = 0;
let currentLerpIndex = 0; // for smooth animation

const RADIUS = 400; // Match CSS half-width of .radial-wheel
const ANGLE_GAP = 0.35; // Radians between items

async function init() {
  await fetchPopularMovies();
  buildWheel();
  updateBackground(currentIndex);
  
  // Animation Loop
  requestAnimationFrame(animateWheel);

  // Scroll event - attach only to radial area to allow normal page scrolling elsewhere
  els.radialArea.addEventListener("wheel", handleScroll, { passive: false });

  // Load additional sections
  await fetchRowContent(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}`, "trending-row");
  await fetchRowContent(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}`, "top-rated-row");

  // Bind Main Details button
  $("main-details-btn").addEventListener("click", () => {
    if (movies[targetIndex]) openModal(movies[targetIndex].id);
  });
}

async function fetchPopularMovies() {
  try {
    const res = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&page=1`);
    const data = await res.json();
    movies = (data.results || []).filter(m => m.backdrop_path && m.poster_path).slice(0, 15);
  } catch (err) {
    console.error("Failed to fetch movies", err);
  }
}

function buildWheel() {
  els.wheel.innerHTML = "";
  movies.forEach((m, i) => {
    const item = document.createElement("div");
    item.className = "wheel-item";
    item.dataset.index = i;
    
    const img = document.createElement("img");
    img.src = IMG_W500 + m.poster_path;
    img.onerror = () => { img.src = PLACEHOLDER; };
    
    item.appendChild(img);
    els.wheel.appendChild(item);

    // Click to select
    item.addEventListener("click", () => {
      targetIndex = i;
      updateBackground(targetIndex);
    });
  });
}

async function fetchRowContent(url, containerId) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    const container = $(containerId);
    if (!container) return;
    
    container.innerHTML = (data.results || []).slice(0, 15).map(m => `
      <div class="movie-card" data-id="${m.id}">
        <img src="${m.poster_path ? IMG_W500 + m.poster_path : PLACEHOLDER}" alt="${m.title}" loading="lazy" onerror="this.src='${PLACEHOLDER}'">
        <div class="card-info">
          <div class="card-title">${m.title}</div>
          <div class="card-meta">
            <span>⭐ ${m.vote_average.toFixed(1)}</span>
            <span>${m.release_date ? m.release_date.slice(0, 4) : ''}</span>
          </div>
        </div>
      </div>
    `).join("");

    container.querySelectorAll(".movie-card").forEach(card => {
      card.addEventListener("click", () => openModal(card.dataset.id));
    });
  } catch (err) {
    console.error("Failed to fetch row content", err);
  }
}

function updateBackground(index) {
  const m = movies[index];
  if (!m) return;

  // Fade out old background
  els.bgLayer.style.opacity = "0.4";
  
  setTimeout(() => {
    els.bgLayer.style.backgroundImage = `url(${IMG_W1280 + m.backdrop_path})`;
    els.bgLayer.style.opacity = "1";
  }, 400); // Wait for fade

  // Update text
  els.title.textContent = m.title;
  els.rating.textContent = `⭐ ${m.vote_average.toFixed(1)}`;
  els.year.textContent = m.release_date ? m.release_date.slice(0, 4) : "";
  els.desc.textContent = m.overview || "No description available.";
  
  currentIndex = index;
}

let scrollTimeout;
function handleScroll(e) {
  // Prevent default page scroll
  e.preventDefault();
  
  if (scrollTimeout) return;
  
  scrollTimeout = setTimeout(() => {
    if (e.deltaY > 0) {
      // Scroll down -> next movie
      targetIndex = Math.min(targetIndex + 1, movies.length - 1);
    } else if (e.deltaY < 0) {
      // Scroll up -> prev movie
      targetIndex = Math.max(targetIndex - 1, 0);
    }
    updateBackground(targetIndex);
    scrollTimeout = null;
  }, 50); // Debounce
}

function animateWheel() {
  // Smoothly move lerp index towards target index
  currentLerpIndex += (targetIndex - currentLerpIndex) * 0.1;

  const items = document.querySelectorAll(".wheel-item");
  
  items.forEach((item, i) => {
    // Math:
    // Base angle is Math.PI (180 degrees) because we want items facing left.
    // The relative index (i - currentLerpIndex) determines rotation offset.
    const relativeIndex = i - currentLerpIndex;
    const angle = Math.PI + (relativeIndex * ANGLE_GAP);

    const x = RADIUS * Math.cos(angle);
    const y = RADIUS * Math.sin(angle);
    
    // Scale and opacity depending on distance from center
    const dist = Math.abs(relativeIndex);
    const scale = Math.max(0.6, 1 - (dist * 0.15));
    const opacity = Math.max(0, 1 - (dist * 0.3));
    
    // Rotate items so they face away from center
    // Math.PI angle faces exactly left. 
    // Rotation = angle in degrees
    // Normal transform puts them upright, but we want a slight tilt or keep them upright?
    // Often in curved carousels they stay upright: `rotate(0)` or tilt slightly.
    const tilt = relativeIndex * 15; // deg tilt

    item.style.transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${tilt}deg)`;
    item.style.opacity = opacity;
    item.style.zIndex = Math.round(100 - dist * 10);
    
    if (i === targetIndex) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  requestAnimationFrame(animateWheel);
}

/* ─── Parallax Effect ─── */
window.addEventListener("mousemove", (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * -30; // Inverse movement relative to mouse
  const y = (e.clientY / window.innerHeight - 0.5) * -30;
  
  // Need to ensure the opacity isn't overwritten here if it's transitioning, but CSS transform is separate from opacity!
  els.bgLayer.style.transform = `scale(1.04) translate(${x}px, ${y}px)`;
});

/* ─── Modal & Trailer Logic ─── */
const modalEls = {
  overlay: $("movie-modal"),
  close: $("modal-close"),
  backdrop: $("modal-backdrop"),
  poster: $("modal-poster-img"),
  title: $("modal-title"),
  rating: $("modal-rating"),
  year: $("modal-year"),
  runtime: $("modal-runtime"),
  genres: $("modal-genres"),
  desc: $("modal-desc"),
  director: $("modal-director"),
  trailerBtn: $("modal-trailer-btn"),
  cast: $("modal-cast"),
  similar: $("modal-similar")
};

const trailerEls = {
  overlay: $("trailer-overlay"),
  close: $("trailer-close"),
  iframe: $("trailer-iframe")
};

let currentTrailerKey = null;

async function openModal(movieId) {
  try {
    const [movie, credits, videos, similar] = await Promise.all([
      fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`).then(r => r.json()),
      fetch(`${BASE_URL}/movie/${movieId}/similar?api_key=${API_KEY}`).then(r => r.json())
    ]);

    populateModal(movie, credits, videos, similar);
    modalEls.overlay.classList.add("open");
  } catch (err) {
    console.error("Error opening modal", err);
  }
}

function populateModal(movie, credits, videos, similar) {
  modalEls.backdrop.style.backgroundImage = `url(${IMG_W1280 + movie.backdrop_path})`;
  modalEls.poster.src = movie.poster_path ? IMG_W500 + movie.poster_path : PLACEHOLDER;
  modalEls.title.textContent = movie.title;
  modalEls.rating.textContent = `⭐ ${movie.vote_average.toFixed(1)}`;
  modalEls.year.textContent = movie.release_date ? movie.release_date.substring(0, 4) : "";
  modalEls.runtime.textContent = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : "N/A";
  
  modalEls.genres.innerHTML = (movie.genres || []).map(g => `<span>${g.name}</span>`).join("");
  modalEls.desc.textContent = movie.overview;

  const director = credits.crew.find(c => c.job === "Director");
  modalEls.director.textContent = director ? director.name : "Unknown";

  // Trailer
  const trailer = videos.results.find(v => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"));
  currentTrailerKey = trailer ? trailer.key : null;
  modalEls.trailerBtn.style.display = currentTrailerKey ? "flex" : "none";

  // Cast
  modalEls.cast.innerHTML = credits.cast.slice(0, 15).map(c => `
    <div class="cast-card">
      <img class="cast-photo" src="${c.profile_path ? IMG_W500 + c.profile_path : PLACEHOLDER}" alt="${c.name}" onerror="this.src='${PLACEHOLDER}'">
      <div class="cast-name">${c.name}</div>
      <div class="cast-char">${c.character}</div>
    </div>
  `).join("");

  // Similar Movies
  modalEls.similar.innerHTML = similar.results.slice(0, 10).map(m => `
    <div class="similar-card" data-id="${m.id}">
      <img src="${m.poster_path ? IMG_W500 + m.poster_path : PLACEHOLDER}" alt="${m.title}" onerror="this.src='${PLACEHOLDER}'">
    </div>
  `).join("");

  // Bind similar movie clicks (loads new movie inside the same open modal seamlessly)
  modalEls.similar.querySelectorAll(".similar-card").forEach(el => {
    el.addEventListener("click", () => {
       openModal(el.dataset.id); 
    });
  });
}

function closeModal() {
  modalEls.overlay.classList.remove("open");
}

function openTrailer() {
  if (!currentTrailerKey) return;
  trailerEls.overlay.classList.add("open");
  trailerEls.iframe.src = `https://www.youtube.com/embed/${currentTrailerKey}?autoplay=1`;
}

function closeTrailer() {
  trailerEls.overlay.classList.remove("open");
  trailerEls.iframe.src = "";
}

// Event Listeners
modalEls.close.addEventListener("click", closeModal);
modalEls.overlay.addEventListener("click", (e) => {
  if (e.target === modalEls.overlay) closeModal();
});

trailerEls.close.addEventListener("click", closeTrailer);
trailerEls.overlay.addEventListener("click", (e) => {
  if (e.target === trailerEls.overlay) closeTrailer();
});

modalEls.trailerBtn.addEventListener("click", openTrailer);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (trailerEls.overlay.classList.contains("open")) closeTrailer();
    else if (modalEls.overlay.classList.contains("open")) closeModal();
  }
});

// Start
init();