const $ = id => document.getElementById(id);

const messages = $("messages");
const input = $("input");
const send = $("send");
const form = $("form");
const recent = $("recent");

let history = [];
let titles = [];

/* Add message */
function add(role, text) {
  const r = document.createElement("div");
  r.className = "message " + role;

  const b = document.createElement("div");
  b.className = "bubble";
  b.textContent = text;

  r.appendChild(b);
  messages.appendChild(r);

  messages.parentElement.scrollTop =
    messages.parentElement.scrollHeight;

  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: "smooth"
  });

  return r;
}

/* AI typing indicator */
function typing() {
  const r = document.createElement("div");
  r.className = "message ai";
  r.id = "typing";

  const b = document.createElement("div");
  b.className = "bubble typing";
  b.innerHTML = "<i></i><i></i><i></i>";

  r.appendChild(b);
  messages.appendChild(r);

  messages.parentElement.scrollTop =
    messages.parentElement.scrollHeight;
}

/* Connection status */
function status() {
  fetch("/api/status")
    .then(r => r.json())
    .then(d => {
      const dot = $("dot");
      const statusText = $("status");

      if (d.connected) {
        dot.style.background = "#2dbb67";
        statusText.textContent = "Online";
      } else {
        dot.style.background = "#f3aa32";
        statusText.textContent = "Offline";
      }
    })
    .catch(() => {
      $("dot").style.background = "#f3aa32";
      $("status").textContent = "Offline";
    });
}

/* Recent chats */
function renderRecent() {
  recent.innerHTML = "";

  titles
    .slice(-7)
    .reverse()
    .forEach(t => {
      const b = document.createElement("button");
      b.textContent = t;
      recent.appendChild(b);
    });
}

/* Send message */
form.addEventListener("submit", async e => {
  e.preventDefault();

  const t = input.value.trim();

  if (!t) return;

  add("user", t);

  history.push({
    role: "user",
    content: t
  });

  if (
    !titles.length ||
    titles[titles.length - 1] !== t
  ) {
    titles.push(t.slice(0, 38));
  }

  renderRecent();

  input.value = "";
  input.style.height = "auto";

  send.disabled = true;
  input.disabled = true;

  typing();

  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: history
      })
    });

    const d = await r.json();

    $("typing")?.remove();

    if (!r.ok) {
      throw Error(
        d.error || "Ajlan AI could not respond."
      );
    }

    add("ai", d.reply);

    history.push({
      role: "assistant",
      content: d.reply
    });

  } catch (err) {
    $("typing")?.remove();

    add(
      "ai",
      "⚠ " + err.message
    );

  } finally {
    input.disabled = false;
    input.focus();
    send.disabled = false;
  }
});

/* Auto-resize input */
input.addEventListener("input", () => {
  send.disabled = !input.value.trim();

  input.style.height = "auto";

  input.style.height =
    Math.min(input.scrollHeight, 180) + "px";

  $("count").textContent =
    `${input.value.length} / 8000`;
});

/* Enter = send
   Shift + Enter = new line */
input.addEventListener("keydown", e => {
  if (
    e.key === "Enter" &&
    !e.shiftKey
  ) {
    e.preventDefault();
    form.requestSubmit();
  }
});

/* New chat */
$("newChat").onclick = () => {
  history = [];
  messages.innerHTML = "";
  $("welcome").style.display = "block";
  input.focus();
};

/* Clear chat */
$("clear").onclick = () => {
  history = [];
  messages.innerHTML = "";
  $("welcome").style.display = "block";
  input.focus();
};

/* Prompt buttons */
document
  .querySelectorAll("[data-p]")
  .forEach(b => {
    b.onclick = () => {
      input.value = b.dataset.p;

      input.dispatchEvent(
        new Event("input")
      );

      input.focus();
    };
  });

/* Start status */
status();

setInterval(status, 10000);

send.disabled = true;