import mixpanel from "mixpanel-browser";

const token = import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined;
let isInitialized = false;

type EventProperties = Record<string, unknown>;

function cleanProperties(properties: EventProperties = {}) {
  return Object.fromEntries(
    Object.entries({
      platform: "web",
      app_name: "GymBuddy",
      ...properties,
    }).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

export function initMixpanel() {
  if (isInitialized) return true;
  if (!token) return false;

  mixpanel.init(token, {
    debug: import.meta.env.DEV,
    persistence: "localStorage",
    track_pageview: false,
  });
  isInitialized = true;
  return true;
}

export function trackEvent(name: string, properties?: EventProperties) {
  if (!initMixpanel()) return;
  mixpanel.track(name, cleanProperties(properties));
}

export function identifyUser(userId: string, properties?: EventProperties) {
  if (!initMixpanel()) return;
  mixpanel.identify(userId);
  if (properties) mixpanel.people.set(cleanProperties(properties));
}

export function resetMixpanelUser() {
  if (!initMixpanel()) return;
  mixpanel.reset();
}
