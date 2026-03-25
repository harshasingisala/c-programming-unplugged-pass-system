function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const adminEmail = "harshasingisala@gmail.com";
    const adminPassword = "cprogrammingunplugged";

    if (email === adminEmail && password === adminPassword) {
        localStorage.setItem("adminLoggedIn", "true");
        window.location.href = "admin-dashboard.html";
    } else {
        document.getElementById("error").classList.remove("hidden");
    }
}