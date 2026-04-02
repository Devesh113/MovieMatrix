const apiKey = "83d0705a";

const searchinput = document.getElementById("searchinput");
const searchbtn = document.getElementById("searchbtn");
const moviescontainer = document.getElementById("moviescontainer");
const loading = document.getElementById("loading");
const message = document.getElementById("message");



function fetchMovies(query) {
  if (!query) return;

  loading.classList.remove("hidden");
  message.textContent = "";
  moviescontainer.innerHTML = "";

  fetch(`https://www.omdbapi.com/?apikey=${apiKey}&s=${query}`)
    .then(res => res.json())
    .then(data => {
      loading.classList.add("hidden");

      if (data.Response === "True") {
        displayMovies(data.Search);
      } else {
        showMessage("No movies found");
      }
    })
    .catch(err => {
      loading.classList.add("hidden");
      showMessage("Something went wrong");
      console.log(err);
    });
}



function displayMovies(list) {
  moviescontainer.innerHTML = "";

  list.forEach((movie) => {
    let poster = movie.Poster;

    if (poster === "N/A") {
      poster = "https://via.placeholder.com/150";
    }

    const card = document.createElement("div");
    card.classList.add("movie-card");

    card.innerHTML = `
      <img src="${poster}" alt="${movie.Title}">
      <h3>${movie.Title}</h3>
      <p>${movie.Year}</p>
    `;

    moviescontainer.appendChild(card);
  });
}



function showMessage(msg) {
  message.textContent = msg;
}



searchbtn.addEventListener("click", () => {
  const value = searchinput.value.trim();
  fetchMovies(value);
});



searchinput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    fetchMovies(searchinput.value.trim());
  }
});