import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { client } from "./db.js";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";


const app = express();

// MIDDLEWARE

// Untuk mengelola cookie
app.use(cookieParser());

// Untuk memeriksa otorisasi
app.use((req, res, next) => {
  if (req.path.startsWith("/api/login") || req.path.startsWith("/assets")) {
    next();
  } else {
    let authorized = false;
    if (req.cookies.token) {
      try {
        jwt.verify(req.cookies.token, process.env.SECRET_KEY);
        authorized = true;
      } catch (err) {
        res.setHeader("Cache-Control", "no-store"); // khusus Vercel
        res.clearCookie("token");
      }
    }
    if (authorized) {
      if (req.path.startsWith("/login")) {
        res.redirect("/");
      } else {
        next();
      }
    } else {
      if (req.path.startsWith("/login")) {
        next();
      } else {
        if (req.path.startsWith("/api")) {
          res.status(401);
          res.send("Anda harus login terlebih dahulu.");
        } else {
          res.redirect("/login");
        }
      }
    }
  }
});


// Untuk mengakses file statis
// app.use(express.static("public"));

// Untuk mengakses file statis (khusus Vercel)
import path from "path";
const __dirname = path.dirname(new URL(import.meta.url).pathname);
app.use(express.static(path.resolve(__dirname, "public")));

// Untuk membaca body berformat JSON
app.use(express.json());

// ROUTE OTORISASI


// Dapatkan mahasiswa saat ini (yang sedang login)
app.get("/api/me", (req, res) => {
  const me = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
  res.json(me);
});

// Login (dapatkan token)
app.post("/api/login",async( req, res)=> {
  const results = await client.query(
    `SELECT * FROM login`
  );
  if (results.rows.length > 0) {
    if (await bcrypt.compare(req.body.password, results.rows[0].password)) {
      const token = jwt.sign(results.rows[0], process.env.SECRET_KEY);
      res.cookie("token", token);
      res.send("Login berhasil.");
    } else {
      res.status(401);
      res.send("Kata sandi salah.");
    }
  } else {
    res.status(401);
    res.send("Mahasiswa tidak ditemukan.");
  }
});


// Logout (hapus token)
app.get("/api/logout", (_req, res) => {
  res.setHeader("Cache-Control", "no-store"); // khusus Vercel
  res.clearCookie("token");
  res.send("Logout berhasil.");
});

// ROUTE MAHASISWA

// Dapatkan semua
app.get("/api/mahasiswa", async (_req, res) => {
  const results = await client.query("SELECT * FROM mahasiswa ORDER BY id");
  res.json(results.rows);
});

// Dapatkan satu
app.get("/api/mahasiswa/:id", async (req, res) => {
  const results = await client.query(
    `SELECT * FROM mahasiswa WHERE id = ${req.params.id}`
  );
  res.json(results.rows[0]);
});

const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash("000", salt);
console.log(hash);


// Tambah
app.post("/api/daftar", async (req, res) => {
  const salt = await bcrypt.genSalt();
  const hash = await bcrypt.hash(req.body.password, salt);
  await client.query(
    `INSERT INTO login VALUES ('${req.body.user}', '${hash}')`
  );
  res.send("Mahasiswa berhasil daftar.");
});

// Edit
app.put("/api/mahasiswa/:id", async (req, res) => {
  await client.query(
    `UPDATE mahasiswa SET nim = '${req.body.nim}', nama = '${req.body.nama}' WHERE id = ${req.params.id}`
  );
  res.send("Mahasiswa berhasil diedit.");
});

// Hapus
app.delete("/api/mahasiswa/:id", async (req, res) => {
  await client.query(`DELETE FROM mahasiswa WHERE id = ${req.params.id}`);
  res.send("Mahasiswa berhasil dihapus.");
});

// ROUTE PELATIHAN

// Dapatkan semua
app.get("/api/pelatihan", async (_req, res) => {
  const results = await client.query("SELECT * FROM pelatihan");
  res.json(results.rows);
});


app.post("/api/keluar", (req, res) => {
  res.clearCookie(`${req.body.token}`);
  res.redirect("/login");
});
// MEMULAI SERVER

app.listen(3000, () => {
  console.log("Server berhasil berjalan.");
});
