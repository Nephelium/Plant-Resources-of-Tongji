import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { reveal } from "./utils/reveal";
import "./styles.css";
import "leaflet/dist/leaflet.css";

createApp(App)
  .directive("reveal", reveal)
  .use(createPinia())
  .use(router)
  .mount("#app");
