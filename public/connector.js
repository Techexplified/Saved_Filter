
/* ==========================================
   SAVED FILTER VIEWS - TRELLO POWER-UP
========================================== */

const POWERUP_NAME = "Saved Filter Views";

const BASE_URL = "https://saved-filter.vercel.app";

const POWERUP_ICON =
  `${BASE_URL}/images/saved-filter-logo.png`;

const APP_URL = `${BASE_URL}/popup.html`;

window.TrelloPowerUp.initialize({
  "board-buttons": function (t) {
    return [
      {
        text: POWERUP_NAME,

        icon: {
          dark: POWERUP_ICON,
          light: POWERUP_ICON,
        },

        condition: "always",

        callback: function (t) {
          return t.popup({
            title: POWERUP_NAME,
            url: APP_URL,
            height: 600,
          });
        },
      },
    ];
  },
});
