document.getElementById("sync").addEventListener("click", () => {
  fetch("http://localhost:8000/api/v1/sync/run", { method: "POST" })
    .then((res) => res.json())
    .then(() => alert("Sync execution started successfully."))
    .catch(() => alert("Failed to reach local backend service."));
});