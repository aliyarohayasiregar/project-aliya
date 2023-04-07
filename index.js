import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { client } from "./db.js";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";


const app = express();
import multer from "multer";


// MIDDLEWARE

// Untuk mengelola cookie
app.use(cookieParser());

//Untuk memeriksa otorisasi
app.use((req, res, next) => {
  if (req.path.startsWith("/api/login") || req.path.startsWith("/assets")||req.path.startsWith("/hal-utama")||req.path.startsWith("/daftar")||req.path.startsWith("/api/daftar")||req.path.startsWith("/login-admin")) {
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
      if (req.path.startsWith("/hal-utama")) {
        res.redirect("/");
      } else {
        next();
      }
    } else {
      if (req.path.startsWith("/hal-utama")) {
        next();
      } else {
        if (req.path.startsWith("/api")) {
          res.status(401);
          res.send("Anda harus login terlebih dahulu.");
        } else {
          res.redirect("/hal-utama");
        }
      }
    }

  }
});


// Untuk mengakses file statis(khusus Vercel)
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
const upload = multer({ dest: "public/photos" });


// Untuk membaca body berformat JSON
app.use(express.json());

// ROUTE OTORISASI


app.post("/api/login", async (req, res) => {
  const results = await client.query(
    `SELECT * FROM login where username='${req.body.username}'`
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
    res.send("Pengguna tidak ditemukan.");
  }
});




// Logout (hapus token)
app.get("/api/keluar", (_req, res) => {
  res.setHeader("Cache-Control", "no-store"); // khusus Vercel
  res.clearCookie("token");
  res.send("Logout berhasil.");
});

// dapatkan user
app.get("/api/users", async (_req,res)=>{
  const results = await client.query("SELECT * FROM daftar");
  res.json(results.rows);
});


// Tambah pengguna
app.post("/api/daftar", async (req, res) => {
  const salt = await bcrypt.genSalt();
  const hash = await bcrypt.hash(req.body.password, salt);
  await client.query(
    `INSERT INTO daftar(username,nama,alamat,no_telepon) VALUES ('${req.body.username}','${req.body.nama}','${req.body.alamat}','${req.body.no_telepon}');
    INSERT INTO login(username,password) VALUES ('${req.body.username}','${hash}')`
  );
  res.send("akun berhasil daftar.");
});

const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash("123", salt);
console.log(hash);

//login admin
app.post("/api/login/admin", async (req, res) => {
  const results = await client.query(
    `SELECT * FROM admin where username='${req.body.username}'`
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
    res.send("Pengguna tidak ditemukan.");
  }
});

// ROUTE PELATIHAN

// Dapatkan semua pengguna
app.get("/api/user", async (_req, res) => {
  const results = await client.query("SELECT * FROM daftar");
  res.json(results.rows);
});



app.post("/api/keluar", (req, res) => {
  res.clearCookie(`${req.body.token}`);
  res.redirect("/login");
});

//tampil barang kategori
app.get("/api/kategori1",async(_req,res)=>{
  const results = await client.query(
    `SELECT *FROM barang WHERE id_kategori = 1`
  );
  res.json(results.rows);
});

app.get("/api/kategori2",async(_req,res)=>{
  const results = await client.query(
    `SELECT *FROM barang WHERE id_kategori = 2`
  );
  res.json(results.rows);

})
app.get("/api/kategori3",async(_req,res)=>{
  const results = await client.query(
    `SELECT *FROM barang WHERE id_kategori = 3`
  );
  res.json(results.rows);

})
app.get("/api/kategori4",async(_req,res)=>{
  const results = await client.query(
    `SELECT *FROM barang WHERE id_kategori =4`
  );
  res.json(results.rows);

})

app.get("/api/kategori5",async(_req,res)=>{
  const results = await client.query(
    `SELECT *FROM barang WHERE id_kategori = 5`
  );
  res.json(results.rows);

})





//ROUTE BARANG
//tampil semua
app.get("/api/barang", async (_req, res) => {
  const results = await client.query("SELECT * FROM barang");
  res.json(results.rows);
});


// Tambah barang
app.post("/api/barang", upload.single("foto"),async (req, res) => {
  await client.query(
    `INSERT INTO barang (nama_barang,harga_barang,id_kategori,descripsite,stok,foto) VALUES ('${req.body.nama_barang}',${req.body.harga_barang},'${req.body.id_kategori}','${req.body.descripsite}',${req.body.stok},'${req.file.filename}')`
  );
  res.send("barang berhasil di tambah.");
});

// Edit barang
app.put("/api/barang/:id",upload.single("foto"), async (req, res) => {
  console.log(req.body);
  console.log(req.params.id);
  await client.query(
    `UPDATE barang SET nama_barang = '${req.body.nama_barang}', harga_barang = ${req.body.harga_barang},id_kategori=${req.body.id_kategori},descripsite='${req.body.descripsite}',stok=${req.body.stok},foto='${req.file.filename}' WHERE id=${req.params.id}`
  );
  res.send("barang berhasil diedit.");
});

// Hapus
app.delete("/api/barang/:id", async (req, res) => {
  await client.query(`
  DELETE FROM barang WHERE id = ${req.params.id}`);
  res.send("barang berhasil dihapus.");
});


app.listen(3000, () => {
  console.log("Server berhasil berjalan.");
});
