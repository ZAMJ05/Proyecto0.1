const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

if (!fs.existsSync(envPath)) {
  if (!fs.existsSync(examplePath)) {
    console.error("No se encontró .env.example. Crea un archivo .env con DATABASE_URL.");
    process.exit(1);
  }
  fs.copyFileSync(examplePath, envPath);
  console.log("Se creó .env desde .env.example");
} else {
  console.log(".env ya existe");
}
