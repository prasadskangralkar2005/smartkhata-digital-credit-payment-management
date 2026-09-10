import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                login: resolve(__dirname, "login.html"),
                register: resolve(__dirname, "register.html"),
                dashboard: resolve(__dirname, "dashboard.html"),
                payments: resolve(__dirname, "payments.html"),
                people: resolve(__dirname, "people.html"),
                reminders: resolve(__dirname, "reminders.html"),
                reports: resolve(__dirname, "reports.html"),
                transactions: resolve(__dirname, "transactions.html")
            }
        }
    }
});