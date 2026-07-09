self.notifyVenoraClients = async function notifyVenoraClients(message) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  clients.forEach((client) => client.postMessage(message));
};

self.setVenoraBadge = async function setVenoraBadge(count) {
  if (!self.registration.setAppBadge) return;

  try {
    if (Number.isFinite(count)) {
      await self.registration.setAppBadge(count);
    } else {
      await self.registration.setAppBadge();
    }
  } catch {
    // Badge support varies by browser.
  }
};

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "Venora";
  const options = {
    body: payload.body || "You have a new notification.",
    icon: "/venora-logo.png",
    badge: "/venora-logo.png",
    data: {
      url: payload.link || "/notifications",
    },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      self.setVenoraBadge(payload.unreadCount),
      self.notifyVenoraClients({
        type: "VENORA_NOTIFICATION_RECEIVED",
        payload,
      }),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/notifications";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && client.url.includes(self.location.origin)) {
          client.navigate(targetUrl);
          client.postMessage({ type: "VENORA_NOTIFICATION_CLICKED" });
          return client.focus();
        }
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});

self.addEventListener("notificationclose", (event) => {
  event.waitUntil(
    self.notifyVenoraClients({
      type: "VENORA_NOTIFICATION_CLOSED",
      url: event.notification.data?.url || "/notifications",
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "VENORA_BADGE_COUNT") {
    event.waitUntil(self.setVenoraBadge(event.data.count));
  }
});
