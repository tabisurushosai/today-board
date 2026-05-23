import "./styles.css";
import { ChromeLocalStorageAdapter } from "./storage/chromeStorage";
import { mountTodayBoardApp } from "./ui/todayBoardApp";

mountTodayBoardApp({
  root: document.querySelector<HTMLDivElement>("#app"),
  storage: new ChromeLocalStorageAdapter(),
  preferredLanguage: navigator.language,
  scheduleRender: (callback, milliseconds) => window.setInterval(callback, milliseconds),
});
