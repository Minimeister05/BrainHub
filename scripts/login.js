const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();

    if (email === "" || senha === "") {
      alert("Preencha todos os campos.");
      return;
    }

    // Por enquanto: se os campos estiverem preenchidos, entra
    window.location.href = "home.html";
  });
}

function logout() {
  window.location.href = "index.html";
}
