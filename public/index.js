document.addEventListener("DOMContentLoaded", () => {
  const registerButton = document.getElementById("register");
  registerButton.addEventListener("click", async () => {
    const url = `${location.origin}/register`;
    const method = "PUT";
    const token = await window.NostrTools.nip98.getToken(url, method, (event) =>
      window.nostr.signEvent(event),
    );
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Nostr ${token}`,
      },
    });
    if (response.ok) {
      registerButton.hidden = true;
      document.getElementById("registered").hidden = false;
    }
  });

  const copy = document.getElementById("copy");
  copy.addEventListener("click", () => {
    navigator.clipboard.writeText("wss://snowflare.cc/");
    copy.textContent = "✅";
  });
});
